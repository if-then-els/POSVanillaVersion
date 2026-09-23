const Users = require("../models/user");
const Business = require("../models/businessDetails");
const Subscription = require("../models/subscription.model");
const Plan = require("../models/plan.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sendResetLinkEmail = require("../utils/emailService");

// ---------------------------------------------------------------------------
// Shared helpers for production-grade user management
// ---------------------------------------------------------------------------
const VALID_ROLES = ["admin", "manager", "cashier", "inventory"];
const VALID_STATUSES = ["active", "inactive", "suspended"];
// Roles a non-admin (manager) is allowed to create / assign, mirroring
// middleware/rbac.middleware.js permissions (users:write:cashier, users:write:inventory).
const MANAGER_ASSIGNABLE_ROLES = ["cashier", "inventory"];

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || "").trim());
}

function isValidPhone(phone) {
  return /[+\d][\d\s\-()]{6,}/.test(String(phone || "").trim());
}

// Escape user input before building a RegExp (prevents ReDoS / 500s).
function escapeRegex(str) {
  return String(str || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sanitizeUser(userDoc) {
  const obj =
    typeof userDoc.toObject === "function" ? userDoc.toObject() : userDoc;
  delete obj.password;
  return obj;
}

// Roles the actor may assign. Only admins can create/manage admins & managers.
function assertCanAssignRole(actorRole, targetRole) {
  if (!VALID_ROLES.includes(targetRole)) {
    const err = new Error(
      `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}`
    );
    err.statusCode = 400;
    throw err;
  }
  if (actorRole !== "admin" && !MANAGER_ASSIGNABLE_ROLES.includes(targetRole)) {
    const err = new Error("Only administrators can assign admin/manager roles");
    err.statusCode = 403;
    throw err;
  }
}

// Guards against locking the business out: at least one active admin must remain.
async function assertLastAdminIntact(businessId, excludeUserId) {
  const remainingAdmins = await Users.countDocuments({
    business: businessId,
    role: "admin",
    status: "active",
    _id: { $ne: excludeUserId },
  });
  if (remainingAdmins < 1) {
    const err = new Error(
      "Operation denied: the business must keep at least one active administrator"
    );
    err.statusCode = 403;
    throw err;
  }
}

// Case-insensitive email lookup scoped to a business.
function findByEmailInBusiness(email, businessId, excludeId) {
  const query = {
    business: businessId,
    email: new RegExp(`^${escapeRegex(String(email).trim())}$`, "i"),
  };
  if (excludeId) query._id = { $ne: excludeId };
  return Users.findOne(query);
}

// Resolve the effective seat limit + role-management flag for a business.
async function getBusinessUserPolicy(businessId) {
  const subscription = await Subscription.findOne({ business: businessId });
  if (!subscription) {
    const err = new Error("No subscription found for this business");
    err.statusCode = 403;
    throw err;
  }
  const plan = subscription.plan ? await Plan.findById(subscription.plan) : null;
  if (!plan) {
    const err = new Error("Subscription plan not found for this business");
    err.statusCode = 403;
    throw err;
  }
  const features =
    plan.features instanceof Map
      ? Object.fromEntries(plan.features)
      : plan.features || {};
  const seatLimit =
    Number(features.maxUsers) > 0
      ? Number(features.maxUsers)
      : Number(plan.userLimit) || 0; // 0 = unlimited
  return { plan, seatLimit, roleManagement: !!plan.roleManagement };
}

exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, role, phone, business } = req.body;
    if (!name || !email || !role || !password || !phone || !business) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const existingUser = await Users.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }
    const businessExists = await Business.findById(business);
    if (!businessExists) {
      return res.status(400).json({ message: "Business not found" });
    }

    // Get subscription and plan (null-safe: never crash with a 500)
    const subscription = await Subscription.findOne({ business });
    if (!subscription) {
      return res
        .status(403)
        .json({ message: "No subscription found for this business" });
    }
    const plan = subscription.plan
      ? await Plan.findById(subscription.plan)
      : null;
    if (!plan) {
      return res
        .status(403)
        .json({ message: "Subscription plan not found for this business" });
    }

    // Count current active users
    const userCount = await Users.countDocuments({
      business,
      status: "active",
    });

    // Enforce user limit
    if (plan.userLimit > 0 && userCount >= plan.userLimit) {
      return res
        .status(403)
        .json({ message: "User limit reached for your plan" });
    }

    // Enforce role management
    if (
      !plan.roleManagement &&
      req.body.role &&
      req.body.role !== "admin" &&
      req.body.role !== "cashier"
    ) {
      return res
        .status(403)
        .json({ message: "Role management not available for your plan" });
    }

    const newUser = new Users({
      name,
      email,
      password,
      role,
      phone,
      business,
    });
    await newUser.save();
    // Optionally add user to business.users array
    businessExists.users.push(newUser._id);
    await businessExists.save();
    const token = jwt.sign(
      { id: newUser._id, business, role: newUser.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );
    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newUser._id,
        name: newUser.name, // FIX: Changed from userName to name
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone,
        business: newUser.business,
      },
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password, businessName } = req.body;

    if (!email || !password || !businessName) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await Users.findOne({ email });

    // First check if user exists
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Now safely access user.business
    const business = await Business.findById(user.business);

    if (!business) {
      return res.status(400).json({ message: "Business not found" });
    }

    if (
      !business.businessName ||
      business.businessName.toLowerCase() !== businessName.toLowerCase()
    ) {
      return res.status(400).json({ message: "Business name does not match" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Block deactivated accounts - a suspended/inactive user must not get a session.
    if (user.status && user.status !== "active") {
      return res.status(403).json({
        message: `Account is ${user.status}. Please contact your administrator.`,
      });
    }

    user.lastActive = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, business: user.business, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );
    //console.log("token is :", token);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Set to true in production
      sameSite: "Strict",
    });

    // NEVER return the password hash (or any internal fields) to the client.
    return res
      .status(200)
      // token also returned for Authorization-header fallback (cookie is httpOnly
      // and may not travel cross-origin / SameSite-strict contexts)
      .json({
        message: "Login successful",
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          business: user.business,
          mustChangePassword: user.mustChangePassword,
        },
        business,
      });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "server error" });
  }
};

//verification for jwt
exports.verifyAuth = async (req, res) => {
  try {
    const token = req.cookies.token;
    // console.log("this is the Token: ", token);

    if (!token) {
      return res
        .status(401)
        .json({ message: "No token, authorization denied" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ message: "Token is not valid" });
      }
      // If token is valid, you can optionally attach user info to req for further use
      req.user = user; // Contains { id: user._id, business: user.business }
      return res.status(200).json({
        message: "Authenticated",
        user: { id: user.id, business: user.business },
      });
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Server error during token verification" });
  }
};

exports.logout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error during logout" });
  }
};

exports.fetchUserDetails = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming user ID is stored in req.user
    //console.log("User ID from token:", userId);
    //console.log("auth token is :", req.cookies.token);
    const user = await Users.findById(userId).populate("business");
    // console.log("User details fetched:", user);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({
      user: {
        id: user._id,
        name: user.name, // Changed from userName to name
        email: user.email,
        role: user.role,
        phone: user.phone,
        business: {
          id: user.business._id,
          name: user.business.businessName,
          address: user.business.businessLocation, // Changed from address to businessLocation
        },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all users for current business
exports.getAllUsers = async (req, res) => {
  try {
    const businessId = req.user.business;
    let { page = 1, limit = 10, search = "", role, status, sort } = req.query;

    // Validate + clamp pagination (prevents abuse via ?limit=1000000)
    page = Math.max(1, parseInt(page, 10) || 1);
    limit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (page - 1) * limit;

    // Escape search input before building a RegExp (invalid patterns -> 500)
    const searchRegex = new RegExp(escapeRegex(search).slice(0, 100), "i");

    const query = {
      business: businessId,
      $or: [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ],
    };
    if (role) {
      if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({ message: "Invalid role filter" });
      }
      query.role = role;
    }
    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ message: "Invalid status filter" });
      }
      query.status = status;
    }

    // Whitelisted sort (field:direction)
    const SORTABLE = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      name: { name: 1 },
      lastActive: { lastActive: -1 },
    };
    const sortSpec = SORTABLE[sort] || SORTABLE.newest;

    const users = await Users.find(query)
      .select("-password")
      .sort(sortSpec)
      .skip(skip)
      .limit(limit)
      .lean();

    const totalUsers = await Users.countDocuments(query);
    const activeUsers = await Users.countDocuments({
      business: businessId,
      status: "active",
    });

    res.json({
      users,
      totalUsers,
      activeUsers,
      totalPages: Math.max(1, Math.ceil(totalUsers / limit)),
      currentPage: page,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Create new user in current business
exports.createUser = async (req, res) => {
  try {
    const businessId = req.user.business;
    const actorRole = req.user.role;
    const { name, email, password, role, phone } = req.body;

    // Validate required fields with a useful message
    const missing = ["name", "email", "password", "role", "phone"].filter(
      (f) => !req.body[f]
    );
    if (missing.length > 0) {
      return res
        .status(400)
        .json({ message: `Missing required fields: ${missing.join(", ")}` });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }
    if (!isValidPhone(phone)) {
      return res.status(400).json({ message: "Invalid phone number" });
    }
    if (String(password).length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });
    }

    // Privilege guard: only admins may create admin/manager accounts.
    try {
      assertCanAssignRole(actorRole, role);
    } catch (e) {
      return res.status(e.statusCode || 403).json({ message: e.message });
    }

    // Duplicate email within this business (409, not a 500 crash)
    const normalizedEmail = String(email).trim().toLowerCase();
    const emailExists = await findByEmailInBusiness(
      normalizedEmail,
      businessId
    );
    if (emailExists) {
      return res
        .status(409)
        .json({ message: "A user with this email already exists" });
    }

    // Plan policy: seat limit + role management (defense in depth -
    // the route-level requireLimit middleware enforces this too).
    let policy;
    try {
      policy = await getBusinessUserPolicy(businessId);
    } catch (e) {
      return res.status(e.statusCode || 403).json({ message: e.message });
    }
    if (policy.seatLimit > 0) {
      const activeCount = await Users.countDocuments({
        business: businessId,
        status: "active",
      });
      if (activeCount >= policy.seatLimit) {
        return res.status(403).json({
          message: `User limit reached for your plan (${activeCount}/${policy.seatLimit}). Upgrade to add more users.`,
          upgradeRequired: true,
        });
      }
    }
    if (!policy.roleManagement && role !== "admin" && role !== "cashier") {
      return res
        .status(403)
        .json({ message: "Role management not available for your plan" });
    }

    const newUser = new Users({
      name: String(name).trim(),
      email: normalizedEmail,
      password, // hashed by the model's pre-save hook
      role,
      phone: String(phone).trim(),
      business: businessId,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
        String(name).trim()
      )}&background=random`,
    });

    await newUser.save();

    // Add user to business
    await Business.findByIdAndUpdate(businessId, {
      $push: { users: newUser._id },
    });

    res.status(201).json(sanitizeUser(newUser));
  } catch (error) {
    console.error(error);
    // Handle race-condition duplicates + validation errors cleanly
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ message: "A user with this email already exists" });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Server error" });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const businessId = req.user.business;
    const actorRole = req.user.role;
    const actorId = String(req.user.id);
    const userId = req.params.id;
    // console.log("Updating user:", userId, "for business:", businessId);
    const { name, email, role, phone, status } = req.body;

    // Check if user exists and belongs to this business
    const user = await Users.findOne({ _id: userId, business: businessId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const isSelf = String(user._id) === actorId;

    // Managers cannot touch administrator accounts at all.
    if (user.role === "admin" && actorRole !== "admin") {
      return res
        .status(403)
        .json({ message: "Only administrators can manage admin accounts" });
    }

    // Validate inputs
    if (email && !isValidEmail(email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }
    if (phone && !isValidPhone(phone)) {
      return res.status(400).json({ message: "Invalid phone number" });
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // Role changes: privilege + self-lockout + last-admin guards
    if (role && role !== user.role) {
      try {
        assertCanAssignRole(actorRole, role);
      } catch (e) {
        return res.status(e.statusCode || 403).json({ message: e.message });
      }
      if (isSelf) {
        return res
          .status(403)
          .json({ message: "You cannot change your own role" });
      }
      if (user.role === "admin" && user.status === "active") {
        try {
          await assertLastAdminIntact(businessId, user._id);
        } catch (e) {
          return res.status(e.statusCode || 403).json({ message: e.message });
        }
      }
      user.role = role;
    }

    // Status changes: self-lockout + last-admin guards
    if (status && status !== user.status) {
      if (isSelf) {
        return res
          .status(403)
          .json({ message: "You cannot change your own account status" });
      }
      if (
        user.role === "admin" &&
        user.status === "active" &&
        status !== "active"
      ) {
        try {
          await assertLastAdminIntact(businessId, user._id);
        } catch (e) {
          return res.status(e.statusCode || 403).json({ message: e.message });
        }
      }
      user.status = status;
    }

    // Check if new email is available
    if (email && email.trim().toLowerCase() !== String(user.email).toLowerCase()) {
      const emailExists = await findByEmailInBusiness(
        email,
        businessId,
        user._id
      );
      if (emailExists) {
        return res.status(409).json({ message: "Email already in use" });
      }
      user.email = String(email).trim().toLowerCase();
    }

    if (name) user.name = String(name).trim();
    if (phone) user.phone = String(phone).trim();

    await user.save();

    res.json(sanitizeUser(user));
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      return res.status(409).json({ message: "Email already in use" });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Server error" });
  }
};
//get specific user
exports.getUserById = async (req, res) => {
  try {
    const businessId = req.user.business;
    const userId = req.params.id;

    // Find user in same business
    const user = await Users.findOne({
      _id: userId,
      business: businessId,
    }).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const businessId = req.user.business;
    const actorId = String(req.user.id);
    const userId = req.params.id;

    // You cannot delete your own account (use a different admin).
    if (String(userId) === actorId) {
      return res
        .status(403)
        .json({ message: "You cannot delete your own account" });
    }

    // Check if user exists and belongs to this business
    const user = await Users.findOne({ _id: userId, business: businessId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Never remove the last active administrator.
    if (user.role === "admin" && user.status === "active") {
      try {
        await assertLastAdminIntact(businessId, user._id);
      } catch (e) {
        return res.status(e.statusCode || 403).json({ message: e.message });
      }
    }

    await user.deleteOne();

    // Remove from business
    await Business.findByIdAndUpdate(businessId, { $pull: { users: userId } });

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Reset password (admin-initiated). The password is hashed by the model hook.
exports.resetPassword = async (req, res) => {
  try {
    const businessId = req.user.business;
    const actorId = String(req.user.id);
    const userId = req.params.id;
    const { newPassword } = req.body;

    if (!newPassword || String(newPassword).length < 8) {
      return res
        .status(400)
        .json({ message: "New password must be at least 8 characters" });
    }

    // Check if user exists and belongs to this business
    const user = await Users.findOne({ _id: userId, business: businessId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (String(user._id) === actorId) {
      return res.status(400).json({
        message:
          "You cannot reset your own password here. Use Forgot Password instead.",
      });
    }

    user.password = String(newPassword);
    user.mustChangePassword = true;
    await user.save();

    res.json({
      message: `Password reset for ${user.email}. They must change it on next login.`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await Users.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate reset token
    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    // Construct reset link
    const resetLink = `${process.env.FRONTEND_URL}/reset-password.html?token=${resetToken}`;

    // Send email with reset link
    await sendResetLinkEmail(user.email, resetLink);

    res.status(200).json({ message: "Reset link sent to email" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /verify-reset-code
exports.verifyResetToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }
      res.json({ valid: true, userId: decoded.id });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
exports.publicResetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }

      try {
        const user = await Users.findById(decoded.id);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        //do not hash password

        user.password = newPassword;
        await user.save();

        res.json({ message: "Password reset successfully" });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

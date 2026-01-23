const Users = require("../models/user");
const Business = require("../models/businessDetails");
const Subscription = require("../models/subscription.model");
const Plan = require("../models/plan.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sendResetLinkEmail = require("../utils/emailService");

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

    // Get subscription and plan
    const subscription = await Subscription.findOne({ business });
    const plan = await Plan.findById(subscription.plan);

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
      { id: newUser._id, business },
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

    if (business.businessName.toLowerCase() !== businessName.toLowerCase()) {
      return res.status(400).json({ message: "Business name does not match" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid email or password" });
    }
    const token = jwt.sign(
      { id: user._id, business: user.business },
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

    return res
      .status(200)
      .json({ message: "Login successful", user, business });
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
    const { page = 1, limit = 10, search = "" } = req.query;

    const skip = (page - 1) * limit;
    const searchRegex = new RegExp(search, "i");

    const query = {
      business: businessId,
      $or: [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ],
    };

    const users = await Users.find(query)
      .select("-password")
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalUsers = await Users.countDocuments(query);
    const activeUsers = await Users.countDocuments({
      ...query,
      status: "active",
    });

    res.json({
      users,
      totalUsers,
      activeUsers,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: parseInt(page),
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
    const { name, email, password, role, phone } = req.body;

    const newUser = new Users({
      name,
      email,
      password, // FIX: Store hashed password
      role,
      phone,
      business: businessId,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
        name
      )}&background=random`,
    });

    await newUser.save();

    // Add user to business
    await Business.findByIdAndUpdate(businessId, {
      $push: { users: newUser._id },
    });

    // Return user without password
    const userResponse = newUser.toObject();
    delete userResponse.password;

    res.status(201).json(userResponse);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const businessId = req.user.business;
    const userId = req.params.id;
    // console.log("Updating user:", userId, "for business:", businessId);
    const { name, email, role, phone, status } = req.body;

    // Check if user exists and belongs to this business
    const user = await Users.findOne({ _id: userId, business: businessId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if new email is available
    if (email && email !== user.email) {
      const emailExists = await Users.findOne({ email, business: businessId });
      if (emailExists) {
        return res.status(400).json({ message: "Email already in use" });
      }
      user.email = email;
    }

    user.name = name || user.name;
    user.role = role || user.role;
    user.phone = phone || user.phone;
    user.status = status || user.status;
    user.lastActive = new Date();

    await user.save();

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json(userResponse);
  } catch (error) {
    console.error(error);
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
    const userId = req.params.id;

    // Check if user exists and belongs to this business
    const user = await Users.findOne({ _id: userId, business: businessId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
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

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    const businessId = req.user.business;
    const userId = req.params.id;
    const { newPassword } = req.body;

    // Check if user exists and belongs to this business
    const user = await Users.findOne({ _id: userId, business: businessId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: "Password reset successfully" });
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

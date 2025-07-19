const Users = require("../models/user");
const Business = require("../models/businessDetails");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.registerUser = async (req, res) => {
  try {
    const { email, password, role, phone, business } = req.body;
    if (!email || !email || !role || !password || !phone || !business) {
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
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new Users({
      userName,
      email,
      password: hashedPassword,
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
        userName: newUser.UserName,
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
    // console.log("request received is  :", req.body);
    const { email, password, businessName } = req.body;

    if (!email || !password || !businessName) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const user = await Users.findOne({ email });
    // console.log("user is :", user);
    const business = await Business.findById(user.business);
    // console.log("Business is  :", business);
    if (!user && !business) {
      return res
        .status(400)
        .json({ message: "User or business not found,check your credentials" });
    }
    if (business.businessName !== businessName) {
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
        userName: user.userName,
        email: user.email,
        role: user.role,
        phone: user.phone,
        business: {
          id: user.business._id,
          name: user.business.businessName,
          address: user.business.address,
        },
        user,
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

    // Check if email already exists in this business
    const existingUser = await Users.findOne({ email, business: businessId });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Email already exists in this business" });
    }

    const newUser = new Users({
      name,
      email,
      password,
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
    console.log("Updating user:", userId, "for business:", businessId);
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

    await user.remove();

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

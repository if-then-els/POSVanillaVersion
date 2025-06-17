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
    console.log("request received is  :", req.body);
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
    console.log("token is :", token);

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

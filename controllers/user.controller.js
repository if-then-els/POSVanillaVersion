const Users = require("../models/user");
const Business = require("../models/businessDetails");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.registerUser = async (req, res) => {
  try {
    const { username, email, password, role, phone, business } = req.body;
    if (!username || !email || !role || !password || !phone || !business) {
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
      username,
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
        username: newUser.username,
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
    const { userName, password, businessName } = req.body;
    if (!userName || !password || !businessName) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const user = await Users.findOne({ userName });
    const business = await Business.findOne({ businessName });
    if (!user && !business) {
      return res
        .status(400)
        .json({ message: "User or business not found,check your credentials" });
    }
    return res
      .status(200)
      .json({ message: "Login successful", user, business });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "server error" });
  }
};

exports.createInitialUser = async (req, res) => {
  try {
    const admin = {
      username: "admin",
      email: "admin@pos.com",
      password: "admin",
      role: "admin",
      phone: "0114088623",
    };
    const existingUser = await Users.findOne({ email: admin.email });
    if (existingUser) {
      return res.status(400).json({
        message:
          "Admin user already exists,login with the instructions given by the provider",
      });
    }
    const hashedPassword = await bcrypt.hash(admin.password, 10);
    const newUser = new Users({
      username: admin.username,
      email: admin.email,
      password: hashedPassword,
      role: admin.role,
      phone: admin.phone,
    });
    await newUser.save();
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.status(201).json({
      message: "Admin user created successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "server error" });
  }
};

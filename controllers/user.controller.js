const Users = require("../models/user");
const Business = require("../models/businessDetails");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.registerUser = async (req, res) => {
  try {
    const { username, email, password, role, phone } = req.body;
    if ((!username, !email, !role, !password, !role, !phone)) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const existingUser = await Users.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new Users({
      username,
      email,
      password: hashedPassword,
      role,
      phone,
    });
    await newUser.save();
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone,
      },
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


exports.loginUser = async (req,res) => {
  try{
    const {userName,password,businessName} = req.body;
    if(!userName || !password || !businessName){
      return res.status(400).json({message: "All fields are required"});
    }
    const user = await Users.findOne({userName});
    const business = await Business.findOne({businessName});
    if(!user && !business){
      return res.status(400).json({message: "User or business not found,check your credentials"});
    }
    return res.status(200).json({message:"Login successful",user,business});
  }catch(error){
    console.error(error);
    return res.status(500).json({message:"server error"});
  }
}
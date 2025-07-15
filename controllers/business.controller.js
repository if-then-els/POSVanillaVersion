const BusinessDetails = require("../models/businessDetails");
const bcrypt = require("bcrypt");
const Users = require("../models/user");
const Subscription = require("../models/subscription.model");
const { verifyToken } = require("../middleware/auth.middleware");
const jwt = require("jsonwebtoken");

exports.registerBusiness = async (req, res) => {
  try {
    const {
      businessName,
      businessLocation,
      businessPhone,
      businessEmail,
      password,
      identificationNumber,
      adminUsername,
      adminEmail,
      adminPhone,
    } = req.body;
    if (
      !businessName ||
      !businessLocation ||
      !businessPhone ||
      !businessEmail ||
      !password ||
      !identificationNumber ||
      !adminUsername ||
      !adminEmail ||
      !adminPhone
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const existingBusiness = await BusinessDetails.findOne({ businessEmail });
    if (existingBusiness) {
      return res.status(400).json({ message: "Business carts" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newBusiness = new BusinessDetails({
      businessName,
      businessLocation,
      businessPhone,
      businessEmail,
      password: hashedPassword,
      identificationNumber,
      dateCreated: new Date(),
    });
    await newBusiness.save();

    // Create admin user for this business
    const adminUser = new Users({
      username: adminUsername,
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
      phone: adminPhone,
      business: newBusiness._id,
    });
    await adminUser.save();
    newBusiness.users.push(adminUser._id);
    await newBusiness.save();

    // Create free trial subscription
    const trialEnd = new Date();
    trialEnd.setMonth(trialEnd.getMonth() + 1);
    await Subscription.create({
      business: newBusiness._id,
      plan: "trial",
      startDate: new Date(),
      endDate: trialEnd,
      status: "active",
      autoRenew: false,
    });

    res.status(201).json({
      message: "Business and admin user registered successfully",
      business: {
        id: newBusiness._id,
        businessName: newBusiness.businessName,
        businessEmail: newBusiness.businessEmail,
      },
      adminUser: {
        id: adminUser._id,
        username: adminUser.username,
        email: adminUser.email,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

exports.getBusinessDetails = async (req, res) => {
  try {
    const token = req.cookies.token;
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
    });
    const businessId = req.user.business; // Assuming the business ID is stored in the token
    const business = await BusinessDetails.findById({ _id: businessId });
    return res.status(200).json({
      business: {
        id: business._id,
        businessName: business.businessName,
        businessLocation: business.businessLocation,
        businessPhone: business.businessPhone,
        businessEmail: business.businessEmail,
        identificationNumber: business.identificationNumber,
        dateCreated: business.dateCreated,
      },
    });
  } catch (error) {
    console.error(error);
    //res.status(500).json({ message: "Server error", error });
  }
};

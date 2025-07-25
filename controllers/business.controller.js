const BusinessDetails = require("../models/businessDetails");
const bcrypt = require("bcrypt");
const Users = require("../models/user");
const Subscription = require("../models/subscription.model");
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

    // Validate required fields
    const requiredFields = [
      "businessName",
      "businessLocation",
      "businessPhone",
      "businessEmail",
      "password",
      "identificationNumber",
      "adminUsername",
      "adminEmail",
      "adminPhone",
    ];

    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: "All fields are required",
        missingFields,
      });
    }

    // Check for existing business
    const existingBusiness = await BusinessDetails.findOne({ businessEmail });
    if (existingBusiness) {
      return res.status(400).json({ message: "Business already exists" });
    }

    // Hash password

    // Create new business
    const newBusiness = new BusinessDetails({
      businessName,
      businessLocation,
      businessPhone,
      businessEmail,
      password,
      identificationNumber,
      dateCreated: new Date(),
    });
    await newBusiness.save();

    // Create admin user
    const adminUser = new Users({
      name: adminUsername,
      email: adminEmail,
      password: password,
      role: "admin",
      phone: adminPhone,
      business: newBusiness._id,
    });

    await adminUser.save();

    // Add admin to business users
    newBusiness.users.push(adminUser._id);
    await newBusiness.save();

    // Create trial subscription
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

    // Generate JWT token
    const token = jwt.sign(
      {
        id: adminUser._id,
        business: newBusiness._id,
        role: "admin",
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    console;
    res.status(201).json({
      message: "Business and admin user registered successfully",
      token, // Send token to client
      business: {
        id: newBusiness._id,
        businessName: newBusiness.businessName,
        businessEmail: newBusiness.businessEmail,
      },
      adminUser: {
        id: adminUser._id,
        username: adminUser.name,
        email: adminUser.email,
      },
    });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({
      message: "Server error during registration",
      error: error.message,
    });
  }
};

exports.getBusinessDetails = async (req, res) => {
  try {
    // Business ID comes from verifyToken middleware
    const businessId = req.user.business;

    if (!businessId) {
      return res.status(400).json({
        message: "Business ID missing in token",
      });
    }

    const business = await BusinessDetails.findById(businessId).select(
      "-password -__v"
    ); // Exclude sensitive fields

    if (!business) {
      return res.status(404).json({
        message: "Business not found",
      });
    }

    res.status(200).json({
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
    console.error("Business Details Error:", error);
    res.status(500).json({
      message: "Server error retrieving business details",
      error: error.message,
    });
  }
};

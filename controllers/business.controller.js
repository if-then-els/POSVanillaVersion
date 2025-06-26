const BusinessDetails = require("../models/businessDetails");
const bcrypt = require("bcrypt");
const Users = require("../models/user");
const Subscription = require("../models/subscription.model");

exports.registerBusiness = async (req, res) => {
  try {
    const {
      businessName,
      businessLocation,
      businessPhone,
      businessEmail,
      password,
      businessRegistrationNumber,
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
      !businessRegistrationNumber ||
      !adminUsername ||
      !adminEmail ||
      !adminPhone
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const existingBusiness = await BusinessDetails.findOne({ businessEmail });
    if (existingBusiness) {
      return res.status(400).json({ message: "Business already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newBusiness = new BusinessDetails({
      businessName,
      businessLocation,
      businessPhone,
      businessEmail,
      password: hashedPassword,
      businessRegistrationNumber,
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

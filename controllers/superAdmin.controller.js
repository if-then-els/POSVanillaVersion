const SuperAdmin = require("../models/SuperAdmin");
const BusinessDetails = require("../models/businessDetails");
const Subscription = require("../models/subscription.model");
const Plan = require("../models/plan.model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

function signAdminToken(admin) {
  const secret = process.env.JWT_SECRET_SUPERADMIN || process.env.JWT_SECRET + "_superadmin";
  return jwt.sign(
    { id: admin._id, email: admin.email, role: "superadmin" },
    secret,
    { expiresIn: "12h" }
  );
}

function setAdminCookie(res, token) {
  res.cookie("adminToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 12 * 60 * 60 * 1000,
  });
}

// Admin Registration
exports.registerAdmin = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }
    const existingAdmin = await SuperAdmin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists" });
    }
    const admin = new SuperAdmin({ name, email, password });
    await admin.save();
    const token = signAdminToken(admin);
    setAdminCookie(res, token);
    res.status(201).json({ token, admin: { id: admin._id, name: admin.name, email: admin.email } });
  } catch (error) {
    console.error("registerAdmin error:", error);
    res.status(500).json({ message: "Error creating admin" });
  }
};

exports.register = exports.registerAdmin;

// Admin Login
exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await SuperAdmin.findOne({ email });
    if (!admin) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    const token = signAdminToken(admin);
    setAdminCookie(res, token);
    res.status(200).json({ token, admin: { id: admin._id, name: admin.name, email: admin.email } });
  } catch (error) {
    console.error("loginAdmin error:", error);
    res.status(500).json({ message: "Error logging in" });
  }
};

exports.login = exports.loginAdmin;

// Get Admin Profile
exports.getAdminProfile = async (req, res) => {
  try {
    const admin = await SuperAdmin.findById(req.user.id).select("-password");
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    res.json(admin);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.getAdmin = exports.getAdminProfile;

exports.logout = async (req, res) => {
  res.clearCookie("adminToken");
  res.json({ message: "Logged out" });
};

// Platform metrics for SuperAdmin dashboard
exports.metrics = async (req, res) => {
  try {
    const totalBusinesses = await BusinessDetails.countDocuments();
    const activeSubs = await Subscription.countDocuments({ status: "active", endDate: { $gte: new Date() } });
    const plans = await Plan.find({}).lean();
    const mrrAgg = await Subscription.aggregate([
      { $match: { status: "active", endDate: { $gte: new Date() } } },
      { $group: { _id: null, mrr: { $sum: "$price" } } },
    ]);
    const mrr = mrrAgg[0]?.mrr || 0;
    const byPlan = await Subscription.aggregate([
      { $match: { status: "active" } },
      { $group: { _id: "$plan", count: { $sum: 1 } } },
    ]);
    res.json({ totalBusinesses, activeSubs, mrr, plansCount: plans.length, byPlan });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to load metrics" });
  }
};

exports.listBusinesses = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const search = (req.query.search || "").trim();
    const status = req.query.status;
    const plan = req.query.plan;
    const skip = (page - 1) * limit;

    const businessFilter = {};
    if (search) {
      businessFilter.$or = [
        { businessName: { $regex: search, $options: "i" } },
        { businessEmail: { $regex: search, $options: "i" } },
        { businessPhone: { $regex: search, $options: "i" } },
      ];
    }
    if (status) businessFilter.status = status;

    let businessIds = null;
    if (plan) {
      const subs = await Subscription.find({ plan }).select("business");
      businessIds = subs.map((s) => s.business);
      businessFilter._id = { $in: businessIds };
    }

    const [businesses, total] = await Promise.all([
      BusinessDetails.find(businessFilter).sort({ dateCreated: -1 }).skip(skip).limit(limit).lean(),
      BusinessDetails.countDocuments(businessFilter),
    ]);

    // attach subscription info
    const subMap = {};
    const subs = await Subscription.find({ business: { $in: businesses.map((b) => b._id) } })
      .populate("plan")
      .lean();
    subs.forEach((s) => (subMap[s.business.toString()] = s));

    const enriched = businesses.map((b) => ({
      ...b,
      subscription: subMap[b._id.toString()] || null,
    }));

    res.json({ businesses: enriched, total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to list businesses" });
  }
};

exports.updateBusinessStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // active | suspended | pending
    if (!["active", "suspended", "pending"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const business = await BusinessDetails.findByIdAndUpdate(id, { status }, { new: true });
    if (!business) return res.status(404).json({ message: "Business not found" });
    res.json({ message: "Status updated", business });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to update status" });
  }
};

exports.impersonateBusiness = async (req, res) => {
  try {
    const { id } = req.params;
    const business = await BusinessDetails.findById(id);
    if (!business) return res.status(404).json({ message: "Business not found" });
    // find admin user of that business
    const User = require("../models/user");
    const adminUser = await User.findOne({ business: id, role: "admin" }).sort({ createdAt: 1 });
    const payload = {
      id: adminUser ? adminUser._id : business._id,
      business: business._id,
      role: adminUser ? adminUser.role : "admin",
      impersonatedBy: req.user.id,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ token, business: { id: business._id, businessName: business.businessName } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to impersonate" });
  }
};

exports.listSubscriptions = async (req, res) => {
  try {
    const subs = await Subscription.find({}).populate("plan").populate("business", "businessName businessEmail").sort({ endDate: -1 }).limit(100).lean();
    res.json({ subscriptions: subs });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to list subscriptions" });
  }
};

exports.listPlans = async (req, res) => {
  try {
    const plans = await Plan.find({}).lean();
    res.json({ plans });
  } catch (e) {
    res.status(500).json({ message: "Failed to list plans" });
  }
};

exports.upsertPlan = async (req, res) => {
  try {
    const { name, price, description, billingCycle, features, isActive, trialDays } = req.body;
    if (!name) return res.status(400).json({ message: "Plan name required" });
    const plan = await Plan.findOneAndUpdate(
      { name },
      { $set: { price, description, billingCycle, features, isActive, trialDays } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ plan });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to upsert plan" });
  }
};

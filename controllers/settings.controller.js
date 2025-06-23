const Settings = require("../models/settings");
const Users = require("../models/user");

// Get all settings for the current business
exports.getSettings = async (req, res) => {
  try {
    const business = req.user.business;
    let settings = await Settings.findOne({ business });
    if (!settings) {
      settings = new Settings({ business });
      await settings.save();
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch settings", error: err });
  }
};

// Update all settings for the current business
exports.updateSettings = async (req, res) => {
  try {
    const business = req.user.business;
    let settings = await Settings.findOne({ business });
    if (!settings) settings = new Settings({ business });
    Object.assign(settings, req.body);
    await settings.save();
    res.json({ success: true, message: "Settings updated", settings });
  } catch (err) {
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to update settings",
        error: err,
      });
  }
};

// Save or update store settings (name, address, phone, email, tax, currency, logo)
exports.saveStoreSettings = async (req, res) => {
  try {
    const business = req.user.business;
    let settings = await Settings.findOne({ business });
    if (!settings) settings = new Settings({ business });
    settings.storeName = req.body.name;
    settings.storeAddress = req.body.address;
    settings.storePhone = req.body.phone;
    settings.storeEmail = req.body.email;
    settings.taxRate = req.body.taxRate;
    settings.currency = req.body.currency;
    // Optionally handle logo upload here
    await settings.save();
    res.json({ success: true, message: "Store settings saved", settings });
  } catch (err) {
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to save store settings",
        error: err,
      });
  }
};

// Get receipt settings for the current business
exports.getReceiptSettings = async (req, res) => {
  try {
    const business = req.user.business;
    let settings = await Settings.findOne({ business });
    if (!settings) settings = new Settings({ business });
    res.json({
      showLogo: settings.showLogo,
      showTaxDetails: settings.showTax,
      includeContactInfo: settings.includeContact,
      printAutomatically: settings.printAuto,
      footerText: settings.footerText,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch receipt settings", error: err });
  }
};

// Update receipt settings for the current business
exports.saveReceiptSettings = async (req, res) => {
  try {
    const business = req.user.business;
    let settings = await Settings.findOne({ business });
    if (!settings) settings = new Settings({ business });
    settings.showLogo = req.body.showLogo;
    settings.showTax = req.body.showTaxDetails;
    settings.includeContact = req.body.includeContactInfo;
    settings.printAuto = req.body.printAutomatically;
    settings.footerText = req.body.footerText;
    await settings.save();
    res.json({ success: true, message: "Receipt settings saved", settings });
  } catch (err) {
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to save receipt settings",
        error: err,
      });
  }
};

// Get user settings (username, email) for the current user
exports.getUserSettings = async (req, res) => {
  try {
    const user = await Users.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({
      username: user.userName || user.username,
      email: user.email,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch user settings", error: err });
  }
};

// Update user settings (username, email, password)
exports.updateUserSettings = async (req, res) => {
  try {
    const user = await Users.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Update username/email
    if (req.body.username) user.userName = req.body.username;
    if (req.body.email) user.email = req.body.email;

    // Handle password change
    if (req.body.currentPassword && req.body.newPassword) {
      const bcrypt = require("bcrypt");
      const valid = await bcrypt.compare(
        req.body.currentPassword,
        user.password
      );
      if (!valid) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      }
      if (req.body.newPassword !== req.body.confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match" });
      }
      user.password = await bcrypt.hash(req.body.newPassword, 10);
    }

    await user.save();
    res.json({ success: true, message: "User settings updated" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to update user settings", error: err });
  }
};

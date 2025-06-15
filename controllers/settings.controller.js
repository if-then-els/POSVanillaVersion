const Settings = require("../models/settings");

// Get settings
exports.getSettings = async (req, res) => {
  try {
    console.log("Fetching settings...");
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
      await settings.save();
    }
    res.json(settings);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch settings", error });
  }
};

// Update settings
exports.updateSettings = async (req, res) => {
  try {
    console.log("Updating settings with data:", req.body);
    let settings = await Settings.findOne();
    if (!settings) settings = new Settings();
    Object.assign(settings, req.body);
    await settings.save();
    res.json({ success: true, message: "Settings updated", settings });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to update settings", error });
  }
};

//settings for store information, tax rates, currency, etc.
// exports.saveStoreSettings = async (req, res) => {
//   try {
//     let settings = await Settings.findOne();
//     if (!settings) settings = new Settings();

//     // Update settings with request body
//     Object.assign(settings, req.body);

//     await settings.save();
//     res.json({ success: true, message: "Store settings saved", settings });
//   } catch (err) {
//     res.status(500).json({ success: false, message: "Failed to save store settings" });
//   }
// }

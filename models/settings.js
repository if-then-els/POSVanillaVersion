const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema({
  storeName: String,
  storeAddress: String,
  storePhone: String,
  storeEmail: String,
  taxRate: Number,
  currency: String,
  showLogo: { type: Boolean, default: true },
  showTax: { type: Boolean, default: true },
  includeContact: { type: Boolean, default: true },
  printAuto: { type: Boolean, default: false },
  footerText: String,
  logoUrl: String, // Optional: for logo uploads
});

module.exports = mongoose.model("Settings", settingsSchema);

const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: "Business" },

  storeName: String,
  storeAddress: String,
  storePhone: String,
  storeEmail: String,
  taxRate: Number,
  currency: String,
  showLogo: { type: Boolean, default: true },
  showTax: { type: Boolean, default: true },
  includeContact: { type: Boolean, default: true },
  printAuto: { type: Boolean, default: true },
  footerText: String,
  logoUrl: String,
});

module.exports = mongoose.model("Settings", settingsSchema);

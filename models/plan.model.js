const mongoose = require("mongoose");

const planSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  price: { type: Number, required: true },
  description: String,
  // legacy fields kept for migration compatibility
  userLimit: { type: Number, default: 2 },
  roleManagement: { type: Boolean, default: false },
  billingCycle: { type: String, enum: ["monthly", "annual"], default: "monthly" },
  isActive: { type: Boolean, default: true },
  trialDays: { type: Number, default: 30 },
  features: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },
});

module.exports = mongoose.model("Plan", planSchema);

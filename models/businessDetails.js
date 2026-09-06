const mongoose = require("mongoose");

const businessDetailsSchema = new mongoose.Schema({
  businessName: { type: String, required: true },
  businessLocation: { type: String, required: true },
  businessPhone: { type: String, required: true },
  businessEmail: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  identificationNumber: { type: String, required: true },
  dateCreated: { type: Date, default: Date.now },
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  status: { type: String, enum: ["active", "pending", "suspended"], default: "active" },
  logoUrl: { type: String },
  createdBySuperAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin" },
});

businessDetailsSchema.index({ status: 1 });

module.exports = mongoose.model("BusinessDetails", businessDetailsSchema);

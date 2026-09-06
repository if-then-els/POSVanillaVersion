const mongoose = require("mongoose");
const tenantPlugin = require("../utils/tenantPlugin");

const supplierSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: "BusinessDetails", required: true, index: true },
  name: { type: String, required: true },
  contactName: String,
  phone: String,
  email: String,
  address: String,
  notes: String,
  status: { type: String, enum: ["active","inactive"], default: "active" },
}, { timestamps: true });

supplierSchema.plugin(tenantPlugin);
supplierSchema.index({ business: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Supplier", supplierSchema);

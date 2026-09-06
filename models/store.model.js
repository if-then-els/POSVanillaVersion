const mongoose = require("mongoose");
const tenantPlugin = require("../utils/tenantPlugin");

const storeSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: "BusinessDetails", required: true },
  name: { type: String, required: true },
  location: { type: String },
  isMain: { type: Boolean, default: false },
  phone: String,
  status: { type: String, enum: ["active", "inactive"], default: "active" },
}, { timestamps: true });

storeSchema.plugin(tenantPlugin);
storeSchema.index({ business: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Store", storeSchema);

const mongoose = require("mongoose");

const planSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  price: { type: Number, required: true },
  description: String,
  userLimit: { type: Number, default: 2 }, // e.g. 2 for Basic, 10 for Standard, 0 for Unlimited
  roleManagement: { type: Boolean, default: false }, // true for Standard/Premium
});

module.exports = mongoose.model("Plan", planSchema);

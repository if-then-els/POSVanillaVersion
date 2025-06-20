const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"], required: true },
  phone: { type: String, required: true },
  business: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BusinessDetails",
    required: true,
  },
});

// Compound unique index for username + business
userSchema.index({ username: 1, business: 1 }, { unique: true });

module.exports = mongoose.model("User", userSchema);

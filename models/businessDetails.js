const mongoose = require("mongoose");

const businessDetailsSchema = new mongoose.Schema({
  businessName: { type: String, required: true },
  businessLocation: { type: String, required: true },
  businessPhone: { type: String, required: true },
  businessEmail: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  identificationNumber: { type: String, required: true },
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

module.exports = mongoose.model("BusinessDetails", businessDetailsSchema);

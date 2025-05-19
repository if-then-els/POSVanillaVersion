const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const businessDetailsSchema = new mongoose.Schema({
  businessName: {
    type: String,
    required: true,
  },
  businessLocation: {
    type: String,
    required: true,
  },
  businessPhone: {
    type: String,
    required: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  ownerName: {
    type: String,
    required: true,
  },
  ownerNationalIdentificationNumber: {
    type: String,
    required: true,
  },
});
module.exports = mongoose.model("BusinessDetails", businessDetailsSchema);

const mongoose = require("mongoose");
const Owner = require("../models/Owner")


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
    ref: "Owner",
    required: true,
  },
  //ownersname from the signup(setup owner logic)
  ownerName: {
    type: mongoose.Schema.Types.String,
    ref:"Owner",
    required: true,
  },
  //owners idnumber from the signup(setup owner logic)
  ownerNationalIdentificationNumber: {
    type: mongoose.Schema.Types.String,
    ref:"Owner",
    required: true,
  },
});
module.exports = mongoose.model("BusinessDetails", businessDetailsSchema);

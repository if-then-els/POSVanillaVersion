const mongoose = require("mongoose");

const planSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  price: { type: Number, required: true },
  description: String,
});

module.exports = mongoose.model("Plan", planSchema);

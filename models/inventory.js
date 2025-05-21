const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema({
  productName: {
    type: String,
    required: true,
  },
  productPrice: {
    type: Number,
    required: true,
  },
  productQuantity: {
    type: Number,
    required: true,
  },
  productDescription: {
    type: String,
    required: true,
  },
  productCategory: {
    type: String,
    required: true,
  },
  productBatchNumber: {
    type: String,
    required: true,
    unique: true,
  },
});
const Inventory = mongoose.model("Inventory", inventorySchema);
module.exports = Inventory;

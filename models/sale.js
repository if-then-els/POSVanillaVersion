const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema({
  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Inventory",
        required: true,
      },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
    },
  ],
  total: { type: Number, required: true },
  customerName: { type: String },
  paymentMethod: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Sale", saleSchema);

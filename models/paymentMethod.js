const mongoose = require("mongoose");

const paymentMethodSchema = new mongoose.Schema({
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BusinessDetails",
    required: true,
  },
  type: {
    type: String,
    enum: ["mpesa_stk", "mpesa_paybill", "card", "bank"],
    required: true,
  },
  provider: String, // e.g., 'Safaricom', 'Paystack'
  label: String, // For frontend display: "Pay via Till 123456"
  config: {
    type: Map,
    of: String, // API keys, Paybill number, etc.
  },
  active: { type: Boolean, default: true },
  dateAdded: { type: Date, default: Date.now },
});

module.exports = mongoose.model("PaymentMethod", paymentMethodSchema);

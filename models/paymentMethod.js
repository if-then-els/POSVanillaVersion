const mongoose = require("mongoose");

const paymentMethodSchema = new mongoose.Schema({
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BusinessDetails",
    required: true,
  },
  type: {
    type: String,
    enum: ["card", "mobile_money", "paypal", "mpesa_stk", "mpesa_paybill", "bank"],
    required: true,
  },
  provider: String,
  label: String,
  config: {
    type: Map,
    of: String,
  },
  active: { type: Boolean, default: true },
  dateAdded: { type: Date, default: Date.now },
});

module.exports = mongoose.model("PaymentMethod", paymentMethodSchema);

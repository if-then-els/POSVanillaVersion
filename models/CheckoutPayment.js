const mongoose = require("mongoose");

const checkoutPaymentSchema = new mongoose.Schema({
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BusinessDetails",
    required: true,
  },
  saleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Sale",
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  paymentType: {
    type: String,
    enum: ["mpesa_till", "mpesa_stk", "mpesa_paybill", "mobile_money", "card", "paypal", "cash"],
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "completed", "failed", "cancelled"],
    default: "pending",
  },
  mpesaCheckoutRequestId: String,
  mpesaReceiptNumber: String,
  transactionId: String,
  metadata: Map,
  createdAt: { type: Date, default: Date.now },
  completedAt: Date,
});

module.exports = mongoose.model("CheckoutPayment", checkoutPaymentSchema);

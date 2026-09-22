const mongoose = require("mongoose");

const SubscriptionLogSchema = new mongoose.Schema({
  business: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BusinessDetails", // Changed to BusinessDetails if that's the correct ref
    required: true,
  },
  plan: {
    type: mongoose.Schema.Types.ObjectId, // Changed to ObjectId to reference Plan model directly
    ref: "Plan",
    required: true,
  },
  startDate: { type: Date }, // Added startDate to log
  endDate: { type: Date }, // Added endDate to log
  status: {
    // Added status to log
    type: String,
    enum: ["active", "inactive", "cancelled", "expired", "pending"],
  },
  action: String, // e.g., "upgrade", "renew", "cancel", "payment"
  date: { type: Date, default: Date.now },
  discount: Number,
  totalPrice: Number, // Renamed from price to totalPrice for clarity in log
  price: Number, // Amount charged in merchant currency
  priceCurrency: String, // Merchant currency the charge was made in
  paidAmountUSD: Number, // Tier price in USD (source of truth for conversions)
  mpesaTransactionId: { type: String },
  paystackTransactionId: { type: String }, // New: Paystack transaction ID for logs
});

module.exports = mongoose.model("SubscriptionLog", SubscriptionLogSchema);

const mongoose = require("mongoose");

const SubscriptionSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusinessDetails",
      required: true,
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId, // Changed to ObjectId to reference Plan model directly
      ref: "Plan",
      required: true,
    },
    startDate: { type: Date, required: true, default: Date.now },
    endDate: { type: Date },
    status: {
      type: String,
      enum: ["active", "inactive", "cancelled", "expired", "pending"],
      default: "inactive",
    },
    autoRenew: { type: Boolean, default: false },
    paymentMethod: { type: String },
    lastPaymentDate: { type: Date },
    nextBillingDate: { type: Date },
    mpesaCheckoutRequestID: { type: String, default: null },
    mpesaTransactionId: { type: String, default: null },
    paystackReference: { type: String, default: null }, // New: Paystack transaction reference
    paystackTransactionId: { type: String, default: null }, // New: Paystack transaction ID
    price: { type: Number, required: true }, // Added price to subscription model
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subscription", SubscriptionSchema);

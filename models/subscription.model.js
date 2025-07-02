const mongoose = require("mongoose");

const SubscriptionSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusinessDetails",
      required: true,
    },
    plan: { type: String, required: true },
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
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subscription", SubscriptionSchema);

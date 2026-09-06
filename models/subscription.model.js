const mongoose = require("mongoose");
const tenantPlugin = require("../utils/tenantPlugin");

const subscriptionSchema = mongoose.Schema({
  business: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BusinessDetails",
    required: true,
  },
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Plan",
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "active", "expired", "cancelled"],
    default: "pending",
  },
  autoRenew: {
    type: Boolean,
    default: false,
  },
  price: {
    type: Number,

    required: true,
  },
  paymentMethod: {
    type: String,
    enum: ["mpesa", "paystack", "card"],
    required: true,
  },
  lastPaymentDate: Date,
  nextBillingDate: Date,
  paystackReference: String,
  paystackTransactionId: String,
  mpesaTransactionId: String,
});

subscriptionSchema.plugin(tenantPlugin);
subscriptionSchema.index({ business: 1, status: 1 });
subscriptionSchema.index({ business: 1, endDate: 1 });

module.exports = mongoose.model("Subscription", subscriptionSchema);

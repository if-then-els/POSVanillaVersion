const mongoose = require("mongoose");

const SubscriptionLogSchema = new mongoose.Schema({
  business: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Business",
    required: true,
  },
  oldPlan: String,
  newPlan: String,
  action: String, // e.g., "upgrade", "renew", "cancel"
  date: { type: Date, default: Date.now },
  discount: Number,
  totalPrice: Number,
});

module.exports = mongoose.model("SubscriptionLog", SubscriptionLogSchema);

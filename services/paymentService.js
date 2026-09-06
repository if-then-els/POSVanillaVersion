const crypto = require("crypto");
const Plan = require("../models/plan.model");
const Subscription = require("../models/subscription.model");
const SubscriptionLog = require("../models/subscriptionLog.model");
const mpesa = require("./paymentProviders/mpesaProvider");
const paystack = require("./paymentProviders/paystackProvider");
const bank = require("./paymentProviders/bankProvider");

async function activateSubscription({ businessId, planId, paymentMethod, reference, priceOverride }) {
  const plan = await Plan.findById(planId);
  if (!plan) throw new Error("Plan not found");
  const now = new Date();
  const endDate = new Date(now);
  endDate.setMonth(now.getMonth() + 1);
  let sub = await Subscription.findOne({ business: businessId });
  let action = "subscription_created";
  if (sub && sub.status === "active") action = "subscription_upgraded";
  else if (sub && sub.status !== "active") action = "subscription_reactivated";

  const price = priceOverride !== undefined ? priceOverride : plan.price;
  if (sub) {
    sub.plan = planId;
    sub.startDate = now;
    sub.endDate = endDate;
    sub.status = "active";
    sub.price = price;
    sub.paymentMethod = paymentMethod;
    sub.paystackReference = paymentMethod === "paystack" ? reference : sub.paystackReference;
    sub.mpesaTransactionId = paymentMethod === "mpesa" ? reference : sub.mpesaTransactionId;
    sub.lastPaymentDate = now;
    sub.nextBillingDate = endDate;
    await sub.save();
  } else {
    sub = await Subscription.create({
      business: businessId,
      plan: planId,
      startDate: now,
      endDate,
      status: "active",
      autoRenew: true,
      price,
      paymentMethod,
      paystackReference: paymentMethod === "paystack" ? reference : undefined,
      mpesaTransactionId: paymentMethod === "mpesa" ? reference : undefined,
      lastPaymentDate: now,
      nextBillingDate: endDate,
    });
  }
  await SubscriptionLog.create({
    business: businessId,
    plan: planId,
    action,
    date: now,
    paymentMethod,
    price,
    paystackReference: reference,
    status: "completed",
  });
  return sub;
}

function buildReference(businessId, planId) {
  return `${businessId}_${planId}_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
}

module.exports = { activateSubscription, buildReference, mpesa, paystack, bank };

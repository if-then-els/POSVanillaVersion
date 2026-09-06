const PaymentMethod = require("../models/paymentMethod");
const Subscription = require("../models/subscription.model");

const TIER_ALLOWED = {
  basic: ["cash", "mpesa_stk", "mpesa_paybill", "mpesa_till", "mpesa"],
  Standard: ["cash", "mpesa_stk", "mpesa_paybill", "mpesa_till", "mpesa", "card", "mobile_money", "paystack"],
  premium: ["cash", "mpesa_stk", "mpesa_paybill", "mpesa_till", "mpesa", "card", "mobile_money", "paystack", "bank"],
  trial: ["cash"],
};

function getAllowedForPlan(plan) {
  if (!plan) return ["cash"];
  const feat = plan.features instanceof Map ? Object.fromEntries(plan.features) : plan.features || {};
  const allowed = ["cash"];
  if (feat.mpesa) allowed.push("mpesa_stk", "mpesa_paybill", "mpesa_till", "mpesa", "mobile_money");
  if (feat.cardPayments) allowed.push("card", "paystack");
  if (feat.bankPayments) allowed.push("bank");
  // fallback to name-based if features missing
  if (allowed.length === 1 && TIER_ALLOWED[plan.name]) return TIER_ALLOWED[plan.name];
  return [...new Set(allowed)];
}

exports.addPaymentMethod = async (req, res) => {
  try {
    const businessId = req.user.business || req.user.businessId;
    const method = await PaymentMethod.create({
      businessId,
      type: req.body.type,
      provider: req.body.provider,
      label: req.body.label,
      config: req.body.config,
    });
    res.status(201).json({ success: true, method });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPaymentMethods = async (req, res) => {
  try {
    const businessId = req.user.business || req.user.businessId;
    const methods = await PaymentMethod.find({ businessId, active: true });
    // also compute allowed types from tier
    let allowedTypes = ["cash"];
    try {
      const sub = await Subscription.findOne({ business: businessId, status: "active" }).populate("plan");
      if (sub?.plan) allowedTypes = getAllowedForPlan(sub.plan);
    } catch {}
    // filter configured methods by allowed
    const filtered = methods.filter((m) => allowedTypes.includes(m.type));
    // always include cash even if not configured
    const hasCash = filtered.some((m) => m.type === "cash");
    const result = hasCash ? filtered : [{ type: "cash", label: "Cash", provider: "cash", active: true }, ...filtered];
    res.json({ success: true, methods: result, allowedTypes, tier: allowedTypes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

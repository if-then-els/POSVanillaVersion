const Subscription = require("../models/subscription.model");

/**
 * requireFeature(flag) - checks current business subscription's plan.features[flag]
 * If flag is numeric limit (e.g., maxProducts) use requireLimit
 */
function requireFeature(flag, msg) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.business) {
        return res.status(401).json({ message: "Business context missing" });
      }
      // Superadmin bypasses tier (for impersonation/platform ops)
      if (req.user.role === "superadmin") return next();

      const sub = await Subscription.findOne({
        business: req.user.business,
        status: "active",
        endDate: { $gte: new Date() },
      }).populate("plan");

      if (!sub || !sub.plan) {
        return res.status(403).json({ message: "No active subscription - feature unavailable" });
      }

      const features = sub.plan.features || {};
      // support both Map and plain object
      const val = features instanceof Map ? features.get(flag) : features[flag];

      if (val === true || (typeof val === "number" && val > 0)) {
        req.subscription = sub;
        req.plan = sub.plan;
        return next();
      }
      // handle boolean false
      if (val === false || val === undefined || val === null) {
        return res.status(403).json({
          message: msg || `Feature '${flag}' not available on your plan (${sub.plan.name}). Please upgrade.`,
          feature: flag,
          plan: sub.plan.name,
          upgradeRequired: true,
        });
      }
      req.subscription = sub;
      req.plan = sub.plan;
      return next();
    } catch (e) {
      console.error("tier requireFeature error", e);
      return res.status(500).json({ message: "Tier check failed" });
    }
  };
}

/**
 * requireLimit(featureFlag, currentCountGetter) - enforces numeric caps like maxUsers, maxProducts
 * example: requireLimit("maxProducts", async (req)=> await Inventory.countDocuments({business: req.user.business}))
 */
function requireLimit(flag, countGetter) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.business) return res.status(401).json({ message: "Business context missing" });
      if (req.user.role === "superadmin") return next();
      const sub = await Subscription.findOne({
        business: req.user.business,
        status: "active",
        endDate: { $gte: new Date() },
      }).populate("plan");
      if (!sub || !sub.plan) return res.status(403).json({ message: "No active subscription" });
      const features = sub.plan.features || {};
      const limit = features instanceof Map ? features.get(flag) : features[flag];
      if (limit === undefined || limit === null || limit === 0) {
        // 0 means unlimited for our convention
        req.subscription = sub;
        req.plan = sub.plan;
        return next();
      }
      const count = await countGetter(req);
      if (count >= limit) {
        return res.status(403).json({
          message: `Limit reached for '${flag}' (${count}/${limit}). Upgrade to increase limit.`,
          feature: flag,
          limit,
          count,
          upgradeRequired: true,
        });
      }
      req.subscription = sub;
      req.plan = sub.plan;
      return next();
    } catch (e) {
      console.error("requireLimit error", e);
      return res.status(500).json({ message: "Limit check failed" });
    }
  };
}

/**
 * attachPlan - non-blocking attaches req.plan if available (for UI feature flags)
 */
async function attachPlan(req, res, next) {
  try {
    if (!req.user || !req.user.business) return next();
    const sub = await Subscription.findOne({
      business: req.user.business,
      status: "active",
    }).populate("plan");
    if (sub) {
      req.subscription = sub;
      req.plan = sub.plan;
    }
    next();
  } catch (e) {
    next();
  }
}

module.exports = { requireFeature, requireLimit, attachPlan };

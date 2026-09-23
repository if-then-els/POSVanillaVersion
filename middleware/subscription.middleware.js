const Subscription = require("../models/subscription.model");
const jwt = require("jsonwebtoken");

module.exports = async function (req, res, next) {
  // Allow public routes and registration endpoint
  // NOTE: subscription-management / payment routes must ALWAYS bypass the
  // active-subscription check, otherwise expired users can never renew
  // (chicken-and-egg 403: "Subscription inactive or expired").
  const publicRoutes = [
    "/business/register",
    "/api/business/register",
    "/payments/mpesa/c2b/confirmation",
    "/payments/mpesa/callback",
    "/mpesa/callback",
    "/businesses",
    "/api/business/businesses",
    "/plans",
    "/subscriptions/status",
    "/subscriptions/details",
    "/api/superadmin/login",
    "/api/superadmin/register",
    // Renewal / payment flows - must work while expired:
    "/subscriptions/upgrade",
    "/subscriptions/cancel",
    "/subscriptions/history",
    "/subscriptions/update-payment-method",
    "/payments/paystack/initiate",
    "/payments/paystack/webhook",
  ];

  // Prefix matches (e.g. /payments/paystack/status/:reference)
  const publicPrefixes = [
    "/payments/paystack/status",
    "/payments/paystack/webhook",
  ];

  // Skip subscription check for public routes
  if (
    publicRoutes.includes(req.path) ||
    publicPrefixes.some((p) => req.path === p || req.path.startsWith(p + "/"))
  ) {
    return next();
  }

  try {
    // Allow superadmin token to bypass subscription checks
    const adminToken = req.cookies.adminToken;
    if (adminToken) {
      try {
        const adminSecret = process.env.JWT_SECRET_SUPERADMIN || process.env.JWT_SECRET + "_superadmin";
        const admin = jwt.verify(adminToken, adminSecret);
        if (admin.role === "superadmin") return next();
      } catch (_) {
        // not a valid admin token, continue to business check
      }
    }
    const token = req.cookies.token || req.header("x-auth-token") || (req.headers.authorization && req.headers.authorization.split(" ")[1]);

    if (!token) {
      return res
        .status(401)
        .json({ message: "Authentication token missing subs auth." });
    }

    let user;
    try {
      user = jwt.verify(token, process.env.JWT_SECRET);
      // Backwards compat: inject role if missing
      if (!user.role && user.id) {
        try {
          const User = require("../models/user");
          const u = await User.findById(user.id).select("role business");
          if (u) {
            user.role = u.role;
            user.business = user.business || u.business;
          }
        } catch {}
        if (!user.role) user.role = "cashier";
      }
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res
          .status(401)
          .json({ message: "Authentication token expired." });
      }
      return res.status(403).json({ message: "Invalid authentication token." });
    }

    req.user = user;

    if (!req.user || !req.user.business) {
      return res.status(403).json({
        message: "Business ID not found in token. Invalid user.",
      });
    }

    const businessId = req.user.business;

    // Query for active subscription
    const subscription = await Subscription.findOne({
      business: businessId,
      status: "active", // Add status check
      endDate: { $gte: new Date() },
    });

    if (!subscription) {
      return res.status(403).json({
        message: "Subscription inactive or expired. Please renew to continue.",
      });
    }

    next();
  } catch (err) {
    console.error("Subscription check failed unexpectedly:", err);
    res
      .status(500)
      .json({ message: "Subscription check failed due to a server error." });
  }
};

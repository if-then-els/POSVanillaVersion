const Subscription = require("../models/subscription.model");
const jwt = require("jsonwebtoken");

module.exports = async function (req, res, next) {
  // Allow public routes and registration endpoint
  const publicRoutes = [
    "/business/register", // Add this line
    "/payments/mpesa/c2b/confirmation",
    "/payments/mpesa/callback",
    "/mpesa/callback",
  ];

  // Skip subscription check for public routes
  if (publicRoutes.includes(req.path)) {
    return next();
  }

  try {
    const token = req.cookies.token;

    if (!token) {
      return res
        .status(401)
        .json({ message: "Authentication token missing subs auth." });
    }

    let user;
    try {
      user = jwt.verify(token, process.env.JWT_SECRET);
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
      return res
        .status(403)
        .json({ message: "Business ID not found in token. Invalid user." });
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

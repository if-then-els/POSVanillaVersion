const Subscription = require("../models/subscription.model");
const jwt = require("jsonwebtoken");

module.exports = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: "Authentication token missing." });
    }

    let user;
    try {
      // Verify the token synchronously as it's within an async function's try block
      user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      // Specific error handling for JWT issues
      if (err.name === "TokenExpiredError") {
        return res
          .status(401)
          .json({ message: "Authentication token expired." });
      }
      return res.status(403).json({ message: "Invalid authentication token." });
    }

    // Attach the user payload to the request object
    req.user = user;

    // Ensure req.user.business exists before proceeding
    if (!req.user || !req.user.business) {
      return res
        .status(403)
        .json({ message: "Business ID not found in token. Invalid user." });
    }

    const businessId = req.user.business;
    //  console.log("Checking subscription for business ID:", businessId); // For debugging

    // Query for an active and unexpired subscription
    const subscription = await Subscription.findOne({
      business: businessId,
      status: "active",
      endDate: { $gte: new Date() },
    });

    //console.log("Found subscription:", subscription); // For debugging

    if (!subscription) {
      return res.status(403).json({
        message: "Subscription inactive or expired. Please renew to continue.",
      });
    }

    // If everything is good, proceed to the next middleware or route handler
    next();
  } catch (err) {
    // Catch-all for any unexpected errors during the process
    console.error("Subscription check failed unexpectedly:", err); // Log the actual error for debugging
    res
      .status(500)
      .json({ message: "Subscription check failed due to a server error." });
  }
};

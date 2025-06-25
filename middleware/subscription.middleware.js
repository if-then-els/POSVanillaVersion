const Subscription = require("../models/subscription.model");
const Business = require("../models/businessDetails");

module.exports = async (req, res, next) => {
  try {
    const businessId = req.user.business;
    const subscription = await Subscription.findOne({
      business: businessId,
      status: "active",
      endDate: { $gte: new Date() },
    });
    if (!subscription) {
      return res.status(403).json({
        message: "Subscription inactive or expired. Please renew to continue.",
      });
    }
    next();
  } catch (err) {
    res.status(500).json({ message: "Subscription check failed", error: err });
  }
};

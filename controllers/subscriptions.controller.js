const BusinessDetails = require("../models/businessDetails");
const Subscription = require("../models/subscription.model");
const SubscriptionLog = require("../models/subscriptionLog.model"); // New: for logging

exports.upgradeSubscription = async (req, res) => {
  try {
    const { businessId, newPlan, durationMonths, newPlanPrice } = req.body;
    if (!businessId || !newPlan || !durationMonths || !newPlanPrice) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Find current active subscription
    const currentSub = await Subscription.findOne({
      business: businessId,
      status: "active",
      endDate: { $gte: new Date() },
    });

    let discount = 0;
    let startDate = new Date();
    let endDate = new Date();
    let oldPlan = null;

    if (currentSub) {
      oldPlan = currentSub.plan;
      // Prorate unused days
      const now = new Date();
      const totalDays = Math.ceil(
        (currentSub.endDate - currentSub.startDate) / (1000 * 60 * 60 * 24)
      );
      const remainingDays = Math.max(
        Math.ceil((currentSub.endDate - now) / (1000 * 60 * 60 * 24)),
        0
      );
      const dailyRate = currentSub.price ? currentSub.price / totalDays : 0;
      discount = dailyRate * remainingDays;

      // Expire current subscription
      currentSub.status = "expired";
      await currentSub.save();
    }

    // Calculate final price after discount
    const totalPrice = newPlanPrice * durationMonths - discount;

    endDate.setMonth(endDate.getMonth() + Number(durationMonths));

    // Expire any other active subscriptions
    await Subscription.updateMany(
      { business: businessId, status: "active" },
      { $set: { status: "expired" } }
    );

    // Create new subscription (pending until payment)
    const newSub = await Subscription.create({
      business: businessId,
      plan: newPlan,
      startDate,
      endDate,
      status: "pending",
      autoRenew: false,
      price: newPlanPrice * durationMonths,
      discount,
      totalPrice,
    });

    // Log the change
    await SubscriptionLog.create({
      business: businessId,
      oldPlan,
      newPlan,
      action: "upgrade",
      date: new Date(),
      discount,
      totalPrice,
    });

    res.status(200).json({
      message: "Subscription upgrade initiated. Please complete payment.",
      subscription: newSub,
      totalPrice,
      discount,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.getSubscriptionDetails = async (req, res) => {
  try {
    const business = req.user.business;
    if (!business) {
      return res.status(400).json({ message: "Business ID is required" });
    }
    const subscription = await Subscription.findOne({
      business: business,
      status: "active",
    }).populate("business", "businessName businessEmail");
    if (!subscription) {
      return res.status(404).json({ message: "No active subscription found" });
    }
    res.status(200).json({
      message: "subscription details retrieved sucessfully",
      subscription: {
        id: subscription._id,
        plan: subscription.plan,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        status: subscription.status,
        autoRenew: subscription.autoRenew,
        price: subscription.price,
        discount: subscription.discount,
        totalPrice: subscription.totalPrice,
      },
    });
  } catch (error) {
    console.error("Error retrieving subscription details:", error);
    res.status(500).json({
      message: "Server error retrieving subscription details",
      error: error.message,
    });
  }
};

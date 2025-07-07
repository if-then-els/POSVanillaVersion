const BusinessDetails = require("../models/businessDetails");
const Subscription = require("../models/subscription.model");
const SubscriptionLog = require("../models/subscriptionLog.model");
const Plan = require("../models/plan.model");

exports.upgradeSubscription = async (req, res) => {
  try {
    const { businessId, newPlan, durationMonths, phone } = req.body;
    if (!businessId || !newPlan || !durationMonths) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Fetch plan price from DB
    const planDoc = await Plan.findOne({ name: newPlan });
    if (!planDoc) {
      return res.status(400).json({ message: "Selected plan does not exist" });
    }
    const newPlanPrice = planDoc.price;

    // Expire current subscription
    await Subscription.updateMany(
      { business: businessId, status: "active" },
      { $set: { status: "expired" } }
    );

    // Create new pending subscription
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + Number(durationMonths));
    const newSub = await Subscription.create({
      business: businessId,
      plan: newPlan,
      startDate,
      endDate,
      status: "pending",
      autoRenew: false,
      price: newPlanPrice * durationMonths,
      totalPrice: newPlanPrice * durationMonths,
    });

    // Log the change
    await SubscriptionLog.create({
      business: businessId,
      oldPlan: null,
      newPlan,
      action: "upgrade",
      date: new Date(),
      discount: 0,
      totalPrice: newPlanPrice * durationMonths,
    });

    // If paid plan, trigger M-Pesa
    if (newPlan !== "trial" && phone) {
      // Call initiateMpesaPayment controller here or from frontend
      return res.status(200).json({
        message: "Subscription upgrade initiated. Please complete payment.",
        subscription: newSub,
        requirePayment: true,
      });
    }

    // For free/trial plans, activate immediately
    newSub.status = "active";
    await newSub.save();
    return res.status(200).json({
      message: "Subscription upgraded successfully.",
      subscription: newSub,
      requirePayment: false,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.getSubscriptionDetails = async (req, res) => {
  try {
    // Try to get business from req.user, fallback to req.query or req.body for testing
    const business = req.user.business;
    console.log("business from req.user:", business);
    if (!business) {
      return res.status(400).json({ message: "Business ID is required" });
    }
    const subscription = await Subscription.findOne({
      business: business,
      status: "active",
    });
    //console.log("Found subscription:", subscription);
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
        business: subscription.business,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error retrieving subscription details",
      error: error.message,
    });
  }
};

exports.cancelSubscription = async (req, res) => {
  try {
    const { businessId } = req.body;
    if (!businessId) {
      return res.status(400).json({ message: "Business ID is required" });
    }
    const sub = await Subscription.findOne({
      business: businessId,
      status: "active",
    });
    if (!sub) {
      return res.status(404).json({ message: "No active subscription found" });
    }
    sub.status = "cancelled";
    await sub.save();

    await SubscriptionLog.create({
      business: businessId,
      oldPlan: sub.plan,
      newPlan: null,
      action: "cancel",
      date: new Date(),
      discount: 0,
      totalPrice: sub.totalPrice,
    });

    res.status(200).json({ message: "Subscription cancelled" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

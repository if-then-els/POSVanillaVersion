const BusinessDetails = require("../models/businessDetails");
const Subscription = require("../models/subscription.model");
const SubscriptionLog = require("../models/subscriptionLog.model"); // Ensure this is correctly imported
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

    // --- Start: New logic for handling current subscription ---

    // Find the current active subscription for this business
    const currentActiveSubscription = await Subscription.findOne({
      business: businessId,
      status: "active",
    });

    if (currentActiveSubscription) {
      // 1. Create a log entry for the expiring subscription
      const expiredLog = await SubscriptionLog.create({
        business: currentActiveSubscription.business,
        plan: currentActiveSubscription.plan, // Use the ID of the plan
        startDate: currentActiveSubscription.startDate,
        endDate: new Date(), // Set end date to now
        status: "expired", // Mark as expired in the log
        price: currentActiveSubscription.price,
        mpesaTransactionId: currentActiveSubscription.mpesaTransactionId, // Keep original transaction ID
        // Add any other relevant fields from the old subscription you want to log
      });
      console.log("Logged expired subscription:", expiredLog);

      // 2. Delete the old active subscription from the main Subscription collection
      await Subscription.deleteOne({ _id: currentActiveSubscription._id });
      console.log(
        "Deleted old active subscription:",
        currentActiveSubscription._id
      );
    }

    // --- End: New logic ---

    // Create new pending subscription
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + Number(durationMonths));
    const newSub = await Subscription.create({
      business: businessId,
      plan: planDoc._id, // Store the actual ObjectId of the plan
      startDate,
      endDate,
      status: "pending", // New subscription starts as pending
      autoRenew: false,
      price: newPlanPrice * durationMonths,
      // mpesaTransactionId will be updated later upon successful payment confirmation
    });

    res.status(200).json({
      message: "New subscription initiated. Awaiting payment confirmation.",
      subscriptionId: newSub._id,
      // You might want to return the new subscription details for frontend tracking
    });
  } catch (error) {
    console.error("Error upgrading subscription:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

exports.cancelSubscription = async (req, res) => {
  try {
    const { businessId } = req.body;
    if (!businessId) {
      return res.status(400).json({ message: "Business ID is required" });
    }

    const subscription = await Subscription.findOne({
      business: businessId,
      status: "active",
    });

    if (!subscription) {
      return res.status(404).json({ message: "Active subscription not found" });
    }

    // Create a log entry for the cancelled subscription
    const cancelledLog = await SubscriptionLog.create({
      business: subscription.business,
      plan: subscription.plan,
      startDate: subscription.startDate,
      endDate: new Date(), // Set end date to now
      status: "cancelled", // Mark as cancelled in the log
      price: subscription.price,
      mpesaTransactionId: subscription.mpesaTransactionId,
    });
    console.log("Logged cancelled subscription:", cancelledLog);

    // Delete the active subscription from the main Subscription collection
    await Subscription.deleteOne({ _id: subscription._id });

    res.status(200).json({ message: "Subscription cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

exports.getSubscriptionDetails = async (req, res) => {
  try {
    const businessId = req.user.business; // Assuming businessId is attached to req.user
    if (!businessId) {
      return res.status(400).json({ message: "Business ID is required" });
    }

    const subscription = await Subscription.findOne({
      business: businessId,
      status: "active",
    }).populate("plan"); // Populate plan details

    if (!subscription) {
      return res.status(404).json({ message: "No active subscription found" });
    }

    res.status(200).json({
      message: "Subscription details retrieved successfully",
      subscription,
    });
  } catch (error) {
    console.error("Error getting subscription details:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

exports.getSubscriptionPaymentLogs = async (req, res) => {
  try {
    const businessId = req.user.business;
    if (!businessId) {
      return res.status(400).json({ message: "Business ID is required" });
    }
    const logs = await SubscriptionLog.find({ business: businessId })
      .sort({ date: -1 })
      .populate("business", "businessName")
      .populate("plan", "name price"); // Populate plan name and price
    res.status(200).json({
      message: "Subscription payment logs retrieved successfully",
      logs,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.getSubscriptionPlans = async (req, res) => {
  try {
    const plans = await Plan.find({});
    res.status(200).json({
      message: "Subscription plans retrieved successfully",
      plans,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// This function will now serve as the primary way to get historical subscriptions
exports.getSubscriptionHistory = async (req, res) => {
  try {
    const businessId = req.user.business; // Assuming businessId is attached to req.user
    if (!businessId) {
      return res.status(400).json({ message: "Business ID is required" });
    }

    // Fetch all subscription logs for the business, sorted by end date descending
    const history = await SubscriptionLog.find({ business: businessId })
      .sort({ endDate: -1 })
      .populate("plan", "name price"); // Populate plan name and price for display

    res.status(200).json({
      message: "Subscription history retrieved successfully",
      history,
    });
  } catch (error) {
    console.error("Error getting subscription history:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

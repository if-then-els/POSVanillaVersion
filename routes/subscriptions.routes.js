const express = require("express");
const router = express.Router();
const subscriptionsController = require("../controllers/subscriptions.controller");
const subscriptionMiddleware = require("../middleware/subscription.middleware");
const Plan = require("../models/plan.model");
const Subscription = require("../models/subscription.model"); // <-- Import Subscription model

// Upgrade subscription
router.post(
  "/subscriptions/upgrade",
  subscriptionMiddleware,
  subscriptionsController.upgradeSubscription
);

// Cancel subscription
router.post(
  "/subscriptions/cancel",
  subscriptionMiddleware,
  subscriptionsController.cancelSubscription
);

// Get subscription details
router.get(
  "/subscriptions/details",
  subscriptionMiddleware, // <-- this must be here
  subscriptionsController.getSubscriptionDetails
);

// Get plans
router.get("/plans", async (req, res) => {
  try {
    const plans = await Plan.find({});
    res.json({ plans });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch plans" });
  }
});

// Get subscription status
router.get("/subscriptions/status", async (req, res) => {
  try {
    const { id } = req.query;
    const sub = await Subscription.findById(id);
    if (!sub)
      return res.status(404).json({ message: "Subscription not found" });
    res.json({ status: sub.status });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch status" });
  }
});

router.get(
  "/subscriptions/history",
  subscriptionMiddleware,
  subscriptionsController.getSubscriptionHistory
);

module.exports = router;

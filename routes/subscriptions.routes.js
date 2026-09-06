const express = require("express");
const router = express.Router();
const subscriptionsController = require("../controllers/subscriptions.controller");
const subscriptionMiddleware = require("../middleware/subscription.middleware");
const Plan = require("../models/plan.model");
const Subscription = require("../models/subscription.model");
const auth = require("../middleware/auth.middleware");
// Route to upgrade/create a subscription (triggered internally after payment verification)
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
  auth.verifyToken,
  subscriptionsController.getSubscriptionDetails
);

// Get plans (public route)
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

// Initiate Paystack Payment (frontend calls this)
router.post(
  "/payments/paystack/initiate",
  subscriptionsController.initiatePaystackPayment
);

// Paystack Webhook endpoint (Paystack calls this for verification)
router.post(
  "/payments/paystack/webhook",
  subscriptionsController.verifyPaystackPayment
);

// Route for frontend to check payment status (optional, webhook is more reliable)
router.get(
  "/payments/paystack/status/:reference",
  subscriptionsController.checkPaystackStatus
);

// Route to update payment method (triggered internally after payment verification)
router.post(
  "/subscriptions/update-payment-method",
  subscriptionMiddleware,
  subscriptionsController.updatePaymentMethod
);

module.exports = router;

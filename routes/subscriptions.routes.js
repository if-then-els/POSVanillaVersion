const express = require("express");
const router = express.Router();
const subscriptionsController = require("../controllers/subscriptions.controller");
const Plan = require("../models/plan.model");
const Subscription = require("../models/subscription.model");
const auth = require("../middleware/auth.middleware");
const currencyService = require("../services/currencyService");
// Route to upgrade/create a subscription (triggered internally after payment verification)
// NOTE: must use auth only (NOT subscriptionMiddleware) so expired users can renew.
router.post(
  "/subscriptions/upgrade",
  auth.verifyToken,
  subscriptionsController.upgradeSubscription
);

// Cancel subscription (auth only - expired users get a clean 404, not a 403 loop)
router.post(
  "/subscriptions/cancel",
  auth.verifyToken,
  subscriptionsController.cancelSubscription
);

// Get subscription details
router.get(
  "/subscriptions/details",
  auth.verifyToken,
  subscriptionsController.getSubscriptionDetails
);

// Get plans (public route). Prices are USD; ?currency= converts to a local currency.
router.get("/plans", async (req, res) => {
  try {
    const plans = await Plan.find({});
    const currency = req.query.currency || "";
    const converted = await Promise.all(
      plans.map((plan) => currencyService.priceForDisplay(plan, currency)),
    );
    res.json({ plans: converted });
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
  auth.verifyToken,
  subscriptionsController.getSubscriptionHistory
);

// Initiate Paystack Payment (frontend calls this)
// Auth only (NOT subscriptionMiddleware) so expired users can pay/renew.
router.post(
  "/payments/paystack/initiate",
  auth.verifyToken,
  subscriptionsController.initiatePaystackPayment
);

// Paystack Webhook endpoint (Paystack calls this for verification)
router.post(
  "/payments/paystack/webhook",
  subscriptionsController.verifyPaystackPayment
);

// Frontend-driven confirmation after the popup reports success.
// Needed because webhooks can't reach localhost/dev - the server re-verifies
// the reference with Paystack and fulfills the subscription.
router.post(
  "/payments/paystack/confirm",
  auth.verifyToken,
  subscriptionsController.confirmPaystackPayment
);

// Route for frontend to check payment status (optional, webhook is more reliable)
router.get(
  "/payments/paystack/status/:reference",
  auth.verifyToken,
  subscriptionsController.checkPaystackStatus
);

// Route to update payment method (triggered internally after payment verification)
router.post(
  "/subscriptions/update-payment-method",
  auth.verifyToken,
  subscriptionsController.updatePaymentMethod
);

module.exports = router;

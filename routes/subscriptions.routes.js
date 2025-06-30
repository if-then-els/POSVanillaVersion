const express = require("express");
const router = express.Router();
const subscriptionsController = require("../controllers/subscriptions.controller");
const subscriptionMiddleware = require("../middleware/subscription.middleware");

// Upgrade subscription
router.post(
  "/subscriptions/upgrade",
  subscriptionsController.upgradeSubscription
);

// Cancel subscription
router.post(
  "/subscriptions/cancel",
  subscriptionsController.cancelSubscription
);

// Get subscription details
router.get(
  "/subscriptions/details",
  subscriptionMiddleware, // <-- this must be here
  subscriptionsController.getSubscriptionDetails
);
module.exports = router;

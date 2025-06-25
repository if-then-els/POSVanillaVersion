const express = require("express");
const router = express.Router();
const subscriptionsController = require("../controllers/subscriptions.controller");

// Upgrade subscription
router.post(
  "/subscriptions/upgrade",
  subscriptionsController.upgradeSubscription
);

// get sub details
router.get(
  "/subscriptions/details",
  subscriptionsController.getSubscriptionDetails
);

module.exports = router;

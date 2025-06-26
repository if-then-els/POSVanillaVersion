const express = require("express");
const router = express.Router();
const subscriptionsController = require("../controllers/subscriptions.controller");

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

module.exports = router;

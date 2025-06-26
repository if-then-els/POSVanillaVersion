const express = require("express");
const router = express.Router();
const subscriptionsController = require("../controllers/subscriptions.controller");
const { verifyToken } = require("../middleware/auth.middleware");

// Upgrade subscription
router.post(
  "/subscriptions/upgrade",
  verifyToken,
  subscriptionsController.upgradeSubscription
);

// get sub details
router.get(
  "/subscriptions/details",
  verifyToken,
  subscriptionsController.getSubscriptionDetails
);

module.exports = router;

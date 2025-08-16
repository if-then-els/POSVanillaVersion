const express = require("express");
const router = express.Router();
const salesController = require("../controllers/sales.controller");
const { verifyToken } = require("../middleware/auth.middleware");
const subscriptionMiddleware = require("../middleware/subscription.middleware");

router.post(
  "/processSale",
  verifyToken,
  subscriptionMiddleware,
  salesController.processSale
);
router.get(
  "/getSales",
  verifyToken,
  subscriptionMiddleware,
  salesController.getSales
);
router.get(
  "/salesAmount",
  verifyToken,
  subscriptionMiddleware,
  salesController.getTotalSalesAmount
);
router.get(
  "/receipt/:saleId",
  verifyToken,
  subscriptionMiddleware,
  salesController.getReceipt
);
router.get(
  "/getTotalOrders",
  verifyToken,
  subscriptionMiddleware,
  salesController.getTotalOrders
);

module.exports = router;

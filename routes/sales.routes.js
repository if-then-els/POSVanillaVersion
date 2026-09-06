const express = require("express");
const router = express.Router();
const salesController = require("../controllers/sales.controller");
const { verifyToken } = require("../middleware/auth.middleware");
const subscriptionMiddleware = require("../middleware/subscription.middleware");
const { authorize } = require("../middleware/rbac.middleware");
const { audit } = require("../middleware/audit.middleware");

router.post(
  "/processSale",
  verifyToken,
  authorize("admin","manager","cashier"),
  subscriptionMiddleware,
  audit("sale.create","Sale"),
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

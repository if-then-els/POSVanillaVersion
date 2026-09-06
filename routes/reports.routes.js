const express = require("express");
const router = express.Router();
const reportsController = require("../controllers/reports.controller");
const { verifyToken } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");
const { requireFeature } = require("../middleware/tier.middleware");

router.get(
  "/reports/sales-overview",
  verifyToken,
  authorize("admin", "manager", "cashier", "inventory"),
  requireFeature("reportsBasic"),
  reportsController.salesOverview
);
router.get(
  "/reports/product-sales",
  verifyToken,
  authorize("admin", "manager"),
  requireFeature("reportsAdvanced"),
  reportsController.productSales
);
router.get(
  "/reports/category-sales",
  verifyToken,
  authorize("admin", "manager"),
  requireFeature("reportsAdvanced"),
  reportsController.categorySales
);
router.get(
  "/reports/recent-transactions",
  verifyToken,
  authorize("admin", "manager", "cashier"),
  reportsController.recentTransactions
);
// Premium AI endpoint placeholder
router.get(
  "/reports/profit-loss",
  verifyToken,
  authorize("admin", "manager"),
  requireFeature("reportsAdvanced"),
  reportsController.profitLoss || ((req,res)=>res.status(501).json({message:"Profit-loss report coming in Premium"}))
);

module.exports = router;

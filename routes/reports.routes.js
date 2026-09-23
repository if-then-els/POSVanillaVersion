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
router.get(
  "/reports/kpis",
  verifyToken,
  authorize("admin", "manager", "cashier", "inventory"),
  requireFeature("reportsBasic"),
  reportsController.kpis
);
router.get(
  "/reports/sales-by-day",
  verifyToken,
  authorize("admin", "manager", "cashier", "inventory"),
  requireFeature("reportsBasic"),
  reportsController.salesByDay
);
router.get(
  "/reports/sales-by-user",
  verifyToken,
  authorize("admin", "manager"),
  requireFeature("reportsAdvanced"),
  reportsController.salesByUser
);
router.get(
  "/reports/sales-by-item",
  verifyToken,
  authorize("admin", "manager"),
  requireFeature("reportsAdvanced"),
  reportsController.salesByItem
);
router.get(
  "/reports/payment-breakdown",
  verifyToken,
  authorize("admin", "manager", "cashier"),
  requireFeature("reportsBasic"),
  reportsController.paymentBreakdown
);
router.get(
  "/reports/hourly",
  verifyToken,
  authorize("admin", "manager", "cashier"),
  requireFeature("reportsBasic"),
  reportsController.hourlySales
);
router.get(
  "/reports/consumption",
  verifyToken,
  authorize("admin", "manager", "inventory"),
  requireFeature("reportsAdvanced"),
  reportsController.consumption
);
// Premium AI endpoint placeholder
router.get(
  "/reports/profit-loss",
  verifyToken,
  authorize("admin", "manager"),
  requireFeature("reportsAdvanced"),
  reportsController.profitLoss || ((req,res)=>res.status(501).json({message:"Profit-loss report coming in Premium"}))
);
// Sales by store (admin view - revenue/orders/units/profit per store)
router.get(
  "/reports/sales-by-store",
  verifyToken,
  authorize("admin", "manager"),
  requireFeature("reportsAdvanced"),
  reportsController.salesByStore
);
// Loss & disposal ledger report (admin view - written-off qty + cost value)
router.get(
  "/reports/loss",
  verifyToken,
  authorize("admin", "manager"),
  requireFeature("reportsAdvanced"),
  reportsController.lossReport
);

module.exports = router;

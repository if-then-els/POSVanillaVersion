const express = require("express");
const router = express.Router();
const reportsController = require("../controllers/reports.controller");
const { verifyToken } = require("../middleware/auth.middleware");

router.get(
  "/reports/sales-overview",
  verifyToken,
  reportsController.salesOverview
);
router.get(
  "/reports/product-sales",
  verifyToken,
  reportsController.productSales
);
router.get(
  "/reports/category-sales",
  verifyToken,
  reportsController.categorySales
);
router.get(
  "/reports/recent-transactions",
  verifyToken,
  reportsController.recentTransactions
);

module.exports = router;

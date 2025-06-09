const express = require("express");
const router = express.Router();
const reportsController = require("../controllers/reports.controller");

router.get("/reports/sales-overview", reportsController.salesOverview);
router.get("/reports/product-sales", reportsController.productSales);
router.get("/reports/category-sales", reportsController.categorySales);
router.get(
  "/reports/recent-transactions",
  reportsController.recentTransactions
);

module.exports = router;

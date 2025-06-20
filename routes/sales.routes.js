const express = require("express");
const router = express.Router();
const salesController = require("../controllers/sales.controller");
const { verifyToken } = require("../middleware/auth.middleware");

router.post("/processSale", verifyToken, salesController.processSale);
router.get("/getSales", verifyToken, salesController.getSales);
router.get("/salesAmount", verifyToken, salesController.getTotalSalesAmount);
router.get("/receipt/:saleId", verifyToken, salesController.getReceipt);
router.get("/getTotalOrders", verifyToken, salesController.getTotalOrders);

module.exports = router;

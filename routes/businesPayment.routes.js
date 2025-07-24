const express = require("express");
const router = express.Router();
const controller = require("../controllers/businessPayments.controller");
const { verifyToken } = require("../middleware/auth.middleware");

// These routes assume req.user.businessId is populated from auth
router.post("/", verifyToken, controller.addPaymentMethod);
router.get("/", verifyToken, controller.getPaymentMethods);

module.exports = router;

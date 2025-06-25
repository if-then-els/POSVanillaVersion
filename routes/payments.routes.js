const express = require("express");
const router = express.Router();
const paymentsController = require("../controllers/payments.controller");

// Initiate M-Pesa payment
router.post("/payments/mpesa", paymentsController.initiateMpesaPayment);

// M-Pesa callback (should be public)
router.post("/payments/mpesa/callback", paymentsController.mpesaCallback);

module.exports = router;

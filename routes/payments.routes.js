const express = require("express");
const router = express.Router();
const paymentsController = require("../controllers/payments.controller");

// M-Pesa STK Push Initiation
router.post("/payments/mpesa/stkpush", paymentsController.initiateMpesaStkPush);

// M-Pesa C2B Confirmation Callback
router.post(
  "/payments/mpesa/c2b/confirmation",
  paymentsController.mpesaConfirmationCallback
);
router.get("/payments/status/:id", paymentsController.getPaymentStatus);
router.post(
  "/payments/mpesa/check-status",
  paymentsController.checkMpesaPaymentStatus
);

// payments.routes.js
// router.get("/payments/mpesa/test-callback", (req, res) => {
//   console.log("Callback test successful");
//   res.status(200).json({ message: "Callback endpoint is working!" });
// });
// Optional: M-Pesa C2B Validation Callback
// router.post("/payments/mpesa/c2b/validation", paymentsController.mpesaValidationCallback);

module.exports = router;

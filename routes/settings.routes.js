const express = require("express");
const router = express.Router();
const path = require("path");
const upload = require("../middleware/multerConfig");
const settingsController = require("../controllers/settings.controller");
const { verifyToken } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");
const { requireFeature } = require("../middleware/tier.middleware");

// Get all settings (store tab)
router.get("/api/settings", verifyToken, settingsController.getSettings);
router.put("/api/settings", verifyToken, authorize("admin","manager"), settingsController.updateSettings);

// Store settings (store tab)
router.post(
  "/settings/store",
  verifyToken,
  (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err });
      }
      next();
    });
  },
  settingsController.saveStoreSettings
);
router.put(
  "/settings/store",
  verifyToken,
  settingsController.saveStoreSettings
);
router.get("/settings/store", verifyToken, settingsController.getStoreSettings);

// Receipt settings (receipt tab)
router.get(
  "/settings/receipt",
  verifyToken,
  settingsController.getReceiptSettings
);
router.put(
  "/settings/receipt",
  verifyToken,
  settingsController.saveReceiptSettings
);

// User settings (user tab)
router.get("/settings/user", verifyToken, settingsController.getUserSettings);
router.put(
  "/settings/user",
  verifyToken,
  settingsController.updateUserSettings
);

// Payment methods (checkout payments) - tier gated
router.get("/settings/payment-methods", verifyToken, settingsController.getPaymentMethods);
router.post("/settings/payment-methods", verifyToken, authorize("admin"), settingsController.addPaymentMethod);
router.put("/settings/payment-methods/:id", verifyToken, authorize("admin"), settingsController.updatePaymentMethod);
router.delete("/settings/payment-methods/:id", verifyToken, authorize("admin"), settingsController.deletePaymentMethod);

// Checkout M-Pesa payments - tier gated Basic+
router.post("/api/payments/mpesa/stkpush", verifyToken, requireFeature("mpesa"), settingsController.initiateCheckoutMpesaStkPush);
router.get("/api/payments/mpesa/status", verifyToken, settingsController.getCheckoutPaymentStatus);

// C2B (Till/Paybill) payment endpoints
router.post("/api/payments/mpesa/c2b/register", verifyToken, settingsController.registerC2BUrls);
router.post("/api/payments/mpesa/c2b/simulate", verifyToken, settingsController.simulateC2BPayment);
router.post("/api/payments/mpesa/c2b/callback", settingsController.c2bCallback);

// Initiate C2B payment (shows till/paybill to customer)
router.post("/api/payments/mpesa/c2b/initiate", verifyToken, settingsController.initiateC2BPayment);
router.get("/api/payments/mpesa/c2b/status/:checkoutId", verifyToken, settingsController.getC2BPaymentStatus);

// Manual payment recording (no API needed)
router.post("/api/payments/manual/save", verifyToken, settingsController.saveManualPayment);

module.exports = router;

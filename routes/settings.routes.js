const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settings.controller");
const { verifyToken } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");
const { requireFeature } = require("../middleware/tier.middleware");
const { audit } = require("../middleware/audit.middleware");

// Get all settings (store tab)
router.get("/api/settings", verifyToken, settingsController.getSettings);
// General + store + receipt management is admin only. Every role keeps the
// Account tab (self-service profile/password) via /settings/user below.
router.put("/api/settings", verifyToken, authorize("admin"), audit("settings.update", "Settings"), settingsController.updateSettings);

// Store settings (store tab). The controller parses the logo upload itself
// with a dedicated image-only multer setup (see settings.controller.js).
router.post(
  "/settings/store",
  verifyToken,
  authorize("admin"),
  audit("settings.store.update", "Settings"),
  settingsController.saveStoreSettings
);
router.put(
  "/settings/store",
  verifyToken,
  authorize("admin"),
  audit("settings.store.update", "Settings"),
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
  authorize("admin"),
  audit("settings.receipt.update", "Settings"),
  settingsController.saveReceiptSettings
);

// User settings (user tab - self-service for the logged-in user)
router.get("/settings/user", verifyToken, settingsController.getUserSettings);
router.put(
  "/settings/user",
  verifyToken,
  audit("settings.profile.update", "User"),
  settingsController.updateUserSettings
);

// Payment methods (checkout payments) - tier gated
// List is readable by any authenticated role (checkout needs it); secrets masked.
router.get("/settings/payment-methods", verifyToken, settingsController.getPaymentMethods);
// Single method with full config - admin only (needed to edit secrets).
router.get("/settings/payment-methods/:id", verifyToken, authorize("admin"), settingsController.getPaymentMethodById);
router.post("/settings/payment-methods", verifyToken, authorize("admin"), audit("settings.payment-method.create", "PaymentMethod"), settingsController.addPaymentMethod);
router.put("/settings/payment-methods/:id", verifyToken, authorize("admin"), audit("settings.payment-method.update", "PaymentMethod"), settingsController.updatePaymentMethod);
router.delete("/settings/payment-methods/:id", verifyToken, authorize("admin"), audit("settings.payment-method.delete", "PaymentMethod"), settingsController.deletePaymentMethod);

// Checkout M-Pesa payments - tier gated Basic+
router.post("/api/payments/mpesa/stkpush", verifyToken, requireFeature("mpesa"), settingsController.initiateCheckoutMpesaStkPush);
router.get("/api/payments/mpesa/status", verifyToken, settingsController.getCheckoutPaymentStatus);

// C2B (Till/Paybill) payment endpoints
// Platform-level setup actions are admin-only; checkout flows stay role-open.
router.post("/api/payments/mpesa/c2b/register", verifyToken, authorize("admin"), settingsController.registerC2BUrls);
router.post("/api/payments/mpesa/c2b/simulate", verifyToken, authorize("admin"), settingsController.simulateC2BPayment);
router.post("/api/payments/mpesa/c2b/callback", settingsController.c2bCallback);

// Initiate C2B payment (shows till/paybill to customer)
router.post("/api/payments/mpesa/c2b/initiate", verifyToken, settingsController.initiateC2BPayment);
router.get("/api/payments/mpesa/c2b/status/:checkoutId", verifyToken, settingsController.getC2BPaymentStatus);

// Manual payment recording (no API needed)
router.post("/api/payments/manual/save", verifyToken, settingsController.saveManualPayment);

module.exports = router;

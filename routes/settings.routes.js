const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settings.controller");
const { verifyToken } = require("../middleware/auth.middleware");

// Get all settings (store tab)
router.get("/api/settings", verifyToken, settingsController.getSettings);
router.put("/api/settings", verifyToken, settingsController.updateSettings);

// Store settings (store tab)
router.post(
  "/settings/store",
  verifyToken,
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
  "/api/settings/user",
  verifyToken,
  settingsController.updateUserSettings
);

module.exports = router;

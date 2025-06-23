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

module.exports = router;

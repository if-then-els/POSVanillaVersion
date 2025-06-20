const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settings.controller");
const { verifyToken } = require("../middleware/auth.middleware");
// Get current settings
router.get("/", verifyToken, settingsController.getSettings);

// Update settings
router.put("/", verifyToken, settingsController.updateSettings);

module.exports = router;

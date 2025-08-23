const express = require("express");
const router = express.Router();
const adminSupportController = require("../controllers/adminSupport.controller");
const { verifyToken, isAdmin } = require("../middleware/auth.middleware");

router.get(
  "/messages",
  verifyToken,
  isAdmin,
  adminSupportController.getAllMessages
);
router.post(
  "/reply",
  verifyToken,
  isAdmin,
  adminSupportController.sendAdminReply
);
router.get(
  "/conversation/:businessId",
  verifyToken,
  isAdmin,
  adminSupportController.getConversation
);

module.exports = router;

const express = require("express");
const router = express.Router();
const {
  register,
  login,
  getAdmin,
  logout,
} = require("../controllers/superAdmin.controller");
const { verifyAdminToken } = require("../middleware/auth.middleware");

// Public routes
router.post("/register", register);
router.post("/login", login);

// Protected routes
router.get("/admin", verifyAdminToken, getAdmin);
router.get("/logout", verifyAdminToken, logout);

module.exports = router;

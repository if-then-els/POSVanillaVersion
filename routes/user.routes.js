const express = require("express");
const router = express.Router();
const User = require("../models/user");
const { verifyToken } = require("../middleware/auth.middleware");
const {
  registerUser,
  loginUser,
  verifyAuth,
} = require("../controllers/user.controller");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/verifyAuth", verifyAuth);

module.exports = router;

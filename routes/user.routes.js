const express = require("express");
const router = express.Router();
const User = require("../models/user");
const { verifyToken } = require("../middleware/auth.middleware");
const {
  registerUser,
  loginUser,
  verifyAuth,
  fetchUserDetails,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
  forgotPassword,
} = require("../controllers/user.controller");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/verifyAuth", verifyAuth);
router.get("/userDetails", verifyToken, fetchUserDetails);
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.status(200).json({ message: "Logged out successfully" });
});
router.post("/forgot-password", forgotPassword);

//business user management
router.get("/users", verifyToken, getAllUsers);
router.post("/users", verifyToken, createUser);
router.put("/users/:id", verifyToken, updateUser);
router.delete("/users/:id", verifyToken, deleteUser);
router.post("/users/:id/reset-password", verifyToken, resetPassword);
module.exports = router;

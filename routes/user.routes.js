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
  verifyResetToken,
  getUserById,
  publicResetPassword,
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
router.post("/verify-reset-token", verifyResetToken); // New endpoint
router.post("/public-reset-password", publicResetPassword); // New endpoint

//business user management
const { authorize } = require("../middleware/rbac.middleware");
const { requireLimit } = require("../middleware/tier.middleware");
router.get("/users", verifyToken, getAllUsers);
router.get("/users/:id", verifyToken, getUserById);
router.post(
  "/users",
  verifyToken,
  authorize("admin", "manager"),
  requireLimit("maxUsers", async (req) => await User.countDocuments({ business: req.user.business })),
  createUser
);
router.put("/users/:id", verifyToken, authorize("admin", "manager"), updateUser);
router.delete("/users/:id", verifyToken, authorize("admin"), deleteUser);
router.post("/users/:id/reset-password", verifyToken, authorize("admin"), publicResetPassword);
module.exports = router;

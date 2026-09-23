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
const { audit } = require("../middleware/audit.middleware");
router.get("/users", verifyToken, authorize("admin", "manager"), getAllUsers);
router.get("/users/:id", verifyToken, authorize("admin", "manager"), getUserById);
router.post(
  "/users",
  verifyToken,
  authorize("admin", "manager"),
  requireLimit("maxUsers", async (req) => await User.countDocuments({ business: req.user.business })),
  audit("user.create", "User"),
  createUser
);
router.put("/users/:id", verifyToken, authorize("admin", "manager"), audit("user.update", "User"), updateUser);
router.delete("/users/:id", verifyToken, authorize("admin"), audit("user.delete", "User"), deleteUser);
// Admin-initiated reset (requires the target user's id + a new password).
// NOTE: previously wired to the token-based handler by mistake.
router.post("/users/:id/reset-password", verifyToken, authorize("admin"), audit("user.reset-password", "User"), resetPassword);
module.exports = router;

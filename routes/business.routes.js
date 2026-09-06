const express = require("express");
const router = express.Router();
const {
  registerBusiness,
  getBusinessDetails,
  getAllBusinesses,
} = require("../controllers/business.controller");
const { verifyToken } = require("../middleware/auth.middleware");

router.post("/register", registerBusiness);
router.get("/business/details", verifyToken, getBusinessDetails);
router.get("/businesses", getAllBusinesses);
router.get("/my-subscription", verifyToken, async (req, res) => {
  const Subscription = require("../models/subscription.model");
  const sub = await Subscription.findOne({ business: req.user.business, status: "active" }).populate("plan");
  if (!sub) return res.status(404).json({ message: "No active subscription" });
  res.json({ subscription: sub, plan: sub.plan, features: sub.plan.features });
});
module.exports = router;

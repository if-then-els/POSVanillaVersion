const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/superAdmin.controller");
const { verifyAdminToken } = require("../middleware/auth.middleware");

// Public routes
router.post("/register", ctrl.register);
router.post("/login", ctrl.login);

// Protected routes
router.get("/admin", verifyAdminToken, ctrl.getAdmin);
router.get("/logout", verifyAdminToken, ctrl.logout);
router.get("/metrics", verifyAdminToken, ctrl.metrics);
router.get("/businesses", verifyAdminToken, ctrl.listBusinesses);
router.patch("/businesses/:id/status", verifyAdminToken, ctrl.updateBusinessStatus);
router.post("/businesses/:id/impersonate", verifyAdminToken, ctrl.impersonateBusiness);
router.get("/subscriptions", verifyAdminToken, ctrl.listSubscriptions);
router.get("/plans", verifyAdminToken, ctrl.listPlans);
router.put("/plans", verifyAdminToken, ctrl.upsertPlan);
router.post("/plans", verifyAdminToken, ctrl.upsertPlan);

module.exports = router;

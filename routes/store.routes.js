const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth.middleware");
const Store = require("../models/store.model");
const { authorize } = require("../middleware/rbac.middleware");

router.get("/", verifyToken, async (req, res) => {
  const stores = await Store.find({ business: req.user.business }).lean();
  res.json({ stores });
});

router.post("/", verifyToken, authorize("admin", "manager"), async (req, res) => {
  const { name, location, phone, isMain } = req.body;
  if (!name) return res.status(400).json({ message: "Store name required" });
  // enforce maxStores via tier if needed - lightweight check
  const existingCount = await Store.countDocuments({ business: req.user.business });
  // fetch plan limit if available (attached by tier.middleware optionally)
  // allow for now; plan limit enforced elsewhere
  const store = await Store.create({ business: req.user.business, name, location, phone, isMain: !!isMain });
  if (isMain) {
    await Store.updateMany({ business: req.user.business, _id: { $ne: store._id } }, { $set: { isMain: false } });
  }
  res.status(201).json({ store });
});

router.put("/:id", verifyToken, authorize("admin", "manager"), async (req, res) => {
  const store = await Store.findOneAndUpdate(
    { _id: req.params.id, business: req.user.business },
    req.body,
    { new: true }
  );
  if (!store) return res.status(404).json({ message: "Store not found" });
  res.json({ store });
});

router.delete("/:id", verifyToken, authorize("admin"), async (req, res) => {
  const resDel = await Store.findOneAndDelete({ _id: req.params.id, business: req.user.business });
  if (!resDel) return res.status(404).json({ message: "Store not found" });
  res.json({ message: "Store deleted" });
});

module.exports = router;

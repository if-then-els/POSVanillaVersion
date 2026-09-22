const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth.middleware");
const Store = require("../models/store.model");
const { authorize } = require("../middleware/rbac.middleware");
const { requireLimit } = require("../middleware/tier.middleware");

router.get("/", verifyToken, async (req, res) => {
  // Strictly scoped: a business only ever sees its OWN stores.
  const stores = await Store.find({ business: req.user.business }).lean();
  res.json({ stores });
});

// Plan-gated: trial/basic = 1 store, standard = 3, premium = 0 (unlimited).
// requireLimit blocks creation once the business hits its plan's maxStores.
router.post("/", verifyToken, authorize("admin", "manager"),
  requireLimit("maxStores", async (req) => await Store.countDocuments({ business: req.user.business })),
  async (req, res) => {
  const { name, location, phone, isMain } = req.body;
  if (!name || !String(name).trim()) return res.status(400).json({ message: "Store name required" });
  const store = await Store.create({ business: req.user.business, name: String(name).trim(), location, phone, isMain: !!isMain });
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

const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");
const Supplier = require("../models/supplier.model");

router.get("/", verifyToken, async (req, res) => {
  const suppliers = await Supplier.find({ business: req.user.business }).sort({ name: 1 });
  res.json({ suppliers });
});

router.post("/", verifyToken, authorize("admin","manager","inventory"), async (req, res) => {
  const { name, contactName, phone, email, address, notes } = req.body;
  if (!name) return res.status(400).json({ message: "Supplier name required" });
  const exists = await Supplier.findOne({ business: req.user.business, name });
  if (exists) return res.status(400).json({ message: "Supplier already exists" });
  const sup = await Supplier.create({ business: req.user.business, name, contactName, phone, email, address, notes });
  res.status(201).json({ supplier: sup });
});

router.put("/:id", verifyToken, authorize("admin","manager","inventory"), async (req, res) => {
  const sup = await Supplier.findOneAndUpdate({ _id: req.params.id, business: req.user.business }, req.body, { new: true });
  if (!sup) return res.status(404).json({ message: "Supplier not found" });
  res.json({ supplier: sup });
});

router.delete("/:id", verifyToken, authorize("admin","manager"), async (req, res) => {
  const sup = await Supplier.findOneAndDelete({ _id: req.params.id, business: req.user.business });
  if (!sup) return res.status(404).json({ message: "Supplier not found" });
  res.json({ message: "Supplier deleted" });
});

module.exports = router;

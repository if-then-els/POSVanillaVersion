const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");
const PurchaseOrder = require("../models/purchaseOrder.model");
const Inventory = require("../models/inventory");
const mongoose = require("mongoose");

// helper to generate poNumber
function genPONumber() { return `PO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,5).toUpperCase()}`; }

router.get("/", verifyToken, async (req, res) => {
  const pos = await PurchaseOrder.find({ business: req.user.business }).populate("supplier").populate("items.product").sort({ createdAt: -1 });
  res.json({ purchaseOrders: pos });
});

router.get("/:id", verifyToken, async (req, res) => {
  const po = await PurchaseOrder.findOne({ _id: req.params.id, business: req.user.business }).populate("supplier").populate("items.product");
  if (!po) return res.status(404).json({ message: "PO not found" });
  res.json({ purchaseOrder: po });
});

router.post("/", verifyToken, authorize("admin","manager","inventory"), async (req, res) => {
  const { supplier, items, store, expectedDate, notes } = req.body;
  if (!supplier || !Array.isArray(items) || !items.length) return res.status(400).json({ message: "supplier and items required" });
  // validate supplier belongs to business
  const Supplier = require("../models/supplier.model");
  const sup = await Supplier.findOne({ _id: supplier, business: req.user.business });
  if (!sup) return res.status(400).json({ message: "Invalid supplier" });
  const po = await PurchaseOrder.create({
    business: req.user.business,
    store: store || undefined,
    poNumber: genPONumber(),
    supplier,
    items: items.map(i => ({ product: i.product, quantity: Number(i.quantity), costPrice: Number(i.costPrice), receivedQuantity: 0 })),
    expectedDate: expectedDate || undefined,
    notes,
    createdBy: req.user.id,
  });
  res.status(201).json({ purchaseOrder: po });
});

router.post("/:id/receive", verifyToken, authorize("admin","manager","inventory"), async (req, res) => {
  const { receivedItems } = req.body; // [{product, quantity}]
  const po = await PurchaseOrder.findOne({ _id: req.params.id, business: req.user.business });
  if (!po) return res.status(404).json({ message: "PO not found" });
  if (["received","cancelled"].includes(po.status)) return res.status(400).json({ message: `PO already ${po.status}` });

  // apply received quantities
  const map = new Map(receivedItems?.map(r => [String(r.product), Number(r.quantity)]) || []);
  let allReceived = true;
  for (const item of po.items) {
    const recv = map.get(String(item.product)) ?? item.quantity; // if not specified, assume full
    if (recv > 0) {
      // increment inventory costPrice? Update productQuantity and costPrice weighted avg
      const prod = await Inventory.findOne({ _id: item.product, business: req.user.business });
      if (!prod) continue;
      const addQty = Math.min(recv, item.quantity - item.receivedQuantity);
      if (addQty <= 0) continue;
      // weighted avg cost update if costPrice provided
      const oldQty = Number(prod.productQuantity) || 0;
      const oldCost = Number(prod.costPrice ?? prod.productPrice) || 0;
      const newCost = Number(item.costPrice) || oldCost;
      const wac = oldQty + addQty > 0 ? ((oldQty * oldCost) + (addQty * newCost)) / (oldQty + addQty) : newCost;
      await Inventory.findOneAndUpdate({ _id: prod._id, business: req.user.business }, { $inc: { productQuantity: addQty }, $set: { costPrice: Math.round(wac*100)/100 } });
      item.receivedQuantity += addQty;
    }
    if (item.receivedQuantity < item.quantity) allReceived = false;
  }
  po.status = allReceived ? "received" : "partially_received";
  if (allReceived) po.receivedDate = new Date();
  await po.save();
  res.json({ purchaseOrder: po });
});

router.patch("/:id/cancel", verifyToken, authorize("admin","manager"), async (req, res) => {
  const po = await PurchaseOrder.findOne({ _id: req.params.id, business: req.user.business });
  if (!po) return res.status(404).json({ message: "PO not found" });
  po.status = "cancelled";
  await po.save();
  res.json({ purchaseOrder: po });
});

module.exports = router;

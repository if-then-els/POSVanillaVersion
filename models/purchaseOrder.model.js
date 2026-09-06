const mongoose = require("mongoose");
const tenantPlugin = require("../utils/tenantPlugin");

const poItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Inventory", required: true },
  quantity: { type: Number, required: true, min: 1 },
  costPrice: { type: Number, required: true, min: 0 },
  receivedQuantity: { type: Number, default: 0 },
}, { _id: false });

const purchaseOrderSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: "BusinessDetails", required: true, index: true },
  store: { type: mongoose.Schema.Types.ObjectId, ref: "Store" },
  poNumber: { type: String, required: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
  items: [poItemSchema],
  status: { type: String, enum: ["draft","sent","partially_received","received","cancelled"], default: "draft" },
  expectedDate: Date,
  receivedDate: Date,
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

purchaseOrderSchema.plugin(tenantPlugin);
purchaseOrderSchema.index({ business: 1, poNumber: 1 }, { unique: true });
purchaseOrderSchema.index({ business: 1, status: 1 });

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);

const mongoose = require("mongoose");
const tenantPlugin = require("../utils/tenantPlugin");

const inventorySchema = new mongoose.Schema({
  productName: { type: String, required: true },
  productPrice: { type: Number, required: true },
  productQuantity: { type: Number, required: true },
  productDescription: { type: String, required: true },
  productCategory: { type: String, required: true },
  productBatchNumber: { type: String, required: true },
  // extended enterprise fields (optional for now)
  sku: { type: String },
  barcode: { type: String },
  costPrice: { type: Number },
  reorderLevel: { type: Number, default: 5 },
  expiryDate: { type: Date },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
  store: { type: mongoose.Schema.Types.ObjectId, ref: "Store" },
  business: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BusinessDetails",
    required: true,
  },
}, { timestamps: true });

inventorySchema.plugin(tenantPlugin);
// Note: unique batch per business desired but legacy data has duplicates -> make non-unique for now, enforce in application layer
inventorySchema.index({ business: 1, productBatchNumber: 1 });
inventorySchema.index({ business: 1, sku: 1 }, { sparse: true });
inventorySchema.index({ business: 1, barcode: 1 }, { sparse: true });
inventorySchema.index({ business: 1, productCategory: 1 });
inventorySchema.index({ business: 1, store: 1 });

const Inventory = mongoose.model("Inventory", inventorySchema);
module.exports = Inventory;

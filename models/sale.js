const mongoose = require("mongoose");
const tenantPlugin = require("../utils/tenantPlugin");

const saleSchema = new mongoose.Schema({
  receiptNo: { type: String, sparse: true },
  store: { type: mongoose.Schema.Types.ObjectId, ref: "Store" },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
  cashier: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  offlineId: { type: String, sparse: true },
  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Inventory",
        required: true,
      },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
      costPrice: { type: Number },
    },
  ],
  subtotal: { type: Number },
  taxRate: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  customerName: { type: String },
  customerPhone: { type: String },
  customerEmail: { type: String },
  bankRef: { type: String },
  cashierName: { type: String },
  amountTendered: { type: Number },
  changeGiven: { type: Number },
  // Stored receipt copy: business/store snapshot at time of sale for accountability
  businessSnapshot: {
    name: String,
    location: String,
    phone: String,
    email: String,
  },
  storeSnapshot: {
    name: String,
    location: String,
    phone: String,
  },
  paymentMethod: { type: String, enum: ["cash", "mpesa_stk", "mpesa_paybill", "mpesa", "paystack", "card", "bank", "split", "paypal", "mobile_money"] },
  paymentStatus: { type: String, enum: ["paid", "pending", "failed"], default: "paid" },
  splitPayments: [{ method: String, amount: Number }],
  mpesaReceipt: { type: String },
  createdAt: { type: Date, default: Date.now },
  business: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BusinessDetails",
    required: true,
  },
}, { timestamps: false });

saleSchema.plugin(tenantPlugin);
saleSchema.index({ business: 1, createdAt: -1 });
saleSchema.index({ business: 1, offlineId: 1 }, { unique: true, partialFilterExpression: { offlineId: { $type: "string" } } });
saleSchema.index({ business: 1, receiptNo: 1 }, { unique: true, partialFilterExpression: { receiptNo: { $type: "string" } } });
saleSchema.index({ business: 1, store: 1 });

module.exports = mongoose.model("Sale", saleSchema);

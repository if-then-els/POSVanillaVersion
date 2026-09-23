const mongoose = require("mongoose");
const tenantPlugin = require("../utils/tenantPlugin");

/**
 * StockMovement - immutable ledger of every non-sale stock change.
 * Sales decrement stock directly on the Inventory row; everything else
 * (disposal, loss/shrinkage, inter-store transfers, manual adjustments)
 * is recorded here so it can be counted in reports and audited later.
 */
const stockMovementSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusinessDetails",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
      required: true,
    },
    store: { type: mongoose.Schema.Types.ObjectId, ref: "Store" },
    kind: {
      type: String,
      enum: [
        "disposal", // damaged / expired / written off by admin
        "loss", // theft / shrinkage / unknown loss
        "transfer_out", // left this store (paired with transfer_in)
        "transfer_in", // arrived in this store (paired with transfer_out)
        "adjustment", // manual correction (stocktake deltas optional)
      ],
      required: true,
    },
    quantity: { type: Number, required: true, min: 1 },
    unitCost: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    reason: { type: String, default: "" },
    // Links the two legs of a transfer (same id on out + in).
    transferId: { type: String, sparse: true },
    // The other store involved in a transfer.
    relatedStore: { type: mongoose.Schema.Types.ObjectId, ref: "Store" },
    balanceAfter: { type: Number },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

stockMovementSchema.plugin(tenantPlugin);
stockMovementSchema.index({ business: 1, createdAt: -1 });
stockMovementSchema.index({ business: 1, store: 1, createdAt: -1 });
stockMovementSchema.index({ business: 1, kind: 1, createdAt: -1 });
stockMovementSchema.index({ business: 1, product: 1, createdAt: -1 });
stockMovementSchema.index({ transferId: 1 }, { sparse: true });

module.exports = mongoose.model("StockMovement", stockMovementSchema);

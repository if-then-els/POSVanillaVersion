const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: "BusinessDetails", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  action: { type: String, required: true }, // e.g., sale.create, inventory.update
  entity: { type: String }, // Inventory, Sale, User
  entityId: { type: mongoose.Schema.Types.ObjectId },
  details: { type: mongoose.Schema.Types.Mixed },
  ip: String,
}, { timestamps: true });

auditLogSchema.index({ business: 1, createdAt: -1 });
auditLogSchema.index({ business: 1, user: 1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);

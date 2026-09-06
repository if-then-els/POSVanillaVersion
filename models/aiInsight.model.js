const mongoose = require("mongoose");

const aiInsightSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: "BusinessDetails", required: true, index: true },
  type: { type: String, enum: ["forecast","dead_stock","anomaly","query"], required: true },
  period: String, // e.g., 30d, 60d
  payload: { type: mongoose.Schema.Types.Mixed },
  promptTokens: Number,
  completionTokens: Number,
  provider: { type: String, default: "heuristic" }, // openai|gemini|heuristic
  expiresAt: { type: Date, index: { expireAfterSeconds: 0 } }, // TTL
}, { timestamps: true });

aiInsightSchema.index({ business: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model("AIInsight", aiInsightSchema);

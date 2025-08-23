const mongoose = require("mongoose");
const { ref } = require("pdfkit");

const supportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Business",
    required: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  isAdminReply: { type: Boolean, default: false },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  businessName: String,
  userName: String,
});
const ChatMessage = mongoose.model("ChatMessage", supportSchema);
module.exports = ChatMessage;

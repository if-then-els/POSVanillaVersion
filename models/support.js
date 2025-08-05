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
});
const ChatMessage = mongoose.model("ChatMessage", supportSchema);
module.exports = ChatMessage;

const ChatMessage = require("../models/support");

// Get all messages with business info
exports.getAllMessages = async (req, res) => {
  try {
    const messages = await ChatMessage.find({ isAdminReply: false })
      .sort({ createdAt: -1 })
      .populate("businessId", "businessName");

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: "Error fetching messages" });
  }
};

// Send reply as admin
exports.sendAdminReply = async (req, res) => {
  try {
    const { messageId, reply } = req.body;

    const originalMessage = await ChatMessage.findById(messageId);
    if (!originalMessage) {
      return res.status(404).json({ message: "Message not found" });
    }

    const newReply = new ChatMessage({
      userId: originalMessage.userId,
      businessId: originalMessage.businessId,
      message: reply,
      isAdminReply: true,
      adminId: req.user.id,
      businessName: originalMessage.businessName,
      userName: "Admin",
    });

    await newReply.save();
    res.status(201).json({ message: "Reply sent successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error sending reply" });
  }
};

// Get conversation history
exports.getConversation = async (req, res) => {
  try {
    const { businessId } = req.params;
    const conversation = await ChatMessage.find({ businessId }).sort({
      createdAt: 1,
    });

    res.status(200).json(conversation);
  } catch (error) {
    res.status(500).json({ message: "Error fetching conversation" });
  }
};

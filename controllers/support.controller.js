const express = require("express");
const ChatMessage = require("../models/support");
const Business = require("../models/businessDetails");
const { verifyToken } = require("../middleware/auth.middleware");

exports.sendChatMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    //nsole.log("User on messages is: ", userId);
    const businessId = await Business.findOne({ users: userId }).select("-id");
    //onsole.log("Business ID from message send  :", businessId);
    const { message } = req.body;
    //console.log("Message to send:", message);
    if (!message || message.trim() === "") {
      return res.status(400).json({ message: "Message cannot be empty" });
    }
    const newChatMessage = ChatMessage({
      userId: req.user.id,
      businessId,
      message: message.trim(),
    });
    await newChatMessage.save();
    res.status(201).json({ message: "Message sent" });
  } catch (error) {
    console.error("Error sending chat message:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getChatMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const businessId = await Business.findOne({ users: userId }).select("-id");

    console.log("Business ID from message fetch  :", businessId);
    const chatMessages = await ChatMessage.find({ businessId })
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json(chatMessages);
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

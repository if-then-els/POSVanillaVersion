// const express = require("express");
// const ChatMessage = require("../models/support");
// const Business = require("../models/businessDetails");
// const { verifyToken } = require("../middleware/auth.middleware");

// exports.sendChatMessage = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     //nsole.log("User on messages is: ", userId);
//     const businessId = await Business.findOne({ users: userId }).select("-id");
//     //onsole.log("Business ID from message send  :", businessId);
//     const { message } = req.body;
//     //console.log("Message to send:", message);
//     if (!message || message.trim() === "") {
//       return res.status(400).json({ message: "Message cannot be empty" });
//     }
//     const newChatMessage = ChatMessage({
//       userId: req.user.id,
//       businessId,
//       message: message.trim(),
//     });
//     await newChatMessage.save();
//     res.status(201).json({ message: "Message sent" });
//   } catch (error) {
//     console.error("Error sending chat message:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };

// exports.getChatMessages = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const businessId = await Business.findOne({ users: userId }).select("_id");

//     const chatMessages = await ChatMessage.find({ businessId }).sort({
//       createdAt: 1,
//     });

//     return res.status(200).json(chatMessages);
//   } catch (error) {
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };

// exports.getAllMessages = async (req, res) => {
//     try {
//         const messages = await SupportMessage.find()
//             .sort({ createdAt: -1 })
//             .populate('user', 'name email');

//         res.json(messages);
//     } catch (error) {
//         res.status(500).json({ message: 'Error fetching messages' });
//     }
// };

// // Get single message
// exports.getMessage = async (req, res) => {
//     try {
//         const message = await SupportMessage.findById(req.params.id)
//             .populate('user', 'name email');

//         if (!message) {
//             return res.status(404).json({ message: 'Message not found' });
//         }

//         res.json(message);
//     } catch (error) {
//         res.status(500).json({ message: 'Error fetching message' });
//     }
// };

// // Send reply to message
// exports.sendReply = async (req, res) => {
//     try {
//         const { messageId, content } = req.body;

//         // Find original message
//         const originalMessage = await SupportMessage.findById(messageId);
//         if (!originalMessage) {
//             return res.status(404).json({ message: 'Message not found' });
//         }

//         // Create reply
//         const reply = new SupportMessage({
//             user: req.user.id,
//             content,
//             isReply: true,
//             originalMessage: messageId
//         });

//         await reply.save();

//         // Update original message
//         originalMessage.replies.push(reply._id);
//         await originalMessage.save();

//         res.status(201).json(reply);
//     } catch (error) {
//         res.status(500).json({ message: 'Error sending reply' });
//     }
// };

// // Get conversation thread
// exports.getConversation = async (req, res) => {
//     try {
//         const conversation = await SupportMessage.find({
//             $or: [
//                 { _id: req.params.id },
//                 { originalMessage: req.params.id }
//             ]
//         })
//         .sort({ createdAt: 1 })
//         .populate('user', 'name email');

//         res.json(conversation);
//     } catch (error) {
//         res.status(500).json({ message: 'Error fetching conversation' });
//     }
// };

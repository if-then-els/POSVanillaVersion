const Ticket = require("../models/Tickets");
const BusinessDetails = require("../models/businessDetails");
const User = require("../models/user");

// Create a new ticket (client feedback)
exports.createTicket = async (req, res) => {
  try {
    const { message } = req.body;
    const business = req.user.business; // assuming req.user is set by auth middleware
    const user = req.user._id;
    if (!message) return res.status(400).json({ error: "Message is required" });
    const ticket = await Ticket.create({ business, user, message });
    res.status(201).json(ticket);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get tickets (admin: all, client: own)
exports.getTickets = async (req, res) => {
  try {
    let query = {};
    if (!req.user.isSuperAdmin) {
      query = { business: req.user.business };
    }
    const tickets = await Ticket.find(query)
      .populate("business", "name")
      .populate("user", "name email")
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Reply to a ticket
exports.replyTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });
    const sender = req.user.isSuperAdmin ? "admin" : "client";
    const ticket = await Ticket.findByIdAndUpdate(
      id,
      { $push: { replies: { sender, message } } },
      { new: true }
    );
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Mark ticket as resolved
exports.resolveTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await Ticket.findByIdAndUpdate(
      id,
      { status: "resolved" },
      { new: true }
    );
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const mongoose = require("mongoose");

const TicketSchema = new mongoose.Schema({
  business: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BusinessDetails",
    required: true,
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "Users" }, // who submitted
  message: { type: String, required: true },
  replies: [
    {
      sender: { type: String, enum: ["client", "admin"], required: true },
      message: String,
      date: { type: Date, default: Date.now },
    },
  ],
  status: { type: String, enum: ["open", "resolved"], default: "open" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Ticket", TicketSchema);

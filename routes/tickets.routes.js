const express = require("express");
const router = express.Router();
const ticketsController = require("../controllers/tickets.controller");
//const auth = require("../middleware/auth.middleware");
const { verifyToken } = require("../middleware/auth.middleware");

// All routes require authentication
router.use(verifyToken);

// Create ticket
router.post("/", ticketsController.createTicket);
// Get tickets (admin: all, client: own)
router.get("/", ticketsController.getTickets);
// Reply to ticket
router.post("/:id/reply", ticketsController.replyTicket);
// Resolve ticket
router.patch("/:id/resolve", ticketsController.resolveTicket);

module.exports = router;

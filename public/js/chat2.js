// widget.js

// --- 1. Widget Styles as a string (for dynamic injection) ---
const widgetStyles = `
    /* Custom scrollbar for better aesthetics */
    .chat-scroll::-webkit-scrollbar {
        width: 8px;
    }
    .chat-scroll::-webkit-scrollbar-track {
        background: #1a1a1a; /* Darker track */
        border-radius: 10px;
    }
    .chat-scroll::-webkit-scrollbar-thumb {
        background: #444; /* Slightly lighter thumb */
        border-radius: 10px;
    }
    .chat-scroll::-webkit-scrollbar-thumb:hover {
        background: #666;
    }

    /* Slide-in panel animation states */
    .slide-in {
        transform: translateX(0%);
        opacity: 1;
    }
    .slide-out {
        transform: translateX(100%);
        opacity: 0;
    }

    /* Active navigation item styling */
    .nav-item.active {
        color: #00B0FF; /* A vibrant blue for active state */
    }
    .nav-item.active .fas {
        color: #00B0FF;
    }

    /* Basic button focus outline removal for cleaner focus states */
    button:focus {
        outline: none;
    }
    button:focus-visible {
        outline: 2px solid #00B0FF; /* Custom focus ring */
        outline-offset: 2px;
    }

    /* Input/textarea focus styles */
    input:focus, textarea:focus, select:focus {
        border-color: #00B0FF;
        box-shadow: 0 0 0 1px #00B0FF;
    }
`;

// --- 2. Main Widget Creation and Logic Function ---
function createRenderSupportWidget() {
  // Inject styles into the head first
  const styleTag = document.createElement("style");
  styleTag.textContent = widgetStyles;
  document.head.appendChild(styleTag);

  // Create the floating chat button
  const openWidgetBtn = document.createElement("button");
  openWidgetBtn.id = "openWidgetBtn";
  openWidgetBtn.className =
    "fixed bottom-8 right-8 z-[1000] bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-300 transform scale-100 hover:scale-105";
  openWidgetBtn.innerHTML = `
        <i class="fas fa-comment-dots text-white text-2xl group-hover:scale-110 transition-transform duration-300"></i>
    `;
  document.body.appendChild(openWidgetBtn);

  // Create the main support widget panel
  const supportWidget = document.createElement("div");
  supportWidget.id = "supportWidget";
  supportWidget.className =
    "fixed bottom-4 right-4 w-11/12 max-w-[420px] h-[calc(100vh-80px)] max-h-[700px] bg-gray-900 text-gray-100 rounded-xl shadow-2xl flex flex-col z-[999] transition-all duration-500 ease-in-out slide-out opacity-0 overflow-hidden"; // Added overflow-hidden
  supportWidget.innerHTML = `
        <div class="flex-shrink-0 px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-900">
            <h2 class="text-3xl font-extrabold text-white">SwiftPOS Support</h2>
            <button id="closeWidgetBtn" class="text-gray-400 hover:text-gray-200 focus:ring-gray-500 rounded-full p-2 transition-colors duration-200">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>

        <div id="contentArea" class="flex-grow overflow-y-auto px-6 py-5 chat-scroll bg-gray-900">
            <div id="homeSection" class="section-content hidden">
                <h3 class="text-3xl font-bold mb-4 text-gray-50">Hi There 👋</h3>
                <p class="text-lg text-gray-300 mb-6">How can we help you today?</p>

                <div class="bg-gray-800 p-4 rounded-lg mb-6 shadow-md">
                    <div class="flex items-center text-green-500 mb-2">
                        <i class="fas fa-check-circle mr-2 text-lg"></i>
                        <span class="font-medium text-lg">Status: All Systems Operational</span>
                    </div>
                    <p class="text-xs text-gray-400">Updated Jul 29, 15:57 UTC</p>
                </div>

                <div class="space-y-4">
                    <button class="action-card w-full text-left bg-gray-800 p-5 rounded-xl shadow-md hover:bg-gray-700 transition-colors duration-200 flex items-center group" data-nav-target="messagesSection">
                        <div class="flex-shrink-0 bg-blue-600 rounded-full p-3 mr-4">
                            <i class="fas fa-comments text-white text-xl"></i>
                        </div>
                        <div>
                            <h4 class="font-semibold text-lg text-gray-50">Send us a Message</h4>
                            <p class="text-sm text-gray-400">Get personalized support by sending us a direct message.</p>
                        </div>
                        <i class="fas fa-chevron-right text-gray-500 ml-auto group-hover:text-gray-300 transition-colors duration-200"></i>
                    </button>

                    <button class="action-card w-full text-left bg-gray-800 p-5 rounded-xl shadow-md hover:bg-gray-700 transition-colors duration-200 flex items-center group" data-nav-target="ticketsSection">
                        <div class="flex-shrink-0 bg-purple-600 rounded-full p-3 mr-4">
                            <i class="fas fa-ticket-alt text-white text-xl"></i>
                        </div>
                        <div>
                            <h4 class="font-semibold text-lg text-gray-50">View My Tickets</h4>
                            <p class="text-sm text-gray-400">Track the status and conversation of your support tickets.</p>
                        </div>
                        <i class="fas fa-chevron-right text-gray-500 ml-auto group-hover:text-gray-300 transition-colors duration-200"></i>
                    </button>

                    <button class="action-card w-full text-left bg-gray-800 p-5 rounded-xl shadow-md hover:bg-gray-700 transition-colors duration-200 flex items-center group" data-nav-target="faqSection">
                        <div class="flex-shrink-0 bg-green-600 rounded-full p-3 mr-4">
                            <i class="fas fa-question-circle text-white text-xl"></i>
                        </div>
                        <div>
                            <h4 class="font-semibold text-lg text-gray-50">Browse FAQs</h4>
                            <p class="text-sm text-gray-400">Find answers to common questions in our knowledge base.</p>
                        </div>
                        <i class="fas fa-chevron-right text-gray-500 ml-auto group-hover:text-gray-300 transition-colors duration-200"></i>
                    </button>
                </div>
            </div>

            <div id="messagesSection" class="section-content hidden">
                <h3 class="text-2xl font-semibold text-gray-50 mb-6">Messages</h3>
                <div class="text-center py-4">
                    <p class="text-gray-400 mb-4">Click below to send us a new message.</p>
                    <button id="sendMessageBtn" class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-full shadow-md inline-flex items-center transition-colors duration-200">
                        Send a New Message
                        <svg class="ml-2 w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
                    </button>
                </div>
                <div class="mt-8">
                    <h4 class="text-xl font-semibold text-gray-50 mb-4">Recent Conversations (Placeholder)</h4>
                    <div class="space-y-3">
                        <div class="bg-gray-800 p-4 rounded-lg flex items-center justify-between">
                            <div>
                                <p class="font-medium text-gray-50">Issue with login</p>
                                <p class="text-sm text-gray-400">Last reply: Yesterday</p>
                            </div>
                            <span class="text-xs bg-blue-600 px-3 py-1 rounded-full">Open</span>
                        </div>
                        <div class="bg-gray-800 p-4 rounded-lg flex items-center justify-between opacity-70">
                            <div>
                                <p class="font-medium text-gray-50">Feature request: Dark mode</p>
                                <p class="text-sm text-gray-400">Last reply: 3 days ago</p>
                            </div>
                            <span class="text-xs bg-green-600 px-3 py-1 rounded-full">Resolved</span>
                        </div>
                    </div>
                </div>
            </div>

            <div id="ticketsSection" class="section-content hidden">
                <h3 class="text-2xl font-semibold text-gray-50 mb-6" id="ticketsSectionTitle">My Tickets</h3>

                <div id="ticketListView">
                    <div id="ticketList" class="space-y-4">
                        <p id="noTicketsMessage" class="text-gray-500 text-center py-8 hidden">You haven't submitted any tickets yet. <br> <button class="text-blue-400 hover:text-blue-300 mt-2" onclick="document.getElementById('sendMessageBtn').click();">Send a new message</button></p>
                    </div>
                </div>

                <div id="ticketDetailView" class="hidden">
                    <button id="backToTicketListBtn" class="text-blue-400 hover:text-blue-300 text-sm mb-4 inline-flex items-center">
                        <i class="fas fa-arrow-left mr-2"></i> Back to Tickets
                    </button>
                    <h4 class="text-2xl font-bold text-gray-50 mb-2" id="detailSubject"></h4>
                    <div class="flex items-center space-x-3 mb-4">
                        <p class="text-sm text-gray-400">Ticket ID: <span id="detailId" class="font-mono text-gray-300"></span></p>
                        <span id="detailStatus" class="font-semibold px-2 py-1 rounded-full text-white text-xs"></span>
                    </div>
                    <p class="text-sm text-gray-400 mb-4">Submitted on: <span id="detailDate"></span></p>

                    <div class="border-t border-gray-700 pt-4">
                        <h5 class="font-medium text-gray-50 mb-2">Original Description:</h5>
                        <p id="detailDescription" class="text-gray-300 text-sm mb-6 bg-gray-800 p-4 rounded-md shadow-inner"></p>

                        <h5 class="font-medium text-gray-50 mb-3">Conversation:</h5>
                        <div id="detailConversation" class="space-y-4 rounded-md p-4 max-h-80 overflow-y-auto bg-gray-800 chat-scroll">
                            </div>

                        <div class="mt-4">
                            <h5 class="font-medium text-gray-50 mb-2">Reply to this Ticket:</h5>
                            <textarea id="replyMessage" rows="3" class="mt-1 block w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg shadow-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm" placeholder="Type your reply here..."></textarea>
                            <button id="submitReplyBtn" class="mt-3 bg-blue-600 text-white py-2.5 px-5 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200">
                                Send Reply
                            </button>
                        </div>
                        <div id="replySuccess" class="hidden mt-4 bg-green-900 border border-green-700 text-green-200 px-4 py-3 rounded relative" role="alert">
                            <strong class="font-bold">Success!</strong>
                            <span class="block sm:inline">Your reply has been sent.</span>
                        </div>
                    </div>
                </div>
            </div>

            <div id="feedbackFormSection" class="section-content hidden">
                <button id="backFromFormBtn" class="text-blue-400 hover:text-blue-300 text-sm mb-4 inline-flex items-center">
                    <i class="fas fa-arrow-left mr-2"></i> Back to Messages
                </button>
                <h3 class="text-2xl font-semibold text-gray-50 mb-6">Send us a Message</h3>
                <form id="feedbackForm" class="space-y-5">
                    <div>
                        <label for="feedbackType" class="block text-sm font-medium text-gray-300 mb-1">Feedback Type</label>
                        <select id="feedbackType" name="feedbackType" class="mt-1 block w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm">
                            <option value="">Select a type</option>
                            <option value="bug">Bug Report</option>
                            <option value="feature">Feature Request</option>
                            <option value="general">General Feedback</option>
                            <option value="question">Question</option>
                        </select>
                    </div>
                    <div>
                        <label for="subject" class="block text-sm font-medium text-gray-300 mb-1">Subject</label>
                        <input type="text" id="subject" name="subject" required class="mt-1 block w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg shadow-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm">
                    </div>
                    <div>
                        <label for="description" class="block text-sm font-medium text-gray-300 mb-1">Description</label>
                        <textarea id="description" name="description" rows="5" required class="mt-1 block w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg shadow-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm" placeholder="Please describe your issue or suggestion in detail, including steps to reproduce if applicable."></textarea>
                    </div>
                    <div>
                        <label for="email" class="block text-sm font-medium text-gray-300 mb-1">Your Email (Optional)</label>
                        <input type="email" id="email" name="email" class="mt-1 block w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg shadow-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm" placeholder="e.g., your.email@example.com">
                    </div>
                    <button type="submit" class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 font-semibold">
                        Submit Message
                    </button>
                </form>
                <div id="submissionSuccess" class="hidden mt-4 bg-green-900 border border-green-700 text-green-200 px-4 py-3 rounded relative" role="alert">
                    <strong class="font-bold">Success!</strong>
                    <span class="block sm:inline" id="successMessage"></span>
                </div>
            </div>

            <div id="faqSection" class="section-content hidden">
                <h3 class="text-2xl font-semibold text-gray-50 mb-6">Frequently Asked Questions</h3>
                <div class="space-y-4">
                    <div class="bg-gray-800 p-4 rounded-lg shadow-md">
                        <h4 class="font-semibold text-gray-50 mb-2">How do I reset my password?</h4>
                        <p class="text-sm text-gray-300">You can reset your password by clicking on the "Forgot Password" link on the login page.</p>
                    </div>
                    <div class="bg-gray-800 p-4 rounded-lg shadow-md">
                        <h4 class="font-semibold text-gray-50 mb-2">What are the supported payment methods?</h4>
                        <p class="text-sm text-gray-300">We support various payment methods including credit/debit cards, PayPal, and mobile payments.</p>
                    </div>
                    <div class="bg-gray-800 p-4 rounded-lg shadow-md">
                        <h4 class="font-semibold text-gray-50 mb-2">How do I contact support directly?</h4>
                        <p class="text-sm text-gray-300">You can send us a message through the "Send us a Message" option in the home screen.</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="flex-shrink-0 flex justify-around items-center py-3 border-t border-gray-800 bg-gray-900 sticky bottom-0 z-10">
            <button id="navHome" class="nav-item flex flex-col items-center text-gray-400 hover:text-gray-50 transition-colors duration-200 p-2 rounded-md">
                <i class="fas fa-home text-xl mb-1"></i>
                <span class="text-xs">Home</span>
            </button>
            <button id="navMessages" class="nav-item flex flex-col items-center text-gray-400 hover:text-gray-50 transition-colors duration-200 p-2 rounded-md">
                <i class="fas fa-comments text-xl mb-1"></i>
                <span class="text-xs">Messages</span>
            </button>
            <button id="navTickets" class="nav-item flex flex-col items-center text-gray-400 hover:text-gray-50 transition-colors duration-200 p-2 rounded-md">
                <i class="fas fa-ticket-alt text-xl mb-1"></i>
                <span class="text-xs">Tickets</span>
            </button>
            <button id="navFAQ" class="nav-item flex flex-col items-center text-gray-400 hover:text-gray-50 transition-colors duration-200 p-2 rounded-md">
                <i class="fas fa-question-circle text-xl mb-1"></i>
                <span class="text-xs">FAQ</span>
            </button>
        </div>
    `;
  document.body.appendChild(supportWidget); // Append the entire widget panel to the body

  // --- 3. Get DOM elements (after HTML is injected) ---
  const closeWidgetBtn = document.getElementById("closeWidgetBtn");

  const navHome = document.getElementById("navHome");
  const navMessages = document.getElementById("navMessages");
  const navTickets = document.getElementById("navTickets");
  const navFAQ = document.getElementById("navFAQ"); // New FAQ navigation

  const homeSection = document.getElementById("homeSection");
  const messagesSection = document.getElementById("messagesSection");
  const ticketsSection = document.getElementById("ticketsSection");
  const feedbackFormSection = document.getElementById("feedbackFormSection");
  const faqSection = document.getElementById("faqSection"); // New FAQ section

  const sendMessageBtn = document.getElementById("sendMessageBtn");
  const backFromFormBtn = document.getElementById("backFromFormBtn");
  const backToTicketListBtn = document.getElementById("backToTicketListBtn");

  const feedbackForm = document.getElementById("feedbackForm");
  const submissionSuccess = document.getElementById("submissionSuccess");
  const successMessage = document.getElementById("successMessage");

  const ticketList = document.getElementById("ticketList");
  const noTicketsMessage = document.getElementById("noTicketsMessage");
  const ticketDetailView = document.getElementById("ticketDetailView");
  const detailId = document.getElementById("detailId");
  const detailSubject = document.getElementById("detailSubject");
  const detailStatus = document.getElementById("detailStatus");
  const detailDate = document.getElementById("detailDate");
  const detailDescription = document.getElementById("detailDescription");
  const detailConversation = document.getElementById("detailConversation");
  const replyMessage = document.getElementById("replyMessage");
  const submitReplyBtn = document.getElementById("submitReplyBtn");
  const replySuccess = document.getElementById("replySuccess");
  const ticketsSectionTitle = document.getElementById("ticketsSectionTitle");

  // --- 4. Backend Data Store Integration (remains mostly the same) ---
  let tickets = [];
  let currentViewingTicketId = null;

  async function fetchTickets() {
    try {
      const res = await fetch("/api/tickets", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tickets");
      const data = await res.json();
      tickets = data.tickets || data || [];
    } catch (err) {
      console.error("Error fetching tickets:", err);
      tickets = [];
    }
  }

  async function createTicket(ticketData) {
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(ticketData),
      });
      if (!res.ok) throw new Error("Failed to create ticket");
      return await res.json();
    } catch (err) {
      console.error("Error creating ticket:", err);
      return null;
    }
  }

  async function replyToTicket(ticketId, message) {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error("Failed to reply to ticket");
      return await res.json();
    } catch (err) {
      console.error("Error replying to ticket:", err);
      return null;
    }
  }

  async function fetchTicketById(ticketId) {
    try {
      const res = await fetch(`/api/tickets`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tickets");
      const data = await res.json();
      const found = (data.tickets || data || []).find(
        (t) => t._id === ticketId || t.id === ticketId
      );
      return found || null;
    } catch (err) {
      console.error("Error fetching ticket by ID:", err);
      return null;
    }
  }

  // --- 5. Helper Functions ---
  function generateTicketId() {
    return "TKT-" + Math.random().toString(36).substr(2, 7).toUpperCase();
  }

  function getStatusColorClass(status) {
    switch (status.toLowerCase()) {
      case "new":
        return "bg-blue-600";
      case "open":
        return "bg-yellow-600";
      case "in progress":
        return "bg-indigo-600";
      case "awaiting user reply":
        return "bg-orange-600";
      case "resolved":
        return "bg-green-600";
      case "closed":
        return "bg-gray-600";
      case "on hold":
        return "bg-purple-600";
      case "reopened":
        return "bg-red-600";
      default:
        return "bg-gray-500";
    }
  }

  function formatDate(dateString) {
    const options = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      ...options,
      timeZone: "Africa/Nairobi",
    });
  }

  function showSection(sectionId) {
    const sections = [
      homeSection,
      messagesSection,
      ticketsSection,
      feedbackFormSection,
      faqSection, // Include new FAQ section
    ].filter(Boolean);
    sections.forEach((section) => section.classList.add("hidden"));

    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
      targetSection.classList.remove("hidden");

      if (sectionId === "ticketsSection") {
        if (ticketDetailView && ticketDetailView.classList.contains("hidden")) {
          document.getElementById("ticketListView").classList.remove("hidden");
          ticketsSectionTitle.textContent = "My Tickets";
        }
        renderTickets();
      } else {
        if (ticketDetailView) ticketDetailView.classList.add("hidden");
        const ticketListView = document.getElementById("ticketListView");
        if (ticketListView) ticketListView.classList.remove("hidden");
      }
    }

    [navHome, navMessages, navTickets, navFAQ] // Include navFAQ
      .filter(Boolean)
      .forEach((navBtn) => navBtn.classList.remove("active"));

    if (navHome && sectionId === "homeSection") navHome.classList.add("active");
    else if (
      navMessages &&
      (sectionId === "messagesSection" || sectionId === "feedbackFormSection")
    )
      navMessages.classList.add("active");
    else if (
      navTickets &&
      (sectionId === "ticketsSection" ||
        (ticketDetailView && !ticketDetailView.classList.contains("hidden")))
    ) {
      navTickets.classList.add("active");
    } else if (navFAQ && sectionId === "faqSection") {
      // Activate FAQ nav
      navFAQ.classList.add("active");
    }
  }

  async function renderTickets() {
    if (!ticketList) return;
    await fetchTickets();
    ticketList.innerHTML = "";
    if (tickets.length === 0) {
      noTicketsMessage.classList.remove("hidden");
      return;
    }
    noTicketsMessage.classList.add("hidden");
    tickets.sort(
      (a, b) =>
        new Date(b.createdAt || b.submittedDate) -
        new Date(a.createdAt || a.submittedDate)
    );
    tickets.forEach((ticket) => {
      const ticketElement = document.createElement("div");
      ticketElement.className = `p-4 border border-gray-700 rounded-lg shadow-sm hover:bg-gray-800 cursor-pointer transition-colors duration-200 ${
        (ticket.status || "").toLowerCase() === "resolved" ||
        (ticket.status || "").toLowerCase() === "closed"
          ? "opacity-80"
          : ""
      }`;
      ticketElement.innerHTML = `
                <div class="flex justify-between items-center">
                    <div class="flex items-center">
                        <i class="fas fa-ticket-alt text-blue-500 mr-3 text-xl"></i>
                        <div>
                            <h4 class="font-medium text-gray-50 text-base">
                                ${ticket.subject.substring(0, 40)}${
        ticket.subject.length > 40 ? "..." : ""
      }
                            </h4>
                            <p class="text-sm text-gray-400 mt-1">
                                #${(ticket._id || ticket.id)
                                  .toString()
                                  .slice(
                                    -6
                                  )} • <span class="${getStatusColorClass(
        ticket.status
      )} px-2 py-0.5 rounded-full text-xs font-semibold">${ticket.status}</span>
                            </p>
                        </div>
                    </div>
                    <i class="fas fa-chevron-right text-gray-500"></i>
                </div>
            `;
      ticketElement.onclick = () => showTicketDetails(ticket._id || ticket.id);
      ticketList.appendChild(ticketElement);
    });
  }

  async function showTicketDetails(ticketId) {
    currentViewingTicketId = ticketId;
    const ticket = await fetchTicketById(ticketId);
    if (!ticket) return;

    if (detailId)
      detailId.textContent = (ticket.id || ticket._id || "")
        .toString()
        .slice(-6);
    if (detailSubject) detailSubject.textContent = ticket.subject;
    if (detailStatus) {
      detailStatus.textContent = ticket.status;
      detailStatus.className = `font-semibold px-2 py-1 rounded-full text-white text-xs ${getStatusColorClass(
        ticket.status
      )}`;
    }
    if (detailDate)
      detailDate.textContent = formatDate(
        ticket.createdAt || ticket.submittedDate
      );
    if (detailDescription) detailDescription.textContent = ticket.description;

    if (detailConversation) {
      detailConversation.innerHTML = "";
      (ticket.conversation || []).forEach((msg) => {
        const msgElement = document.createElement("div");
        const senderName =
          msg.sender === "user"
            ? "You"
            : msg.sender === "agent"
            ? msg.agent || ticket.assignedTo || "Support"
            : "System";
        const bgColor = msg.sender === "user" ? "bg-blue-800" : "bg-gray-700";
        const textColor =
          msg.sender === "user" ? "text-blue-100" : "text-gray-200";
        const alignment =
          msg.sender === "user" ? "ml-auto text-right" : "mr-auto text-left";
        const avatar =
          msg.sender === "user"
            ? ""
            : `<img src="https://api.dicebear.com/7.x/pixel-art/svg?seed=${senderName}" alt="Avatar" class="w-8 h-8 rounded-full mr-3 self-start border border-gray-600">`; // Slightly larger avatar with border

        msgElement.className = `flex items-start ${alignment}`;
        msgElement.style.maxWidth = "90%"; // Slightly increased max-width
        msgElement.innerHTML = `
                    ${
                      msg.sender === "agent" || msg.sender === "system"
                        ? avatar
                        : ""
                    }
                    <div class="p-3 rounded-lg ${bgColor} ${textColor} flex flex-col items-${
          msg.sender === "user" ? "end" : "start"
        } shadow-md">
                        <p class="font-medium text-xs mb-1 ${
                          msg.sender === "user"
                            ? "text-blue-200"
                            : "text-gray-400"
                        }">${senderName}</p>
                        <p class="text-sm">${msg.message}</p>
                        <p class="text-xs text-gray-400 mt-1">${formatDate(
                          msg.timestamp
                        )}</p>
                    </div>
                    ${msg.sender === "user" ? avatar : ""}
                `;
        detailConversation.appendChild(msgElement);
      });
      detailConversation.scrollTop = detailConversation.scrollHeight;
    }

    const ticketListView = document.getElementById("ticketListView");
    if (ticketListView) ticketListView.classList.add("hidden");
    if (ticketDetailView) ticketDetailView.classList.remove("hidden");
    if (ticketsSectionTitle) ticketsSectionTitle.textContent = "Ticket Details";
  }

  // --- 6. Event Listeners ---
  if (openWidgetBtn) {
    openWidgetBtn.addEventListener("click", () => {
      if (supportWidget.classList.contains("slide-out")) {
        supportWidget.classList.remove("slide-out", "opacity-0");
        supportWidget.classList.add("slide-in", "opacity-1");
        openWidgetBtn.classList.add("hidden");
        showSection("homeSection"); // Default to Home section
      }
    });
  } else {
    console.error("openWidgetBtn not found after widget creation.");
  }

  if (closeWidgetBtn) {
    closeWidgetBtn.addEventListener("click", () => {
      supportWidget.classList.remove("slide-in", "opacity-1");
      supportWidget.classList.add("slide-out", "opacity-0");
      openWidgetBtn.classList.remove("hidden"); // Show the floating button again
    });
  }

  if (navHome)
    navHome.addEventListener("click", () => showSection("homeSection"));
  if (navMessages)
    navMessages.addEventListener("click", () => showSection("messagesSection"));
  if (navTickets)
    navTickets.addEventListener("click", () => showSection("ticketsSection"));
  if (navFAQ) navFAQ.addEventListener("click", () => showSection("faqSection")); // New FAQ nav listener

  if (sendMessageBtn) {
    sendMessageBtn.addEventListener("click", () => {
      showSection("feedbackFormSection");
      feedbackForm.reset();
      submissionSuccess.classList.add("hidden");
    });
  }

  if (backFromFormBtn)
    backFromFormBtn.addEventListener("click", () =>
      showSection("messagesSection")
    );

  if (backToTicketListBtn)
    backToTicketListBtn.addEventListener("click", () => {
      if (ticketDetailView) ticketDetailView.classList.add("hidden");
      const ticketListView = document.getElementById("ticketListView");
      if (ticketListView) ticketListView.classList.remove("hidden");
      if (ticketsSectionTitle) ticketsSectionTitle.textContent = "My Tickets";
      renderTickets();
    });

  if (feedbackForm) {
    feedbackForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(feedbackForm);
      const ticketData = {
        type: formData.get("feedbackType"),
        subject: formData.get("subject"),
        message: formData.get("description"),
        email: formData.get("email") || undefined,
      };
      const created = await createTicket(ticketData);
      feedbackForm.reset();
      if (created && created._id) {
        if (successMessage)
          successMessage.textContent = `Your message has been sent! Your ticket ID is #${created._id
            .toString()
            .slice(-6)}.`;
        if (submissionSuccess) submissionSuccess.classList.remove("hidden");
        setTimeout(() => {
          if (submissionSuccess) submissionSuccess.classList.add("hidden");
          showSection("ticketsSection");
          showTicketDetails(created._id);
        }, 1500);
      } else {
        if (successMessage)
          successMessage.textContent = `Failed to send message. Please try again.`;
        if (submissionSuccess) submissionSuccess.classList.remove("hidden");
        setTimeout(() => {
          if (submissionSuccess) submissionSuccess.classList.add("hidden");
        }, 2000);
      }
    });
  }

  if (submitReplyBtn) {
    submitReplyBtn.addEventListener("click", async () => {
      const replyText = replyMessage.value.trim();
      if (!replyText) {
        alert("Please type a message to reply.");
        return;
      }
      const result = await replyToTicket(currentViewingTicketId, replyText);
      if (replyMessage) replyMessage.value = "";
      if (replySuccess) replySuccess.classList.remove("hidden");
      setTimeout(() => {
        if (replySuccess) replySuccess.classList.add("hidden");
        showTicketDetails(currentViewingTicketId);
      }, 500);
    });
  }

  const contentArea = document.getElementById("contentArea");
  if (contentArea) {
    contentArea.addEventListener("click", (event) => {
      let targetCard = event.target.closest(
        '.action-card[data-nav-target="messagesSection"]'
      );
      if (targetCard) {
        showSection("messagesSection");
        return;
      }

      targetCard = event.target.closest(
        '.action-card[data-nav-target="ticketsSection"]'
      );
      if (targetCard) {
        showSection("ticketsSection");
        return;
      }

      targetCard = event.target.closest(
        '.action-card[data-nav-target="faqSection"]'
      );
      if (targetCard) {
        showSection("faqSection");
        return;
      }
    });
  }

  // --- 7. Initial Setup ---
  if (supportWidget) {
    supportWidget.classList.add("slide-out", "opacity-0"); // Ensure widget starts closed with opacity
  }
  renderTickets(); // Populate tickets from backend
  if (navHome) navHome.classList.add("active"); // Set default active nav item
  if (homeSection) homeSection.classList.remove("hidden"); // Show home section by default
}

document.addEventListener("DOMContentLoaded", createRenderSupportWidget);

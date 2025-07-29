// widget.js

// --- 1. Widget Styles as a string (for dynamic injection) ---
const widgetStyles = `
    /* Custom scrollbar for better aesthetics */
    .chat-scroll::-webkit-scrollbar {
        width: 8px;
    }
    .chat-scroll::-webkit-scrollbar-track {
        background: #2d2d2d; /* Darker track */
        border-radius: 10px;
    }
    .chat-scroll::-webkit-scrollbar-thumb {
        background: #555;
        border-radius: 10px;
    }
    .chat-scroll::-webkit-scrollbar-thumb:hover {
        background: #777;
    }

    /* Slide-in panel animation states */
    .slide-in {
        transform: translateX(0%);
    }
    .slide-out {
        transform: translateX(100%);
    }

    /* Active navigation item styling (Render-like green) */
    .nav-item.active {
        color: #4CAF50;
    }
    .nav-item.active .fas {
        color: #4CAF50;
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
    "fixed bottom-8 right-8 z-[1000] bg-gray-700 text-white p-4 rounded-full shadow-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 transition-all duration-300 transform scale-100 hover:scale-105";
  openWidgetBtn.innerHTML = `
        <i
        class="fas fa-comment-dots text-white text-2xl group-hover:scale-110 transition-transform duration-300"
      ></i>
    `;
  document.body.appendChild(openWidgetBtn);

  // Create the main support widget panel
  const supportWidget = document.createElement("div");
  supportWidget.id = "supportWidget";
  supportWidget.className =
    "fixed bottom-0 right-0 w-full md:w-[400px] h-[90vh] bg-black text-gray-100 rounded-t-xl shadow-2xl flex flex-col z-[999] transition-transform duration-500 ease-in-out slide-out";
  supportWidget.innerHTML = `
        <div class="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
            <h2 class="text-3xl font-bold text-gray-100">SwiftPOS</h2>
            <button id="closeWidgetBtn" class="text-gray-400 hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 rounded-full p-2 transition-colors duration-200">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>

        <div id="contentArea" class="flex-grow overflow-y-auto p-6 chat-scroll">
            <div id="homeSection" class="section-content hidden">
                <h3 class="text-3xl font-semibold mb-4 text-gray-50">Hi There 👋</h3>
                <p class="text-xl text-gray-300 mb-6">How can we help?</p>

                <div class="bg-gray-800 p-4 rounded-lg mb-4 cursor-pointer hover:bg-gray-700 transition-colors duration-200" data-nav-target="messagesSection">
                    <h4 class="font-medium text-gray-50 mb-2">Recent message</h4>
                    <div class="flex items-center text-sm text-gray-300">
                        <img src="https://api.dicebear.com/7.x/pixel-art/svg?seed=Jeremy" alt="Avatar" class="w-8 h-8 rounded-full mr-3">
                        <div>
                            <p>Support Ticket</p>
                            <p class="text-gray-400">Rate your conversation</p>
                            <p class="text-xs text-gray-500">Jérémy • 7w ago</p>
                        </div>
                        <i class="fas fa-chevron-right ml-auto text-gray-500"></i>
                    </div>
                </div>

                <div class="bg-gray-800 p-4 rounded-lg mb-4">
                    <div class="flex items-center text-green-500">
                        <i class="fas fa-check-circle mr-2"></i>
                        <span class="font-medium">Status: All Systems Operational</span>
                    </div>
                    <p class="text-xs text-gray-400 mt-2">Updated Jul 29. 15:57 UTC</p>
                </div>
            </div>

            <div id="messagesSection" class="section-content hidden">
                <h3 class="text-2xl font-semibold text-gray-50 mb-6">Messages</h3>

                <div class="bg-gray-800 p-4 rounded-lg mb-3 cursor-pointer hover:bg-gray-700 transition-colors duration-200">
                    <div class="flex items-center text-sm text-gray-300">
                        <img src="https://api.dicebear.com/7.x/pixel-art/svg?seed=Jeremy2" alt="Avatar" class="w-8 h-8 rounded-full mr-3">
                        <div>
                            <p>Rate your conversation</p>
                            <p class="text-xs text-gray-500">Jérémy • 6w ago</p>
                        </div>
                        <i class="fas fa-chevron-right ml-auto text-gray-500"></i>
                    </div>
                </div>

                <div class="bg-gray-800 p-4 rounded-lg mb-6 cursor-pointer hover:bg-gray-700 transition-colors duration-200" data-ticket-id="TKT-DEMO1">
                     <div class="flex items-center text-sm text-gray-300">
                        <i class="fas fa-ticket-alt mr-1 text-blue-400 text-xl"></i>
                        <img src="https://api.dicebear.com/7.x/pixel-art/svg?seed=Jeremy3" alt="Avatar" class="w-8 h-8 rounded-full mr-3">
                        <div>
                            <p>Support Ticket</p>
                            <p class="text-gray-400">Rate your conversation</p>
                            <p class="text-xs text-gray-500">Jérémy • 7w ago</p>
                        </div>
                        <i class="fas fa-chevron-right ml-auto text-gray-500"></i>
                    </div>
                </div>

                <div class="text-center py-4">
                    <button id="sendMessageBtn" class="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-full shadow-md inline-flex items-center transition-colors duration-200">
                        Send us a message
                        <svg class="ml-2 w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
                    </button>
                </div>
            </div>

            <div id="ticketsSection" class="section-content hidden">
                <h3 class="text-2xl font-semibold text-gray-50 mb-6" id="ticketsSectionTitle">Tickets</h3>

                <div id="ticketListView">
                    <div id="ticketList" class="space-y-3">
                        <p id="noTicketsMessage" class="text-gray-500 text-center py-8">You haven't submitted any tickets yet.</p>
                    </div>
                </div>

                <div id="ticketDetailView" class="hidden">
                    <button id="backToTicketListBtn" class="text-blue-400 hover:text-blue-300 text-sm mb-4 inline-flex items-center">
                        <i class="fas fa-arrow-left mr-2"></i> Back to Tickets
                    </button>
                    <h4 class="text-xl font-semibold text-gray-50 mb-2" id="detailSubject"></h4>
                    <p class="text-sm text-gray-400 mb-1">Ticket ID: <span id="detailId" class="font-mono"></span></p>
                    <p class="text-sm text-gray-400 mb-3">Status: <span id="detailStatus" class="font-semibold px-2 py-1 rounded-full text-white text-xs"></span></p>
                    <p class="text-sm text-gray-400 mb-4">Submitted on: <span id="detailDate"></span></p>

                    <div class="border-t border-gray-700 pt-4">
                        <h5 class="font-medium text-gray-50 mb-2">Original Description:</h5>
                        <p id="detailDescription" class="text-gray-300 text-sm mb-6 bg-gray-800 p-3 rounded-md"></p>

                        <h5 class="font-medium text-gray-50 mb-2">Conversation:</h5>
                        <div id="detailConversation" class="space-y-4 rounded-md p-3 max-h-60 overflow-y-auto bg-gray-800 chat-scroll">
                        </div>

                        <div class="mt-4">
                            <h5 class="font-medium text-gray-50 mb-2">Reply to this Ticket:</h5>
                            <textarea id="replyMessage" rows="3" class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="Type your reply here..."></textarea>
                            <button id="submitReplyBtn" class="mt-2 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
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
                <form id="feedbackForm" class="space-y-4">
                    <div>
                        <label for="feedbackType" class="block text-sm font-medium text-gray-300 mb-1">Feedback Type</label>
                        <select id="feedbackType" name="feedbackType" class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                            <option value="">Select a type</option>
                            <option value="bug">Bug Report</option>
                            <option value="feature">Feature Request</option>
                            <option value="general">General Feedback</option>
                            <option value="question">Question</option>
                        </select>
                    </div>
                    <div>
                        <label for="subject" class="block text-sm font-medium text-gray-300 mb-1">Subject</label>
                        <input type="text" id="subject" name="subject" required class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                    </div>
                    <div>
                        <label for="description" class="block text-sm font-medium text-gray-300 mb-1">Description</label>
                        <textarea id="description" name="description" rows="5" required class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="Please describe your issue or suggestion in detail, including steps to reproduce if applicable."></textarea>
                    </div>
                    <div>
                        <label for="email" class="block text-sm font-medium text-gray-300 mb-1">Your Email (Optional)</label>
                        <input type="email" id="email" name="email" class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="e.g., your.email@example.com">
                    </div>
                    <button type="submit" class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                        Submit Message
                    </button>
                </form>
                <div id="submissionSuccess" class="hidden mt-4 bg-green-900 border border-green-700 text-green-200 px-4 py-3 rounded relative" role="alert">
                    <strong class="font-bold">Success!</strong>
                    <span class="block sm:inline" id="successMessage"></span>
                </div>
            </div>
        </div>

        <div class="flex justify-around items-center py-3 border-t border-gray-800 bg-gray-900 sticky bottom-0 z-10">
            <button id="navHome" class="nav-item flex flex-col items-center text-gray-400 hover:text-gray-50">
                <i class="fas fa-home text-xl mb-1"></i>
                <span class="text-xs">Home</span>
            </button>
            <button id="navMessages" class="nav-item flex flex-col items-center text-gray-400 hover:text-gray-50">
                <i class="fas fa-comments text-xl mb-1"></i>
                <span class="text-xs">Messages</span>
            </button>
            <button id="navTickets" class="nav-item flex flex-col items-center text-gray-400 hover:text-gray-50">
                <i class="fas fa-ticket-alt text-xl mb-1"></i>
                <span class="text-xs">Tickets</span>
            </button>
        </div>
    `;
  document.body.appendChild(supportWidget); // Append the entire widget panel to the body

  // --- 3. Get DOM elements (after HTML is injected) ---
  // These must be re-queried as they are now dynamically created
  const closeWidgetBtn = document.getElementById("closeWidgetBtn"); // NEW: Get reference to the close button

  const navHome = document.getElementById("navHome");
  const navMessages = document.getElementById("navMessages");
  const navTickets = document.getElementById("navTickets");

  const homeSection = document.getElementById("homeSection");
  const messagesSection = document.getElementById("messagesSection");
  const ticketsSection = document.getElementById("ticketsSection");
  const feedbackFormSection = document.getElementById("feedbackFormSection");

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

  // --- 4. Simulated Data Store (for demo purposes) ---
  let tickets = JSON.parse(localStorage.getItem("userTicketsRenderStyle")) || [
    {
      id: "TKT-DEMO1",
      type: "bug",
      subject: "Login issue on mobile",
      description:
        "Users are unable to log in when using the mobile application on Android 12.",
      email: "test@example.com",
      submittedDate: "2025-07-20T10:00:00Z",
      status: "Resolved",
      assignedTo: "Jane Doe (Support)",
      conversation: [
        {
          sender: "user",
          message: "I cannot log in on my Android phone.",
          timestamp: "2025-07-20T10:00:00Z",
        },
        {
          sender: "agent",
          message: "Thank you for reporting. We are investigating this issue.",
          timestamp: "2025-07-20T11:30:00Z",
          agent: "Jane Doe",
        },
        {
          sender: "user",
          message: "Any updates?",
          timestamp: "2025-07-21T09:00:00Z",
        },
        {
          sender: "agent",
          message:
            "We've deployed a fix. Please try logging in again. Let us know if the issue persists.",
          timestamp: "2025-07-22T14:45:00Z",
          agent: "Jane Doe",
        },
        {
          sender: "system",
          message: "This ticket has been marked as Resolved.",
          timestamp: "2025-07-22T14:46:00Z",
        },
      ],
    },
  ];
  let currentViewingTicketId = null;

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
    ].filter(Boolean);
    sections.forEach((section) => section.classList.add("hidden"));

    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
      targetSection.classList.remove("hidden");

      if (sectionId === "ticketsSection") {
        if (ticketDetailView && ticketDetailView.classList.contains("hidden")) {
          document.getElementById("ticketListView").classList.remove("hidden");
          ticketsSectionTitle.textContent = "Tickets";
        }
        renderTickets();
      } else {
        if (ticketDetailView) ticketDetailView.classList.add("hidden");
        const ticketListView = document.getElementById("ticketListView");
        if (ticketListView) ticketListView.classList.remove("hidden");
      }
    }

    [navHome, navMessages, navTickets]
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
    }
  }

  function renderTickets() {
    if (!ticketList) return;
    ticketList.innerHTML = "";
    if (tickets.length === 0) {
      noTicketsMessage.classList.remove("hidden");
      return;
    }
    noTicketsMessage.classList.add("hidden");

    tickets.sort(
      (a, b) => new Date(b.submittedDate) - new Date(a.submittedDate)
    );

    tickets.forEach((ticket) => {
      const ticketElement = document.createElement("div");
      ticketElement.className = `p-4 border border-gray-700 rounded-lg shadow-sm hover:bg-gray-800 cursor-pointer ${
        ticket.status.toLowerCase() === "resolved" ||
        ticket.status.toLowerCase() === "closed"
          ? "opacity-80"
          : ""
      }`;
      ticketElement.innerHTML = `
                <div class="flex justify-between items-start">
                    <div class="flex items-center">
                        <i class="fas fa-ticket-alt text-green-500 mr-3 text-xl"></i>
                        <div>
                            <h4 class="font-medium text-gray-50">${
                              ticket.type === "bug"
                                ? "Bug Report"
                                : ticket.type === "feature"
                                ? "Feature Request"
                                : "Support Ticket"
                            }</h4>
                            <p class="text-sm text-gray-400 mt-1">#${
                              ticket.id.split("-")[1]
                            } • ${ticket.status}</p>
                        </div>
                    </div>
                    <i class="fas fa-chevron-right text-gray-500"></i>
                </div>
            `;
      ticketElement.onclick = () => showTicketDetails(ticket.id);
      ticketList.appendChild(ticketElement);
    });
  }

  function showTicketDetails(ticketId) {
    currentViewingTicketId = ticketId;
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    if (detailId) detailId.textContent = ticket.id.split("-")[1];
    if (detailSubject) detailSubject.textContent = ticket.subject;
    if (detailStatus) {
      detailStatus.textContent = ticket.status;
      detailStatus.className = `font-semibold px-2 py-1 rounded-full text-white text-xs ${getStatusColorClass(
        ticket.status
      )}`;
    }
    if (detailDate) detailDate.textContent = formatDate(ticket.submittedDate);
    if (detailDescription) detailDescription.textContent = ticket.description;

    if (detailConversation) {
      detailConversation.innerHTML = "";
      ticket.conversation.forEach((msg) => {
        const msgElement = document.createElement("div");
        const senderName =
          msg.sender === "user"
            ? "You"
            : msg.sender === "agent"
            ? msg.agent || ticket.assignedTo
            : "System";
        const bgColor = msg.sender === "user" ? "bg-blue-800" : "bg-gray-700";
        const textColor =
          msg.sender === "user" ? "text-blue-100" : "text-gray-200";
        const alignment =
          msg.sender === "user" ? "ml-auto text-right" : "mr-auto text-left";
        const avatar =
          msg.sender === "user"
            ? ""
            : `<img src="https://api.dicebear.com/7.x/pixel-art/svg?seed=${senderName}" alt="Avatar" class="w-7 h-7 rounded-full mr-2 self-start ${
                msg.sender === "user" ? "hidden" : ""
              }">`;

        msgElement.className = `flex items-start ${alignment}`;
        msgElement.style.maxWidth = "85%";
        msgElement.innerHTML = `
                    ${
                      msg.sender === "agent" || msg.sender === "system"
                        ? avatar
                        : ""
                    }
                    <div class="p-3 rounded-lg ${bgColor} ${textColor} flex flex-col">
                        <p class="font-medium text-xs mb-1 ${
                          msg.sender === "user"
                            ? "text-blue-200"
                            : "text-gray-400"
                        }">${senderName}</p>
                        <p class="text-sm">${msg.message}</p>
                        <p class="text-xs text-gray-400 mt-1 self-end">${formatDate(
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
        supportWidget.classList.remove("slide-out");
        supportWidget.classList.add("slide-in");
        openWidgetBtn.classList.add("hidden");
        showSection("homeSection"); // Default to Home section
      } else if (supportWidget.classList.contains("slide-in")) {
        supportWidget.classList.remove("slide-in");
        supportWidget.classList.add("slide-out");
        openWidgetBtn.classList.remove("hidden");
      } else {
        // Fallback for initial state or unexpected state
        supportWidget.classList.add("slide-in");
        openWidgetBtn.classList.add("hidden");
        showSection("homeSection");
      }
    });
  } else {
    console.error("openWidgetBtn not found after widget creation.");
  }

  // NEW: Add event listener for the close button
  if (closeWidgetBtn) {
    closeWidgetBtn.addEventListener("click", () => {
      supportWidget.classList.remove("slide-in");
      supportWidget.classList.add("slide-out");
      openWidgetBtn.classList.remove("hidden"); // Show the floating button again
    });
  }

  // Add event listeners for navigation buttons after they are created
  if (navHome)
    navHome.addEventListener("click", () => showSection("homeSection"));
  if (navMessages)
    navMessages.addEventListener("click", () => showSection("messagesSection"));
  if (navTickets)
    navTickets.addEventListener("click", () => showSection("ticketsSection"));

  // Event listener for the "Send us a message" button inside messagesSection
  if (sendMessageBtn) {
    sendMessageBtn.addEventListener("click", () => {
      showSection("feedbackFormSection");
      feedbackForm.reset();
      submissionSuccess.classList.add("hidden");
    });
  }

  // Event listener for the "Back to Messages" button in the form
  if (backFromFormBtn)
    backFromFormBtn.addEventListener("click", () =>
      showSection("messagesSection")
    );

  // Event listener for the "Back to Tickets" button in the ticket detail view
  if (backToTicketListBtn)
    backToTicketListBtn.addEventListener("click", () => {
      if (ticketDetailView) ticketDetailView.classList.add("hidden");
      const ticketListView = document.getElementById("ticketListView");
      if (ticketListView) ticketListView.classList.remove("hidden");
      if (ticketsSectionTitle) ticketsSectionTitle.textContent = "Tickets";
      renderTickets();
    });

  // Event listener for the feedback submission form
  if (feedbackForm) {
    feedbackForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const formData = new FormData(feedbackForm);
      const newTicket = {
        id: generateTicketId(),
        type: formData.get("feedbackType"),
        subject: formData.get("subject"),
        description: formData.get("description"),
        email: formData.get("email") || "N/A",
        submittedDate: new Date().toISOString(),
        status: "New",
        assignedTo: "Unassigned",
        conversation: [
          {
            sender: "user",
            message: formData.get("description"),
            timestamp: new Date().toISOString(),
          },
        ],
      };
      newTicket.conversation.push({
        sender: "system",
        message: `Thank you for your message! We've created ticket #${
          newTicket.id.split("-")[1]
        } for you. We will get back to you shortly.`,
        timestamp: new Date().toISOString(),
      });

      tickets.push(newTicket);
      localStorage.setItem("userTicketsRenderStyle", JSON.stringify(tickets));

      feedbackForm.reset();
      if (successMessage)
        successMessage.textContent = `Your message has been sent! Your ticket ID is #${
          newTicket.id.split("-")[1]
        }.`;
      if (submissionSuccess) submissionSuccess.classList.remove("hidden");

      setTimeout(() => {
        if (submissionSuccess) submissionSuccess.classList.add("hidden");
        showSection("ticketsSection");
        showTicketDetails(newTicket.id);
      }, 1500);
    });
  }

  // Event listener for replying to a ticket
  if (submitReplyBtn) {
    submitReplyBtn.addEventListener("click", () => {
      const replyText = replyMessage.value.trim();
      if (!replyText) {
        alert("Please type a message to reply.");
        return;
      }

      const ticketIndex = tickets.findIndex(
        (t) => t.id === currentViewingTicketId
      );
      if (ticketIndex === -1) return;

      const ticket = tickets[ticketIndex];
      const newReply = {
        sender: "user",
        message: replyText,
        timestamp: new Date().toISOString(),
      };
      ticket.conversation.push(newReply);

      setTimeout(() => {
        const agentReply = {
          sender: "agent",
          message:
            "Got it! Our support team is reviewing your latest message and will respond soon.",
          timestamp: new Date().toISOString(),
          agent: ticket.assignedTo || "Support Team",
        };
        ticket.conversation.push(agentReply);

        if (
          ticket.status.toLowerCase() === "resolved" ||
          ticket.status.toLowerCase() === "closed"
        ) {
          ticket.status = "Reopened";
        } else if (ticket.status.toLowerCase() === "awaiting user reply") {
          ticket.status = "In Progress";
        }

        localStorage.setItem("userTicketsRenderStyle", JSON.stringify(tickets));
        showTicketDetails(currentViewingTicketId);
      }, 1000);

      localStorage.setItem("userTicketsRenderStyle", JSON.stringify(tickets));

      if (replyMessage) replyMessage.value = "";
      if (replySuccess) replySuccess.classList.remove("hidden");
      setTimeout(() => {
        if (replySuccess) replySuccess.classList.add("hidden");
        showTicketDetails(currentViewingTicketId);
      }, 500);
    });
  }

  // Delegate click events for dynamically created elements inside contentArea
  const contentArea = document.getElementById("contentArea");
  if (contentArea) {
    contentArea.addEventListener("click", (event) => {
      let targetCard = event.target.closest(
        '.bg-gray-800.cursor-pointer[data-nav-target="messagesSection"]'
      );
      if (targetCard) {
        showSection("messagesSection");
        return;
      }

      targetCard = event.target.closest(
        ".bg-gray-800.cursor-pointer[data-ticket-id]"
      );
      if (targetCard) {
        const ticketId = targetCard.dataset.ticketId;
        showTicketDetails(ticketId);
        showSection("ticketsSection");
        return;
      }
    });
  }

  // --- 7. Initial Setup ---
  if (supportWidget) {
    supportWidget.classList.add("slide-out"); // Ensure widget starts closed
  }
  renderTickets(); // Populate tickets
  if (navHome) navHome.classList.add("active"); // Set default active nav item
  if (homeSection) homeSection.classList.remove("hidden"); // Show home section by default
}

// Ensure the widget creation runs after the DOM is fully loaded
document.addEventListener("DOMContentLoaded", createRenderSupportWidget);

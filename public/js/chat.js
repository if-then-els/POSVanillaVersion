// chat.js - Centralized Chat/Tickets/Feedback System

/**
 * Encapsulates the entire chat system logic to avoid global scope pollution.
 */
(function () {
  // === Constants and Utility Functions ===

  // Template string for the chat modal and Floating Action Button (FAB)
  const MODAL_HTML = `
    <div
      id="feedbackModal"
      class="fixed bottom-28 left-4 sm:left-auto sm:right-4 w-80 max-h-[80vh] glass-dark rounded-2xl shadow-lg border border-gray-600 flex flex-col hidden z-50 bg-gray-900 text-white"
    >
      <div class="bg-gradient-to-r from-primary-500 to-accent-500 text-white p-4 rounded-t-2xl flex justify-between items-center">
        <h2 class="text-lg font-semibold">Support</h2>
        <button id="closeChat" class="text-white text-xl">&times;</button>
      </div>
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        <div id="tab-Home" class="tab-panel space-y-3">
          <div id="welcomeBox" class="bg-gray-800 border border-gray-700 rounded-lg p-3 space-y-1">
            <h3 class="text-base font-semibold">Hi 👋</h3>
            <p class="text-sm text-gray-300">How can we help?</p>
          </div>
          <div id="statusBox" class="bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm">
            <p class="font-semibold">Status: <span class="text-green-400">All systems operational</span></p>
            <p class="text-xs text-gray-400">Updated on: <span id="currentDate"></span></p>
          </div>
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-3">
            <button id="openMessage" class="w-full flex items-center justify-between px-4 py-2 bg-accent-500 hover:bg-accent-600 rounded-lg text-sm font-medium transition">
              <span>Send us a message</span>
              <i class="fas fa-paper-plane ml-2"></i>
            </button>
          </div>
          <form id="chatForm" class="hidden flex flex-col space-y-2 mt-2">
            <textarea id="chatInput" rows="3" placeholder="Type your feedback..." class="w-full resize-none px-4 py-2 rounded-lg text-sm bg-gray-700 text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-accent-400" required></textarea>
            <button id="sendButton" type="submit" class="self-end px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white text-sm font-medium rounded-lg flex items-center gap-2">
              <span id="sendText">Send</span>
              <span id="sendSpinner" class="hidden animate-spin"><i class="fas fa-spinner"></i></span>
              <span id="sendCheck" class="hidden"><i class="fas fa-check-double"></i></span>
            </button>
          </form>
          <div id="chatBox" class="max-h-40 overflow-y-auto space-y-2 text-sm mt-2 break-words"></div>
        </div>
        <div id="tab-Messages" class="tab-panel hidden flex flex-col space-y-2 h-full">
          <div class="flex-1 overflow-y-auto space-y-2 bg-gray-800 p-2 rounded-lg max-h-40 text-sm" id="messagesArea"></div>
          <div class="flex items-center gap-2">
            <input class="flex-1 px-3 py-2 text-sm rounded-lg bg-gray-700 text-white placeholder-gray-400 outline-none" placeholder="Type a message..." />
            <button id="msgSendBtn" class="px-4 py-2 bg-accent-500 hover:bg-accent-600 rounded-lg text-white"><i class="fas fa-paper-plane"></i></button>
          </div>
          <div class="mt-3 bg-gray-800 border border-gray-700 rounded-lg p-3 text-center">
            <p class="text-xs text-gray-400 mb-2">Rate this conversation:</p>
            <div class="flex justify-center gap-3 text-xl">
              <span>⭐</span><span>⭐</span><span>⭐</span><span>⭐</span><span>⭐</span>
            </div>
          </div>
        </div>
        <div id="tab-Tickets" class="tab-panel hidden text-center text-sm text-gray-300">
          <p>No tickets created yet.</p>
        </div>
      </div>
      <div class="border-t border-gray-700 bg-gray-800 p-2 flex justify-around text-sm text-gray-300">
        <button class="tab-button flex flex-col items-center hover:text-white" data-tab="Home" id="tabHome"><i class="fas fa-home text-lg"></i><span>Home</span></button>
        <button class="tab-button flex flex-col items-center hover:text-white" data-tab="Messages" id="tabMessages"><i class="fas fa-comment-dots text-lg"></i><span>Messages</span></button>
        <button class="tab-button flex flex-col items-center hover:text-white" data-tab="Tickets" id="tabTickets"><i class="fas fa-ticket-alt text-lg"></i><span>Tickets</span></button>
      </div>
    </div>
    <button id="fab" class="fixed bottom-8 left-8 sm:left-auto sm:right-8 w-16 h-16 bg-gradient-to-r from-accent-500 to-accent-600 rounded-full shadow-2xl hover:scale-110 transition-all duration-300 z-50 group animate-bounce-slow">
      <i class="fas fa-comment-dots text-white text-2xl group-hover:scale-110 transition-transform duration-300"></i>
    </button>
  `;

  /**
   * Helper function to select a DOM element by its ID.
   * @param {string} id - The ID of the element to select.
   * @returns {HTMLElement | null} The selected element or null if not found.
   */
  const getById = (id) => document.getElementById(id);

  /**
   * Helper function to select all DOM elements matching a CSS selector.
   * @param {string} selector - The CSS selector.
   * @returns {NodeListOf<HTMLElement>} A NodeList of matching elements.
   */
  const queryAll = (selector) => document.querySelectorAll(selector);

  // === DOM Element References (initialized after injection) ===
  let fab,
    feedbackModal,
    closeChat,
    chatForm,
    chatBox,
    chatInput,
    openMessage,
    welcomeBox,
    statusBox,
    sendButton,
    sendText,
    sendSpinner,
    sendCheck,
    messagesArea,
    msgSendBtn,
    currentDateSpan,
    tabButtons,
    tabPanels;

  /**
   * Caches references to all necessary DOM elements.
   * This should be called after the modal HTML has been injected.
   */
  const cacheDOMElements = () => {
    fab = getById("fab");
    feedbackModal = getById("feedbackModal");
    closeChat = getById("closeChat");
    chatForm = getById("chatForm");
    chatBox = getById("chatBox");
    chatInput = getById("chatInput");
    openMessage = getById("openMessage");
    welcomeBox = getById("welcomeBox");
    statusBox = getById("statusBox");
    sendButton = getById("sendButton");
    sendText = getById("sendText");
    sendSpinner = getById("sendSpinner");
    sendCheck = getById("sendCheck");
    messagesArea = getById("messagesArea");
    msgSendBtn = getById("msgSendBtn");
    currentDateSpan = getById("currentDate");
    tabButtons = queryAll(".tab-button");
    tabPanels = queryAll(".tab-panel");
  };

  /**
   * Appends a message to the chatbox in the Home tab.
   * @param {string} sender - 'client' or 'agent'.
   * @param {string} text - The message text.
   * @param {Date} date - The timestamp of the message.
   */
  const appendMessage = (sender, text, date) => {
    if (!chatBox) return; // Ensure chatBox exists
    const msgDiv = document.createElement("div");
    msgDiv.className = sender === "client" ? "text-right" : "text-left";
    msgDiv.innerHTML = `
      <span class="inline-block px-3 py-2 rounded-lg ${
        sender === "client"
          ? "bg-accent-500 text-white"
          : "bg-gray-700 text-gray-200"
      } mb-1">
        ${text}
      </span><br>
      <span class="text-xs text-gray-400">
        ${
          date
            ? new Date(date).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : ""
        }
      </span>
    `;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight; // Scroll to bottom
  };

  /**
   * Placeholder for loading current ticket replies.
   * In a real application, this would fetch data from a backend.
   * @param {string} ticketId - The ID of the ticket to load.
   */
  const loadCurrentTicket = async (ticketId) => {
    console.log(`Loading replies for ticket: ${ticketId}`);
    // Simulate API call, e.g., await fetch(`/api/tickets/${ticketId}/replies`);
  };

  // === Event Handlers ===

  /** Handles opening the chat modal. */
  const handleFabClick = () => {
    fab.classList.add("hidden");
    feedbackModal.classList.remove("hidden", "opacity-0", "scale-90");

    // Add animation classes for smooth transition
    feedbackModal.classList.add("animate-slide-in");
    setTimeout(() => feedbackModal.classList.remove("animate-slide-in"), 500); // Adjust duration to match CSS animation

    // Animate status block like a message (optional)
    statusBox?.classList.add("opacity-0", "translate-y-2");
    setTimeout(
      () => statusBox?.classList.remove("opacity-0", "translate-y-2"),
      300
    );
  };

  /** Handles closing the chat modal. */
  const handleCloseChatClick = () => {
    feedbackModal.classList.add("scale-90", "opacity-0");
    setTimeout(() => {
      feedbackModal.classList.add("hidden");
      fab.classList.remove("hidden");
    }, 300); // Match CSS transition duration
  };

  /** Handles clicking the "Send us a message" button in the Home tab. */
  const handleOpenMessageClick = () => {
    chatForm.classList.remove("hidden");
    openMessage?.parentElement.classList.add("hidden");
    welcomeBox?.classList.add("hidden");
    statusBox?.classList.add("hidden");
    chatInput.focus();
  };

  /** Handles input in the chat textarea to auto-resize it. */
  const handleChatInputAutoResize = () => {
    chatInput.style.height = "auto"; // Reset height to recalculate
    chatInput.style.height = chatInput.scrollHeight + "px"; // Set to scroll height
  };

  /** Handles submission of the chat form (sending feedback as a ticket). */
  const handleChatFormSubmit = async (e) => {
    e.preventDefault();
    const msg = chatInput.value.trim();
    if (!msg) return;

    // Show loading state
    sendButton.disabled = true;
    sendText.classList.add("hidden");
    sendSpinner.classList.remove("hidden");

    try {
      // Simulate API call to send feedback
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Ensure cookies/auth are sent
        body: JSON.stringify({ message: msg }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to send feedback");
      }
      const ticket = await res.json();

      // Show user message in chat
      appendMessage("client", msg, new Date(ticket.createdAt));
      chatInput.value = ""; // Clear input after sending

      // Show success animation
      sendSpinner.classList.add("hidden");
      sendCheck.classList.remove("hidden");
      setTimeout(() => {
        sendCheck.classList.add("hidden");
        sendText.classList.remove("hidden");
        sendButton.disabled = false;
      }, 1000); // Show checkmark for 1 second

      // Optionally fetch ticket replies after submit
      // await loadCurrentTicket(ticket._id); // Uncomment if needed
    } catch (err) {
      console.error("Feedback submission error:", err);
      // Revert button state on error
      sendSpinner.classList.add("hidden");
      sendText.classList.remove("hidden");
      sendButton.disabled = false;
      // Display a toast notification if available
      if (window.showToast)
        window.showToast("Feedback Error", err.message, "error");
    }
  };

  /** Handles tab navigation clicks. */
  const handleTabButtonClick = (event) => {
    const button = event.currentTarget;
    const selectedTab = button.dataset.tab;

    // Hide all tab panels and deactivate all tab buttons
    tabPanels.forEach((panel) => panel.classList.add("hidden"));
    tabButtons.forEach((btn) => btn.classList.remove("text-white")); // Assuming 'text-white' indicates active

    // Show the selected tab panel and activate the clicked button
    const selectedPanel = getById(`tab-${selectedTab}`);
    if (selectedPanel) {
      selectedPanel.classList.remove("hidden");
      button.classList.add("text-white");
    }

    // Restore Home tab defaults when switching back to Home
    if (selectedTab === "Home") {
      welcomeBox?.classList.remove("hidden");
      statusBox?.classList.remove("hidden");
      openMessage?.parentElement.classList.remove("hidden");
      chatForm?.classList.add("hidden");
      // Optionally clear chatBox when returning to Home, if it represents a new conversation session
      // chatBox.innerHTML = '';
    }
  };

  /** Handles sending a message in the "Messages" tab (demo functionality). */
  const handleMessagesTabSend = () => {
    if (!messagesArea || !msgSendBtn) return;
    const input = msgSendBtn.previousElementSibling; // Assuming input is sibling
    const message = input.value.trim();

    if (message) {
      const messageElement = document.createElement("div");
      messageElement.classList.add(
        "bg-gray-700",
        "rounded-lg",
        "p-2",
        "text-sm",
        "ml-auto",
        "max-w-[75%]"
      ); // Added ml-auto and max-w for client-like styling
      messageElement.textContent = message;
      messagesArea.appendChild(messageElement);
      input.value = ""; // Clear input
      messagesArea.scrollTop = messagesArea.scrollHeight; // Scroll to bottom
    }
  };

  // === Initialization Flow ===

  /** Sets the current date in the status box. */
  const setCurrentDate = () => {
    if (currentDateSpan) {
      currentDateSpan.textContent = new Date().toLocaleDateString();
    }
  };

  /**
   * Attaches all event listeners to their respective DOM elements.
   * This should be called after DOM elements are cached.
   */
  const attachEventListeners = () => {
    fab?.addEventListener("click", handleFabClick);
    closeChat?.addEventListener("click", handleCloseChatClick);
    openMessage?.addEventListener("click", handleOpenMessageClick);
    chatInput?.addEventListener("input", handleChatInputAutoResize);
    chatForm?.addEventListener("submit", handleChatFormSubmit);
    msgSendBtn?.addEventListener("click", handleMessagesTabSend);

    tabButtons.forEach((button) => {
      button.addEventListener("click", handleTabButtonClick);
    });
  };

  /**
   * Injects the chat modal HTML into the document body if it doesn't already exist.
   */
  const injectChatModal = () => {
    if (!getById("feedbackModal")) {
      // Create a temporary div to parse the HTML string
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = MODAL_HTML;
      // Append children to body
      while (tempDiv.firstChild) {
        document.body.appendChild(tempDiv.firstChild);
      }
    }
  };

  /**
   * The main initialization function for the chat system.
   * This runs once the DOM is ready.
   */
  const initializeChatSystem = () => {
    // 1. Ensure modal HTML is in the DOM
    injectChatModal();

    // 2. Cache all DOM element references
    cacheDOMElements();

    // 3. Set dynamic content like the current date
    setCurrentDate();

    // 4. Attach all event listeners
    attachEventListeners();

    // Optional: Set default active tab (e.g., Home)
    const defaultTabButton = getById("tabHome");
    if (defaultTabButton) {
      defaultTabButton.classList.add("text-white"); // Visually mark as active
      // No need to trigger click, as the default state is usually Home tab visible.
      // If you want to ensure the tab logic runs, you could uncomment:
      // defaultTabButton.click();
    }
  };

  // Use DOMContentLoaded to ensure the script runs after the HTML is fully parsed.
  // This is the most reliable way to interact with the DOM.
  document.addEventListener("DOMContentLoaded", initializeChatSystem);
})();

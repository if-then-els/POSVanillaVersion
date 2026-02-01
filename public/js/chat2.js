document.addEventListener("DOMContentLoaded", function () {
  // --- 1. Inject Styles for Animation & Custom Scrollbar ---
  const style = document.createElement("style");
  style.textContent = `
    .chat-scroll::-webkit-scrollbar { width: 4px; }
    .chat-scroll::-webkit-scrollbar-track { background: transparent; }
    .chat-scroll::-webkit-scrollbar-thumb { background: rgba(156, 163, 175, 0.5); border-radius: 2px; }
    .chat-scroll::-webkit-scrollbar-thumb:hover { background: rgba(156, 163, 175, 0.8); }
    @keyframes slideInUp {
      from { opacity: 0; transform: translateY(20px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .animate-slide-in-up { animation: slideInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
  `;
  document.head.appendChild(style);

  // --- 2. Create Floating Action Button (FAB) ---
  const floatingIcon = document.createElement("div");
  floatingIcon.id = "floating-chat-icon";
  // Using Tailwind classes matching the dashboard theme
  floatingIcon.className = `
    fixed bottom-6 right-6 w-14 h-14 
    bg-gradient-to-r from-accent-500 to-accent-600 
    text-white rounded-full shadow-lg shadow-accent-500/30 
    flex justify-center items-center cursor-pointer 
    z-[1001] transition-transform duration-300 hover:scale-110 
    hover:shadow-accent-500/50 group
  `;
  floatingIcon.innerHTML = `<i class="fas fa-comment-dots text-2xl group-hover:animate-pulse"></i>`;
  document.body.appendChild(floatingIcon);

  // --- 3. Create Chat Container (Hidden by default) ---
  const chatContainer = document.createElement("div");
  chatContainer.id = "chat-container";
  // Matches "glass-premium" aesthetic
  chatContainer.className = `
    fixed bottom-24 right-6 w-80 sm:w-96 h-[500px] 
    glass-premium rounded-2xl shadow-2xl flex flex-col 
    z-[1000] hidden origin-bottom-right transition-all duration-300
    border border-white/20 dark:border-white/10 overflow-hidden
  `;

  // HTML Structure for the Chat Widget
  chatContainer.innerHTML = `
    <!-- Header -->
    <div class="bg-gradient-to-r from-accent-500 to-accent-600 p-4 flex justify-between items-center text-white shadow-md">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
          <i class="fas fa-robot text-sm"></i>
        </div>
        <div>
          <h3 class="font-bold text-sm leading-tight">Support Chat</h3>
          <p class="text-[10px] text-white/80 flex items-center gap-1">
            <span class="w-1.5 h-1.5 bg-green-400 rounded-full"></span> Online
          </p>
        </div>
      </div>
      <button id="close-btn" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <!-- Messages Area -->
    <div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-3 bg-white/50 dark:bg-primary-900/50 backdrop-blur-sm chat-scroll">
      <!-- Messages injected here -->
    </div>

    <!-- Input Area -->
    <div class="p-3 bg-white dark:bg-primary-950 border-t border-primary-100 dark:border-primary-800">
      <div class="flex items-end gap-2 bg-primary-50 dark:bg-primary-900/50 p-2 rounded-xl border border-primary-200 dark:border-primary-700 focus-within:border-accent-500 transition-colors">
        <button id="file-btn" class="p-2 text-primary-400 hover:text-accent-500 transition-colors" title="Attach File">
          <i class="fas fa-paperclip"></i>
        </button>
        <textarea 
          id="message-input" 
          rows="1" 
          placeholder="Type a message..." 
          class="flex-1 bg-transparent border-none focus:ring-0 text-sm text-primary-900 dark:text-white placeholder-primary-400 resize-none py-2 max-h-24 scroll-smooth focus:outline-none"
        ></textarea>
        <input type="file" id="file-input" class="hidden">
        <button id="send-btn" class="p-2 bg-accent-500 hover:bg-accent-600 text-white rounded-lg shadow-md transition-transform active:scale-95">
          <i class="fas fa-paper-plane text-sm"></i>
        </button>
      </div>
      <div class="text-center mt-2">
        <p class="text-[10px] text-primary-400">Powered by SwiftPOS AI</p>
      </div>
    </div>
  `;

  document.body.appendChild(chatContainer);

  // --- 4. Logic & Event Listeners (Preserved & Enhanced) ---

  const closeBtn = document.getElementById("close-btn");
  const fileBtn = document.getElementById("file-btn");
  const fileInput = document.getElementById("file-input");
  const sendBtn = document.getElementById("send-btn");
  const messageInput = document.getElementById("message-input");
  const chatMessages = document.getElementById("chat-messages");

  // Welcome Message
  addMessage("support", "Hello! 👋 How can we help you today?");

  // Toggle Visibility
  floatingIcon.addEventListener("click", () => {
    const isHidden = chatContainer.classList.contains("hidden");
    if (isHidden) {
      chatContainer.classList.remove("hidden");
      chatContainer.classList.add("animate-slide-in-up");
      messageInput.focus();
    } else {
      chatContainer.classList.add("hidden");
      chatContainer.classList.remove("animate-slide-in-up");
    }
  });

  closeBtn.addEventListener("click", () => {
    chatContainer.classList.add("hidden");
  });

  // File Handling
  fileBtn.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        addFileMessage(file);
        // Simulate response
        setTimeout(() => {
          addMessage("support", `Received file: ${file.name} 📂`);
        }, 1500);
      }
      fileInput.value = "";
    }
  });

  // Sending Messages
  function handleSend() {
    const message = messageInput.value.trim();
    if (message) {
      addMessage("user", message);
      messageInput.value = "";
      messageInput.style.height = "auto"; // Reset height

      // Simulate Support Response
      setTimeout(
        () => {
          const responses = [
            "Thanks for reaching out! 🚀 A team member will be with you shortly.",
            "We've received your message. One moment please...",
            "Could you provide more details about that?",
          ];
          addMessage(
            "support",
            responses[Math.floor(Math.random() * responses.length)],
          );
        },
        1000 + Math.random() * 2000,
      );

      // Backend Call (Preserved)
      fetch("/sendMessage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      })
        .then((response) => response.json())
        .then((data) => console.log("Message sent:", data))
        .catch((error) => console.error("Error sending message:", error));
    }
  }

  sendBtn.addEventListener("click", handleSend);

  messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Auto-resize textarea
  messageInput.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = this.scrollHeight + "px";
  });

  // Fetch Messages (Preserved)
  function fetchChatMessages() {
    fetch("/getMessages", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })
      .then((response) => response.json())
      .then((data) => {
        chatMessages.innerHTML = "";
        data.forEach((msg) => {
          const sender = msg.userId ? "user" : "support";
          addMessage(sender, msg.message);
        });
        scrollToBottom();
      })
      .catch((error) => console.error("Error fetching messages:", error));
  }
  // fetchChatMessages(); // Uncomment if backend is live

  // Helper: Add Message Bubble
  function addMessage(sender, text) {
    const messageWrapper = document.createElement("div");
    messageWrapper.className = `flex w-full animate-fade-in ${sender === "user" ? "justify-end" : "justify-start"}`;

    const bubble = document.createElement("div");
    // Dynamic styles based on sender
    const userStyles = "bg-accent-500 text-white rounded-br-none";
    const supportStyles =
      "bg-white dark:bg-primary-800 border border-primary-200 dark:border-primary-700 text-primary-800 dark:text-gray-200 rounded-bl-none shadow-sm";

    // Check for Admin (Preserved Logic)
    let finalStyles = sender === "user" ? userStyles : supportStyles;
    let content = text;

    if (typeof isAdmin !== "undefined" && isAdmin && sender !== "user") {
      finalStyles = "bg-indigo-600 text-white rounded-bl-none shadow-md";
      content = `
         <div class="font-bold text-xs mb-1 opacity-75">Admin</div>
         <p>${text}</p>
         <div class="text-[10px] mt-1 opacity-70 text-right">${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
       `;
    }

    bubble.className = `max-w-[80%] px-4 py-2.5 rounded-2xl text-sm break-words ${finalStyles}`;

    // Standard content if not admin block
    if (!(typeof isAdmin !== "undefined" && isAdmin && sender !== "user")) {
      bubble.textContent = text;
    } else {
      bubble.innerHTML = content;
    }

    messageWrapper.appendChild(bubble);
    chatMessages.appendChild(messageWrapper);
    scrollToBottom();
  }

  // Helper: Add File Message
  function addFileMessage(file) {
    const messageWrapper = document.createElement("div");
    messageWrapper.className = "flex w-full justify-end animate-fade-in";

    const bubble = document.createElement("div");
    bubble.className =
      "max-w-[80%] bg-accent-500 text-white rounded-2xl rounded-br-none p-3 cursor-pointer hover:bg-accent-600 transition-colors shadow-md flex items-center gap-3";

    bubble.innerHTML = `
      <div class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-white">
        <i class="fas fa-file"></i>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-bold truncate">${file.name}</p>
        <p class="text-xs opacity-75">${formatFileSize(file.size)}</p>
      </div>
    `;

    bubble.addEventListener("click", () => {
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    });

    messageWrapper.appendChild(bubble);
    chatMessages.appendChild(messageWrapper);
    scrollToBottom();
  }

  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else return (bytes / 1048576).toFixed(1) + " MB";
  }
});

(function () {
  // Inject Tailwind CSS configuration and Font Awesome stylesheet
  const head = document.head || document.getElementsByTagName("head")[0];

  // Font Awesome stylesheet
  const fontAwesomeLink = document.createElement("link");
  fontAwesomeLink.rel = "stylesheet";
  fontAwesomeLink.href =
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
  head.appendChild(fontAwesomeLink);

  // Tailwind CSS script
  const tailwindScript = document.createElement("script");
  tailwindScript.src = "https://cdn.tailwindcss.com";
  head.appendChild(tailwindScript);

  // Custom styles for animations and font
  const style = document.createElement("style");
  style.innerHTML = `
    @import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap");
    body {
      font-family: "Inter", sans-serif;
    }
    .chat-container {
      background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5z' fill='%23a0a0a033' fill-opacity='0.15' fill-rule='evenodd'/%3E%3C/svg%3E");
    }
    .pulse {
      animation: pulse 6s infinite;
    }
    @keyframes pulse {
      0% {
        box-shadow: 0 0 0 0 rgba(18, 140, 126, 0.7);
      }
      70% {
        box-shadow: 0 0 0 15px rgba(18, 140, 126, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(18, 140, 126, 0);
      }
    }
    .slide-in {
      animation: slideIn 0.3s ease-out forwards;
    }
    .slide-out {
      animation: slideOut 0.3s ease-in forwards;
    }
    @keyframes slideIn {
      from {
        transform: translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateY(0);
        opacity: 1;
      }
      to {
        transform: translateY(20px);
        opacity: 0;
      }
    }
    .message-animation {
      animation: messageAppear 0.3s ease-out;
    }
    @keyframes messageAppear {
      from {
        transform: translateY(10px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
    .emoji-picker {
      position: absolute;
      bottom: 60px;
      right: 0;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      padding: 10px;
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 5px;
      max-height: 200px;
      overflow-y: auto;
      z-index: 100;
    }
    .emoji-picker span {
      cursor: pointer;
      font-size: 20px;
      padding: 5px;
      border-radius: 4px;
      transition: background-color 0.2s;
    }
    .emoji-picker span:hover {
      background-color: #f0f0f0;
    }
  `;
  head.appendChild(style);

  document.addEventListener("DOMContentLoaded", function () {
    // Create the floating button HTML
    const chatButtonHTML = `
      <button
        id="chatButton"
        class="fixed bottom-8 right-8 w-16 h-16 rounded-full bg-whatsapp-green text-white flex items-center justify-center shadow-lg z-50 pulse hover:scale-110 transition-all duration-300"
      >
        <i class="fas fa-comment-alt text-2xl"></i>
      </button>
    `;

    // Create the chat modal HTML
    const chatModalHTML = `
      <div
        id="chatModal"
        class="fixed bottom-28 right-8 w-full max-w-md h-[500px] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden z-50 hidden"
      >
        <!-- Chat Header -->
        <div
          class="bg-whatsapp-green text-white p-4 flex items-center justify-between"
        >
          <div class="flex items-center">
            <div
              class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mr-3"
            >
              <i class="fas fa-headset"></i>
            </div>
            <div>
              <h3 class="font-bold">Team Support</h3>
              <p class="text-xs opacity-80">Typically replies in minutes</p>
            </div>
          </div>
          <div class="flex space-x-2">
            <button
              id="minimizeChat"
              class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20"
            >
              <i class="fas fa-minus"></i>
            </button>
            <button
              id="closeChat"
              class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20"
            >
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>

        <!-- Chat Messages -->
        <div
          id="chatMessages"
          class="flex-1 overflow-y-auto p-4 bg-gray-100 chat-container"
        >
          <!-- Initial message -->
          <div class="flex mb-4">
            <div
              class="w-8 h-8 rounded-full bg-whatsapp-green flex items-center justify-center text-white mr-2 flex-shrink-0"
            >
              <i class="fas fa-headset text-sm"></i>
            </div>
            <div class="bg-white p-3 rounded-xl max-w-[80%] message-animation">
              <p class="text-gray-700">
                Hi there! 👋 I'm here to help. What can I assist you with today?
                You can report bugs, request features, or ask any questions about
                our product.
              </p>
              <span class="text-xs text-gray-500 block mt-1">Just now</span>
            </div>
          </div>
        </div>

        <!-- Message Input -->
        <div class="p-3 bg-gray-200 flex items-center relative">
          <div class="flex-1 bg-white rounded-full flex items-center px-3 text-gray-600">
            <input type="file" id="fileInput" class="hidden" />
            <input
              id="messageInput"
              type="text"
              placeholder="Type a message..."
              class="flex-1 py-3 px-2 bg-transparent focus:outline-none"
            />
            <button
              id="emojiButton"
              class="text-gray-500 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100"
            >
              <i class="far fa-smile"></i>
            </button>
            <button
              id="paperclipButton"
              class="text-gray-500 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100"
            >
              <i class="fas fa-paperclip"></i>
            </button>
            <button
            id="sendButton"
            type="submit"
            class="ml-2 w-12 h-12 rounded-full bg-whatsapp-green flex items-center justify-center text-white hover:bg-whatsapp-dark transition-colors"
          >
            <i class="fas fa-paper-plane"></i>
          </button>
          </div>
          

          <!-- Emoji Picker -->
          <div id="emojiPicker" class="emoji-picker hidden"></div>
        </div>
      </div>

      <div id="overlay" class="fixed inset-0 bg-black/30 z-40 hidden"></div>
    `;

    // Append the button and modal to the body
    document.body.insertAdjacentHTML("beforeend", chatButtonHTML);
    document.body.insertAdjacentHTML("beforeend", chatModalHTML);

    const chatButton = document.getElementById("chatButton");
    const chatModal = document.getElementById("chatModal");
    const closeChat = document.getElementById("closeChat");
    const minimizeChat = document.getElementById("minimizeChat");
    const overlay = document.getElementById("overlay");
    const messageInput = document.getElementById("messageInput");
    const sendButton = document.getElementById("sendButton");
    const chatMessages = document.getElementById("chatMessages");
    const fileInput = document.getElementById("fileInput");
    const emojiButton = document.getElementById("emojiButton");
    const emojiPicker = document.getElementById("emojiPicker");
    const paperclipButton = document.getElementById("paperclipButton");
    attachEventListeners();

    // Toggle chat modal
    chatButton.addEventListener("click", function () {
      chatModal.classList.remove("hidden");
      chatModal.classList.add("slide-in");
      overlay.classList.remove("hidden");
      emojiPicker.classList.add("hidden"); // Hide emoji picker when opening chat
      setTimeout(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }, 100);
    });

    // Close chat modal
    function closeChatModal() {
      chatModal.classList.add("slide-out");
      setTimeout(() => {
        chatModal.classList.add("hidden");
        chatModal.classList.remove("slide-out");
        overlay.classList.add("hidden");
        emojiPicker.classList.add("hidden");
      }, 300);
    }

    closeChat.addEventListener("click", closeChatModal);
    overlay.addEventListener("click", closeChatModal);

    // Minimize chat modal
    minimizeChat.addEventListener("click", function () {
      closeChatModal();
    });

    // Handle file attachment
    paperclipButton.addEventListener("click", function (e) {
      e.stopPropagation(); // Prevent event bubbling
      fileInput.click();
    });

    fileInput.addEventListener("change", function () {
      if (fileInput.files.length > 0) {
        const fileName = fileInput.files[0].name;
        const userMessage = document.createElement("div");
        userMessage.className = "flex justify-end mb-4";
        userMessage.innerHTML = `
          <div class="bg-whatsapp-light p-3 rounded-xl max-w-[80%] message-animation">
            <p class="text-gray-700">Attached file: <strong>${fileName}</strong></p>
            <span class="text-xs text-gray-500 block mt-1 text-right">Just now</span>
          </div>
          <div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white ml-2 flex-shrink-0">
            <i class="fas fa-user text-sm"></i>
          </div>
        `;
        chatMessages.appendChild(userMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        console.log("File attached:", fileName);
        // In a real app, you would now handle the file upload
      }
    });

    // Populate and toggle emoji picker
    const emojis = [
      "😀",
      "😃",
      "😄",
      "😁",
      "😆",
      "😅",
      "😂",
      "🤣",
      "😊",
      "😇",
      "🙂",
      "🙃",
      "😉",
      "😌",
      "😍",
      "🥰",
      "😘",
      "😗",
      "😙",
      "😚",
      "😋",
      "😛",
      "😜",
      "🤪",
      "😝",
      "🤗",
      "🤭",
      "🤫",
      "🤔",
      "🤐",
      "🤨",
      "😐",
      "😑",
      "😶",
      "😏",
      "😒",
      "🙄",
      "😬",
      "🤥",
      "😌",
      "😔",
      "😪",
      "🤤",
      "😴",
      "😷",
      "🤒",
      "🤕",
      "🤢",
      "🤮",
      "🤧",
      "🥵",
      "🥶",
      "🥴",
      "😵",
      "🤯",
      "🤠",
      "🥳",
      "😎",
      "🤓",
      "🧐",
      "😕",
      "😟",
      "🙁",
      "☹️",
      "😮",
      "😯",
      "😲",
      "😳",
      "🥺",
      "😢",
      "😭",
      "😤",
      "😠",
      "😡",
      "🤬",
      "😈",
      "👿",
      "💀",
      "💩",
      "🤡",
      "👹",
      "👺",
      "👻",
      "👽",
      "👾",
      "🤖",
      "😺",
      "😸",
      "😹",
      "😻",
      "😼",
      "😽",
      "😿",
      "😾",
      "👋",
      "🤚",
      "🖐️",
      "✋",
      "🖖",
      "👌",
      "🤏",
      "✌️",
      "🤞",
      "🤟",
      "🤘",
      "🤙",
      "👈",
      "👉",
      "👆",
      "🖕",
      "👇",
      "☝️",
      "👍",
      "👎",
      "👏",
      "🙌",
      "👐",
      "🤲",
      "🤝",
      "🙏",
      "✍️",
      "💅",
      "🤳",
      "💪",
      "🦾",
      "🦵",
      "🦶",
      "👂",
      "👃",
      "🧠",
      "🫀",
      "🫁",
      "🦷",
      "🦴",
      "👀",
      "👁️",
      "👅",
      "👄",
      "👶",
      "👧",
      "👦",
      "🧒",
      "👨",
      "👩",
      "🧑",
      "👱‍♀️",
      "👱",
      "🧔",
      "👴",
      "👵",
      "🧓",
      "🙍‍♀️",
      "🙍‍♂️",
      "🙎‍♀️",
      "🙎‍♂️",
      "🙅‍♀️",
      "🙅‍♂️",
      "🙆‍♀️",
      "🙆‍♂️",
      "💁‍♀️",
      "💁‍♂️",
      "🙋‍♀️",
      "🙋‍♂️",
      "🧏‍♀️",
      "🧏‍♂️",
      "🙇‍♀️",
      "🙇‍♂️",
      "🤦‍♀️",
      "🤦‍♂️",
      "🤷‍♀️",
      "🤷‍♂️",
      "🧑‍⚕️",
      "🧑‍🎓",
      "🧑‍🏫",
      "🧑‍⚖️",
      "🧑‍🌾",
      "🧑‍🍳",
      "🧑‍🔧",
      "🧑‍🏭",
      "🧑‍💼",
      "🧑‍🔬",
      "🧑‍💻",
      "🧑‍🎤",
      "🧑‍🎨",
      "🧑‍✈️",
      "🧑‍🚀",
      "🧑‍🚒",
      "👮‍♀️",
      "👮‍♂️",
      "🕵️‍♀️",
      "🕵️‍♂️",
      "💂‍♀️",
      "💂‍♂️",
      "🥷",
      "👷‍♀️",
      "👷‍♂️",
      "🤴",
      "👸",
      "👳‍♀️",
      "👳‍♂️",
      "👲",
      "🧕",
      "🤵‍♀️",
      "🤵‍♂️",
      "👰‍♀️",
      "👰‍♂️",
      "🤰",
      "🤱",
      "👩‍🍼",
      "👨‍🍼",
      "👼",
      "🎅",
      "🤶",
      "🧑‍🎄",
      "🦸‍♀️",
      "🦸‍♂️",
      "🦹‍♀️",
      "🦹‍♂️",
      "🧙‍♀️",
      "🧙‍♂️",
      "🧚‍♀️",
      "🧚‍♂️",
      "🧛‍♀️",
      "🧛‍♂️",
      "🧜‍♀️",
      "🧜‍♂️",
      "🧝‍♀️",
      "🧝‍♂️",
      "🧞‍♀️",
      "🧞‍♂️",
      "🧟‍♀️",
      "🧟‍♂️",
      "🧌",
      "💆‍♀️",
      "💆‍♂️",
      "💇‍♀️",
      "💇‍♂️",
      "🚶‍♀️",
      "🚶‍♂️",
      "🧍‍♀️",
      "🧍‍♂️",
      "🧎‍♀️",
      "🧎‍♂️",
      "🧑‍🦯",
      "🧑‍🦼",
      "🧑‍🦽",
      "🏃‍♀️",
      "🏃‍♂️",
      "💃",
      "🕺",
      "👯‍♀️",
      "👯‍♂️",
      "🧖‍♀️",
      "🧖‍♂️",
      "🧗‍♀️",
      "🧗‍♂️",
      "🤺",
      "🏇",
      "⛷️",
      "🏂",
      "🏌️‍♀️",
      "🏌️‍♂️",
      "🏄‍♀️",
      "🏄‍♂️",
      "🚣‍♀️",
      "🚣‍♂️",
      "🏊‍♀️",
      "🏊‍♂️",
      "⛹️‍♀️",
      "⛹️‍♂️",
      "🏋️‍♀️",
      "🏋️‍♂️",
      "🚴‍♀️",
      "🚴‍♂️",
      "🚵‍♀️",
      "🚵‍♂️",
      "🤸‍♀️",
      "🤸‍♂️",
      "🤽‍♀️",
      "🤽‍♂️",
      "🤾‍♀️",
      "🤾‍♂️",
      "🤹‍♀️",
      "🤹‍♂️",
      "🧘‍♀️",
      "🧘‍♂️",
      "🛀",
      "🛌",
      "🧑‍🤝‍🧑",
      "👭",
      "👫",
      "👬",
      "💏",
      "💑",
      "👪",
      "👨‍👩‍👧",
      "👨‍👩‍👧‍👦",
      "👨‍👩‍👦‍👦",
      "👨‍👩‍👧‍👧",
      "👨‍👦",
      "👨‍👦‍👦",
      "👨‍👧",
      "👨‍👧‍👦",
      "👨‍👧‍👧",
      "👩‍👦",
      "👩‍👦‍👦",
      "👩‍👧",
      "👩‍👧‍👦",
      "👩‍👧‍👧",
      "🗣️",
      "👤",
      "👥",
      "🫂",
      "👣",
      "🦰",
      "🦱",
      "🦳",
      "🦲",
    ];

    emojis.forEach((emoji) => {
      const span = document.createElement("span");
      span.textContent = emoji;
      span.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent event from bubbling
        messageInput.value += emoji;
        messageInput.focus();
      });
      emojiPicker.appendChild(span);
    });

    // Toggle emoji picker
    emojiButton.addEventListener("click", function (event) {
      event.stopPropagation();
      emojiPicker.classList.toggle("hidden");

      // Scroll to bottom of picker when shown
      if (!emojiPicker.classList.contains("hidden")) {
        setTimeout(() => {
          emojiPicker.scrollTop = emojiPicker.scrollHeight;
        }, 10);
      }
    });

    // Close picker when clicking outside
    document.addEventListener("click", function (event) {
      if (
        !emojiPicker.contains(event.target) &&
        event.target !== emojiButton &&
        !emojiButton.contains(event.target)
      ) {
        emojiPicker.classList.add("hidden");
      }
    });

    // Send message function
    function sendMessage() {
      const message = messageInput.value.trim();
      console.log("Attempting to send message:", message); // Debugging

      if (message) {
        // Create user message element
        const userMessage = document.createElement("div");
        userMessage.className = "flex justify-end mb-4";
        userMessage.innerHTML = `
      <div class="bg-whatsapp-light p-3 rounded-xl max-w-[80%] message-animation">
        <p class="text-gray-700">${message}</p>
        <span class="text-xs text-gray-500 block mt-1 text-right">Just now</span>
      </div>
      <div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white ml-2 flex-shrink-0">
        <i class="fas fa-user text-sm"></i>
      </div>
    `;
        chatMessages.appendChild(userMessage);

        // Clear input
        messageInput.value = "";
        console.log("Message sent successfully"); // Debugging

        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Simulate bot reply after a delay
        setTimeout(() => {
          const replyMessage = document.createElement("div");
          replyMessage.className = "flex mb-4";
          replyMessage.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-whatsapp-green flex items-center justify-center text-white mr-2 flex-shrink-0">
          <i class="fas fa-headset text-sm"></i>
        </div>
        <div class="bg-white p-3 rounded-xl max-w-[80%] message-animation">
          <p class="text-gray-700">Thanks for your message! We've received your feedback. Our team will review it and get back to you if needed.</p>
          <span class="text-xs text-gray-500 block mt-1">Just now</span>
        </div>
      `;
          chatMessages.appendChild(replyMessage);
          chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 1500);
      } else {
        console.log("Message was empty, not sent"); // Debugging
      }
    }

    // Attach event listeners for sending messages
    // Fixed event listener attachment
    function attachEventListeners() {
      sendButton.addEventListener("click", sendMessage);
      console.log("Send button event listener attached"); // Debugging

      messageInput.addEventListener("keypress", function (e) {
        if (e.key === "Enter") {
          sendMessage();
        }
      });
    }

    // Call this after elements are created
    // attachEventListeners();

    messageInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        sendMessage();
      }
    });

    // Close modal when pressing Esc key
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !chatModal.classList.contains("hidden")) {
        closeChatModal();
      }
    });
  });
})();

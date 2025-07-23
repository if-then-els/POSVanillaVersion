// === DOM Elements ===
const fab = document.getElementById("fab");
const feedbackModal = document.getElementById("feedbackModal");
const closeChat = document.getElementById("closeChat");
const chatForm = document.getElementById("chatForm");
const chatBox = document.getElementById("chatBox");
const chatInput = document.getElementById("chatInput");
const openMessage = document.getElementById("openMessage");

// Elements inside Send button
const sendButton = document.getElementById("sendButton");
const sendText = document.getElementById("sendText");
const sendSpinner = document.getElementById("sendSpinner");
const sendCheck = document.getElementById("sendCheck");


// === Tab Navigation ===
document.querySelectorAll(".tab-button").forEach(button => {
  button.addEventListener("click", () => {
    const selectedTab = button.dataset.tab;

    // Hide all panels
    document.querySelectorAll(".tab-panel").forEach(panel => {
      panel.classList.add("hidden");
    });

    // Show selected tab panel
    const selectedPanel = document.getElementById(`tab-${selectedTab}`);
    if (selectedPanel) selectedPanel.classList.remove("hidden");
  });
});




// === Set Today's Date in Status Section ===
document.getElementById("currentDate").textContent = new Date().toLocaleDateString();

// === Modal Open/Close ===
fab?.addEventListener("click", () => {
  feedbackModal.classList.toggle("hidden");
});

closeChat?.addEventListener("click", () => {
  feedbackModal.classList.add("hidden");
});

// === Show Chat Input on "Send us a message" Click ===
openMessage?.addEventListener("click", () => {
  // Show chat input
  chatForm.classList.remove("hidden");

  // Hide the "Send us a message" button
  openMessage.parentElement.classList.add("hidden");

  // Hide greeting and status containers
  document.querySelectorAll("#tab-Home > .bg-gray-800").forEach(container => {
    container.classList.add("hidden");
  });

  // Focus textarea
  chatInput.focus();
});

// === Auto-resize Textarea ===
chatInput?.addEventListener("input", () => {
  chatInput.style.height = "auto";
  chatInput.style.height = chatInput.scrollHeight + "px";
});

// === Submit Chat Form ===
chatForm?.addEventListener("submit", (e) => {
  e.preventDefault();

  const msg = chatInput.value.trim();
  if (!msg) return;

  // === UI: Disable send, show spinner ===
  sendButton.disabled = true;
  sendText.classList.add("hidden");
  sendSpinner.classList.remove("hidden");

  const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // === Add User Message ===
  const userMsgWrapper = document.createElement("div");
  userMsgWrapper.className = "flex justify-end mb-1";

  const userMsg = document.createElement("div");
  userMsg.className = "bg-blue-600 p-2 rounded-lg max-w-[75%] text-white relative break-words";

  const msgContent = document.createElement("div");
  msgContent.innerText = msg;
  msgContent.style.whiteSpace = "pre-wrap";

  const msgMeta = document.createElement("div");
  msgMeta.className = "text-xs text-white/80 mt-1 flex justify-end items-center gap-1";

  const msgTime = document.createElement("span");
  msgTime.innerText = timeNow;

  const ticks = document.createElement("span");
  ticks.innerHTML = `<i class="fa fa-clock animate-spin"></i>`;

  msgMeta.appendChild(msgTime);
  msgMeta.appendChild(ticks);
  userMsg.appendChild(msgContent);
  userMsg.appendChild(msgMeta);
  userMsgWrapper.appendChild(userMsg);
  chatBox.appendChild(userMsgWrapper);
  chatBox.scrollTop = chatBox.scrollHeight;

  // === Clear Input ===
  chatInput.value = "";
  chatInput.style.height = "auto";

  // === Simulate Sending ===
  setTimeout(() => {
    sendSpinner.classList.add("hidden");
    sendCheck.classList.remove("hidden");
    ticks.innerHTML = `<i class="fa fa-check-double text-white"></i>`;

    // Simulate Admin Reply
    setTimeout(() => {
      const adminTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const replyWrapper = document.createElement("div");
      replyWrapper.className = "flex justify-start mb-1";

      const replyMsg = document.createElement("div");
      replyMsg.className = "bg-gray-700 text-white p-2 rounded-lg max-w-[75%] break-words";

      const replyContent = document.createElement("div");
      replyContent.innerText = "Thank you for your feedback! 😊";
      replyContent.style.whiteSpace = "pre-wrap";

      const replyMeta = document.createElement("div");
      replyMeta.className = "text-xs text-white/80 mt-1 text-right";
      replyMeta.innerText = adminTime;

      replyMsg.appendChild(replyContent);
      replyMsg.appendChild(replyMeta);
      replyWrapper.appendChild(replyMsg);
      chatBox.appendChild(replyWrapper);
      chatBox.scrollTop = chatBox.scrollHeight;
    }, 1000);

    // Reset Send Button UI
    setTimeout(() => {
      sendCheck.classList.add("hidden");
      sendText.classList.remove("hidden");
      sendButton.disabled = false;
    }, 1500);
  }, 1000);
});

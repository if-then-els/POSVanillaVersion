document.addEventListener("DOMContentLoaded", function () {
  const floatingIcon = document.createElement("div");
  floatingIcon.id = "floating-chat-icon";
  floatingIcon.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 60px;
    height: 60px;
    background-color: #4361ee;
    color: white;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 24px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    z-index: 1001;
    transition: transform 0.3s ease;
  `;
  floatingIcon.innerHTML = "💬";
  document.body.appendChild(floatingIcon);

  // Create chat container
  const chatContainer = document.createElement("div");
  chatContainer.id = "chat-container";
  chatContainer.style.cssText = `
    position: fixed;
    bottom: 90px; /* Position above the icon */
    right: 20px;
    width: 350px;
    height: 450px;
    background-color: white;
    border: 1px solid #ddd;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    display: none; /* Initially hidden */
    flex-direction: column;
    z-index: 1000;
    font-family: Arial, sans-serif;
    transform: scale(0);
    transform-origin: bottom right;
    transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55);
  `;
  // Create chat header
  const chatHeader = document.createElement("div");
  chatHeader.style.cssText = `
    padding: 15px;
    background-color: #4361ee;
    color: white;
    border-top-left-radius: 10px;
    border-top-right-radius: 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;
  chatHeader.innerHTML = `
    <h3 style="margin: 0;">Support Chat</h3>
    <button id="close-btn" style="background: none; border: none; color: white; font-size: 18px; cursor: pointer;">✕</button>
  `;

  // Create chat messages area
  const chatMessages = document.createElement("div");
  chatMessages.id = "chat-messages";
  chatMessages.style.cssText = `
    flex: 1;
    padding: 15px;
    overflow-y: auto;
    background-color: #f9f9f9;
    display: flex;
    flex-direction: column;
  `;

  // Create message input area
  const inputContainer = document.createElement("div");
  inputContainer.style.cssText = `
    display: flex;
    padding: 10px;
    background-color: #333; /* Dark background */
    border-top: 1px solid #eee;
    border-bottom-left-radius: 10px;
    border-bottom-right-radius: 10px;
    align-items: center;
  `;
  const messageInput = document.createElement("textarea");
  messageInput.id = "message-input";
  messageInput.placeholder = "Type your message...";
  messageInput.style.cssText = `
    flex: 1;
    padding: 10px;
    border: 1px solid #555;
    border-radius: 20px;
    resize: none;
    max-height: 100px;
    outline: none;
    font-family: inherit;
    background-color: #444; /* Slightly lighter dark for textarea */
    color: white; /* White text */
  `;
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.id = "file-input";
  fileInput.style.display = "none";
  const fileButton = document.createElement("button");
  fileButton.innerHTML = "📎";
  fileButton.style.cssText = `
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    margin: 0 5px;
    color: #fff; /* White icon for dark theme */
  `;
  const sendButton = document.createElement("button");
  sendButton.innerHTML = "📤";
  sendButton.style.cssText = `
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    margin-left: 5px;
    color: #fff; /* White icon for dark theme */
  `;

  // Assemble components
  inputContainer.appendChild(fileButton);
  inputContainer.appendChild(messageInput);
  inputContainer.appendChild(sendButton);
  inputContainer.appendChild(fileInput);
  chatContainer.appendChild(chatHeader);
  chatContainer.appendChild(chatMessages);
  chatContainer.appendChild(inputContainer);
  document.body.appendChild(chatContainer);

  // Add welcome message
  addMessage("support", "Hello! How can I help you today?");

  // Event listeners
  floatingIcon.addEventListener("click", () => {
    const isChatVisible = chatContainer.style.display === "flex";
    if (isChatVisible) {
      chatContainer.style.transform = "scale(0)";
      chatContainer.addEventListener(
        "transitionend",
        () => {
          chatContainer.style.display = "none";
        },
        { once: true }
      );
    } else {
      chatContainer.style.display = "flex";
      setTimeout(() => {
        chatContainer.style.transform = "scale(1)";
      }, 10);
    }
  });

  document.getElementById("close-btn").addEventListener("click", () => {
    chatContainer.style.transform = "scale(0)";
    chatContainer.addEventListener(
      "transitionend",
      () => {
        chatContainer.style.display = "none";
      },
      { once: true }
    );
  });

  fileButton.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", handleFileUpload);
  sendButton.addEventListener("click", sendMessage);
  messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Functions
  function sendMessage() {
    const message = messageInput.value.trim();
    if (message) {
      addMessage("user", message);
      messageInput.value = "";
      // Simulate support response after delay
      setTimeout(() => {
        const responses = [
          "Thank you for your message 😊, Our team will be contact you through this chat soon,",
        ];
        addMessage(
          "support",
          responses[Math.floor(Math.random() * responses.length)]
        );
      }, 1000 + Math.random() * 2000);
      //send chat to server
      fetch("/sendMessage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      })
        .then((response) => response.json())
        .then((data) => {
          console.log("Message sent successfully:", data);
        })
        .catch((error) => {
          console.error("Error sending message:", error);
        });
    }
  }
  // get message from server and display
  function fetchChatMessages() {
    fetch("/getMessages", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        chatMessages.innerHTML = ""; // Clear existing messages
        data.forEach((msg) => {
          const sender = msg.userId ? "user" : "support";
          addMessage(sender, msg.message);
        });
        scrollToBottom();
      })
      .catch((error) => {
        console.error("Error fetching messages:", error);
      });
  }
  fetchChatMessages(); // Initial fetch

  function handleFileUpload(e) {
    const files = e.target.files;
    if (files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        addFileMessage(file);
        // Simulate support response for files
        setTimeout(() => {
          addMessage("support", `Received your file: ${file.name}`);
        }, 1500);
      }
      fileInput.value = "";
    }
  }

  function addMessage(sender, text) {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", sender + "-message");
    messageElement.style.cssText = `
      max-width: 80%;
      padding: 10px 15px;
      margin-bottom: 10px;
      border-radius: 18px;
      word-wrap: break-word;
      animation: fadeIn 0.3s ease-in;
    `;
    if (sender === "user") {
      messageElement.style.backgroundColor = "#4361ee";
      messageElement.style.color = "white";
      messageElement.style.alignSelf = "flex-end";
    } else {
      messageElement.style.backgroundColor = "#e9ecef";
      messageElement.style.color = "#333";
      messageElement.style.alignSelf = "flex-start";
    }
    messageElement.textContent = text;
    chatMessages.appendChild(messageElement);
    scrollToBottom();
  }

  function addFileMessage(file) {
    const fileElement = document.createElement("div");
    fileElement.classList.add("message", "user-message", "file-message");
    fileElement.style.cssText = `
      max-width: 80%;
      padding: 10px;
      margin-bottom: 10px;
      border-radius: 18px;
      background-color: #4361ee;
      color: white;
      align-self: flex-end;
      animation: fadeIn 0.3s ease-in;
      cursor: pointer;
    `;
    fileElement.innerHTML = `
      <div style="display: flex; align-items: center;">
        <span style="margin-right: 8px;">📄</span>
        <div>
          <div style="font-weight: bold; font-size: 0.9em;">${file.name}</div>
          <div style="font-size: 0.7em;">${formatFileSize(file.size)}</div>
        </div>
      </div>
    `;
    fileElement.addEventListener("click", () => {
      // Create temporary download link
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
    chatMessages.appendChild(fileElement);
    scrollToBottom();
  }

  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + " bytes";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else return (bytes / 1048576).toFixed(1) + " MB";
  }

  // Add animation style
  const style = document.createElement("style");
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .file-message:hover {
      opacity: 0.9;
    }
  `;
  document.head.appendChild(style);
});

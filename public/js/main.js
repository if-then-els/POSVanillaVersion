// Check if user is logged in
document.addEventListener("DOMContentLoaded", function () {
  // Check if we're on the login page
  const isLoginPage = window.location.pathname.includes("login.html");

  // If not on login page, check for token
  if (!isLoginPage) {
    const token = localStorage.getItem("posToken");
    if (!token) {
      // Redirect to login page if no token
      window.location.href = "login.html";
    }
  }

  // Sidebar toggle functionality
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebar = document.getElementById("sidebar");

  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener("click", function () {
      sidebar.classList.toggle("open");
    });
  }

  // Logout functionality
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      localStorage.removeItem("posToken");
      window.location.href = "login.html";
    });
  }

  // Modal functionality
  const modals = document.querySelectorAll(".modal");
  const modalCloseButtons = document.querySelectorAll(".modal-close");
  const modalOverlays = document.querySelectorAll(".modal-overlay");

  // Function to open modal
  window.openModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove("opacity-0", "pointer-events-none");
      document.body.classList.add("modal-active");
    }
  };

  // Function to close modal
  window.closeModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add("opacity-0", "pointer-events-none");
      document.body.classList.remove("modal-active");
    }
  };

  // Close modal when clicking close button or overlay
  modalCloseButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const modal = this.closest(".modal");
      if (modal) {
        modal.classList.add("opacity-0", "pointer-events-none");
        document.body.classList.remove("modal-active");
      }
    });
  });

  modalOverlays.forEach((overlay) => {
    overlay.addEventListener("click", function () {
      const modal = this.closest(".modal");
      if (modal) {
        modal.classList.add("opacity-0", "pointer-events-none");
        document.body.classList.remove("modal-active");
      }
    });
  });

  // Close modal when pressing ESC key
  document.addEventListener("keydown", function (e) {
    if (
      e.key === "Escape" &&
      document.body.classList.contains("modal-active")
    ) {
      modals.forEach((modal) => {
        if (!modal.classList.contains("opacity-0")) {
          modal.classList.add("opacity-0", "pointer-events-none");
          document.body.classList.remove("modal-active");
        }
      });
    }
  });

  // Format currency
  window.formatCurrency = function (amount) {
    return "$" + parseFloat(amount).toFixed(2);
  };
});

// API request helper function with JWT token
async function apiRequest(url, method = "GET", data = null) {
  const token = localStorage.getItem("posToken");

  const options = {
    method: method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  };

  if (data && (method === "POST" || method === "PUT")) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);

    // If unauthorized, redirect to login
    if (response.status === 401) {
      localStorage.removeItem("posToken");
      window.location.href = "login.html";
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("API Request Error:", error);
    return { error: "Network error. Please try again." };
  }
}

// Show notification
function showNotification(message, type = "success") {
  // Create notification element
  const notification = document.createElement("div");
  notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
    type === "success" ? "bg-green-500" : "bg-red-500"
  } text-white`;
  notification.textContent = message;

  // Add notification to body
  document.body.appendChild(notification);

  // Remove notification after 3 seconds
  setTimeout(() => {
    notification.classList.add("opacity-0");
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

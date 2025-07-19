/**
 * Sidebar functionality for POS System
 */

// Load sidebar content
function loadSidebar() {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;

  sidebar.innerHTML = `
    <div class="flex h-16 items-center justify-between border-b px-4">
      <h1 class="text-xl font-bold">POS System</h1>
      <!-- Removed inner toggle -->
    </div>
   <nav class="p-4">
  <ul class="space-y-2">
    <li>
      <a href="./dashboard.html" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 hover:bg-gray-700 hover:text-white ${
        window.location.pathname.endsWith("dashboard.html") ? "bg-gray-700 text-white" : ""
      }">
        <i class="fas fa-home w-5"></i><span>Dashboard</span>
      </a>
    </li>
    <li>
      <a href="./sales.html" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 hover:bg-gray-700 hover:text-white ${
        window.location.pathname.endsWith("sales.html") ? "bg-gray-700 text-white" : ""
      }">
        <i class="fas fa-shopping-cart w-5"></i><span>Sales</span>
      </a>
    </li>
    <li>
      <a href="./inventory.html" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 hover:bg-gray-700 hover:text-white ${
        window.location.pathname.endsWith("inventory.html") ? "bg-gray-700 text-white" : ""
      }">
        <i class="fas fa-box w-5"></i><span>Inventory</span>
      </a>
    </li>
    <li>
      <a href="./reports.html" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 hover:bg-gray-700 hover:text-white ${
        window.location.pathname.endsWith("reports.html") ? "bg-gray-700 text-white" : ""
      }">
        <i class="fas fa-chart-bar w-5"></i><span>Reports</span>
      </a>
    </li>
    <li>
      <a href="./manageSubscriptions.html" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 hover:bg-gray-700 hover:text-white ${
        window.location.pathname.endsWith("manageSubscriptions.html") ? "bg-gray-700 text-white" : ""
      }">
        <i class="fa-solid fa-bell w-5"></i><span>Subscriptions</span>
      </a>
    </li>
    <li>
      <a href="./users.html" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 hover:bg-gray-700 hover:text-white ${
        window.location.pathname.endsWith("users.html") ? "bg-gray-700 text-white" : ""
      }">
        <i class="fa-solid fa-users w-5"></i><span>User management</span>
      </a>
    </li>
    <li>
      <a href="./settings.html" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 hover:bg-gray-700 hover:text-white ${
        window.location.pathname.endsWith("settings.html") ? "bg-gray-700 text-white" : ""
      }">
        <i class="fas fa-cog w-5"></i><span>Settings</span>
      </a>
    </li>
  </ul>
</nav>

    <div class="border-t mt-auto p-4">
      <div class="flex items-center gap-3 rounded-md px-3 py-2">
        <i class="fas fa-user w-5"></i>
        <div class="flex flex-col">
          <span class="text-xs font-medium" id="user-name">Admin User</span>
          <span class="text-xs text-gray-500" id="user-email">admin@pos.com</span>
        </div>
      </div>
    </div>
    <div class="flex flex-col">
      <button id="logout-btn" class="mt-2 w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50">
        <i class="fas fa-sign-out-alt w-5"></i><span>Logout</span>
      </button>
    </div>
  `;

  // Fetch and update user info
  function updateUserInfo() {
    const userName = document.getElementById("user-name");
    const userEmail = document.getElementById("user-email");

    fetch("/userDetails", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${document.cookie.split("=")[1]}`,
      },
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to fetch user data");
        return response.json();
      })
      .then((data) => {
        if (data.user) {
          userName.textContent = data.user.business.name || "Admin User";
          userEmail.textContent = data.user.email || "not logged in @pos.com";
        }
      })
      .catch((error) => {
        console.error(error);
        userName.textContent = "Admin User";
        userEmail.textContent = "not logged in @pos.com";
      });
  }
  updateUserInfo();

  // Logout listener
  const logoutBtn = function logout() {
    document.getElementById("logout-btn").addEventListener("click", () => {
      fetch("/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${document.cookie.split("=")[1]}`,
        },
      })
        .then((response) => {
          if (!response.ok) throw new Error("Logout failed");
          window.location.href = "/login.html"; // Redirect to login page
        })
        .catch((error) => {
          console.error(error);
          alert("Logout failed. Please try again.");
        });
    });
  };
}

// Sidebar toggle functionality
document.addEventListener("DOMContentLoaded", () => {
  loadSidebar();

  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("overlay"); // make sure you have this div
  const mainContent = document.getElementById("main-content");
  const toggleButton = document.getElementById("toggle-sidebar");

  if (!sidebar || !overlay || !toggleButton || !mainContent) return;

  const openSidebar = () => {
    sidebar.classList.remove("-translate-x-full"); // show sidebar
    overlay.classList.remove("hidden"); // show overlay
  };

  const closeSidebar = () => {
    sidebar.classList.add("-translate-x-full"); // hide sidebar
    overlay.classList.add("hidden"); // hide overlay
  };

  toggleButton.addEventListener("click", openSidebar);
  overlay.addEventListener("click", closeSidebar);

  // Also close on resize so it's visible at md+
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 768) {
      sidebar.classList.remove("-translate-x-full");
      overlay.classList.add("hidden");
    } else {
      closeSidebar();
    }
  });

  // Close sidebar when clicking a link inside
  sidebar.addEventListener("click", (e) => {
    if (e.target.tagName === "A") closeSidebar();
  });
});

// sidebar for sales logic here

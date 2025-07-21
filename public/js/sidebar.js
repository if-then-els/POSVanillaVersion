/**
 * Sidebar functionality for POS System
 */

// Load sidebar content
function loadSidebar() {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;

  sidebar.innerHTML = `
    <div class="flex h-16 items-center justify-between border-b px-4">
      <h1 class="text-xl font-bold sidebar-text">POS System</h1>
      <button id="collapse-toggle" class="hidden md:block">
        <i id="collapse-icon" class="fas fa-chevron-left"></i>
      </button>
    </div>
    <nav class="p-4">
      <ul class="space-y-2">
        <li>
          <a href="./dashboard.html" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 hover:bg-gray-700 hover:text-white ${
            window.location.pathname.endsWith("dashboard.html")
              ? "bg-gray-700 text-white"
              : ""
          }">
            <i class="fas fa-home w-5"></i><span class="sidebar-text">Dashboard</span>
          </a>
        </li>
        <li>
          <a href="./sales.html" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 hover:bg-gray-700 hover:text-white ${
            window.location.pathname.endsWith("sales.html")
              ? "bg-gray-700 text-white"
              : ""
          }">
            <i class="fas fa-shopping-cart w-5"></i><span class="sidebar-text">Sales</span>
          </a>
        </li>
        <li>
          <a href="./inventory.html" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 hover:bg-gray-700 hover:text-white ${
            window.location.pathname.endsWith("inventory.html")
              ? "bg-gray-700 text-white"
              : ""
          }">
            <i class="fas fa-box w-5"></i><span class="sidebar-text">Inventory</span>
          </a>
        </li>
        <li>
          <a href="./reports.html" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 hover:bg-gray-700 hover:text-white ${
            window.location.pathname.endsWith("reports.html")
              ? "bg-gray-700 text-white"
              : ""
          }">
            <i class="fas fa-chart-bar w-5"></i><span class="sidebar-text">Reports</span>
          </a>
        </li>
        <li>
          <a href="./manageSubscriptions.html" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 hover:bg-gray-700 hover:text-white ${
            window.location.pathname.endsWith("manageSubscriptions.html")
              ? "bg-gray-700 text-white"
              : ""
          }">
            <i class="fa-solid fa-bell w-5"></i><span class="sidebar-text">Subscriptions</span>
          </a>
        </li>
        <li>
          <a href="./users.html" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 hover:bg-gray-700 hover:text-white ${
            window.location.pathname.endsWith("users.html")
              ? "bg-gray-700 text-white"
              : ""
          }">
            <i class="fa-solid fa-users w-5"></i><span class="sidebar-text">User management</span>
          </a>
        </li>
        <li>
          <a href="./settings.html" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 hover:bg-gray-700 hover:text-white ${
            window.location.pathname.endsWith("settings.html")
              ? "bg-gray-700 text-white"
              : ""
          }">
            <i class="fas fa-cog w-5"></i><span class="sidebar-text">Settings</span>
          </a>
        </li>
      </ul>
    </nav>

    <div class="border-t mt-auto p-4">
      <div class="flex items-center gap-3 rounded-md px-3 py-2">
        <i class="fas fa-user w-5"></i>
        <div class="flex flex-col sidebar-text">
          <span class="text-xs font-medium" id="user-name">Admin User</span>
          <span class="text-xs text-gray-500" id="user-email">admin@pos.com</span>
        </div>
      </div>
    </div>
    <div class="flex flex-col">
      <button id="logout-btn" class="mt-2 w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50">
        <i class="fas fa-sign-out-alt w-5"></i><span class="sidebar-text">Logout</span>
      </button>
    </div>
  `;

  // Inject collapse styles if not already present
  if (!document.getElementById("sidebar-collapse-style")) {
    const style = document.createElement("style");
    style.id = "sidebar-collapse-style";
    style.textContent = `
      @media (min-width: 768px) {
        .sidebar {
          width: 16rem;
          transition: width 0.3s ease;
        }
        .sidebar.collapsed {
          width: 5rem;
        }
        .sidebar.collapsed .sidebar-text {
          display: none;
        }
        .sidebar.collapsed nav ul li a {
          justify-content: center;
        }
        .sidebar.collapsed #user-info .flex {
          justify-content: center;
        }
        .sidebar.collapsed #logout-btn {
          justify-content: center;
        }
      }
    `;
    document.head.appendChild(style);
  }

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
  document.getElementById("logout-btn")?.addEventListener("click", () => {
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
}

// Sidebar toggle functionality
document.addEventListener("DOMContentLoaded", () => {
  loadSidebar();

  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("overlay");
  const toggleButton = document.getElementById("toggle-sidebar");
  const collapseToggle = document.getElementById("collapse-toggle");

  if (!sidebar || !overlay || !toggleButton) return;

  const openSidebar = () => {
    sidebar.classList.remove("-translate-x-full");
    overlay.classList.remove("hidden");
    document.body.classList.add("overflow-hidden"); // Prevent scrolling
  };

  const closeSidebar = () => {
    sidebar.classList.add("-translate-x-full");
    overlay.classList.add("hidden");
    document.body.classList.remove("overflow-hidden"); // Re-enable scrolling
  };

  // Collapse/expand functionality for desktop
  function toggleCollapse() {
    const isCollapsed = sidebar.classList.contains("collapsed");
    sidebar.classList.toggle("collapsed");
    const icon = document.getElementById("collapse-icon");
    if (icon) {
      icon.classList.toggle("fa-chevron-left", !isCollapsed);
      icon.classList.toggle("fa-chevron-right", isCollapsed);
    }
    localStorage.setItem("sidebarCollapsed", !isCollapsed);
  }

  // Apply initial collapsed state from localStorage
  if (window.innerWidth >= 768) {
    const isCollapsed = localStorage.getItem("sidebarCollapsed") === "true";
    if (isCollapsed) {
      sidebar.classList.add("collapsed");
      const icon = document.getElementById("collapse-icon");
      if (icon) {
        icon.classList.remove("fa-chevron-left");
        icon.classList.add("fa-chevron-right");
      }
    }
  }

  // Event listeners
  toggleButton.addEventListener("click", openSidebar);
  overlay.addEventListener("click", closeSidebar);
  collapseToggle?.addEventListener("click", toggleCollapse);

  // Better resize handling
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 768) {
      sidebar.classList.remove("-translate-x-full");
      overlay.classList.add("hidden");
      document.body.classList.remove("overflow-hidden");
    } else {
      // Remove collapsed state on mobile
      sidebar.classList.remove("collapsed");
      closeSidebar();
    }
  });

  // Close sidebar when clicking any link
  sidebar.addEventListener("click", (e) => {
    if (e.target.closest("a")) {
      closeSidebar();
    }
  });
});

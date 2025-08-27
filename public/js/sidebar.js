/**
 * Sidebar functionality for POS System with consistent collapse behavior
 */

// Load sidebar content
function loadSidebarContent() {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;

  // Add a container for subscription warnings at the top of the sidebar
  const warningContainer = document.createElement("div");
  warningContainer.id = "sidebar-subscription-warning";
  warningContainer.className = "px-4 py-2";
  sidebar.insertBefore(warningContainer, sidebar.firstChild);

  // Check subscription status
  checkSubscriptionStatus();
}

// Add function to check subscription status
async function checkSubscriptionStatus() {
  try {
    const response = await fetch("/api/subscriptions/details");
    const data = await response.json();

    if (data.subscription) {
      const endDate = new Date(data.subscription.endDate);
      const now = new Date();
      const daysUntilExpiry = Math.ceil(
        (endDate - now) / (1000 * 60 * 60 * 24)
      );

      updateSubscriptionWarning(daysUntilExpiry);
    }
  } catch (error) {
    console.error("Error checking subscription status:", error);
  }
}

// Add function to update subscription warning
function updateSubscriptionWarning(daysUntilExpiry) {
  const warningContainer = document.getElementById(
    "sidebar-subscription-warning"
  );
  if (!warningContainer) return;

  warningContainer.innerHTML = ""; // Clear existing warnings

  if (daysUntilExpiry <= 0) {
    warningContainer.innerHTML = `
      <div class="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4">
        <p class="text-xs text-red-400 font-medium">
          <i class="fas fa-exclamation-circle mr-1"></i>
          Subscription Expired
        </p>
        <a href="/manageSubscriptions.html" 
           class="text-xs text-red-400 hover:text-red-300 underline mt-1 inline-block">
          Renew Now
        </a>
      </div>
    `;
  } else if (daysUntilExpiry <= 7) {
    warningContainer.innerHTML = `
      <div class="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 mb-4">
        <p class="text-xs text-yellow-400 font-medium">
          <i class="fas fa-clock mr-1"></i>
          Expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"}
        </p>
        <a href="/manageSubscriptions.html" 
           class="text-xs text-yellow-400 hover:text-yellow-300 underline mt-1 inline-block">
          Renew Now
        </a>
      </div>
    `;
  }
}

// Load sidebar content
function loadSidebar() {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;

  // Define navigation items with a new 'requiresSubscription' property
  const navItems = [
    { href: "dashboard.html", icon: "fa-home", text: "Dashboard" },
    {
      href: "sales.html",
      icon: "fa-shopping-cart",
      text: "Sales",
      requiresSubscription: true,
    },
    {
      href: "inventory.html",
      icon: "fa-box",
      text: "Add Products",
      requiresSubscription: true,
    },
    {
      href: "reports.html",
      icon: "fa-chart-bar",
      text: "Reports",
      requiresSubscription: true,
    },
    {
      href: "manageSubscriptions.html",
      icon: "fa-bell",
      text: "Subscriptions",
      solid: true,
    },
    {
      href: "users.html",
      icon: "fa-users",
      text: "User management",
      solid: true,
      requiresSubscription: true,
    },
    { href: "settings.html", icon: "fa-cog", text: "Settings" },
  ];

  sidebar.innerHTML = `
    <div class="flex h-16 items-center justify-between border-b border-gray-700 px-4">
      <div class="flex items-center gap-3">
        <h1 class="text-xl font-bold sidebar-text">SwiftPOS</h1>
      </div>
      <button id="collapse-toggle" class="hidden md:block text-gray-400 hover:text-white">
        <i id="collapse-icon" class="fas fa-chevron-left"></i>
      </button>
    </div>

    <nav class="p-4">
      <ul class="space-y-2">
        ${navItems
          .map(
            ({ href, icon, text, solid, requiresSubscription }) => `
          <li>
            <a href="./${href}" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 hover:bg-gray-700 hover:text-white ${
              window.location.pathname.endsWith(href)
                ? "bg-gray-700 text-white"
                : "text-gray-400"
            }" ${
              requiresSubscription ? 'data-requires-subscription="true"' : ""
            }>
              <i class="${solid ? "fa-solid" : "fas"} ${icon} w-5"></i>
              <span class="sidebar-text">${text}</span>
            </a>
          </li>`
          )
          .join("")}
      </ul>
    </nav>

    <div class="border-t border-gray-700 mt-auto p-4">
      <div class="flex items-center gap-3 rounded-md px-3 py-2">
        <i class="fas fa-user w-5 text-gray-400"></i>
        <div class="flex flex-col sidebar-text" id="user-info">
          <span class="text-xs font-medium text-white" id="user-name">Admin User</span>
          <span class="text-xs text-gray-500" id="user-email">admin@pos.com</span>
        </div>
      </div>
    </div>
    <div class="flex flex-col">
      <button id="logout-btn" class="mt-2 w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 hover:bg-opacity-10">
        <i class="fas fa-sign-out-alt w-5"></i>
        <span class="sidebar-text">Logout</span>
      </button>
    </div>
  `;

  // Inject collapse CSS once
  if (!document.getElementById("sidebar-collapse-style")) {
    const style = document.createElement("style");
    style.id = "sidebar-collapse-style";
    style.textContent = `
      @media (min-width: 768px) {
        #sidebar {
          width: 16rem;
          transition: all 0.2s ease;
          transform: translateX(0) !important;
        }
        #sidebar.collapsed {
          width: 5rem;
        }
        #sidebar.collapsed .sidebar-text {
          display: none;
        }
        #sidebar.collapsed nav ul li a {
          justify-content: center;
          padding-left: 0.75rem;
          padding-right: 0.75rem;
        }
        #sidebar.collapsed #user-info {
          display: none;
        }
        #sidebar.collapsed #logout-btn span {
          display: none;
        }
        #sidebar.collapsed #logout-btn {
          justify-content: center;
        }
        #sidebar.collapsed h1 {
          display: none;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Populate user info
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
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch user");
        return res.json();
      })
      .then((data) => {
        if (data.user) {
          userName.textContent = data.user.business?.name || "Admin User";
          userEmail.textContent = data.user.email || "not logged in @pos.com";
        }
      })
      .catch(() => {
        userName.textContent = "Admin User";
        userEmail.textContent = "not logged in @pos.com";
      });
  }
  updateUserInfo();

  // Logout logic
  document.getElementById("logout-btn")?.addEventListener("click", () => {
    fetch("/logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${document.cookie.split("=")[1]}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Logout failed");
        window.location.href = "/login.html";
      })
      .catch(() => {
        alert("Logout failed. Please try again.");
      });
  });

  loadSidebarContent();

  // Check subscription status periodically (every hour)
  setInterval(checkSubscriptionStatus, 60 * 60 * 1000);
}

// Initialize sidebar functionality
document.addEventListener("DOMContentLoaded", () => {
  loadSidebar();

  setTimeout(() => {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");
    const toggleButton = document.getElementById("toggle-sidebar");
    const collapseToggle = document.getElementById("collapse-toggle");

    if (!sidebar || !toggleButton) return;

    const openSidebar = () => {
      sidebar.classList.remove("-translate-x-full");
      overlay?.classList.remove("hidden");
      document.body.classList.add("overflow-hidden");
    };

    const closeSidebar = () => {
      sidebar.classList.add("-translate-x-full");
      overlay?.classList.add("hidden");
      document.body.classList.remove("overflow-hidden");
    };

    // Desktop collapse toggle function (only for desktop)
    const toggleDesktopCollapse = () => {
      if (window.innerWidth >= 768) {
        const isCollapsed = sidebar.classList.toggle("collapsed");
        const icon = document.getElementById("collapse-icon");
        if (icon) {
          icon.classList.toggle("fa-chevron-left", !isCollapsed);
          icon.classList.toggle("fa-chevron-right", isCollapsed);
        }
        localStorage.setItem("sidebarCollapsed", isCollapsed);
      }
    };

    // Mobile toggle behavior
    toggleButton.addEventListener("click", () => {
      if (window.innerWidth < 768) {
        if (sidebar.classList.contains("-translate-x-full")) {
          openSidebar();
        } else {
          closeSidebar();
        }
      }
    });

    overlay?.addEventListener("click", closeSidebar);

    // Collapse toggle button (desktop only)
    if (collapseToggle) {
      collapseToggle.addEventListener("click", toggleDesktopCollapse);
    }

    // Restore collapse state on load (desktop only)
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

    window.addEventListener("resize", () => {
      if (window.innerWidth >= 768) {
        // Desktop view
        sidebar.classList.remove("-translate-x-full");
        overlay?.classList.add("hidden");
        document.body.classList.remove("overflow-hidden");

        const isCollapsed = localStorage.getItem("sidebarCollapsed") === "true";
        sidebar.classList.toggle("collapsed", isCollapsed);
      } else {
        // Mobile view
        sidebar.classList.remove("collapsed");
        closeSidebar();
      }
    });

    // Auto close on nav click (mobile)
    sidebar.addEventListener("click", (e) => {
      if (window.innerWidth < 768 && e.target.closest("a")) {
        closeSidebar();
      }
    });
  }, 0);
});

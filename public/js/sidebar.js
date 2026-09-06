/**
 * Sidebar functionality for POS System with consistent collapse behavior
 * Updated to match the premium Light/Dark theme
 */

// Load sidebar content
function loadSidebarContent() {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;

  // Add a container for subscription warnings at the top of the sidebar
  const warningContainer = document.createElement("div");
  warningContainer.id = "sidebar-subscription-warning";
  warningContainer.className = "px-4 py-2";

  // Insert after the header (logo area) if it exists, otherwise at start
  if (sidebar.firstChild && sidebar.firstChild.nextSibling) {
    sidebar.insertBefore(warningContainer, sidebar.firstChild.nextSibling);
  } else {
    sidebar.insertBefore(warningContainer, sidebar.firstChild);
  }

  // Check subscription status
  checkSubscriptionStatus();
}

// Add function to check subscription status
async function checkSubscriptionStatus() {
  try {
    const response = await fetch("/subscriptions/details");
    const data = await response.json();

    if (data.subscription) {
      const endDate = new Date(data.subscription.endDate);
      const now = new Date();
      const daysUntilExpiry = Math.ceil(
        (endDate - now) / (1000 * 60 * 60 * 24),
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
    "sidebar-subscription-warning",
  );
  if (!warningContainer) return;

  warningContainer.innerHTML = ""; // Clear existing warnings

  if (daysUntilExpiry <= 0) {
    warningContainer.innerHTML = `
      <div class="bg-red-500/10 dark:bg-red-500/20 border border-red-500/20 dark:border-red-500/50 rounded-xl p-3 mb-4 backdrop-blur-sm">
        <p class="text-xs text-red-600 dark:text-red-400 font-bold flex items-center gap-1.5">
          <i class="fas fa-exclamation-circle"></i>
          Subscription Expired
        </p>
        <a href="/manageSubscriptions.html" 
           class="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium underline mt-1 inline-block transition-colors">
          Renew Now
        </a>
      </div>
    `;
  } else if (daysUntilExpiry <= 7) {
    warningContainer.innerHTML = `
      <div class="bg-warning-500/10 dark:bg-yellow-500/20 border border-warning-500/20 dark:border-yellow-500/50 rounded-xl p-3 mb-4 backdrop-blur-sm">
        <p class="text-xs text-warning-700 dark:text-yellow-400 font-bold flex items-center gap-1.5">
          <i class="fas fa-clock"></i>
          Expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"}
        </p>
        <a href="/manageSubscriptions.html" 
           class="text-xs text-warning-700 dark:text-yellow-400 hover:text-warning-800 dark:hover:text-yellow-300 font-medium underline mt-1 inline-block transition-colors">
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
      href: "aiAnalytics.html",
      icon: "fa-brain",
      text: "AI Analytics",
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
      text: "User Management",
      solid: true,
      requiresSubscription: true,
    },
    { href: "settings.html", icon: "fa-cog", text: "Settings" },
  ];

  sidebar.innerHTML = `
    <!-- Header -->
    <div class="flex h-20 items-center justify-between px-6 border-b border-primary-200/50 dark:border-primary-700/50">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-gradient-to-br from-accent-500 to-accent-600 rounded-lg flex items-center justify-center shadow-lg">
          <i class="fas fa-bolt text-white text-sm"></i>
        </div>
        <h1 class="text-xl font-black tracking-tight text-primary-900 dark:text-white sidebar-text">
          Swift<span class="text-accent-500">POS</span>
        </h1>
      </div>
      <button id="collapse-toggle" class="hidden md:flex w-8 h-8 items-center justify-center rounded-lg text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-800 hover:text-primary-600 dark:hover:text-white transition-all">
        <i id="collapse-icon" class="fas fa-chevron-left text-sm"></i>
      </button>
    </div>

    <!-- Navigation -->
    <nav class="p-4 flex-1 overflow-y-auto">
      <ul class="space-y-1">
        ${navItems
          .map(({ href, icon, text, solid, requiresSubscription }) => {
            const isActive = window.location.pathname.endsWith(href);
            // Active state classes
            const activeClass =
              "bg-primary-100 dark:bg-primary-800/60 text-accent-600 dark:text-white shadow-sm font-semibold";
            // Inactive state classes
            const inactiveClass =
              "text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-800/40 hover:text-primary-900 dark:hover:text-white";

            return `
                <li>
                  <a href="./${href}" 
                     class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 group ${isActive ? activeClass : inactiveClass}" 
                     ${requiresSubscription ? 'data-requires-subscription="true"' : ""}>
                    <i class="${solid ? "fa-solid" : "fas"} ${icon} w-5 text-center transition-colors ${isActive ? "text-accent-500" : "text-primary-400 dark:text-primary-500 group-hover:text-accent-500"}"></i>
                    <span class="sidebar-text">${text}</span>
                    ${isActive ? '<div class="ml-auto w-1.5 h-1.5 rounded-full bg-accent-500 sidebar-text"></div>' : ""}
                  </a>
                </li>`;
          })
          .join("")}
      </ul>
    </nav>

    <!-- Footer / User Info -->
    <div class="mt-auto p-4 border-t border-primary-200/50 dark:border-primary-700/50 bg-primary-50/50 dark:bg-black/20">
      <div class="flex items-center gap-3 rounded-xl p-2 transition-colors">
        <div class="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white shadow-md">
           <i class="fas fa-user text-sm"></i>
        </div>
        <div class="flex flex-col sidebar-text min-w-0" id="user-info">
          <span class="text-sm font-bold text-primary-900 dark:text-white truncate" id="user-name">Admin User</span>
          <span class="text-xs text-primary-500 dark:text-primary-400 truncate" id="user-email">admin@pos.com</span>
        </div>
      </div>
      
      <button id="logout-btn" class="mt-3 w-full flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all border border-transparent hover:border-red-200 dark:hover:border-red-800/50">
        <i class="fas fa-sign-out-alt"></i>
        <span class="sidebar-text">Logout</span>
      </button>
    </div>
  `;

  // Inject collapse CSS once (Updated for new theme widths and transitions)
  if (!document.getElementById("sidebar-collapse-style")) {
    const style = document.createElement("style");
    style.id = "sidebar-collapse-style";
    style.textContent = `
      @media (min-width: 768px) {
        #sidebar {
          width: 17rem; /* Slightly wider for premium look */
          transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          transform: translateX(0) !important;
        }
        #sidebar.collapsed {
          width: 5.5rem; /* Adjusted for centered icons */
        }
        #sidebar.collapsed .sidebar-text {
          opacity: 0;
          pointer-events: none;
          display: none; /* Ensure total hide */
        }
        #sidebar.collapsed nav ul li a {
          justify-content: center;
          padding-left: 0;
          padding-right: 0;
        }
        #sidebar.collapsed h1 {
          display: none;
        }
        /* Show logo only when collapsed */
        #sidebar.collapsed .flex.items-center.gap-3 > div { 
             margin: 0 auto; 
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
        /* Rotate icon when collapsed */
        #sidebar.collapsed #collapse-icon {
          transform: rotate(180deg);
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

    if (!sidebar) return; // Prevent errors if sidebar container is missing

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
        localStorage.setItem("sidebarCollapsed", isCollapsed);
      }
    };

    // Mobile toggle behavior
    if (toggleButton) {
      toggleButton.addEventListener("click", () => {
        if (window.innerWidth < 768) {
          if (sidebar.classList.contains("-translate-x-full")) {
            openSidebar();
          } else {
            closeSidebar();
          }
        }
      });
    }

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
  }, 100); // Slight delay to ensure DOM elements are injected
});

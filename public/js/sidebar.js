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
      <button id="toggle-sidebar" class="p-2 rounded-md hover:bg-gray-200">
        <i class="fas fa-bars"></i>
      </button>
    </div>
    <nav class="p-4">
      <ul class="space-y-2">
        <li>
          <a href="./dashboard.html" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100 ${
            window.location.pathname.endsWith("dashboard.html")
              ? "bg-gray-100"
              : ""
          }">
            <i class="fas fa-home w-5"></i>
            <span>Dashboard</span>
          </a>
        </li>
        <li>
          <a href="./sales.html" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100 ${
            window.location.pathname.endsWith("sales.html") ? "bg-gray-100" : ""
          }">
            <i class="fas fa-shopping-cart w-5"></i>
            <span>Sales</span>
          </a>
        </li>
        <li>
          <a href="./inventory.html" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100 ${
            window.location.pathname.endsWith("inventory.html")
              ? "bg-gray-100"
              : ""
          }">
            <i class="fas fa-box w-5"></i>
            <span>Inventory</span>
          </a>
        </li>
        <li>
          <a href="./reports.html" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100 ${
            window.location.pathname.endsWith("reports.html")
              ? "bg-gray-100"
              : ""
          }">
            <i class="fas fa-chart-bar w-5"></i>
            <span>Reports</span>
          </a>
        </li>
        <li>
          <a href="./settings.html" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100 ${
            window.location.pathname.endsWith("settings.html")
              ? "bg-gray-100"
              : ""
          }">
            <i class="fas fa-cog w-5"></i>
            <span>Settings</span>
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
        <i class="fas fa-sign-out-alt w-5"></i>
        <span>Logout</span>
      </button>
    </div>
  `;

  // Update user info
  function updateUserInfo() {
    const userName = document.getElementById("user-name");
    const userEmail = document.getElementById("user-email");
    const businessName = document.getElementById("businessName");

    // fetch user data from API
    const response = fetch("/userDetails", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${document.cookie.split("=")[1]}`, // Assuming token is stored in a cookie
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch user data");
        }
        return response.json();
      })
      .then((data) => {
        if (data.user) {
          userName.textContent = data.user.business.name || "Admin User";
          userEmail.textContent = data.user.email || "not logged in @pos.com";
        }
      })
      .catch((error) => {
        console.error("Error fetching user data:", error);
        userName.textContent = "Admin User";
        userEmail.textContent = "not logged in @pos.com";
      });
  }
  document.addEventListener("DOMContentLoaded", updateUserInfo());

  // Add event listener to logout button
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    function logout() {
      // Placeholder for logout logic
      console.log("Logging out...");
    }
    logoutBtn.addEventListener("click", logout);
  }
}

// Sidebar toggle functionality
document.addEventListener("DOMContentLoaded", function () {
  const toggleSidebarBtn = document.getElementById("toggle-sidebar");
  const sidebar = document.getElementById("sidebar");
  const mainContent = document.getElementById("main-content");

  if (toggleSidebarBtn && sidebar && mainContent) {
    toggleSidebarBtn.addEventListener("click", function () {
      sidebar.classList.toggle("open");
      mainContent.classList.toggle("sidebar-open");
    });
  }
});

// Initialize sidebar when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  loadSidebar();
});

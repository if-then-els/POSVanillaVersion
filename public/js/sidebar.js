/**
 * Sidebar functionality for POS System
 */

// Load sidebar content
function loadSidebar() {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;

  // Get current page path
  const currentPath = window.location.pathname;
  const pageName = currentPath.split("/").pop();

  // Sidebar HTML content
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
          <a href="../public/dashboard.html" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100 ${
            pageName === "dashboard.html" ? "bg-gray-100" : ""
          }">
            <i class="fas fa-home w-5"></i>
            <span>Dashboard</span>
          </a>
        </li>
        <li>
          <a href="../public/sales.html" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100 ${
            pageName === "sales.html" ? "bg-gray-100" : ""
          }">
            <i class="fas fa-shopping-cart w-5"></i>
            <span>Sales</span>
          </a>
        </li>
        <li>
          <a href="../public/inventory.html" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100 ${
            pageName === "inventory.html" ? "bg-gray-100" : ""
          }">
            <i class="fas fa-box w-5"></i>
            <span>Inventory</span>
          </a>
        </li>
        <li>
          <a href="../public/reports.html" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100 ${
            pageName === "reports.html" ? "bg-gray-100" : ""
          }">
            <i class="fas fa-chart-bar w-5"></i>
            <span>Reports</span>
          </a>
        </li>
        <li>
          <a href="../public/setting.html" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100 ${
            pageName === "settings.html" ? "bg-gray-100" : ""
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
          <span class="text-sm font-medium" id="user-name">Admin User</span>
          <span class="text-xs text-gray-500" id="user-email">admin@pos.com</span>
        </div>
      </div>
      <button id="logout-btn" class="mt-2 w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50">
        <i class="fas fa-sign-out-alt w-5"></i>
        <span>Logout</span>
      </button>
    </div>
  `;

  // Update user info
  function updateUserInfo() {
    // Placeholder for user info update logic
    console.log("Updating user info...");
  }
  updateUserInfo();

  // Add event listener to toggle sidebar
  const toggleSidebarBtn = document.getElementById("toggle-sidebar");
  const mainContent = document.getElementById("main-content");

  if (toggleSidebarBtn && mainContent) {
    toggleSidebarBtn.addEventListener("click", () => {
      sidebar.classList.toggle("open");
      mainContent.classList.toggle("sidebar-open");
    });
  }

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

// Initialize sidebar when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  loadSidebar();
});

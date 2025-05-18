/**
 * Dashboard functionality for POS System
 */

// Mock data for dashboard
const mockDashboardData = {
  totalSales: 12580.45,
  totalOrders: 156,
  totalProducts: 243,
  lowStockItems: 12,
  recentTransactions: [
    {
      id: 1,
      customer: "John Doe",
      amount: 125.99,
      date: "2023-05-18",
      status: "completed",
    },
    {
      id: 2,
      customer: "Jane Smith",
      amount: 89.5,
      date: "2023-05-18",
      status: "completed",
    },
    {
      id: 3,
      customer: "Robert Johnson",
      amount: 245.0,
      date: "2023-05-17",
      status: "completed",
    },
    {
      id: 4,
      customer: "Emily Davis",
      amount: 45.75,
      date: "2023-05-17",
      status: "completed",
    },
    {
      id: 5,
      customer: "Michael Brown",
      amount: 189.99,
      date: "2023-05-16",
      status: "completed",
    },
  ],
  topSellingProducts: [
    { id: 1, name: "Product A", sold: 45, revenue: 2250.0 },
    { id: 2, name: "Product B", sold: 38, revenue: 1900.0 },
    { id: 3, name: "Product C", sold: 32, revenue: 1600.0 },
    { id: 4, name: "Product D", sold: 28, revenue: 1400.0 },
    { id: 5, name: "Product E", sold: 25, revenue: 1250.0 },
  ],
};

// Helper function to format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

// Mock function to check authentication
function checkAuth() {
  // In a real app, this would check user credentials
  // For demo purposes, we'll always return true
  return true;
}

// Load dashboard data
function loadDashboardData() {
  // In a real app, this would fetch data from an API
  // For demo purposes, we'll use mock data

  // Update dashboard cards
  document.getElementById("total-sales").textContent = formatCurrency(
    mockDashboardData.totalSales
  );
  document.getElementById("total-orders").textContent =
    mockDashboardData.totalOrders;
  document.getElementById("total-products").textContent =
    mockDashboardData.totalProducts;
  document.getElementById("low-stock-items").textContent =
    mockDashboardData.lowStockItems;

  // Load recent transactions
  const transactionsTable = document.getElementById("transactions-table");
  if (transactionsTable) {
    transactionsTable.innerHTML = mockDashboardData.recentTransactions
      .map(
        (transaction) => `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4">#${transaction.id}</td>
        <td class="px-6 py-4">${transaction.customer}</td>
        <td class="px-6 py-4">${formatCurrency(transaction.amount)}</td>
        <td class="px-6 py-4">${transaction.date}</td>
        <td class="px-6 py-4">
          <span class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
            ${transaction.status}
          </span>
        </td>
      </tr>
    `
      )
      .join("");
  }

  // Load top selling products
  const topProductsTable = document.getElementById("top-products-table");
  if (topProductsTable) {
    topProductsTable.innerHTML = mockDashboardData.topSellingProducts
      .map(
        (product) => `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4">${product.name}</td>
        <td class="px-6 py-4">${product.sold}</td>
        <td class="px-6 py-4">${formatCurrency(product.revenue)}</td>
      </tr>
    `
      )
      .join("");
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Check if user is authenticated
  if (!checkAuth()) return;

  // Load dashboard data
  loadDashboardData();

  // Handle tab switching
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      // Remove active class from all buttons
      tabButtons.forEach((btn) => {
        btn.classList.remove("active", "border-primary", "text-primary");
        btn.classList.add("text-gray-500");
      });

      // Add active class to clicked button
      button.classList.add("active", "border-primary", "text-primary");
      button.classList.remove("text-gray-500");

      // Hide all tab contents
      tabContents.forEach((content) => {
        content.classList.add("hidden");
      });

      // Show the selected tab content
      const contentId = button.id.replace("tab-", "") + "-content";
      document.getElementById(contentId).classList.remove("hidden");
    });
  });
});

/**
 * Dashboard functionality for POS System
 */

// Helper function to format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "KES",
  }).format(amount);
}

// Mock function to check authentication
function checkAuth() {
  // In a real app, this would check user credentials
  // For demo purposes, we'll always return true
  return true;
}

// Load dashboard data

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

// integrating  backend functionality for dynamic data

async function loadDashboardData() {
  try {
    const response = await fetch("/getInventory", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();
    const inventory = data.products || [];

    document.getElementById("total-products").textContent = inventory.length;
    document.getElementById("low-stock-items").textContent = inventory.filter(
      (p) => p.productQuantity < 10
    ).length;

    // You can also update top-selling products, etc., if your backend provides that data
  } catch (error) {
    console.error("Error loading dashboard data:", error);
  }
}

//load sales data
async function loadSalesData() {
  try {
    const response = await fetch("/salesAmount", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();

    // const sales = data.sales || [];
    // console.log("Sales data:", sales);

    document.getElementById("total-sales").textContent =
      "KES " + data.totalAmount;
    document.getElementById("total-sales-amount").textContent = formatCurrency(
      sales.reduce((sum, sale) => sum + sale.total, 0)
    );

    const salesTableBody = document.getElementById("sales-table-body");
    salesTableBody.innerHTML = ""; // Clear existing rows
    sales.forEach((sale) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="">${new Date(sale.createdAt).toLocaleDateString()}</td>
        <td>${sale.customerName || "Walk-in"}</td>
        <td>${formatCurrency(sale.total)}</td>
        <td>
          <a href="/receipt/${
            sale._id
          }" class="text-blue-500 hover:underline">View Receipt</a>
        </td>
      `;
      salesTableBody.appendChild(row);
    });
  } catch (error) {
    console.error("Error loading sales data:", error);
  }
  try {
    const response = await fetch("/getTotalOrders", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();
    document.getElementById("total-orders").textContent = data.totalOrders;
  } catch (error) {
    console.error("Error loading total orders:", error);
  }
  //recent transactions
  try {
    const response = await fetch("/getSales", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();
    console.log("Recent transactions data:", data);
    const recentTransactions = data.sales || [];
    console.log("Recent transactions:", recentTransactions);

    const recentTransactionsTableBody = document.getElementById(
      "recent-transactions-table-body"
    );
    recentTransactionsTableBody.innerHTML = ""; // Clear existing rows
    recentTransactions.forEach((transaction) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${new Date(transaction.createdAt).toLocaleDateString()}</td>
        <td>${transaction.customerName || "Walk-in"}</td>
        <td>${formatCurrency(transaction.total)}</td>
        <td>
          <a href="/receipt/${
            transaction._id
          }" class="text-blue-500 hover:underline">View Receipt</a>
        </td>
      `;
      recentTransactionsTableBody.appendChild(row);
    });
  } catch (error) {
    console.error("Error loading recent transactions:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Load sales data when the dashboard is ready
  loadSalesData();

  // Add event listener for the "View Sales" button
  const viewSalesButton = document.getElementById("view-sales-button");
  if (viewSalesButton) {
    viewSalesButton.addEventListener("click", () => {
      // Load sales data when the button is clicked
      loadSalesData();
    });
  }
});

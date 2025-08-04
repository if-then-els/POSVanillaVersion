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

function checkAuth() {
  return true;
}

// Load dashboard data

// Initialize dashboard when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Check if user is authenticated
  if (!checkAuth()) return;

  // Load dashboard data
  loadDashboardData();
  loadSalesData();
  loadProductsData();
  loadRecentTransactions();

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
    const sales = data.sales || [];
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
          <a href="/receipt.html?saleId=${
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
}

//load products data
async function loadProductsData() {
  try {
    const response = await fetch("/getInventory", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();
    const products = data.products || [];

    const productsTable = document.getElementById("products-table");
    productsTable.innerHTML = "";

    products.forEach((product) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="py-3 px-6">${product.productName}</td>
        <td class="py-3 px-6">${product.productCode}</td>
        <td class="py-3 px-6">${product.productCategory}</td>
        <td class="py-3 px-6">${formatCurrency(product.productPrice)}</td>
        <td class="py-3 px-6">${product.productQuantity}</td>
        <td class="py-3 px-6">
          <button class="bg-primary-500 text-white px-3 py-1 rounded-full text-xs hover:bg-primary-600 transition-colors">Edit</button>
        </td>
      `;
      productsTable.appendChild(row);
    });
  } catch (error) {
    console.error("Error loading products data:", error);
  }
}

//load recent transactions
async function loadRecentTransactions() {
  try {
    const response = await fetch("/getSales", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();
    const recentTransactions = data.sales || [];

    const transactionsTable = document.getElementById("transactions-table");
    transactionsTable.innerHTML = "";

    recentTransactions.forEach((transaction) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="py-3 px-6">${transaction._id.substring(0, 8)}</td>
        <td class="py-3 px-6">${transaction.customerName || "Walk-in"}</td>
        <td class="py-3 px-6">${formatCurrency(transaction.total)}</td>
        <td class="py-3 px-6">${new Date(
          transaction.createdAt
        ).toLocaleDateString()}</td>
        <td class="py-3 px-6">
          <span class="px-2 py-1 rounded-full text-xs ${
            transaction.paymentMethod === "Cash"
              ? "bg-green-500/20 text-green-500"
              : "bg-blue-500/20 text-blue-500"
          }">
            ${transaction.paymentMethod}
          </span>
        </td>
        <td class="py-3 px-6">
          <a href="/receipt.html?saleId=${transaction._id}" 
             target="_blank"
             class="text-primary-400 hover:text-primary-300 transition-colors">
            <i class="fas fa-receipt mr-1"></i> View
          </a>
        </td>
      `;
      transactionsTable.appendChild(row);
    });
  } catch (error) {
    console.error("Error loading recent transactions:", error);
  }
}

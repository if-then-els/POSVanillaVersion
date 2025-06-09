document.addEventListener("DOMContentLoaded", () => {
  loadSidebar();
  loadSalesOverview();
  loadProductSales();
  loadCategorySales();
  loadRecentTransactions();

  // Tab switching
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      tabButtons.forEach((btn) => {
        btn.classList.remove("active", "border-primary", "text-primary");
        btn.classList.add("text-gray-500");
      });
      button.classList.add("active", "border-primary", "text-primary");
      button.classList.remove("text-gray-500");
      tabContents.forEach((content) => content.classList.add("hidden"));
      const contentId = button.id.replace("tab-", "") + "-content";
      document.getElementById(contentId).classList.remove("hidden");
    });
  });

  // Time range select for sales overview
  document.getElementById("time-range")?.addEventListener("change", (e) => {
    loadSalesOverview(e.target.value);
  });

  // Sales Overview
  document.getElementById("export-sales-csv")?.addEventListener("click", () => {
    exportTableToCSV("sales-table", "sales_overview.csv");
  });
  document
    .getElementById("download-sales-chart")
    ?.addEventListener("click", () => {
      if (window.salesChart)
        downloadChartImage(window.salesChart, "sales_chart.png");
    });

  // Product Sales
  document
    .getElementById("export-product-sales-csv")
    ?.addEventListener("click", () => {
      exportTableToCSV("product-sales-table", "product_sales.csv");
    });
  document
    .getElementById("download-product-sales-chart")
    ?.addEventListener("click", () => {
      if (window.productSalesChart)
        downloadChartImage(window.productSalesChart, "product_sales_chart.png");
    });

  // Category Sales
  document
    .getElementById("export-category-sales-csv")
    ?.addEventListener("click", () => {
      exportTableToCSV("category-sales-table", "category_sales.csv");
    });
  document
    .getElementById("download-category-sales-chart")
    ?.addEventListener("click", () => {
      if (window.categorySalesChart)
        downloadChartImage(
          window.categorySalesChart,
          "category_sales_chart.png"
        );
    });

  // Transactions
  document
    .getElementById("export-transactions-csv")
    ?.addEventListener("click", () => {
      exportTableToCSV("transactions-table", "transactions.csv");
    });
});

async function loadSalesOverview(period = "daily") {
  try {
    const res = await fetch(`/reports/sales-overview?period=${period}`);
    const data = await res.json();
    const overview = data.overview || [];
    // Update table
    const table = document.getElementById("sales-table");
    if (table) {
      if (overview.length === 0) {
        table.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">No data</td></tr>`;
      } else {
        table.innerHTML = overview
          .map(
            (row) => `
            <tr>
              <td class="px-6 py-4">${row.period}</td>
              <td class="px-6 py-4">${row.sales.toFixed(2)}</td>
              <td class="px-6 py-4">${row.orders}</td>
              <td class="px-6 py-4">${row.avgOrderValue.toFixed(2)}</td>
            </tr>
          `
          )
          .join("");
      }
    }
    // Update chart
    const ctx = document.getElementById("sales-chart").getContext("2d");
    if (window.salesChart) window.salesChart.destroy();
    window.salesChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: overview.map((row) => row.period),
        datasets: [
          {
            label: "Sales",
            data: overview.map((row) => row.sales),
            borderColor: "#6366f1",
            backgroundColor: "rgba(99,102,241,0.1)",
            fill: true,
          },
        ],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });
  } catch (err) {
    console.error("Failed to load sales overview", err);
  }
}

async function loadProductSales() {
  try {
    const res = await fetch("/reports/product-sales");
    const data = await res.json();
    const products = data.products || [];
    // Update table
    const table = document.getElementById("product-sales-table");
    if (table) {
      if (products.length === 0) {
        table.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">No data</td></tr>`;
      } else {
        table.innerHTML = products
          .map(
            (row) => `
            <tr>
              <td class="px-6 py-4">${row.product}</td>
              <td class="px-6 py-4">${row.totalSales.toFixed(2)}</td>
              <td class="px-6 py-4">${row.quantity}</td>
              <td class="px-6 py-4">${row.avgPrice.toFixed(2)}</td>
            </tr>
          `
          )
          .join("");
      }
    }
    // Update chart
    const ctx = document.getElementById("product-sales-chart").getContext("2d");
    if (window.productSalesChart) window.productSalesChart.destroy();
    window.productSalesChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: products.map((row) => row.product),
        datasets: [
          {
            label: "Sales",
            data: products.map((row) => row.totalSales),
            backgroundColor: "#6366f1",
          },
        ],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });
  } catch (err) {
    console.error("Failed to load product sales", err);
  }
}

async function loadCategorySales() {
  try {
    const res = await fetch("/reports/category-sales");
    const data = await res.json();
    const categories = data.categories || [];
    // Update table
    const table = document.getElementById("category-sales-table");
    if (table) {
      if (categories.length === 0) {
        table.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">No data</td></tr>`;
      } else {
        table.innerHTML = categories
          .map(
            (row) => `
            <tr>
              <td class="px-6 py-4">${row.category}</td>
              <td class="px-6 py-4">${row.sales.toFixed(2)}</td>
              <td class="px-6 py-4">${row.products}</td>
              <td class="px-6 py-4">${row.percent}%</td>
            </tr>
          `
          )
          .join("");
      }
    }
    // Update chart
    const ctx = document
      .getElementById("category-sales-chart")
      .getContext("2d");
    if (window.categorySalesChart) window.categorySalesChart.destroy();
    window.categorySalesChart = new Chart(ctx, {
      type: "pie",
      data: {
        labels: categories.map((row) => row.category),
        datasets: [
          {
            label: "Sales",
            data: categories.map((row) => row.sales),
            backgroundColor: [
              "#6366f1",
              "#818cf8",
              "#a5b4fc",
              "#c7d2fe",
              "#e0e7ff",
            ],
          },
        ],
      },
      options: { responsive: true },
    });
  } catch (err) {
    console.error("Failed to load category sales", err);
  }
}

async function loadRecentTransactions() {
  try {
    const res = await fetch("/reports/recent-transactions");
    const data = await res.json();
    const txs = data.transactions || [];
    const table = document.getElementById("transactions-table");
    if (table) {
      if (txs.length === 0) {
        table.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">No transactions</td></tr>`;
      } else {
        table.innerHTML = txs
          .map(
            (tx) => `
            <tr>
              <td class="px-6 py-4">${tx._id}</td>
              <td class="px-6 py-4">${tx.customerName || "-"}</td>
              <td class="px-6 py-4">${tx.total.toFixed(2)}</td>
              <td class="px-6 py-4">${new Date(
                tx.createdAt
              ).toLocaleString()}</td>
              <td class="px-6 py-4">${tx.paymentMethod || "-"}</td>
            </tr>
          `
          )
          .join("");
      }
    }
  } catch (err) {
    console.error("Failed to load transactions", err);
  }
}

// Helper: Export table to CSV
function exportTableToCSV(tableId, filename) {
  const table = document.getElementById(tableId);
  if (!table) return;
  let csv = [];
  for (let row of table.rows) {
    let rowData = [];
    for (let cell of row.cells) {
      // Escape quotes
      let text = cell.innerText.replace(/"/g, '""');
      rowData.push(`"${text}"`);
    }
    csv.push(rowData.join(","));
  }
  const csvContent = csv.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Helper: Download chart as image
function downloadChartImage(chartInstance, filename) {
  const url = chartInstance.toBase64Image();
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

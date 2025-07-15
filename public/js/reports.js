// Global chart variables to store instances
// These are declared globally so they can be accessed and destroyed by different functions.
let salesChartInstance = null;
let productSalesChartInstance = null;
let categorySalesChartInstance = null;

document.addEventListener("DOMContentLoaded", () => {
  console.log("reports.js: DOMContentLoaded event fired.");

  // Load sidebar content (assuming loadSidebar is defined in sidebar.js)
  // Ensure sidebar.js is loaded before this script if loadSidebar is called here.
  if (typeof loadSidebar === "function") {
    loadSidebar();
    console.log("reports.js: loadSidebar() called.");
  } else {
    console.warn(
      "reports.js: loadSidebar function not found. Ensure sidebar.js is loaded."
    );
  }

  // Initial loading of all report sections
  loadSalesOverview(document.getElementById("time-range")?.value || "daily");
  loadProductSales();
  loadCategorySales();
  loadRecentTransactions();
  console.log("reports.js: Initial report data loading functions called.");

  // Tab switching logic
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      console.log(`reports.js: Tab button clicked: ${button.id}`);
      tabButtons.forEach((btn) => {
        btn.classList.remove("active", "border-primary", "text-primary");
        btn.classList.add("text-gray-500");
      });
      button.classList.add("active", "border-primary", "text-primary");
      button.classList.remove("text-gray-500");
      tabContents.forEach((content) => content.classList.add("hidden"));
      const contentId = button.id.replace("tab-", "") + "-content";
      const targetContent = document.getElementById(contentId);
      if (targetContent) {
        targetContent.classList.remove("hidden");
        console.log(`reports.js: Displaying content for tab: ${contentId}`);
      } else {
        console.warn(
          `reports.js: Target content element not found for ID: ${contentId}`
        );
      }

      // Re-load data for the switched tab if necessary
      if (button.id === "tab-product-sales") {
        loadProductSales();
      } else if (button.id === "tab-category-sales") {
        loadCategorySales();
      }
      // No need to reload sales overview here as it's handled by time-range change
    });
  });

  // Time range select for sales overview
  document.getElementById("time-range")?.addEventListener("change", (e) => {
    console.log(`reports.js: Time range changed to: ${e.target.value}`);
    loadSalesOverview(e.target.value);
  });

  // Sales Overview Export/Download
  document.getElementById("export-sales-csv")?.addEventListener("click", () => {
    console.log("reports.js: Export Sales CSV clicked.");
    exportTableToCSV("sales-table", "sales_overview.csv");
  });
  document
    .getElementById("download-sales-chart")
    ?.addEventListener("click", () => {
      console.log("reports.js: Download Sales Chart clicked.");
      if (salesChartInstance) {
        // Use the global instance variable
        downloadChartImage(salesChartInstance, "sales_chart.png");
      } else {
        console.warn(
          "reports.js: salesChartInstance is not available for download."
        );
      }
    });

  // Product Sales Export/Download
  document
    .getElementById("export-product-sales-csv")
    ?.addEventListener("click", () => {
      console.log("reports.js: Export Product Sales CSV clicked.");
      exportTableToCSV("product-sales-table", "product_sales.csv");
    });
  document
    .getElementById("download-product-sales-chart")
    ?.addEventListener("click", () => {
      console.log("reports.js: Download Product Sales Chart clicked.");
      if (productSalesChartInstance) {
        // Use the global instance variable
        downloadChartImage(
          productSalesChartInstance,
          "product_sales_chart.png"
        );
      } else {
        console.warn(
          "reports.js: productSalesChartInstance is not available for download."
        );
      }
    });

  // Category Sales Export/Download
  document
    .getElementById("export-category-sales-csv")
    ?.addEventListener("click", () => {
      console.log("reports.js: Export Category Sales CSV clicked.");
      exportTableToCSV("category-sales-table", "category_sales.csv");
    });
  document
    .getElementById("download-category-sales-chart")
    ?.addEventListener("click", () => {
      console.log("reports.js: Download Category Sales Chart clicked.");
      if (categorySalesChartInstance) {
        // Use the global instance variable
        downloadChartImage(
          categorySalesChartInstance,
          "category_sales_chart.png"
        );
      } else {
        console.warn(
          "reports.js: categorySalesChartInstance is not available for download."
        );
      }
    });

  // Transactions Export
  document
    .getElementById("export-transactions-csv")
    ?.addEventListener("click", () => {
      console.log("reports.js: Export Transactions CSV clicked.");
      exportTableToCSV("transactions-table", "transactions.csv");
    });
});

async function loadSalesOverview(period = "daily") {
  console.log(`reports.js: Loading Sales Overview for period: ${period}`);
  try {
    const res = await fetch(`/reports/sales-overview?period=${period}`);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();
    const overview = data.overview || [];
    console.log("reports.js: Sales Overview data received:", overview);

    // Update table
    const table = document.getElementById("sales-table");
    if (table) {
      if (overview.length === 0) {
        table.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">No data available for this period.</td></tr>`;
      } else {
        table.innerHTML = overview
          .map(
            (row) => `
            <tr class="hover:bg-gray-800 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">${
                row.period
              }</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">KES ${row.sales.toFixed(
                2
              )}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${
                row.orders
              }</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">KES ${row.avgOrderValue.toFixed(
                2
              )}</td>
            </tr>
          `
          )
          .join("");
      }
    } else {
      console.warn("reports.js: Sales table element not found.");
    }

    // Update chart
    const ctx = document.getElementById("sales-chart")?.getContext("2d");
    if (ctx) {
      if (salesChartInstance) {
        salesChartInstance.destroy();
        console.log("reports.js: Destroyed existing salesChartInstance.");
      }
      salesChartInstance = new Chart(ctx, {
        type: "line",
        data: {
          labels: overview.map((row) => row.period),
          datasets: [
            {
              label: "Sales",
              data: overview.map((row) => row.sales),
              borderColor: "#0ea5e9", // primary-500
              backgroundColor: "rgba(14,165,233,0.1)", // primary-500 with alpha
              fill: true,
              tension: 0.4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: {
                color: "#cbd5e1", // text-gray-300 for legend labels
              },
            },
          },
          scales: {
            x: {
              ticks: {
                color: "#9ca3af", // text-gray-400 for x-axis ticks
              },
              grid: {
                color: "rgba(255, 255, 255, 0.1)", // Lighter grid lines
              },
            },
            y: {
              ticks: {
                color: "#9ca3af", // text-gray-400 for y-axis ticks
              },
              grid: {
                color: "rgba(255, 255, 255, 0.1)", // Lighter grid lines
              },
            },
          },
        },
      });
      console.log("reports.js: New salesChartInstance created.");
    } else {
      console.warn(
        "reports.js: Sales chart canvas element not found or context unavailable."
      );
    }
  } catch (err) {
    console.error("reports.js: Failed to load sales overview", err);
  }
}

async function loadProductSales() {
  console.log("reports.js: Loading Product Sales...");
  try {
    const res = await fetch("/reports/product-sales");
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();
    const products = data.products || [];
    console.log("reports.js: Product Sales data received:", products);

    // Update table
    const table = document.getElementById("product-sales-table");
    if (table) {
      if (products.length === 0) {
        table.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">No product sales data.</td></tr>`;
      } else {
        table.innerHTML = products
          .map(
            (row) => `
            <tr class="hover:bg-gray-800 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">${
                row.product
              }</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">KES ${row.totalSales.toFixed(
                2
              )}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${
                row.quantity
              }</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">KES ${row.avgPrice.toFixed(
                2
              )}</td>
            </tr>
          `
          )
          .join("");
      }
    } else {
      console.warn("reports.js: Product sales table element not found.");
    }

    // Update chart
    const ctx = document
      .getElementById("product-sales-chart")
      ?.getContext("2d");
    if (ctx) {
      if (productSalesChartInstance) {
        productSalesChartInstance.destroy();
        console.log(
          "reports.js: Destroyed existing productSalesChartInstance."
        );
      }
      productSalesChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
          labels: products.map((row) => row.product),
          datasets: [
            {
              label: "Sales",
              data: products.map((row) => row.totalSales),
              backgroundColor: "#d946ef", // accent-500
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: {
                color: "#cbd5e1",
              },
            },
          },
          scales: {
            x: {
              ticks: {
                color: "#9ca3af",
              },
              grid: {
                color: "rgba(255, 255, 255, 0.1)",
              },
            },
            y: {
              ticks: {
                color: "#9ca3af",
              },
              grid: {
                color: "rgba(255, 255, 255, 0.1)",
              },
            },
          },
        },
      });
      console.log("reports.js: New productSalesChartInstance created.");
    } else {
      console.warn(
        "reports.js: Product sales chart canvas element not found or context unavailable."
      );
    }
  } catch (err) {
    console.error("reports.js: Failed to load product sales", err);
  }
}

async function loadCategorySales() {
  console.log("reports.js: Loading Category Sales...");
  try {
    const res = await fetch("/reports/category-sales");
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();
    const categories = data.categories || [];
    console.log("reports.js: Category Sales data received:", categories);

    // Update table
    const table = document.getElementById("category-sales-table");
    if (table) {
      if (categories.length === 0) {
        table.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">No category sales data.</td></tr>`;
      } else {
        table.innerHTML = categories
          .map(
            (row) => `
            <tr class="hover:bg-gray-800 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">${
                row.category
              }</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">KES ${row.sales.toFixed(
                2
              )}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${
                row.products
              }</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${
                row.percent
              }%</td>
            </tr>
          `
          )
          .join("");
      }
    } else {
      console.warn("reports.js: Category sales table element not found.");
    }

    // Update chart
    const ctx = document
      .getElementById("category-sales-chart")
      ?.getContext("2d");
    if (ctx) {
      if (categorySalesChartInstance) {
        categorySalesChartInstance.destroy();
        console.log(
          "reports.js: Destroyed existing categorySalesChartInstance."
        );
      }
      categorySalesChartInstance = new Chart(ctx, {
        type: "pie",
        data: {
          labels: categories.map((row) => row.category),
          datasets: [
            {
              label: "Sales",
              data: categories.map((row) => row.sales),
              backgroundColor: [
                "#0ea5e9", // primary-500
                "#d946ef", // accent-500
                "#22c55e", // success-500
                "#f59e0b", // yellow-500
                "#ec4899", // pink-500
              ],
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: {
                color: "#cbd5e1",
              },
            },
          },
        },
      });
      console.log("reports.js: New categorySalesChartInstance created.");
    } else {
      console.warn(
        "reports.js: Category sales chart canvas element not found or context unavailable."
      );
    }
  } catch (err) {
    console.error("reports.js: Failed to load category sales", err);
  }
}

async function loadRecentTransactions() {
  console.log("reports.js: Loading Recent Transactions...");
  try {
    const res = await fetch("/reports/recent-transactions");
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();
    const txs = data.transactions || [];
    console.log("reports.js: Recent Transactions data received:", txs);

    const table = document.getElementById("transactions-table");
    if (table) {
      if (txs.length === 0) {
        table.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">No transactions available.</td></tr>`;
      } else {
        table.innerHTML = txs
          .map(
            (tx) => `
            <tr class="hover:bg-gray-800 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">${
                tx._id
              }</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${
                tx.customerName || "-"
              }</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">KES ${tx.total.toFixed(
                2
              )}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${new Date(
                tx.createdAt
              ).toLocaleString()}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${
                tx.paymentMethod || "-"
              }</td>
            </tr>
          `
          )
          .join("");
      }
    } else {
      console.warn("reports.js: Transactions table element not found.");
    }
  } catch (err) {
    console.error("reports.js: Failed to load transactions", err);
  }
}

// Helper: Export table to CSV
function exportTableToCSV(tableId, filename) {
  console.log(`reports.js: Exporting table ${tableId} to ${filename}`);
  const table = document.getElementById(tableId);
  if (!table) {
    console.error(
      `reports.js: Table with ID ${tableId} not found for CSV export.`
    );
    return;
  }
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
  console.log(`reports.js: Exported ${filename} successfully.`);
}

// Helper: Download chart as image
function downloadChartImage(chartInstance, filename) {
  console.log(`reports.js: Downloading chart ${filename}`);
  if (!chartInstance) {
    console.error("reports.js: Chart instance is null, cannot download image.");
    return;
  }
  const url = chartInstance.toBase64Image();
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  console.log(`reports.js: Downloaded ${filename} successfully.`);
}

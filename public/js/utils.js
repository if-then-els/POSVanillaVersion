/**
 * Utility functions for POS System
 */

// Show toast notification
function showToast(title, message, type = "info", duration = 3000) {
  const toastContainer = document.getElementById("toast-container");

  // Create toast element
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  // Create toast content
  toast.innerHTML = `
    <div class="toast-header">
      <span class="toast-title">${title}</span>
      <button class="toast-close">&times;</button>
    </div>
    <div class="toast-body">${message}</div>
  `;

  // Add toast to container
  toastContainer.appendChild(toast);

  // Add event listener to close button
  const closeButton = toast.querySelector(".toast-close");
  closeButton.addEventListener("click", () => {
    toast.classList.add("fade-out");
    setTimeout(() => {
      toastContainer.removeChild(toast);
    }, 500);
  });

  // Auto remove toast after duration
  setTimeout(() => {
    if (toast.parentNode === toastContainer) {
      toast.classList.add("fade-out");
      setTimeout(() => {
        if (toast.parentNode === toastContainer) {
          toastContainer.removeChild(toast);
        }
      }, 500);
    }
  }, duration);

  return toast;
}

// Format currency
function formatCurrency(amount, currencyCode = "KES") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(amount);
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

// Generate random ID
function generateId() {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

// Debounce function for search inputs
function debounce(func, wait = 300) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Get data from localStorage with default value
function getLocalStorage(key, defaultValue = null) {
  const value = localStorage.getItem(key);
  if (value === null) return defaultValue;
  try {
    return JSON.parse(value);
  } catch (e) {
    return value;
  }
}

// Set data to localStorage
function setLocalStorage(key, value) {
  if (typeof value === "object") {
    localStorage.setItem(key, JSON.stringify(value));
  } else {
    localStorage.setItem(key, value);
  }
}

// Remove data from localStorage
function removeLocalStorage(key) {
  localStorage.removeItem(key);
}

// Fetch data with error handling
async function fetchData(url, options = {}) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
}

// Export CSV data
function exportToCSV(data, filename = "export.csv") {
  // Convert data to CSV format
  const csvRows = [];

  // Get headers
  const headers = Object.keys(data[0]);
  csvRows.push(headers.join(","));

  // Add data rows
  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header];
      // Handle strings with commas by wrapping in quotes
      return typeof value === "string" && value.includes(",")
        ? `"${value}"`
        : value;
    });
    csvRows.push(values.join(","));
  }

  // Create CSV content
  const csvContent = csvRows.join("\n");

  // Create download link
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

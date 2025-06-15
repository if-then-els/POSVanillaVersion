document.addEventListener("DOMContentLoaded", () => {
  // Sidebar
  if (typeof loadSidebar === "function") loadSidebar();

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

  // Load settings when the page loads
  loadSettings();

  // Store Settings Form
  const storeForm = document.getElementById("store-settings-form");
  if (storeForm) {
    storeForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      await saveSettings();
    });
  }
});

// Fetch current settings from backend and populate the form
async function loadSettings() {
  try {
    const res = await fetch("/api/settings");
    const settings = await res.json();
    document.getElementById("store-name").value = settings.name || "";
    document.getElementById("store-address").value = settings.address || "";
    document.getElementById("store-phone").value = settings.phone || "";
    document.getElementById("store-email").value = settings.email || "";
    document.getElementById("tax-rate").value = settings.taxRate || "";
    document.getElementById("currency").value = settings.currency || "";
  } catch (err) {
    showToast("Error", "Failed to load settings", "error");
    console.error("Error loading settings:", err);
  }
}

// Save settings to backend
async function saveSettings() {
  const payload = {
    name: document.getElementById("store-name").value,
    address: document.getElementById("store-address").value,
    phone: document.getElementById("store-phone").value,
    email: document.getElementById("store-email").value,
    taxRate: document.getElementById("tax-rate").value,
    currency: document.getElementById("currency").value,
  };
  try {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      showToast("Success", "Settings saved", "success");
    } else {
      showToast("Error", data.message, "error");
    }
  } catch (err) {
    showToast("Error", "Failed to save settings", "error");
    console.error("Error saving settings:", err);
  }
}

// Simple toast function (replace with your own if needed)
function showToast(title, message, type = "success") {
  alert(`${title}: ${message}`);
}

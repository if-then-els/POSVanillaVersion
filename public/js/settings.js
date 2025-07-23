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
  loadStoreSettings();
  loadReceiptSettings();
  loadUserSettings();
});

// --- STORE SETTINGS ---
// Logo upload handling
document.getElementById("upload-logo-btn").addEventListener("click", () => {
  document.getElementById("store-logo").click();
});

document.getElementById("store-logo").addEventListener("change", function () {
  if (this.files && this.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      document.getElementById("logo-preview").src = e.target.result;
    };
    reader.readAsDataURL(this.files[0]);
  }
});

// Update loadStoreSettings to show current logo
async function loadStoreSettings() {
  const res = await fetch("/settings/store", { credentials: "include" });
  const data = await res.json();
  if (res.ok) {
    // ... existing fields ...
    if (data.logoUrl) {
      document.getElementById("logo-preview").src = data.logoUrl;
    }
  }
}

// Update store form submission to handle file upload
document.getElementById("store-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData();
  formData.append("name", document.getElementById("store-name").value);
  formData.append("address", document.getElementById("store-address").value);
  formData.append("phone", document.getElementById("store-phone").value);
  formData.append("email", document.getElementById("store-email").value);
  formData.append("taxRate", document.getElementById("tax-rate").value);
  formData.append("currency", document.getElementById("currency").value);

  const logoInput = document.getElementById("store-logo");
  if (logoInput.files[0]) {
    formData.append("logo", logoInput.files[0]);
  }

  const res = await fetch("/settings/store", {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  const data = await res.json();
  showToast(data.message, res.ok ? "success" : "error");
});

// --- RECEIPT SETTINGS ---
async function loadReceiptSettings() {
  const res = await fetch("/settings/receipt", { credentials: "include" });
  const data = await res.json();
  if (res.ok) {
    document.getElementById("show-logo").checked = !!data.showLogo;
    document.getElementById("show-tax-details").checked = !!data.showTaxDetails;
    document.getElementById("include-contact-info").checked =
      !!data.includeContactInfo;
    document.getElementById("print-automatically").checked =
      !!data.printAutomatically;
    document.getElementById("footer-text").value = data.footerText || "";
  }
}

document
  .getElementById("receipt-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      showLogo: document.getElementById("show-logo").checked,
      showTaxDetails: document.getElementById("show-tax-details").checked,
      includeContactInfo: document.getElementById("include-contact-info")
        .checked,
      printAutomatically: document.getElementById("print-automatically")
        .checked,
      footerText: document.getElementById("footer-text").value,
    };
    const res = await fetch("/settings/receipt", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    showToast(data.message, res.ok ? "success" : "error");
  });

// --- USER SETTINGS ---
async function loadUserSettings() {
  const res = await fetch("/settings/user", {
    method: "GET",
    credentials: "include",
  });
  const data = await res.json();
  console.log("data from user settings: ", data);
  if (res.ok) {
    document.getElementById("user-username").value = data.username || "";
    document.getElementById("user-email").value = data.email || "";
  }
}

document.getElementById("user-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    username: document.getElementById("user-username").value,
    email: document.getElementById("user-email").value,
    currentPassword: document.getElementById("current-password").value,
    newPassword: document.getElementById("new-password").value,
    confirmPassword: document.getElementById("confirm-password").value,
  };
  const res = await fetch("/settings/user", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  showToast(data.message, res.ok ? "success" : "error");
});

// --- TOAST UTILITY ---
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `mb-2 px-4 py-2 rounded shadow text-white ${
    type === "success" ? "bg-green-600" : "bg-red-600"
  }`;
  toast.innerText = message;
  document.getElementById("toast-container").appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

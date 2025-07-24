/*
 * Clean, unified Settings script for SwiftPOS.
 * Handles:
 *   1. Loading store/receipt/user settings at startup.
 *   2. Persisting edits for all three settings groups.
 *   3. Logo preview + upload.
 *   4. Tab navigation + toast notifications.
 *
 *  IMPORTANT: Remove the old inline <script> block in settings.html to avoid duplicate listeners.
 */

/* global loadSidebar */

document.addEventListener("DOMContentLoaded", init);

function init() {
  // Sidebar (already present site‑wide)
  if (typeof loadSidebar === "function") loadSidebar();

  wireTabs();
  wireLogoUpload();
  wireForms();

  // Fetch everything in parallel → toast on success/failure
  Promise.all([loadStoreSettings(), loadReceiptSettings(), loadUserSettings()])
    .then(() => showToast("Settings loaded successfully!", "success"))
    .catch((err) => {
      console.error(err);
      showToast("Some settings could not be loaded.", "error");
    });
}

/* ───────────────────────── Tabs ───────────────────────── */
function wireTabs() {
  const tabButtons = document.querySelectorAll(".tab-button");
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      // Colour / border state
      tabButtons.forEach((b) => {
        b.classList.remove("text-white", "border-primary-500");
        b.classList.add("text-gray-400");
      });
      btn.classList.add("text-white", "border-primary-500");
      btn.classList.remove("text-gray-400");

      // Show correct panel
      document
        .querySelectorAll(".tab-content")
        .forEach((c) => c.classList.add("hidden"));
      const target = btn.id.replace("tab-", "") + "-content";
      document.getElementById(target).classList.remove("hidden");
    });
  });
}

/* ─────────────────────── Logo Upload ─────────────────────── */
function wireLogoUpload() {
  document.getElementById("upload-logo-btn").addEventListener("click", () => {
    document.getElementById("store-logo").click();
  });
  document.getElementById("store-logo").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) =>
      (document.getElementById("logo-preview").src = ev.target.result);
    reader.readAsDataURL(file);
  });
}

/* ──────────────────────── Forms ───────────────────────── */
function wireForms() {
  document
    .getElementById("store-settings-form")
    .addEventListener("submit", saveStoreSettings);
  document
    .getElementById("receipt-settings-form")
    .addEventListener("submit", saveReceiptSettings);
  document
    .getElementById("user-settings-form")
    .addEventListener("submit", saveUserSettings);
}

/* ─────────────────── Load functions ─────────────────── */
async function loadStoreSettings() {
  const res = await fetch("/settings/store", { credentials: "include" });
  if (!res.ok) throw new Error("Store settings fetch failed");
  const d = await res.json();
  document.getElementById("store-name").value = d.name || "";
  document.getElementById("store-address").value = d.address || "";
  document.getElementById("store-phone").value = d.phone || "";
  document.getElementById("store-email").value = d.email || "";
  document.getElementById("tax-rate").value = d.taxRate ?? "";
  document.getElementById("currency").value = d.currency || "";
  if (d.logoUrl) document.getElementById("logo-preview").src = d.logoUrl;
}

async function loadReceiptSettings() {
  const res = await fetch("/settings/receipt", { credentials: "include" });
  if (!res.ok) throw new Error("Receipt settings fetch failed");
  const d = await res.json();
  document.getElementById("show-logo").checked = !!d.showLogo;
  document.getElementById("show-tax").checked = !!d.showTaxDetails;
  document.getElementById("include-contact").checked = !!d.includeContactInfo;
  document.getElementById("print-auto").checked = !!d.printAutomatically;
  document.getElementById("footer-text").value = d.footerText || "";
}

async function loadUserSettings() {
  const res = await fetch("/settings/user", { credentials: "include" });
  if (!res.ok) throw new Error("User settings fetch failed");
  const d = await res.json();
  document.getElementById("user-username").value = d.username || "";
  document.getElementById("user-email").value = d.email || "";
}

/* ─────────────────── Save functions ─────────────────── */
async function saveStoreSettings(e) {
  e.preventDefault();
  const fd = new FormData();
  fd.append("name", document.getElementById("store-name").value);
  fd.append("address", document.getElementById("store-address").value);
  fd.append("phone", document.getElementById("store-phone").value);
  fd.append("email", document.getElementById("store-email").value);
  fd.append("taxRate", document.getElementById("tax-rate").value);
  fd.append("currency", document.getElementById("currency").value);
  const logoFile = document.getElementById("store-logo").files[0];
  if (logoFile) fd.append("logo", logoFile);

  const res = await fetch("/settings/store", {
    method: "PUT",
    credentials: "include",
    body: fd,
  });
  handleResponse(res, "Store settings saved!");
}

async function saveReceiptSettings(e) {
  e.preventDefault();
  const payload = {
    showLogo: document.getElementById("show-logo").checked,
    showTaxDetails: document.getElementById("show-tax").checked,
    includeContactInfo: document.getElementById("include-contact").checked,
    printAutomatically: document.getElementById("print-auto").checked,
    footerText: document.getElementById("footer-text").value,
  };
  const res = await fetch("/settings/receipt", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  handleResponse(res, "Receipt settings saved!");
}

async function saveUserSettings(e) {
  e.preventDefault();
  const payload = {
    username: document.getElementById("user-username").value,
    email: document.getElementById("user-email").value,
    currentPassword: document.getElementById("current-password").value,
    newPassword: document.getElementById("new-password").value,
    confirmPassword: document.getElementById("confirm-password").value,
  };

  const errorBox = document.getElementById("password-error");
  const errorMsg = document.getElementById("password-error-message");

  if (payload.newPassword && payload.newPassword !== payload.confirmPassword) {
    errorMsg.textContent = "Passwords do not match.";
    errorBox.classList.remove("hidden");
    return;
  }
  errorBox.classList.add("hidden");

  const res = await fetch("/settings/user", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (res.ok) {
    // Clear password fields after a successful save
    document.getElementById("current-password").value = "";
    document.getElementById("new-password").value = "";
    document.getElementById("confirm-password").value = "";
  }
  handleResponse(res, "User settings updated!");
}

/* ─────────────────── Helpers ─────────────────── */
async function handleResponse(res, successMsg) {
  if (res.ok) {
    showToast(successMsg, "success");
  } else {
    const data = await res.json().catch(() => ({}));
    showToast(data.message || "Something went wrong.", "error");
  }
}

function showToast(message, type = "info") {
  const colors = {
    success: "from-success-500 to-success-600",
    error: "from-red-500 to-red-600",
    warning: "from-yellow-500 to-yellow-600",
    info: "from-primary-500 to-primary-600",
  };
  const toast = document.createElement("div");
  toast.className = `glass-dark rounded-xl p-4 text-white font-medium transform transition-all duration-300 animate-slide-in border-l-4 bg-gradient-to-r ${
    colors[type] || colors.info
  }`;
  toast.textContent = message;

  const container = document.getElementById("toast-container");
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transform = "translateX(100%)";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

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
  wirePaymentMethods();

  // Fetch everything in parallel → toast on success/failure
  Promise.all([loadStoreSettings(), loadReceiptSettings(), loadUserSettings(), loadPaymentMethods()])
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

/* ─────────────────── Payment Methods ─────────────────── */
const paymentTypeConfig = {
  card: {
    label: "Card Payment",
    icon: "fa-credit-card",
    color: "bg-blue-500",
    fields: [
      { key: "publicKey", label: "Public Key", placeholder: "pk_..." },
      { key: "merchantId", label: "Merchant ID", placeholder: "Merchant ID" },
    ],
  },
  mobile_money: {
    label: "Mobile Money",
    icon: "fa-mobile-alt",
    color: "bg-green-500",
    fields: [
      { key: "provider", label: "Provider", placeholder: "e.g., MTN, Airtel" },
      { key: "countryCode", label: "Country Code", placeholder: "e.g., 254" },
    ],
  },
  paypal: {
    label: "PayPal",
    icon: "fa-paypal",
    color: "bg-blue-600",
    fields: [{ key: "clientId", label: "Client ID", placeholder: "PayPal Client ID" }],
  },
  mpesa_till: {
    label: "M-Pesa Till (Manual Verify)",
    icon: "fa-landmark",
    color: "bg-purple-500",
    fields: [
      { key: "tillNumber", label: "Till Number", placeholder: "e.g., 123456" },
      { key: "tillName", label: "Business Name (optional)", placeholder: "Your Business Name" },
    ],
  },
  mpesa_paybill: {
    label: "M-Pesa Paybill (C2B)",
    icon: "fa-university",
    color: "bg-purple-600",
    fields: [
      { key: "paybillNumber", label: "Paybill Number", placeholder: "123456" },
      { key: "accountNumber", label: "Account Number", placeholder: "Account Number" },
    ],
  },
  mpesa_stk: {
    label: "M-Pesa STK Push",
    icon: "fa-mobile",
    color: "bg-purple-700",
    fields: [
      { key: "consumerKey", label: "Consumer Key", placeholder: "Consumer Key from Daraja Portal" },
      { key: "consumerSecret", label: "Consumer Secret", placeholder: "Consumer Secret from Daraja Portal" },
      { key: "shortcode", label: "Shortcode", placeholder: "174379" },
      { key: "passkey", label: "Passkey", placeholder: "Passkey from Daraja Portal (LNM Online)" },
    ],
    advanced: true,
  },
  bank: {
    label: "Bank Transfer",
    icon: "fa-university",
    color: "bg-gray-500",
    fields: [
      { key: "bankName", label: "Bank Name", placeholder: "Bank Name" },
      { key: "accountNumber", label: "Account Number", placeholder: "Account Number" },
    ],
  },
};

function wirePaymentMethods() {
  const addBtn = document.getElementById("add-payment-method-btn");
  const modal = document.getElementById("payment-method-modal");
  const closeBtn = document.getElementById("close-payment-modal");
  const cancelBtn = document.getElementById("cancel-payment-btn");
  const form = document.getElementById("payment-method-form");
  const typeSelect = document.getElementById("payment-type");

  if (!addBtn) return;

  addBtn.addEventListener("click", () => {
    document.getElementById("modal-payment-title").textContent = "Add Payment Method";
    document.getElementById("payment-method-id").value = "";
    form.reset();
    document.getElementById("payment-config-section").classList.add("hidden");
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  });

  const closeModal = () => {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  };

  closeBtn.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", closeModal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  typeSelect.addEventListener("change", () => {
    const configSection = document.getElementById("payment-config-section");
    const configFields = document.getElementById("payment-config-fields");
    const type = typeSelect.value;

    if (paymentTypeConfig[type]) {
      configSection.classList.remove("hidden");
      configFields.innerHTML = paymentTypeConfig[type].fields
        .map(
          (field) => `
        <div class="space-y-1">
          <label class="block text-xs text-primary-500 dark:text-primary-400">${field.label}</label>
          <input type="text" name="${field.key}" class="input-premium" placeholder="${field.placeholder}">
        </div>
      `
        )
        .join("");
    } else {
      configSection.classList.add("hidden");
      configFields.innerHTML = "";
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("payment-method-id").value;
    const type = document.getElementById("payment-type").value;
    const provider = document.getElementById("payment-provider").value;
    const label = document.getElementById("payment-label").value;

    const config = {};
    const configSection = document.getElementById("payment-config-section");
    if (!configSection.classList.contains("hidden")) {
      const inputs = configSection.querySelectorAll('input[name]');
      inputs.forEach((input) => {
        if (input.value) config[input.name] = input.value;
      });
    }

    const payload = { type, provider, label, config: Object.keys(config).length > 0 ? config : undefined };

    try {
      let res;
      if (id) {
        res = await fetch(`/settings/payment-methods/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/settings/payment-methods", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (res.ok) {
        showToast(id ? "Payment method updated!" : "Payment method added!", "success");
        closeModal();
        loadPaymentMethods();
      } else {
        showToast(data.message || "Failed to save payment method", "error");
      }
    } catch (err) {
      showToast("An error occurred", "error");
    }
  });
}

async function loadPaymentMethods() {
  const list = document.getElementById("payment-methods-list");
  const noMethods = document.getElementById("no-payment-methods");
  if (!list) return;

  try {
    const res = await fetch("/settings/payment-methods", { credentials: "include" });
    const data = await res.json();

    if (!data.methods || data.methods.length === 0) {
      list.innerHTML = "";
      noMethods.classList.remove("hidden");
      return;
    }

    noMethods.classList.add("hidden");
    list.innerHTML = data.methods
      .map((method) => {
        const config = paymentTypeConfig[method.type] || {
          label: method.type,
          icon: "fa-credit-card",
          color: "bg-gray-500",
        };
        return `
        <div class="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-primary-800/30 border border-primary-100 dark:border-primary-700">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg ${config.color} flex items-center justify-center text-white">
              <i class="fas ${config.icon}"></i>
            </div>
            <div>
              <p class="text-sm font-bold text-primary-900 dark:text-white">${method.label || config.label}</p>
              <p class="text-xs text-primary-500 dark:text-primary-400">${method.provider || config.label}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="editPaymentMethod('${method._id}', '${method.type}', '${method.provider || ''}', '${method.label || ''}', ${JSON.stringify(method.config || {}).replace(/"/g, "&quot;")})" class="p-2 text-primary-400 hover:text-accent-500 transition-colors">
              <i class="fas fa-edit"></i>
            </button>
            <button onclick="deletePaymentMethod('${method._id}')" class="p-2 text-primary-400 hover:text-red-500 transition-colors">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      `;
      })
      .join("");
  } catch (err) {
    console.error("Failed to load payment methods:", err);
  }
}

window.editPaymentMethod = function (id, type, provider, label, config) {
  const modal = document.getElementById("payment-method-modal");
  document.getElementById("modal-payment-title").textContent = "Edit Payment Method";
  document.getElementById("payment-method-id").value = id;
  document.getElementById("payment-type").value = type;
  document.getElementById("payment-provider").value = provider;
  document.getElementById("payment-label").value = label;

  const configSection = document.getElementById("payment-config-section");
  const configFields = document.getElementById("payment-config-fields");

  if (paymentTypeConfig[type]) {
    configSection.classList.remove("hidden");
    configFields.innerHTML = paymentTypeConfig[type].fields
      .map((field) => {
        const value = config ? config[field.key] || "" : "";
        return `
        <div class="space-y-1">
          <label class="block text-xs text-primary-500 dark:text-primary-400">${field.label}</label>
          <input type="text" name="${field.key}" class="input-premium" placeholder="${field.placeholder}" value="${value}">
        </div>
      `;
      })
      .join("");
  }

  modal.classList.remove("hidden");
  modal.classList.add("flex");
};

window.deletePaymentMethod = async function (id) {
  if (!confirm("Are you sure you want to remove this payment method?")) return;

  try {
    const res = await fetch(`/settings/payment-methods/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json();
    if (res.ok) {
      showToast("Payment method removed", "success");
      loadPaymentMethods();
    } else {
      showToast(data.message || "Failed to remove payment method", "error");
    }
  } catch (err) {
    showToast("An error occurred", "error");
  }
};

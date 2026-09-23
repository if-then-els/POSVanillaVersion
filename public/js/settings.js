/*
 * Settings controller for SwiftPOS (production).
 * Tabs: Store | Receipts | Account | Payments.
 *
 * Security model (mirrors the backend):
 * - All requests send credentials (httpOnly cookie). A 401, or a 403
 *   carrying an auth/token message, means the session is dead -> redirect
 *   to login. Never rendered as a settings/subscription state.
 * - Store + Receipts + Payments management require admin/manager
 *   (backend enforces via authorize(); the UI disables forms for others).
 *   Payment-method create/update/delete require admin.
 * - The backend remains the source of truth; UI gating is for clarity.
 *
 * NOTE: window.showToast is provided by the inline script in settings.html
 * (dashboard-style). The local fallback below only runs if it is missing.
 */

/* global loadSidebar */

let currentUserRole = null;
let sessionDead = false;

document.addEventListener("DOMContentLoaded", init);

async function init() {
  if (typeof loadSidebar === "function") loadSidebar();

  wireTabs();
  wireLogoUpload();
  wireForms();
  wirePaymentMethods();
  wirePasswordToggles();

  // Identity first: gates the management tabs below.
  await fetchCurrentIdentity();
  if (sessionDead) return;

  applyRoleGating();

  const results = await Promise.allSettled([
    loadStoreSettings(),
    loadReceiptSettings(),
    loadUserSettings(),
    loadPaymentMethods(),
  ]);
  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length === 0) {
    notify("Settings loaded successfully!", "success");
  } else {
    console.error(failed.map((f) => f.reason));
    notify("Some settings could not be loaded.", "error");
  }
}

function notify(message, type = "info") {
  if (typeof window.showToast === "function") {
    window.showToast(message, type);
  } else {
    const container = document.getElementById("toast-container");
    if (container) {
      const el = document.createElement("div");
      el.className = "p-4 rounded-xl bg-primary-900 text-white text-sm";
      el.textContent = message;
      container.appendChild(el);
      setTimeout(() => el.remove(), 3000);
    } else {
      alert(message);
    }
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isSessionError(status, message) {
  if (status === 401) return true;
  if (status === 403) {
    return /token|auth|unauthorized|login|session|forbidden/i.test(
      String(message || "")
    );
  }
  return false;
}

function redirectToLogin() {
  sessionDead = true;
  window.location.href = "/login.html?session=expired";
}

async function readErrorMessage(response) {
  try {
    const data = await response.clone().json();
    return data.message || "";
  } catch (_) {
    try {
      return await response.text();
    } catch (__) {
      return "";
    }
  }
}

// Returns true when the session is dead (caller must stop).
async function handleSessionError(response) {
  const message = await readErrorMessage(response);
  if (isSessionError(response.status, message)) {
    redirectToLogin();
    return true;
  }
  return message;
}

/* ───────────────────────── Identity + gating ───────────────────────── */
async function fetchCurrentIdentity() {
  try {
    const res = await fetch("/userDetails", { credentials: "include" });
    if (!res.ok) {
      await handleSessionError(res); // redirects when the session is dead
      return false;
    }
    const data = await res.json();
    currentUserRole = data.user?.role || null;
    return true;
  } catch (err) {
    console.error("Failed to fetch current identity:", err);
    return false;
  }
}

function canManageSettings() {
  return currentUserRole === "admin" || currentUserRole === "manager";
}

function isAdmin() {
  return currentUserRole === "admin";
}

function applyRoleGating() {
  // Same data-requires-role convention used across the app.
  document.querySelectorAll("[data-requires-role]").forEach((el) => {
    const required = el
      .getAttribute("data-requires-role")
      .split(",")
      .map((s) => s.trim());
    el.style.display =
      currentUserRole && required.includes(currentUserRole) ? "" : "none";
  });

  // Read-only roles: disable management forms, keep values visible.
  if (!canManageSettings()) {
    ["store-settings-form", "receipt-settings-form"].forEach((id) => {
      const form = document.getElementById(id);
      if (!form) return;
      form.querySelectorAll("input, textarea, select, button").forEach((el) => {
        if (el.type !== "button") el.disabled = true;
      });
    });
    const notice = document.getElementById("settings-readonly-notice");
    if (notice) notice.classList.remove("hidden");
  }
}

/* ───────────────────────── Tabs (dual-mode via .active) ───────────────────────── */
function wireTabs() {
  const tabButtons = document.querySelectorAll(".tab-button");
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document
        .querySelectorAll(".tab-content")
        .forEach((c) => c.classList.add("hidden"));
      const target = btn.id.replace("tab-", "") + "-content";
      document.getElementById(target)?.classList.remove("hidden");
    });
  });
}

/* ─────────────────────── Logo upload ─────────────────────── */
const LOGO_MAX_BYTES = 1000000; // must match the backend multer limit
const LOGO_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

function wireLogoUpload() {
  document.getElementById("upload-logo-btn")?.addEventListener("click", () => {
    document.getElementById("store-logo")?.click();
  });
  document.getElementById("store-logo")?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) {
      notify("Logo must be a JPEG, PNG, GIF or WebP image.", "error");
      e.target.value = "";
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      notify("Logo must be 1MB or smaller.", "error");
      e.target.value = "";
      return;
    }
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
    ?.addEventListener("submit", saveStoreSettings);
  document
    .getElementById("receipt-settings-form")
    ?.addEventListener("submit", saveReceiptSettings);
  document
    .getElementById("user-settings-form")
    ?.addEventListener("submit", saveUserSettings);
}

function wirePasswordToggles() {
  document.querySelectorAll("[data-toggle-password]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(
        btn.getAttribute("data-toggle-password")
      );
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.querySelector("i")?.classList.toggle("fa-eye", !show);
      btn.querySelector("i")?.classList.toggle("fa-eye-slash", show);
    });
  });
}

/* ─────────────────── Load functions ─────────────────── */
async function loadStoreSettings() {
  const res = await fetch("/settings/store", { credentials: "include" });
  if (!res.ok) {
    const handled = await handleSessionError(res);
    if (handled === true) return;
    throw new Error(handled || "Store settings fetch failed");
  }
  const d = await res.json();
  // Backend keys are storeName/storeAddress/... (not name/address/...).
  document.getElementById("store-name").value = d.storeName || "";
  document.getElementById("store-address").value = d.storeAddress || "";
  document.getElementById("store-phone").value = d.storePhone || "";
  document.getElementById("store-email").value = d.storeEmail || "";
  document.getElementById("tax-rate").value = d.taxRate ?? "";
  document.getElementById("currency").value = d.currency || "KES";
  if (d.logoUrl) document.getElementById("logo-preview").src = d.logoUrl;
}

async function loadReceiptSettings() {
  const res = await fetch("/settings/receipt", { credentials: "include" });
  if (!res.ok) {
    const handled = await handleSessionError(res);
    if (handled === true) return;
    throw new Error(handled || "Receipt settings fetch failed");
  }
  const d = await res.json();
  document.getElementById("show-logo").checked = !!d.showLogo;
  document.getElementById("show-tax").checked = !!d.showTaxDetails;
  document.getElementById("include-contact").checked = !!d.includeContactInfo;
  document.getElementById("print-auto").checked = !!d.printAutomatically;
  document.getElementById("footer-text").value = d.footerText || "";
}

async function loadUserSettings() {
  const res = await fetch("/settings/user", { credentials: "include" });
  if (!res.ok) {
    const handled = await handleSessionError(res);
    if (handled === true) return;
    throw new Error(handled || "Profile fetch failed");
  }
  const d = await res.json();
  document.getElementById("user-name").value = d.name || "";
  document.getElementById("user-email").value = d.email || "";
  document.getElementById("user-phone").value = d.phone || "";
  const roleBadge = document.getElementById("user-role-badge");
  if (roleBadge) {
    roleBadge.textContent = d.role
      ? d.role.charAt(0).toUpperCase() + d.role.slice(1)
      : "";
  }
  if (d.mustChangePassword) {
    notify("An administrator reset your password - please set a new one.", "warning");
  }
}

/* ─────────────────── Save functions ─────────────────── */
function setSaving(btn, saving, label) {
  if (!btn) return;
  btn.disabled = saving;
  btn.classList.toggle("opacity-60", saving);
  btn.classList.toggle("cursor-not-allowed", saving);
  if (saving) {
    btn.dataset.label = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';
  } else if (label || btn.dataset.label) {
    btn.innerHTML = label || btn.dataset.label;
  }
}

async function saveStoreSettings(e) {
  e.preventDefault();
  if (!canManageSettings()) {
    notify("Only admins and managers can change store settings.", "error");
    return;
  }
  const email = document.getElementById("store-email").value.trim();
  const taxRaw = document.getElementById("tax-rate").value;
  const currency = document.getElementById("currency").value.trim().toUpperCase();

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    notify("Invalid store email address.", "error");
    return;
  }
  if (taxRaw !== "" && (!Number.isFinite(Number(taxRaw)) || Number(taxRaw) < 0 || Number(taxRaw) > 100)) {
    notify("Tax rate must be between 0 and 100.", "error");
    return;
  }
  if (currency && !/^[A-Z]{3}$/.test(currency)) {
    notify("Currency must be a 3-letter code (e.g. KES).", "error");
    return;
  }

  const btn = e.submitter || document.querySelector('#store-settings-form button[type="submit"]');
  setSaving(btn, true);
  try {
    const fd = new FormData();
    fd.append("name", document.getElementById("store-name").value.trim());
    fd.append("address", document.getElementById("store-address").value.trim());
    fd.append("phone", document.getElementById("store-phone").value.trim());
    fd.append("email", email);
    fd.append("taxRate", taxRaw);
    fd.append("currency", currency);
    const logoFile = document.getElementById("store-logo").files[0];
    if (logoFile) fd.append("logo", logoFile);

    const res = await fetch("/settings/store", {
      method: "PUT",
      credentials: "include",
      body: fd,
    });
    await handleSaveResponse(res, "Store settings saved!");
  } catch (err) {
    console.error(err);
    notify("Network error while saving store settings.", "error");
  } finally {
    setSaving(btn, false);
  }
}

async function saveReceiptSettings(e) {
  e.preventDefault();
  if (!canManageSettings()) {
    notify("Only admins and managers can change receipt settings.", "error");
    return;
  }
  const payload = {
    showLogo: document.getElementById("show-logo").checked,
    showTaxDetails: document.getElementById("show-tax").checked,
    includeContactInfo: document.getElementById("include-contact").checked,
    printAutomatically: document.getElementById("print-auto").checked,
    footerText: document.getElementById("footer-text").value,
  };
  const btn = e.submitter || document.querySelector('#receipt-settings-form button[type="submit"]');
  setSaving(btn, true);
  try {
    const res = await fetch("/settings/receipt", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    await handleSaveResponse(res, "Receipt settings saved!");
  } catch (err) {
    console.error(err);
    notify("Network error while saving receipt settings.", "error");
  } finally {
    setSaving(btn, false);
  }
}

async function saveUserSettings(e) {
  e.preventDefault();
  const name = document.getElementById("user-name").value.trim();
  const email = document.getElementById("user-email").value.trim();
  const phone = document.getElementById("user-phone").value.trim();
  const newPassword = document.getElementById("new-password").value;
  const confirmPassword = document.getElementById("confirm-password").value;
  const currentPassword = document.getElementById("current-password").value;

  const errorBox = document.getElementById("password-error");
  const errorMsg = document.getElementById("password-error-message");
  const fail = (msg) => {
    errorMsg.textContent = msg;
    errorBox.classList.remove("hidden");
  };

  if (!name) {
    fail("Name is required.");
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    fail("A valid email address is required.");
    return;
  }
  if (phone && !/[+\d][\d\s\-()]{6,}/.test(phone)) {
    fail("Invalid phone number.");
    return;
  }
  if (newPassword || confirmPassword) {
    if (!currentPassword) {
      fail("Enter your current password to set a new one.");
      return;
    }
    if (newPassword.length < 8) {
      fail("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      fail("Passwords do not match.");
      return;
    }
  }
  errorBox.classList.add("hidden");

  const payload = {
    name,
    email,
    phone,
    currentPassword: currentPassword || undefined,
    newPassword: newPassword || undefined,
    confirmPassword: confirmPassword || undefined,
  };

  const btn = e.submitter || document.querySelector('#user-settings-form button[type="submit"]');
  setSaving(btn, true);
  try {
    const res = await fetch("/settings/user", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const handled = await handleSessionError(res);
      if (handled === true) return;
      fail(handled || "Something went wrong.");
      return;
    }
    document.getElementById("current-password").value = "";
    document.getElementById("new-password").value = "";
    document.getElementById("confirm-password").value = "";
    notify("Profile updated!", "success");
  } catch (err) {
    console.error(err);
    notify("Network error while updating profile.", "error");
  } finally {
    setSaving(btn, false);
  }
}

async function handleSaveResponse(res, successMsg) {
  if (res.ok) {
    notify(successMsg, "success");
    return true;
  }
  const handled = await handleSessionError(res);
  if (handled === true) return false;
  notify(handled || "Something went wrong.", "error");
  return false;
}

/* ─────────────────── Payment Methods ─────────────────── */
const MASK_SENTINEL = "***MASKED***";

const paymentTypeConfig = {
  card: {
    label: "Card Payment",
    icon: "fa-credit-card",
    color: "bg-blue-500",
    fields: [
      { key: "publicKey", label: "Public Key", placeholder: "pk_...", secret: true },
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
    fields: [
      { key: "clientId", label: "Client ID", placeholder: "PayPal Client ID" },
      { key: "clientSecret", label: "Client Secret", placeholder: "PayPal secret", secret: true },
    ],
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
      { key: "consumerSecret", label: "Consumer Secret", placeholder: "Consumer Secret from Daraja Portal", secret: true },
      { key: "shortcode", label: "Shortcode", placeholder: "174379" },
      { key: "passkey", label: "Passkey", placeholder: "Passkey from Daraja Portal (LNM Online)", secret: true },
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

function secretDisplay(value) {
  if (!value) return '<span class="text-primary-300 dark:text-primary-600">not set</span>';
  if (value === MASK_SENTINEL) return '<span class="font-mono tracking-widest">••••••</span>';
  return `<span class="font-mono">${escapeHtml(String(value).slice(0, 4))}••••••</span>`;
}

function configSummary(method) {
  const config = method.config || {};
  const def = paymentTypeConfig[method.type];
  const keys = def ? def.fields.map((f) => f.key) : Object.keys(config);
  const shown = keys
    .filter((k) => config[k] !== undefined && config[k] !== "")
    .slice(0, 3)
    .map((k) => {
      const isSecret = /secret|passkey|password|token|private/i.test(k);
      return `<span class="inline-flex items-center gap-1 mr-2 mb-1 px-2 py-0.5 rounded-md bg-primary-100 dark:bg-primary-800 text-[11px] text-primary-600 dark:text-primary-300">${escapeHtml(k)}: ${isSecret ? secretDisplay(config[k]) : escapeHtml(String(config[k]).slice(0, 24))}</span>`;
    })
    .join("");
  return shown || '<span class="text-xs text-primary-400">No extra configuration</span>';
}

function wirePaymentMethods() {
  const addBtn = document.getElementById("add-payment-method-btn");
  const modal = document.getElementById("payment-method-modal");
  const closeBtn = document.getElementById("close-payment-modal");
  const cancelBtn = document.getElementById("cancel-payment-btn");
  const form = document.getElementById("payment-method-form");
  const typeSelect = document.getElementById("payment-type");

  if (!addBtn || !modal) return;

  addBtn.addEventListener("click", () => {
    if (!isAdmin()) {
      notify("Only administrators can add payment methods.", "error");
      return;
    }
    openPaymentMethodModal(null);
  });

  const closeModal = () => {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    document.body.style.overflow = "";
  };

  closeBtn?.addEventListener("click", closeModal);
  cancelBtn?.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  typeSelect?.addEventListener("change", () => renderConfigFields(typeSelect.value, {}));

  form?.addEventListener("submit", savePaymentMethod);
}

function openPaymentMethodModal(existing) {
  const modal = document.getElementById("payment-method-modal");
  const form = document.getElementById("payment-method-form");
  document.getElementById("modal-payment-title").textContent = existing
    ? "Edit Payment Method"
    : "Add Payment Method";
  document.getElementById("payment-method-id").value = existing?._id || "";
  form.reset();
  document.getElementById("payment-type").value = existing?.type || "";
  document.getElementById("payment-provider").value = existing?.provider || "";
  document.getElementById("payment-label").value = existing?.label || "";
  // Non-secret type changes are locked on edit (prevents type confusion).
  document.getElementById("payment-type").disabled = !!existing;
  renderConfigFields(existing?.type || "", existing?.config || {});
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  document.body.style.overflow = "hidden";
}

function renderConfigFields(type, values) {
  const configSection = document.getElementById("payment-config-section");
  const configFields = document.getElementById("payment-config-fields");
  if (!configSection || !configFields) return;
  if (paymentTypeConfig[type]) {
    configSection.classList.remove("hidden");
    configFields.innerHTML = paymentTypeConfig[type].fields
      .map(
        (field) => `
        <div class="space-y-1">
          <label class="block text-xs text-primary-500 dark:text-primary-400">${escapeHtml(field.label)}${field.secret ? ' <span class="text-warning-500" title="Stored securely, never shown in full">·secret</span>' : ""}</label>
          <input type="text" name="${escapeHtml(field.key)}" class="input-premium" placeholder="${escapeHtml(field.placeholder)}" value="${escapeHtml(values?.[field.key] || "")}">
        </div>
      `
      )
      .join("");
  } else {
    configSection.classList.add("hidden");
    configFields.innerHTML = "";
  }
}

async function savePaymentMethod(e) {
  e.preventDefault();
  if (!isAdmin()) {
    notify("Only administrators can save payment methods.", "error");
    return;
  }
  const id = document.getElementById("payment-method-id").value;
  const type = document.getElementById("payment-type").value;
  const provider = document.getElementById("payment-provider").value.trim();
  const label = document.getElementById("payment-label").value.trim();

  if (!type) {
    notify("Select a payment type.", "error");
    return;
  }
  if (!label) {
    notify("A display label is required.", "error");
    return;
  }

  const config = {};
  const configSection = document.getElementById("payment-config-section");
  if (configSection && !configSection.classList.contains("hidden")) {
    configSection.querySelectorAll("input[name]").forEach((input) => {
      if (input.value) config[input.name] = input.value;
    });
  }

  // Editing sends masked sentinels back for untouched secrets - the backend
  // keeps the stored value for those keys.
  const payload = { type, provider, label, config };

  try {
    const url = id ? `/settings/payment-methods/${id}` : "/settings/payment-methods";
    const res = await fetch(url, {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const handled = await handleSessionError(res);
      if (handled === true) return;
      notify(data.message || handled || "Failed to save payment method", "error");
      return;
    }
    notify(id ? "Payment method updated!" : "Payment method added!", "success");
    document.getElementById("payment-type").disabled = false;
    document.getElementById("payment-method-modal").classList.add("hidden");
    document.getElementById("payment-method-modal").classList.remove("flex");
    document.body.style.overflow = "";
    loadPaymentMethods();
  } catch (err) {
    console.error(err);
    notify("Network error while saving payment method.", "error");
  }
}

async function loadPaymentMethods() {
  const list = document.getElementById("payment-methods-list");
  const noMethods = document.getElementById("no-payment-methods");
  if (!list) return;

  list.innerHTML = `
    <div class="p-6 text-center text-primary-400 text-sm">
      <i class="fas fa-circle-notch fa-spin mr-2"></i>Loading payment methods...
    </div>`;
  try {
    const res = await fetch("/settings/payment-methods", { credentials: "include" });
    if (!res.ok) {
      const handled = await handleSessionError(res);
      if (handled === true) return;
      throw new Error(handled || "Failed to load payment methods");
    }
    const data = await res.json();

    if (!data.methods || data.methods.length === 0) {
      list.innerHTML = "";
      noMethods?.classList.remove("hidden");
      return;
    }

    noMethods?.classList.add("hidden");
    list.innerHTML = data.methods
      .map((method) => {
        const config = paymentTypeConfig[method.type] || {
          label: method.type,
          icon: "fa-credit-card",
          color: "bg-gray-500",
        };
        return `
        <div class="p-4 rounded-xl bg-white dark:bg-primary-800/30 border border-primary-100 dark:border-primary-700">
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg ${config.color} flex items-center justify-center text-white shrink-0">
                <i class="fas ${config.icon}"></i>
              </div>
              <div>
                <p class="text-sm font-bold text-primary-900 dark:text-white">${escapeHtml(method.label || config.label)}</p>
                <p class="text-xs text-primary-500 dark:text-primary-400">${escapeHtml(method.provider || config.label)} · ${escapeHtml(method.type)}</p>
              </div>
            </div>
            ${
              isAdmin()
                ? `<div class="flex items-center gap-1">
                    <button data-edit-method="${escapeHtml(method._id)}" class="p-2 text-primary-500 hover:text-accent-500 dark:text-primary-400 dark:hover:text-accent-400 transition-colors" title="Edit">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button data-delete-method="${escapeHtml(method._id)}" data-method-label="${escapeHtml(method.label || method.type)}" class="p-2 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors" title="Remove">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>`
                : ""
            }
          </div>
          <div class="mt-3">${configSummary(method)}</div>
        </div>
      `;
      })
      .join("");

    list.querySelectorAll("[data-edit-method]").forEach((btn) => {
      btn.addEventListener("click", () => editPaymentMethod(btn.getAttribute("data-edit-method")));
    });
    list.querySelectorAll("[data-delete-method]").forEach((btn) => {
      btn.addEventListener("click", () =>
        askDeletePaymentMethod(
          btn.getAttribute("data-delete-method"),
          btn.getAttribute("data-method-label")
        )
      );
    });
  } catch (err) {
    console.error("Failed to load payment methods:", err);
    list.innerHTML = `
      <div class="p-6 text-center text-sm">
        <p class="font-semibold text-red-600 dark:text-red-400">Could not load payment methods.</p>
        <button data-retry-payments class="mt-2 px-4 py-2 text-xs font-bold rounded-lg bg-white dark:bg-primary-800 border border-primary-200 dark:border-primary-700">Retry</button>
      </div>`;
    list.querySelector("[data-retry-payments]")?.addEventListener("click", loadPaymentMethods);
  }
}

async function editPaymentMethod(id) {
  try {
    // Full config (including secrets) comes from the admin-only endpoint.
    const res = await fetch(`/settings/payment-methods/${id}`, {
      credentials: "include",
    });
    if (!res.ok) {
      const handled = await handleSessionError(res);
      if (handled === true) return;
      notify(handled || "Failed to load payment method", "error");
      return;
    }
    const data = await res.json();
    const method = data.method;
    const rawConfig =
      method.config instanceof Object && !(method.config instanceof Array)
        ? method.config
        : {};
    // Secrets arrive masked - send the sentinel back untouched and the
    // backend keeps the stored value.
    openPaymentMethodModal({ ...method, config: rawConfig });
  } catch (err) {
    console.error(err);
    notify("Network error while loading payment method.", "error");
  }
}

let pendingDeleteMethodId = null;

function askDeletePaymentMethod(id, label) {
  pendingDeleteMethodId = id;
  const nameEl = document.getElementById("delete-method-name");
  if (nameEl) nameEl.textContent = label || "this payment method";
  document.getElementById("delete-method-modal")?.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeDeleteMethodModal() {
  pendingDeleteMethodId = null;
  document.getElementById("delete-method-modal")?.classList.add("hidden");
  document.body.style.overflow = "";
}

async function confirmDeletePaymentMethod() {
  if (!pendingDeleteMethodId) return;
  try {
    const res = await fetch(`/settings/payment-methods/${pendingDeleteMethodId}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const handled = await handleSessionError(res);
      if (handled === true) return;
      notify(data.message || handled || "Failed to remove payment method", "error");
      return;
    }
    notify("Payment method removed", "success");
    closeDeleteMethodModal();
    loadPaymentMethods();
  } catch (err) {
    console.error(err);
    notify("Network error while removing payment method.", "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("cancel-delete-method")
    ?.addEventListener("click", closeDeleteMethodModal);
  document
    .getElementById("delete-method-backdrop")
    ?.addEventListener("click", closeDeleteMethodModal);
  document
    .getElementById("confirm-delete-method")
    ?.addEventListener("click", confirmDeletePaymentMethod);
});

/**
 * Inventory management - production controller.
 * Store-scoped stock: every product row optionally belongs to a store;
 * transfers move qty between store rows, disposals/losses write stock off
 * (admin only) into an auditable ledger, compare/sync keep branches aligned.
 *
 * Security model (mirrors the backend):
 * - credentials:include everywhere; 401 (or 403 with an auth message) means
 *   a dead session -> redirect to login.
 * - UI gating by role from /userDetails: admin = everything (dispose, sync,
 *   delete); manager = add/edit/transfer/delete (no dispose/sync, no admin
 *   row edits of other admins - backend enforces); inventory = add/edit;
 *   cashier = read-only. Backend re-enforces all of this.
 */

let currentProduct = null;
let products = [];
let myStores = [];
let currentUserRole = null;
let currentUserId = null;
let sessionDead = false;
let movPage = 1;

/* ─────────────── utilities ─────────────── */
function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function notify(message, type = "info") {
  if (typeof window.showToast === "function") window.showToast(message, type);
  else console.log(`[${type}] ${message}`);
}

function isSessionError(status, message) {
  if (status === 401) return true;
  if (status === 403) {
    return /token|auth|unauthorized|login|session|forbidden/i.test(String(message || ""));
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

// false = ok to continue; true = session dead (already redirecting).
async function guardSession(response) {
  const message = await readErrorMessage(response);
  if (isSessionError(response.status, message)) {
    redirectToLogin();
    return { dead: true };
  }
  return { dead: false, message };
}

function formatCurrency(number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "KES",
  }).format(Number(number) || 0);
}

function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

function storeNameOf(p) {
  if (p.store && typeof p.store === "object") return p.store.name || "Default";
  const found = myStores.find((s) => String(s._id) === String(p.store));
  return found ? found.name : "Default";
}

function storeIdOf(p) {
  if (p.store && typeof p.store === "object") return p.store._id;
  return p.store || "";
}

/* ─────────────── identity + gating ─────────────── */
function canWrite() {
  return ["admin", "manager", "inventory"].includes(currentUserRole);
}
function canDelete() {
  return ["admin", "manager"].includes(currentUserRole);
}
function canTransfer() {
  return ["admin", "manager"].includes(currentUserRole);
}
function isAdmin() {
  return currentUserRole === "admin";
}

async function fetchIdentity() {
  try {
    const res = await fetch("/userDetails", { credentials: "include" });
    if (!res.ok) {
      await guardSession(res);
      return false;
    }
    const data = await res.json();
    currentUserId = data.user?.id || null;
    currentUserRole = data.user?.role || null;
    applyRoleGating();
    return true;
  } catch (err) {
    console.error("Identity check failed:", err);
    return false;
  }
}

function applyRoleGating() {
  document.querySelectorAll("[data-requires-role]").forEach((el) => {
    const required = el.getAttribute("data-requires-role").split(",").map((s) => s.trim());
    el.style.display = currentUserRole && required.includes(currentUserRole) ? "" : "none";
  });
  if (!canWrite()) {
    document.getElementById("inventory-readonly-notice")?.classList.remove("hidden");
  }
}

/* ─────────────── stores ─────────────── */
async function loadStores() {
  try {
    const res = await fetch("/api/stores", { credentials: "include" });
    if (!res.ok) {
      const g = await guardSession(res);
      if (!g.dead) console.error("Failed to load stores:", g.message);
      return;
    }
    const data = await res.json();
    myStores = data.stores || [];
  } catch (err) {
    console.error("Failed to load stores:", err);
    myStores = [];
  }
  const opts = (first) =>
    `<option value="">${first}</option>` +
    myStores.map((s) => `<option value="${esc(s._id)}">${esc(s.name)}</option>`).join("");
  const sel = document.getElementById("product-store");
  if (sel) sel.innerHTML = opts("Default");
  const filter = document.getElementById("storeFilter");
  if (filter) {
    const prev = filter.value;
    filter.innerHTML = opts("All stores");
    if ([...filter.options].some((o) => o.value === prev)) filter.value = prev;
  }
  const toSel = document.getElementById("transfer-to-store");
  if (toSel) toSel.innerHTML = opts("Select destination…");
  const movStore = document.getElementById("mov-store");
  if (movStore) movStore.innerHTML = opts("All stores");
  renderComparePicker();
  renderSyncTargets();
}

/* ─────────────── products ─────────────── */
async function loadProducts() {
  try {
    const storeFilter = document.getElementById("storeFilter")?.value || "";
    const params = new URLSearchParams();
    if (storeFilter) params.set("store", storeFilter);
    const response = await fetch(`/getInventory?${params}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    if (!response.ok) {
      const g = await guardSession(response);
      if (g.dead) return;
      if (response.status === 404) {
        products = [];
      } else {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || `Failed to load inventory (${response.status})`);
      }
    } else {
      const data = await response.json();
      products = (data.products || []).map((item) => ({
        _id: item._id,
        productName: item.productName || item.name,
        productBatchNumber: item.productBatchNumber || item.sku,
        productPrice: item.productPrice ?? item.price,
        productQuantity: item.productQuantity ?? item.quantity,
        productDescription: item.productDescription || item.description,
        productCategory: item.productCategory || "",
        sku: item.sku || "",
        barcode: item.barcode || "",
        costPrice: item.costPrice ?? null,
        reorderLevel: item.reorderLevel ?? 5,
        expiryDate: item.expiryDate || null,
        supplier: item.supplier || null,
        store: item.store || null,
      }));
    }
    try {
      const v = await fetch(
        "/inventory/valuation?store=" + encodeURIComponent(storeFilter),
        { credentials: "include" }
      ).then((r) => (r.ok ? r.json() : null));
      if (v && v.totalValueWAC !== undefined) {
        const el = document.getElementById("valuationWAC");
        if (el) el.textContent = "KES " + Number(v.totalValueWAC).toLocaleString();
        const lowEl = document.getElementById("kpiLowStock");
        if (lowEl) lowEl.textContent = v.lowStockCount + " items";
      }
    } catch {}
  } catch (error) {
    console.error("Error loading inventory data:", error);
    products = [];
    notify(error.message || "Failed to load inventory", "error");
  }

  const productsCount = document.getElementById("products-count");
  if (productsCount) {
    productsCount.textContent = `${products.length} products in inventory`;
  }

  const searchTerm = document.getElementById("inventory-search")?.value.toLowerCase() || "";
  const filteredProducts = products.filter(
    (product) =>
      (product.productName || "").toLowerCase().includes(searchTerm) ||
      (product.productBatchNumber || "").toLowerCase().includes(searchTerm)
  );

  const lowStockProducts = filteredProducts.filter(
    (product) => Number(product.productQuantity) < 10
  );

  renderProductsTable(filteredProducts);
  renderLowStockTable(lowStockProducts);
}

function actionButtons(p, withCheckbox) {
  const writable = canWrite();
  const parts = [];
  if (writable) {
    parts.push(`<button class="edit-product-btn p-1 rounded-md text-primary-500 hover:bg-primary-100 dark:text-primary-400 dark:hover:bg-primary-800" data-id="${esc(p._id)}" title="Edit"><i class="fas fa-edit"></i></button>`);
  }
  if (canTransfer()) {
    parts.push(`<button class="transfer-product-btn p-1 rounded-md text-accent-500 hover:bg-accent-50 dark:hover:bg-accent-900/20" data-id="${esc(p._id)}" title="Transfer to another store"><i class="fas fa-exchange-alt"></i></button>`);
  }
  if (isAdmin()) {
    parts.push(`<button class="dispose-product-btn p-1 rounded-md text-warning-600 hover:bg-warning-50 dark:text-warning-400 dark:hover:bg-warning-900/20" data-id="${esc(p._id)}" title="Dispose / mark as loss"><i class="fas fa-trash-restore"></i></button>`);
  }
  if (canDelete()) {
    parts.push(`<button class="delete-product-btn p-1 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" data-id="${esc(p._id)}" title="Delete"><i class="fas fa-trash"></i></button>`);
  }
  if (!parts.length) return '<span class="text-xs text-primary-400">—</span>';
  return `<div class="flex space-x-1">${parts.join("")}</div>`;
}

function productRow(p, showCheckbox) {
  return `
  <tr class="hover:bg-primary-50/60 dark:hover:bg-white/5 transition-colors">
    ${showCheckbox ? `<td class="px-6 py-4"><input type="checkbox" class="product-checkbox" data-id="${esc(p._id)}" /></td>` : ""}
    <td class="px-6 py-4 font-medium">${esc(p.productName)}</td>
    <td class="px-6 py-4 text-xs text-primary-500 dark:text-primary-400">${esc(p.productBatchNumber)}</td>
    <td class="px-6 py-4">${formatCurrency(p.productPrice)}</td>
    <td class="px-6 py-4 ${Number(p.productQuantity) < 10 ? "text-red-500 font-bold" : ""}">${esc(p.productQuantity)}</td>
    <td class="px-6 py-4"><span class="px-2.5 py-1 rounded-full text-xs font-bold bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300">${esc(storeNameOf(p))}</span></td>
    <td class="px-6 py-4">${actionButtons(p)}</td>
  </tr>`;
}

function renderProductsTable(list) {
  const el = document.getElementById("products-table");
  if (!el) return;
  el.innerHTML = list.length
    ? list.map((p) => productRow(p, true)).join("")
    : `<tr><td colspan="7" class="px-6 py-8 text-center text-primary-400">No products found${document.getElementById("storeFilter")?.value ? " in this store" : ""}</td></tr>`;
}

function renderLowStockTable(list) {
  const el = document.getElementById("low-stock-table");
  if (!el) return;
  el.innerHTML = list.length
    ? list.map((p) => productRow(p, false)).join("")
    : `<tr><td colspan="6" class="px-6 py-8 text-center text-primary-400">No low stock products found</td></tr>`;
}

function handleProductTableClick(event) {
  const target = event.target.closest("button");
  if (!target) return;
  const id = target.dataset.id;
  if (target.classList.contains("edit-product-btn")) openEditModal(id);
  else if (target.classList.contains("delete-product-btn")) askDelete(id, false);
  else if (target.classList.contains("transfer-product-btn")) openTransferModal(id);
  else if (target.classList.contains("dispose-product-btn")) openDisposeModal(id);
}

/* ─────────────── add / edit ─────────────── */
function handleAddProduct() {
  if (!canWrite()) {
    notify("Your role cannot add products.", "error");
    return;
  }
  document.getElementById("product-form").reset();
  hideFormError();
  document.getElementById("modal-title").textContent = "Add Product";
  currentProduct = null;
  document.getElementById("product-modal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function hideFormError() {
  document.getElementById("form-error")?.classList.add("hidden");
}

function openEditModal(productId) {
  currentProduct = products.find((p) => String(p._id) === String(productId));
  if (!currentProduct) return;
  const p = currentProduct;
  document.getElementById("product-name").value = p.productName || "";
  document.getElementById("product-description").value = p.productDescription || "";
  document.getElementById("product-sku").value = p.productBatchNumber || "";
  document.getElementById("product-price").value = p.productPrice ?? "";
  document.getElementById("product-quantity").value = p.productQuantity ?? "";
  document.getElementById("product-category").value = p.productCategory || "";
  document.getElementById("product-sku2").value = p.sku || "";
  document.getElementById("product-barcode").value = p.barcode || "";
  document.getElementById("product-cost").value = p.costPrice ?? "";
  document.getElementById("product-reorder").value = p.reorderLevel ?? 5;
  document.getElementById("product-expiry").value = p.expiryDate ? new Date(p.expiryDate).toISOString().slice(0, 10) : "";
  document.getElementById("product-store").value = storeIdOf(p) || "";
  document.getElementById("product-supplier").value = p.supplier?._id || p.supplier || "";
  document.getElementById("modal-title").textContent = "Edit Product";
  hideFormError();
  document.getElementById("product-modal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeProductModal() {
  document.getElementById("product-modal").classList.add("hidden");
  document.body.style.overflow = "";
}

async function handleProductFormSubmit(event) {
  event.preventDefault();
  const productData = {
    productName: document.getElementById("product-name").value.trim(),
    productDescription: document.getElementById("product-description").value.trim(),
    productBatchNumber: document.getElementById("product-sku").value.trim(),
    productPrice: parseFloat(document.getElementById("product-price").value),
    productQuantity: parseInt(document.getElementById("product-quantity").value, 10),
    productCategory: document.getElementById("product-category").value.trim(),
    sku: document.getElementById("product-sku2")?.value.trim() || undefined,
    barcode: document.getElementById("product-barcode")?.value.trim() || undefined,
    costPrice: document.getElementById("product-cost")?.value ? parseFloat(document.getElementById("product-cost").value) : undefined,
    reorderLevel: document.getElementById("product-reorder")?.value ? parseInt(document.getElementById("product-reorder").value, 10) : undefined,
    expiryDate: document.getElementById("product-expiry")?.value || undefined,
    store: document.getElementById("product-store")?.value || undefined,
    supplier: document.getElementById("product-supplier")?.value || undefined,
  };
  Object.keys(productData).forEach((k) => productData[k] === undefined && delete productData[k]);

  const formError = document.getElementById("form-error");
  const fail = (msg) => {
    formError.querySelector("span").textContent = msg;
    formError.classList.remove("hidden");
  };
  if (!productData.productName) return fail("Product Name is required.");
  if (!productData.productBatchNumber) return fail("Product Batch Number (SKU) is required.");
  if (!Number.isFinite(productData.productPrice) || productData.productPrice <= 0) return fail("Price must be a positive number.");
  if (!Number.isInteger(productData.productQuantity) || productData.productQuantity < 0) return fail("Quantity must be a non-negative integer.");
  if (!productData.productCategory) return fail("Category is required.");

  try {
    const isEdit = !!(currentProduct && currentProduct._id);
    const url = isEdit ? `/updateInventory/${currentProduct._id}` : "/addInventory";
    const response = await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(productData),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const g = await guardSession(response);
      if (g.dead) return;
      fail(data.message || g.message || "Failed to save product.");
      return;
    }
    notify(isEdit ? `Updated ${productData.productName}` : `Added ${productData.productName}`, "success");
    closeProductModal();
    loadProducts();
  } catch (error) {
    console.error("Product form submission error:", error);
    fail("Network error while saving. Please retry.");
  }
}

/* ─────────────── delete (single + bulk via one modal) ─────────────── */
let pendingDeleteIds = [];

function askDelete(id, isBulk, ids) {
  pendingDeleteIds = isBulk ? ids : [id];
  const label = isBulk
    ? `${ids.length} selected product(s)`
    : `"${(products.find((p) => String(p._id) === String(id)) || {}).productName || "this product"}"`;
  document.getElementById("delete-confirmation-text").textContent =
    `Are you sure you want to delete ${label}? This action cannot be undone.`;
  document.getElementById("delete-modal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeDeleteModal() {
  pendingDeleteIds = [];
  document.getElementById("delete-modal").classList.add("hidden");
  document.body.style.overflow = "";
}

async function confirmDelete() {
  if (!pendingDeleteIds.length) return closeDeleteModal();
  try {
    let response;
    if (pendingDeleteIds.length === 1) {
      response = await fetch(`/deleteInventory/${pendingDeleteIds[0]}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
    } else {
      response = await fetch("/bulkDelete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids: pendingDeleteIds }),
      });
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const g = await guardSession(response);
      if (g.dead) return;
      notify(data.message || "Failed to delete.", "error");
      return;
    }
    notify(data.message || "Deleted successfully.", "success");
    closeDeleteModal();
    loadProducts();
  } catch (error) {
    console.error("Delete error:", error);
    notify("Network error while deleting.", "error");
  }
}

/* ─────────────── transfer between stores ─────────────── */
function openTransferModal(productId) {
  const p = products.find((x) => String(x._id) === String(productId));
  if (!p) return;
  currentProduct = p;
  document.getElementById("transfer-product-name").textContent = p.productName;
  document.getElementById("transfer-from-store").textContent = storeNameOf(p);
  document.getElementById("transfer-available").textContent = `Available: ${p.productQuantity}`;
  const toSel = document.getElementById("transfer-to-store");
  const fromId = storeIdOf(p);
  [...toSel.options].forEach((o) => {
    o.disabled = o.value !== "" && o.value === String(fromId);
  });
  toSel.value = "";
  document.getElementById("transfer-qty").value = "";
  document.getElementById("transfer-modal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeTransferModal() {
  document.getElementById("transfer-modal").classList.add("hidden");
  document.body.style.overflow = "";
}

async function submitTransfer(e) {
  e.preventDefault();
  const toStore = document.getElementById("transfer-to-store").value;
  const qty = Math.floor(Number(document.getElementById("transfer-qty").value));
  if (!toStore) {
    notify("Select a destination store.", "error");
    return;
  }
  if (!Number.isFinite(qty) || qty <= 0) {
    notify("Enter a positive quantity.", "error");
    return;
  }
  try {
    const res = await fetch("/inventory/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ productId: currentProduct._id, toStore, quantity: qty }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const g = await guardSession(res);
      if (g.dead) return;
      notify(data.message || g.message || "Transfer failed.", "error");
      return;
    }
    notify(data.message, "success");
    closeTransferModal();
    loadProducts();
  } catch (err) {
    console.error(err);
    notify("Network error during transfer.", "error");
  }
}

/* ─────────────── dispose / loss (admin) ─────────────── */
function openDisposeModal(productId) {
  const p = products.find((x) => String(x._id) === String(productId));
  if (!p) return;
  currentProduct = p;
  document.getElementById("dispose-product-name").textContent = `${p.productName} (${storeNameOf(p)})`;
  document.getElementById("dispose-available").textContent = `On hand: ${p.productQuantity}`;
  document.getElementById("dispose-qty").value = "";
  document.getElementById("dispose-reason").value = "";
  document.getElementById("dispose-modal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeDisposeModal() {
  document.getElementById("dispose-modal").classList.add("hidden");
  document.body.style.overflow = "";
}

async function submitDispose(e) {
  e.preventDefault();
  const kind = document.querySelector('input[name="dispose-kind"]:checked')?.value;
  const qty = Math.floor(Number(document.getElementById("dispose-qty").value));
  const reason = document.getElementById("dispose-reason").value.trim();
  if (!["disposal", "loss"].includes(kind)) {
    notify("Choose disposal or loss.", "error");
    return;
  }
  if (!Number.isFinite(qty) || qty <= 0) {
    notify("Enter a positive quantity.", "error");
    return;
  }
  if (!reason) {
    notify("A reason is required for audit purposes.", "error");
    return;
  }
  try {
    const res = await fetch("/inventory/dispose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ productId: currentProduct._id, quantity: qty, kind, reason }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const g = await guardSession(res);
      if (g.dead) return;
      notify(data.message || g.message || "Failed to record.", "error");
      return;
    }
    notify(data.message, "success");
    closeDisposeModal();
    loadProducts();
    loadMovements();
  } catch (err) {
    console.error(err);
    notify("Network error.", "error");
  }
}

/* ─────────────── compare stores ─────────────── */
function renderComparePicker() {
  const box = document.getElementById("compare-stores");
  if (!box) return;
  if (!myStores.length) {
    box.innerHTML = '<p class="text-xs text-primary-400">No stores yet - add stores first.</p>';
    return;
  }
  box.innerHTML = myStores
    .map(
      (s) => `<label class="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-primary-200 dark:border-primary-700 text-sm font-semibold cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-800">
        <input type="checkbox" class="compare-store-check w-4 h-4 accent-sky-500" value="${esc(s._id)}" /> ${esc(s.name)}
      </label>`
    )
    .join("");
}

async function runCompare() {
  const ids = [...document.querySelectorAll(".compare-store-check:checked")].map((c) => c.value);
  const out = document.getElementById("compare-results");
  if (ids.length < 2) {
    notify("Select at least two stores to compare.", "warning");
    return;
  }
  out.innerHTML = '<p class="text-sm text-primary-400 py-6 text-center"><i class="fas fa-spinner fa-spin mr-2"></i>Comparing stores…</p>';
  try {
    const res = await fetch(`/inventory/compare?stores=${ids.map(encodeURIComponent).join(",")}`, {
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const g = await guardSession(res);
      if (g.dead) return;
      throw new Error(data.message || g.message || "Compare failed");
    }
    const storeIds = data.stores.map((s) => String(s.storeId));
    out.innerHTML = `
      <div class="grid grid-cols-2 lg:grid-cols-${Math.min(4, data.stores.length)} gap-3 mb-6">
        ${data.stores.map((s) => `
          <div class="glass-card rounded-2xl p-4">
            <p class="font-black text-sm">${esc(s.name)}</p>
            <p class="text-[11px] text-primary-400">${esc(s.location || "")}</p>
            <div class="mt-2 text-xs space-y-1">
              <p>Products: <b>${s.products}</b></p>
              <p>Units: <b>${s.units.toLocaleString()}</b></p>
              <p>Value: <b>KES ${Number(s.stockValue).toLocaleString()}</b></p>
              <p class="${s.lowStock ? "text-amber-600 font-bold" : ""}">Low stock: <b>${s.lowStock}</b></p>
            </div>
          </div>`).join("")}
      </div>
      <div class="overflow-x-auto rounded-xl border border-primary-200/50 dark:border-primary-700/50">
        <table class="w-full text-left text-sm">
          <thead class="bg-primary-50/80 dark:bg-primary-800/50">
            <tr><th class="px-4 py-3">Product</th>
              ${data.stores.map((s) => `<th class="px-4 py-3 text-right">${esc(s.name)}</th>`).join("")}
              <th class="px-4 py-3 text-right">Total</th></tr>
          </thead>
          <tbody class="divide-y">
            ${data.matrix.slice(0, 100).map((r) => `
              <tr>
                <td class="px-4 py-2.5 font-medium">${esc(r.name)}<div class="text-[11px] text-primary-400">${esc(r.batch)}</div></td>
                ${storeIds.map((sid) => `<td class="px-4 py-2.5 text-right">${r.perStore[sid] || 0}</td>`).join("")}
                <td class="px-4 py-2.5 text-right font-bold">${r.total}</td>
              </tr>`).join("") || '<tr><td class="px-4 py-6 text-center text-primary-400">No shared products</td></tr>'}
          </tbody>
        </table>
      </div>`;
  } catch (err) {
    console.error(err);
    out.innerHTML = `<p class="text-sm text-red-500 py-6 text-center">${esc(err.message)}</p>`;
  }
}

/* ─────────────── sync catalog (admin) ─────────────── */
function renderSyncTargets() {
  const box = document.getElementById("sync-targets");
  if (!box) return;
  box.innerHTML = myStores.length
    ? myStores.map(
        (s) => `<label class="flex items-center gap-2 px-3 py-2 rounded-xl border border-primary-200 dark:border-primary-700 text-sm cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-800">
          <input type="checkbox" class="sync-target-check w-4 h-4 accent-sky-500" value="${esc(s._id)}" /> ${esc(s.name)}
        </label>`
      ).join("")
    : '<p class="text-xs text-primary-400">No stores yet.</p>';
  const src = document.getElementById("sync-source");
  if (src) {
    src.innerHTML = '<option value="">Select source…</option>' + myStores.map((s) => `<option value="${esc(s._id)}">${esc(s.name)}</option>`).join("");
  }
}

async function submitSync(e) {
  e.preventDefault();
  const sourceStore = document.getElementById("sync-source").value;
  const targets = [...document.querySelectorAll(".sync-target-check:checked")]
    .map((c) => c.value)
    .filter((v) => v !== sourceStore);
  if (!sourceStore) {
    notify("Select a source store.", "error");
    return;
  }
  if (!targets.length) {
    notify("Select at least one target store.", "error");
    return;
  }
  try {
    const res = await fetch("/inventory/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ sourceStore, targetStores: targets }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const g = await guardSession(res);
      if (g.dead) return;
      notify(data.message || g.message || "Sync failed.", "error");
      return;
    }
    notify(data.message, "success");
    document.getElementById("sync-modal").classList.add("hidden");
    document.body.style.overflow = "";
    loadProducts();
  } catch (err) {
    console.error(err);
    notify("Network error during sync.", "error");
  }
}

/* ─────────────── movements ledger ─────────────── */
async function loadMovements() {
  const body = document.getElementById("movements-table");
  if (!body) return;
  const params = new URLSearchParams({ page: movPage, limit: 15 });
  const store = document.getElementById("mov-store")?.value;
  const kind = document.getElementById("mov-kind")?.value;
  const from = document.getElementById("mov-from")?.value;
  const to = document.getElementById("mov-to")?.value;
  if (store) params.set("store", store);
  if (kind) params.set("kind", kind);
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  body.innerHTML = '<tr><td colspan="7" class="px-6 py-8 text-center text-primary-400"><i class="fas fa-spinner fa-spin mr-2"></i>Loading…</td></tr>';
  try {
    const res = await fetch(`/inventory/movements?${params}`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const g = await guardSession(res);
      if (g.dead) return;
      throw new Error(data.message || g.message || "Failed to load movements");
    }
    const kindBadge = (k) =>
      ({
        disposal: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
        loss: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
        transfer_out: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
        transfer_in: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
        adjustment: "bg-primary-100 text-primary-700 dark:bg-primary-800 dark:text-primary-300",
      }[k] || "bg-primary-100 text-primary-700");
    body.innerHTML = data.movements.length
      ? data.movements.map((m) => `
        <tr class="hover:bg-primary-50/60 dark:hover:bg-white/5 transition-colors">
          <td class="px-4 py-3 text-xs whitespace-nowrap">${new Date(m.createdAt).toLocaleString()}</td>
          <td class="px-4 py-3 font-medium">${esc(m.product?.productName || "—")}<div class="text-[11px] text-primary-400">${esc(m.product?.productBatchNumber || "")}</div></td>
          <td class="px-4 py-3"><span class="px-2 py-0.5 rounded-full text-[11px] font-bold ${kindBadge(m.kind)}">${esc(m.kind.replace("_", " "))}</span></td>
          <td class="px-4 py-3 text-xs">${esc(m.store?.name || "Default")}${m.relatedStore ? ` → ${esc(m.relatedStore.name)}` : ""}</td>
          <td class="px-4 py-3 text-right font-bold">${m.kind === "transfer_in" ? "+" : m.kind === "transfer_out" || m.kind === "disposal" || m.kind === "loss" ? "−" : ""}${esc(m.quantity)}</td>
          <td class="px-4 py-3 text-right text-xs">KES ${Number(m.totalCost || 0).toLocaleString()}</td>
          <td class="px-4 py-3 text-xs text-primary-500 dark:text-primary-400">${esc(m.reason || "")}<div class="text-[11px]">${esc(m.user?.name || "")}</div></td>
        </tr>`).join("")
      : '<tr><td colspan="7" class="px-6 py-8 text-center text-primary-400">No movements found</td></tr>';

    const totals = {};
    (data.totals || []).forEach((t) => { totals[t._id] = t; });
    const tot = document.getElementById("mov-totals");
    if (tot) {
      tot.innerHTML = ["disposal", "loss", "transfer_out", "transfer_in"].map((k) =>
        totals[k]
          ? `<span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-primary-800/50 border text-xs font-bold mr-2 mb-2">${esc(k.replace("_", " "))}: ${totals[k].quantity} units · KES ${Number(totals[k].cost).toLocaleString()}</span>`
          : ""
      ).join("") || '<span class="text-xs text-primary-400">No movements yet</span>';
    }
    const info = document.getElementById("mov-info");
    if (info) info.textContent = `Page ${data.currentPage} of ${data.totalPages} · ${data.total} entries`;
    document.getElementById("mov-prev").disabled = movPage <= 1;
    document.getElementById("mov-next").disabled = movPage >= data.totalPages;
  } catch (err) {
    console.error(err);
    body.innerHTML = `<tr><td colspan="7" class="px-6 py-8 text-center text-red-500 text-sm">${esc(err.message)}</td></tr>`;
  }
}

/* ─────────────── suppliers / barcode / export (kept) ─────────────── */
async function loadSuppliers() {
  try {
    const res = await fetch("/api/suppliers", { credentials: "include" });
    if (!res.ok) return;
    const data = await res.json();
    const list = document.getElementById("supplierList");
    const sel = document.getElementById("product-supplier");
    if (sel) {
      sel.innerHTML = '<option value="">— No supplier —</option>' + (data.suppliers || []).map((s) => `<option value="${esc(s._id)}">${esc(s.name)}</option>`).join("");
    }
    if (list) {
      if (!data.suppliers || !data.suppliers.length) list.textContent = "No suppliers yet.";
      else list.innerHTML = data.suppliers.map((s) => `<span class="inline-block px-2 py-1 bg-white dark:bg-slate-800 border rounded mr-1 mb-1">${esc(s.name)}</span>`).join("");
    }
  } catch {}
}

function initBarcodeScanning() {
  const btn = document.getElementById("barcodeBtn");
  const input = document.getElementById("barcodeInput");
  if (!btn || !input) return;
  const doLookup = async () => {
    const code = input.value.trim();
    if (!code) return;
    const r = await fetch(`/inventory/barcode/${encodeURIComponent(code)}`, { credentials: "include" });
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.product) {
      notify(`Found: ${d.product.productName}`, "success");
      document.getElementById("inventory-search").value = d.product.productName;
      loadProducts();
    } else {
      const g = await guardSession(r);
      if (!g.dead) notify(d.message || "No product for barcode " + code, "error");
    }
  };
  btn.addEventListener("click", doLookup);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); doLookup(); } });
}

// Real exports (previously shadowed by placeholder stubs in the page).
function exportInventory(type) {
  let url = "";
  if (type === "csv") url = "/export/csv";
  else if (type === "excel") url = "/export/excel";
  else if (type === "pdf") url = "/downloadInventory";
  else {
    notify("Unsupported export type.", "error");
    return;
  }
  const store = document.getElementById("storeFilter")?.value;
  if (store && (type === "csv" || type === "excel")) url += `?store=${encodeURIComponent(store)}`;
  window.open(url, "_blank");
  notify(`Exporting inventory as ${type.toUpperCase()}`, "success");
}

function downloadSampleFile() {
  const sample = [
    "productName,productPrice,productQuantity,productDescription,productCategory,productBatchNumber",
    "Wireless Mouse,1500,50,Ergonomic wireless mouse,Electronics,BATCH-001",
    "Notebook A5,200,100,200-page ruled notebook,Stationery,BATCH-002",
  ].join("\n");
  const blob = new Blob([sample], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sample_inventory.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
  notify("Sample file downloaded", "success");
}

async function uploadInventoryFile(file, type) {
  const formData = new FormData();
  if (type === "csv") formData.append("file", file);
  else if (type === "excel") formData.append("productFile", file);
  else {
    notify("Unsupported file type selected.", "error");
    return;
  }
  try {
    const url = type === "csv" ? "/uploadStockByCsv" : "/uploadStockByExcel";
    const response = await fetch(url, { method: "POST", credentials: "include", body: formData });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      notify(data.message || "Inventory uploaded successfully!", "success");
      loadProducts();
    } else {
      const g = await guardSession(response);
      if (!g.dead) notify(data.message || g.message || "Failed to upload inventory.", "error");
    }
  } catch (error) {
    console.error("Upload inventory file error:", error);
    notify("Network error during upload.", "error");
  }
}

/* ─────────────── auth check ─────────────── */
async function checkAuth() {
  try {
    const response = await fetch("/verifyAuth", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    if (response.ok) return true;
    window.location.href = "/login.html?session=expired";
    return false;
  } catch (error) {
    console.error("Error during authentication check:", error);
    window.location.href = "/login.html?session=expired";
    return false;
  }
}

/* ─────────────── init ─────────────── */
document.addEventListener("DOMContentLoaded", async () => {
  if (!(await checkAuth())) return;
  await fetchIdentity();
  if (sessionDead) return;

  await loadStores();
  loadProducts();
  loadSuppliers();
  initBarcodeScanning();
  loadMovements();

  document.getElementById("storeFilter")?.addEventListener("change", () => loadProducts());
  document.getElementById("inventory-search")?.addEventListener("input", debounce(() => loadProducts(), 300));
  document.getElementById("add-product-btn")?.addEventListener("click", handleAddProduct);
  document.getElementById("product-form")?.addEventListener("submit", handleProductFormSubmit);
  document.getElementById("products-table")?.addEventListener("click", handleProductTableClick);
  document.getElementById("low-stock-table")?.addEventListener("click", handleProductTableClick);
  document.getElementById("modal-cancel")?.addEventListener("click", closeProductModal);
  document.getElementById("modal-backdrop")?.addEventListener("click", closeProductModal);
  document.getElementById("delete-cancel")?.addEventListener("click", closeDeleteModal);
  document.getElementById("delete-confirm")?.addEventListener("click", confirmDelete);
  document.getElementById("delete-modal-backdrop")?.addEventListener("click", closeDeleteModal);

  // Transfer modal
  document.getElementById("transfer-form")?.addEventListener("submit", submitTransfer);
  document.getElementById("transfer-cancel")?.addEventListener("click", closeTransferModal);
  document.getElementById("transfer-backdrop")?.addEventListener("click", closeTransferModal);

  // Dispose modal
  document.getElementById("dispose-form")?.addEventListener("submit", submitDispose);
  document.getElementById("dispose-cancel")?.addEventListener("click", closeDisposeModal);
  document.getElementById("dispose-backdrop")?.addEventListener("click", closeDisposeModal);

  // Compare + sync
  document.getElementById("compare-run")?.addEventListener("click", runCompare);
  document.getElementById("sync-open-btn")?.addEventListener("click", () => {
    if (!isAdmin()) {
      notify("Only administrators can sync stores.", "error");
      return;
    }
    renderSyncTargets();
    document.getElementById("sync-modal")?.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  });
  document.getElementById("sync-form")?.addEventListener("submit", submitSync);
  document.getElementById("sync-cancel")?.addEventListener("click", () => {
    document.getElementById("sync-modal")?.classList.add("hidden");
    document.body.style.overflow = "";
  });
  document.getElementById("sync-backdrop")?.addEventListener("click", () => {
    document.getElementById("sync-modal")?.classList.add("hidden");
    document.body.style.overflow = "";
  });

  // Movements filters + pagination
  document.getElementById("mov-apply")?.addEventListener("click", () => { movPage = 1; loadMovements(); });
  document.getElementById("mov-prev")?.addEventListener("click", () => { if (movPage > 1) { movPage -= 1; loadMovements(); } });
  document.getElementById("mov-next")?.addEventListener("click", () => { movPage += 1; loadMovements(); });

  // Tabs (All / Low stock / Movements / Compare)
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab-button").forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      document.querySelectorAll(".tab-content").forEach((c) => c.classList.add("hidden"));
      const contentId = button.id.replace("tab-", "") + "-content";
      document.getElementById(contentId)?.classList.remove("hidden");
      if (contentId === "movements-content") { movPage = 1; loadMovements(); }
      if (contentId === "compare-content") renderComparePicker();
    });
  });

  // Bulk delete (custom modal, no native confirm)
  document.getElementById("bulk-delete-btn")?.addEventListener("click", () => {
    if (!canDelete()) {
      notify("Only admins and managers can delete products.", "error");
      return;
    }
    const selectedIds = Array.from(document.querySelectorAll(".product-checkbox:checked")).map((cb) => cb.dataset.id);
    if (!selectedIds.length) {
      notify("No products selected.", "info");
      return;
    }
    askDelete(null, true, selectedIds);
  });
  document.getElementById("select-all-checkbox")?.addEventListener("change", function () {
    document.querySelectorAll(".product-checkbox").forEach((cb) => { cb.checked = this.checked; });
  });

  // Upload CSV/Excel
  const wireUpload = (btnId, accept, type) => {
    document.getElementById(btnId)?.addEventListener("click", () => {
      if (!canWrite()) {
        notify("Your role cannot import inventory.", "error");
        return;
      }
      const fileInput = document.getElementById("inventory-file-input");
      fileInput.accept = accept;
      fileInput.onchange = async function () {
        if (fileInput.files.length > 0) {
          await uploadInventoryFile(fileInput.files[0], type);
          fileInput.value = "";
        }
      };
      fileInput.click();
    });
  };
  wireUpload("upload-csv-btn", ".csv", "csv");
  wireUpload("upload-excel-btn", ".xlsx", "excel");

  // Supplier quick-add
  document.getElementById("addSupplierBtn")?.addEventListener("click", async () => {
    const name = document.getElementById("newSupplierName")?.value.trim();
    if (!name) return;
    const r = await fetch("/api/suppliers", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ name }),
    });
    const d = await r.json().catch(() => ({}));
    if (r.ok) {
      document.getElementById("newSupplierName").value = "";
      loadSuppliers();
      notify(`Supplier added: ${name}`, "success");
    } else {
      const g = await guardSession(r);
      if (!g.dead) notify(d.message || "Failed to add supplier.", "error");
    }
  });
});

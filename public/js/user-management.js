/**
 * User Management - production frontend controller.
 *
 * Security model (mirrors the backend):
 * - Every request sends credentials (httpOnly cookie). A 401, or a 403
 *   carrying an auth/token message, means the session is dead -> redirect
 *   to login. It is NEVER rendered as a subscription/permission state.
 * - Row actions are gated by the caller's role (fetched from /userDetails):
 *   admin = full control, manager = manage non-admins only (no delete,
 *   no reset, no admin/manager assignment), cashier/inventory = read-only.
 * - The backend remains the source of truth and re-enforces all of this;
 *   the UI gating is for clarity, not security.
 */

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let currentPage = 1;
const usersPerPage = 10;
let currentSearch = "";
let currentRoleFilter = "";
let currentStatusFilter = "";
let currentSort = "newest";
let currentUserId = null;
let currentUserRole = null;
let sessionDead = false;
let planPolicy = { seatLimit: 0, activeUsers: 0, roleManagement: true };

// ---------------------------------------------------------------------------
// DOM elements
// ---------------------------------------------------------------------------
const usersTable = document.getElementById("users-table");
const activeUsersCount = document.getElementById("active-users-count");
const usersStart = document.getElementById("users-start");
const usersEnd = document.getElementById("users-end");
const usersTotal = document.getElementById("users-total");
const prevPageBtn = document.getElementById("prev-page");
const nextPageBtn = document.getElementById("next-page");
const addUserBtn = document.getElementById("add-user-btn");
const addUserModal = document.getElementById("add-user-modal");
const closeModalBtn = document.getElementById("close-modal");
const modalBackdrop = document.getElementById("modal-backdrop");
const cancelAddUserBtn = document.getElementById("cancel-add-user");
const addUserForm = document.getElementById("add-user-form");
const editUserModal = document.getElementById("edit-user-modal");
const closeEditModalBtn = document.getElementById("close-edit-modal");
const editModalBackdrop = document.getElementById("edit-modal-backdrop");
const cancelEditUserBtn = document.getElementById("cancel-edit-user");
const editUserForm = document.getElementById("edit-user-form");
const userSearch = document.getElementById("user-search");
const roleFilter = document.getElementById("role-filter");
const statusFilter = document.getElementById("status-filter");
const sortSelect = document.getElementById("sort-select");
const exportBtn = document.getElementById("export-users-btn");
const seatsBanner = document.getElementById("seats-banner");
const accessDeniedBanner = document.getElementById("access-denied-banner");

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------
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

// Returns true when the response was a dead session (caller must stop).
async function handleSessionError(response) {
  const message = await readErrorMessage(response);
  if (isSessionError(response.status, message)) {
    redirectToLogin();
    return true;
  }
  return message;
}

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

// ---------------------------------------------------------------------------
// Role gating (UI only - backend re-enforces everything)
// ---------------------------------------------------------------------------
function canManageUsers() {
  return currentUserRole === "admin" || currentUserRole === "manager";
}

function canDeleteAndReset() {
  return currentUserRole === "admin";
}

// Managers may only touch non-admin accounts; nobody acts on a dead session.
function canEditTarget(target) {
  if (!canManageUsers()) return false;
  if (currentUserRole === "manager" && target.role === "admin") return false;
  return true;
}

function canDeleteTarget(target) {
  if (!canDeleteAndReset()) return false;
  if (String(target._id) === String(currentUserId)) return false; // never self
  return true;
}

function applyRoleGating() {
  // data-requires-role="admin,manager" attributes (same convention as auth.js)
  document.querySelectorAll("[data-requires-role]").forEach((el) => {
    const required = el
      .getAttribute("data-requires-role")
      .split(",")
      .map((s) => s.trim());
    el.style.display =
      currentUserRole && required.includes(currentUserRole) ? "" : "none";
  });

  if (!canManageUsers() && accessDeniedBanner) {
    accessDeniedBanner.classList.remove("hidden");
  } else if (accessDeniedBanner) {
    accessDeniedBanner.classList.add("hidden");
  }
}

async function fetchCurrentIdentity() {
  try {
    const res = await fetch("/userDetails", { credentials: "include" });
    if (!res.ok) {
      if (await handleSessionError(res)) return false;
      return false;
    }
    const data = await res.json();
    currentUserId = data.user?.id || null;
    currentUserRole = data.user?.role || null;
    applyRoleGating();
    return true;
  } catch (err) {
    console.error("Failed to fetch current identity:", err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Plan / seat policy (mirrors requireLimit("maxUsers") + roleManagement)
// ---------------------------------------------------------------------------
async function fetchPlanPolicy() {
  try {
    const res = await fetch("/subscriptions/details", {
      credentials: "include",
    });
    if (!res.ok) {
      if (await handleSessionError(res)) return;
      return;
    }
    const data = await res.json();
    const plan = data.subscription?.plan || {};
    const features = plan.features || {};
    const maxUsers =
      Number(features.maxUsers) > 0
        ? Number(features.maxUsers)
        : Number(plan.userLimit) || 0;

    const usersRes = await fetch("/users?limit=1", { credentials: "include" });
    let activeUsers = 0;
    if (usersRes.ok) {
      const usersData = await usersRes.json();
      activeUsers = usersData.activeUsers ?? 0;
    }

    planPolicy = {
      seatLimit: maxUsers,
      activeUsers,
      roleManagement: plan.roleManagement !== false,
      planName: plan.name || "",
    };
    renderSeatsBanner();
    applyPlanToRoleSelects();
  } catch (err) {
    console.error("Failed to fetch plan policy:", err);
  }
}

function renderSeatsBanner() {
  if (!seatsBanner) return;
  const { seatLimit, activeUsers, planName } = planPolicy;
  if (!seatLimit || seatLimit <= 0) {
    seatsBanner.classList.add("hidden");
    if (addUserBtn && canManageUsers()) {
      addUserBtn.disabled = false;
      addUserBtn.title = "";
    }
    return;
  }
  seatsBanner.classList.remove("hidden");
  const pct = Math.min(100, Math.round((activeUsers / seatLimit) * 100));
  seatsBanner.innerHTML = `
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div class="flex items-center gap-3">
        <i class="fas fa-users text-accent-500"></i>
        <p class="text-sm font-semibold text-primary-700 dark:text-primary-200">
          Seats: <span class="font-black">${activeUsers}</span> / ${seatLimit} used
          ${planName ? `<span class="text-primary-400 font-medium">(${escapeHtml(planName)} plan)</span>` : ""}
        </p>
      </div>
      <div class="flex-1 min-w-[140px] max-w-xs h-2 rounded-full bg-primary-100 dark:bg-primary-800 overflow-hidden">
        <div class="h-full rounded-full ${pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-warning-500" : "bg-accent-500"}" style="width:${pct}%"></div>
      </div>
      ${pct >= 100 ? `<a href="/manageSubscriptions.html" class="text-xs font-bold text-accent-600 hover:text-accent-500 underline">Upgrade for more seats</a>` : ""}
    </div>`;
  if (addUserBtn) {
    const full = activeUsers >= seatLimit;
    addUserBtn.disabled = full;
    addUserBtn.title = full ? "Seat limit reached - upgrade your plan" : "";
    addUserBtn.classList.toggle("opacity-50", full);
    addUserBtn.classList.toggle("cursor-not-allowed", full);
  }
}

function applyPlanToRoleSelects() {
  if (planPolicy.roleManagement !== false) return;
  // Plans without role management: only admin + cashier are assignable.
  document.querySelectorAll('select[name="role"]').forEach((sel) => {
    sel.querySelectorAll("option").forEach((opt) => {
      if (opt.value && opt.value !== "admin" && opt.value !== "cashier") {
        opt.disabled = true;
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------
function buildQuery(page) {
  const params = new URLSearchParams({
    page,
    limit: usersPerPage,
    search: currentSearch,
    sort: currentSort,
  });
  if (currentRoleFilter) params.set("role", currentRoleFilter);
  if (currentStatusFilter) params.set("status", currentStatusFilter);
  return params;
}

async function loadUsers(page = 1, search = currentSearch) {
  currentPage = page;
  try {
    const response = await fetch(`/users?${buildQuery(page)}`, {
      credentials: "include",
    });

    if (!response.ok) {
      const handled = await handleSessionError(response);
      if (handled === true) return; // dead session -> login
      throw new Error(handled || `Request failed (${response.status})`);
    }

    const data = await response.json();

    if (!data.users || !Array.isArray(data.users)) {
      throw new Error("Invalid API response: users array missing");
    }

    const total = data.totalUsers ?? 0;
    const totalPages = data.totalPages ?? 1;
    if (total === 0) {
      usersStart.textContent = "0";
      usersEnd.textContent = "0";
    } else {
      usersStart.textContent = String((page - 1) * usersPerPage + 1);
      usersEnd.textContent = String(Math.min(page * usersPerPage, total));
    }
    usersTotal.textContent = String(total);
    activeUsersCount.textContent = String(data.activeUsers ?? 0);

    prevPageBtn.disabled = page <= 1;
    nextPageBtn.disabled = page >= totalPages;

    renderUsers(data.users);
  } catch (error) {
    console.error("Error loading users:", error);
    showToast(error.message || "Failed to load users", "error");
    usersTable.innerHTML = `
      <tr>
        <td colspan="6" class="px-6 py-12 text-center">
          <div class="flex flex-col items-center justify-center gap-2">
            <i class="fas fa-exclamation-circle text-3xl text-red-400"></i>
            <p class="text-sm font-semibold text-red-400">Error: ${escapeHtml(error.message)}</p>
            <button onclick="loadUsers(currentPage)" class="mt-2 px-4 py-2 text-xs font-bold rounded-lg bg-white dark:bg-primary-800 border border-primary-200 dark:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-700">Retry</button>
          </div>
        </td>
      </tr>
    `;
  }
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
function renderUsers(users) {
  usersTable.innerHTML = "";

  if (!users || users.length === 0) {
    usersTable.innerHTML = `
      <tr>
        <td colspan="6" class="px-6 py-12 text-center">
          <div class="flex flex-col items-center justify-center gap-2 text-primary-400">
            <i class="fas fa-users text-3xl"></i>
            <p class="text-sm font-semibold">No users found</p>
            <p class="text-xs">Try clearing the search or filters.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  users.forEach((user) => {
    const safeUser = {
      _id: user._id || "",
      name: user.name || "Unknown",
      email: user.email || "No email",
      phone: user.phone || "—",
      role: user.role || "unknown",
      status: user.status || "inactive",
      lastActive: user.lastActive,
      avatar: user.avatar,
      mustChangePassword: !!user.mustChangePassword,
    };
    const isSelf = String(safeUser._id) === String(currentUserId);
    const editable = canEditTarget(safeUser);
    const deletable = canDeleteTarget(safeUser);
    const resettable = canDeleteAndReset() && !isSelf;

    const row = document.createElement("tr");
    row.className = "hover:bg-white/5 transition-colors";
    row.innerHTML = `
      <td class="py-4 px-6">
        <div class="flex items-center space-x-3">
          <img src="${
            safeUser.avatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(safeUser.name)}&background=random`
          }"
               alt="${escapeHtml(safeUser.name)}"
               class="w-10 h-10 rounded-full object-cover">
          <div>
            <div class="font-medium">${escapeHtml(safeUser.name)}
              ${isSelf ? '<span class="ml-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-accent-100 dark:bg-accent-900/40 text-accent-700 dark:text-accent-300">You</span>' : ""}
              ${safeUser.mustChangePassword ? '<span class="ml-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300" title="Must change password on next login">PW reset</span>' : ""}
            </div>
            <div class="text-xs text-gray-400 font-mono">${escapeHtml(String(safeUser._id).slice(-8))}</div>
          </div>
        </div>
      </td>
      <td class="py-4 px-6">
        <div class="text-sm">${escapeHtml(safeUser.email)}</div>
        <div class="text-xs text-gray-400">${escapeHtml(safeUser.phone)}</div>
      </td>
      <td class="py-4 px-6">
        <span class="px-3 py-1 rounded-full text-xs font-medium ${getRoleClass(safeUser.role)}">
          ${escapeHtml(safeUser.role.charAt(0).toUpperCase() + safeUser.role.slice(1))}
        </span>
      </td>
      <td class="py-4 px-6">
        <div class="flex items-center">
          <div class="w-2 h-2 rounded-full mr-2 ${getStatusClass(safeUser.status)}"></div>
          <span>${escapeHtml(safeUser.status.charAt(0).toUpperCase() + safeUser.status.slice(1))}</span>
        </div>
      </td>
      <td class="py-4 px-6 text-sm text-gray-400">${
        safeUser.lastActive ? escapeHtml(new Date(safeUser.lastActive).toLocaleString()) : "Never"
      }</td>
      <td class="py-4 px-6 text-right">
        <div class="flex justify-end space-x-1">
          ${
            editable
              ? `<button class="edit-user-btn p-2 text-primary-400 hover:text-primary-300" data-id="${escapeHtml(safeUser._id)}" title="Edit user"><i class="fas fa-edit"></i></button>`
              : ""
          }
          ${
            resettable
              ? `<button class="reset-pw-btn p-2 text-warning-500 hover:text-warning-400" data-id="${escapeHtml(safeUser._id)}" data-name="${escapeHtml(safeUser.name)}" title="Reset password"><i class="fas fa-key"></i></button>`
              : ""
          }
          ${
            deletable
              ? `<button class="delete-user-btn p-2 text-red-400 hover:text-red-300" data-id="${escapeHtml(safeUser._id)}" data-name="${escapeHtml(safeUser.name)}" title="Delete user"><i class="fas fa-trash"></i></button>`
              : ""
          }
          ${!editable && !deletable && !resettable ? '<span class="text-xs text-gray-400 px-2">—</span>' : ""}
        </div>
      </td>
    `;
    usersTable.appendChild(row);
  });

  document.querySelectorAll(".edit-user-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      openEditUserModal(e.currentTarget.getAttribute("data-id"));
    });
  });
  document.querySelectorAll(".delete-user-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      deleteUser(
        e.currentTarget.getAttribute("data-id"),
        e.currentTarget.getAttribute("data-name")
      );
    });
  });
  document.querySelectorAll(".reset-pw-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      openResetPasswordModal(
        e.currentTarget.getAttribute("data-id"),
        e.currentTarget.getAttribute("data-name")
      );
    });
  });
}

function getRoleClass(role) {
  switch (role) {
    case "admin":
      return "bg-purple-900/50 text-purple-300";
    case "manager":
      return "bg-blue-900/50 text-blue-300";
    case "cashier":
      return "bg-green-900/50 text-green-300";
    case "inventory":
      return "bg-cyan-900/50 text-cyan-300";
    default:
      return "bg-yellow-900/50 text-yellow-300";
  }
}

function getStatusClass(status) {
  switch (status) {
    case "active":
      return "bg-green-500";
    case "inactive":
      return "bg-gray-500";
    default:
      return "bg-red-500";
  }
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------
function validateUserPayload(payload, { requirePassword = true } = {}) {
  if (!payload.name?.trim()) return "Full name is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(payload.email || ""))
    return "A valid email address is required";
  if (!/[+\d][\d\s\-()]{6,}/.test(payload.phone || ""))
    return "A valid phone number is required";
  if (!["admin", "manager", "cashier", "inventory"].includes(payload.role))
    return "Please select a valid role";
  if (requirePassword && String(payload.password || "").length < 8)
    return "Password must be at least 8 characters";
  if (
    payload.confirmPassword !== undefined &&
    payload.password !== payload.confirmPassword
  )
    return "Passwords do not match";
  return null;
}

async function addUser(userData) {
  const validationError = validateUserPayload(userData);
  if (validationError) {
    showToast(validationError, "error");
    return false;
  }
  try {
    const { confirmPassword: _ignored, ...payload } = userData;
    const response = await fetch("/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    });

    if (!response.ok) {
      const handled = await handleSessionError(response);
      if (handled === true) return false;
      throw new Error(handled || "Failed to add user");
    }

    showToast("User added successfully", "success");
    fetchPlanPolicy();
    loadUsers(currentPage);
    return true;
  } catch (error) {
    console.error("Error adding user:", error);
    showToast(error.message || "Failed to add user", "error");
    return false;
  }
}

async function openEditUserModal(userId) {
  try {
    const response = await fetch(`/users/${userId}`, {
      credentials: "include",
    });

    if (!response.ok) {
      const handled = await handleSessionError(response);
      if (handled === true) return;
      throw new Error(handled || "Failed to fetch user details");
    }

    const user = await response.json();
    const isSelf = String(user._id) === String(currentUserId);

    document.getElementById("edit-user-id").value = user._id;
    document.getElementById("edit-fullName").value = user.name || "";
    document.getElementById("edit-email").value = user.email || "";
    document.getElementById("edit-phone").value = user.phone || "";
    document.getElementById("edit-role").value = user.role || "cashier";
    document.getElementById("edit-status").value = user.status || "active";

    // Self-edit: role + status are locked (backend rejects these anyway).
    const roleSel = document.getElementById("edit-role");
    const statusSel = document.getElementById("edit-status");
    roleSel.disabled = isSelf;
    statusSel.disabled = isSelf;
    document.getElementById("edit-self-note")?.classList.toggle("hidden", !isSelf);

    // Plan without role management: restrict options.
    applyPlanToRoleSelects();

    editUserModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  } catch (error) {
    console.error("Error opening edit modal:", error);
    showToast(error.message || "Failed to load user details", "error");
  }
}

function closeEditUserModal() {
  editUserModal.classList.add("hidden");
  document.body.style.overflow = "";
  editUserForm.reset();
  const roleSel = document.getElementById("edit-role");
  const statusSel = document.getElementById("edit-status");
  if (roleSel) roleSel.disabled = false;
  if (statusSel) statusSel.disabled = false;
}

async function updateUser(userId, userData) {
  if (!userData.name?.trim()) {
    showToast("Full name is required", "error");
    return false;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(userData.email || "")) {
    showToast("A valid email address is required", "error");
    return false;
  }
  try {
    const response = await fetch(`/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
      credentials: "include",
    });

    if (!response.ok) {
      const handled = await handleSessionError(response);
      if (handled === true) return false;
      throw new Error(handled || "Failed to update user");
    }

    showToast("User updated successfully", "success");
    fetchPlanPolicy();
    loadUsers(currentPage);
    return true;
  } catch (error) {
    console.error("Error updating user:", error);
    showToast(error.message || "Failed to update user", "error");
    return false;
  }
}

async function deleteUser(userId, userName) {
  document
    .getElementById("delete-confirmation-modal")
    .classList.remove("hidden");
  document.body.style.overflow = "hidden";
  const nameEl = document.getElementById("delete-user-name");
  if (nameEl) nameEl.textContent = userName || "this user";

  const confirmBtn = document.getElementById("confirm-delete");
  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.replaceWith(newConfirmBtn);

  newConfirmBtn.onclick = async () => {
    newConfirmBtn.disabled = true;
    try {
      const response = await fetch(`/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const handled = await handleSessionError(response);
        if (handled === true) return;
        throw new Error(handled || "Failed to delete user");
      }

      showToast("User deleted successfully", "success");
      fetchPlanPolicy();
      loadUsers(currentPage);
    } catch (error) {
      console.error("Error deleting user:", error);
      showToast(error.message || "Failed to delete user", "error");
    } finally {
      newConfirmBtn.disabled = false;
      document
        .getElementById("delete-confirmation-modal")
        .classList.add("hidden");
      document.body.style.overflow = "";
    }
  };
}

// ---------------------------------------------------------------------------
// Admin password reset
// ---------------------------------------------------------------------------
function openResetPasswordModal(userId, userName) {
  document.getElementById("reset-user-id").value = userId;
  const nameEl = document.getElementById("reset-user-name");
  if (nameEl) nameEl.textContent = userName || "this user";
  document.getElementById("reset-password-modal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeResetPasswordModal() {
  document.getElementById("reset-password-modal").classList.add("hidden");
  document.body.style.overflow = "";
  document.getElementById("reset-password-form")?.reset();
}

// ---------------------------------------------------------------------------
// CSV export (current filter view)
// ---------------------------------------------------------------------------
function downloadCsv(filename, rows) {
  const header = ["Name", "Email", "Phone", "Role", "Status", "Last Active"];
  const lines = [header.join(",")].concat(
    rows.map((u) =>
      [
        `"${String(u.name || "").replace(/"/g, '""')}"`,
        `"${String(u.email || "").replace(/"/g, '""')}"`,
        `"${String(u.phone || "").replace(/"/g, '""')}"`,
        u.role || "",
        u.status || "",
        u.lastActive ? new Date(u.lastActive).toISOString() : "",
      ].join(",")
    )
  );
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function exportUsers() {
  try {
    showToast("Preparing export...", "info");
    const params = buildQuery(1);
    params.set("limit", "500");
    const response = await fetch(`/users?${params}`, {
      credentials: "include",
    });
    if (!response.ok) {
      const handled = await handleSessionError(response);
      if (handled === true) return;
      throw new Error(handled || "Export failed");
    }
    const data = await response.json();
    if (!data.users?.length) {
      showToast("Nothing to export", "warning");
      return;
    }
    downloadCsv(
      `users-export-${new Date().toISOString().slice(0, 10)}.csv`,
      data.users
    );
    showToast(`Exported ${data.users.length} users`, "success");
  } catch (error) {
    console.error("Export error:", error);
    showToast(error.message || "Export failed", "error");
  }
}

// ---------------------------------------------------------------------------
// Toast (dashboard-style)
// ---------------------------------------------------------------------------
function showToast(message, type = "info") {
  const colors = {
    success: "from-success-500 to-success-600",
    error: "from-red-500 to-red-600",
    warning: "from-yellow-500 to-yellow-600",
    info: "from-primary-500 to-primary-600",
  };
  const typeClass = { success: "success", error: "red", warning: "yellow", info: "primary" }[type];

  const toast = document.createElement("div");
  toast.className = `glass-dark rounded-xl p-4 text-white font-medium transform transition-all duration-300 animate-slide-in border-l-4 border-${typeClass}-500`;
  toast.innerHTML = `
    <div class="flex items-center space-x-3">
      <i class="fas fa-${
        type === "success" ? "check-circle"
        : type === "error" ? "exclamation-circle"
        : type === "warning" ? "exclamation-triangle"
        : "info-circle"
      } text-${typeClass}-400"></i>
      <span>${escapeHtml(message)}</span>
    </div>
  `;

  document.getElementById("toast-container").appendChild(toast);
  setTimeout(() => {
    toast.style.transform = "translateX(100%)";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  // Identity first: gates every action below.
  const identified = await fetchCurrentIdentity();
  if (sessionDead) return; // already heading to login
  if (!identified || !currentUserRole) {
    // Authenticated but identity unclear (or a non-session error) -
    // show a safe read-only state instead of guessing.
    showToast("Could not verify your access level", "warning");
    applyRoleGating();
    loadUsers(currentPage);
    return;
  }

  fetchPlanPolicy();
  loadUsers(currentPage);

  // Add user modal
  addUserBtn?.addEventListener("click", () => {
    if (!canManageUsers()) {
      showToast("Only admins and managers can add users", "error");
      return;
    }
    applyPlanToRoleSelects();
    addUserModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  });
  closeModalBtn?.addEventListener("click", () => {
    addUserModal.classList.add("hidden");
    document.body.style.overflow = "";
  });
  modalBackdrop?.addEventListener("click", () => {
    addUserModal.classList.add("hidden");
    document.body.style.overflow = "";
  });

  // Edit user modal
  closeEditModalBtn?.addEventListener("click", closeEditUserModal);
  editModalBackdrop?.addEventListener("click", closeEditUserModal);

  // Reset password modal
  document
    .getElementById("close-reset-modal")
    ?.addEventListener("click", closeResetPasswordModal);
  document
    .getElementById("reset-modal-backdrop")
    ?.addEventListener("click", closeResetPasswordModal);
  document
    .getElementById("cancel-reset-password")
    ?.addEventListener("click", closeResetPasswordModal);
  document
    .getElementById("reset-password-form")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const userId = document.getElementById("reset-user-id").value;
      const pw = document.getElementById("reset-new-password").value;
      const confirm = document.getElementById("reset-confirm-password").value;
      if (String(pw).length < 8) {
        showToast("Password must be at least 8 characters", "error");
        return;
      }
      if (pw !== confirm) {
        showToast("Passwords do not match", "error");
        return;
      }
      try {
        const res = await fetch(`/users/${userId}/reset-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ newPassword: pw }),
        });
        if (!res.ok) {
          const handled = await handleSessionError(res);
          if (handled === true) return;
          throw new Error(handled || "Password reset failed");
        }
        const data = await res.json();
        showToast(data.message || "Password reset successfully", "success");
        closeResetPasswordModal();
        loadUsers(currentPage);
      } catch (err) {
        console.error("Reset error:", err);
        showToast(err.message || "Password reset failed", "error");
      }
    });

  // Pagination
  prevPageBtn?.addEventListener("click", () => {
    if (currentPage > 1) loadUsers(currentPage - 1);
  });
  nextPageBtn?.addEventListener("click", () => {
    if (!nextPageBtn.disabled) loadUsers(currentPage + 1);
  });

  // Search (debounced) + filters + sort
  userSearch?.addEventListener(
    "input",
    debounce((e) => {
      currentSearch = e.target.value.trim();
      loadUsers(1);
    }, 300)
  );
  roleFilter?.addEventListener("change", (e) => {
    currentRoleFilter = e.target.value;
    loadUsers(1);
  });
  statusFilter?.addEventListener("change", (e) => {
    currentStatusFilter = e.target.value;
    loadUsers(1);
  });
  sortSelect?.addEventListener("change", (e) => {
    currentSort = e.target.value;
    loadUsers(1);
  });

  // Export
  exportBtn?.addEventListener("click", exportUsers);

  // Form submissions
  addUserForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(addUserForm);
    const userData = Object.fromEntries(formData.entries());
    const success = await addUser(userData);
    if (success) {
      addUserModal.classList.add("hidden");
      document.body.style.overflow = "";
      addUserForm.reset();
    }
  });

  editUserForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(editUserForm);
    const userData = Object.fromEntries(formData.entries());
    const userId = document.getElementById("edit-user-id").value;
    const success = await updateUser(userId, userData);
    if (success) closeEditUserModal();
  });

  // Password visibility toggles
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
});

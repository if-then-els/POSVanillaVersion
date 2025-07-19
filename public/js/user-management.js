// Initialize variables
let currentPage = 1;
const usersPerPage = 10;

// DOM elements
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

// Load users from API
async function loadUsers(page = 1, search = "") {
  try {
    const params = new URLSearchParams({
      page,
      limit: usersPerPage,
      search,
    });

    const response = await fetch(`/users?${params}`, {
      credentials: "include",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Validate API response
    if (!data.users || !Array.isArray(data.users)) {
      throw new Error("Invalid API response: users array missing");
    }

    // Update pagination info
    usersStart.textContent = (page - 1) * usersPerPage + 1;
    usersEnd.textContent = Math.min(page * usersPerPage, data.totalUsers);
    usersTotal.textContent = data.totalUsers;
    activeUsersCount.textContent = data.activeUsers;

    // Update pagination buttons
    prevPageBtn.disabled = page === 1;
    nextPageBtn.disabled = page >= data.totalPages;

    // Render users
    renderUsers(data.users);
  } catch (error) {
    console.error("Error loading users:", error);
    showToast(error.message || "Failed to load users", "error");

    // Show error in UI
    usersTable.innerHTML = `
      <tr>
        <td colspan="6" class="px-6 py-4 text-center text-red-400">
          Error: ${error.message}
        </td>
      </tr>
    `;
  }
}

// Render users in table
function renderUsers(users) {
  usersTable.innerHTML = "";

  if (!users || users.length === 0) {
    usersTable.innerHTML = `
      <tr>
        <td colspan="6" class="px-6 py-4 text-center text-gray-500">
          No users found
        </td>
      </tr>
    `;
    return;
  }

  users.forEach((user) => {
    // Add safe defaults for missing properties
    const safeUser = {
      _id: user._id || "N/A",
      name: user.name || "Unknown",
      email: user.email || "No email",
      role: user.role || "unknown",
      status: user.status || "inactive",
      lastActive: user.lastActive,
      avatar: user.avatar,
    };

    const row = document.createElement("tr");
    row.className = "hover:bg-white/5 transition-colors";
    row.innerHTML = `
      <td class="py-4 px-6">
        <div class="flex items-center space-x-3">
          <img src="${
            safeUser.avatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              safeUser.name
            )}&background=random`
          }" 
               alt="${safeUser.name}" 
               class="w-10 h-10 rounded-full object-cover">
          <div>
            <div class="font-medium">${safeUser.name}</div>
            <div class="text-sm text-gray-400">ID: ${safeUser._id}</div>
          </div>
        </div>
      </td>
      <td class="py-4 px-6">${safeUser.email}</td>
      <td class="py-4 px-6">
        <span class="px-3 py-1 rounded-full text-xs font-medium ${getRoleClass(
          safeUser.role
        )}">
          ${safeUser.role.charAt(0).toUpperCase() + safeUser.role.slice(1)}
        </span>
      </td>
      <td class="py-4 px-6">
        <div class="flex items-center">
          <div class="w-2 h-2 rounded-full mr-2 ${getStatusClass(
            safeUser.status
          )}"></div>
          <span>${
            safeUser.status.charAt(0).toUpperCase() + safeUser.status.slice(1)
          }</span>
        </div>
      </td>
      <td class="py-4 px-6 text-sm text-gray-400">${
        safeUser.lastActive
          ? new Date(safeUser.lastActive).toLocaleString()
          : "Never"
      }</td>
      <td class="py-4 px-6 text-right">
        <div class="flex justify-end space-x-2">
          <button class="edit-user-btn p-2 text-primary-400 hover:text-primary-300" data-id="${
            safeUser._id
          }">
            <i class="fas fa-edit"></i>
          </button>
          <button class="delete-user-btn p-2 text-red-400 hover:text-red-300" data-id="${
            safeUser._id
          }">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    `;
    usersTable.appendChild(row);
  });

  // Add event listeners to action buttons
  document.querySelectorAll(".edit-user-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const userId = e.currentTarget.getAttribute("data-id");
      openEditUserModal(userId);
    });
  });

  document.querySelectorAll(".delete-user-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const userId = e.currentTarget.getAttribute("data-id");
      deleteUser(userId);
    });
  });
}

// Helper functions for role and status classes
function getRoleClass(role) {
  switch (role) {
    case "admin":
      return "bg-purple-900/50 text-purple-300";
    case "manager":
      return "bg-blue-900/50 text-blue-300";
    case "cashier":
      return "bg-green-900/50 text-green-300";
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

// Open edit user modal
async function openEditUserModal(userId) {
  try {
    const response = await fetch(`/users/${userId}`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch user details");
    }

    const user = await response.json();

    document.getElementById("edit-user-id").value = user._id;
    document.getElementById("edit-fullName").value = user.name;
    document.getElementById("edit-email").value = user.email;
    document.getElementById("edit-phone").value = user.phone;
    document.getElementById("edit-role").value = user.role;
    document.getElementById("edit-status").value = user.status;

    editUserModal.classList.remove("hidden");
  } catch (error) {
    console.error("Error opening edit modal:", error);
    showToast("Failed to load user details", "error");
  }
}

// Close edit user modal
function closeEditUserModal() {
  editUserModal.classList.add("hidden");
  editUserForm.reset();
}

// Add new user
async function addUser(userData) {
  try {
    const response = await fetch("/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to add user");
    }

    showToast("User added successfully", "success");
    loadUsers(currentPage);
    return true;
  } catch (error) {
    console.error("Error adding user:", error);
    showToast(error.message || "Failed to add user", "error");
    return false;
  }
}

// Update user
async function updateUser(userId, userData) {
  try {
    const response = await fetch(`/users/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update user");
    }

    showToast("User updated successfully", "success");
    loadUsers(currentPage);
    return true;
  } catch (error) {
    console.error("Error updating user:", error);
    showToast(error.message || "Failed to update user", "error");
    return false;
  }
}

// Delete user
async function deleteUser(userId) {
  if (!confirm("Are you sure you want to delete this user?")) return;

  try {
    const response = await fetch(`/users/${userId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to delete user");
    }

    showToast("User deleted successfully", "success");
    loadUsers(currentPage);
  } catch (error) {
    console.error("Error deleting user:", error);
    showToast("Failed to delete user", "error");
  }
}

// Toast notification
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  const colors = {
    success: "from-success-500 to-success-600",
    error: "from-red-500 to-red-600",
    warning: "from-yellow-500 to-yellow-600",
    info: "from-primary-500 to-primary-600",
  };

  // For Tailwind CSS classes to work, we use class names that are defined in the HTML
  const typeClass = {
    success: "success",
    error: "red",
    warning: "yellow",
    info: "primary",
  }[type];

  toast.className = `glass-dark rounded-xl p-4 text-white font-medium transform transition-all duration-300 animate-slide-in border-l-4 border-${typeClass}-500`;
  toast.innerHTML = `
    <div class="flex items-center space-x-3">
      <i class="fas fa-${
        type === "success"
          ? "check-circle"
          : type === "error"
          ? "exclamation-circle"
          : type === "warning"
          ? "exclamation-triangle"
          : "info-circle"
      } text-${typeClass}-400"></i>
      <span>${message}</span>
    </div>
  `;

  document.getElementById("toast-container").appendChild(toast);

  setTimeout(() => {
    toast.style.transform = "translateX(100%)";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Initialize page
document.addEventListener("DOMContentLoaded", () => {
  // Initialize scroll reveal animations
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
        }
      });
    },
    { threshold: 0.1 }
  );

  document.querySelectorAll(".scroll-reveal").forEach((el) => {
    observer.observe(el);
  });

  // Load initial users
  loadUsers(currentPage);

  // Add user modal
  addUserBtn.addEventListener("click", () => {
    addUserModal.classList.remove("hidden");
  });

  closeModalBtn.addEventListener("click", () => {
    addUserModal.classList.add("hidden");
  });

  modalBackdrop.addEventListener("click", () => {
    addUserModal.classList.add("hidden");
  });

  cancelAddUserBtn.addEventListener("click", () => {
    addUserModal.classList.add("hidden");
  });

  // Edit user modal
  closeEditModalBtn.addEventListener("click", closeEditUserModal);
  editModalBackdrop.addEventListener("click", closeEditUserModal);
  cancelEditUserBtn.addEventListener("click", closeEditUserModal);

  // Pagination
  prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      loadUsers(currentPage);
    }
  });

  nextPageBtn.addEventListener("click", () => {
    currentPage++;
    loadUsers(currentPage);
  });

  // Search
  userSearch.addEventListener("input", (e) => {
    loadUsers(1, e.target.value);
  });

  // Form submissions
  addUserForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(addUserForm);
    const userData = Object.fromEntries(formData.entries());

    // Add phone field if not present (if needed)
    if (!userData.phone) {
      userData.phone = "";
    }

    const success = await addUser(userData);
    if (success) {
      addUserModal.classList.add("hidden");
      addUserForm.reset();
    }
  });

  editUserForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(editUserForm);
    const userData = Object.fromEntries(formData.entries());
    const userId = document.getElementById("edit-user-id").value;

    const success = await updateUser(userId, userData);
    if (success) {
      closeEditUserModal();
    }
  });
});

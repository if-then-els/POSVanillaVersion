/**
 * Authentication functions for POS System
 */

// Check if user is authenticated
function checkAuth() {
  const token = localStorage.getItem("token");

  // If no token, redirect to login page
  if (!token) {
    window.location.href = "../public/login.html";
    return false;
  }

  // Update user info in sidebar
  updateUserInfo();

  return true;
}

// Update user info in sidebar
function updateUserInfo() {
  const userNameElement = document.getElementById("user-name");
  const userEmailElement = document.getElementById("user-email");

  if (userNameElement && userEmailElement) {
    const user = JSON.parse(
      localStorage.getItem("user") ||
        '{"name":"Admin User","email":"admin@pos.com"}'
    );
    userNameElement.textContent = user.name;
    userEmailElement.textContent = user.email;
  }
}

// Logout function
function logout() {
  // Clear JWT token from localStorage
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  // Show success message
  // Assuming showToast is defined elsewhere or is a global function
  // For example:
  // function showToast(message, description, type) {
  //   console.log(`${type}: ${message} - ${description}`);
  // }
  if (typeof showToast === "function") {
    showToast(
      "Logged out successfully",
      "You have been logged out of the system",
      "success"
    );
  } else {
    console.warn(
      "showToast function is not defined. Please ensure it is included in your project."
    );
    alert("Logged out successfully"); // Fallback if showToast is not available
  }

  // Redirect to login page
  setTimeout(() => {
    window.location.href = "../public/login.html";
  }, 1000);
}

// Simulate API call for login
async function loginUser(username, password) {
  // In a real app, this would be an API call
  // For demo purposes, simulate a successful login with any credentials
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (username && password) {
        resolve({
          token: "demo-jwt-" + Math.random().toString(36).substring(2),
          user: {
            name: username,
            email: username + "@example.com",
          },
        });
      } else {
        reject(new Error("Invalid username or password"));
      }
    }, 1000);
  });
}

// Add event listener to logout button
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }
});

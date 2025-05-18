document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const loginAlert = document.getElementById("loginAlert");
  const loginAlertMessage = document.getElementById("loginAlertMessage");

  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();

    // Get form values
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    // Validate form
    if (!username || !password) {
      showLoginError("Please enter both username and password");
      return;
    }

    // In a real application, you would send these credentials to your backend
    // For this demo, we'll use a simple check
    if (username === "admin" && password === "password") {
      // Create a mock JWT token (in a real app, this would come from your server)
      const mockToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIn0.8tat9ElZ3QmPmTOCWZm8Vc1uo3mPLWvWQbYwi1gRMZo";

      // Store token in localStorage
      localStorage.setItem("posToken", mockToken);

      // Redirect to dashboard
      window.location.href = "dashboard.html";
    } else {
      showLoginError("Invalid username or password");
    }
  });

  function showLoginError(message) {
    loginAlertMessage.textContent = message;
    loginAlert.classList.remove("hidden");

    // Hide alert after 3 seconds
    setTimeout(() => {
      loginAlert.classList.add("hidden");
    }, 3000);
  }
});

document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const loginAlert = document.getElementById("loginAlert");
  const loginAlertMessage = document.getElementById("loginAlertMessage");

  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();

    // Get form values
    const email = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const businessName = document.getElementById("businessName").value;

    // Validate form
    if (!email || !password || !businessName) {
      showLoginError("Please enter all required fields");
      return;
    }

    // Send login request
    const loginData = {
      email: email,
      password: password,
      businessName: businessName,
    };

    async function login() {
      try {
        const response = await fetch("/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(loginData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Login failed");
        }

        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Error during Login", error);
        throw error; // Re-throw to handle in the calling function
      }
    }

    login()
      .then((data) => {
        if (data && data.message === "Login successful") {
          // Only show success toast and redirect
          showToast("Login successful! Redirecting...", "success");
          setTimeout(() => {
            window.location.href = "/dashboard.html";
          }, 1500);
        }
      })
      .catch((error) => {
        console.error("Login error:", error);
        showToast("Invalid credentials or business name", error);
      });
  });

  // Hide the alert initially (we'll only use toasts now)
  loginAlert.classList.add("hidden");
});

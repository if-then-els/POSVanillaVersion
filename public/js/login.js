document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const loginAlert = document.getElementById("loginAlert");
  const loginAlertMessage = document.getElementById("loginAlertMessage");

  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();

    // Get form values
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const businessName = document.getElementById("businessName").value;

    // Validate form
    if (!username || !password || !businessName) {
      showLoginError("Please enter both username and password");
      return;
    }

    // Send login request
    const loginData = {
      userName: username,
      password: password,
      businessName: businessName,
    };
    console.log("Login data:", loginData);
    async function login() {
      try {
        const response = await fetch("/login", {
          // <--- Changed here
          method: "POST", // Specify POST method
          headers: {
            "Content-Type": "application/json", // Tell the server we're sending JSON
          },
          body: JSON.stringify(loginData), // Convert your data to a JSON string
        });

        if (!response.ok) {
          throw new Error("HTTP error, status: " + response.status);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Error during Login", error);
        showLoginError(error);
      }
    }

    login().then((data) => {
      if (data && data.message === "Login successful") {
        window.location.href = "/dashboard";
      } else {
        showLoginError(data.message || "Invalid username or password");
      }
    });
  });

  function showLoginError(message) {
    const loginAlertMessage = document.getElementById("loginAlertMessage"); // Assuming these are defined elsewhere
    const loginAlert = document.getElementById("loginAlert"); // Assuming these are defined elsewhere

    loginAlertMessage.textContent = message;
    loginAlert.classList.remove("hidden");

    setTimeout(() => {
      loginAlert.classList.add("hidden");
    }, 3000);
  }
  loginAlert.classList.add("hidden");
});

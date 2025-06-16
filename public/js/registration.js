document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("business-register-form");
  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const payload = {
      businessName: document.getElementById("businessName").value.trim(),
      businessLocation: document
        .getElementById("businessLocation")
        .value.trim(),
      businessPhone: document.getElementById("businessPhone").value.trim(),
      businessEmail: document.getElementById("businessEmail").value.trim(),
      password: document.getElementById("password").value,
      businessRegistrationNumber: document
        .getElementById("businessRegistrationNumber")
        .value.trim(),
      adminUsername: document.getElementById("adminUsername").value.trim(),
      adminEmail: document.getElementById("adminEmail").value.trim(),
      adminPhone: document.getElementById("adminPhone").value.trim(),
    };

    try {
      const res = await fetch("/api/business/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        alert("Business registered successfully! Please log in.");
        window.location.href = "/login.html";
      } else {
        alert(data.message || "Registration failed");
      }
    } catch (err) {
      alert("Registration failed. Please try again.");
    }
  });
});

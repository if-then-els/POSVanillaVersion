document.addEventListener("DOMContentLoaded", () => {
  // Theme Toggle
  const themeToggle = document.getElementById("theme-toggle");
  themeToggle.addEventListener("click", () => {
    document.documentElement.classList.toggle("dark");
    const icon = themeToggle.querySelector("i");
    icon.classList.toggle("fa-moon");
    icon.classList.toggle("fa-sun");
  });

  // Sidebar Toggle
  const toggleSidebar = document.getElementById("toggle-sidebar");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("overlay");

  toggleSidebar.addEventListener("click", () => {
    sidebar.classList.toggle("-translate-x-full");
    overlay.classList.toggle("hidden");
  });

  overlay.addEventListener("click", () => {
    sidebar.classList.add("-translate-x-full");
    overlay.classList.add("hidden");
  });

  // Scroll Reveal Animation
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("revealed");
      }
    });
  }, observerOptions);

  document.querySelectorAll(".scroll-reveal").forEach((el) => {
    observer.observe(el);
  });

  // Floating Action Button
  const fab = document.getElementById("fab");
  fab.addEventListener("click", () => {
    showToast("Quick action menu coming soon!", "info");
  });

  // --- Toast Notification Function ---
  function showToast(
    message = "Action completed Successfully!",
    type = "success"
  ) {
    const toastContainer = document.getElementById("toast-container");
    const colors = {
      success: "from-success-500 to-success-600",
      error: "from-red-500 to-red-600",
      warning: "from-yellow-500 to-yellow-600",
      info: "from-primary-500 to-primary-600",
    };

    const toast = document.createElement("div");
    toast.className = `glass-dark rounded-xl p-4 text-white font-medium transform transition-all duration-300 animate-slide-in border-l-4 ${
      type === "success"
        ? "border-success-500"
        : type === "error"
        ? "border-red-500"
        : type === "warning"
        ? "border-yellow-500"
        : "border-primary-500"
    }`;
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
        } text-${
      type === "success"
        ? "success"
        : type === "error"
        ? "red"
        : type === "warning"
        ? "yellow"
        : "primary"
    }-400"></i>
        <span>${message}</span>
      </div>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.transform = "translateY(100%)";
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // --- Global variables for selected plan and price ---
  let selectedPlan = null;
  let selectedPlanPrice = null;
  let currentBusinessId = null;

  // --- Fetch Subscription Details Function ---
  async function fetchSubscriptionDetails() {
    try {
      const response = await fetch("/subscriptions/details", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to fetch subscription details");
      const data = await response.json();
      const sub = data.subscription;

      if (!sub) {
        document.getElementById("plan-name").textContent = "N/A";
        document.getElementById("plan-status").textContent = "N/A";
        document.getElementById("plan-start").textContent = "N/A";
        document.getElementById("plan-end").textContent = "N/A";
        return;
      }

      // Update UI
      document.getElementById("plan-name").textContent =
        (sub.plan || "N/A") + " Plan";
      document.getElementById("plan-status").textContent = sub.status
        ? sub.status.charAt(0).toUpperCase() + sub.status.slice(1)
        : "N/A";
      document.getElementById("plan-start").textContent = sub.startDate
        ? new Date(sub.startDate).toLocaleDateString()
        : "N/A";
      document.getElementById("plan-end").textContent = sub.endDate
        ? new Date(sub.endDate).toLocaleDateString()
        : "N/A";
      let priceText = ""; // Declare a variable to hold the price text

      if (sub.plan === "trial") {
        priceText = "Free Trial";
      } else if (sub.plan === "basic") {
        priceText = "KES 3,500";
      } else if (sub.plan === "Standard") {
        // Remember JavaScript is case-sensitive, "Standard" != "standard"
        priceText = "KES 5,500";
      } else if (sub.plan === "premium") {
        priceText = "KES 9,500";
      } else {
        // Optional: Handle cases where sub.plan doesn't match any known plan
        priceText = "N/A"; // Or an empty string, or an error message
      }

      document.getElementById("plan-price").textContent = priceText;

      // Update auto-renew status
      const autoRenewStatus = document.getElementById("plan-autoRenew");
      if (sub.autoRenew) {
        autoRenewStatus.textContent = "On";
        autoRenewStatus.classList.add("text-success-400");
        autoRenewStatus.classList.remove("text-gray-400");
        document.querySelector(".w-4.h-4").classList.add("right-1");
        document.querySelector(".w-4.h-4").classList.remove("left-1");
      } else {
        autoRenewStatus.textContent = "Off";
        autoRenewStatus.classList.add("text-gray-400");
        autoRenewStatus.classList.remove("text-success-400");
        document.querySelector(".w-4.h-4").classList.add("left-1");
        document.querySelector(".w-4.h-4").classList.remove("right-1");
      }

      // Store current businessId
      currentBusinessId = sub.business;

      // Update usage stats
      if (sub.usage) {
        // Transactions
        const txUsed = sub.usage.transactions?.used || 0;
        const txLimit = sub.usage.transactions?.limit || 0;
        const txPercent = txLimit ? Math.min(100, (txUsed / txLimit) * 100) : 0;
        document.querySelector(
          '[data-usage="transactions"]'
        ).textContent = `${txUsed.toLocaleString()}/${txLimit.toLocaleString()}`;
        document.querySelector(
          ".bg-gradient-to-r.from-primary-500.to-primary-600"
        ).style.width = `${txPercent}%`;

        // Storage
        const stUsed = sub.usage.storage?.used || 0;
        const stLimit = sub.usage.storage?.limit || 0;
        const stPercent = stLimit ? Math.min(100, (stUsed / stLimit) * 100) : 0;
        document.querySelector(
          '[data-usage="storage"]'
        ).textContent = `${stUsed}GB/${stLimit}GB`;
        document.querySelector(
          ".bg-gradient-to-r.from-accent-500.to-accent-600"
        ).style.width = `${stPercent}%`;

        // API Calls
        const apiUsed = sub.usage.apiCalls?.used || 0;
        const apiLimit = sub.usage.apiCalls?.limit || 0;
        const apiPercent = apiLimit
          ? Math.min(100, (apiUsed / apiLimit) * 100)
          : 0;
        document.querySelector('[data-usage="api"]').textContent = `${(
          apiUsed / 1000
        ).toFixed(1)}K/${(apiLimit / 1000).toFixed(0)}K`;
        document.querySelector(
          ".bg-gradient-to-r.from-success-500.to-success-600"
        ).style.width = `${apiPercent}%`;
      }

      // Update billing history
      const tbody = document.querySelector("table tbody");
      tbody.innerHTML = "";
      (sub.billingHistory || []).forEach((entry) => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-white/5 transition-colors group";
        tr.innerHTML = `
          <td class="py-4 px-6 text-white font-medium">${new Date(
            entry.date
          ).toLocaleDateString()}</td>
          <td class="py-4 px-6">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                <i class="fas fa-crown text-white text-sm"></i>
              </div>
              <div>
                <p class="text-white font-medium">${entry.description}</p>
                <p class="text-gray-400 text-sm">${entry.cycle}</p>
              </div>
            </div>
          </td>
          <td class="py-4 px-6 text-white font-bold">KES ${entry.amount.toLocaleString()}</td>
          <td class="py-4 px-6">
            <span class="bg-gradient-to-r from-success-500 to-success-600 text-white text-xs font-bold px-3 py-1 rounded-full">
              <i class="fas fa-check mr-1"></i>${entry.status}
            </span>
          </td>
          <td class="py-4 px-6">
            <button class="text-primary-400 hover:text-primary-300 font-medium transition-colors group-hover:scale-110">
              <i class="fas fa-download mr-2"></i>Download
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      // Get business creation date
      try {
        const businessRes = await fetch("/api/business/business/details");
        if (!businessRes.ok)
          throw new Error("Failed to fetch business details");
        const businessData = await businessRes.json();
        const dateCreated = businessData.business?.dateCreated;

        if (dateCreated) {
          const startDate = new Date(dateCreated);
          const currentDate = new Date();
          const monthsActive = Math.floor(
            (currentDate - startDate) / (1000 * 60 * 60 * 24 * 30)
          );
          document.getElementById("months-active").textContent = monthsActive;
          document.getElementById("date-created").textContent =
            startDate.toLocaleDateString();
        }
      } catch (error) {
        console.error("Error fetching business details:", error);
      }
    } catch (error) {
      console.error("Error fetching subscription details:", error);
      showToast("Failed to load subscription data", "error");
    }
  }

  // --- Plan Upgrade Function ---
  async function upgradePlan(plan) {
    if (!currentBusinessId) {
      showToast("Business ID not found", "error");
      return;
    }

    const planPrices = {
      basic: 2999,
      premium: 5999,
      enterprise: 9999,
    };

    const price = planPrices[plan];
    if (!price) {
      showToast("Invalid plan selected", "error");
      return;
    }

    // Show M-Pesa modal
    document.getElementById("paymentAmount").value = `KES ${price}`;
    showStep("step3");
    document.getElementById("mpesa-modal").classList.remove("hidden");
    selectedPlan = plan;
    selectedPlanPrice = price;
  }

  // --- Payment Processing ---
  async function processPayment() {
    const phoneInput = document.getElementById("phone-input");
    const phone = phoneInput.value.trim();

    if (!phone) {
      showToast("Please enter your M-Pesa phone number", "error");
      return;
    }

    if (!currentBusinessId || !selectedPlan || !selectedPlanPrice) {
      showToast("Missing plan information", "error");
      return;
    }

    // Show processing popup
    document.getElementById("processingPopup").classList.remove("hidden");

    try {
      const response = await fetch("/payments/mpesa/stkpush", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          businessId: currentBusinessId,
          plan: selectedPlan,
          amount: selectedPlanPrice,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast("Payment request sent to your phone", "success");
        pollPaymentStatus(data.transactionId);
      } else {
        document.getElementById("processingPopup").classList.add("hidden");
        showToast(data.message || "Payment failed", "error");
      }
    } catch (error) {
      document.getElementById("processingPopup").classList.add("hidden");
      showToast("Network error during payment", "error");
    }
  }

  // --- Payment Status Polling ---
  async function pollPaymentStatus(
    transactionId,
    attempts = 0,
    maxAttempts = 20
  ) {
    if (attempts >= maxAttempts) {
      document.getElementById("processingPopup").classList.add("hidden");
      showToast("Payment timed out", "error");
      return;
    }

    try {
      const response = await fetch(`/payments/status/${transactionId}`);
      const data = await response.json();

      if (data.status === "success") {
        document.getElementById("processingPopup").classList.add("hidden");
        document.getElementById("approvedPopup").classList.remove("hidden");
        fetchSubscriptionDetails();

        setTimeout(() => {
          document.getElementById("approvedPopup").classList.add("hidden");
          document.getElementById("mpesa-modal").classList.add("hidden");
          showStep("step1");
        }, 3000);
      } else if (data.status === "failed") {
        document.getElementById("processingPopup").classList.add("hidden");
        showToast("Payment failed. Please try again", "error");
      } else {
        // Continue polling
        setTimeout(() => pollPaymentStatus(transactionId, attempts + 1), 2000);
      }
    } catch (error) {
      console.error("Payment status check failed:", error);
      setTimeout(() => pollPaymentStatus(transactionId, attempts + 1), 2000);
    }
  }

  // --- Cancel Subscription ---
  async function cancelSubscription() {
    if (!currentBusinessId) {
      showToast("Business ID not found", "error");
      return;
    }

    if (!confirm("Are you sure you want to cancel your subscription?")) return;

    try {
      const response = await fetch("/subscriptions/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: currentBusinessId }),
      });

      if (response.ok) {
        showToast("Subscription cancelled successfully", "success");
        fetchSubscriptionDetails();
      } else {
        const error = await response.json();
        showToast(error.message || "Cancellation failed", "error");
      }
    } catch (error) {
      showToast("Network error during cancellation", "error");
    }
  }

  // --- Modal Step Management ---
  function showStep(stepId) {
    // Hide all steps
    document.querySelectorAll("[data-step]").forEach((step) => {
      step.classList.add("hidden");
    });

    // Show requested step
    document.getElementById(stepId).classList.remove("hidden");
  }

  // --- Event Listeners ---

  // Plan selection buttons
  document.querySelectorAll("[data-plan]").forEach((button) => {
    button.addEventListener("click", (e) => {
      const plan = e.target.dataset.plan;
      document.getElementById(
        "confirm-plan-name"
      ).textContent = `${plan} subscription`;
      document.getElementById("confirmation-modal").classList.remove("hidden");
      document.getElementById("confirm-plan-change").dataset.plan = plan;
    });
  });

  // Confirm plan change
  document
    .getElementById("confirm-plan-change")
    .addEventListener("click", (e) => {
      const plan = e.target.dataset.plan;
      document.getElementById("confirmation-modal").classList.add("hidden");
      upgradePlan(plan);
    });

    

  // Cancel plan change
  document
    .getElementById("cancel-plan-change")
    .addEventListener("click", () => {
      document.getElementById("confirmation-modal").classList.add("hidden");
    });

  // Close modals
 // Close payment-modal when clicking outside modal content
document.getElementById("payment-modal").addEventListener("click", (e) => {
  if (e.target.id === "payment-modal") {
    document.getElementById("payment-modal").classList.add("hidden");
    showStep("step1"); // reset to initial step
  }
});


  // Upgrade Plan button
document.getElementById("upgrade-plan-btn").addEventListener("click", () => {
  const mpesaModal = document.getElementById("mpesa-modal");
  mpesaModal.classList.remove("hidden");
  mpesaModal.classList.add("flex"); // ensure centering
});
document.getElementById("mpesa-modal").addEventListener("click", (e) => {
  if (e.target.id === "mpesa-modal") {
    e.currentTarget.classList.add("hidden");
    showStep("step1"); // if you’re using step system
  }
});


  // Update Payment button

document
  .getElementById("update-payment-button")
  .addEventListener("click", () => {
    document.getElementById("payment-modal").classList.remove("hidden");
  });
  // Cancel Subscription button
  document
    .getElementById("cancel-subscription-button")
    .addEventListener("click", cancelSubscription);

  // M-Pesa payment button
  document.getElementById("send-stk").addEventListener("click", processPayment);

  // Modal step navigation
  document.querySelectorAll("[data-step-action]").forEach((button) => {
    button.addEventListener("click", (e) => {
      const action = e.target.dataset.stepAction;
      if (action === "show-plans") {
        showStep("step2");
      } else if (action === "show-payment") {
        showStep("step3");
      } else if (action === "prev-step") {
        const currentStep = document.querySelector(
          "[data-step]:not(.hidden)"
        ).id;
        if (currentStep === "step3") showStep("step2");
        if (currentStep === "step2") showStep("step1");
      }
    });
  });

  // Initial data load
  fetchSubscriptionDetails();
});

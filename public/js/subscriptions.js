document.addEventListener("DOMContentLoaded", () => {
  // Theme Toggle (existing code)
  // Sidebar Toggle (existing code)
  // Scroll Reveal Animation (existing code)
  // Toast Notification Function (existing code)
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
  let selectedPlan = null; // Stores the plan name
  let selectedPlanId = null; // Stores the plan's database ID
  let selectedPlanPrice = null;
  let currentBusinessId = null;
  let currentPlanPrice = null; // Added to store current plan price
  let currentBusinessEmail = null; // To store the business email for Paystack

  // --- Function to check subscription status and calculate days until expiry ---
  async function checkSubscriptionStatus() {
    try {
      const response = await fetch("/subscriptions/details", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const subscription = data.subscription;

      if (!subscription) {
        return {
          isActive: false,
          daysUntilExpiry: 0,
          isExpired: true,
        };
      }
      const now = new Date();
      const expiryDate = new Date(subscription.endDate);
      const daysUntilExpiry = Math.ceil(
        (expiryDate - now) / (1000 * 60 * 60 * 24)
      );

      return {
        isActive: subscription.status === "active",
        daysUntilExpiry: daysUntilExpiry,
        isExpired: daysUntilExpiry <= 0,
        expiryDate: expiryDate,
      };
    } catch (error) {
      console.error("Error checking subscription status:", error);
      return {
        isActive: false,
        daysUntilExpiry: 0,
        isExpired: true,
      };
    }
  }

  // --- Notification system to show expiry warnings ---
  function showExpiryNotification(daysUntilExpiry) {
    let message, type;

    // Remove existing banner if any before showing new one
    const existingBanner = document.getElementById("subscription-banner");
    if (existingBanner) existingBanner.remove();

    if (daysUntilExpiry <= 0) {
      message =
        "Your subscription has expired. Services are now limited. Please renew to restore full access.";
      type = "error";
    } else if (daysUntilExpiry <= 7) {
      message = `Your subscription will expire in ${daysUntilExpiry} day${
        daysUntilExpiry === 1 ? "" : "s"
      }. Please renew to avoid service interruption.`;
      type = "warning";
    }

    if (message) {
      // Show toast notification
      showToast(message, type);

      // Show permanent notification banner if within 7 days or expired
      const bannerHtml = `
        <div id="subscription-banner" class="fixed top-0 left-0 right-0 bg-gradient-to-r ${
          type === "error"
            ? "from-red-600 to-red-700"
            : "from-yellow-600 to-yellow-700"
        } text-white py-3 px-4 text-center z-50">
          <p class="text-sm font-medium">${message}</p>
          <a href="/manageSubscriptions.html" class="ml-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-${
            type === "error" ? "red" : "yellow"
          }-700 bg-white hover:bg-gray-100">
            Renew Now
          </a>
        </div>
      `;

      // Add new banner
      document.body.insertAdjacentHTML("afterbegin", bannerHtml);
    }
  }

  // --- Feature locking/unlocking placeholder functions ---
  function lockFeatures() {
    console.log("Subscription expired: Locking features.");
    // Implement your feature locking logic here.
    // E.g., disable buttons, hide premium content, show upgrade prompts.
    // document.getElementById("premium-feature-button").disabled = true;
    // document.getElementById("premium-content").classList.add("hidden");
    // showToast("Features limited due to expired subscription.", "warning");
  }

  function unlockFeatures() {
    console.log("Subscription active: Unlocking features.");
    // Implement your feature unlocking logic here.
    // E.g., enable buttons, show premium content.
    // document.getElementById("premium-feature-button").disabled = false;
    // document.getElementById("premium-content").classList.remove("hidden");
  }

  // --- Function to check and update subscription status periodically ---
  async function monitorSubscriptionStatus() {
    const status = await checkSubscriptionStatus();

    // Show notification if within 7 days of expiry or expired
    if (status.daysUntilExpiry <= 7) {
      showExpiryNotification(status.daysUntilExpiry);
    }

    // Lock features if expired
    if (status.isExpired) {
      lockFeatures();
    } else {
      unlockFeatures();
    }

    // Store the status globally
    window.isSubscriptionActive = status.isActive && !status.isExpired;
  }

  // --- Fetch Subscription Details Function (updated) ---
  async function fetchSubscriptionDetails() {
    try {
      const response = await fetch("/subscriptions/details", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 404) {
          // No active subscription found, handle as a normal case
          console.log("No active subscription found for this business.");
          document.getElementById("plan-name").textContent = "No Active Plan";
          document.getElementById("plan-status").textContent = "Inactive";
          document.getElementById("plan-start").textContent = "N/A";
          document.getElementById("plan-end").textContent = "N/A";
          document.getElementById("plan-price").textContent = "N/A";

          // Set usage stats to N/A or 0/0 when no active plan
          const transactionsElement = document.querySelector(
            '[data-usage="transactions"]'
          );
          if (transactionsElement) transactionsElement.textContent = "0 / 0";
          const storageElement = document.querySelector(
            '[data-usage="storage"]'
          );
          if (storageElement) storageElement.textContent = "0GB / 0GB";
          const apiElement = document.querySelector('[data-usage="api"]');
          if (apiElement) apiElement.textContent = "0K / 0K";

          // Hide or reset progress bars
          const txProgressBar = document.querySelector(
            ".usage-bar-transactions"
          );
          if (txProgressBar) txProgressBar.style.width = "0%";
          const stProgressBar = document.querySelector(".usage-bar-storage");
          if (stProgressBar) stProgressBar.style.width = "0%";
          const apiProgressBar = document.querySelector(".usage-bar-api");
          if (apiProgressBar) apiProgressBar.style.width = "0%";

          document.getElementById("plan-autoRenew").textContent = "Off";
          document
            .getElementById("plan-autoRenew")
            .classList.add("text-gray-400");
          document
            .getElementById("plan-autoRenew")
            .classList.remove("text-success-400");
          const toggleCircle = document.querySelector(
            "#plan-autoRenew + .flex .w-4.h-4"
          );
          if (toggleCircle) {
            toggleCircle.classList.add("left-1");
            toggleCircle.classList.remove("right-1");
          }

          const tbody = document.querySelector("table tbody");
          tbody.innerHTML = `
            <tr>
              <td colspan="5" class="text-center py-4 text-gray-400">No billing history available.</td>
            </tr>
          `;
          return;
        }
        throw new Error("Failed to fetch subscription details");
      }

      const data = await response.json();
      const sub = data.subscription;

      // Ensure that 'plan' is an object with 'name' and 'price' if populated
      const planName = sub.plan ? sub.plan.name : "N/A";
      const planPrice = sub.plan ? sub.plan.price : "N/A";

      // Store current plan price numerically
      currentPlanPrice = planPrice; // Store actual price from backend

      // Update UI with subscription details
      document.getElementById("plan-name").textContent = planName
        ? `${planName} Plan`
        : "N/A";
      document.getElementById("plan-status").textContent = sub.status
        ? sub.status.charAt(0).toUpperCase() + sub.status.slice(1)
        : "N/A";
      document.getElementById("plan-start").textContent = sub.startDate
        ? new Date(sub.startDate).toLocaleDateString()
        : "N/A";
      document.getElementById("plan-end").textContent = sub.endDate
        ? new Date(sub.endDate).toLocaleDateString()
        : "N/A";

      // Set display price
      document.getElementById("plan-price").textContent =
        planPrice !== "N/A" ? `KES ${planPrice.toLocaleString()}` : "N/A";

      // Update auto-renew status
      const autoRenewStatus = document.getElementById("plan-autoRenew");
      if (autoRenewStatus) {
        // Added check for element existence
        if (sub.autoRenew) {
          autoRenewStatus.textContent = "On";
          autoRenewStatus.classList.add("text-success-400");
          autoRenewStatus.classList.remove("text-gray-400");
          const toggleCircle = document.querySelector(
            "#plan-autoRenew + .flex .w-4.h-4"
          );
          if (toggleCircle) {
            toggleCircle.classList.add("right-1");
            toggleCircle.classList.remove("left-1");
          }
        } else {
          autoRenewStatus.textContent = "Off";
          autoRenewStatus.classList.add("text-gray-400");
          autoRenewStatus.classList.remove("text-success-400");
          const toggleCircle = document.querySelector(
            "#plan-autoRenew + .flex .w-4.h-4"
          );
          if (toggleCircle) {
            toggleCircle.classList.add("left-1");
            toggleCircle.classList.remove("right-1");
          }
        }
      }

      // Store current businessId and email (assuming email is part of user/business details)
      currentBusinessId = sub.business;
      // You'll need an endpoint to get the business email. For now, let's assume it's available or hardcode for testing.
      // A more robust solution would involve fetching business details:
      try {
        const businessRes = await fetch("/api/business/business/details", {
          credentials: "include",
        });
        const businessData = await businessRes.json();
        currentBusinessEmail = businessData.business?.email; // Assuming email is on business object
      } catch (e) {
        console.error("Could not fetch business email:", e);
        currentBusinessEmail = "user@example.com"; // Fallback
      }

      // Update usage stats
      if (sub.usage) {
        // Transactions
        const txUsed = sub.usage.transactions?.used || 0;
        const txLimit = sub.usage.transactions?.limit || 0;
        const txPercent = txLimit ? Math.min(100, (txUsed / txLimit) * 100) : 0;
        const transactionsElement = document.querySelector(
          '[data-usage="transactions"]'
        );
        if (transactionsElement)
          transactionsElement.textContent = `${txUsed.toLocaleString()} / ${txLimit.toLocaleString()}`;
        const txProgressBar = document.querySelector(".usage-bar-transactions");
        if (txProgressBar) txProgressBar.style.width = `${txPercent}%`;

        // Storage
        const stUsed = sub.usage.storage?.used || 0;
        const stLimit = sub.usage.storage?.limit || 0;
        const stPercent = stLimit ? Math.min(100, (stUsed / stLimit) * 100) : 0;
        const storageElement = document.querySelector('[data-usage="storage"]');
        if (storageElement)
          storageElement.textContent = `${stUsed}GB / ${stLimit}GB`;
        const stProgressBar = document.querySelector(".usage-bar-storage");
        if (stProgressBar) stProgressBar.style.width = `${stPercent}%`;

        // API Calls
        const apiUsed = sub.usage.apiCalls?.used || 0;
        const apiLimit = sub.usage.apiCalls?.limit || 0;
        const apiPercent = apiLimit
          ? Math.min(100, (apiUsed / apiLimit) * 100)
          : 0;
        const apiElement = document.querySelector('[data-usage="api"]');
        if (apiElement)
          apiElement.textContent = `${(apiUsed / 1000).toFixed(1)}K / ${(
            apiLimit / 1000
          ).toFixed(0)}K`;
        const apiProgressBar = document.querySelector(".usage-bar-api");
        if (apiProgressBar) apiProgressBar.style.width = `${apiPercent}%`;
      }

      // Fetch and update billing history from logs
      const historyResponse = await fetch("/subscriptions/history", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!historyResponse.ok)
        throw new Error("Failed to fetch billing history");
      const historyData = await historyResponse.json();
      const billingHistory = historyData.history;

      const tbody = document.querySelector("table tbody");
      tbody.innerHTML = "";
      if (billingHistory && billingHistory.length > 0) {
        billingHistory.forEach((entry) => {
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
                  <p class="text-white font-medium">${
                    entry.plan ? entry.plan.name : "N/A"
                  } Subscription</p>
                  <p class="text-gray-400 text-sm">${
                    entry.action || "Payment"
                  } (KES ${
            entry.totalPrice ? entry.totalPrice.toLocaleString() : "N/A"
          })</p>
                </div>
              </div>
            </td>
            <td class="py-4 px-6 text-white font-bold">KES ${
              entry.totalPrice ? entry.totalPrice.toLocaleString() : "N/A"
            }</td>
            <td class="py-4 px-6">
              <span class="bg-gradient-to-r ${
                entry.status === "active" || entry.status === "completed"
                  ? "from-success-500 to-success-600"
                  : "from-red-500 to-red-600"
              } text-white text-xs font-bold px-3 py-1 rounded-full">
                <i class="fas fa-${
                  entry.status === "active" || entry.status === "completed"
                    ? "check"
                    : "times"
                } mr-1"></i>${entry.status ? entry.status.toUpperCase() : "N/A"}
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
      } else {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" class="text-center py-4 text-gray-400">No billing history available.</td>
          </tr>
        `;
      }

      // Get business creation date
      try {
        const businessRes = await fetch("/api/business/business/details", {
          credentials: "include",
        });
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
          console.log("Months active:", monthsActive);
          document.getElementById("months-active").textContent = monthsActive;
          document.getElementById("date-created").textContent =
            startDate.toLocaleDateString();
        }
      } catch (error) {
        console.error("Error fetching business details:", error);
      }

      // After fetching subscription details, check expiry status and show notification
      const { daysUntilExpiry } = await checkSubscriptionStatus();
      showExpiryNotification(daysUntilExpiry);
    } catch (error) {
      console.error("Error fetching subscription details:", error);
      showToast("Failed to load subscription data", "error");
    }
  }

  async function fetchAvailablePlans() {
    try {
      const response = await fetch("/plans", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to fetch plans");

      const responseData = await response.json();

      let plansArray = [];
      if (Array.isArray(responseData)) {
        plansArray = responseData;
      } else if (responseData.plans && Array.isArray(responseData.plans)) {
        plansArray = responseData.plans;
      } else {
        console.error("Unexpected plans response:", responseData);
        throw new Error("Invalid plans data format");
      }

      const plansList = document.getElementById("plans-list");
      plansList.innerHTML = "";

      if (plansArray.length === 0) {
        plansList.innerHTML = `
        <div class="text-center py-4 text-gray-400">
          <i class="fas fa-exclamation-circle mr-2"></i>
          No subscription plans available
        </div>
      `;
        return;
      }

      plansArray.forEach((plan) => {
        const button = document.createElement("button");
        button.className =
          "w-full px-4 py-3 mb-2 bg-gray-800 rounded-lg text-left hover:bg-gray-700";
        button.innerHTML = `
        <div class="font-semibold">${plan.name} Plan</div>
        <div class="text-sm text-gray-400">KES ${plan.price.toLocaleString()}</div>
      `;
        button.addEventListener("click", () => {
          // Store both ID and name
          selectedPlan = plan.name;
          selectedPlanId = plan._id; // Store the plan's database ID
          selectedPlanPrice = plan.price;

          document.getElementById(
            "confirm-plan-name"
          ).textContent = `${plan.name} subscription`;
          document
            .getElementById("confirmation-modal")
            .classList.remove("hidden");
          document.getElementById("confirm-plan-change").dataset.plan =
            plan.name;
        });

        plansList.appendChild(button);
      });
    } catch (error) {
      console.error("Error fetching plans:", error);

      const plansList = document.getElementById("plans-list");
      plansList.innerHTML = `
      <div class="text-center py-4 text-red-400">
        <i class="fas fa-exclamation-triangle mr-2"></i>
        Failed to load plans: ${error.message}
      </div>
    `;
      showToast("Failed to load available plans", "error");
    }
  }

  // --- Plan Upgrade Function (Now initiates Paystack payment) ---
  async function upgradePlan(planName, planId, amount) {
    if (!currentBusinessId) {
      showToast("Business ID not found. Please log in again.", "error");
      return;
    }
    if (!currentBusinessEmail) {
      showToast("User email not found. Cannot initiate payment.", "error");
      return;
    }

    // Populate Paystack modal fields
    document.getElementById("paystack-email-input").value =
      currentBusinessEmail;
    document.getElementById(
      "paystack-amount"
    ).value = `KES ${amount.toLocaleString()}`;
    showStep("step3"); // Show the payment details step
  }

  // --- Paystack Payment Initiation ---
  async function initiatePaystackPayment() {
    const email = document.getElementById("paystack-email-input").value.trim();
    const amount = selectedPlanPrice; // Use the selected plan's price

    if (!email || !amount || !selectedPlanId || !currentBusinessId) {
      showToast("Missing payment or plan information.", "error");
      return;
    }

    // Generate a unique reference for Paystack
    const reference = `sub_${currentBusinessId}_${selectedPlanId}_${Date.now()}`;

    document.getElementById("processingPopup").classList.remove("hidden"); // Show processing popup

    try {
      const response = await fetch("/payments/paystack/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          businessId: currentBusinessId,
          planId: selectedPlanId,
          amount: amount,
          email: email,
          reference: reference,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Initialize Paystack payment
        const paystackHandler = PaystackPop.setup({
          key: "YOUR_PAYSTACK_PUBLIC_KEY", // Replace with your actual Paystack Public Key
          email: email,
          amount: amount * 100, // Amount in kobo (or cents for other currencies)
          ref: reference, // unique identifier
          metadata: {
            businessId: currentBusinessId,
            planId: selectedPlanId,
          },
          callback: async (response) => {
            // This is called when payment is successful or closed by user
            document.getElementById("processingPopup").classList.add("hidden"); // Hide processing popup
            if (response.status === "success") {
              showToast("Payment successful! Verifying...", "success");
              // Redirect to a success page or verify on backend
              window.location.href = `/subscriptions?payment_status=success&reference=${response.reference}`;
            } else {
              showToast("Payment not completed or failed.", "error");
            }
            document.getElementById("mpesa-modal").classList.add("hidden");
            showStep("step1"); // Reset modal to step1
            fetchSubscriptionDetails(); // Refresh details after attempting payment
          },
          onClose: () => {
            document.getElementById("processingPopup").classList.add("hidden");
            showToast("Payment window closed.", "info");
            document.getElementById("mpesa-modal").classList.add("hidden");
            showStep("step1"); // Reset modal to step1
          },
        });
        paystackHandler.openIframe(); // Open Paystack payment popup
      } else {
        document.getElementById("processingPopup").classList.add("hidden");
        showToast(
          data.message || "Failed to initiate Paystack payment",
          "error"
        );
      }
    } catch (error) {
      document.getElementById("processingPopup").classList.add("hidden");
      console.error("Error during Paystack initiation:", error);
      showToast("Network error during payment initiation.", "error");
    }
  }

  // --- Check for URL parameters after payment redirection ---
  function checkPaymentStatusFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get("payment_status");
    const reference = urlParams.get("reference");

    if (paymentStatus === "success" && reference) {
      // Clear URL parameters to prevent re-triggering
      history.replaceState({}, document.title, window.location.pathname);
      showToast("Payment successful! Updating subscription...", "success");
      // Optionally, you can make a call to your backend to verify again
      // Although the webhook should have handled it, this provides a fallback
      fetch(`/payments/paystack/status/${reference}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "success") {
            showToast("Subscription updated successfully!", "success");
            fetchSubscriptionDetails(); // Refresh the subscription details
          } else {
            showToast("Payment verification failed.", "error");
            fetchSubscriptionDetails(); // Still refresh to show current state
          }
        })
        .catch((error) => {
          console.error("Error verifying payment from frontend:", error);
          showToast("Error verifying payment.", "error");
          fetchSubscriptionDetails();
        });
    } else if (paymentStatus === "failed") {
      history.replaceState({}, document.title, window.location.pathname);
      showToast("Payment failed. Please try again.", "error");
    }
  }

  // --- Cancel Subscription (fixed with modal integration) ---
  async function cancelSubscription() {
    if (!currentBusinessId) {
      showToast("Business ID not found", "error");
      return;
    }

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
    // For M-Pesa modal steps, which are direct children of the modal content
    document.getElementById("step1").classList.add("hidden");
    document.getElementById("step2").classList.add("hidden");
    document.getElementById("step3").classList.add("hidden");

    // Show requested step
    document.getElementById(stepId).classList.remove("hidden");
  }

  // --- UPDATED: Plan upgrade button handler (Fixed ID) ---
  document.getElementById("upgrade-plan-btn").addEventListener("click", () => {
    document.getElementById("mpesa-modal").classList.remove("hidden"); // Show the payment modal
    showStep("step1"); // Show the initial step of the modal
  });

  // --- FIXED: Cancel subscription modal handlers ---
  document
    .getElementById("cancel-subscription-button")
    .addEventListener("click", () => {
      document
        .getElementById("cancel-confirmation-modal")
        .classList.remove("hidden");
    });

  document.getElementById("cancel-cancel").addEventListener("click", () => {
    document
      .getElementById("cancel-confirmation-modal")
      .classList.add("hidden");
  });

  document.getElementById("confirm-cancel").addEventListener("click", () => {
    document
      .getElementById("cancel-confirmation-modal")
      .classList.add("hidden");
    cancelSubscription();
  });

  // --- Event Listeners ---

  // Plan selection buttons (now dynamically added by fetchAvailablePlans)
  // This event listener needs to be attached to dynamically created buttons
  // Handled within fetchAvailablePlans function now

  // Confirm plan change (modified to call upgradePlan with correct details)
  document
    .getElementById("confirm-plan-change")
    .addEventListener("click", (e) => {
      const planName = selectedPlan;
      const planId = selectedPlanId;
      const amount = selectedPlanPrice;

      if (!planName || !planId || !amount) {
        showToast("Please select a plan first.", "error");
        return;
      }

      document.getElementById("confirmation-modal").classList.add("hidden");
      upgradePlan(planName, planId, amount); // Call upgradePlan to prepare for Paystack
    });

  // Cancel plan change
  document
    .getElementById("cancel-plan-change")
    .addEventListener("click", () => {
      document.getElementById("confirmation-modal").classList.add("hidden");
    });

  // Close modals
  // Close mpesa-modal when clicking outside modal content (now for Paystack)
  document.getElementById("mpesa-modal").addEventListener("click", (e) => {
    if (e.target.id === "mpesa-modal") {
      e.currentTarget.classList.add("hidden");
      showStep("step1"); // reset to initial step
    }
  });

  // Pay with Paystack button
  document
    .getElementById("payWithPaystack")
    .addEventListener("click", initiatePaystackPayment);

  // Update Payment button (repurposed for Paystack)
  document
    .getElementById("update-payment-button")
    .addEventListener("click", () => {
      if (!currentBusinessEmail) {
        showToast(
          "User email not available. Cannot proceed with payment.",
          "error"
        );
        return;
      }
      // Set payment amount to current plan price
      if (currentPlanPrice !== null) {
        document.getElementById(
          "paystack-amount"
        ).value = `KES ${currentPlanPrice.toLocaleString()}`;
        document.getElementById("paystack-email-input").value =
          currentBusinessEmail;
        showStep("step3"); // Go directly to payment step
        document.getElementById("mpesa-modal").classList.remove("hidden"); // Show the modal
      } else {
        showToast("Current plan price not available.", "error");
      }
    });

  // Mobile sidebar toggle: This was missing!
  document.getElementById("toggle-sidebar").addEventListener("click", () => {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");
    sidebar.classList.toggle("translate-x-0");
    sidebar.classList.toggle("-translate-x-full"); // Assuming it starts hidden
    overlay.classList.toggle("hidden");
    document.body.classList.toggle("sidebar-open"); // To prevent body scroll
  });

  // Overlay click to close sidebar
  document.getElementById("overlay").addEventListener("click", () => {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");
    sidebar.classList.add("-translate-x-full");
    sidebar.classList.remove("translate-x-0");
    overlay.classList.add("hidden");
    document.body.classList.remove("sidebar-open");
  });

  // Initialize scroll reveal animations: This was also missing!
  const scrollReveals = document.querySelectorAll(".scroll-reveal");
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

  scrollReveals.forEach((element) => {
    observer.observe(element);
  });

  // Initial data load
  fetchSubscriptionDetails();
  checkPaymentStatusFromURL(); // Check for payment status on page load

  // Check subscription status every hour
  setInterval(monitorSubscriptionStatus, 60 * 60 * 1000);

  // Also check immediately when page loads
  document.addEventListener("DOMContentLoaded", monitorSubscriptionStatus);
});

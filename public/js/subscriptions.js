document.addEventListener("DOMContentLoaded", () => {
  // --- Global Application State ---
  const appState = {
    selectedPlan: null, // Stores { _id, name, price } of the plan chosen for upgrade
    currentSubscription: null, // Stores { _id, plan, endDate, status, price, paymentMethod, ... }
    currentBusiness: null, // Stores { _id, email, dateCreated, ... }
    paymentAction: "upgrade", // 'upgrade' or 'updatePaymentMethod'
  };

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

  // --- Function to check subscription status and calculate days until expiry ---
  async function checkSubscriptionStatus() {
    // This function will now use appState.currentSubscription
    if (!appState.currentSubscription) {
      return {
        isActive: false,
        daysUntilExpiry: 0,
        isExpired: true,
      };
    }

    const now = new Date();
    const expiryDate = new Date(appState.currentSubscription.endDate);
    const daysUntilExpiry = Math.ceil(
      (expiryDate - now) / (1000 * 60 * 60 * 24)
    );

    return {
      isActive: appState.currentSubscription.status === "active",
      daysUntilExpiry: daysUntilExpiry,
      isExpired: daysUntilExpiry <= 0,
      expiryDate: expiryDate,
    };
  }

  // --- Notification system to show expiry warnings ---
  function showExpiryNotification(daysUntilExpiry) {
    let message, type;
    const existingBanner = document.getElementById("subscription-banner");
    if (existingBanner) existingBanner.remove(); // Clear existing banners

    if (daysUntilExpiry <= 0 && appState.currentSubscription) {
      // Only show if there was a subscription that expired
      message =
        "Your subscription has expired. Services are now limited. Please renew to restore full access.";
      type = "error";
    } else if (
      daysUntilExpiry <= 7 &&
      daysUntilExpiry > 0 &&
      appState.currentSubscription
    ) {
      message = `Your subscription will expire in ${daysUntilExpiry} day${
        daysUntilExpiry === 1 ? "" : "s"
      }. Please renew to avoid service interruption.`;
      type = "warning";
    }

    if (message) {
      showToast(message, type);

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
      document.body.insertAdjacentHTML("afterbegin", bannerHtml);
    }
  }

  // --- Feature locking/unlocking placeholder functions ---
  function lockFeatures() {
    console.log("Subscription expired: Locking features.");
    const restrictedElements = document.querySelectorAll(
      '[data-requires-subscription="true"]'
    );
    restrictedElements.forEach((element) => {
      element.classList.add("opacity-50", "pointer-events-none", "grayscale");
    });
  }

  function unlockFeatures() {
    console.log("Subscription active: Unlocking features.");
    const restrictedElements = document.querySelectorAll(
      '[data-requires-subscription="true"]'
    );
    restrictedElements.forEach((element) => {
      element.classList.remove(
        "opacity-50",
        "pointer-events-none",
        "grayscale"
      );
    });
  }

  // --- Function to check and update subscription status periodically ---
  async function monitorSubscriptionStatus() {
    // Re-fetch details to ensure appState.currentSubscription is fresh
    await fetchSubscriptionDetails();
    const status = await checkSubscriptionStatus();

    if (status.daysUntilExpiry <= 7) {
      showExpiryNotification(status.daysUntilExpiry);
    } else {
      const existingBanner = document.getElementById("subscription-banner");
      if (existingBanner) existingBanner.remove();
    }

    if (status.isExpired) {
      lockFeatures();
    } else {
      unlockFeatures();
    }

    window.isSubscriptionActive = status.isActive && !status.isExpired;
  }

  // --- Fetch Business Details (critical first step) ---
  async function fetchBusinessDetails() {
    try {
      const response = await fetch("/api/business/business/details", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch business details");
      }
      const data = await response.json();
      // Map the id to _id for consistency
      appState.currentBusiness = {
        ...data.business,
        _id: data.business.id, // Add this line to map id to _id
      };
      console.log("Business details fetched:", appState.currentBusiness); // Debug log

      // Update validation check to use either id or _id
      if (!appState.currentBusiness?.id && !appState.currentBusiness?._id) {
        console.error("Business details missing ID:", appState.currentBusiness);
        showToast("Invalid business details received", "error");
        return;
      }

      // Verify business ID exists
      if (!appState.currentBusiness?._id) {
        console.error(
          "Business details missing _id:",
          appState.currentBusiness
        );
        showToast("Invalid business details received", "error");
        return;
      }

      // Update months active and date created
      if (appState.currentBusiness?.dateCreated) {
        const startDate = new Date(appState.currentBusiness.dateCreated);
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
      showToast("Failed to load business details.", "error");
      // Set fallback values if business details cannot be fetched
      appState.currentBusiness = {
        _id: "unknown_business",
        email: "fallback@example.com",
      };
      document.getElementById("months-active").textContent = "N/A";
      document.getElementById("date-created").textContent = "N/A";
    }
  }

  // --- Fetch Subscription Details Function ---
  async function fetchSubscriptionDetails() {
    // Check if currentBusiness is available, if not, try fetching it.
    if (!appState.currentBusiness || !appState.currentBusiness.id) {
      console.warn(
        "Business ID not available yet, attempting to fetch business details before subscription."
      );
      await fetchBusinessDetails(); // Try to get business details
      if (!appState.currentBusiness || !appState.currentBusiness.id) {
        console.error(
          "Failed to retrieve Business ID. Cannot fetch subscription details."
        );
        return; // Exit if still no business ID
      }
    }

    try {
      const response = await fetch("/subscriptions/details", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log("No active subscription found for this business.");
          appState.currentSubscription = null; // Clear any old subscription data
          // Update UI for 'No Active Plan' scenario
          document.getElementById("current-plan-name").textContent =
            "No Active Plan";
          document.getElementById("current-plan-price").textContent = "N/A";
          document.getElementById("subscription-status").textContent =
            "Inactive";
          document.getElementById("subscription-expiry").textContent = "N/A";
          document.getElementById("current-payment-method").textContent = "N/A";
          const tbody = document.querySelector("table tbody");
          tbody.innerHTML = `
            <tr>
              <td colspan="5" class="text-center py-4 text-gray-400">No billing history available.</td>
            </tr>
          `;
          return;
        }
        throw new Error(
          `Failed to fetch subscription details: ${response.statusText}`
        );
      }

      const data = await response.json();
      appState.currentSubscription = data.subscription;
      console.log(
        "Subscription details fetched:",
        appState.currentSubscription
      );

      // Update new fields for plan display using appState
      document.getElementById("current-plan-name").textContent =
        appState.currentSubscription.plan?.name || "N/A";
      document.getElementById("current-plan-price").textContent =
        appState.currentSubscription.price !== undefined &&
        appState.currentSubscription.price !== null
          ? `KES ${appState.currentSubscription.price.toLocaleString()}`
          : "N/A";
      document.getElementById("subscription-status").textContent = appState
        .currentSubscription.status
        ? appState.currentSubscription.status.charAt(0).toUpperCase() +
          appState.currentSubscription.status.slice(1)
        : "N/A";
      document.getElementById("subscription-expiry").textContent = appState
        .currentSubscription.endDate
        ? new Date(appState.currentSubscription.endDate).toLocaleDateString()
        : "N/A";
      document.getElementById("current-payment-method").textContent = appState
        .currentSubscription.paymentMethod
        ? appState.currentSubscription.paymentMethod.charAt(0).toUpperCase() +
          appState.currentSubscription.paymentMethod.slice(1)
        : "N/A";

      // Show/hide upgrade button based on status
      const upgradeBtn = document.getElementById("upgrade-plan-btn");
      if (upgradeBtn) {
        upgradeBtn.disabled = appState.currentSubscription.status !== "active";
        upgradeBtn.classList.toggle(
          "opacity-50",
          appState.currentSubscription.status !== "active"
        );
        upgradeBtn.classList.toggle(
          "pointer-events-none",
          appState.currentSubscription.status !== "active"
        );
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
                    entry.plan?.name || "N/A"
                  } Subscription</p>
                  <p class="text-gray-400 text-sm">${
                    entry.action || "Payment"
                  } (KES ${
            entry.price ? entry.price.toLocaleString() : "N/A"
          })</p>
                </div>
              </div>
            </td>
            <td class="py-4 px-6 text-white font-bold">KES ${
              entry.price ? entry.price.toLocaleString() : "N/A"
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

      // Check expiry status and show notification
      const { daysUntilExpiry } = await checkSubscriptionStatus();
      showExpiryNotification(daysUntilExpiry);
    } catch (error) {
      console.error("Error fetching subscription details:", error);
      showToast("Failed to load subscription data", "error");
      appState.currentSubscription = null; // Ensure current subscription is null on error
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
          appState.selectedPlan = {
            _id: plan._id,
            name: plan.name,
            price: plan.price,
          };

          document.getElementById(
            "confirm-plan-name"
          ).textContent = `${plan.name} subscription`;
          document
            .getElementById("confirmation-modal")
            .classList.remove("hidden");
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

  // --- M-Pesa Payment Initiation Placeholder ---
  async function initiateMpesaPayment() {
    showToast("M-Pesa payment initiation is not yet implemented.", "info");
    // TODO: Implement M-Pesa payment initiation by calling your backend endpoint
  }

  // --- Paystack Payment Initiation ---
  async function initiatePaystackPayment() {
    const email = document.getElementById("paystack-email-input").value.trim();
    let amountToPay = 0;
    let planIdForPayment = null;

    if (appState.paymentAction === "upgrade") {
      // Ensure selectedPlan and its price exist and are valid numbers
      if (
        appState.selectedPlan &&
        typeof appState.selectedPlan.price === "number" && // Ensure it's a number
        appState.selectedPlan.price > 0 // Crucial: Only initiate payment if price is greater than 0
      ) {
        amountToPay = appState.selectedPlan.price;
        planIdForPayment = appState.selectedPlan._id;
      } else if (appState.selectedPlan && appState.selectedPlan.price === 0) {
        // Handle free trial plan upgrade: bypass payment
        showToast(
          "Upgrading to a free plan. Bypassing payment gateway.",
          "info"
        );
        console.log("Upgrading to a free plan (price 0). Bypassing Paystack.");
        // Directly call the upgrade logic on the backend without Paystack
        try {
          const response = await fetch("/subscriptions/upgrade", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              businessId: appState.currentBusiness.id,
              planId: appState.selectedPlan._id,
              paymentMethod: "N/A", // Or a specific identifier for free plans
              // No amount or reference needed for free upgrade
            }),
          });
          if (response.ok) {
            showToast(
              "Subscription upgraded successfully (free plan)!",
              "success"
            );
            document
              .getElementById("payment-options-modal")
              .classList.add("hidden");
            showStep("payment-step-1");
            fetchSubscriptionDetails(); // Refresh details
          } else {
            const errorData = await response.json();
            showToast(
              errorData.message ||
                "Failed to upgrade subscription (free plan).",
              "error"
            );
          }
        } catch (error) {
          console.error("Error during free plan upgrade:", error);
          showToast("Network error during free plan upgrade.", "error");
        }
        document.getElementById("processingPopup").classList.add("hidden");
        return; // Exit as payment is bypassed
      } else {
        showToast(
          "Selected plan or its price is invalid for upgrade.",
          "error"
        );
        console.error(
          "Upgrade: Invalid selected plan or price:",
          appState.selectedPlan
        );
        document.getElementById("processingPopup").classList.add("hidden");
        return;
      }
    } else if (appState.paymentAction === "updatePaymentMethod") {
      // Ensure currentSubscription, its price, and its plan ID exist and price > 0
      if (
        appState.currentSubscription &&
        typeof appState.currentSubscription.price === "number" && // Ensure it's a number
        appState.currentSubscription.price > 0 && // Crucial: Only initiate payment if price is greater than 0
        appState.currentSubscription.plan?._id
      ) {
        amountToPay = appState.currentSubscription.price;
        planIdForPayment = appState.currentSubscription.plan._id;
      } else {
        showToast(
          "Current subscription is free or invalid for payment method update. No payment required.",
          "info"
        );
        console.warn(
          "Update Payment Method: Current subscription is free (price 0) or invalid. Bypassing Paystack."
        );
        document.getElementById("processingPopup").classList.add("hidden");
        document
          .getElementById("payment-options-modal")
          .classList.add("hidden");
        showStep("payment-step-1");
        // No payment needed, just update UI. Could theoretically call backend to log method change if desired.
        fetchSubscriptionDetails();
        return; // Exit as payment is bypassed
      }
    }

    // --- Added detailed logging ---
    console.log("Current business state:", appState.currentBusiness); // Debug log

    // Update validation check
    if (
      !email ||
      !amountToPay ||
      !planIdForPayment ||
      !(appState.currentBusiness?.id || appState.currentBusiness?._id)
    ) {
      showToast(
        "Missing payment or business information. Please try again.",
        "error"
      );
      console.error("Missing critical info for Paystack init:", {
        email,
        amountToPay,
        planIdForPayment,
        businessId:
          appState.currentBusiness?.id || appState.currentBusiness?._id,
      });
      document.getElementById("processingPopup").classList.add("hidden");
      return;
    }

    // Use id instead of _id in request body
    const businessId =
      appState.currentBusiness.id || appState.currentBusiness._id;

    // Generate a unique reference for Paystack
    const reference = `sub_${
      appState.currentBusiness.id
    }_${planIdForPayment}_${Date.now()}`;

    document.getElementById("processingPopup").classList.remove("hidden"); // Show processing popup

    try {
      const response = await fetch("/payments/paystack/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          businessId: businessId, // Use the businessId variable
          planId: planIdForPayment,
          amount: amountToPay,
          email: email,
          reference: reference,
          action: appState.paymentAction, // Pass the action type (upgrade or updatePaymentMethod)
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Initialize Paystack payment
        const paystackHandler = PaystackPop.setup({
          key: "pk_live_bdcc7613b63180912b0084c1b83a35d1226f265c", // Replace with your actual Paystack Public Key
          email: email,
          amount: amountToPay * 100, // Amount in kobo (or cents for other currencies)
          ref: reference, // unique identifier
          metadata: {
            businessId: appState.currentBusiness.id,
            planId: planIdForPayment, // Pass the correct planId in metadata
            action: appState.paymentAction, // Pass the action type
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
            document
              .getElementById("payment-options-modal")
              .classList.add("hidden"); // Close the payment modal
            showStep("payment-step-1"); // Reset modal to step1
            fetchSubscriptionDetails(); // Refresh details after attempting payment
          },
          onClose: () => {
            document.getElementById("processingPopup").classList.add("hidden");
            showToast("Payment window closed.", "info");
            document
              .getElementById("payment-options-modal")
              .classList.add("hidden"); // Close the payment modal
            showStep("payment-step-1"); // Reset modal to step1
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
      history.replaceState({}, document.title, window.location.pathname); // Clear URL params
      showToast("Payment successful! Updating subscription...", "success");
      // The backend webhook is the primary source of truth,
      // but this frontend check can provide immediate feedback.
      // fetch(`/payments/paystack/status/${reference}`) // Removed as webhook handles this
    } else if (paymentStatus === "failed") {
      history.replaceState({}, document.title, window.location.pathname); // Clear URL params
      showToast("Payment failed. Please try again.", "error");
    }
  }

  // --- Cancel Subscription ---
  async function cancelSubscription() {
    if (!appState.currentBusiness?._id) {
      showToast("Business ID not found", "error");
      return;
    }

    try {
      const response = await fetch("/subscriptions/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ businessId: appState.currentBusiness.id }),
      });

      if (response.ok) {
        showToast("Subscription cancelled successfully", "success");
        await fetchSubscriptionDetails(); // Refresh details
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
    document
      .querySelectorAll("#payment-options-modal [data-step]")
      .forEach((step) => {
        step.classList.add("hidden");
      });
    document.getElementById(stepId)?.classList.remove("hidden");
  }

  // --- Event Listeners ---

  // Main "Upgrade Plan" button
  document.getElementById("upgrade-plan-btn").addEventListener("click", () => {
    console.log("Upgrade button clicked");
    console.log("Current state:", {
      selectedPlan: appState.selectedPlan,
      currentSubscription: appState.currentSubscription,
      currentBusiness: appState.currentBusiness,
    });
    appState.paymentAction = "upgrade";
    document.getElementById("payment-options-modal").classList.remove("hidden");
    showStep("payment-step-1");
  });

  // "Upgrade Plan" button inside the modal (from step 1 to step 2)
  document
    .getElementById("modal-upgrade-plan-btn")
    .addEventListener("click", () => {
      showStep("payment-step-2");
      fetchAvailablePlans(); // Load plans when modal opens
    });

  // "Update Payment" button from main page
  document
    .getElementById("update-payment-button")
    .addEventListener("click", async () => {
      appState.paymentAction = "updatePaymentMethod";
      // Ensure business and subscription details are fresh
      await fetchSubscriptionDetails();

      if (!appState.currentBusiness || !appState.currentSubscription) {
        showToast(
          "Current subscription details not available. Please ensure you have an active subscription.",
          "error"
        );
        console.error("Error: Missing details for update payment method:", {
          business: appState.currentBusiness,
          subscription: appState.currentSubscription,
        });
        return;
      }
      // Populate with current plan details
      document.getElementById("paystack-email-input").value =
        appState.currentBusiness.email || "";
      // Only set amount if price is greater than 0
      const currentPrice = appState.currentSubscription.price;
      if (typeof currentPrice === "number" && currentPrice > 0) {
        document.getElementById(
          "paystack-amount"
        ).value = `KES ${currentPrice.toLocaleString()}`;
        document.getElementById(
          "mpesa-amount"
        ).value = `KES ${currentPrice.toLocaleString()}`;
      } else {
        document.getElementById("paystack-amount").value = `KES 0 (Trial/Free)`;
        document.getElementById("mpesa-amount").value = `KES 0 (Trial/Free)`;
        showToast(
          "Current subscription is free. No payment required to update method.",
          "info"
        );
      }

      document
        .getElementById("payment-options-modal")
        .classList.remove("hidden");
      showStep("payment-step-3"); // Go to choose payment method
    });

  // "Update Payment Method" button inside the modal (from step 1 to step 3)
  document
    .getElementById("modal-update-payment-method-btn")
    .addEventListener("click", async () => {
      appState.paymentAction = "updatePaymentMethod";
      await fetchSubscriptionDetails();

      if (!appState.currentBusiness || !appState.currentSubscription) {
        showToast(
          "Current subscription details not available for update. Please ensure you have an active subscription.",
          "error"
        );
        console.error(
          "Error: Missing details for update payment method from modal:",
          {
            business: appState.currentBusiness,
            subscription: appState.currentSubscription,
          }
        );
        return;
      }
      document.getElementById("paystack-email-input").value =
        appState.currentBusiness.email || "";
      // Only set amount if price is greater than 0
      const currentPrice = appState.currentSubscription.price;
      if (typeof currentPrice === "number" && currentPrice > 0) {
        document.getElementById(
          "paystack-amount"
        ).value = `KES ${currentPrice.toLocaleString()}`;
        document.getElementById(
          "mpesa-amount"
        ).value = `KES ${currentPrice.toLocaleString()}`;
      } else {
        document.getElementById("paystack-amount").value = `KES 0 (Trial/Free)`;
        document.getElementById("mpesa-amount").value = `KES 0 (Trial/Free)`;
        showToast(
          "Current subscription is free. No payment required to update method.",
          "info"
        );
      }

      document
        .getElementById("payment-options-modal")
        .classList.remove("hidden");
      showStep("payment-step-3");
    });

  // Listener for "Back" buttons in modal steps
  document
    .querySelectorAll('[data-step-action="prev-step"]')
    .forEach((button) => {
      button.addEventListener("click", () => {
        const currentStep = button.closest("[data-step]");
        if (currentStep) {
          if (currentStep.id === "payment-step-2") {
            showStep("payment-step-1");
          } else if (currentStep.id === "payment-step-3") {
            if (appState.paymentAction === "upgrade") {
              showStep("payment-step-2");
            } else if (appState.paymentAction === "updatePaymentMethod") {
              showStep("payment-step-1");
            }
          } else if (
            currentStep.id === "payment-step-4-mpesa" ||
            currentStep.id === "payment-step-4-paystack"
          ) {
            showStep("payment-step-3");
          }
        }
      });
    });

  // Cancel subscription modal handlers
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

  // Confirm plan change (modified to go to choose payment method)
  document
    .getElementById("confirm-plan-change")
    .addEventListener("click", async (e) => {
      if (!appState.selectedPlan) {
        showToast("Please select a plan first.", "error");
        return;
      }

      console.log("Selected plan:", appState.selectedPlan);

      // Add loading state
      const button = e.target;
      button.disabled = true;
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

      try {
        // Hide confirmation modal and show payment options
        document.getElementById("confirmation-modal").classList.add("hidden");
        document
          .getElementById("payment-options-modal")
          .classList.remove("hidden");
        showStep("payment-step-3"); // Go directly to payment method selection

        // Pre-fill email if available
        if (appState.currentBusiness?.email) {
          document.getElementById("paystack-email-input").value =
            appState.currentBusiness.email;
        }

        // Set amount in payment forms
        if (appState.selectedPlan.price) {
          document.getElementById(
            "paystack-amount"
          ).value = `KES ${appState.selectedPlan.price.toLocaleString()}`;
          document.getElementById(
            "mpesa-amount"
          ).value = `KES ${appState.selectedPlan.price.toLocaleString()}`;
        }
      } catch (error) {
        console.error("Upgrade failed:", error);
        showToast("Failed to upgrade plan. Please try again.", "error");
      } finally {
        button.disabled = false;
        button.innerHTML = "Confirm";
      }
    });

  // Cancel plan change
  document
    .getElementById("cancel-plan-change")
    .addEventListener("click", () => {
      document.getElementById("confirmation-modal").classList.add("hidden");
    });

  // Close modals
  document
    .getElementById("payment-options-modal")
    .addEventListener("click", (e) => {
      if (e.target.id === "payment-options-modal") {
        e.currentTarget.classList.add("hidden");
        showStep("payment-step-1"); // reset to initial step
      }
    });

  // Payment method selection buttons
  document.getElementById("selectMpesa").addEventListener("click", () => {
    showStep("payment-step-4-mpesa");
    document.getElementById("mpesa-phone-input").value = ""; // Clear for new input
    // Amount based on action
    const amount =
      appState.paymentAction === "upgrade"
        ? appState.selectedPlan?.price
        : appState.currentSubscription?.price;
    document.getElementById("mpesa-amount").value = `KES ${
      amount ? amount.toLocaleString() : "N/A"
    }`;
  });

  document.getElementById("selectPaystack").addEventListener("click", () => {
    showStep("payment-step-4-paystack");
    document.getElementById("paystack-email-input").value =
      appState.currentBusiness?.email || "";
    // Amount based on action
    const amount =
      appState.paymentAction === "upgrade"
        ? appState.selectedPlan?.price
        : appState.currentSubscription?.price;
    document.getElementById("paystack-amount").value = `KES ${
      amount ? amount.toLocaleString() : "N/A"
    }`;
  });

  // Pay with M-Pesa button (placeholder)
  document
    .getElementById("payWithMpesa")
    .addEventListener("click", initiateMpesaPayment);

  // Pay with Paystack button
  document
    .getElementById("payWithPaystack")
    .addEventListener("click", initiatePaystackPayment);

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

  // Initial data load: Fetch business details FIRST, then subscription details
  async function initialLoad() {
    await fetchBusinessDetails();
    await fetchSubscriptionDetails();
    monitorSubscriptionStatus(); // This will re-check and set notifications
  }

  initialLoad();
  checkPaymentStatusFromURL(); // Check for payment status on page load

  // Check subscription status every hour
  setInterval(monitorSubscriptionStatus, 60 * 60 * 1000);
});

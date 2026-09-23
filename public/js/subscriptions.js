// Add custom CSS styles for enhanced subscription UI
const subscriptionStyles = `
  .subscription-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    margin-top: 0.5rem;
  }
  
  .plan-upgrade-badge {
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: bold;
  }
  
  .action-button {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .action-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  }
  
  .action-button:active {
    transform: translateY(0);
  }
`;

// Inject styles into the document
const styleSheet = document.createElement("style");
styleSheet.textContent = subscriptionStyles;
document.head.appendChild(styleSheet);

document.addEventListener("DOMContentLoaded", () => {
  // --- Global Application State ---
  const appState = {
    selectedPlan: null, // Stores { _id, name, price } of the plan chosen for upgrade
    currentSubscription: null, // Stores { _id, plan, endDate, status, price, paymentMethod, ... }
    currentBusiness: null, // Stores { _id, email, dateCreated, ... }
    paymentAction: "upgrade", // 'upgrade', 'payCurrent', or 'updatePaymentMethod'
  };

  // Expose appState and flow helpers globally so inline handlers (upgradeToPlan etc.) can use them
  window.appState = appState;

  // Toast Notification Function (existing code)
  function showToast(
    message = "Action completed Successfully!",
    type = "success",
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

  // --- Helper function to determine if plan is a trial ---
  function isTrialPlan(plan) {
    if (!plan) return false;
    const planName = plan.name || plan;
    return planName.toLowerCase() === "trial";
  }

  // --- Helper function to get available actions based on subscription status ---
  function getAvailableActions() {
    const actions = {
      canUpgrade: false,
      canPayCurrent: false,
      canUpdatePayment: false,
      isCurrentTrial: false,
      isCurrentPaid: false,
      needsPayment: false,
    };

    if (!appState.currentSubscription) {
      // No subscription - can select any plan
      actions.canUpgrade = true;
      return actions;
    }

    const { status, plan, price } = appState.currentSubscription;
    actions.isCurrentTrial = isTrialPlan(plan);
    actions.isCurrentPaid = !actions.isCurrentTrial;
    actions.needsPayment = status === "pending" || (price === 0 && !actions.isCurrentTrial);

    // Can upgrade if subscription is active and current plan is not trial
actions.canUpgrade = status === "active" && !actions.isCurrentTrial;
    
    // Can pay for current plan if it's a trial that needs activation
    actions.canPayCurrent = actions.isCurrentTrial && (status === "active" || status === "pending");

    // Paid plan that needs payment/renewal — also allow paying for the current plan
    if (!actions.isCurrentTrial && (status === "pending" || status === "expired")) {
      actions.canPayCurrent = true;
    }
    
    // Can always update payment method if there's a subscription
    actions.canUpdatePayment = true;

    return actions;
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
      (expiryDate - now) / (1000 * 60 * 60 * 24),
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

    // Never show the "Renew Now" banner on the Subscription Hub itself
    // (it links to the page the user is already on).
    const isExemptPage = (window.location.pathname || "")
      .toLowerCase()
      .endsWith("managesubscriptions.html");

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

      if (isExemptPage) return; // toast only on Subscription Hub, no self-link banner

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
      '[data-requires-subscription="true"]',
    );
    restrictedElements.forEach((element) => {
      element.classList.add("opacity-50", "pointer-events-none", "grayscale");
    });
  }

  function unlockFeatures() {
    console.log("Subscription active: Unlocking features.");
    const restrictedElements = document.querySelectorAll(
      '[data-requires-subscription="true"]',
    );
    restrictedElements.forEach((element) => {
      element.classList.remove(
        "opacity-50",
        "pointer-events-none",
        "grayscale",
      );
    });
  }

  // --- Function to check and update subscription status periodically ---
  async function monitorSubscriptionStatus() {
    // Use unified subscription manager instead of duplicate logic
    if (window.SubscriptionManager) {
      const state = window.SubscriptionManager.getCurrentState();
      
      // Update appState for compatibility
      appState.currentSubscription = state.subscription;
      window.isSubscriptionActive = state.isActive && !state.isExpired;
      
      console.log('Using unified subscription manager:', state);
    } else {
      // Fallback to local logic if unified manager not available
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
  }

  // Session is dead -> log out to login. Never show subscription UI for this.
  function redirectToLoginOnSessionExpiry() {
    try {
      const path = (window.location.pathname || "").toLowerCase();
      if (path.endsWith("login.html") || path.endsWith("/login")) return;
    } catch (e) { /* fall through to redirect */ }
    window.location.href = "/login.html?session=expired";
  }

  // --- Fetch Business Details (critical first step) ---
  async function fetchBusinessDetails() {
    try {
      const response = await fetch("/api/business/business/details", {
        credentials: "include",
      });
      if (!response.ok) {
        // Expired/invalid session -> login page, not subscription UI.
        if (response.status === 401 || response.status === 403) {
          console.warn("Session invalid - redirecting to login.");
          redirectToLoginOnSessionExpiry();
          return;
        }
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
          appState.currentBusiness,
        );
        showToast("Invalid business details received", "error");
        return;
      }

      // Update months active and date created
      if (appState.currentBusiness?.dateCreated) {
        const startDate = new Date(appState.currentBusiness.dateCreated);
        const currentDate = new Date();
        const monthsActive = Math.floor(
          (currentDate - startDate) / (1000 * 60 * 60 * 24 * 30),
        );
        const monthsActiveElement = document.getElementById("months-active");
        const dateCreatedElement = document.getElementById("date-created");
        if (monthsActiveElement) monthsActiveElement.textContent = monthsActive;
        if (dateCreatedElement)
          dateCreatedElement.textContent = startDate.toLocaleDateString();
      }
    } catch (error) {
      console.error("Error fetching business details:", error);
      showToast("Failed to load business details.", "error");
      // Set fallback values if business details cannot be fetched
      appState.currentBusiness = {
        _id: "unknown_business",
        email: "fallback@example.com",
      };
      const monthsActiveElement = document.getElementById("months-active");
      const dateCreatedElement = document.getElementById("date-created");
      if (monthsActiveElement) monthsActiveElement.textContent = "N/A";
      if (dateCreatedElement) dateCreatedElement.textContent = "N/A";
    }
  }

  // --- Fetch Subscription Details Function ---
  async function fetchSubscriptionDetails() {
    // Check if currentBusiness is available, if not, try fetching it.
    if (
      !appState.currentBusiness ||
      !(appState.currentBusiness.id || appState.currentBusiness._id)
    ) {
      console.warn(
        "Business ID not available yet, attempting to fetch business details before subscription.",
      );
      await fetchBusinessDetails(); // Try to get business details
      if (
        !appState.currentBusiness ||
        !(appState.currentBusiness.id || appState.currentBusiness._id)
      ) {
        console.error(
          "Failed to retrieve Business ID. Cannot fetch subscription details.",
        );
        return; // Exit if still no business ID
      }
    }

    try {
      const response = await fetch(
        `/subscriptions/details?currency=${encodeURIComponent(
          window.PAYMENT_CURRENCY || "",
        )}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        },
      );

      if (!response.ok) {
        // Expired/invalid session -> login page, not subscription UI.
        if (response.status === 401 || response.status === 403) {
          let message = "";
          try {
            const errData = await response.clone().json();
            message = errData.message || "";
          } catch (_) { /* ignore parse errors */ }
          if (
            response.status === 401 ||
            /token|auth|unauthorized|login|session|forbidden/i.test(message)
          ) {
            console.warn("Session invalid - redirecting to login.");
            redirectToLoginOnSessionExpiry();
            return;
          }
        }
        if (response.status === 404) {
          console.log("No active subscription found for this business.");
          appState.currentSubscription = null; // Clear any old subscription data
          // Update UI for 'No Active Plan' scenario
          const planNameElement = document.getElementById("current-plan-name");
          const planPriceElement =
            document.getElementById("current-plan-price");
          const statusElement = document.getElementById("subscription-status");
          const expiryElement = document.getElementById("subscription-expiry");
          const paymentElement = document.getElementById(
            "current-payment-method",
          );

          if (planNameElement) planNameElement.textContent = "No Active Plan";
          if (planPriceElement) planPriceElement.textContent = "N/A";
          if (statusElement) statusElement.textContent = "Inactive";
          if (expiryElement) expiryElement.textContent = "N/A";
          if (paymentElement) paymentElement.textContent = "N/A";
          const tbody = document.querySelector("table tbody");
          if (tbody) {
            tbody.innerHTML = `
              <tr>
                <td colspan="5" class="text-center py-4 text-gray-400">No billing history available.</td>
              </tr>
            `;
          }
          return;
        }
        throw new Error(
          `Failed to fetch subscription details: ${response.statusText}`,
        );
      }

      const data = await response.json();
      appState.currentSubscription = data.subscription;
      console.log(
        "Subscription details fetched:",
        appState.currentSubscription,
      );

      // Update new fields for plan display using appState
      const planNameElement = document.getElementById("current-plan-name");
      const planPriceElement = document.getElementById("current-plan-price");
      const statusElement = document.getElementById("subscription-status");
      const expiryElement = document.getElementById("subscription-expiry");
      const paymentElement = document.getElementById("current-payment-method");

      if (planNameElement)
        planNameElement.textContent =
          appState.currentSubscription.plan?.name || "N/A";
      if (planPriceElement) {
        const subPrice =
          appState.currentSubscription.displayPrice != null
            ? appState.currentSubscription.displayPrice
            : appState.currentSubscription.price;
        planPriceElement.textContent =
          subPrice !== undefined && subPrice !== null
            ? formatCurrency(subPrice, appState.currentSubscription.displayCurrency)
            : "N/A";
      }
      if (statusElement) {
        statusElement.textContent = appState.currentSubscription.status
          ? appState.currentSubscription.status.charAt(0).toUpperCase() +
            appState.currentSubscription.status.slice(1)
          : "N/A";
      }
      if (expiryElement) {
        expiryElement.textContent = appState.currentSubscription.endDate
          ? new Date(appState.currentSubscription.endDate).toLocaleDateString()
          : "N/A";
      }
      if (paymentElement) {
        paymentElement.textContent = appState.currentSubscription.paymentMethod
          ? appState.currentSubscription.paymentMethod.charAt(0).toUpperCase() +
            appState.currentSubscription.paymentMethod.slice(1)
          : "N/A";
      }

      // Update UI based on available actions
      setTimeout(updateSubscriptionActions, 100); // Small delay to ensure DOM is ready

      // Fetch and update billing history from logs
      const historyResponse = await fetch(
        `/subscriptions/history?currency=${encodeURIComponent(
          window.PAYMENT_CURRENCY || "",
        )}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        },
      );

      if (!historyResponse.ok)
        throw new Error("Failed to fetch billing history");
      const historyData = await historyResponse.json();
      const billingHistory = historyData.history;

      const tbody = document.querySelector("table tbody");
      if (tbody) {
        tbody.innerHTML = "";
        if (billingHistory && billingHistory.length > 0) {
          billingHistory.forEach((entry) => {
            const tr = document.createElement("tr");
            tr.className = "hover:bg-white/5 transition-colors group";
            tr.innerHTML = `
              <td class="py-4 px-6 text-white font-medium">${new Date(
                entry.date,
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
                    } (${
                      entry.displayPrice != null
                        ? formatCurrency(entry.displayPrice, entry.displayCurrency)
                        : "N/A"
                    })</p>
                  </div>
                </div>
              </td>
              <td class="py-4 px-6 text-white font-bold">${
                entry.displayPrice != null
                  ? formatCurrency(entry.displayPrice, entry.displayCurrency)
                  : "N/A"
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

  // --- Function to update subscription action buttons based on current status ---
  function updateSubscriptionActions() {
    const actions = getAvailableActions();
    const actionContainer = document.querySelector(".flex.flex-col.gap-3.w-full.md\\:w-auto");
    
    if (!actionContainer) return;

    // Clear existing buttons
    actionContainer.innerHTML = "";

    // Pay for Current Plan button (for trial plans)
    if (actions.canPayCurrent) {
      const payCurrentBtn = document.createElement("button");
      payCurrentBtn.id = "pay-current-plan-btn";
      payCurrentBtn.className = "px-6 py-3 bg-gradient-to-r from-success-500 to-success-600 hover:from-success-600 hover:to-success-700 text-white rounded-xl font-bold shadow-lg shadow-success-500/25 transition-all hover:scale-105 flex items-center justify-center gap-2";
      payCurrentBtn.innerHTML = '<i class="fas fa-credit-card"></i> Pay for Current Plan';
      actionContainer.appendChild(payCurrentBtn);

      // Add event listener
      payCurrentBtn.addEventListener("click", () => {
        console.log("Pay current plan clicked");
        if (!appState.currentBusiness) {
          showToast("Business information not available. Please refresh the page.", "error");
          return;
        }
        appState.paymentAction = "payCurrent";
        initiatePaymentFlow();
      });
    }

    // Upgrade Plan button (for paid plans)
    if (actions.canUpgrade) {
      const upgradeBtn = document.createElement("button");
      upgradeBtn.id = "upgrade-plan-btn";
      upgradeBtn.className = "px-6 py-3 bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white rounded-xl font-bold shadow-lg shadow-accent-500/25 transition-all hover:scale-105 flex items-center justify-center gap-2";
      upgradeBtn.innerHTML = '<i class="fas fa-arrow-circle-up"></i> Upgrade Plan';
      actionContainer.appendChild(upgradeBtn);

      // Add event listener
      upgradeBtn.addEventListener("click", () => {
        console.log("Upgrade button clicked");
        if (!appState.currentBusiness) {
          showToast("Business information not available. Please refresh the page.", "error");
          return;
        }
        appState.paymentAction = "upgrade";
        showUpgradeFlow();
      });
    }

    // Update Payment Method button
    if (actions.canUpdatePayment) {
      const updatePaymentBtn = document.createElement("button");
      updatePaymentBtn.id = "update-payment-method-btn";
      updatePaymentBtn.className = "px-6 py-3 border border-primary-200 dark:border-primary-700 text-primary-700 dark:text-primary-300 rounded-xl font-bold hover:bg-primary-50 dark:hover:bg-primary-800 transition-colors flex items-center justify-center gap-2";
      updatePaymentBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Update Payment Method';
      actionContainer.appendChild(updatePaymentBtn);

      // Add event listener
      updatePaymentBtn.addEventListener("click", async () => {
        appState.paymentAction = "updatePaymentMethod";
        await showUpdatePaymentFlow();
      });
    }

    // Cancel Subscription button (only for active paid subscriptions)
    if (appState.currentSubscription && appState.currentSubscription.status === "active" && !actions.isCurrentTrial) {
      const cancelBtn = document.createElement("button");
      cancelBtn.id = "cancel-subscription-button";
      cancelBtn.className = "px-6 py-3 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2";
      cancelBtn.innerHTML = '<i class="fas fa-times-circle"></i> Cancel Plan';
      actionContainer.appendChild(cancelBtn);

      // Add event listener
      cancelBtn.addEventListener("click", () => {
        const cancelModal = document.getElementById("cancel-confirmation-modal");
        if (cancelModal) cancelModal.classList.remove("hidden");
      });
    }

    // Add status indicator
    const statusDiv = document.createElement("div");
    statusDiv.className = "px-4 py-2 rounded-lg text-sm font-medium text-center";
    
    if (actions.isCurrentTrial) {
      statusDiv.className += " bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300";
      statusDiv.innerHTML = '<i class="fas fa-clock mr-2"></i>Trial Plan';
    } else if (actions.needsPayment) {
      statusDiv.className += " bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300";
      statusDiv.innerHTML = '<i class="fas fa-exclamation-triangle mr-2"></i>Payment Required';
    } else if (appState.currentSubscription?.status === "active") {
      statusDiv.className += " bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300";
      statusDiv.innerHTML = '<i class="fas fa-check-circle mr-2"></i>Active Plan';
    } else {
      statusDiv.className += " bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300";
      statusDiv.innerHTML = '<i class="fas fa-info-circle mr-2"></i>No Active Plan';
    }
    
    actionContainer.appendChild(statusDiv);

    // Add helpful information text
    const infoDiv = document.createElement("div");
    infoDiv.className = "text-xs text-primary-500 dark:text-primary-400 mt-2 text-center";
    
    if (actions.isCurrentTrial) {
      infoDiv.innerHTML = '<i class="fas fa-info-circle mr-1"></i>Activate your trial by choosing a paid plan';
    } else if (actions.canUpgrade) {
      infoDiv.innerHTML = '<i class="fas fa-arrow-up mr-1"></i>Upgrade to unlock more features';
    } else if (!appState.currentSubscription) {
      infoDiv.innerHTML = '<i class="fas fa-rocket mr-1"></i>Get started with a plan';
    }
    
actionContainer.appendChild(infoDiv);
  }

  // --- Function to initiate payment flow for current plan ---
  function initiatePaymentFlow() {
    if (!appState.currentSubscription) {
      showToast("Current subscription details not available", "error");
      return;
    }

    const paymentModal = document.getElementById("payment-options-modal");
    if (!paymentModal) return;
    paymentModal.classList.remove("hidden");

    // On a trial: ask the user to choose a paid plan first
    if (isTrialPlan(appState.currentSubscription.plan)) {
      appState.paymentAction = "payCurrent";
      showStep("payment-step-2"); // Show plan selection
      fetchAvailablePlans();
      showToast("Choose a paid plan to activate your subscription", "info");
      return;
    }

    // Paid plan needing payment: pay for the current plan
    appState.paymentAction = "payCurrent";
    showStep("payment-step-3"); // Go to payment method selection

    // Pre-fill payment details
    const paystackEmailInput = document.getElementById("paystack-email-input");
    if (paystackEmailInput && appState.currentBusiness?.email) {
      paystackEmailInput.value = appState.currentBusiness.email;
    }
  }

  // --- Function to show upgrade flow ---
  function showUpgradeFlow() {
    const paymentModal = document.getElementById("payment-options-modal");
    if (paymentModal) {
      paymentModal.classList.remove("hidden");
      showStep("payment-step-2"); // Show plan selection
      fetchAvailablePlans(); // Load available plans
    }
  }

  // --- Function to show update payment flow ---
  async function showUpdatePaymentFlow() {
    await fetchSubscriptionDetails();

    if (!appState.currentBusiness || !appState.currentSubscription) {
      showToast("Current subscription details not available. Please ensure you have an active subscription.", "error");
      return;
    }

    // Show simple payment method selection modal
    const paymentModal = document.getElementById("payment-options-modal");
    if (paymentModal) {
      paymentModal.classList.remove("hidden");
      showStep("payment-step-3"); // Go directly to payment method selection
      
      // Set payment action for method update
      appState.paymentAction = "updatePaymentMethod";
      
      // Populate with current business details
      const paystackEmailInput = document.getElementById("paystack-email-input");
      
      if (paystackEmailInput) {
        paystackEmailInput.value = appState.currentBusiness.email || "";
      }

      // Update UI to show this is for payment method update
      const paymentStepTitle = document.querySelector("#payment-step-3 h2");
      if (paymentStepTitle) {
        paymentStepTitle.textContent = "Update Payment Method";
      }

      // Hide amount display since we're not charging
      const paystackAmountInput = document.getElementById("paystack-amount");
      const mpesaAmountInput = document.getElementById("mpesa-amount");
      const amountLabels = document.querySelectorAll('label[for="paystack-amount"], label[for="mpesa-amount"]');
      
      if (paystackAmountInput) {
        paystackAmountInput.value = "No charge for method update";
        paystackAmountInput.disabled = true;
      }
      if (mpesaAmountInput) {
        mpesaAmountInput.value = "No charge for method update";
        mpesaAmountInput.disabled = true;
      }
      amountLabels.forEach(label => {
        if (label.textContent.includes('Amount')) {
          label.style.display = 'none';
        }
      });

      showToast("Select your preferred payment method. No charges will be made.", "info");
    }
  }

  // --- Function to get available paid plans (excluding trial) ---
  function getAvailablePaidPlans() {
    // This will be populated by fetchAvailablePlans
    return window.availablePaidPlans || [];
  }

async function fetchAvailablePlans() {
    try {
      const response = await fetch(
        `/plans?currency=${encodeURIComponent(window.PAYMENT_CURRENCY || "")}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        },
      );

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

// Store paid plans globally
      window.availablePaidPlans = plansArray.filter(plan => !isTrialPlan(plan));
      if (window.updatePlanCards) window.updatePlanCards();

      const plansList = document.getElementById("plans-list");
      if (!plansList) return;
      
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

      // Filter plans based on current subscription
const actions = getAvailableActions();
      const currentPlanId = appState.currentSubscription?.plan?._id || appState.currentSubscription?.plan;
      
let eligiblePlans = plansArray;

      // Current plan price in the SAME display currency as the plan list
      const currentPrice =
        appState.currentSubscription?.displayPrice ??
        appState.currentSubscription?.price ??
        0;

      // If upgrading, exclude trial plans and current plan
      if (appState.paymentAction === "upgrade") {
        eligiblePlans = plansArray.filter(plan => {
          // Exclude trial plans
          if (isTrialPlan(plan)) return false;
          
          // Exclude current plan
          if (plan._id === currentPlanId) return false;
          
          // Only allow upgrades to more expensive plans
          return plan.price > currentPrice;
        });
      } else if (appState.paymentAction === "payCurrent") {
        // Trial activation — show paid plans only
        eligiblePlans = plansArray.filter(plan => !isTrialPlan(plan));
      }

      if (eligiblePlans.length === 0) {
        plansList.innerHTML = `
        <div class="text-center py-4 text-gray-400">
          <i class="fas fa-info-circle mr-2"></i>
          ${appState.paymentAction === "upgrade" 
            ? "No upgrade plans available. You're already on the highest tier." 
            : "No suitable plans available."}
        </div>
      `;
        return;
      }

      eligiblePlans.forEach((plan) => {
        const button = document.createElement("button");
        button.className = "w-full px-4 py-3 mb-2 bg-gray-800 rounded-lg text-left hover:bg-gray-700 transition-colors";
        
const isUpgrade =
        plan.price > currentPrice;
        const badgeClass = isUpgrade ? "text-success-400" : "text-gray-400";
        const badgeText = isUpgrade ? "UPGRADE" : "DOWNGRADE";
        
        button.innerHTML = `
          <div class="flex justify-between items-center">
            <div>
              <div class="font-semibold">${plan.name} Plan</div>
              <div class="text-sm text-gray-400">${formatCurrency(
                plan.price,
                plan.currency,
              )}</div>
            </div>
            ${isUpgrade ? `<span class="text-xs ${badgeClass} font-bold">${badgeText}</span>` : ''}
          </div>
`;
        
        button.addEventListener("click", () => {
          appState.selectedPlan = {
            _id: plan._id,
            name: plan.name,
            price: plan.price,
          };

          // Go to payment method selection
          const paymentModal = document.getElementById("payment-options-modal");
          if (paymentModal) {
            showStep("payment-step-3");

            // Pre-fill email
            const paystackEmailInput = document.getElementById("paystack-email-input");
            if (paystackEmailInput && appState.currentBusiness?.email) {
              paystackEmailInput.value = appState.currentBusiness.email;
            }
          }
        });

        plansList.appendChild(button);
      });
    } catch (error) {
      const processingPopup = document.getElementById("processingPopup");
      if (processingPopup) processingPopup.classList.add("hidden");
      console.error("Error during plan fetch:", error);
      showToast("Network error during plan loading.", "error");
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
    if (!appState.currentBusiness?._id && !appState.currentBusiness?.id) {
      showToast("Business ID not found", "error");
      return;
    }

    try {
      const response = await fetch("/subscriptions/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          businessId:
            appState.currentBusiness.id || appState.currentBusiness._id,
        }),
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

    // Keep the payment-method step title in sync with the active flow
    if (stepId === "payment-step-3") {
      const title = document.querySelector("#payment-step-3 h2");
      if (title) {
        title.textContent =
          appState.paymentAction === "updatePaymentMethod"
            ? "Update Payment Method"
            : "Select Payment Method";
      }
    }
  }

  // --- Event Listeners ---

  // Modal buttons (keeping these for the modal flow)
  const modalUpgradePlanBtn = document.getElementById("modal-upgrade-plan-btn");
  if (modalUpgradePlanBtn) {
    modalUpgradePlanBtn.addEventListener("click", () => {
      showStep("payment-step-2");
      if (typeof fetchAvailablePlans === "function") fetchAvailablePlans(); // Load plans when modal opens
    });
  }

  const modalUpdatePaymentBtn = document.getElementById(
    "modal-update-payment-method-btn",
  );
  if (modalUpdatePaymentBtn) {
    modalUpdatePaymentBtn.addEventListener("click", async () => {
      await showUpdatePaymentFlow();
    });
  }

  // Listener for "Back" buttons in modal steps
  const backButtons = document.querySelectorAll(
    '[data-step-action="prev-step"]',
  );
  if (backButtons) {
    backButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const currentStep = button.closest("[data-step]");
        if (currentStep) {
          if (currentStep.id === "payment-step-2") {
            showStep("payment-step-1");
          } else if (currentStep.id === "payment-step-3") {
            if (appState.paymentAction === "upgrade" || (appState.paymentAction === "payCurrent" && isTrialPlan(appState.currentSubscription?.plan))) {
              showStep("payment-step-2");
            } else {
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
  }

  // Cancel subscription modal handlers (for dynamically created buttons)
  document.addEventListener("click", (e) => {
    // Handle cancel subscription button click
    if (e.target.id === "cancel-subscription-button" || e.target.closest("#cancel-subscription-button")) {
      const cancelModal = document.getElementById("cancel-confirmation-modal");
      if (cancelModal) cancelModal.classList.remove("hidden");
    }
  });

  const cancelCancelBtn = document.getElementById("cancel-cancel");
  if (cancelCancelBtn) {
    cancelCancelBtn.addEventListener("click", () => {
      const modal = document.getElementById("cancel-confirmation-modal");
      if (modal) modal.classList.add("hidden");
    });
  }

  const confirmCancelBtn = document.getElementById("confirm-cancel");
  if (confirmCancelBtn) {
    confirmCancelBtn.addEventListener("click", () => {
      const modal = document.getElementById("cancel-confirmation-modal");
      if (modal) modal.classList.add("hidden");
      if (typeof cancelSubscription === "function") cancelSubscription();
    });
  }

  // Note: Confirmation modal logic removed since we go directly to payment method selection

  // Close modals
  const paymentModal = document.getElementById("payment-options-modal");
  if (paymentModal) {
    paymentModal.addEventListener("click", (e) => {
      if (e.target.id === "payment-options-modal") {
        e.currentTarget.classList.add("hidden");
        showStep("payment-step-1"); // reset to initial step
      }
    });
  }

  // Payment method selection buttons
  // document.getElementById("selectMpesa").addEventListener("click", () => {
  //   showStep("payment-step-4-mpesa");
  //   document.getElementById("mpesa-phone-input").value = ""; // Clear for new input
  //   // Amount based on action
  //   const amount =
  //     appState.paymentAction === "upgrade"
  //       ? appState.selectedPlan?.price
  //       : appState.currentSubscription?.price;
  //   document.getElementById("mpesa-amount").value = `KES ${
  //     amount ? amount.toLocaleString() : "N/A"
  //   }`;
  // });

  // Determine the amount to charge based on the current payment action
  function getPaymentAmount() {
    if (appState.paymentAction === "updatePaymentMethod") return null;

    if (
      appState.paymentAction === "upgrade" ||
      isTrialPlan(appState.currentSubscription?.plan)
    ) {
      return appState.selectedPlan?.price || null;
    }

    // Paying for the current paid plan — prefer the display-converted price
    return appState.currentSubscription?.displayPrice != null
      ? appState.currentSubscription.displayPrice
      : appState.currentSubscription?.price != null
        ? appState.currentSubscription.price
        : null;
  }

  // Open the "Complete Payment" step for a chosen channel (card / mobile money)
  function openPaymentStep4(paymentChannel) {
    window.selectedPaymentChannel = paymentChannel;
    showStep("payment-step-4-paystack");
    const paystackEmailInput = document.getElementById("paystack-email-input");
    if (paystackEmailInput)
      paystackEmailInput.value = appState.currentBusiness?.email || "";

    const channelLabel = document.getElementById(
      "selected-payment-channel",
    );
    const paystackAmountInput = document.getElementById("paystack-amount");
    if (paystackAmountInput) {
      if (appState.paymentAction === "updatePaymentMethod") {
        paystackAmountInput.value = "No charge for method update";
      } else {
        const amount = getPaymentAmount();
        paystackAmountInput.value = amount != null ? formatCurrency(amount) : "N/A";
      }
    }
    if (channelLabel) {
      channelLabel.textContent =
        appState.paymentAction === "updatePaymentMethod"
          ? "You're updating your payment method"
          : `Paying with ${
              paymentChannel === "card" ? "Card" : "Mobile Money"
            }`;
    }
  }

  // Card payment method
  const selectCardBtn = document.getElementById("selectCard");
  if (selectCardBtn) {
    selectCardBtn.addEventListener("click", () => openPaymentStep4("card"));
  }

  // Mobile Money payment method
  const selectMobileMoneyBtn = document.getElementById("selectMobileMoney");
  if (selectMobileMoneyBtn) {
    selectMobileMoneyBtn.addEventListener("click", () =>
      openPaymentStep4("mobile_money"),
    );
  }

  // Pay with M-Pesa button (currently disabled in UI)
  // const payWithMpesaBtn = document.getElementById("payWithMpesa");
  // if (payWithMpesaBtn) {
  //   payWithMpesaBtn.addEventListener("click", initiateMpesaPayment);
  // }

  // Pay with Paystack button
  const payWithPaystackBtn = document.getElementById("payWithPaystack");
  if (payWithPaystackBtn) {
    payWithPaystackBtn.addEventListener("click", initiatePaystackPayment);
  }

  // --- Payment Processing Functions ---

  // Function to initiate Paystack payment
  async function initiatePaystackPayment() {
    const processingPopup = document.getElementById("processingPopup");
    if (processingPopup) processingPopup.classList.remove("hidden");

    try {
      const emailInput = document.getElementById("paystack-email-input");

      if (!appState.currentBusiness?._id && !appState.currentBusiness?.id) {
        showToast("Business ID not found", "error");
        return;
      }

      // Handle payment method update differently (no charge)
      if (appState.paymentAction === "updatePaymentMethod") {
return await updatePaymentMethodOnly();
      }

      // Determine plan ID and amount based on action
      let planId, amount, planName, actionText;
      
      if (appState.paymentAction === "upgrade") {
        planId = appState.selectedPlan?._id;
        amount = appState.selectedPlan?.price;
        planName = appState.selectedPlan?.name;
        actionText = `Upgrading to ${planName} Plan`;
      } else if (appState.paymentAction === "payCurrent") {
        if (isTrialPlan(appState.currentSubscription?.plan)) {
          // Trial activation — user picked a paid plan in the plan selection step
          planId = appState.selectedPlan?._id;
          amount = appState.selectedPlan?.price;
          planName = appState.selectedPlan?.name;
          actionText = `Activating ${planName} Plan`;
        } else {
          // Paying for the user's current paid plan
          const currentPlan = appState.currentSubscription?.plan;
          planId = currentPlan?._id || currentPlan;
          amount = appState.currentSubscription?.price;
          planName =
            currentPlan && typeof currentPlan === "object"
              ? currentPlan.name
              : "Current";
          actionText = `Paying for ${planName} Plan`;
        }
      }

      if (!planId || !amount || amount <= 0) {
        showToast("Plan information not available or invalid amount", "error");
        if (isTrialPlan(appState.currentSubscription?.plan)) {
          // Go back to plan selection so the user can choose a plan
          showStep("payment-step-2");
        }
        return;
      }

      const email = emailInput?.value || appState.currentBusiness?.email;
      if (!email) {
        showToast("Email is required for Paystack payment", "error");
        return;
      }

      // Show processing message
      showToast(actionText + "...", "info");

      const paymentChannel = window.selectedPaymentChannel || "paystack";

      const response = await fetch("/payments/paystack/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          businessId:
            appState.currentBusiness.id || appState.currentBusiness._id,
          planId: planId,
          amount: amount,
          email: email,
          action: appState.paymentAction === "payCurrent" ? "upgrade" : appState.paymentAction,
          paymentMethod: paymentChannel,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const providerDetail =
          errorData.error?.message || errorData.error?.meta?.nextStep;
        throw new Error(
          [errorData.message, providerDetail].filter(Boolean).join(" | ") ||
            "Failed to initiate Paystack payment",
        );
      }

      const data = await response.json();

      // Backend converts USD -> a Paystack-supported charge currency and
      // retries on "unsupported_currency". Show the ACTUAL charge so the
      // user isn't surprised when it differs from the display currency.
      if (data.currency && data.amountCharge != null) {
        const amountInput = document.getElementById("paystack-amount");
        if (amountInput) {
          amountInput.value = `${data.currency} ${Number(data.amountCharge).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
        }
        const channelLabel = document.getElementById(
          "selected-payment-channel",
        );
        if (channelLabel && data.triedCurrencies?.length > 1) {
          channelLabel.textContent += ` (charged in ${data.currency})`;
        }
        showToast(
          `Charging ${data.currency} ${Number(data.amountCharge).toLocaleString(undefined, { maximumFractionDigits: 2 })} via Paystack`,
          "info",
        );
      }

      if (data.status && data.data?.authorization_url) {
        // Open Paystack popup
        const publicKey = data.data.public_key || data.publicKey;
        if (!publicKey) {
          showToast(
            "Payment configuration is missing. Please contact support.",
            "error",
          );
          return;
        }
        let paymentCompleted = false;
        const handler = PaystackPop.setup({
          key: publicKey,
          email: email,
          // The backend computes the charge from the plan's USD price and
          // returns it in a Paystack-supported charge currency's minor units.
          // currency MUST be passed explicitly: without it the popup defaults
          // to the integration currency (which may not be enabled) and fails
          // with "Currency not supported by merchant".
          amount: data.amountKobo || Math.round(Number(amount) * 100),
          currency: data.currency || undefined,
          ref: data.data.reference,
          callback: function (response) {
            // Payment succeeded at Paystack - now confirm server-side so the
            // subscription is actually updated (webhooks can't reach
            // localhost/dev, so the frontend must drive confirmation).
            paymentCompleted = true;
            (async () => {
              const ref =
                response?.reference || response?.trxref || response?.trans;
              showToast(
                "Payment successful! Confirming your subscription...",
                "info",
              );
              const paymentModal = document.getElementById(
                "payment-options-modal",
              );
              if (paymentModal) paymentModal.classList.add("hidden");

              try {
                if (!ref) throw new Error("Missing payment reference");
                const confirmRes = await fetch("/payments/paystack/confirm", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({ reference: ref }),
                });
                const confirmData = await confirmRes.json().catch(() => ({}));
                if (!confirmRes.ok) {
                  throw new Error(
                    confirmData.message || "Subscription confirmation failed",
                  );
                }
                showToast(
                  confirmData.message || "Subscription updated successfully!",
                  "success",
                );
              } catch (confirmErr) {
                console.error("Confirm error:", confirmErr);
                showToast(
                  `${confirmErr.message}. If money left your account, refresh - the payment may still confirm via webhook.`,
                  "warning",
                );
              }

              // Refresh subscription details immediately
              await fetchSubscriptionDetails();
              monitorSubscriptionStatus();
            })();
          },
          onClose: function () {
            // v1 inline fires onClose when the modal closes, including right
            // after a successful callback - don't cry wolf in that case.
            if (!paymentCompleted) showToast("Payment cancelled", "warning");
          },
        });
        handler.openIframe();
      } else if (data.message && data.message.includes("free")) {
        // Free plan - no payment required
        showToast("Payment method updated successfully!", "success");
        const paymentModal = document.getElementById("payment-options-modal");
        if (paymentModal) paymentModal.classList.add("hidden");
        await fetchSubscriptionDetails();
        monitorSubscriptionStatus();
      } else {
        throw new Error("Invalid response from payment server");
      }
    } catch (error) {
      console.error("Error during Paystack initiation:", error);
      showToast(error.message || "Failed to initiate Paystack payment", "error");
    } finally {
      if (processingPopup) processingPopup.classList.add("hidden");
    }
  }

  // Function to update payment method only (no charging)
  async function updatePaymentMethodOnly() {
    try {
      const emailInput = document.getElementById("paystack-email-input");
      const email = emailInput?.value || appState.currentBusiness?.email;
      
      if (!email) {
        showToast("Email is required for payment method update", "error");
        return;
      }

      showToast("Updating payment method...", "info");

      // Create a mock reference for Paystack verification (no actual charge)
      const mockReference = `UPDATE_${appState.currentBusiness.id}_${Date.now()}`;

      const response = await fetch("/subscriptions/update-payment-method", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          paymentMethod: "paystack",
          paymentDetails: {
            reference: mockReference,
            email: email
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to update payment method",
        );
      }

      const data = await response.json();
      
      showToast("Payment method updated successfully!", "success");
      
      // Close modal and refresh subscription details
      const paymentModal = document.getElementById("payment-options-modal");
      if (paymentModal) paymentModal.classList.add("hidden");
      
      // Refresh subscription details to show updated payment method
      await fetchSubscriptionDetails();
      
    } catch (error) {
      console.error("Error updating payment method:", error);
      showToast(error.message || "Failed to update payment method", "error");
    }
  }

  // Function to initiate M-Pesa payment (currently disabled in UI)
  // async function initiateMpesaPayment() {
  //   showToast("M-Pesa payment is currently unavailable. Please use Paystack.", "info");
  //   return;

  //   const processingPopup = document.getElementById("processingPopup");
  //   if (processingPopup) processingPopup.classList.remove("hidden");

  //   try {
  //     const phoneInput = document.getElementById("mpesa-phone-input");

  //     if (!appState.currentBusiness?._id && !appState.currentBusiness?.id) {
  //       showToast("Business ID not found", "error");
  //       return;
  //     }

  //     // Determine plan and amount based on action
  //     let plan, durationMonths = 1; // Default to 1 month
  //     if (appState.paymentAction === "upgrade") {
  //       plan = appState.selectedPlan?.name;
  //     } else {
  //       plan = appState.currentSubscription?.plan?.name || appState.currentSubscription?.plan;
  //     }

  //     if (!plan) {
  //       showToast("Plan information not available", "error");
  //       return;
  //     }

  //     const phone = phoneInput?.value;
  //     if (!phone) {
  //       showToast("Phone number is required for M-Pesa payment", "error");
  //       return;
  //     }

  //     // Validate phone number (basic validation for Kenyan numbers)
  //     if (!/^07[0-9]{8}$/.test(phone)) {
  //       showToast("Please enter a valid Kenyan phone number (e.g., 07XXXXXXXX)", "error");
  //       return;
  //     }

  //     const response = await fetch("/payments/mpesa/stkpush", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       credentials: "include",
  //       body: JSON.stringify({
  //         phone: phone,
  //         businessId: appState.currentBusiness.id || appState.currentBusiness._id,
  //         plan: plan,
  //         durationMonths: durationMonths
  //       }),
  //     });

  //     if (!response.ok) {
  //       const errorData = await response.json();
  //       throw new Error(errorData.message || "Failed to initiate M-Pesa payment");
  //     }

  //     const data = await response.json();
  //     showToast("M-Pesa STK Push sent! Please check your phone to complete payment.", "success");

  //     // Close modal after successful initiation
  //     setTimeout(() => {
  //       const paymentModal = document.getElementById("payment-options-modal");
  //       if (paymentModal) paymentModal.classList.add("hidden");
  //     }, 2000);

  //     // Poll for payment status
  //     const checkStatus = async () => {
  //       try {
  //         const statusResponse = await fetch(`/payments/status/${data.subscriptionId}`);
  //         if (statusResponse.ok) {
  //           const statusData = await statusResponse.json();
  //           if (statusData.status === "completed") {
  //             showToast("Payment successful! Processing your subscription...", "success");
  //             await fetchSubscriptionDetails();
  //             monitorSubscriptionStatus();
  //           }
  //         }
  //       } catch (error) {
  //         console.error("Error checking payment status:", error);
  //       }
  //     };

  //     // Check status every 5 seconds for 2 minutes
  //     let checks = 0;
  //     const statusInterval = setInterval(() => {
  //       checkStatus();
  //       checks++;
  //       if (checks >= 24) { // 2 minutes worth of checking
  //         clearInterval(statusInterval);
  //       }
  //     }, 5000);

  //   } catch (error) {
  //     console.error("Error during M-Pesa initiation:", error);
  //     showToast(error.message || "Failed to initiate M-Pesa payment", "error");
  //   } finally {
  //     if (processingPopup) processingPopup.classList.add("hidden");
  //   }
  // }

  // Mobile sidebar toggle: This was missing!
  const toggleSidebarBtn = document.getElementById("toggle-sidebar");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("overlay");

  if (toggleSidebarBtn && sidebar && overlay) {
    toggleSidebarBtn.addEventListener("click", () => {
      sidebar.classList.toggle("translate-x-0");
      sidebar.classList.toggle("-translate-x-full"); // Assuming it starts hidden
      overlay.classList.toggle("hidden");
      document.body.classList.toggle("sidebar-open"); // To prevent body scroll
    });

    // Overlay click to close sidebar
    overlay.addEventListener("click", () => {
      sidebar.classList.add("-translate-x-full");
      sidebar.classList.remove("translate-x-0");
      overlay.classList.add("hidden");
      document.body.classList.remove("sidebar-open");
    });
  }

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
    { threshold: 0.1 },
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

  // Expose flow helpers for inline handlers in manageSubscriptions.html
  window.subscriptionFlow = {
    appState,
    showStep,
    fetchAvailablePlans,
    showUpgradeFlow,
    getPaymentAmount,
    openPaymentStep4,
    initiatePaystackPayment,
  };

  // When the detected display currency changes, refresh plans + details so
  // every price on the page reflects the user's currency.
  window.onCurrencyChanged = () => {
    fetchAvailablePlans();
    fetchSubscriptionDetails();
  };

  initialLoad();
  checkPaymentStatusFromURL(); // Check for payment status on page load

  // Check subscription status every hour
  setInterval(monitorSubscriptionStatus, 60 * 60 * 1000);
});

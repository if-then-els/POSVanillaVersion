// This script is designed to be included on any page to check and display
// a subscription expiry banner and lock/unlock features based on subscription status.

(async function () {
  // --- Constants and Global State (local to this script) ---
  const DAYS_UNTIL_EXPIRY_WARNING = 7;
  const BANNER_ID = "subscription-banner";
  const MODAL_ID = "subscription-inactive-modal";
  const TOAST_CONTAINER_ID = "toast-container";
  let isSubscriptionActive = false;

  // Pages where the blocking overlay must NEVER appear (users renew here).
  const EXEMPT_PAGES = ["managesubscriptions.html", "paymentconfigurations.html"];
  function isExemptPage() {
    try {
      const path = (window.location.pathname || "").toLowerCase();
      return EXEMPT_PAGES.some((p) => path.endsWith(p));
    } catch (e) {
      return false;
    }
  }

  // --- HTML for Modal and Toast Container (embedded for self-contained script) ---
  const embeddedHtml = `
    <!-- Toast notification container -->
    <div id="${TOAST_CONTAINER_ID}" class="fixed top-6 left-1/2 transform -translate-x-1/2 z-[999] space-y-2"></div>
    
    <!-- Subscription Inactive Modal -->
    <div id="${MODAL_ID}" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] hidden flex items-center justify-center">
        <div class="glass-dark rounded-3xl p-8 max-w-md w-full text-center relative animate-scale-in">
            <i class="fas fa-exclamation-triangle text-red-500 text-5xl mb-6"></i>
            <h2 class="text-2xl font-bold text-white mb-4">Subscription Expired!</h2>
            <p class="text-gray-300 mb-6">Your subscription has expired or is inactive. Please renew your plan to continue using this functionalities.</p>
            <a href="/manageSubscriptions.html" class="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl font-semibold hover:from-primary-600 hover:to-primary-700 transition-all duration-300 hover:scale-105 inline-flex items-center">
                <i class="fas fa-dollar-sign mr-2"></i> Manage Subscription
            </a>
        </div>
    </div>
    <!-- End Subscription Inactive Modal -->
    <style>
      @keyframes slide-down {
        from { transform: translateY(-100%); }
        to { transform: translateY(0); }
      }
      #${BANNER_ID} {
        animation: slide-down 0.5s ease-out forwards;
      }
      @keyframes scale-in {
        from { transform: scale(0.8); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      #${MODAL_ID} .animate-scale-in {
        animation: scale-in 0.3s ease-out forwards;
      }
    </style>
  `;

  /**
   * Shows a toast notification.
   * @param {string} message The message to display.
   * @param {string} type The type of toast ('success', 'error', 'warning', 'info').
   */
  function showToast(message, type = "success") {
    const toastContainer = document.getElementById(TOAST_CONTAINER_ID);
    if (!toastContainer) {
      console.error("Toast container not found.");
      return;
    }
    const colors = {
      success: "from-success-500 to-success-600",
      error: "from-red-500 to-red-600",
      warning: "from-yellow-500 to-yellow-600",
      info: "from-primary-500 to-primary-600",
    };
    const icon = {
      success: "check-circle",
      error: "exclamation-circle",
      warning: "exclamation-triangle",
      info: "info-circle",
    };

    const toast = document.createElement("div");
    toast.className = `glass-dark rounded-xl p-4 text-white font-medium transform transition-all duration-300 animate-slide-in border-l-4 border-${
      type === "success"
        ? "success"
        : type === "error"
        ? "red"
        : type === "warning"
        ? "yellow"
        : "primary"
    }-500`;
    toast.innerHTML = `
      <div class="flex items-center space-x-3">
        <i class="fas fa-${icon[type]} text-${
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
      toast.style.transform = "translateX(100%)";
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

  /**
   * Locks all features with the data-requires-subscription attribute.
   */
  function lockFeatures() {
    console.log("Subscription expired: Locking features.");
    const restrictedElements = document.querySelectorAll(
      '[data-requires-subscription="true"]'
    );
    restrictedElements.forEach((element) => {
      element.classList.add("opacity-50", "pointer-events-none", "grayscale");
    });
  }

  /**
   * Unlocks all features with the data-requires-subscription attribute.
   */
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

  /**
   * Shows the subscription inactive modal.
   */
  function showSubscriptionInactiveModal() {
    // Never block exempt pages (e.g. Subscription Hub) - users must be able
    // to interact with the page to renew/purchase a plan.
    if (isExemptPage()) return;
    const modal = document.getElementById(MODAL_ID);
    if (modal) {
      modal.classList.remove("hidden");
    }
  }

  /**
   * Hides the subscription inactive modal.
   */
  function hideSubscriptionInactiveModal() {
    const modal = document.getElementById(MODAL_ID);
    if (modal) {
      modal.classList.add("hidden");
    }
  }

  /**
   * Fetches the current business's subscription details from the server.
   * @returns {Promise<Object|null>} A promise that resolves with the subscription
   * details object or null if no active subscription is found.
   */
  async function fetchSubscriptionDetails() {
    try {
      const response = await fetch("/subscriptions/details", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        return data.subscription;
      } else if (response.status === 403 || response.status === 404) {
        console.log("No active subscription found.");
        return null;
      } else {
        throw new Error(
          `Failed to fetch subscription details: ${response.statusText}`
        );
      }
    } catch (error) {
      console.error("Error fetching subscription details:", error);
      return null;
    }
  }

  /**
   * Calculates the days until expiry and the subscription status.
   * @param {Object} subscription The subscription object from the API.
   * @returns {Object} An object containing isActive, daysUntilExpiry, and isExpired status.
   */
  function checkSubscriptionStatus(subscription) {
    if (!subscription || subscription.status !== "active") {
      return { isActive: false, daysUntilExpiry: 0, isExpired: true };
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
  }

  /**
   * Displays or removes the expiry notification banner based on the status.
   * @param {Object} status The subscription status object.
   */
  function showExpiryNotification(status) {
    let message, type;
    const existingBanner = document.getElementById(BANNER_ID);

    // If a banner already exists, remove it to prevent duplicates
    if (existingBanner) existingBanner.remove();

    if (status.isExpired) {
      message =
        "Your subscription has expired. Services are now limited. Please renew to restore full access.";
      type = "error";
    } else if (
      status.daysUntilExpiry > 0 &&
      status.daysUntilExpiry <= DAYS_UNTIL_EXPIRY_WARNING
    ) {
      message = `Your subscription will expire in ${
        status.daysUntilExpiry
      } day${
        status.daysUntilExpiry === 1 ? "" : "s"
      }. Please renew to avoid service interruption.`;
      type = "warning";
    }

    // Only proceed if there is a message to display
    if (message) {
      const bannerHtml = `
        <div id="${BANNER_ID}" class="fixed top-0 left-0 right-0 bg-gradient-to-r ${
        type === "error"
          ? "from-red-600 to-red-700"
          : "from-yellow-600 to-yellow-700"
      } text-white py-3 px-4 text-center z-50 transition-all duration-500 transform -translate-y-full animate-slide-down">
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

  // --- Main execution flow ---
  document.addEventListener("DOMContentLoaded", async () => {
    // Inject the modal and toast HTML into the body once
    document.body.insertAdjacentHTML("afterbegin", embeddedHtml);

    // Exempt pages stay fully usable so users can subscribe/renew.
    if (isExemptPage()) {
      const modal = document.getElementById(MODAL_ID);
      if (modal) modal.remove();
      unlockFeatures();
      hideSubscriptionInactiveModal();
      return;
    }

    try {
      const subscription = await fetchSubscriptionDetails();
      const status = checkSubscriptionStatus(subscription);

      if (status.isActive) {
        isSubscriptionActive = true;
        unlockFeatures();
        showExpiryNotification(status);
        hideSubscriptionInactiveModal(); // In case it was previously visible
      } else {
        isSubscriptionActive = false;
        lockFeatures();
        showSubscriptionInactiveModal();
        showToast(
          "Your subscription is inactive. Features are limited.",
          "error"
        );
      }
    } catch (error) {
      console.error(
        "Failed to verify subscription status on page load:",
        error
      );
      isSubscriptionActive = false;
      lockFeatures();
      showToast(
        "Could not verify subscription status. Features are limited.",
        "error"
      );
      showSubscriptionInactiveModal();
    }
  });

  // Expose function for external use if needed (e.g., a button to check status)
  window.checkAndLockFeatures = async function () {
    if (isExemptPage()) {
      unlockFeatures();
      hideSubscriptionInactiveModal();
      return;
    }
    const subscription = await fetchSubscriptionDetails();
    const status = checkSubscriptionStatus(subscription);
    if (status.isActive) {
      unlockFeatures();
      showExpiryNotification(status);
      hideSubscriptionInactiveModal();
    } else {
      lockFeatures();
      showSubscriptionInactiveModal();
      showToast(
        "Your subscription is inactive. Features are limited.",
        "error"
      );
    }
  };
})();

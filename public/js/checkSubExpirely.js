// This script is designed to be included on any page to check and display
// a subscription expiry banner without relying on global app state.

(async function () {
  // --- Constants and Global State (local to this script) ---
  const DAYS_UNTIL_EXPIRY_WARNING = 7;
  const BANNER_ID = "subscription-banner";

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

      if (!response.ok) {
        if (response.status === 404) {
          console.log("No active subscription found.");
          return null;
        }
        throw new Error(
          `Failed to fetch subscription details: ${response.statusText}`
        );
      }
      const data = await response.json();
      return data.subscription;
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
        <style>
          @keyframes slide-down {
            from { transform: translateY(-100%); }
            to { transform: translateY(0); }
          }
          #${BANNER_ID} {
            animation: slide-down 0.5s ease-out forwards;
          }
        </style>
      `;
      document.body.insertAdjacentHTML("afterbegin", bannerHtml);
    }
  }

  // --- Main execution flow ---
  document.addEventListener("DOMContentLoaded", async () => {
    // This script does not need the business details first, it just needs the
    // subscription details directly.
    const subscription = await fetchSubscriptionDetails();
    if (subscription) {
      const status = checkSubscriptionStatus(subscription);
      showExpiryNotification(status);
    }
  });
})();

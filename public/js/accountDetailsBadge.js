// accountDetails.js

// Self-executing anonymous function to encapsulate the code
(function () {
  /**
   * Fetches account details from multiple backend endpoints.
   * Logic preserved strictly from original file.
   */
  async function fetchAllAccountDetails() {
    const detailsPanel = document.getElementById("account-details-panel");
    const panelContent = detailsPanel
      ? detailsPanel.querySelector(".panel-content")
      : null;

    if (panelContent) {
      panelContent.innerHTML = `
                <div class="flex flex-col items-center justify-center py-6">
                    <div class="w-8 h-8 border-4 border-accent-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p class="text-sm text-primary-500 dark:text-primary-400">Loading details...</p>
                </div>
            `;
    }

    try {
      const fetchOptions = {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          credentials: "include",
        },
      };

      const [
        userDetailsResponse,
        businessDetailsResponse,
        subscriptionDetailsResponse,
      ] = await Promise.allSettled([
        fetch("/userDetails", fetchOptions),
        fetch("/api/business/business/details", fetchOptions),
        fetch("/subscriptions/details", fetchOptions),
      ]);

      let combinedUserData = {};
      let errors = [];

      // Process user details
      if (
        userDetailsResponse.status === "fulfilled" &&
        userDetailsResponse.value.ok
      ) {
        const userDetails = await userDetailsResponse.value.json();
        const actualUserDetails =
          userDetails.user && userDetails.user.user
            ? userDetails.user.user
            : userDetails.user;

        combinedUserData.username =
          actualUserDetails.username || actualUserDetails.name || "N/A";
        combinedUserData.email = actualUserDetails.email || "N/A";
        combinedUserData.phoneNumber = actualUserDetails.phone || "N/A";
        combinedUserData.businessName =
          (actualUserDetails.business && actualUserDetails.business.name) ||
          "N/A";
      } else {
        errors.push("User details fetch failed");
        console.error("User details error", userDetailsResponse);
      }

      // Process business details
      if (
        businessDetailsResponse.status === "fulfilled" &&
        businessDetailsResponse.value.ok
      ) {
        const businessDetails = await businessDetailsResponse.value.json();
        const actualBusinessDetails = businessDetails.business;

        combinedUserData.businessName =
          actualBusinessDetails.businessName ||
          combinedUserData.businessName ||
          "N/A";
        combinedUserData.phoneNumber =
          actualBusinessDetails.businessPhone ||
          combinedUserData.phoneNumber ||
          "N/A";
      } else {
        errors.push("Business details fetch failed");
      }

      // Process subscription details
      if (
        subscriptionDetailsResponse.status === "fulfilled" &&
        subscriptionDetailsResponse.value.ok
      ) {
        const subscriptionDetails =
          await subscriptionDetailsResponse.value.json();
        const actualSubscriptionDetails = subscriptionDetails.subscription;

        combinedUserData.subscriptionStatus =
          actualSubscriptionDetails.status || "N/A";
        combinedUserData.subscriptionType =
          actualSubscriptionDetails.plan || "N/A";
        combinedUserData.subscriptionExpiry = actualSubscriptionDetails.endDate
          ? new Date(actualSubscriptionDetails.endDate).toLocaleDateString()
          : "N/A";
      } else {
        errors.push("Subscription details fetch failed");
      }

      if (errors.length > 0) {
        if (panelContent) {
          panelContent.innerHTML = `
            <div class="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                <p class="text-sm text-red-600 dark:text-red-400 font-medium">Some details could not be loaded.</p>
            </div>
          `;
        }
        detailsPanel.dataset.loaded = "false";
        return null;
      }

      return combinedUserData;
    } catch (error) {
      console.error("Unexpected error:", error);
      if (panelContent) {
        panelContent.innerHTML = `
            <div class="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                <p class="text-sm text-red-600 dark:text-red-400 font-medium">Connection error. Please try again.</p>
            </div>
        `;
      }
      detailsPanel.dataset.loaded = "false";
      return null;
    }
  }

  /**
   * Updates the UI with fetched data.
   */
  function updateAccountDetailsUI(userData) {
    const elements = {
      username: document.getElementById("detail-username"),
      email: document.getElementById("detail-email"),
      businessName: document.getElementById("detail-business-name"),
      phoneNumber: document.getElementById("detail-phone-number"),
      status: document.getElementById("detail-subscription-status"),
      type: document.getElementById("detail-subscription-type"),
      expiry: document.getElementById("detail-subscription-expiry"),
    };

    if (elements.username)
      elements.username.textContent = userData.username || "N/A";
    if (elements.email) elements.email.textContent = userData.email || "N/A";
    if (elements.businessName)
      elements.businessName.textContent = userData.businessName || "N/A";
    if (elements.phoneNumber)
      elements.phoneNumber.textContent = userData.phoneNumber || "N/A";
    if (elements.type)
      elements.type.textContent = userData.subscriptionType || "N/A";
    if (elements.expiry)
      elements.expiry.textContent = userData.subscriptionExpiry || "N/A";

    if (elements.status) {
      const status = userData.subscriptionStatus || "N/A";
      elements.status.textContent = status;

      // Update badge style based on status
      elements.status.className =
        "px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ";
      if (status.toLowerCase() === "active") {
        elements.status.className +=
          "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400";
      } else if (["expired", "cancelled"].includes(status.toLowerCase())) {
        elements.status.className +=
          "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      } else {
        elements.status.className +=
          "bg-primary-100 text-primary-700 dark:bg-primary-800 dark:text-primary-300";
      }
    }
  }

  async function createAccountDetailsWidget() {
    // Create Floating Icon
    const accountIcon = document.createElement("div");
    accountIcon.id = "account-icon";
    // Tailwind classes added via classList for cleaner HTML string
    accountIcon.className =
      "group fixed top-24 right-4 sm:top-6 sm:right-24 w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-lg shadow-primary-500/30 flex items-center justify-center cursor-pointer z-[1000] transition-all duration-300 hover:scale-110 hover:shadow-primary-500/50 border border-white/20";
    accountIcon.innerHTML = `
      <i class="fas fa-user text-white text-sm group-hover:animate-pulse"></i>
    `;

    // Create Panel
    const detailsPanel = document.createElement("div");
    detailsPanel.id = "account-details-panel";
    detailsPanel.className =
      "fixed top-36 right-4 sm:top-20 sm:right-24 w-80 glass-premium rounded-2xl shadow-2xl flex flex-col z-[999] transform transition-all duration-300 origin-top-right opacity-0 scale-95 pointer-events-none border border-white/20 dark:border-white/10";

    detailsPanel.innerHTML = `
      <!-- Header -->
      <div class="bg-gradient-to-r from-primary-600 to-primary-700 p-4 rounded-t-2xl flex justify-between items-center shadow-md">
        <h3 class="text-white font-bold flex items-center gap-2">
          <i class="fas fa-id-card"></i> Account
        </h3>
        <button id="close-account-panel" class="text-white/80 hover:text-white transition-colors">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <!-- Content -->
      <div class="panel-content p-5 space-y-4 max-h-[60vh] overflow-y-auto">
        <div class="text-center py-4">
          <div class="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p class="text-xs text-primary-500 dark:text-primary-400">Loading...</p>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-4 border-t border-primary-100 dark:border-primary-700/50 bg-primary-50/50 dark:bg-black/20 rounded-b-2xl flex gap-3">
        <button id="refresh-button" class="flex-1 py-2 px-3 bg-white dark:bg-primary-800 text-primary-600 dark:text-primary-200 text-xs font-bold rounded-lg border border-primary-200 dark:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 shadow-sm">
          <i class="fas fa-sync-alt"></i> Refresh
        </button>
        <button id="logout-button" class="flex-1 py-2 px-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-lg border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center justify-center gap-2 shadow-sm">
          <i class="fas fa-sign-out-alt"></i> Logout
        </button>
      </div>
    `;

    document.body.appendChild(accountIcon);
    document.body.appendChild(detailsPanel);

    // Inject CSS for dynamic theme support (using existing CSS variables from main pages)
    const style = document.createElement("style");
    style.textContent = `
      #account-details-panel.show {
        opacity: 1;
        transform: scale(1) translateY(0);
        pointer-events: auto;
      }
      
      .detail-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--glass-border);
      }
      
      .detail-row:last-child {
        border-bottom: none;
        padding-bottom: 0;
      }
      
      .detail-label {
        font-size: 0.75rem;
        color: rgba(100, 116, 139, 1); /* primary-500 */
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      
      .dark .detail-label {
        color: rgba(148, 163, 184, 1); /* primary-400 */
      }
      
      .detail-value {
        font-size: 0.875rem;
        color: rgba(15, 23, 42, 1); /* primary-900 */
        font-weight: 500;
        text-align: right;
      }
      
      .dark .detail-value {
        color: rgba(248, 250, 252, 1); /* white */
      }
    `;
    document.head.appendChild(style);

    // --- Interaction Logic ---

    let panelTimeout;

    const showPanel = () => {
      clearTimeout(panelTimeout);
      detailsPanel.classList.add("show");
      loadAccountDetails();
    };

    const hidePanel = () => {
      // Small delay to allow moving mouse to panel
      panelTimeout = setTimeout(() => {
        if (!detailsPanel.matches(":hover") && !accountIcon.matches(":hover")) {
          detailsPanel.classList.remove("show");
        }
      }, 300);
    };

    // Toggle on click
    accountIcon.addEventListener("click", (e) => {
      e.stopPropagation();
      if (detailsPanel.classList.contains("show")) {
        detailsPanel.classList.remove("show");
      } else {
        showPanel();
      }
    });

    // Hover behavior
    accountIcon.addEventListener("mouseenter", showPanel);
    accountIcon.addEventListener("mouseleave", hidePanel);
    detailsPanel.addEventListener("mouseleave", hidePanel);

    // Close button
    document
      .getElementById("close-account-panel")
      .addEventListener("click", () => {
        detailsPanel.classList.remove("show");
      });

    // Click outside to close
    document.addEventListener("click", (event) => {
      if (
        !accountIcon.contains(event.target) &&
        !detailsPanel.contains(event.target)
      ) {
        detailsPanel.classList.remove("show");
      }
    });

    // Logout
    document.getElementById("logout-button").addEventListener("click", () => {
      fetch("/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
        .then(() => {
          window.location.href = "/login.html";
        })
        .catch((err) => {
          console.error("Logout failed", err);
          alert("Secure logout failed. Please clear cache.");
        });
    });

    // Refresh
    document.getElementById("refresh-button").addEventListener("click", () => {
      loadAccountDetails();
    });

    // Initial Load Logic
    async function loadAccountDetails() {
      // If already loaded successfully, don't show spinner again unless forced
      if (detailsPanel.dataset.loaded === "true") return;

      const accountData = await fetchAllAccountDetails();
      const panelContent = detailsPanel.querySelector(".panel-content");

      if (accountData) {
        // Construct the internal HTML using Tailwind classes
        panelContent.innerHTML = `
          <div class="space-y-3">
            <div class="detail-row">
              <span class="detail-label">Username</span>
              <span class="detail-value" id="detail-username"></span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Email</span>
              <span class="detail-value truncate max-w-[150px]" id="detail-email"></span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Business</span>
              <span class="detail-value" id="detail-business-name"></span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Phone</span>
              <span class="detail-value" id="detail-phone-number"></span>
            </div>
            
            <div class="h-px bg-primary-200 dark:bg-primary-700/50 my-2"></div>
            
            <div class="detail-row">
              <span class="detail-label">Plan</span>
              <span class="detail-value text-accent-600 dark:text-accent-400 font-bold" id="detail-subscription-type"></span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Status</span>
              <span id="detail-subscription-status"></span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Expires</span>
              <span class="detail-value" id="detail-subscription-expiry"></span>
            </div>
          </div>
        `;
        updateAccountDetailsUI(accountData);
        detailsPanel.dataset.loaded = "true";
      } else {
        detailsPanel.dataset.loaded = "false";
      }
    }

    // Global update function for external scripts if needed
    window.updateAccountDetails = function (userData) {
      // Logic same as loadAccountDetails but synchronous update
      // ... (Existing logic implied)
      updateAccountDetailsUI(userData);
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createAccountDetailsWidget);
  } else {
    createAccountDetailsWidget();
  }
})();

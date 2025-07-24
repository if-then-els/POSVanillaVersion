// accountDetails.js

// Self-executing anonymous function to encapsulate the code
// This prevents variables from polluting the global scope.
(function () {
  /**
   * Fetches account details from multiple backend endpoints (user, business, subscription).
   * Combines the data into a single object.
   * @returns {Promise<Object|null>} A promise that resolves to the combined account data or null on error.
   */
  async function fetchAllAccountDetails() {
    const detailsPanel = document.getElementById("account-details-panel");
    const panelContent = detailsPanel
      ? detailsPanel.querySelector(".panel-content")
      : null;

    if (panelContent) {
      panelContent.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <div class="spinner"></div>
                    <p style="margin-top: 10px; color: #666;">Loading account details...</p>
                </div>
            `;
    }

    try {
      // Define fetch options for all requests
      const fetchOptions = {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          credentials: "include", // Important for sending cookies/auth headers
        },
      };

      // Fetch data from all three endpoints concurrently
      const [
        userDetailsResponse,
        businessDetailsResponse,
        subscriptionDetailsResponse,
      ] = await Promise.allSettled([
        fetch("/userDetails", fetchOptions), // User details API
        fetch("/api/business/business/details", fetchOptions), // Corrected Business details API
        fetch("/subscriptions/details", fetchOptions), // Subscription details API
      ]);

      let combinedUserData = {};
      let errors = [];

      // Process user details response
      if (
        userDetailsResponse.status === "fulfilled" &&
        userDetailsResponse.value.ok
      ) {
        const userDetails = await userDetailsResponse.value.json();
        // Based on your network tab, user details are nested under 'user' key
        const actualUserDetails =
          userDetails.user && userDetails.user.user
            ? userDetails.user.user
            : userDetails.user;

        combinedUserData.username =
          actualUserDetails.username || actualUserDetails.name || "N/A";
        combinedUserData.email = actualUserDetails.email || "N/A";
        combinedUserData.phoneNumber = actualUserDetails.phone || "N/A"; // Fetch phone from user details
        // Also get business name from nested user.business if available
        combinedUserData.businessName =
          (actualUserDetails.business && actualUserDetails.business.name) ||
          "N/A";
      } else {
        const errorDetail =
          userDetailsResponse.status === "fulfilled"
            ? `Status: ${userDetailsResponse.value.status} ${
                userDetailsResponse.value.statusText
              }, Body: ${await userDetailsResponse.value.text()}`
            : `Error: ${userDetailsResponse.reason.message}`;
        errors.push(`User details fetch failed: ${errorDetail}`);
        console.error(
          "User details fetch error:",
          userDetailsResponse.reason || userDetailsResponse.value
        );
      }

      // Process business details response
      if (
        businessDetailsResponse.status === "fulfilled" &&
        businessDetailsResponse.value.ok
      ) {
        const businessDetails = await businessDetailsResponse.value.json();
        // Based on your network tab, business details are nested under 'business' key
        const actualBusinessDetails = businessDetails.business;

        // Prioritize business name from businessDetails if available, fallback to userDetails
        combinedUserData.businessName =
          actualBusinessDetails.businessName ||
          combinedUserData.businessName ||
          "N/A";
        // Phone number might also be in business details, use businessPhone
        combinedUserData.phoneNumber =
          actualBusinessDetails.businessPhone ||
          combinedUserData.phoneNumber ||
          "N/A";
      } else {
        const errorDetail =
          businessDetailsResponse.status === "fulfilled"
            ? `Status: ${businessDetailsResponse.value.status} ${
                businessDetailsResponse.value.statusText
              }, Body: ${await businessDetailsResponse.value.text()}`
            : `Error: ${businessDetailsResponse.reason.message}`;
        errors.push(`Business details fetch failed: ${errorDetail}`);
        console.error(
          "Business details fetch error:",
          businessDetailsResponse.reason || businessDetailsResponse.value
        );
      }

      // Process subscription details response
      if (
        subscriptionDetailsResponse.status === "fulfilled" &&
        subscriptionDetailsResponse.value.ok
      ) {
        const subscriptionDetails =
          await subscriptionDetailsResponse.value.json();
        // Based on your network tab, subscription details are nested under 'subscription' key
        const actualSubscriptionDetails = subscriptionDetails.subscription;

        combinedUserData.subscriptionStatus =
          actualSubscriptionDetails.status || "N/A";
        combinedUserData.subscriptionType =
          actualSubscriptionDetails.plan || "N/A"; // 'plan' is the type in your data
        combinedUserData.subscriptionExpiry = actualSubscriptionDetails.endDate
          ? new Date(actualSubscriptionDetails.endDate).toLocaleDateString()
          : "N/A"; // Format date
      } else {
        const errorDetail =
          subscriptionDetailsResponse.status === "fulfilled"
            ? `Status: ${subscriptionDetailsResponse.value.status} ${
                subscriptionDetailsResponse.value.statusText
              }, Body: ${await subscriptionDetailsResponse.value.text()}`
            : `Error: ${subscriptionDetailsResponse.reason.message}`;
        errors.push(`Subscription details fetch failed: ${errorDetail}`);
        console.error(
          "Subscription details fetch error:",
          subscriptionDetailsResponse.reason ||
            subscriptionDetailsResponse.value
        );
      }

      if (errors.length > 0) {
        // If any fetch failed, display the errors in the panel
        if (panelContent) {
          panelContent.innerHTML = `
                        <p style="text-align: left; color: #EF4444; padding: 20px;">
                            <strong>Errors loading details:</strong><br>
                            ${errors.map((err) => `• ${err}`).join("<br>")}
                            <br>Please check your browser's console and network tab for more details.
                        </p>
                    `;
        }
        detailsPanel.dataset.loaded = "false"; // Mark as not loaded
        return null; // Indicate failure
      }

      return combinedUserData;
    } catch (error) {
      console.error(
        "An unexpected error occurred during fetchAllAccountDetails:",
        error
      );
      if (panelContent) {
        panelContent.innerHTML = `
                    <p style="text-align: center; color: #EF4444; padding: 20px;">
                        An unexpected error occurred: ${error.message}. Please try again.
                    </p>
                `;
      }
      detailsPanel.dataset.loaded = "false"; // Mark as not loaded
      return null; // Indicate failure
    }
  }

  /**
   * Updates the UI with the fetched account data.
   * @param {Object} userData - The combined user data object from the backend.
   */
  function updateAccountDetailsUI(userData) {
    // Ensure elements exist before trying to update their textContent
    const usernameSpan = document.getElementById("detail-username");
    const emailSpan = document.getElementById("detail-email");
    const businessNameSpan = document.getElementById("detail-business-name");
    const phoneNumberSpan = document.getElementById("detail-phone-number");
    const subscriptionStatusSpan = document.getElementById(
      "detail-subscription-status"
    );
    const subscriptionTypeSpan = document.getElementById(
      "detail-subscription-type"
    );
    const subscriptionExpirySpan = document.getElementById(
      "detail-subscription-expiry"
    );

    if (usernameSpan) usernameSpan.textContent = userData.username || "N/A";
    if (emailSpan) emailSpan.textContent = userData.email || "N/A";
    if (businessNameSpan)
      businessNameSpan.textContent = userData.businessName || "N/A";
    if (phoneNumberSpan)
      phoneNumberSpan.textContent = userData.phoneNumber || "N/A";

    if (subscriptionStatusSpan) {
      subscriptionStatusSpan.textContent = userData.subscriptionStatus || "N/A";
      // Apply color based on status
      if (
        userData.subscriptionStatus &&
        userData.subscriptionStatus.toLowerCase() === "active"
      ) {
        subscriptionStatusSpan.style.color = "#22C55E"; // green-500
      } else if (
        userData.subscriptionStatus &&
        (userData.subscriptionStatus.toLowerCase() === "expired" ||
          userData.subscriptionStatus.toLowerCase() === "cancelled")
      ) {
        subscriptionStatusSpan.style.color = "#EF4444"; // red-500
      } else {
        subscriptionStatusSpan.style.color = "#6B7280"; // gray-500
      }
    }
    if (subscriptionTypeSpan)
      subscriptionTypeSpan.textContent = userData.subscriptionType || "N/A";
    if (subscriptionExpirySpan)
      subscriptionExpirySpan.textContent = userData.subscriptionExpiry || "N/A";
  }

  async function createAccountDetailsWidget() {
    const accountIcon = document.createElement("div");
    accountIcon.id = "account-icon";
    accountIcon.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
                <path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clip-rule="evenodd" />
            </svg>
        `;

    // --- Create Details Panel Element ---
    const detailsPanel = document.createElement("div");
    detailsPanel.id = "account-details-panel";

    // Initial content with loading state
    detailsPanel.innerHTML = `
            <div class="panel-header">Account Information</div>
            <div class="panel-content">
                <div style="text-align: center; padding: 10px;">
                    <div class="spinner"></div>
                    <p style="margin-top: 10px; color: #666;">Loading account details...</p>
                </div>
            </div>
            <div class="panel-footer">
                <button id="refresh-button" class="action-button">Refresh Details</button>
               
            </div>
        `;

    // --- Append Elements to Body ---
    document.body.appendChild(accountIcon);
    document.body.appendChild(detailsPanel);

    // --- Inject CSS Styles ---
    const style = document.createElement("style");
    style.innerHTML = `
            /* General styling for 'Inter' font, assuming it's available or loaded elsewhere */
            body {
                font-family: 'Inter', sans-serif;
            }

            /* Account Icon Styling */
            #account-icon {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 48px;
                height: 48px;
                background-color: #4F46E5;
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                transition: transform 0.2s ease-in-out, background-color 0.2s ease-in-out;
                z-index: 1000;
            }

            #account-icon:hover {
                background-color: #4338CA;
                transform: scale(1.05);
            }

            #account-icon svg {
                width: 28px;
                height: 28px;
            }

            /* Account Details Panel Styling */
            #account-details-panel {
                position: fixed;
                top: 80px;
                right: 20px;
                width: 300px;
                background-color: #ffffff;
                border-radius: 8px;
                box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05);
                display: none;
                flex-direction: column;
                overflow: hidden;
                z-index: 999;
                transform: translateY(-10px);
                opacity: 0;
                transition: transform 0.3s ease-out, opacity 0.3s ease-out;
            }

            #account-details-panel.show {
                display: flex;
                transform: translateY(0);
                opacity: 1;
            }

            .panel-header {
                background-color: #6366F1;
                color: white;
                padding: 15px 20px;
                font-size: 1.1em;
                font-weight: bold;
                border-top-left-radius: 8px;
                border-top-right-radius: 8px;
            }

            .panel-content {
                padding: 20px;
                color: #333;
                line-height: 1.6;
            }

            .panel-content p {
                margin-bottom: 10px;
                display: flex;
                justify-content: space-between;
            }

            .panel-content p:last-child {
                margin-bottom: 0;
            }

            .panel-content strong {
                color: #555;
                min-width: 90px;
            }

            .panel-footer {
                padding: 15px 20px;
                border-top: 1px solid #eee;
                text-align: right;
                background-color: #f9f9f9;
                border-bottom-left-radius: 8px;
                border-bottom-right-radius: 8px;
                display: flex; /* Use flexbox for buttons */
                justify-content: space-between; /* Space out buttons */
                gap: 10px; /* Gap between buttons */
                flex-wrap: wrap; /* Allow buttons to wrap on smaller screens */
            }

            #logout-button, #refresh-button {
                background-color: #EF4444; /* Red 500 for logout */
                color: white;
                padding: 8px 15px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 0.9em;
                transition: background-color 0.2s ease-in-out;
                flex-grow: 1; /* Allow buttons to grow */
            }

            #logout-button:hover {
                background-color: #DC2626; /* Darker Red 600 on hover */
            }

            #refresh-button {
                background-color: #6B7280; /* Gray 500 for refresh */
            }

            #refresh-button:hover {
                background-color: #4B5563; /* Darker Gray 600 on hover */
            }


            /* Loading Spinner */
            .spinner {
                border: 4px solid rgba(0, 0, 0, 0.1);
                border-left-color: #6366F1;
                border-radius: 50%;
                width: 24px;
                height: 24px;
                animation: spin 1s linear infinite;
                margin: 0 auto 10px auto; /* Center spinner and add margin below */
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            /* Responsive adjustments for smaller screens (e.g., mobile) */
            @media (max-width: 768px) {
                #account-icon {
                    top: 15px;
                    right: 15px;
                    width: 40px;
                    height: 40px;
                }
                #account-icon svg {
                    width: 24px;
                    height: 24px;
                }
                #account-details-panel {
                    top: 65px;
                    right: 15px;
                    width: calc(100% - 30px);
                    max-width: 350px;
                }
                .panel-footer {
                    flex-direction: column; /* Stack buttons vertically on small screens */
                }
            }
        `;
    document.head.appendChild(style);

    let panelTimeout;

    const showPanel = () => {
      clearTimeout(panelTimeout);
      detailsPanel.classList.add("show");

      loadAccountDetails();
    };

    const hidePanel = () => {
      panelTimeout = setTimeout(() => {
        detailsPanel.classList.remove("show");
      }, 300);
    };

    accountIcon.addEventListener("click", (event) => {
      event.stopPropagation();
      if (detailsPanel.classList.contains("show")) {
        detailsPanel.classList.remove("show");
      } else {
        showPanel();
      }
    });

    accountIcon.addEventListener("mouseenter", showPanel);
    accountIcon.addEventListener("mouseleave", hidePanel);
    detailsPanel.addEventListener("mouseenter", showPanel);
    detailsPanel.addEventListener("mouseleave", hidePanel);

    document.addEventListener("click", (event) => {
      if (
        !accountIcon.contains(event.target) &&
        !detailsPanel.contains(event.target)
      ) {
        detailsPanel.classList.remove("show");
      }
    });

    document.getElementById("logout-button").addEventListener("click", () => {
      console.log("Logout button clicked!");
      alert("Logout functionality would be implemented here!");
      detailsPanel.classList.remove("show");

      detailsPanel.dataset.loaded = "false";
    });

    document.getElementById("refresh-button").addEventListener("click", () => {
      console.log("Refresh button clicked!");
      loadAccountDetails();
    });

    async function loadAccountDetails() {
      const accountData = await fetchAllAccountDetails();
      const panelContent = detailsPanel.querySelector(".panel-content");

      if (accountData) {
        panelContent.innerHTML = `
                    <p><strong>Username:</strong> <span id="detail-username"></span></p>
                    <p><strong>Email:</strong> <span id="detail-email"></span></p>
                    <p><strong>Business Name:</strong> <span id="detail-business-name"></span></p>
                    <p><strong>Phone Number:</strong> <span id="detail-phone-number"></span></p>
                    <p><strong>Subscription Status:</strong> <span id="detail-subscription-status"></span></p>
                    <p><strong>Subscription Type:</strong> <span id="detail-subscription-type"></span></p>
                    <p><strong>Subscription Expiry:</strong> <span id="detail-subscription-expiry"></span></p>
                `;
        updateAccountDetailsUI(accountData);
        detailsPanel.dataset.loaded = "true";
      } else {
        detailsPanel.dataset.loaded = "false";
      }
    }

    window.updateAccountDetails = function (userData) {
      const panelContent = detailsPanel.querySelector(".panel-content");
      if (
        !detailsPanel.dataset.loaded ||
        detailsPanel.dataset.loaded === "false" ||
        panelContent.innerHTML.includes("spinner")
      ) {
        panelContent.innerHTML = `
                    <p><strong>Username:</strong> <span id="detail-username"></span></p>
                    <p><strong>Email:</strong> <span id="detail-email"></span></p>
                    <p><strong>Business Name:</strong> <span id="detail-business-name"></span></p>
                    <p><strong>Phone Number:</strong> <span id="detail-phone-number"></span></p>
                    <p><strong>Subscription Status:</strong> <span id="detail-subscription-status"></span></p>
                    <p><strong>Subscription Type:</strong> <span id="detail-subscription-type"></span></p>
                    <p><strong>Subscription Expiry:</strong> <span id="detail-subscription-expiry"></span></p>
                `;
      }
      updateAccountDetailsUI(userData);
      detailsPanel.dataset.loaded = "true";
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createAccountDetailsWidget);
  } else {
    createAccountDetailsWidget();
  }
})();

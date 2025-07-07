document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Content Loaded. Initializing scripts...");

  // --- Toast Notification Function ---
  function showToast(
    message = "Action completed Successfully!",
    type = "success"
  ) {
    const toastContainer = document.getElementById("toast-container");

    const toast = document.createElement("div");
    toast.className = `fixed bottom-4 right-4 p-4 rounded-lg shadow-lg text-white transform transition-transform duration-300 ease-out z-50 opacity-0 -translate-y-full
                             ${
                               type === "success"
                                 ? "bg-green-600"
                                 : "bg-red-600"
                             }`;
    toast.innerHTML = `<i class="fas fa-${
      type === "success" ? "check-circle" : "times-circle"
    } mr-2"></i>${message}`;

    if (toastContainer) {
      toastContainer.appendChild(toast);
    } else {
      document.body.appendChild(toast);
      console.warn("Toast container not found. Appending toast to body.");
    }

    // Trigger animation
    setTimeout(() => {
      toast.classList.add("translate-y-0", "opacity-100");
      toast.classList.remove("-translate-y-full");
    }, 10);

    // Hide and remove toast after 3 seconds
    setTimeout(() => {
      toast.classList.remove("opacity-100");
      toast.classList.add("-translate-y-full");
      setTimeout(() => {
        toast.remove();
      }, 300); // Match CSS transition duration
    }, 3000);
  }

  // --- Global variables for selected plan and price ---
  // Moved these to within the DOMContentLoaded to ensure they are properly scoped
  // and not re-declared globally outside the listener unnecessarily.
  let selectedPlan = null;
  let selectedPlanPrice = null;

  // --- Fetch Subscription Details Function ---
  async function fetchSubscriptionDetails() {
    try {
      const response = await fetch("/subscriptions/details", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for authentication
      });

      if (!response.ok) throw new Error("Failed to fetch subscription details");
      const data = await response.json();
      const sub = data.subscription;

      // Update UI
      document.getElementById("plan-name").textContent =
        sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1) + " Plan";
      document.getElementById("plan-status").textContent =
        sub.status.charAt(0).toUpperCase() + sub.status.slice(1);
      document.getElementById("plan-start").textContent = sub.startDate
        ? new Date(sub.startDate).toLocaleDateString()
        : "N/A";
      document.getElementById("plan-end").textContent = sub.endDate
        ? new Date(sub.endDate).toLocaleDateString()
        : "N/A";
      document.getElementById("plan-autorenew").textContent = sub.autoRenew
        ? "Enabled"
        : "Disabled";
      if (sub.price) {
        document.getElementById(
          "plan-price"
        ).textContent = `KES ${sub.price.toFixed(2)}`;
      }

      // Store current businessId for later use in other functions
      window.currentBusinessId = sub.business;
      console.log("window.currentBusinessId set to:", window.currentBusinessId);
    } catch (error) {
      console.error("Error fetching subscription details:", error);
      showToast("Failed to fetch subscription details.", "error"); // Changed type to error
    }
  }

  // --- Update Subscription Plan Function (Deprecated/Refactored by new modal flow) ---
  // This function seems to be part of an older flow or directly called.
  // The new modal flow with selectPlan and processPayment is intended to replace its direct use.
  // Keeping it as is but noting it might not be the primary way to update now.
  async function updateSubscriptionPlan(plan) {
    try {
      const businessId = window.currentBusinessId;
      if (!businessId) {
        showToast("Business ID not found. Please reload.", "error");
        return;
      }

      let newPlanPrice = 2999; // Default for basic, ensure this matches your plans
      if (plan === "premium") newPlanPrice = 5999;
      if (plan === "enterprise") newPlanPrice = 9999;
      const durationMonths = 1;

      let phone = null;
      if (plan !== "basic" && plan !== "trial") {
        phone = prompt("Enter your M-Pesa phone number for payment:");
        if (!phone) {
          showToast("Phone number is required for paid plans.", "error");
          return;
        }
      }

      const response = await fetch("/subscriptions/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          newPlan: plan,
          durationMonths,
          newPlanPrice, // This price might be overwritten by backend logic
          phone,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        showToast(`Successfully initiated upgrade to ${plan} plan!`, "success"); // Changed message
        fetchSubscriptionDetails(); // Refresh details
        // If payment is required, this older flow would show the modal.
        // The new flow uses processPayment and a different modal display.
        if (data.requirePayment) {
          // This path might be for direct upgrade without plan selection modal
          // For consistency, if you always use the payment modal, remove this.
          // For now, it stays as is per the original script.
          document.getElementById("mpesa-modal").classList.remove("hidden");
        }
      } else {
        showToast(data.message || "Failed to upgrade plan", "error");
      }
    } catch (error) {
      console.error("Error updating subscription plan:", error);
      showToast(
        "An error occurred while updating your plan. Please ensure your backend is running and the API path is correct.",
        "error"
      );
    }
  }

  // --- Confirmation Modal Logic (for initial plan selection outside M-Pesa modal) ---
  const confirmationModal = document.getElementById("confirmation-modal");
  const confirmPlanName = document.getElementById("confirm-plan-name");
  const confirmPlanChangeButton = document.getElementById(
    "confirm-plan-change"
  );
  const cancelPlanChangeButton = document.getElementById("cancel-plan-change");
  const closeModalButtonConfirmation =
    document.getElementById("close-modal-button"); // Renamed to avoid clash

  let selectedPlanForConfirmation = ""; // Store the plan temporarily

  function openConfirmationModal(plan) {
    console.log("Opening confirmation modal for plan:", plan);
    selectedPlanForConfirmation = plan;
    confirmPlanName.textContent = plan.charAt(0).toUpperCase() + plan.slice(1);
    confirmPlanChangeButton.setAttribute("data-plan", plan);
    confirmationModal.classList.remove("hidden");
    confirmationModal.classList.add("flex"); // Show the modal
  }

  function closeConfirmationModal() {
    console.log("Closing confirmation modal.");
    confirmationModal.classList.add("hidden");
    confirmationModal.classList.remove("flex"); // Hide the modal
    selectedPlanForConfirmation = ""; // Clear stored plan
  }

  // Event listener for confirming the plan change
  confirmPlanChangeButton.addEventListener("click", () => {
    console.log("Confirm button clicked.");
    const planToUpgrade = confirmPlanChangeButton.getAttribute("data-plan");
    if (planToUpgrade) {
      // This path goes through updateSubscriptionPlan
      // If your intention is to use the new modal flow, this should call selectPlan
      // For now, keeping original logic.
      updateSubscriptionPlan(planToUpgrade);
    }
    closeConfirmationModal();
  });

  // Event listeners for canceling the plan change
  cancelPlanChangeButton.addEventListener("click", () => {
    console.log("Cancel button clicked.");
    closeConfirmationModal();
  });
  // Changed to avoid ID clash with mpesa-modal's close button
  if (closeModalButtonConfirmation) {
    closeModalButtonConfirmation.addEventListener("click", () => {
      console.log("Close modal button (X) clicked on confirmation modal.");
      closeConfirmationModal();
    });
  }

  // Close modal when clicking outside of it
  confirmationModal.addEventListener("click", (event) => {
    if (event.target === confirmationModal) {
      console.log("Clicked outside confirmation modal, closing.");
      closeConfirmationModal();
    }
  });

  // --- Initial Call & Plan Button Event Listeners (for initial upgrade buttons) ---
  fetchSubscriptionDetails(); // Fetch subscription details on page load

  // Add event listeners to all "Select Plan" and "Upgrade Plan" buttons
  document.querySelectorAll("button[data-plan]").forEach((button) => {
    if (!button.disabled) {
      button.addEventListener("click", () => {
        const plan = button.dataset.plan;
        if (plan) {
          // This opens the *initial* confirmation modal for upgrade.
          // If you want to jump directly to the M-Pesa modal for ALL plan selections,
          // then this should be `openMpesaPaymentModal(plan);`
          // For now, keeping the two-step confirmation as per original script.
          openConfirmationModal(plan);
        } else {
          console.error(
            "No data-plan attribute found for the clicked button. Cannot open modal."
          );
          showToast(
            "Failed to determine plan from button. Please try again.",
            "error"
          );
        }
      });
    } else {
      console.log(
        `Skipping event listener for disabled button: "${button.textContent.trim()}".`
      );
    }
  });

  // --- Modal Step Logic for M-Pesa Payment Modal ---
  const mpesaModal = document.getElementById("mpesa-modal");
  const closeModalBtnMpesa = document.getElementById(
    "close-mpesa-modal-button"
  ); // New ID for clarity

  function showStep(step) {
    // Ensure all steps are hidden first
    ["step1", "step2", "step3"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.classList.add("hidden");
    });
    // Then show the target step
    const targetEl = document.getElementById(step);
    if (targetEl) targetEl.classList.remove("hidden");
  }

  // --- Fetch plans from backend and render in modal (Step 2) ---
  async function fetchAndRenderPlans() {
    try {
      const res = await fetch("/plans");
      if (!res.ok) throw new Error("Failed to fetch plans");
      const data = await res.json();
      const plans = data.plans || [];
      const plansContainer = document.getElementById("plans-list");
      if (!plansContainer) {
        console.error("Plans container not found.");
        return;
      }
      plansContainer.innerHTML = "";
      plans.forEach((plan) => {
        const div = document.createElement("div");
        div.className =
          "border rounded-lg p-4 hover:border-blue-500 cursor-pointer transition duration-200";
        // Call global selectPlan from here
        div.onclick = () => window.selectPlan(plan.name, plan.price);
        div.innerHTML = `
          <h3 class="font-semibold">${
            plan.name.charAt(0).toUpperCase() + plan.name.slice(1)
          } Plan</h3>
          <p class="text-gray-600">KES ${plan.price.toLocaleString()}/month</p>
          <p class="text-gray-500 text-sm">${plan.description || ""}</p>
        `;
        plansContainer.appendChild(div);
      });
      showStep("step2"); // Automatically show step 2 after rendering plans
    } catch (error) {
      console.error("Error fetching and rendering plans:", error);
      showToast("Failed to load available plans.", "error");
    }
  }

  // --- Show M-Pesa modal and fetch current plan/price (for 'Update Payment' button) ---
  const updatePaymentBtn = document.getElementById("update-payment-button");
  if (updatePaymentBtn) {
    updatePaymentBtn.addEventListener("click", async () => {
      try {
        const response = await fetch("/subscriptions/details", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });
        if (!response.ok)
          throw new Error("Failed to fetch subscription details");
        const data = await response.json();
        const sub = data.subscription;

        // Set the global selectedPlan/Price for the current active plan
        selectedPlan = sub.plan;
        selectedPlanPrice = sub.price;

        // Populate the payment amount for the current plan if it exists
        const paymentAmountInput = document.getElementById("paymentAmount");
        if (paymentAmountInput && sub.price) {
          paymentAmountInput.value = `KES ${sub.price.toFixed(2)}`;
        } else if (paymentAmountInput) {
          paymentAmountInput.value = "N/A";
        }

        // Show the M-Pesa modal and go to step 3 (payment) directly for "Update Payment"
        if (mpesaModal) {
          mpesaModal.classList.remove("hidden");
          // Ensure display is block if using inline style elsewhere
          mpesaModal.style.display = "block";
          showStep("step3"); // Go directly to payment if updating existing plan
        }
      } catch (error) {
        console.error("Error fetching current plan for payment:", error);
        showToast("Failed to fetch current plan details for payment.", "error");
      }
    });
  }

  // M-Pesa Modal close logic (for clicking outside)
  if (mpesaModal) {
    mpesaModal.addEventListener("click", (event) => {
      if (event.target === mpesaModal) {
        mpesaModal.classList.add("hidden");
        mpesaModal.style.display = "none"; // Ensure it's hidden from style
        // Reset steps when closing
        showStep("step1");
      }
    });
  }

  // M-Pesa Modal close button (X) logic
  if (closeModalBtnMpesa) {
    closeModalBtnMpesa.addEventListener("click", () => {
      mpesaModal.classList.add("hidden");
      mpesaModal.style.display = "none";
      // Reset steps when closing
      showStep("step1");
    });
  }

  // --- Upgrade Plan Step and update db (This is the core logic for selecting a new plan and setting up payment) ---
  window.selectPlan = function (plan, amount) {
    selectedPlan = plan; // Use the local `selectedPlan` variable
    selectedPlanPrice = amount; // Use the local `selectedPlanPrice` variable

    const paymentAmountInput = document.getElementById("paymentAmount");
    if (paymentAmountInput) {
      paymentAmountInput.value = `KES ${amount}`;
    }

    // Always show the M-Pesa modal when a plan is selected from the plans list
    if (mpesaModal) {
      mpesaModal.classList.remove("hidden");
      mpesaModal.style.display = "block"; // Ensure it's visible
    }
    showStep("step3"); // Move to the payment step after selecting a plan
  };

  // --- Step Navigation Functions (ensure these are globally accessible) ---
  window.showUpgradeOptions = function () {
    // This will fetch and render plans and then show step2
    fetchAndRenderPlans();
  };
  window.continueToPayment = function () {
    showStep("step3");
  };
  window.backToStep1 = function () {
    showStep("step1");
  };
  window.backToPreviousStep = function () {
    // Logic to go back to previous step within the M-Pesa modal flow
    if (!document.getElementById("step3").classList.contains("hidden")) {
      // If currently on step 3 (payment), go back to step 2 (plan selection)
      showStep("step2");
    } else if (!document.getElementById("step2").classList.contains("hidden")) {
      // If currently on step 2 (plan selection), go back to step 1 (initial options)
      showStep("step1");
    }
    // If already on step 1, nothing to do or close modal based on UI flow
  };

  // --- Payment Processing ---
  window.processPayment = async function () {
    const phoneInput = document.getElementById("phone-input");
    const phone = phoneInput ? phoneInput.value.trim() : "";
    if (!phone) {
      showToast("Please enter your M-Pesa phone number.", "error");
      return;
    }
    if (
      !window.currentBusinessId ||
      !selectedPlan ||
      selectedPlanPrice === null
    ) {
      showToast(
        "Missing plan, price, or business info. Please reload the page or select a plan.",
        "error"
      );
      return;
    }
    const processingPopup = document.getElementById("processingPopup");
    if (processingPopup) processingPopup.classList.remove("hidden");
    try {
      const res = await fetch("/payments/mpesa/stkpush", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          businessId: window.currentBusinessId,
          plan: selectedPlan,
          durationMonths: 1,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(
          "STK Push sent to your phone. Please complete the payment on your device.",
          "success"
        );
        // FIX: Extract subscriptionId from backend response
        const subscriptionId = data.subscriptionId;
        if (subscriptionId) {
          pollPaymentStatus(subscriptionId);
        } else {
          if (processingPopup) processingPopup.classList.add("hidden");
          showToast(
            "Could not get subscription ID for payment tracking.",
            "error"
          );
        }
      } else {
        if (processingPopup) processingPopup.classList.add("hidden");
        showToast(
          data.message || "Failed to initiate M-Pesa payment.",
          "error"
        );
      }
    } catch (err) {
      if (processingPopup) processingPopup.classList.add("hidden");
      showToast(
        "Network or server error during payment. Please try again.",
        "error"
      );
    }
  };

  // --- Cancel Subscription ---
  document.querySelectorAll("button").forEach((btn) => {
    // Check for "Cancel Subscription" button by its text content
    if (btn.textContent.includes("Cancel Subscription")) {
      btn.addEventListener("click", async () => {
        const businessId = window.currentBusinessId;
        if (!businessId) {
          showToast("Business ID not found. Cannot cancel.", "error");
          return;
        }
        if (
          !confirm(
            "Are you sure you want to cancel your subscription? This action cannot be undone."
          )
        )
          return;
        try {
          const res = await fetch("/subscriptions/cancel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ businessId }),
          });
          const data = await res.json();
          if (res.ok) {
            showToast("Subscription cancelled successfully.", "success");
            fetchSubscriptionDetails(); // Refresh UI
          } else {
            showToast(
              data.message || "Failed to cancel subscription.",
              "error"
            );
          }
        } catch (err) {
          console.error("Error cancelling subscription:", err);
          showToast(
            "Network error during cancellation. Please try again.",
            "error"
          );
        }
      });
    }
  });

  // --- Polling Payment Status ---
  async function pollPaymentStatus(
    subscriptionId,
    maxAttempts = 30, // Increased attempts for longer waiting
    interval = 2000 // Polling every 2 seconds
  ) {
    let attempts = 0;
    const processingPopup = document.getElementById("processingPopup");
    const approvedPopup = document.getElementById("approvedPopup");
    const mpesaModal = document.getElementById("mpesa-modal");

    while (attempts < maxAttempts) {
      try {
        const res = await fetch(`/subscriptions/status?id=${subscriptionId}`);
        if (!res.ok) throw new Error("Failed to fetch subscription status");
        const data = await res.json();

        if (data.status === "active") {
          if (processingPopup) processingPopup.classList.add("hidden");
          if (approvedPopup) approvedPopup.classList.remove("hidden");
          if (mpesaModal) mpesaModal.classList.add("hidden"); // Hide main modal too
          showToast(
            "Payment successful! Your subscription is now active.",
            "success"
          );
          fetchSubscriptionDetails(); // Update UI with new details
          // Hide approved popup after a delay
          setTimeout(() => {
            if (approvedPopup) approvedPopup.classList.add("hidden");
          }, 3000);
          return; // Exit polling loop
        } else if (data.status === "failed" || data.status === "cancelled") {
          // Add specific handling for failed/cancelled states if your backend provides them
          if (processingPopup) processingPopup.classList.add("hidden");
          showToast(`Payment ${data.status}. Please try again.`, "error");
          return; // Exit polling loop
        }
      } catch (error) {
        console.error("Error polling payment status:", error);
        // Don't show toast on every polling error unless it's critical
      }

      await new Promise((r) => setTimeout(r, interval));
      attempts++;
    }

    // If polling finishes without success
    if (processingPopup) processingPopup.classList.add("hidden");
    showToast("Payment timed out or not confirmed. Please try again.", "error");
    if (mpesaModal) mpesaModal.classList.add("hidden"); // Hide main modal on timeout
  }

  // Initial setup: ensure correct step is shown if modal is open (unlikely on load)
  // Initially, hide all steps and let button clicks control flow
  showStep("step1");
});

// The global declarations below are unnecessary if `selectedPlan` and `selectedPlanPrice`
// are managed within the DOMContentLoaded listener.
// Removing them ensures they are properly scoped within your script.
/*
let selectedPlan = null;
let selectedPlanPrice = null;
console.log("selectedPlan:", selectedPlan);
console.log("selectedPlanPrice:", selectedPlanPrice);
console.log("currentBusinessId:", window.currentBusinessId);
*/

// Use Paystack inline JS SDK
function payWithPaystack(email, amount, callback) {
  var handler = PaystackPop.setup({
    key: "pk_test_772bd799e859a2ce88f5693bfeb5ef4a75da4e13",
    email: email,
    amount: amount * 100,
    callback: function (response) {
      // Send response.reference to backend for verification
      callback(response.reference);
    },
    onClose: function () {
      alert("Payment window closed");
    },
  });
  handler.openIframe();
}

// --- Paystack Payment Processing ---
window.processPaystackPayment = async function () {
  const emailInput = document.getElementById("paystackEmail");
  const email = emailInput ? emailInput.value.trim() : "";
  if (!email) {
    showToast("Please enter your email address.", "error");
    return;
  }
  if (
    !window.currentBusinessId ||
    !selectedPlan ||
    selectedPlanPrice === null
  ) {
    showToast("Missing plan, price, or business info.", "error");
    return;
  }

  // 1. Initiate Paystack payment (creates pending subscription)
  try {
    const res = await fetch("/payments/paystack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        amount: selectedPlanPrice,
        businessId: window.currentBusinessId,
        plan: selectedPlan,
        durationMonths: 1,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.data || !data.data.authorization_url) {
      showToast(
        data.message || "Failed to initiate Paystack payment.",
        "error"
      );
      return;
    }
    const subscriptionId = data.subscriptionId;
    // Open Paystack payment page
    window.open(data.data.authorization_url, "_blank");

    // Poll for payment verification (or use webhook for production)
    // For demo, show a prompt to enter reference
    const reference = prompt(
      "Enter Paystack payment reference after completing payment:"
    );
    if (!reference) {
      showToast("Payment reference required for verification.", "error");
      return;
    }
    // 2. Verify payment
    const verifyRes = await fetch("/payments/paystack/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference, subscriptionId }),
    });
    const verifyData = await verifyRes.json();
    if (verifyRes.ok) {
      showToast("Payment successful! Subscription activated.", "success");
      // Optionally refresh subscription details/UI
    } else {
      showToast(verifyData.message || "Payment verification failed.", "error");
    }
  } catch (err) {
    showToast(
      "Network or server error during payment. Please try again.",
      "error"
    );
  }
};

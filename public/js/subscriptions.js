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
      // console.log("subscription Data : ", data);
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
      // Store for later use
      window.currentPlan = sub.plan;
      window.currentPlanPrice = sub.price;
      window.currentBusinessId = sub.id || sub.business; // Adjust as needed
    } catch (error) {
      showToast("Failed to fetch subscription details.", error);
    }
  }

  // --- Update Subscription Plan Function ---
  async function updateSubscriptionPlan(plan) {
    try {
      // Fetch current businessId and plan price from the UI or session
      // For demo, you may need to fetch these from your backend or session
      const businessId = window.currentBusinessId || "YOUR_BUSINESS_ID"; // Replace with actual logic
      let newPlanPrice = 2999;
      if (plan === "premium") newPlanPrice = 5999;
      if (plan === "enterprise") newPlanPrice = 9999;
      const durationMonths = 1; // Or let user select

      // Optionally, ask for phone if plan is not free/trial
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
          newPlanPrice,
          phone,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        showToast(`Successfully upgraded to ${plan} plan!`, "success");
        fetchSubscriptionDetails();
        // If payment is required, show M-Pesa modal or instructions
        if (data.requirePayment) {
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

  // --- Confirmation Modal Logic ---
  const confirmationModal = document.getElementById("confirmation-modal");
  const confirmPlanName = document.getElementById("confirm-plan-name");
  const confirmPlanChangeButton = document.getElementById(
    "confirm-plan-change"
  );
  const cancelPlanChangeButton = document.getElementById("cancel-plan-change");
  const closeModalButton = document.getElementById("close-modal-button");

  let selectedPlanForConfirmation = ""; // Store the plan temporarily

  function openConfirmationModal(plan) {
    console.log("Opening confirmation modal for plan:", plan);
    selectedPlanForConfirmation = plan;
    confirmPlanName.textContent = plan.charAt(0).toUpperCase() + plan.slice(1);
    confirmPlanChangeButton.setAttribute("data-plan", plan);
    confirmationModal.classList.remove("hidden");
    confirmationModal.classList.add("flex"); // Show the modal
    console.log(
      "Modal display style:",
      window.getComputedStyle(confirmationModal).display
    );
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
      updateSubscriptionPlan(planToUpgrade);
    }
    closeConfirmationModal();
  });

  // Event listeners for canceling the plan change
  cancelPlanChangeButton.addEventListener("click", () => {
    console.log("Cancel button clicked.");
    closeConfirmationModal();
  });
  closeModalButton.addEventListener("click", () => {
    console.log("Close modal button (X) clicked.");
    closeConfirmationModal();
  });

  // Close modal when clicking outside of it
  confirmationModal.addEventListener("click", (event) => {
    if (event.target === confirmationModal) {
      console.log("Clicked outside modal, closing.");
      closeConfirmationModal();
    }
  });

  // --- Initial Call & Plan Button Event Listeners ---

  // Fetch subscription details on page load
  fetchSubscriptionDetails();

  // Add event listeners to all "Select Plan" and "Upgrade Plan" buttons
  // Targeting buttons with 'data-plan' attribute for more robust selection
  document.querySelectorAll("button[data-plan]").forEach((button, index) => {
    const buttonText = button.textContent.trim();

    // The "Current Plan" button (if present) does not have a data-plan attribute
    // and is already disabled in HTML, so it won't be caught by default.
    // However, if a future "Current Plan" button was added with data-plan but disabled,
    // it would be caught. The `disabled` attribute prevents click events.
    if (!button.disabled) {
      // Explicitly check if the button is not disabled
      button.addEventListener("click", () => {
        console.log(
          `Click detected on actionable button: "${buttonText}" (data-plan: ${button.dataset.plan}).`
        );
        let plan = button.dataset.plan; // Get plan name from data-plan attribute

        if (plan) {
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
        `Skipping event listener for disabled button: "${buttonText}".`
      );
    }
  });

  // --- Modal Step Logic ---
  function showStep(step) {
    ["step1", "step2", "step3"].forEach((id) => {
      document.getElementById(id).classList.add("hidden");
    });
    document.getElementById(step).classList.remove("hidden");
  }

  // --- Show M-Pesa modal and fetch current plan/price ---
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
        window.selectedPlan = sub.plan;
        window.selectedPlanPrice = sub.price;
        document.getElementById("paymentAmount").value = `KES ${sub.price}`;
        showStep("step3");
        document.getElementById("mpesa-modal").classList.remove("hidden");
      } catch (error) {
        showToast("Failed to fetch current plan details.", "error");
      }
    });
  }

  // --- Upgrade Plan Step ---
  window.selectPlan = function (plan, amount) {
    window.selectedPlan = plan;
    window.selectedPlanPrice = amount;
    document.getElementById("paymentAmount").value = `KES ${amount}`;
    showStep("step3");
  };

  // --- Step Navigation ---
  window.showUpgradeOptions = function () {
    showStep("step2");
  };
  window.continueToPayment = function () {
    showStep("step3");
  };
  window.backToStep1 = function () {
    showStep("step1");
  };
  window.backToPreviousStep = function () {
    if (!document.getElementById("step2").classList.contains("hidden")) {
      showStep("step1");
    } else {
      showStep("step1");
    }
  };

  // --- Payment Processing ---
  window.processPayment = async function () {
    const mobileNumber = document.getElementById("mobileNumber").value.trim();
    if (!mobileNumber) {
      alert("Please enter your mobile number");
      return;
    }
    if (
      !window.currentBusinessId ||
      !window.selectedPlan ||
      !window.selectedPlanPrice
    ) {
      showToast(
        "Missing plan or business info. Please reload the page.",
        "error"
      );
      return;
    }
    document.getElementById("processingPopup").classList.remove("hidden");
    try {
      const res = await fetch("/subscriptions/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: window.currentBusinessId,
          newPlan: window.selectedPlan,
          durationMonths: 1,
          newPlanPrice: window.selectedPlanPrice,
          phone: mobileNumber,
        }),
      });
      const data = await res.json();
      document.getElementById("processingPopup").classList.add("hidden");
      if (res.ok && data.requirePayment) {
        showToast("STK Push sent! Complete payment on your phone.", "success");
        document.getElementById("approvedPopup").classList.remove("hidden");
        fetchSubscriptionDetails();
      } else if (res.ok) {
        showToast("Plan upgraded!", "success");
        fetchSubscriptionDetails();
      } else {
        showToast(data.message || "Failed to initiate payment.", "error");
      }
    } catch (err) {
      document.getElementById("processingPopup").classList.add("hidden");
      showToast("Network error. Please try again.", "error");
    }
  };

  // --- Modal Close Logic ---
  document.getElementById("close-modal-button").onclick = () => {
    document.getElementById("mpesa-modal").classList.add("hidden");
  };
  document.getElementById("mpesa-modal").addEventListener("click", (event) => {
    if (event.target === document.getElementById("mpesa-modal")) {
      document.getElementById("mpesa-modal").classList.add("hidden");
    }
  });

  // --- Cancel Subscription ---
  document.querySelectorAll("button").forEach((btn) => {
    if (btn.textContent.includes("Cancel Subscription")) {
      btn.addEventListener("click", async () => {
        const businessId = window.currentBusinessId;
        if (!confirm("Are you sure you want to cancel your subscription?"))
          return;
        try {
          const res = await fetch("/subscriptions/cancel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ businessId }),
          });
          const data = await res.json();
          if (res.ok) {
            showToast("Subscription cancelled.", "success");
            fetchSubscriptionDetails();
          } else {
            showToast(data.message || "Failed to cancel subscription", "error");
          }
        } catch (err) {
          showToast("Network error. Please try again.", "error");
        }
      });
    }
  });

  // --- Initial Fetch ---
  fetchSubscriptionDetails();
});

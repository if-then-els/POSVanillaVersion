// Create a new shared JavaScript file for common functionality

function lockFeatures() {
  // Disable navigation links
  const restrictedLinks = document.querySelectorAll(
    '.nav-link[data-requires-subscription="true"]'
  );
  restrictedLinks.forEach((link) => {
    link.classList.add("pointer-events-none", "opacity-50");
    link.setAttribute("title", "Subscription required");
  });

  // Disable action buttons
  const actionButtons = document.querySelectorAll(
    'button[data-requires-subscription="true"]'
  );
  actionButtons.forEach((button) => {
    button.disabled = true;
    button.classList.add("opacity-50", "cursor-not-allowed");
  });

  // Store locked state
  localStorage.setItem("featuresLocked", "true");

  // Show locked overlay on restricted pages
  const restrictedContent = document.querySelector(".restricted-content");
  if (restrictedContent) {
    restrictedContent.innerHTML = `
      <div class="absolute inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div class="bg-white p-8 rounded-lg shadow-xl max-w-md text-center">
          <i class="fas fa-lock text-4xl text-red-500 mb-4"></i>
          <h3 class="text-xl font-bold mb-2">Subscription Required</h3>
          <p class="text-gray-600 mb-4">Your subscription has expired. Please renew to access this feature.</p>
          <a href="/manageSubscriptions.html" class="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            <i class="fas fa-crown mr-2"></i>
            Renew Subscription
          </a>
        </div>
      </div>
    `;
  }
}

function unlockFeatures() {
  // Re-enable navigation links
  const restrictedLinks = document.querySelectorAll(
    '.nav-link[data-requires-subscription="true"]'
  );
  restrictedLinks.forEach((link) => {
    link.classList.remove("pointer-events-none", "opacity-50");
    link.removeAttribute("title");
  });

  // Re-enable action buttons
  const actionButtons = document.querySelectorAll(
    'button[data-requires-subscription="true"]'
  );
  actionButtons.forEach((button) => {
    button.disabled = false;
    button.classList.remove("opacity-50", "cursor-not-allowed");
  });

  // Clear locked state
  localStorage.removeItem("featuresLocked");

  // Remove locked overlay
  const restrictedContent = document.querySelector(".restricted-content");
  if (restrictedContent) {
    restrictedContent.innerHTML = "";
  }
}

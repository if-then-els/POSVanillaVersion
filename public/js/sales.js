// Theme Toggle
const themeToggle = document.getElementById("theme-toggle");
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    document.documentElement.classList.toggle("dark");
    const icon = themeToggle.querySelector("i");
    if (icon) {
      icon.classList.toggle("fa-moon");
      icon.classList.toggle("fa-sun");
    }
  });
}

// Sidebar Toggle
const toggleSidebar = document.getElementById("toggle-sidebar");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");

if (toggleSidebar && sidebar && overlay) {
  toggleSidebar.addEventListener("click", () => {
    sidebar.classList.toggle("translate-x-0");
    sidebar.classList.toggle("-translate-x-full");
    overlay.classList.toggle("hidden");
    document.body.classList.toggle("sidebar-open");
  });

  overlay.addEventListener("click", () => {
    sidebar.classList.add("-translate-x-full");
    sidebar.classList.remove("translate-x-0");
    overlay.classList.add("hidden");
    document.body.classList.remove("sidebar-open");
  });
}
// Scroll Reveal Animation
const observerOptions = {
  threshold: 0.1,
  rootMargin: "0px 0px -50px 0px",
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("revealed");
    }
  });
}, observerOptions);

document.querySelectorAll(".scroll-reveal").forEach((el) => {
  observer.observe(el);
});

// Toast Notification System
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  const colors = {
    success: "from-success-500 to-success-600",
    error: "from-red-500 to-red-600",
    warning: "from-yellow-500 to-yellow-600",
    info: "from-primary-500 to-primary-600",
  };

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

  const toastContainer = document.getElementById("toast-container");
  if (toastContainer) {
    toastContainer.appendChild(toast);
  } else {
    console.warn("Toast container not found");
  }

  setTimeout(() => {
    toast.style.transform = "translateX(100%)";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Particle animation
function createParticle() {
  const particle = document.createElement("div");
  particle.className = "particle";
  particle.style.left = Math.random() * 100 + "%";
  particle.style.top = Math.random() * 100 + "%";
  particle.style.width = Math.random() * 4 + 1 + "px";
  particle.style.height = particle.style.width;
  particle.style.backgroundColor = `hsl(${Math.random() * 360}, 70%, 60%)`;
  const gradientBg = document.querySelector(".gradient-bg");
  if (gradientBg) {
    gradientBg.appendChild(particle);
  }

  setTimeout(() => {
    particle.remove();
  }, 6000);
}

setInterval(createParticle, 2000);

// Mobile cart toggle function
function toggleMobileCart() {
  const cartPanel = document.getElementById("mobile-cart-panel");
  const cartButton = document.getElementById("mobile-cart-button");

  // Toggle panel visibility
  cartPanel.classList.toggle("hidden");

  // Toggle button visibility (inverse of panel visibility)
  cartButton.classList.toggle(
    "hidden",
    !cartPanel.classList.contains("hidden")
  );

  // Toggle aria-expanded for accessibility
  const isExpanded = cartPanel.classList.contains("hidden") ? "false" : "true";
  cartButton.setAttribute("aria-expanded", isExpanded);
}

// Update cart function should also handle the button visibility
function updateMobileCart(items) {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const badge = document.getElementById("mobile-cart-badge");
  const countDisplay = document.getElementById("mobile-cart-count");
  const emptyState = document.querySelector("#mobile-cart-items > div");
  const checkoutBtn = document.getElementById("mobile-checkout-btn");
  const clearBtn = document.getElementById("mobile-clear-cart-btn");
  const cartButton = document.getElementById("mobile-cart-button");

  // Update badge
  if (itemCount > 0) {
    badge.classList.remove("hidden");
    badge.textContent = itemCount;
    emptyState.classList.add("hidden");

    // Auto-expand cart when items are added
    const cartPanel = document.getElementById("mobile-cart-panel");
    if (cartPanel.classList.contains("hidden")) {
      cartPanel.classList.remove("hidden");
      cartButton.classList.add("hidden");
      cartButton.setAttribute("aria-expanded", "true");
    }
  } else {
    badge.classList.add("hidden");
    emptyState.classList.remove("hidden");
  }

  // Update count display
  countDisplay.textContent = `${itemCount} ${
    itemCount === 1 ? "item" : "items"
  } in cart`;

  // Enable/disable buttons
  checkoutBtn.disabled = itemCount === 0;
  clearBtn.disabled = itemCount === 0;
}

// Global variable to store fetched products
let allProducts = [];
let cartItems = [];
let isSubscriptionActive = false; // New global flag

// Function to fetch products from backend and render them
async function loadProductsForSale() {
  if (!isSubscriptionActive) {
    // If subscription is inactive, just visually update features without fetching
    // This path should ideally be hit once initially if subscription is found inactive.
    toggleSalesFeatures(false); // Make sure UI is disabled
    renderProducts([]); // Render an empty grid or specific message
    return;
  }

  try {
    console.log("Fetching products from /getInventory...");
    const response = await fetch("/getInventory", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // Important for sending cookies with token
    });

    console.log("Response status:", response.status);
    console.log("Response ok:", response.ok);

    if (!response.ok) {
      if (response.status === 403) {
        // Subscription inactive or expired
        isSubscriptionActive = false; // Update flag
        showSubscriptionInactiveModal();
        toggleSalesFeatures(false); // Make sure UI is disabled
        renderProducts([]); // Clear products, disable UI
        return;
      }
      throw new Error(`Failed to load products: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Received data:", data);
    
    // Handle both possible response structures
    if (data.products && Array.isArray(data.products)) {
      allProducts = data.products;
    } else if (Array.isArray(data)) {
      allProducts = data;
    } else {
      allProducts = [];
    }
    
    console.log("All products after fetch:", allProducts);
    renderProducts(); // Render products after fetching
    toggleSalesFeatures(true); // Ensure features are enabled after successful load
  } catch (error) {
    console.error("Error loading products:", error);
    const productsGrid = document.getElementById("products-grid");
    if (productsGrid) {
      productsGrid.innerHTML = `<div class="text-center p-8 text-red-500">Failed to load products. ${error.message}</div>`;
    }
    showToast("Failed to load products. Please check your network.", "error");
    toggleSalesFeatures(false); // Disable features if products cannot be loaded
  }
}

// Function to render products (uses global allProducts)
function renderProducts() {
  const productsGrid = document.getElementById("products-grid");
  if (!productsGrid) return;
  productsGrid.innerHTML = ""; // Clear existing products

  console.log("Rendering products. Count:", allProducts.length);
  
  if (allProducts.length === 0) {
    productsGrid.innerHTML = `<div class="text-center p-8 text-gray-500">No products found. Make sure you have products in inventory.</div>`;
    return;
  }

  allProducts.forEach((product) => {
    const productCard = document.createElement("div");
    productCard.className =
      "glass-dark rounded-xl p-4 cursor-pointer hover-lift flex flex-col items-center text-center";

    // Conditionally disable the 'Add' button based on subscription status
    const addButtonHtml = isSubscriptionActive
      ? `<button class="mt-3 px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg text-sm font-medium hover:from-primary-600 hover:to-primary-700 transition-all duration-300 w-full" 
                onclick="addToCart('${product._id}')">
          <i class="fas fa-plus mr-1"></i> Add
        </button>`
      : `<button class="mt-3 px-4 py-2 bg-gray-600 text-gray-400 rounded-lg text-sm font-medium w-full cursor-not-allowed" disabled>
          <i class="fas fa-lock mr-1"></i> Add (Inactive Sub.)
        </button>`;

    productCard.innerHTML = `
        <h3 class="font-semibold text-white text-md mb-1">${
          product.productName
        }</h3>
        <p class="text-gray-500 text-sm mb-1">Batch: ${
          product.productBatchNumber
        }</p>
        <p class="text-primary-400 font-bold">KES ${product.productPrice.toFixed(
          2
        )}</p>
        <p class="text-xs text-gray-400 mb-2">Stock: ${
          product.productQuantity
        }</p>
        ${addButtonHtml}
      `;
    productsGrid.appendChild(productCard);
  });
  // Removed the recursive call: toggleSalesFeatures(isSubscriptionActive);
}

// Function to add item to cart
function addToCart(productId) {
  if (!isSubscriptionActive) {
    showSubscriptionInactiveModal();
    return;
  }
  const product = allProducts.find((p) => p._id === productId);
  if (product) {
    const existingItem = cartItems.find((item) => item._id === productId);
    if (existingItem) {
      if (existingItem.quantity < product.productQuantity) {
        existingItem.quantity++;
        showToast(`${product.productName} quantity updated!`, "info");
      } else {
        showToast(`No more ${product.productName} in stock!`, "warning");
      }
    } else {
      cartItems.push({ ...product, quantity: 1 });
      showToast(`${product.productName} added to cart!`, "success");
    }
    renderCart();
  }
}

// Function to remove item from cart
function removeFromCart(productId) {
  if (!isSubscriptionActive) {
    showSubscriptionInactiveModal(); // Should not happen if UI is disabled
    return;
  }
  cartItems = cartItems.filter((item) => item._id !== productId);
  renderCart();
  showToast("Item removed from cart.", "info");
}

// Function to update item quantity in cart
function updateQuantity(productId, change) {
  if (!isSubscriptionActive) {
    showSubscriptionInactiveModal(); // Should not happen if UI is disabled
    return;
  }
  const item = cartItems.find((item) => item._id === productId);
  const product = allProducts.find((p) => p._id === productId);
  if (item && product) {
    const newQuantity = item.quantity + change;
    if (newQuantity > 0 && newQuantity <= product.productQuantity) {
      item.quantity = newQuantity;
      renderCart();
    } else if (newQuantity <= 0) {
      removeFromCart(productId);
    } else if (newQuantity > product.productQuantity) {
      showToast(
        `Cannot add more. Only ${product.productQuantity} of ${product.productName} in stock.`,
        "warning"
      );
    }
  }
}

// Function to render cart items
function renderCart() {
  const cartItemsContainer = document.getElementById("cart-items");
  const mobileCartItemsContainer = document.getElementById("mobile-cart-items");
  const cartTotalSpan = document.getElementById("cart-total");
  const checkoutBtn = document.getElementById("checkout-btn");
  const clearCartBtn = document.getElementById("clear-cart-btn");

  const mobileCartTotalSpan = document.getElementById("mobile-cart-total");
  const mobileCheckoutBtn = document.getElementById("mobile-checkout-btn");
  const mobileClearCartBtn = document.getElementById("mobile-clear-cart-btn");

  if (
    !cartItemsContainer ||
    !mobileCartItemsContainer ||
    !cartTotalSpan ||
    !checkoutBtn ||
    !clearCartBtn ||
    !mobileCartTotalSpan ||
    !mobileCheckoutBtn ||
    !mobileClearCartBtn
  ) {
    console.error("One or more cart elements not found.");
    return;
  }

  cartItemsContainer.innerHTML = "";
  mobileCartItemsContainer.innerHTML = "";

  let subtotal = 0;

  if (cartItems.length === 0) {
    const emptyStateHtml = `
        <div class="text-center py-8 text-gray-600 flex flex-col items-center">
          <i class="fas fa-shopping-cart text-3xl mb-2"></i>
          <p>Your cart is empty</p>
          <p class="text-sm mt-1">Add products to get started</p>
        </div>
      `;
    cartItemsContainer.innerHTML = emptyStateHtml;
    mobileCartItemsContainer.innerHTML = emptyStateHtml;
    document.body.classList.remove("cart-has-items"); // Ensure desktop cart is collapsed
  } else {
    document.body.classList.add("cart-has-items"); // Ensure desktop cart is expanded
    cartItems.forEach((item) => {
      const itemTotal = item.productPrice * item.quantity;
      subtotal += itemTotal;

      const itemHtml = `
          <div class="flex items-center justify-between py-2 border-b border-gray-700 last:border-b-0">
            <div class="flex items-center space-x-3">
              <img src="${
                item.imageUrl ||
                "https://placehold.co/150x150/0ea5e9/ffffff?text=Product"
              }" alt="${
        item.productName
      }" class="w-12 h-12 object-cover rounded-md">
              <div>
                <p class="font-medium text-white">${item.productName}</p>
                <p class="text-sm text-gray-400">KES ${item.productPrice.toFixed(
                  2
                )} x ${item.quantity}</p>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <div class="flex items-center glass-dark rounded-md">
                <button onclick="updateQuantity('${
                  item._id
                }', -1)" class="px-2 py-1 text-gray-300 hover:bg-white/10 rounded-l-md" ${
        !isSubscriptionActive ? "disabled" : ""
      }>
                  <i class="fas fa-minus text-xs"></i>
                </button>
                <span class="text-white text-sm font-medium">${
                  item.quantity
                }</span>
                <button onclick="updateQuantity('${
                  item._id
                }', 1)" class="px-2 py-1 text-gray-300 hover:bg-white/10 rounded-r-md" ${
        !isSubscriptionActive ? "disabled" : ""
      }>
                  <i class="fas fa-plus text-xs"></i>
                </button>
              </div>
              <button onclick="removeFromCart('${
                item._id
              }')" class="text-red-400 hover:text-red-300 p-1" ${
        !isSubscriptionActive ? "disabled" : ""
      }>
                <i class="fas fa-trash-alt text-sm"></i>
              </button>
            </div>
          </div>
        `;
      cartItemsContainer.innerHTML += itemHtml;
      mobileCartItemsContainer.innerHTML += itemHtml;
    });
  }

  const tax = 0; // Tax set to 0
  const total = subtotal + tax;

  cartTotalSpan.textContent = `KES ${total.toFixed(2)}`;
  mobileCartTotalSpan.textContent = `KES ${total.toFixed(2)}`;

  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  document.getElementById("cart-count").textContent = `${itemCount} ${
    itemCount === 1 ? "item" : "items"
  } in cart`;
  document.getElementById("cart-count-badge").textContent = itemCount;
  document
    .getElementById("cart-count-badge")
    .classList.toggle("hidden", itemCount === 0);

  updateMobileCart(cartItems);

  // Disable checkout and clear buttons if subscription is not active OR cart is empty
  checkoutBtn.disabled = !isSubscriptionActive || cartItems.length === 0;
  clearCartBtn.disabled = !isSubscriptionActive || cartItems.length === 0;
  mobileCheckoutBtn.disabled = !isSubscriptionActive || cartItems.length === 0;
  mobileClearCartBtn.disabled = !isSubscriptionActive || cartItems.length === 0;
}

// Checkout Modal Logic
const checkoutModal = document.getElementById("checkout-modal");
const checkoutCancelBtn = document.getElementById("checkout-cancel");
const checkoutForm = document.getElementById("checkout-form");
const processSaleBtn = document.getElementById("process-sale-btn");
const cashPaymentSection = document.getElementById("cash-payment-section");
const cashReceivedInput = document.getElementById("cash-received");
const cashChangeSpan = document.getElementById("cash-change");

document
  .getElementById("checkout-btn")
  ?.addEventListener("click", function (e) {
    e.preventDefault();
    openCheckoutModal();
  });

document
  .getElementById("mobile-checkout-btn")
  ?.addEventListener("click", function (e) {
    e.preventDefault();
    openCheckoutModal();
  });

function openCheckoutModal() {
  if (!isSubscriptionActive) {
    showSubscriptionInactiveModal();
    return;
  }
  console.log("Current cart items:", cartItems);
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  if (itemCount === 0) {
    showToast("Your cart is empty. Add items to checkout.", "warning");
    return false;
  }

  checkoutModal.classList.remove("hidden");
  renderCheckoutSummary();
  cashPaymentSection.classList.add("hidden");
  cashReceivedInput.value = "";
  cashChangeSpan.textContent = "KES 0.00";

  // Load payment methods if not loaded yet
  if (configuredPaymentMethods.length === 0) {
    loadPaymentMethods();
  }

  // Select cash by default if available, otherwise first option
  const cashMethod = document.querySelector('input[name="paymentMethod"][value="cash"]');
  if (cashMethod) {
    cashMethod.checked = true;
  } else {
    const firstMethod = document.querySelector('input[name="paymentMethod"]');
    if (firstMethod) firstMethod.checked = true;
  }
  processSaleBtn.disabled = false;
  return true;
}

checkoutCancelBtn.addEventListener("click", () => {
  checkoutModal.classList.add("hidden");
});

document
  .getElementById("checkout-modal-backdrop")
  ?.addEventListener("click", () => {
    checkoutModal.classList.add("hidden");
  });

cashReceivedInput.addEventListener("input", () => {
  const total = parseFloat(
    document.getElementById("checkout-total").textContent.replace("KES ", "")
  );
  const received = parseFloat(cashReceivedInput.value) || 0;
  const change = received - total;
  cashChangeSpan.textContent = `KES ${Math.max(0, change).toFixed(2)}`;
  processSaleBtn.disabled = received < total;
});

function renderCheckoutSummary() {
  const checkoutItemsContainer = document.getElementById("checkout-items");
  if (!checkoutItemsContainer) return;

  checkoutItemsContainer.innerHTML = "";
  let subtotal = 0;

  cartItems.forEach((item) => {
    const itemTotal = item.productPrice * item.quantity;
    subtotal += itemTotal;
    const itemHtml = `
        <div class="flex justify-between items-center py-2">
          <span class="text-gray-300">${item.productName} (x${
      item.quantity
    })</span>
          <span class="text-white">KES ${itemTotal.toFixed(2)}</span>
        </div>
      `;
    checkoutItemsContainer.innerHTML += itemHtml;
  });

  const tax = 0; // Tax set to 0
  const total = subtotal + tax;

  document.getElementById("checkout-total").textContent = `KES ${total.toFixed(
    2
  )}`;

  cashReceivedInput.value = "";
  cashChangeSpan.textContent = "KES 0.00";

  const selectedPaymentMethod = document.querySelector(
    'input[name="paymentMethod"]:checked'
  )?.value;
  if (selectedPaymentMethod === "cash") {
    processSaleBtn.disabled = true;
  } else {
    processSaleBtn.disabled = false;
  }
}

// Process online payment (card, mobile money, paypal, m-pesa)
async function processOnlinePayment(paymentType, config, amount, customerPhone = "") {
  return new Promise((resolve, reject) => {
    // Create payment processing modal
    const modal = document.createElement("div");
    modal.id = "payment-processing-modal";
    modal.className = "fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4";
    
    // For M-Pesa, show phone input first
    const isMpesa = paymentType === "mpesa_stk" || paymentType === "mpesa_till" || paymentType === "mpesa_paybill" || paymentType === "mobile_money";
    const phoneInputHtml = isMpesa ? `
      <div id="phone-input-section" class="mb-4">
        <label class="block text-xs font-bold text-primary-500 dark:text-primary-400 uppercase tracking-wide mb-2 text-left">Enter Customer Phone Number</label>
        <div class="relative">
          <i class="fas fa-phone absolute left-3 top-3 text-primary-400"></i>
          <input type="tel" id="customer-phone" class="w-full pl-10 pr-4 py-3 rounded-xl input-premium" placeholder="e.g., 254712345678" value="${customerPhone}">
        </div>
        <p class="text-xs text-primary-400 mt-2 text-left"><i class="fas fa-info-circle mr-1"></i>An STK push will be sent to this number</p>
      </div>
    ` : '';

    modal.innerHTML = `
      <div class="bg-white dark:bg-primary-900 rounded-2xl shadow-2xl w-full max-w-md p-6 text-center">
        <div class="mb-4">
          <div class="w-16 h-16 mx-auto rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
            <i class="fas fa-${config?.icon || 'credit-card'} text-2xl text-accent-500"></i>
          </div>
        </div>
        <h3 class="text-lg font-bold text-primary-900 dark:text-white mb-2">Processing Payment</h3>
        <p class="text-sm text-primary-500 dark:text-primary-400 mb-4">
          Please ${isMpesa ? 'enter phone number and ' : ''}confirm your ${config?.label || paymentType} payment of <span class="font-bold">KES ${amount.toFixed(2)}</span>
        </p>
        
        ${phoneInputHtml}
        
        <div id="payment-status" class="hidden p-3 rounded-lg mb-4 text-left"></div>
        
        <div class="flex gap-3">
          <button id="payment-cancel-btn" class="flex-1 px-4 py-2 border border-primary-200 dark:border-primary-700 rounded-xl text-sm font-bold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-800">
            Cancel
          </button>
          <button id="payment-confirm-btn" class="flex-1 px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white rounded-xl text-sm font-bold">
            ${isMpesa ? '<i class="fas fa-sms mr-2"></i>Send STK Push' : '<i class="fas fa-check mr-2"></i>Confirm Payment'}
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Handle cancel
    modal.querySelector("#payment-cancel-btn").addEventListener("click", () => {
      modal.remove();
      reject(new Error("Payment cancelled"));
    });

    // Handle confirm
    modal.querySelector("#payment-confirm-btn").addEventListener("click", async () => {
      const statusDiv = modal.querySelector("#payment-status");
      const confirmBtn = modal.querySelector("#payment-confirm-btn");
      
      // For M-Pesa, validate phone number
      let phoneNumber = "";
      if (isMpesa) {
        const phoneInput = modal.querySelector("#customer-phone");
        phoneNumber = phoneInput.value.trim().replace(/^0/, "254").replace(/^\+/, "");
        
        if (!phoneNumber || phoneNumber.length < 9) {
          statusDiv.classList.remove("hidden");
          statusDiv.className = "p-3 rounded-lg mb-4 text-left bg-error-100 dark:bg-error-900/30 text-error-700 dark:text-error-400";
          statusDiv.innerHTML = '<i class="fas fa-exclamation-circle mr-2"></i>Please enter a valid phone number';
          return;
        }
        
        // Ensure phone starts with country code
        if (!phoneNumber.startsWith("254")) {
          phoneNumber = "254" + phoneNumber;
        }
      }
      
      try {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';
        statusDiv.classList.add("hidden");
        
            if (isMpesa) {
          const isC2B = paymentType === "mpesa_till" || paymentType === "mpesa_paybill";
          const isManualVerify = paymentType === "mpesa_till"; // Till with manual verification
          
          // Choose endpoint based on payment type
          const endpoint = isC2B ? "/api/payments/mpesa/c2b/initiate" : "/api/payments/mpesa/stkpush";
          
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              phoneNumber,
              amount: Math.round(amount),
              paymentType,
              config: config?.config || {}
            })
          });
          
          const result = await response.json();
          
          if (response.ok && result.success) {
            // Demo mode - instant success
            if (result.demoMode) {
              statusDiv.className = "p-3 rounded-lg mb-4 text-left bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400";
              statusDiv.innerHTML = '<i class="fas fa-check-circle mr-2"></i>Payment completed (demo mode)!';
              confirmBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Done';
              await new Promise(resolve => setTimeout(resolve, 1000));
              modal.remove();
              resolve({ success: true, phoneNumber });
              return;
            }
            
            // Manual verification: Show Till and ask for receipt
            if (isManualVerify) {
              const tillNumber = config?.config?.tillNumber || "N/A";
              
              statusDiv.className = "p-3 rounded-lg mb-4 text-left bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400";
              statusDiv.innerHTML = `
                <div class="text-center">
                  <p class="font-bold mb-2">Customer: Pay KES ${amount} to Till:</p>
                  <p class="text-3xl font-bold text-purple-600">${tillNumber}</p>
                  <p class="text-sm mt-2">After paying, customer will receive an M-Pesa SMS with receipt number.</p>
                </div>
              `;
              
              // Show receipt input
              const receiptInputDiv = document.createElement("div");
              receiptInputDiv.className = "mt-3";
              receiptInputDiv.innerHTML = `
                <label class="block text-sm font-medium mb-1">Enter M-Pesa Receipt Number:</label>
                <input type="text" id="mpesa-receipt-input" 
                  class="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" 
                  placeholder="e.g., MPG123456789">
              `;
              statusDiv.after(receiptInputDiv);
              
              confirmBtn.innerHTML = '<i class="fas fa-check-circle mr-2"></i>Verify Payment';
              confirmBtn.disabled = false;
              
              // Override confirm button behavior for manual verify
              confirmBtn.onclick = async () => {
                const receiptInput = document.getElementById("mpesa-receipt-input");
                const receiptNumber = receiptInput?.value?.trim();
                
                if (!receiptNumber) {
                  alert("Please enter the M-Pesa receipt number from the customer's phone");
                  return;
                }
                
                // Save payment with receipt number
                try {
                  const saveRes = await fetch("/api/payments/manual/save", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                      phoneNumber,
                      amount: Math.round(amount),
                      paymentType,
                      receiptNumber,
                      tillNumber,
                    })
                  });
                  
                  const saveResult = await saveRes.json();
                  
                  if (saveResult.success) {
                    statusDiv.className = "p-3 rounded-lg mb-4 text-left bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400";
                    statusDiv.innerHTML = '<i class="fas fa-check-circle mr-2"></i>Payment recorded successfully!';
                    confirmBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Done';
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    modal.remove();
                    resolve({ success: true, phoneNumber, receiptNumber });
                  } else {
                    throw new Error(saveResult.message || "Failed to save payment");
                  }
                } catch (err) {
                  alert("Error: " + err.message);
                }
              };
              return; // Exit - wait for manual verify click
            }
        } else {
          // For other payment types (simulated for now)
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          statusDiv.className = "p-3 rounded-lg mb-4 text-left bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400";
          statusDiv.innerHTML = '<i class="fas fa-check-circle mr-2"></i>Payment successful!';
          confirmBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Done';
          
          await new Promise(resolve => setTimeout(resolve, 500));
          modal.remove();
          resolve({ success: true });
        }
      } catch (err) {
        statusDiv.classList.remove("hidden");
        statusDiv.className = "p-3 rounded-lg mb-4 text-left bg-error-100 dark:bg-error-900/30 text-error-700 dark:text-error-400";
        statusDiv.innerHTML = '<i class="fas fa-times-circle mr-2"></i>' + err.message;
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = isMpesa ? '<i class="fas fa-sms mr-2"></i>Try Again' : '<i class="fas fa-check mr-2"></i>Try Again';
      }
    });
  });
}

// Poll for M-Pesa payment status
async function pollMpesaPayment(checkoutRequestId, phoneNumber, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      const response = await fetch(`/api/payments/mpesa/status?checkoutRequestId=${checkoutRequestId}&phoneNumber=${phoneNumber}`, {
        credentials: "include"
      });
      const result = await response.json();
      
      if (result.success) {
        if (result.paymentStatus === "completed") {
          return true;
        } else if (result.paymentStatus === "failed") {
          return false;
        }
        // Otherwise still pending, continue polling
      }
    } catch (err) {
      console.error("Error polling payment status:", err);
    }
  }
  return false; // Timeout
}

// Poll for C2B payment status
async function pollC2BPayment(checkoutRequestId, phoneNumber, maxAttempts = 45) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
      const response = await fetch(`/api/payments/mpesa/c2b/status/${checkoutRequestId}`, {
        credentials: "include"
      });
      const result = await response.json();
      
      if (result.success) {
        if (result.paymentStatus === "completed") {
          return true;
        } else if (result.paymentStatus === "failed" || result.paymentStatus === "cancelled") {
          return false;
        }
        // Otherwise still pending, continue polling
      }
    } catch (err) {
      console.error("Error polling C2B payment status:", err);
    }
  }
  return false; // Timeout
}

// Function to process sale - now store-aware, offlineId idempotent, paymentType normalized
async function processSale(cartItems, total, customerName, paymentMethod) {
  if (!isSubscriptionActive) {
    showSubscriptionInactiveModal(); // Should not be reached if UI is disabled
    return;
  }

  // Get selected payment method info
  const selectedPaymentInput = document.querySelector('input[name="paymentMethod"]:checked');
  const paymentType = selectedPaymentInput ? selectedPaymentInput.value : "cash";
  const paymentMethodConfig = configuredPaymentMethods.find(m => m.type === paymentType);

  // Normalize mpesa types to tier-allowed values (backend accepts mpesa_stk etc)
  let effectivePaymentMethod = paymentType === "mobile_money" ? "mpesa_stk" : paymentType;

  // For non-cash payments, show processing modal (mpesa will handle STK push)
  if (paymentType !== "cash") {
    await processOnlinePayment(paymentType, paymentMethodConfig, total);
    effectivePaymentMethod = paymentType === "mobile_money" ? "mpesa_stk" : paymentType;
  }

  const items = cartItems.map((item) => ({
    productId: item._id,
    quantity: item.quantity,
    price: item.productPrice,
  }));

  // store + offline Idempotency
  const storeId = (typeof getSelectedStoreId === 'function' ? getSelectedStoreId() : "") || "";
  const offlineId = `off_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;

  try {
    const response = await fetch("/processSale", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": offlineId },
      body: JSON.stringify({ items, total, customerName, paymentMethod: effectivePaymentMethod, store: storeId || undefined, offlineId }),
      credentials: "include",
    });

    const data = await response.json();
    if (response.ok && data.sale && data.sale._id) {
      // Fetch receipt details from backend
      const receiptRes = await fetch(`/receipt/${data.sale._id}`);
      const receiptData = await receiptRes.json();
      if (receiptRes.ok && receiptData.sale) {
        showReceipt(receiptData.sale);
      }
      return data;
    } else {
      throw new Error(data.message || "Sale failed");
    }
  } catch (error) {
    console.error("Error processing sale:", error);
    throw error; // Re-throw to be caught by the form submit handler
  }
}

// Function to show receipt (re-added)
async function showReceipt(sale) {
  // Fetch settings
  const settingsRes = await fetch("/api/settings");
  const settings = await settingsRes.json();

  const receiptWindow = window.open("", "Receipt", "width=400,height=600");
  receiptWindow.document.write(`
      <html>
        <head>
          <title>Sales Receipt</title>
          <style>
            /* Base Styles */
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            
            body {
              background: #f8f9fa;
              padding: 20px;
              color: #333;
              line-height: 1.6;
            }
            
            .receipt-container {
              max-width: 350px;
              margin: 0 auto;
              background: white;
              border-radius: 12px;
              box-shadow: 0 5px 25px rgba(0,0,0,0.1);
              padding: 30px;
              position: relative;
              overflow: hidden;
            }
            
            /* Decorative Elements */
            .watermark {
              position: absolute;
              opacity: 0.03;
              font-size: 120px;
              font-weight: bold;
              transform: rotate(-30deg);
              top: 30%;
              left: -50px;
              white-space: nowrap;
              pointer-events: none;
              z-index: 0;
            }
            
            .header::after {
              content: "";
              display: block;
              height: 2px;
              background: linear-gradient(90deg, #3498db, #2ecc71);
              margin: 20px 0;
              border-radius: 2px;
            }
            
            /* Header Styles */
            .header {
              text-align: center;
              position: relative;
              z-index: 1;
            }
            
            .logo {
              max-width: 120px;
              display: block;
              margin: 0 auto 15px;
              filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
            }
            
            .store-name {
              font-size: 26px;
              font-weight: 700;
              color: #2c3e50;
              letter-spacing: 0.5px;
              margin-bottom: 5px;
            }
            
            .store-details {
              color: #7f8c8d;
              font-size: 26px;
              margin-bottom: 3px;
            }
            
            /* Transaction Info */
            .transaction-info {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 12px;
              margin: 25px 0;
              font-size: 26px;
              font-weight: 800;
              background: #f8f9fa;
              padding: 15px;
              border-radius: 8px;
              border: 1px solid #eee;
            }
            
            .info-label {
              font-weight: 700;
              color: #2c3e50;
            }
            
            /* Table Styles */
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 25px 0;
              font-size: 26px;
              font-weight: 700;
            }
            
            .items-table th {
              text-align: left;
              padding: 12px 5px;
              border-bottom: 2px solid #3498db;
              color: #2c3e50;
              font-weight: 700;
              font-size: 28px;
            }
            
            .items-table td {
              padding: 10px 5px;
              border-bottom: 1px solid #eee;
            }
            
            .items-table tr:last-child td {
              border-bottom: none;
            }
            
            .text-right {
              text-align: right;
            }
            
            /* Total Styles */
            .total-container {
              background: linear-gradient(135deg, #3498db, #2ecc71);
              color: white;
              padding: 18px;
              border-radius: 10px;
              margin: 25px 0;
              text-align: center;
              box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
            }
            
            .total-label {
              font-size: 26px;
              font-weight: 600;
              margin-bottom: 8px;
              display: block;
            }
            
            .total-amount {
              font-size: 28px;
              font-weight: 700;
              letter-spacing: 0.5px;
            }
            
            /* Footer Styles */
            .footer {
              text-align: center;
              margin-top: 25px;
              color: #7f8c8d;
              font-size: 13px;
              line-height: 1.7;
              position: relative;
              z-index: 1;
            }
            
            .thank-you {
              font-weight: 600;
              font-size: 26px;
              color: #2c3e50;
              margin-bottom: 10px;
            }
            
            /* Print Button */
            .print-btn {
              display: block;
              width: 100%;
              padding: 14px;
              margin-top: 20px;
              background: #2c3e50;
              color: white;
              border: none;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s ease;
              box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            }
            
            .print-btn:hover {
              background: #3498db;
              transform: translateY(-2px);
              box-shadow: 0 6px 20px rgba(0,0,0,0.15);
            }
            
            /* Print Styles */
            @media print {
              body {
                background: white;
                padding: 0;
              }
              
              .receipt-container {
                box-shadow: none;
                padding: 15px;
                max-width: 100%;
              }
              
              .print-btn {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="watermark">${settings.storeName || "STORE"}</div>
            
            <div class="header">
              ${
                settings.showLogo && settings.logoUrl
                  ? `<img src="${settings.logoUrl}" class="logo" alt="Store Logo" >`
                  : ""
              }
              <div class="store-name">${
                settings.storeName || "Professional Store"
              }</div>
              <div class="store-details">${
                settings.storeAddress || "123 Business Avenue"
              }</div>
              ${
                settings.includeContact
                  ? `<div class="store-details">${
                      settings.storePhone || "Phone: (123) 456-7890"
                    }</div>
                     <div class="store-details">${
                       settings.storeEmail || "Email: info@store.com"
                     }</div>`
                  : ""
              }
            </div>
            
            <div class="transaction-info">
              <div class="info-label">Date:</div>
              <div>${new Date(sale.createdAt).toLocaleString()}</div>
              
              <div class="info-label">Receipt #:</div>
              <div>${sale.receiptNumber || "N/A"}</div>
              
              <div class="info-label">Customer:</div>
              <div>${sale.customerName || "Walk-in Customer"}</div>
              
              <div class="info-label">Payment:</div>
              <div>${sale.paymentMethod}</div>
            </div>
            
            <table class="items-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th class="text-right">Price</th>
                  <th class="text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${sale.items
                  .map(
                    (item) => `
                    <tr>
                      <td>${item.productName}</td>
                      <td>${item.quantity}</td>
                      <td class="text-right">${item.price.toFixed(2)}</td>
                      <td class="text-right">${(
                        item.price * item.quantity
                      ).toFixed(2)}</td>
                    </tr>`
                  )
                  .join("")}
              </tbody>
            </table>
            
            <div class="total-container">
              <span class="total-label">TOTAL AMOUNT</span>
              <div class="total-amount">${
                settings.currency || "Ksh"
              }${sale.total.toFixed(2)}</div>
            </div>
            
            
            </div>
            
            <button class="print-btn" onclick="window.print()">Print Receipt</button>
          </div>
        </body>
      </html>
    `);
  receiptWindow.document.close();
}

checkoutForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const customerName = document.getElementById("customer-name").value;
  const paymentMethod = document.querySelector(
    'input[name="paymentMethod"]:checked'
  ).value;
  const total = parseFloat(
    document.getElementById("checkout-total").textContent.replace("KES ", "")
  );

  if (!customerName) {
    showToast("Customer Name is required.", "error");
    return;
  }

  if (paymentMethod === "cash") {
    const received = parseFloat(cashReceivedInput.value) || 0;
    if (received < total) {
      showToast("Cash received is less than total amount.", "error");
      return;
    }
  }

  try {
    const response = await processSale(
      cartItems,
      total,
      customerName,
      paymentMethod
    );
    if (response && response.message) {
      showToast("Sale Successful", response.message, "success");
    } else {
      showToast("Sale Successful", "Sale processed successfully", "success");
    }
    cartItems = []; // Clear cart after successful sale
    loadProductsForSale(); // Re-fetch products to update stock
    renderCart();
    checkoutModal.classList.add("hidden");
    checkoutForm.reset();
  } catch (error) {
    showToast("Failed to process sale. Please try again.", "error");
    console.error("Sale processing error:", error);
  }
});

// Clear Cart Button
document.getElementById("clear-cart-btn")?.addEventListener("click", () => {
  cartItems = [];
  renderCart();
  showToast("Cart cleared!", "info");
});

document
  .getElementById("mobile-clear-cart-btn")
  ?.addEventListener("click", () => {
    cartItems = [];
    renderCart();
    showToast("Cart cleared!", "info");
  });

// Function to control sales UI elements based on subscription status
function toggleSalesFeatures(enable) {
  const productsSection = document.getElementById("products-section");
  const checkoutBtn = document.getElementById("checkout-btn");
  const clearCartBtn = document.getElementById("clear-cart-btn");
  const mobileCheckoutBtn = document.getElementById("mobile-checkout-btn");
  const mobileClearCartBtn = document.getElementById("mobile-clear-cart-btn");
  const mobileCartButton = document.getElementById("mobile-cart-button");

  if (enable) {
    // Enable features
    productsSection.classList.remove("opacity-50", "pointer-events-none");
    checkoutBtn.disabled = cartItems.length === 0; // Re-evaluate based on cart content
    clearCartBtn.disabled = cartItems.length === 0;
    mobileCheckoutBtn.disabled = cartItems.length === 0;
    mobileClearCartBtn.disabled = cartItems.length === 0;
    mobileCartButton.classList.remove("opacity-50", "pointer-events-none");

    // Re-render products to enable "Add" buttons - REMOVED RECURSIVE CALL
    // renderProducts();
  } else {
    // Disable features and add overlay effect
    productsSection.classList.add("opacity-50", "pointer-events-none");
    checkoutBtn.disabled = true;
    clearCartBtn.disabled = true;
    mobileCheckoutBtn.disabled = true;
    mobileClearCartBtn.disabled = true;
    mobileCartButton.classList.add("opacity-50", "pointer-events-none");

    // Explicitly disable product "Add" buttons
    const addButtons = document.querySelectorAll("#products-grid button");
    addButtons.forEach((button) => {
      button.disabled = true;
      button.textContent = "Add (Inactive Sub.)";
      button.classList.remove(
        "bg-gradient-to-r",
        "from-primary-500",
        "to-primary-600",
        "hover:from-primary-600",
        "hover:to-primary-700"
      );
      button.classList.add(
        "bg-gray-600",
        "text-gray-400",
        "cursor-not-allowed"
      );
    });

    cartItems = []; // Clear cart if subscription becomes inactive
    renderCart(); // Re-render cart to update button states
  }
}

// Function to show the subscription inactive modal
function showSubscriptionInactiveModal() {
  document
    .getElementById("subscription-inactive-modal")
    .classList.remove("hidden");
}

// Payment Methods Configuration
const paymentTypeConfig = {
  cash: { label: "Cash", icon: "fa-money-bill-wave", color: "text-green-500" },
  card: { label: "Card", icon: "fa-credit-card", color: "text-blue-500" },
  mobile_money: { label: "Mobile Money", icon: "fa-mobile-alt", color: "text-purple-500" },
  paypal: { label: "PayPal", icon: "fa-paypal", color: "text-blue-600" },
  mpesa_till: { label: "M-Pesa Till", icon: "fa-landmark", color: "text-purple-500" },
  mpesa_stk: { label: "M-Pesa STK (Advanced)", icon: "fa-mobile", color: "text-purple-600" },
  mpesa_paybill: { label: "M-Pesa Paybill", icon: "fa-university", color: "text-purple-700" },
  bank: { label: "Bank Transfer", icon: "fa-university", color: "text-gray-500" },
};

let configuredPaymentMethods = [];

// Load payment methods from settings
async function loadPaymentMethods() {
  const container = document.getElementById("payment-methods-container");
  if (!container) return;

  try {
    const res = await fetch("/settings/payment-methods", { credentials: "include" });
    const data = await res.json();

    // Always include cash as default
    configuredPaymentMethods = [
      { type: "cash", label: "Cash", icon: "fa-money-bill-wave", color: "text-green-500" }
    ];

    if (data.success && data.methods && data.methods.length > 0) {
      data.methods.forEach(method => {
        const config = paymentTypeConfig[method.type] || { label: method.type, icon: "fa-credit-card", color: "text-gray-500" };
        configuredPaymentMethods.push({
          type: method.type,
          label: method.label || config.label,
          icon: config.icon,
          color: config.color,
          config: method.config,
          provider: method.provider
        });
      });
    }

    renderPaymentMethods();
  } catch (err) {
    console.error("Failed to load payment methods:", err);
    // Fallback to defaults
    configuredPaymentMethods = [
      { type: "cash", label: "Cash", icon: "fa-money-bill-wave", color: "text-green-500" },
      { type: "card", label: "Card", icon: "fa-credit-card", color: "text-blue-500" },
      { type: "mobile_money", label: "Mobile Money", icon: "fa-mobile-alt", color: "text-purple-500" }
    ];
    renderPaymentMethods();
  }
}

function renderPaymentMethods() {
  const container = document.getElementById("payment-methods-container");
  if (!container) return;

  container.innerHTML = configuredPaymentMethods.map((method, index) => `
    <label class="cursor-pointer">
      <input type="radio" name="paymentMethod" value="${method.type}" class="peer hidden" id="payment-${method.type}">
      <div class="flex flex-col items-center justify-center p-3 rounded-xl border border-primary-200 dark:border-primary-700 bg-white/50 dark:bg-primary-800/50 peer-checked:border-accent-500 peer-checked:bg-accent-50 dark:peer-checked:bg-accent-900/20 peer-checked:text-accent-600 dark:peer-checked:text-accent-400 transition-all hover:bg-primary-50 dark:hover:bg-primary-800">
        <i class="fas ${method.icon} text-xl mb-1 ${method.color}"></i>
        <span class="text-xs font-bold">${method.label}</span>
      </div>
    </label>
  `).join("");

  // Add event listeners to new payment method radios
  document.querySelectorAll('input[name="paymentMethod"]').forEach((radio) => {
    radio.addEventListener("change", handlePaymentMethodChange);
  });

  // Select first payment method by default
  const firstMethod = document.querySelector('input[name="paymentMethod"]');
  if (firstMethod) firstMethod.checked = true;
}

function handlePaymentMethodChange(event) {
  const cashPaymentSection = document.getElementById("cash-payment-section");
  const cashReceivedInput = document.getElementById("cash-received");
  const cashChangeSpan = document.getElementById("cash-change");
  const processSaleBtn = document.getElementById("process-sale-btn");

  if (event.target.value === "cash") {
    cashPaymentSection.classList.remove("hidden");
    const total = parseFloat(
      document
        .getElementById("checkout-total")
        .textContent.replace("KES ", "")
    );
    const received = parseFloat(cashReceivedInput.value) || 0;
    const change = received - total;
    cashChangeSpan.textContent = `KES ${Math.max(0, change).toFixed(2)}`;
    processSaleBtn.disabled = received < total;
  } else {
    cashPaymentSection.classList.add("hidden");
    processSaleBtn.disabled = false;
  }
}

// Initial render on page load
document.addEventListener("DOMContentLoaded", async () => {
  // First, check subscription status
  try {
    const response = await fetch("/subscriptions/details", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (response.ok) {
      const data = await response.json();
      isSubscriptionActive = data.subscription.status === "active";
    } else if (response.status === 403 || response.status === 404) {
      // No active subscription found, or unauthorized
      isSubscriptionActive = false;
      showSubscriptionInactiveModal();
    } else {
      console.error(
        "Error checking subscription status:",
        response.status,
        response.statusText
      );
      showToast("Could not verify subscription status.", "error");
      isSubscriptionActive = false; // Assume inactive on error
    }
  } catch (error) {
    console.error("Network error checking subscription status:", error);
    showToast(
      "Network error checking subscription. Please try again.",
      "error"
    );
    isSubscriptionActive = false; // Assume inactive on network error
  }

  // Load products and render UI based on subscription status
  loadProductsForSale();
  loadPaymentMethods();

  const cartButton = document.getElementById("mobile-cart-button");
  if (cartButton) {
    cartButton.setAttribute("aria-expanded", "false");
    cartButton.setAttribute("aria-label", "Toggle cart");
  }

  updateMobileCart([]);

  const desktopCartCollapsed = document.getElementById("cart-collapsed");
  const desktopCartExpanded = document.getElementById("cart-expanded");
  const minimizeCartBtn = document.getElementById("minimize-cart");

  if (desktopCartCollapsed && desktopCartExpanded && minimizeCartBtn) {
    desktopCartCollapsed.addEventListener("click", () => {
      desktopCartCollapsed.classList.add("hidden");
      desktopCartExpanded.classList.remove("hidden");
    });

    minimizeCartBtn.addEventListener("click", () => {
      desktopCartExpanded.classList.add("hidden");
      desktopCartCollapsed.classList.remove("hidden");
    });
  }
});

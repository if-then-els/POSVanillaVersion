/**
 * Sidebar functionality for POS System
 */

// Load sidebar content
function loadSidebar() {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;

  // Get current page path
  const currentPath = window.location.pathname;
  const pageName = currentPath.split("/").pop();

  // Sidebar HTML content
  sidebar.innerHTML = `
    <div class="flex h-16 items-center justify-between border-b px-4">
      <h1 class="text-xl font-bold">POS System</h1>

      <button id="collapse-toggle" class="hidden md:block text-gray-400 hover:text-white">
        <i id="collapse-icon" class="fas fa-chevron-left"></i>
      </button>
    </div>

    
    <nav class="p-4">
  <ul class="space-y-2">
    <li>
      <a href="./dashboard.html" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 hover:bg-gray-700 hover:text-white ${
        window.location.pathname.endsWith("dashboard.html")
          ? "bg-gray-700 text-white"
          : ""
      }">
        <i class="fas fa-home w-5"></i><span class="sidebar-text">Dashboard</span>
      </a>
    </li>
    <li>
      <a href="./sales.html" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 hover:bg-gray-700 hover:text-white ${
        window.location.pathname.endsWith("sales.html")
          ? "bg-gray-700 text-white"
          : ""
      }">
        <i class="fas fa-shopping-cart w-5"></i><span class="sidebar-text">Sales</span>
      </a>
    </li>
    <li>
      <a href="./inventory.html" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 hover:bg-gray-700 hover:text-white ${
        window.location.pathname.endsWith("inventory.html")
          ? "bg-gray-700 text-white"
          : ""
      }">
        <i class="fas fa-box w-5"></i><span class="sidebar-text">Inventory</span>
      </a>
    </li>
    <li>
      <a href="./reports.html" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 hover:bg-gray-700 hover:text-white ${
        window.location.pathname.endsWith("reports.html")
          ? "bg-gray-700 text-white"
          : ""
      }">
        <i class="fas fa-chart-bar w-5"></i><span class="sidebar-text">Reports</span>
      </a>
    </li>
    <li>
      <a href="./manageSubscriptions.html" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 hover:bg-gray-700 hover:text-white ${
        window.location.pathname.endsWith("manageSubscriptions.html")
          ? "bg-gray-700 text-white"
          : ""
      }">
        <i class="fa-solid fa-bell w-5"></i><span class="sidebar-text">Subscriptions</span>
      </a>
    </li>
    <li>
      <a href="./users.html" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 hover:bg-gray-700 hover:text-white ${
        window.location.pathname.endsWith("users.html")
          ? "bg-gray-700 text-white"
          : ""
      }">
        <i class="fa-solid fa-users w-5"></i><span class="sidebar-text">User management</span>
      </a>
    </li>
    <li>
      <a href="./settings.html" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 hover:bg-gray-700 hover:text-white ${
        window.location.pathname.endsWith("settings.html")
          ? "bg-gray-700 text-white"
          : ""
      }">
        <i class="fas fa-cog w-5"></i><span class="sidebar-text">Settings</span>
      </a>
    </li>
  </ul>
</nav>

    <div class="border-t mt-auto p-4">
      <div class="flex items-center gap-3 rounded-md px-3 py-2">
        <i class="fas fa-user w-5"></i>
        <div class="flex flex-col sidebar-text">
          <span class="text-sm font-medium" id="user-name">Admin User</span>
          <span class="text-xs text-gray-500" id="user-email">admin@pos.com</span>
        </div>
      </div>
      <button id="logout-btn" class="mt-2 w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50">
        <i class="fas fa-sign-out-alt w-5"></i>
        <span class="sidebar-text">Logout</span>
      </button>
    </div>
  `;

  // Add event listener for collapse toggle
  const collapseToggle = document.getElementById("collapse-toggle");
  if (collapseToggle) {
    collapseToggle.addEventListener("click", toggleSidebarCollapse);
  }

  // Check localStorage for collapsed state
  const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
  if (isCollapsed) {
    collapseSidebar();
  }

  // Update user info
  async function updateUserInfo() {
    const userName = document.getElementById("user-name");
    const userEmail = document.getElementById("user-email");

    try {
      const response = await fetch("/userDetails", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();

      if (response.ok && data) {
        if (userName && data.username) userName.textContent = data.name;
        if (userEmail && data.email) userEmail.textContent = data.email;
      } else {
        showToast(
          "Error",
          data.message || "Failed to fetch user info",
          "error"
        );
      }
    } catch (err) {
      showToast("Error", "Failed to fetch user info", "error");
    }
  }
  updateUserInfo();

  // Add event listener to logout button
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    function logout() {
      // Placeholder for logout logic
      console.log("Logging out...");
    }
    logoutBtn.addEventListener("click", logout);
  }
}

// Toggle sidebar collapse state
function toggleSidebarCollapse() {
  const isCollapsed = document.body.classList.contains('sidebar-collapsed');
  if (isCollapsed) {
    expandSidebar();
  } else {
    collapseSidebar();
  }
}

// Collapse sidebar to show only icons
function collapseSidebar() {
  document.body.classList.add('sidebar-collapsed');
  document.querySelectorAll('.sidebar-text').forEach(el => {
    el.style.display = 'none';
  });
  const collapseIcon = document.getElementById("collapse-icon");
  if (collapseIcon) {
    collapseIcon.classList.remove('fa-chevron-left');
    collapseIcon.classList.add('fa-chevron-right');
  }
  localStorage.setItem('sidebarCollapsed', 'true');
}

// Expand sidebar to show full menu
function expandSidebar() {
  document.body.classList.remove('sidebar-collapsed');
  document.querySelectorAll('.sidebar-text').forEach(el => {
    el.style.display = '';
  });
  const collapseIcon = document.getElementById("collapse-icon");
  if (collapseIcon) {
    collapseIcon.classList.remove('fa-chevron-right');
    collapseIcon.classList.add('fa-chevron-left');
  }
  localStorage.setItem('sidebarCollapsed', 'false');
}

// ... rest of your existing code remains the same ...

// Fetch products from backend and render them in the products grid
async function loadProductsForSale() {
  try {
    const response = await fetch("/getInventory", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    const data = await response.json();
    const products = data.products || [];

    const productsGrid = document.getElementById("products-grid");
    if (!productsGrid) return;

    if (products.length === 0) {
      productsGrid.innerHTML = `<div class="text-center p-8 text-gray-500">No products found.</div>`;
      return;
    }

    productsGrid.innerHTML = products
      .map(
        (product) => `
      <div class="border rounded-lg p-4 flex flex-col items-center shadow hover:shadow-md transition">
      
        <div class="font-semibold">${product.productName}</div>
        <div class="text-gray-500 text-sm mb-1">${
          product.productBatchNumber
        }</div>
        <div class="text-primary-600 font-bold mb-2">KSH ${product.productPrice.toFixed(
          2
        )}</div>
        <div class="text-xs text-gray-400 mb-2">Stock: ${
          product.productQuantity
        }</div>
        <button class="add-to-cart-btn bg-primary-600 hover:bg-primary-700 text-white px-3 py-1 rounded text-sm" 
          data-id="${product._id}"
          data-name="${product.productName}"
          data-price="${product.productPrice}"
          data-quantity="${product.productQuantity}">
          Add to Cart
        </button>
      </div>
    `
      )
      .join("");

    // Add event listeners for add-to-cart buttons
    document.querySelectorAll(".add-to-cart-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        const product = {
          _id: btn.getAttribute("data-id"),
          productName: btn.getAttribute("data-name"),
          productPrice: parseFloat(btn.getAttribute("data-price")),
          productQuantity: parseInt(btn.getAttribute("data-quantity")),
          quantity: 1, // Default to 1 for cart
        };
        addToCart(product);
      });
    });
  } catch (error) {
    const productsGrid = document.getElementById("products-grid");
    if (productsGrid) {
      productsGrid.innerHTML = `<div class="text-center p-8 text-red-500">Failed to load products.</div>`;
    }
    console.error("Error loading products:", error);
  }
}
document.addEventListener("DOMContentLoaded", () => {
  loadProductsForSale();
});

// After processing sale, fetch and show receipt
async function processSale(cartItems, total, customerName, paymentMethod) {
  const items = cartItems.map((item) => ({
    productId: item._id,
    quantity: item.quantity,
    price: item.productPrice,
  }));

  const response = await fetch("/processSale", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items, total, customerName, paymentMethod }),
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
}
let cart = [];

// Add product to cart
function addToCart(product) {
  const existing = cart.find((item) => item._id === product._id);
  if (existing) {
    if (existing.quantity < product.productQuantity) {
      existing.quantity += 1;
    }
  } else {
    cart.push({ ...product });
  }
  renderCart();
}

// Remove product from cart
function removeFromCart(productId) {
  cart = cart.filter((item) => item._id !== productId);
  renderCart();
}

// Update cart UI
function renderCart() {
  // Update cart count badge
  const cartCountBadge = document.getElementById("cart-count-badge");
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (cartCountBadge) {
    cartCountBadge.textContent = cartCount;
    cartCountBadge.classList.toggle("hidden", cartCount === 0);
  }

  // Toggle between collapsed and expanded cart views (desktop)
  const body = document.body;
  if (cartCount === 0) {
    body.classList.remove("cart-has-items");
  } else {
    body.classList.add("cart-has-items");
  }

  // Update cart count text
  const cartCountText = document.getElementById("cart-count");
  if (cartCountText) {
    cartCountText.textContent = `${cartCount} ${
      cartCount === 1 ? "item" : "items"
    } in cart`;
  }

  // Render cart items
  const cartItemsDiv = document.getElementById("cart-items");
  const cartTotalSpan = document.getElementById("cart-total");
  const checkoutBtn = document.getElementById("checkout-btn");
  const clearCartBtn = document.getElementById("clear-cart-btn");

  if (cartItemsDiv) {
    if (cart.length === 0) {
      cartItemsDiv.innerHTML = `
        <div class="text-center py-8 text-gray-400 flex flex-col items-center">
          <i class="fas fa-shopping-cart text-3xl mb-2"></i>
          <p>Your cart is empty</p>
          <p class="text-sm mt-1">Add products to get started</p>
        </div>
      `;
    } else {
      cartItemsDiv.innerHTML = cart
        .map(
          (item) => `
          <div class="flex items-center justify-between border-b py-2">
            <div>
              <div class="font-medium">${item.productName}</div>
              <div class="text-xs text-gray-500">Qty: ${
                item.quantity
              } x KSH ${item.productPrice.toFixed(2)}</div>
            </div>
            <div class="flex items-center gap-2">
              <button class="decrease-qty-btn px-2 py-1 text-sm bg-gray-200 rounded" data-id="${
                item._id
              }">-</button>
              <button class="increase-qty-btn px-2 py-1 text-sm bg-gray-200 rounded" data-id="${
                item._id
              }">+</button>
              <button class="remove-cart-btn px-2 py-1 text-sm text-red-500" data-id="${
                item._id
              }">&times;</button>
            </div>
          </div>
        `
        )
        .join("");
    }
  }

  // Calculate and update totals
  const subtotal = cart.reduce(
    (sum, item) => sum + item.quantity * item.productPrice,
    0
  );
  const taxRate = 0.1; // 10% tax
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  if (document.getElementById("cart-subtotal")) {
    document.getElementById(
      "cart-subtotal"
    ).textContent = `KSH ${subtotal.toFixed(2)}`;
  }
  if (document.getElementById("cart-tax")) {
    document.getElementById("cart-tax").textContent = `KSH ${tax.toFixed(2)}`;
  }
  if (cartTotalSpan) {
    cartTotalSpan.textContent = `KSH ${total.toFixed(2)}`;
  }

  // ✅ Update mobile cart totals
  if (document.getElementById("mobile-cart-subtotal")) {
    document.getElementById(
      "mobile-cart-subtotal"
    ).textContent = `KSH ${subtotal.toFixed(2)}`;
  }
  if (document.getElementById("mobile-cart-tax")) {
    document.getElementById("mobile-cart-tax").textContent = `KSH ${tax.toFixed(
      2
    )}`;
  }
  if (document.getElementById("mobile-cart-total")) {
    document.getElementById(
      "mobile-cart-total"
    ).textContent = `KSH ${total.toFixed(2)}`;
  }

  // ✅ Enable/disable mobile buttons
  const mobileCheckoutBtn = document.getElementById("mobile-checkout-btn");
  const mobileClearCartBtn = document.getElementById("mobile-clear-cart-btn");

  if (mobileCheckoutBtn) mobileCheckoutBtn.disabled = cart.length === 0;
  if (mobileClearCartBtn) mobileClearCartBtn.disabled = cart.length === 0;

  // Enable/disable checkout and clear cart buttons
  if (checkoutBtn) checkoutBtn.disabled = cart.length === 0;
  if (clearCartBtn) clearCartBtn.disabled = cart.length === 0;

  // Add event listeners for quantity and remove buttons
  document.querySelectorAll(".decrease-qty-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const item = cart.find((i) => i._id === id);
      if (item && item.quantity > 1) {
        item.quantity -= 1;
        renderCart();
      }
    });
  });

  document.querySelectorAll(".increase-qty-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const item = cart.find((i) => i._id === id);
      // Ensure item.productQuantity exists and is a number before comparison
      if (item && item.quantity < (item.productQuantity || Infinity)) {
        item.quantity += 1;
        renderCart();
      }
    });
  });

  document.querySelectorAll(".remove-cart-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      removeFromCart(id);
    });
  });

  // Sync mobile cart UI (if applicable, assuming updateMobileCart is defined elsewhere)
  if (typeof updateMobileCart === "function") {
    updateMobileCart(cart);
  }
}

// Clear cart
function clearCart() {
  cart = [];
  renderCart();
}

function showCheckoutModal() {
  if (cart.length === 0) return;

  renderCart(); // ✅ Ensure cart UI and totals are refreshed before showing modal

  document.getElementById("checkout-modal").classList.remove("hidden");

  // Render checkout items
  const checkoutItemsDiv = document.getElementById("checkout-items");
  const checkoutTotalSpan = document.getElementById("checkout-total");

  if (checkoutItemsDiv) {
    checkoutItemsDiv.innerHTML = cart
      .map(
        (item) =>
          `<div class="flex justify-between"><span>${item.productName} x ${
            item.quantity
          }</span><span>$${(item.productPrice * item.quantity).toFixed(
            2
          )}</span></div>`
      )
      .join("");
  }

  const total = cart.reduce(
    (sum, item) => sum + item.quantity * item.productPrice,
    0
  );
  if (checkoutTotalSpan) checkoutTotalSpan.textContent = `$${total.toFixed(2)}`;
}

// Hide checkout modal
function hideCheckoutModal() {
  document.getElementById("checkout-modal").classList.add("hidden");
}

// Show toast notification
function showToast(title, message, type = "info") {
  const toastContainer = document.getElementById("toast-container");
  if (!toastContainer) return;
  const toast = document.createElement("div");
  toast.className =
    "mb-2 px-4 py-2 rounded shadow " +
    (type === "success"
      ? "bg-green-500 text-white"
      : type === "error"
      ? "bg-red-500 text-white"
      : "bg-gray-800 text-white");
  toast.innerHTML = `<strong>${title}</strong><div>${message}</div>`;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Show receipt
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
            font-size: 14px;
            margin-bottom: 3px;
          }
          
          /* Transaction Info */
          .transaction-info {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin: 25px 0;
            font-size: 14px;
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #eee;
          }
          
          .info-label {
            font-weight: 600;
            color: #2c3e50;
          }
          
          /* Table Styles */
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 25px 0;
            font-size: 14px;
          }
          
          .items-table th {
            text-align: left;
            padding: 12px 5px;
            border-bottom: 2px solid #3498db;
            color: #2c3e50;
            font-weight: 600;
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
            font-size: 18px;
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
            font-size: 16px;
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
                ? `<img src="${settings.logoUrl}" class="logo" alt="Store Logo">`
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
          
          <div class="footer">
            <div class="thank-you">Thank you for your business!</div>
            <div>${
              settings.footerText || "We appreciate your trust in us"
            }</div>
            <div>Have questions? ${
              settings.storePhone || "Call: (123) 456-7890"
            }</div>
            <div>${
              settings.returnPolicy ||
              "Items can be exchanged within 14 days with receipt"
            }</div>
          </div>
          
          <button class="print-btn" onclick="window.print()">Print Receipt</button>
        </div>
      </body>
    </html>
  `);
  receiptWindow.document.close();
}

// Desktop cart toggle (collapsed/expanded)
document.addEventListener("DOMContentLoaded", () => {
  loadSidebar(); // Ensure sidebar loads on DOMContentLoaded
  loadProductsForSale(); // Ensure products load on DOMContentLoaded
  renderCart(); // Ensure cart renders on DOMContentLoaded

  const toggleCart = document.getElementById("toggle-cart");
  if (toggleCart) {
    toggleCart.addEventListener("click", () => {
      document.body.classList.add("cart-has-items");
    });
  }
  const minimizeCart = document.getElementById("minimize-cart");
  if (minimizeCart) {
    minimizeCart.addEventListener("click", () => {
      document.body.classList.remove("cart-has-items");
    });
  }

  // Checkout button
  const checkoutBtn = document.getElementById("checkout-btn");
  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", showCheckoutModal);
  }

  // Clear cart button
  const clearCartBtn = document.getElementById("clear-cart-btn");
  if (clearCartBtn) {
    clearCartBtn.addEventListener("click", clearCart);
  }

  // Cancel checkout
  const checkoutCancel = document.getElementById("checkout-cancel");
  if (checkoutCancel) {
    checkoutCancel.addEventListener("click", hideCheckoutModal);
  }

  // Checkout form submit
  const checkoutForm = document.getElementById("checkout-form");
  if (checkoutForm) {
    checkoutForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      // Get customer info
      const customerName = document
        .getElementById("customer-name")
        .value.trim();
      const paymentMethod = checkoutForm.elements["paymentMethod"].value;
      const total = cart.reduce(
        (sum, item) => sum + item.quantity * item.productPrice,
        0
      );

      // Process sale
      try {
        const response = await processSale(
          cart,
          total,
          customerName,
          paymentMethod
        );
        if (response && response.message) {
          showToast("Sale Successful", response.message, "success");
        } else {
          showToast(
            "Sale Successful",
            "Sale processed successfully",
            "success"
          );
        }
        clearCart();
        hideCheckoutModal();
      } catch (err) {
        showToast("Error", "Failed to process sale", "error");
      }
    });
  }

  // Show/hide cash section based on payment method
  const cashSection = document.getElementById("cash-payment-section");
  const cashReceivedInput = document.getElementById("cash-received");
  const cashChangeSpan = document.getElementById("cash-change");
  const totalSpan = document.getElementById("checkout-total");

  if (checkoutForm) {
    checkoutForm.addEventListener("change", (e) => {
      const method = checkoutForm.elements["paymentMethod"].value;
      if (method === "cash") {
        cashSection.classList.remove("hidden");
      } else {
        cashSection.classList.add("hidden");
      }
    });

    // Calculate change on input
    if (cashReceivedInput) {
      cashReceivedInput.addEventListener("input", () => {
        const total =
          parseFloat(totalSpan.textContent.replace(/[^\d.]/g, "")) || 0;
        const received = parseFloat(cashReceivedInput.value) || 0;
        const change = received - total;
        cashChangeSpan.textContent = `KES ${
          change > 0 ? change.toFixed(2) : "0.00"
        }`;
      });
    }

    // On submit, validate cash received if payment is cash
    checkoutForm.addEventListener("submit", (e) => {
      const method = checkoutForm.elements["paymentMethod"].value;
      if (method === "cash" && cashReceivedInput) {
        const total =
          parseFloat(totalSpan.textContent.replace(/[^\d.]/g, "")) || 0;
        const received = parseFloat(cashReceivedInput.value) || 0;
        if (received < total) {
          e.preventDefault();
          showToast(
            "Error",
            "Cash received is less than total amount.",
            "error"
          );
        }
      }
    });
  }
});

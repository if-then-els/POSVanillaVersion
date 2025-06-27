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
     
    </div>
    <nav class="p-4">
      <ul class="space-y-2">
        <li>
          <a href="./dashboard.html" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100 ${
            pageName === "dashboard.html" ? "bg-gray-100" : ""
          }">
            <i class="fas fa-home w-5"></i>
            <span>Dashboard</span>
          </a>
        </li>
        <li>
          <a href="./sales.html" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100 ${
            pageName === "sales.html" ? "bg-gray-100" : ""
          }">
            <i class="fas fa-shopping-cart w-5"></i>
            <span>Sales</span>
          </a>
        </li>
        <li>
          <a href="./inventory.html" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100 ${
            pageName === "inventory.html" ? "bg-gray-100" : ""
          }">
            <i class="fas fa-box w-5"></i>
            <span>Inventory</span>
          </a>
        </li>
        <li>
          <a href="./manageSubscriptions.html" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100 ${
            window.location.pathname.endsWith("manageSubscriptions.html")
              ? "bg-gray-100"
              : ""
          }">
           <i class="fa-solid fa-bell"></i>
            <span>Subscriptions</span>
          </a>
        </li>
        <li>
          <a href="./reports.html" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100 ${
            pageName === "reports.html" ? "bg-gray-100" : ""
          }">
            <i class="fas fa-chart-bar w-5"></i>
            <span>Reports</span>
          </a>
        </li>
        <li>
          <a href="./settings.html" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100 ${
            pageName === "settings.html" ? "bg-gray-100" : ""
          }">
            <i class="fas fa-cog w-5"></i>
            <span>Settings</span>
          </a>
        </li>
      </ul>
    </nav>
    <div class="border-t mt-auto p-4">
      <div class="flex items-center gap-3 rounded-md px-3 py-2">
        <i class="fas fa-user w-5"></i>
        <div class="flex flex-col">
          <span class="text-sm font-medium" id="user-name">Admin User</span>
          <span class="text-xs text-gray-500" id="user-email">admin@pos.com</span>
        </div>
      </div>
      <button id="logout-btn" class="mt-2 w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50">
        <i class="fas fa-sign-out-alt w-5"></i>
        <span>Logout</span>
      </button>
    </div>
  `;

  // Update user info
  async function updateUserInfo() {
    const userName = document.getElementById("user-name");
    const userEmail = document.getElementById("user-email");

    // Fetch user info from backend (placeholder data for now)
    const response = await fetch("/userDetails", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(productData),
    });
    data = await response.json();

    if (response.ok) {
      showToast(
        "Product Added",
        `${productData.productName} has been added to inventory`,
        "success"
      );
    } else {
      showToast("Error", data.message || "Failed to add product", "error");
      return; // Stop if add fails
    }
  }
  updateUserInfo();

  // Add event listener to toggle sidebar
  // const toggleSidebarBtn = document.getElementById("toggle-sidebar");
  // const mainContent = document.getElementById("main-content");

  // if (toggleSidebarBtn && mainContent) {
  //   toggleSidebarBtn.addEventListener("click", () => {
  //     sidebar.classList.toggle("open");
  //     mainContent.classList.toggle("sidebar-open");
  //   });
  // }

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
        <img src="../assets/images/placeholder.png" alt="${
          product.productName
        }" class="h-16 w-16 object-cover mb-2 rounded">
        <div class="font-semibold">${product.productName}</div>
        <div class="text-gray-500 text-sm mb-1">${
          product.productBatchNumber
        }</div>
        <div class="text-primary-600 font-bold mb-2">$${product.productPrice.toFixed(
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

// Show receipt in a new window (already present, just ensure it's called with backend data)
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
          body { font-family: Arial; padding: 20px; }
          h2 { text-align: center; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          td, th { border-bottom: 1px solid #ddd; padding: 8px; }
          .total { font-weight: bold; }
        </style>
      </head>
      <body>
        ${
          settings.showLogo && settings.logoUrl
            ? `<img src="${settings.logoUrl}" style="max-width:120px;display:block;margin:0 auto 10px auto;">`
            : ""
        }
        <h2>${settings.storeName || "Store Name"}</h2>
        <div>${settings.storeAddress || ""}</div>
        ${
          settings.includeContact
            ? `<div>${settings.storePhone || ""}</div><div>${
                settings.storeEmail || ""
              }</div>`
            : ""
        }
        <hr>
        <div>Date: ${new Date(sale.createdAt).toLocaleString()}</div>
        <div>Customer: ${sale.customerName || "-"}</div>
        <div>Payment: ${sale.paymentMethod}</div>
        <table>
          <tr><th>Product</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr>
          ${sale.items
            .map(
              (item) =>
                `<tr>
                  <td>${item.productName}</td>
                  <td>${item.quantity}</td>
                  <td>${item.price.toFixed(2)}</td>
                  <td>${(item.price * item.quantity).toFixed(2)}</td>
                </tr>`
            )
            .join("")}
        </table>
        <div class="total">Total: ${
          settings.currency || "$"
        }${sale.total.toFixed(2)}</div>
        <hr>
        <div>${settings.footerText || "Thank you for your purchase!"}</div>
        <button onclick="window.print()">Print</button>
      </body>
    </html>
  `);
  receiptWindow.document.close();
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
// function renderCart() {
//   // Update cart count badge
//   const cartCountBadge = document.getElementById('cart-count-badge');
//   const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

//   if (cartCountBadge) {
//     cartCountBadge.textContent = cartCount;
//     cartCountBadge.classList.toggle('hidden', cartCount === 0);
//   }

//   // Toggle between collapsed and expanded cart views
//   const cartCollapsed = document.getElementById('cart-collapsed');
//   const cartExpanded = document.getElementById('cart-expanded');

//   if (cartCount === 0) {
//     // Show collapsed cart when empty
//     if (cartCollapsed) cartCollapsed.classList.remove('hidden');
//     if (cartExpanded) cartExpanded.classList.add('hidden');
//   } else {
//     // Show expanded cart when items exist
//     if (cartCollapsed) cartCollapsed.classList.add('hidden');
//     if (cartExpanded) cartExpanded.classList.remove('hidden');
//   }

//   // Update cart count text
//   const cartCountText = document.getElementById('cart-count');
//   if (cartCountText) {
//     cartCountText.textContent = `${cartCount} ${cartCount === 1 ? 'item' : 'items'} in cart`;
//   }

//   // Render cart items
//   const cartItemsDiv = document.getElementById('cart-items');
//   const cartTotalSpan = document.getElementById('cart-total');
//   const checkoutBtn = document.getElementById('checkout-btn');
//   const clearCartBtn = document.getElementById('clear-cart-btn');

//   if (cartItemsDiv) {
//     if (cart.length === 0) {
//       cartItemsDiv.innerHTML = `
//         <div class="text-center py-8 text-gray-400 flex flex-col items-center">
//           <i class="fas fa-shopping-cart text-3xl mb-2"></i>
//           <p>Your cart is empty</p>
//           <p class="text-sm mt-1">Add products to get started</p>
//         </div>
//       `;
//     } else {
//       cartItemsDiv.innerHTML = cart
//         .map(
//           (item) => `
//           <div class="flex items-center justify-between border-b py-2">
//             <div>
//               <div class="font-medium">${item.productName}</div>
//               <div class="text-xs text-gray-500">Qty: ${
//                 item.quantity
//               } x $${item.productPrice.toFixed(2)}</div>
//             </div>
//             <div class="flex items-center gap-2">
//               <button class="decrease-qty-btn px-2 py-1 text-sm bg-gray-200 rounded" data-id="${
//                 item._id
//               }">-</button>
//               <button class="increase-qty-btn px-2 py-1 text-sm bg-gray-200 rounded" data-id="${
//                 item._id
//               }">+</button>
//               <button class="remove-cart-btn px-2 py-1 text-sm text-red-500" data-id="${
//                 item._id
//               }">&times;</button>
//             </div>
//           </div>
//         `
//         )
//         .join("");
//     }
//   }

// Calculate and update totals
const subtotal = cart.reduce(
  (sum, item) => sum + item.quantity * item.productPrice,
  0
);
const taxRate = 0.1; // 10% tax
const tax = subtotal * taxRate;
const total = subtotal + tax;

if (document.getElementById("cart-subtotal")) {
  document.getElementById("cart-subtotal").textContent = `$${subtotal.toFixed(
    2
  )}`;
}
if (document.getElementById("cart-tax")) {
  document.getElementById("cart-tax").textContent = `$${tax.toFixed(2)}`;
}
if (cartTotalSpan) {
  cartTotalSpan.textContent = `$${total.toFixed(2)}`;
}

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
    if (item && item.quantity < item.productQuantity) {
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
// Update cart UI
function renderCart() {
  // Update cart count badge
  const cartCountBadge = document.getElementById("cart-count-badge");
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (cartCountBadge) {
    cartCountBadge.textContent = cartCount;
    cartCountBadge.classList.toggle("hidden", cartCount === 0);
  }

  // Toggle between collapsed and expanded cart views
  const cartCollapsed = document.getElementById("cart-collapsed");
  const cartExpanded = document.getElementById("cart-expanded");

  if (cartCount === 0) {
    // Show collapsed cart when empty
    if (cartCollapsed) cartCollapsed.classList.remove("hidden");
    if (cartExpanded) cartExpanded.classList.add("hidden");
  } else {
    // Show expanded cart when items exist
    if (cartCollapsed) cartCollapsed.classList.add("hidden");
    if (cartExpanded) cartExpanded.classList.remove("hidden");
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
              } x $${item.productPrice.toFixed(2)}</div>
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
    document.getElementById("cart-subtotal").textContent = `$${subtotal.toFixed(
      2
    )}`;
  }
  if (document.getElementById("cart-tax")) {
    document.getElementById("cart-tax").textContent = `$${tax.toFixed(2)}`;
  }
  if (cartTotalSpan) {
    cartTotalSpan.textContent = `$${total.toFixed(2)}`;
  }

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
      if (item && item.quantity < item.productQuantity) {
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
}

// Clear cart
function clearCart() {
  cart = [];
  renderCart();
}

// Show checkout modal
function showCheckoutModal() {
  if (cart.length === 0) return;
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

// Handle checkout form submit
document.addEventListener("DOMContentLoaded", () => {
  loadSidebar();
  loadProductsForSale();
  renderCart();

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
});

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
          body { font-family: Arial; padding: 20px; }
          h2 { text-align: center; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          td, th { border-bottom: 1px solid #ddd; padding: 8px; }
          .total { font-weight: bold; }
        </style>
      </head>
      <body>
        ${
          settings.showLogo && settings.logoUrl
            ? `<img src="${settings.logoUrl}" style="max-width:120px;display:block;margin:0 auto 10px auto;">`
            : ""
        }
        <h2>${settings.storeName || "Store Name"}</h2>
        <div>${settings.storeAddress || ""}</div>
        ${
          settings.includeContact
            ? `<div>${settings.storePhone || ""}</div><div>${
                settings.storeEmail || ""
              }</div>`
            : ""
        }
        <hr>
        <div>Date: ${new Date(sale.createdAt).toLocaleString()}</div>
        <div>Customer: ${sale.customerName || "-"}</div>
        <div>Payment: ${sale.paymentMethod}</div>
        <table>
          <tr><th>Product</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr>
          ${sale.items
            .map(
              (item) =>
                `<tr>
                  <td>${item.productName}</td>
                  <td>${item.quantity}</td>
                  <td>${item.price.toFixed(2)}</td>
                  <td>${(item.price * item.quantity).toFixed(2)}</td>
                </tr>`
            )
            .join("")}
        </table>
        <div class="total">Total: ${
          settings.currency || "$"
        }${sale.total.toFixed(2)}</div>
        <hr>
        <div>${settings.footerText || "Thank you for your purchase!"}</div>
        <button onclick="window.print()">Print</button>
      </body>
    </html>
  `);
  receiptWindow.document.close();
}

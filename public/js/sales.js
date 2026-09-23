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

// === PRODUCTION CONTEXT: business / plan / role / subscription ===
function parseJwt(token){
  try{ const p=token.split(".")[1]; return JSON.parse(atob(p.replace(/-/g,"+").replace(/_/g,"/"))); }catch{ return null; }
}
function getToken(){
  return localStorage.getItem("token") || (document.cookie.match(/(^| )token=([^;]+)/)||[])[2] || "";
}
let __salesContext = { business:null, plan:null, role:null, sub:null };
async function loadSalesContext(){
  const token = getToken();
  const payload = parseJwt(token);
  __salesContext.role = payload?.role || "cashier";
  try{
    const r = await fetch("/api/business/business/details", {credentials:"include", headers: token?{Authorization:"Bearer "+token}:{}});
    if(r.ok){ const d=await r.json(); __salesContext.business=d.business; const el=document.getElementById("ctx-business"); if(el) el.querySelector("span").textContent=d.business.businessName||"Business"; }
  }catch{}
  try{
    const r = await fetch("/api/business/my-subscription", {credentials:"include", headers: token?{Authorization:"Bearer "+token}:{}});
    if(r.ok){ const d=await r.json(); __salesContext.plan=d.plan; __salesContext.sub=d.subscription; const pel=document.getElementById("ctx-plan"); if(pel && d.plan){ pel.classList.remove("hidden"); pel.querySelector("span").textContent=d.plan.name; }
      const sel=document.getElementById("ctx-sub"); if(sel && d.subscription){ sel.classList.remove("hidden"); const days=Math.ceil((new Date(d.subscription.endDate)-new Date())/86400000); sel.querySelector("span").textContent= d.subscription.status==="active" ? `Active • ${days}d left` : d.subscription.status; sel.className = d.subscription.status==="active" ? "px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30" : "px-2.5 py-1 rounded-full bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/30"; }
      const bcBadge=document.getElementById("tier-stock-badge"); if(bcBadge && d.plan && !d.plan.features?.barcode) bcBadge.classList.remove("hidden");
      const payBadge=document.getElementById("payment-tier-badge"); if(payBadge && d.plan && !d.plan.features?.cardPayments) payBadge.classList.remove("hidden");
      const rel=document.getElementById("ctx-role"); if(rel){ rel.classList.remove("hidden"); rel.querySelector("span").textContent=__salesContext.role; }
      const sname = localStorage.getItem("selectedStoreId") ? "Store" : "Default Store";
      const selStore=document.getElementById("ctx-store"); if(selStore) selStore.querySelector("span").textContent=sname;
      if(localStorage.getItem("adminToken")){ const al=document.getElementById("ctx-admin-link"); if(al) al.classList.remove("hidden"); }
      const live=document.getElementById("live-indicator"); if(live) live.classList.remove("hidden");
      try{ const sr=await fetch("/api/settings", {credentials:"include"}); if(sr.ok){ const s=await sr.json(); const tr=document.getElementById("checkout-tax-rate"); if(tr) tr.textContent=(s.taxRate||0)+"%"; const td=document.getElementById("tax-display"); if(td) td.textContent=(s.taxRate||0)+"% (from Settings)"; window.__taxRate=s.taxRate||0; } }catch{}
      const guard=document.getElementById("checkout-auth-guard");
      if(["cashier","manager","admin","inventory"].includes(__salesContext.role)===false){
        if(guard){ guard.classList.remove("hidden"); document.getElementById("guard-msg").textContent="Role '"+__salesContext.role+"' cannot checkout."; document.getElementById("checkout-btn").disabled=true; document.getElementById("mobile-checkout-btn").disabled=true; }
      }
    }
  }catch(e){ console.warn("sales context", e.message); }
}
document.addEventListener("DOMContentLoaded", loadSalesContext);

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

// === Express Checkout: 1 screen, minimal typing, safe by default ===
const checkoutModal = document.getElementById("checkout-modal");
const checkoutCancelBtn = document.getElementById("checkout-cancel");
const checkoutForm = document.getElementById("checkout-form");
const processSaleBtn = document.getElementById("process-sale-btn");
const cashPaymentSection = document.getElementById("cash-payment-section");
const cashReceivedInput = document.getElementById("cash-received");
const cashChangeSpan = document.getElementById("cash-change");
let __isProcessing = false;
let __mpesaMode = "stk";
let __printAfter = false;

function formatKES(n){ return `KES ${Number(n||0).toFixed(2)}`; }
function getSelectedPaymentType(){
  return document.querySelector('input[name="paymentMethod"]:checked')?.value
    || localStorage.getItem("lastPaymentMethod") || "cash";
}
function parseTotalFromUI(){
  const t = calcTotals();
  return t.total;
}

document.getElementById("checkout-btn")?.addEventListener("click", (e)=>{ e.preventDefault(); openCheckoutModal(); });
document.getElementById("mobile-checkout-btn")?.addEventListener("click", (e)=>{ e.preventDefault(); openCheckoutModal(); });

function openCheckoutModal() {
  if (!isSubscriptionActive) { showSubscriptionInactiveModal(); return; }
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  if (itemCount === 0) { showToast("Your cart is empty. Add items to checkout.", "warning"); return false; }
  if (configuredPaymentMethods.length === 0) { loadPaymentMethods(); }
  // Defaults: Walk-in so cashier types nothing for 90% of sales
  const nameEl = document.getElementById("customer-name");
  if (nameEl && !nameEl.value) nameEl.value = "Walk-in";
  const discEl = document.getElementById("discount-input");
  // keep discount if cashier set it, else 0
  checkoutModal.classList.remove("hidden");
  document.getElementById("checkout-form")?.scrollTo?.(0,0);
  // Offline hint
  document.getElementById("offline-queue-note")?.classList.toggle("hidden", navigator.onLine);
  // Restore last method (faster repeat sales), fallback cash
  const last = localStorage.getItem("lastPaymentMethod") || "cash";
  const want = document.querySelector(`input[name="paymentMethod"][value="${last}"]`)
    ? last : (document.querySelector('input[name="paymentMethod"][value="cash"]') ? "cash"
    : document.querySelector('input[name="paymentMethod"]')?.value || "cash");
  setPaymentMethod(want, { silentToast: true });
  renderCheckoutSummary();
  // Focus for speed: cash input if cash, else phone
  setTimeout(()=>{
    if (want === "cash") cashReceivedInput?.focus();
    else if (String(want).startsWith("mpesa")) document.getElementById("mpesa-phone-inline")?.focus();
  }, 80);
  return true;
}
function closeCheckoutModal(){
  if (__isProcessing) return; // safety: don't lose an in-flight payment
  checkoutModal.classList.add("hidden");
  hideMpesaStatus();
}
checkoutCancelBtn?.addEventListener("click", closeCheckoutModal);
document.getElementById("checkout-cancel-2")?.addEventListener("click", closeCheckoutModal);
document.getElementById("checkout-modal-backdrop")?.addEventListener("click", closeCheckoutModal);
document.addEventListener("keydown", (e)=>{
  if (checkoutModal?.classList.contains("hidden")) return;
  if (e.key === "Escape") closeCheckoutModal();
});

function calcTotals(){
  const subtotal = cartItems.reduce((s,i)=> s + Number(i.productPrice)*Number(i.quantity), 0);
  let discRaw = parseFloat(document.getElementById("discount-input")?.value) || 0;
  if (discRaw < 0) discRaw = 0;
  const discType = document.getElementById("discount-type")?.value || "kes";
  let discount = discType==="percent" ? subtotal * (Math.min(discRaw,100)/100) : Math.min(discRaw, subtotal);
  if (!isFinite(discount)) discount = 0;
  const discounted = Math.max(0, subtotal - discount);
  const taxRate = Number(window.__taxRate ?? 0);
  const tax = discounted * (taxRate/100);
  const total = Math.max(0, discounted + tax);
  return { subtotal, discount, discounted, tax, taxRate, total };
}

function updatePayButton(){
  if (!processSaleBtn) return;
  if (__isProcessing) { processSaleBtn.disabled = true; return; }
  const { total } = calcTotals();
  const type = getSelectedPaymentType();
  if (type === "cash") {
    const rec = parseFloat(cashReceivedInput?.value) || 0;
    processSaleBtn.disabled = !(rec >= total && total > 0);
  } else if (type === "split") {
    const sum = getSplitSum();
    processSaleBtn.disabled = !(Math.abs(sum - total) < 0.01 && total > 0);
  } else if (String(type).startsWith("mpesa") && __mpesaMode === "stk") {
    const phone = (document.getElementById("mpesa-phone-inline")?.value || document.getElementById("customer-phone")?.value || "").trim();
    processSaleBtn.disabled = !(normalizeKEPhone(phone) && total > 0);
  } else if (String(type).startsWith("mpesa") && __mpesaMode === "code") {
    const code = document.getElementById("mpesa-code-input")?.value?.trim();
    processSaleBtn.disabled = !(code && code.length >= 4 && total > 0);
  } else {
    processSaleBtn.disabled = !(total > 0);
  }
}

function renderCheckoutSummary() {
  const box = document.getElementById("checkout-items");
  if (box) {
    box.innerHTML = cartItems.map((item)=>{
      const t = Number(item.productPrice)*Number(item.quantity);
      return `<div class="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
        <span class="text-slate-700 dark:text-slate-200 font-medium truncate mr-2">${escapeHtml(item.productName)} <span class="text-slate-400 font-normal">× ${item.quantity}</span></span>
        <span class="font-bold text-slate-900 dark:text-white whitespace-nowrap">${formatKES(t)}</span></div>`;
    }).join("") || `<div class="text-center text-slate-400 py-4">Empty</div>`;
  }
  const { subtotal, discount, tax, taxRate, total } = calcTotals();
  const set = (id, v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };
  set("checkout-total", formatKES(total));
  set("checkout-subtotal", formatKES(subtotal));
  set("checkout-discount", `-${formatKES(discount).replace("KES ","KES ")}`);
  set("checkout-tax", formatKES(tax));
  set("checkout-tax-rate", `${taxRate}%`);
  set("pay-amount", formatKES(total));
  set("mpesa-amount-preview", formatKES(total));
  const itemCount = cartItems.reduce((s,i)=> s+Number(i.quantity),0);
  set("checkout-items-count", `${itemCount} ${itemCount===1?"item":"items"}`);
  const saveBadge = document.getElementById("checkout-save-badge");
  if (saveBadge) {
    saveBadge.classList.toggle("hidden", !(discount>0));
    set("checkout-save-amount", formatKES(discount));
  }
  // auto-fill helper amounts (only if empty — don't overwrite cashier typing)
  const mpesaAmt = document.getElementById("mpesa-amount-inline");
  if (mpesaAmt && !mpesaAmt.value) mpesaAmt.value = total.toFixed(2);
  const bankAmt = document.getElementById("bank-amount-inline");
  if (bankAmt) bankAmt.value = total.toFixed(2);
  // cash change live
  const rec = parseFloat(cashReceivedInput?.value) || 0;
  if (cashChangeSpan) cashChangeSpan.textContent = `Change: ${formatKES(Math.max(0, rec - total))}`;
  updateSplitTotalUI();
  updatePayButton();
}
function escapeHtml(s){ return String(s??"").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function normalizeKEPhone(raw){
  if(!raw) return "";
  let p = String(raw).trim().replace(/[\s\-()]/g,"").replace(/^\+/,"");
  if (/^0/.test(p)) p = "254"+p.slice(1);
  if (/^[17]\d{8}$/.test(p)) p = "254"+p;
  if (!/^254[17]\d{8}$/.test(p)) return "";
  return p;
}

// Process online payment (card, mobile money, paypal, m-pesa)
async function processOnlinePayment(paymentType, config, amount, customerPhone = "") {
  return new Promise((resolve, reject) => {
    // Create payment processing modal
    const modal = document.createElement("div");
    modal.id = "payment-processing-modal";
    modal.className = "fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4";
    
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

// === Inline payment helpers (no second modal — everything stays in checkout) ===
function showMpesaStatus(text, pct){
  const box = document.getElementById("mpesa-status");
  if (!box) return;
  box.classList.remove("hidden");
  const t = document.getElementById("mpesa-status-text");
  if (t) t.textContent = text;
  const p = document.getElementById("mpesa-progress");
  if (p && pct != null) p.style.width = pct + "%";
}
function hideMpesaStatus(){
  document.getElementById("mpesa-status")?.classList.add("hidden");
}
function getSplitSum(){
  return [...document.querySelectorAll("#split-rows input[data-split-amount]")]
    .reduce((s,i)=> s + (parseFloat(i.value)||0), 0);
}
function updateSplitTotalUI(){
  const el = document.getElementById("split-total");
  if (!el) return;
  const { total } = calcTotals();
  el.textContent = `${formatKES(getSplitSum())} / ${formatKES(total)}`;
}
function addSplitRow(method, amount){
  const rows = document.getElementById("split-rows");
  if (!rows) return;
  const { total } = calcTotals();
  const row = document.createElement("div");
  row.className = "flex gap-2";
  row.innerHTML = `
    <select data-split-method class="px-2 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold">
      <option value="cash"${method==="cash"?" selected":""}>Cash</option>
      <option value="mpesa_stk"${String(method).startsWith("mpesa")?" selected":""}>M-Pesa</option>
      <option value="card"${method==="card"?" selected":""}>Card</option>
      <option value="bank"${method==="bank"?" selected":""}>Bank</option>
    </select>
    <input data-split-amount type="number" min="0" step="0.01" placeholder="0.00" value="${amount ?? ""}"
      class="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold" />
    <button type="button" data-split-remove class="px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-500">✕</button>`;
  rows.appendChild(row);
  row.querySelector("[data-split-amount]").addEventListener("input", ()=>{ updateSplitTotalUI(); updatePayButton(); });
  row.querySelector("[data-split-method]").addEventListener("change", updatePayButton);
  row.querySelector("[data-split-remove]").addEventListener("click", ()=>{ row.remove(); updateSplitTotalUI(); updatePayButton(); });
  updateSplitTotalUI(); updatePayButton();
}
async function processMpesaInline(paymentType, config, amount){
  // Code mode: just record code, no STK call
  if (__mpesaMode === "code") {
    const code = document.getElementById("mpesa-code-input")?.value?.trim().toUpperCase();
    const phoneRaw = document.getElementById("mpesa-phone-inline")?.value || document.getElementById("customer-phone")?.value || "";
    const phone = normalizeKEPhone(phoneRaw) || phoneRaw.trim();
    if (!code || code.length < 4) throw new Error("Enter the M-Pesa code from customer SMS");
    try {
      await fetch("/api/payments/manual/save", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ phoneNumber: phone || "254700000000", amount: Math.round(amount), paymentType, receiptNumber: code })
      });
    } catch(_) { /* non-blocking: sale still records code */ }
    return { success: true, receiptNumber: code, phoneNumber: phone };
  }
  // STK mode: single phone field, inline progress, real polling
  const phoneRaw = document.getElementById("mpesa-phone-inline")?.value || document.getElementById("customer-phone")?.value || "";
  const phoneNumber = normalizeKEPhone(phoneRaw);
  if (!phoneNumber) throw new Error("Enter valid M-Pesa phone e.g. 2547XXXXXXXX");
  const isC2B = paymentType === "mpesa_till" || paymentType === "mpesa_paybill";
  const endpoint = isC2B ? "/api/payments/mpesa/c2b/initiate" : "/api/payments/mpesa/stkpush";
  showMpesaStatus("Sending STK push to " + phoneNumber + "...", 30);
  // Stored method configs mask secrets as "***MASKED***" - strip them so the
  // backend falls back to env credentials instead of sending the sentinel.
  const cleanConfig = {};
  for (const [k, v] of Object.entries(config?.config || {})) {
    if (v !== "***MASKED***") cleanConfig[k] = v;
  }
  const res = await fetch(endpoint, {
    method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
    body: JSON.stringify({ phoneNumber, amount: Math.round(amount), paymentType, config: cleanConfig })
  });
  const result = await res.json().catch(()=> ({}));
  if (!res.ok || !result.success) throw new Error(result.message || "STK push failed. Try Code instead.");
  if (result.demoMode || result.paymentStatus === "completed" || String(result.checkoutRequestId||"").startsWith("DEMO_")) {
    showMpesaStatus("Payment confirmed ✓", 100);
    return { success: true, phoneNumber, demo: true };
  }
  const cid = result.checkoutRequestId;
  showMpesaStatus("Waiting for customer PIN...", 60);
  const ok = isC2B ? await pollC2BPayment(cid, phoneNumber) : await pollMpesaPayment(cid, phoneNumber, 20);
  if (!ok) throw new Error("Not confirmed yet — ask customer to enter PIN or use Code instead.");
  showMpesaStatus("Payment confirmed ✓", 100);
  return { success: true, phoneNumber, checkoutRequestId: cid };
}
// Legacy second-modal flow kept for compat but no longer used (single-screen checkout uses processMpesaInline)
async function processOnlinePaymentLegacy(){ throw new Error("deprecated"); }

// Function to process sale - express: single POST, idempotent, no second modal
async function processSale(cartItems, total, customerName, paymentMethod) {
  if (!isSubscriptionActive) {
    showSubscriptionInactiveModal();
    return;
  }
  const selectedPaymentInput = document.querySelector('input[name="paymentMethod"]:checked');
  const paymentType = selectedPaymentInput ? selectedPaymentInput.value : "cash";
  const paymentMethodConfig = configuredPaymentMethods.find(m => m.type === paymentType);
  let effectivePaymentMethod = paymentType === "mobile_money" ? "mpesa_stk" : paymentType;
  let mpesaReceipt = "";
  let splitPayments = undefined;

  // Per-method inline verification (stays inside checkout modal)
  if (String(paymentType).startsWith("mpesa")) {
    const r = await processMpesaInline(paymentType, paymentMethodConfig, total);
    mpesaReceipt = r.receiptNumber || r.checkoutRequestId || "";
    if (paymentType === "mobile_money") effectivePaymentMethod = "mpesa_stk";
  }
  if (paymentType === "split") {
    const rows = [...document.querySelectorAll("#split-rows > div")];
    splitPayments = rows.map(r=>({
      method: r.querySelector("[data-split-method]")?.value || "cash",
      amount: parseFloat(r.querySelector("[data-split-amount]")?.value) || 0
    })).filter(s=>s.amount>0);
    const sum = splitPayments.reduce((s,x)=>s+x.amount,0);
    if (Math.abs(sum - total) > 0.01) throw new Error(`Split must sum to ${formatKES(total)} (now ${formatKES(sum)})`);
    effectivePaymentMethod = "split";
  }

  const { discount, taxRate } = calcTotals();
  const customerPhone = document.getElementById("customer-phone")?.value?.trim() || document.getElementById("mpesa-phone-inline")?.value?.trim() || "";
  const customerEmail = document.getElementById("customer-email")?.value?.trim() || "";
  const bankRef = document.getElementById("bank-ref")?.value?.trim() || "";
  const items = cartItems.map((item) => ({
    productId: item._id,
    quantity: item.quantity,
    price: item.productPrice,
  }));

  const storeId = (typeof getSelectedStoreId === 'function' ? getSelectedStoreId() : "") || "";
  const offlineId = `off_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const tenderedRaw = parseFloat(document.getElementById("cash-received")?.value);
  const amountTendered = effectivePaymentMethod === "cash" && isFinite(tenderedRaw) ? tenderedRaw : undefined;
  const changeGiven = amountTendered != null ? Math.max(0, amountTendered - total) : undefined;
  const payload = { items, total, customerName, customerPhone, customerEmail, paymentMethod: effectivePaymentMethod, mpesaReceipt, bankRef, splitPayments, discount, taxRate, amountTendered, changeGiven, store: storeId || undefined, offlineId };

  // if offline, queue instead of failing
  if (!navigator.onLine && window.OfflineSync) {
    window.OfflineSync.queueSale(payload);
    if (window.showToast) window.showToast("Offline — sale queued for sync ("+offlineId+")", "warning");
    return { queued: true, offlineId };
  }

  try {
    const response = await fetch("/processSale", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": offlineId },
      body: JSON.stringify(payload),
      credentials: "include",
    });

    const data = await response.json();
    if (response.ok && data.sale && data.sale._id) {
      // Stored receipt copy lives in DB; open the canonical receipt page
      // (receipt.html loads GET /receipt/:id with real business info).
      // Only auto-open when cashier asked for print, else refresh list silently.
      try { await loadRecentReceipts(); } catch (_) {}
      if (__printAfter) { showReceiptById(data.sale._id); }
      return data;
    } else {
      throw new Error(data.message || "Sale failed");
    }
  } catch (error) {
    console.error("Error processing sale:", error);
    throw error; // Re-throw to be caught by the form submit handler
  }
}

// Canonical receipt view: single source of truth is the STORED copy
// (GET /receipt/:id). Opens receipt.html which renders real business info,
// cashier, time and receipt number. Keeps accountability + reprint.
function showReceiptById(saleId) {
  window.open(`/receipt.html?saleId=${encodeURIComponent(saleId)}`, "_blank", "width=420,height=700");
}
async function showReceipt(sale) {
  if (sale && (sale._id || sale._id === 0)) { showReceiptById(sale._id); return; }
  if (typeof sale === "string") { showReceiptById(sale); return; }
  // legacy fallback below is deprecated (kept for compat, not used)
  // Fetch settings
  const settingsRes = await fetch("/api/settings", { credentials: "include" });
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

// Express submit: 1 tap Pay, guarded against double-click, safe defaults
checkoutForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (__isProcessing) return;
  const nameEl = document.getElementById("customer-name");
  const customerName = (nameEl?.value?.trim() || "Walk-in");
  const paymentMethod = getSelectedPaymentType();
  const { total } = calcTotals();
  if (!(total > 0)) { showToast("Cart total is zero.", "error"); return; }

  // Fast client-side guards (server re-validates stock + totals)
  if (paymentMethod === "cash") {
    const received = parseFloat(cashReceivedInput?.value) || 0;
    if (received < total) { showToast(`Need ${formatKES(total)} — received ${formatKES(received)}. Tap Exact.`, "error"); cashReceivedInput?.focus(); return; }
  }
  if (String(paymentMethod).startsWith("mpesa") && __mpesaMode === "stk") {
    const phone = normalizeKEPhone(document.getElementById("mpesa-phone-inline")?.value || document.getElementById("customer-phone")?.value || "");
    if (!phone) { showToast("Enter M-Pesa phone 2547XXXXXXXX", "error"); document.getElementById("mpesa-phone-inline")?.focus(); return; }
  }
  if (String(paymentMethod).startsWith("mpesa") && __mpesaMode === "code") {
    if (!document.getElementById("mpesa-code-input")?.value?.trim()) { showToast("Enter M-Pesa code", "error"); return; }
  }
  if (paymentMethod === "split") {
    if (Math.abs(getSplitSum() - total) > 0.01) { showToast(`Split must equal ${formatKES(total)}. Tap Auto-split.`, "error"); return; }
  }

  __isProcessing = true;
  __printAfter = document.getElementById("print-receipt-check")?.checked || __printAfter;
  processSaleBtn.disabled = true;
  document.getElementById("pay-spinner")?.classList.remove("hidden");
  try {
    const response = await processSale(cartItems, total, customerName, paymentMethod);
    localStorage.setItem("lastPaymentMethod", paymentMethod);
    if (response?.queued) {
      showToast("Offline — sale queued, will sync.", "warning");
    } else {
      showToast("Sale complete ✓ Change: " + formatKES(Math.max(0, (parseFloat(cashReceivedInput?.value)||total) - total)), "success");
    }
    cartItems = [];
    // keep customer Walk-in for next sale, clear tendered/code/ref but keep method memory
    if (cashReceivedInput) cashReceivedInput.value = "";
    const mc = document.getElementById("mpesa-code-input"); if (mc) mc.value = "";
    const br = document.getElementById("bank-ref"); if (br) br.value = "";
    document.getElementById("discount-input") && (document.getElementById("discount-input").value = "");
    hideMpesaStatus();
    loadProductsForSale();
    renderCart();
    renderCheckoutSummary();
    closeCheckoutModalUnsafe();
    // Print only if asked (was 2 buttons before — now 1 checkbox)
    if (__printAfter && response?.sale?._id) {
      __printAfter = false;
      const chk = document.getElementById("print-receipt-check"); if (chk) chk.checked = false;
      try {
        if (window.printSaleReceipt) await window.printSaleReceipt(response.sale._id);
        else showReceiptById(response.sale._id);
      } catch(_){}
    }
  } catch (error) {
    hideMpesaStatus();
    const msg = error?.message || "Payment failed";
    if (msg.toLowerCase().includes("cancelled")) showToast("Payment cancelled.", "warning");
    else showToast(msg, "error");
    console.error("Sale processing error:", error);
  } finally {
    __isProcessing = false;
    document.getElementById("pay-spinner")?.classList.add("hidden");
    updatePayButton();
  }
});
function closeCheckoutModalUnsafe(){ __isProcessing = false; checkoutModal.classList.add("hidden"); hideMpesaStatus(); updatePayButton(); }

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

function shortPayLabel(t){
  const m = { cash:"Cash", mpesa_stk:"M-Pesa", mpesa_till:"M-Pesa", mpesa_paybill:"M-Pesa", mobile_money:"M-Pesa", card:"Card", paystack:"Card", bank:"Bank", split:"Split", paypal:"Card" };
  return m[t] || t;
}
function renderPaymentMethods() {
  const container = document.getElementById("payment-methods-container");
  if (!container) return;
  // Collapse to 5 express choices max (faster than full settings list)
  const order = ["cash","mpesa_stk","mobile_money","mpesa_till","mpesa_paybill","card","paystack","bank","split"];
  const seen = new Set();
  const express = [];
  for (const t of order) {
    const found = configuredPaymentMethods.find(m=>m.type===t);
    if (found && !seen.has(shortPayLabel(t))) { express.push(found); seen.add(shortPayLabel(t)); }
  }
  if (!express.find(m=>m.type==="cash")) express.unshift({ type:"cash", label:"Cash", icon:"fa-money-bill-wave", color:"text-green-500" });
  if (!express.find(m=>shortPayLabel(m.type)==="M-Pesa")) express.splice(1,0,{ type:"mpesa_stk", label:"M-Pesa", icon:"fa-mobile-alt", color:"text-purple-500" });
  if (!express.find(m=>shortPayLabel(m.type)==="Card")) express.push({ type:"card", label:"Card", icon:"fa-credit-card", color:"text-blue-500" });
  if (!express.find(m=>shortPayLabel(m.type)==="Bank")) express.push({ type:"bank", label:"Bank", icon:"fa-university", color:"text-gray-500" });
  const trimmed = express.slice(0,5);
  // ensure split toggle exists as small link (not a big tile) — keep backend compat
  if (!configuredPaymentMethods.find(m=>m.type==="split")) configuredPaymentMethods.push({ type:"split", label:"Split", icon:"fa-columns", color:"text-violet-500" });

  container.innerHTML = trimmed.map((method) => {
    const short = shortPayLabel(method.type);
    const val = method.type === "card" || short==="Card" ? (configuredPaymentMethods.find(m=>m.type===method.type)?.type || "card")
      : short==="M-Pesa" ? (configuredPaymentMethods.find(m=>String(m.type).startsWith("mpesa"))?.type || "mpesa_stk")
      : short==="Bank" ? "bank" : short==="Cash" ? "cash" : method.type;
    const icon = method.icon || (short==="Cash"?"fa-money-bill-wave":short==="M-Pesa"?"fa-mobile-alt":short==="Card"?"fa-credit-card":"fa-university");
    return `
    <label class="cursor-pointer">
      <input type="radio" name="paymentMethod" value="${val}" class="peer hidden" id="payment-${val}">
      <div class="flex flex-col items-center justify-center py-3 px-1 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 peer-checked:border-emerald-500 peer-checked:bg-emerald-50 dark:peer-checked:bg-emerald-900/20 transition-all hover:border-slate-300">
        <i class="fas ${icon} text-xl mb-1"></i>
        <span class="text-xs font-black">${short}</span>
      </div>
    </label>`;
  }).join("") + `
    <button type="button" id="split-toggle-link" class="col-span-full text-[11px] text-violet-600 dark:text-violet-400 font-bold hover:underline py-1">Need split? Tap for Cash + M-Pesa →</button>`;

  document.querySelectorAll('input[name="paymentMethod"]').forEach((radio) => {
    radio.addEventListener("change", handlePaymentMethodChange);
  });
  document.getElementById("split-toggle-link")?.addEventListener("click", ()=> setPaymentMethod("split"));

  const last = localStorage.getItem("lastPaymentMethod") || "cash";
  const pick = container.querySelector(`input[value="${last}"]`) || container.querySelector('input[value="cash"]') || container.querySelector('input');
  if (pick) { pick.checked = true; }
}
function setPaymentMethod(type, opts={}){
  let radio = document.querySelector(`input[name="paymentMethod"][value="${type}"]`);
  if (!radio && type === "split") {
    // inject split radio if express tiles trimmed it
    const c = document.getElementById("payment-methods-container");
    if (c && !c.querySelector('input[value="split"]')) {
      const lab = document.createElement("label");
      lab.className = "hidden";
      lab.innerHTML = `<input type="radio" name="paymentMethod" value="split" class="peer hidden"><div></div>`;
      c.appendChild(lab);
      lab.querySelector("input").addEventListener("change", handlePaymentMethodChange);
    }
    radio = document.querySelector('input[name="paymentMethod"][value="split"]');
  }
  if (!radio) radio = document.querySelector('input[name="paymentMethod"]');
  if (radio) { radio.checked = true; handlePaymentMethodChange({ target: radio, silent: opts.silentToast }); }
}

function handlePaymentMethodChange(event) {
  const val = event.target.value;
  const silent = event.silent;
  const cashSec = document.getElementById("cash-payment-section");
  const mpesaSec = document.getElementById("mpesa-section");
  const bankSec = document.getElementById("bank-section");
  const splitSec = document.getElementById("split-payment-section");

  // Soft tier guard: warn once, fall back to cash (safety without blocking flow)
  const plan = __salesContext.plan;
  const feat = (k)=> plan?.features?.[k] ?? plan?.features?.get?.(k);
  const needUpgrade =
    ((val==="bank"||val==="split") && plan && !feat("bankPayments")) ? "Bank/Split needs Premium — using Cash for now"
    : ((val==="card"||val==="paystack") && plan && !feat("cardPayments") && !feat("bankPayments")) ? "Card needs Standard+ — using Cash for now"
    : (String(val).startsWith("mpesa") && String(val)!=="mobile_money" && plan && !feat("mpesa") && !feat("mobileMoney")) ? "M-Pesa not on your plan — using Cash for now"
    : "";
  if (needUpgrade) {
    if (!silent && window.showToast) showToast(needUpgrade, "warning");
    if (plan && (val==="bank"||val==="split"||val==="card"||String(val).startsWith("mpesa"))) {
      // only downgrade if plan is known and blocks; otherwise allow (e.g. plan not loaded yet)
      const hasAnyBlock = (val==="bank"||val==="split") ? !feat("bankPayments") : true;
      if (hasAnyBlock && plan?.name && plan.name !== "Trial") {
        event.target.checked = false;
        const c = document.querySelector('input[name="paymentMethod"][value="cash"]');
        if (c) { c.checked = true; return handlePaymentMethodChange({ target: c, silent: true }); }
      }
    }
  }

  if(cashSec) cashSec.classList.add("hidden");
  if(mpesaSec) mpesaSec.classList.add("hidden");
  if(bankSec) bankSec.classList.add("hidden");
  if(splitSec) splitSec.classList.add("hidden");
  hideMpesaStatus();

  const { total } = calcTotals();
  if (val === "cash") {
    cashSec?.classList.remove("hidden");
    if (cashReceivedInput && !cashReceivedInput.value) { /* leave empty — Exact is 1 tap */ }
  } else if (val === "split") {
    splitSec?.classList.remove("hidden");
    const rows = document.getElementById("split-rows");
    if (rows && !rows.children.length) { addSplitRow("cash", total.toFixed(2)); addSplitRow("mpesa_stk", ""); }
    updateSplitTotalUI();
  } else if (String(val).startsWith("mpesa") || val === "mobile_money") {
    mpesaSec?.classList.remove("hidden");
    applyMpesaModeUI();
    // sync phone + amount so cashier types once
    const custPhone = document.getElementById("customer-phone")?.value || "";
    const inline = document.getElementById("mpesa-phone-inline");
    if (inline && !inline.value && custPhone) inline.value = custPhone;
    const preview = document.getElementById("mpesa-amount-preview");
    if (preview) preview.textContent = formatKES(total);
    const amtInline = document.getElementById("mpesa-amount-inline");
    if (amtInline && !amtInline.value) amtInline.value = total.toFixed(2);
  } else {
    // card / bank / paystack: single optional ref, Pay immediately
    bankSec?.classList.remove("hidden");
    const lbl = bankSec?.querySelector("label");
    if (lbl) lbl.innerHTML = `<i class="fas fa-credit-card mr-1"></i> ${escapeHtml(val)} ref <span class="font-normal normal-case">(optional — tap Pay)</span>`;
  }
  renderCheckoutSummary();
  // focus next input for speed
  if (val === "cash") setTimeout(()=> cashReceivedInput?.focus(), 60);
}
function applyMpesaModeUI(){
  const stk = document.getElementById("mpesa-stk-fields");
  const code = document.getElementById("mpesa-code-fields");
  const bStk = document.getElementById("mpesa-mode-stk");
  const bCode = document.getElementById("mpesa-mode-code");
  const isCode = __mpesaMode === "code";
  stk?.classList.toggle("hidden", isCode);
  code?.classList.toggle("hidden", !isCode);
  if (bStk) bStk.className = "flex-1 py-2 rounded-lg text-xs font-black " + (!isCode ? "bg-violet-600 text-white" : "text-slate-500");
  if (bCode) bCode.className = "flex-1 py-2 rounded-lg text-xs font-bold " + (isCode ? "bg-violet-600 text-white" : "text-slate-500");
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
  initExpressCheckoutWiring();
  initReceiptsFilterWiring();
  loadRecentReceipts();
  document.getElementById("refresh-receipts-btn")?.addEventListener("click", loadRecentReceipts);

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

// === Stored receipts: date-sortable + grouped by day (no more one large table) ===
const receiptsFilter = { range: "today", from: "", to: "", sort: "newest" };
function receiptsRangeToDates(){
  const d = new Date();
  const iso = (x)=> x.toISOString().slice(0,10);
  if (receiptsFilter.range === "today") { const t = iso(d); return { from: t, to: t }; }
  if (receiptsFilter.range === "yesterday") { const y = new Date(d); y.setDate(y.getDate()-1); const t = iso(y); return { from: t, to: t }; }
  if (receiptsFilter.range === "week") { const w = new Date(d); w.setDate(w.getDate()-6); return { from: iso(w), to: iso(d) }; }
  if (receiptsFilter.range === "month") { const m = new Date(d.getFullYear(), d.getMonth(), 1); return { from: iso(m), to: iso(d) }; }
  return { from: receiptsFilter.from || "", to: receiptsFilter.to || "" }; // all / custom
}
async function loadRecentReceipts(){
  const box = document.getElementById("recent-receipts");
  if (!box) return;
  const { from, to } = receiptsRangeToDates();
  const sort = receiptsFilter.sort || "newest";
  box.innerHTML = `<div class="py-4 text-center text-slate-400"><i class="fas fa-spinner fa-spin mr-1"></i>Loading receipts…</div>`;
  try {
    const params = new URLSearchParams({ limit: "300", sort });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`/getSales?${params}`, { credentials: "include" });
    if (!res.ok) throw new Error("load failed");
    const data = await res.json();
    let sales = data.sales || [];
    // client fallback filter (if server ignores params on old deploy)
    if (from || to) {
      const f = from ? new Date(from + "T00:00:00") : null;
      const t = to ? new Date(to + "T23:59:59") : null;
      sales = sales.filter(s=>{ const c = new Date(s.createdAt); return (!f || c >= f) && (!t || c <= t); });
    }
    sales.sort((a,b)=> sort === "oldest" ? new Date(a.createdAt)-new Date(b.createdAt) : new Date(b.createdAt)-new Date(a.createdAt));
    const countEl = document.getElementById("receipts-count");
    const grand = sales.reduce((s,x)=> s + Number(x.total||0), 0);
    if (countEl) countEl.textContent = `${sales.length} receipt${sales.length===1?"":"s"} • KES ${grand.toFixed(2)}${from||to ? ` • ${from||"…"} → ${to||"…"}` : ""}`;
    if (!sales.length) {
      box.innerHTML = `<div class="py-4 text-center text-slate-400">No receipts in this period — try another date.</div>`;
      return;
    }
    // Group by day so long lists stay scannable
    const groups = {};
    sales.forEach(s=>{ const k = new Date(s.createdAt).toLocaleDateString("en-KE", { weekday:"short", year:"numeric", month:"short", day:"numeric" }); (groups[k] = groups[k] || []).push(s); });
    box.innerHTML = Object.entries(groups).map(([day, rows])=>{
      const dayTotal = rows.reduce((s,x)=> s + Number(x.total||0), 0);
      return `<div class="mb-3 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div class="px-3 py-2 bg-slate-50 dark:bg-slate-800 flex justify-between text-xs font-black text-slate-500 uppercase tracking-wide">
          <span>${escHtml(day)} • ${rows.length} sale${rows.length===1?"":"s"}</span><span>KES ${dayTotal.toFixed(2)}</span>
        </div>
        <div class="divide-y divide-slate-100 dark:divide-slate-800">${rows.map(s=>{
          const cashier = s.cashierName || s.cashier?.name || s.cashier?.email || "Staff";
          const receiptNo = s.receiptNo || "";
          const when = new Date(s.createdAt).toLocaleTimeString("en-KE", { hour:"2-digit", minute:"2-digit" });
          return `<div class="px-3 py-2 flex items-center gap-3">
            <div class="min-w-0 flex-1">
              <div class="font-bold text-slate-800 dark:text-slate-100 truncate">${escHtml(receiptNo)} <span class="font-normal text-slate-400">• ${escHtml(when)}</span></div>
              <div class="text-xs text-slate-400 truncate">${escHtml(s.customerName||"Walk-in")} • Served by ${escHtml(cashier)} • ${escHtml(s.paymentMethod||"cash")}</div>
            </div>
            <div class="font-black whitespace-nowrap">KES ${Number(s.total||0).toFixed(2)}</div>
            <button class="text-xs px-2.5 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold" onclick="showReceiptById('${s._id}')"><i class="fas fa-print mr-1"></i>Reprint</button>
          </div>`;
        }).join("")}</div>
      </div>`;
    }).join("");
  } catch (e) {
    box.innerHTML = `<div class="py-4 text-center text-slate-400">Could not load receipts.</div>`;
  }
}
function initReceiptsFilterWiring(){
  const presets = document.getElementById("receipts-presets");
  const activeCls = ["bg-slate-900","dark:bg-white","text-white","dark:text-slate-900"];
  presets?.querySelectorAll("button").forEach(b=>{
    b.addEventListener("click", ()=>{
      receiptsFilter.range = b.dataset.range;
      receiptsFilter.from = ""; receiptsFilter.to = "";
      document.getElementById("receipts-from").value = "";
      document.getElementById("receipts-to").value = "";
      presets.querySelectorAll("button").forEach(x=> x.className = "px-2.5 py-1.5 rounded-lg font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800");
      b.className = "px-2.5 py-1.5 rounded-lg font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900";
      loadRecentReceipts();
    });
  });
  const syncCustom = ()=>{
    receiptsFilter.from = document.getElementById("receipts-from")?.value || "";
    receiptsFilter.to = document.getElementById("receipts-to")?.value || "";
    if (receiptsFilter.from || receiptsFilter.to) receiptsFilter.range = "custom";
    loadRecentReceipts();
  };
  document.getElementById("receipts-from")?.addEventListener("change", syncCustom);
  document.getElementById("receipts-to")?.addEventListener("change", syncCustom);
  document.getElementById("receipts-sort")?.addEventListener("change", (e)=>{ receiptsFilter.sort = e.target.value; loadRecentReceipts(); });
}
function escHtml(s){ return String(s??"").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

// === Express wiring: every control that was dead now works, totals stay in sync ===
function initExpressCheckoutWiring(){
  // Cash tendered live
  document.getElementById("cash-received")?.addEventListener("input", ()=>{
    const { total } = calcTotals();
    const rec = parseFloat(document.getElementById("cash-received").value) || 0;
    const cc = document.getElementById("cash-change");
    if (cc) cc.textContent = `Change: ${formatKES(Math.max(0, rec - total))}`;
    updatePayButton();
  });
  // Quick cash: Exact = 1 tap pay-ready; +N tops up
  document.querySelectorAll(".cash-quick").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const { total } = calcTotals();
      const input = document.getElementById("cash-received");
      if (!input) return;
      const kind = btn.dataset.cash;
      if (kind === "exact") input.value = total.toFixed(2);
      else {
        const cur = parseFloat(input.value) || 0;
        const base = cur > 0 ? cur : total;
        input.value = (base + Number(kind)).toFixed(2);
        if (cur === 0) input.value = (total + Number(kind)).toFixed(2);
      }
      input.dispatchEvent(new Event("input"));
      updatePayButton();
    });
  });
  // Customer shortcuts
  document.getElementById("customer-walkin")?.addEventListener("click", ()=>{
    document.getElementById("customer-name").value = "Walk-in";
  });
  document.getElementById("customer-clear")?.addEventListener("click", ()=>{
    document.getElementById("customer-name").value = "";
    document.getElementById("customer-name")?.focus();
  });
  // Phone sync: type once, works for STK
  const custPhone = document.getElementById("customer-phone");
  const inlinePhone = document.getElementById("mpesa-phone-inline");
  custPhone?.addEventListener("input", ()=>{ if (inlinePhone && !document.activeElement?.isSameNode(inlinePhone)) inlinePhone.value = custPhone.value; updatePayButton(); });
  inlinePhone?.addEventListener("input", ()=>{ if (custPhone && !document.activeElement?.isSameNode(custPhone)) custPhone.value = inlinePhone.value; updatePayButton(); });
  document.getElementById("mpesa-code-input")?.addEventListener("input", updatePayButton);
  // Discount live recalc (collapsed, optional)
  document.getElementById("discount-input")?.addEventListener("input", renderCheckoutSummary);
  document.getElementById("discount-type")?.addEventListener("change", renderCheckoutSummary);
  // M-Pesa mode toggle
  document.querySelectorAll("[data-mpesa-mode]").forEach(b=>{
    b.addEventListener("click", ()=>{
      __mpesaMode = b.dataset.mpesaMode;
      applyMpesaModeUI();
      updatePayButton();
      if (__mpesaMode === "stk") document.getElementById("mpesa-phone-inline")?.focus();
      else document.getElementById("mpesa-code-input")?.focus();
    });
  });
  // Split controls
  document.getElementById("add-split")?.addEventListener("click", ()=> addSplitRow("cash", ""));
  document.getElementById("split-auto")?.addEventListener("click", ()=>{
    const { total } = calcTotals();
    const rows = [...document.querySelectorAll("#split-rows > div")];
    if (!rows.length) { addSplitRow("cash", total.toFixed(2)); return; }
    const sumOthers = rows.slice(0, -1).reduce((s,r)=> s + (parseFloat(r.querySelector("[data-split-amount]")?.value)||0), 0);
    const last = rows[rows.length-1].querySelector("[data-split-amount]");
    if (last) last.value = Math.max(0, total - sumOthers).toFixed(2);
    updateSplitTotalUI(); updatePayButton();
  });
  // Items toggle
  document.getElementById("checkout-items-toggle")?.addEventListener("click", ()=>{
    document.getElementById("checkout-items-wrap")?.classList.toggle("hidden");
  });
  // Pay & Print compat: old second button now just arms print checkbox + submits
  document.getElementById("process-print-btn")?.addEventListener("click", ()=>{
    __printAfter = true;
    const chk = document.getElementById("print-receipt-check"); if (chk) chk.checked = true;
    document.getElementById("checkout-form")?.requestSubmit();
  });
  window.addEventListener("online", ()=> document.getElementById("offline-queue-note")?.classList.add("hidden"));
  window.addEventListener("offline", ()=> document.getElementById("offline-queue-note")?.classList.remove("hidden"));
}

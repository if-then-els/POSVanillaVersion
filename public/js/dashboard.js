/**
 * Dashboard - SwiftPOS Enterprise
 * Fixed for new dashboard.html (total-sales, total-orders, total-products, low-stock-items, transactions-table)
 * Tenant-scoped, credentials:include, subscription-aware, tier-aware
 */

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(Number(amount) || 0);
}

function getCookie(name) {
  const m = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : null;
}

function checkAuth() {
  const token = localStorage.getItem("token") || getCookie("token");
  if (!token) {
    // let backend handle redirect via 401, but also guard
    console.warn("No token found, redirecting to login");
    // window.location.href = "/login.html"; // leave to server 401 toast
    return false;
  }
  return true;
}

async function fetchAuth(url, opts = {}) {
  const res = await fetch(url, { credentials: "include", headers: { "Content-Type": "application/json", ...(opts.headers || {}) }, ...opts });
  if (res.status === 401 || res.status === 403) {
    const txt = await res.text();
    // show subscription modal if 403 from subscriptionMiddleware
    if (res.status === 403 && txt.includes("Subscription")) {
      const modal = document.getElementById("subscription-inactive-modal");
      if (modal) modal.classList.remove("hidden");
    }
    throw new Error(txt.slice(0,200));
  }
  return res;
}

async function loadDashboardData() {
  // Inventory: total-products + low-stock-items
  try {
    const res = await fetchAuth("/getInventory");
    if (res.status === 404) {
      document.getElementById("total-products").textContent = "0";
      document.getElementById("low-stock-items").textContent = "0";
      return;
    }
    const data = await res.json();
    const inventory = data.products || [];
    const totalProductsEl = document.getElementById("total-products");
    const lowStockEl = document.getElementById("low-stock-items");
    if (totalProductsEl) totalProductsEl.textContent = String(inventory.length);
    if (lowStockEl) {
      const low = inventory.filter(p => Number(p.productQuantity) <= Number(p.reorderLevel ?? 10)).length;
      lowStockEl.textContent = String(low);
    }
  } catch (e) {
    console.error("loadDashboardData inventory", e.message);
    const tp = document.getElementById("total-products");
    const ls = document.getElementById("low-stock-items");
    if (tp) tp.textContent = "—";
    if (ls) ls.textContent = "—";
  }

  // Sales amount + total orders (parallel)
  try {
    const [salesRes, ordersRes] = await Promise.all([
      fetchAuth("/salesAmount").then(r => r.json().catch(()=>({}))),
      fetchAuth("/getTotalOrders").then(r => r.json().catch(()=>({})))
    ]);
    const totalSalesEl = document.getElementById("total-sales");
    if (totalSalesEl) {
      // salesAmount returns {totalAmount}
      const amount = salesRes.totalAmount ?? salesRes.total ?? 0;
      totalSalesEl.textContent = formatCurrency(amount);
    }
    const totalOrdersEl = document.getElementById("total-orders");
    if (totalOrdersEl) totalOrdersEl.textContent = String(ordersRes.totalOrders ?? 0);
  } catch (e) {
    console.error("loadDashboardData sales", e.message);
  }
}

async function loadRecentTransactions() {
  const tbody = document.getElementById("transactions-table");
  if (!tbody) return;
  try {
    const res = await fetchAuth("/getSales");
    const data = await res.json();
    const sales = data.sales || data.transactions || [];
    if (!sales.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400">No transactions yet — make your first sale in <a href="/sales.html" class="text-violet-500 underline">Sales</a></td></tr>`;
      return;
    }
    // only last 5
    tbody.innerHTML = sales.slice(0,8).map(tx => `
      <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50">
        <td class="p-4 font-mono text-xs">${String(tx._id).slice(-6).toUpperCase()}</td>
        <td class="p-4">${tx.customerName || "Walk-in"}</td>
        <td class="p-4 font-semibold">${formatCurrency(tx.total)}</td>
        <td class="p-4 text-xs text-slate-500">${new Date(tx.createdAt || tx.date).toLocaleDateString()}</td>
        <td class="p-4"><span class="px-2 py-1 rounded-full text-xs font-bold ${String(tx.paymentMethod).toLowerCase().includes('cash') ? 'bg-emerald-500/20 text-emerald-600' : 'bg-violet-500/20 text-violet-600'}">${tx.paymentMethod || "cash"}</span></td>
      </tr>
    `).join("");
  } catch (e) {
    console.error("loadRecentTransactions", e.message);
    tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-red-400 text-sm">Failed to load transactions (${e.message.slice(0,80)})</td></tr>`;
  }
}

// Export CSV via sales data
async function exportTransactionsCSV() {
  try {
    const res = await fetchAuth("/getSales");
    const data = await res.json();
    const sales = data.sales || [];
    if (!sales.length) { if(window.showToast) showToast("No transactions to export","info"); return; }
    const header = ["ID","Customer","Amount","Date","Payment"];
    const rows = sales.map(s => [s._id, s.customerName||"Walk-in", s.total, new Date(s.createdAt).toLocaleDateString(), s.paymentMethod]);
    const csv = [header, ...rows].map(r => r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="transactions.csv"; a.click(); URL.revokeObjectURL(url);
    if(window.showToast) showToast("CSV exported","success");
  } catch(e){ console.error(e); if(window.showToast) showToast("Export failed","error"); }
}

document.addEventListener("DOMContentLoaded", () => {
  // hook export button
  const exportBtn = document.querySelector('button:has(> i.fa-download), button');
  // more precise: button inside recent transactions card
  const exportBtn2 = document.querySelector(".glass-premium button");
  if (exportBtn2 && exportBtn2.textContent.includes("Export")) exportBtn2.addEventListener("click", exportTransactionsCSV);

  // Also support data-export attr
  document.querySelectorAll("[data-export='csv']").forEach(b=> b.addEventListener("click", exportTransactionsCSV));

  // Auth check (soft)
  checkAuth();

  // Load data (with slight delay to allow auth cookie)
  loadDashboardData();
  loadRecentTransactions();

  // Live refresh every 30s
  setInterval(()=>{ loadDashboardData(); loadRecentTransactions(); }, 30000);

  // Tab handling (if any tabs exist)
  document.querySelectorAll(".tab-button").forEach(btn=>{
    btn.addEventListener("click",()=>{
      document.querySelectorAll(".tab-button").forEach(b=>{b.classList.remove("active"); b.classList.add("text-gray-500");});
      btn.classList.add("active"); btn.classList.remove("text-gray-500");
      document.querySelectorAll(".tab-content").forEach(c=>c.classList.add("hidden"));
      const id = btn.id.replace("tab-","")+"-content";
      const el = document.getElementById(id);
      if(el) el.classList.remove("hidden");
    });
  });
});

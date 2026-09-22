// Comprehensive reports — one filter state drives every section.
let salesChartInstance = null;
let productSalesChartInstance = null;
let categorySalesChartInstance = null;
let userChartInstance = null;
let itemChartInstance = null;
let paymentsChartInstance = null;
let hourlyChartInstance = null;

const RF = { preset: "last30", from: "", to: "", store: "" };

function rfQuery(extra = {}) {
  const p = new URLSearchParams();
  if (RF.from && RF.to) { p.set("from", RF.from); p.set("to", RF.to); }
  else if (RF.preset !== "last30") p.set("preset", RF.preset);
  else { p.set("preset", "last30"); }
  if (RF.store) p.set("store", RF.store);
  Object.entries(extra).forEach(([k, v]) => p.set(k, v));
  return p.toString();
}
function getAuthToken() {
  try {
    const ls = localStorage.getItem("token");
    if (ls) return ls;
  } catch (_) {}
  const m = document.cookie.match(/(^| )token=([^;]+)/);
  return m ? decodeURIComponent(m[2]) : "";
}
function authHeaders() {
  const t = getAuthToken();
  return t ? { Authorization: "Bearer " + t } : {};
}
async function rfFetch(path, extra = {}) {
  const qs = rfQuery(extra);
  const r = await fetch(`${path}?${qs}`, { credentials: "include", headers: { ...authHeaders() } });
  if (r.status === 401) throw Object.assign(new Error("Session expired — please log in again."), { status: 401, auth: true });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw Object.assign(new Error(e.message || `HTTP ${r.status}`), { status: r.status, upgrade: e.upgradeRequired });
  }
  return r.json();
}
// ---- visible section states (never leave "Loading…" stuck) ----
function sectionError(tbodyId, err, cols, retryFn) {
  const el = document.getElementById(tbodyId);
  if (!el) return;
  if (err && err.auth) {
    el.innerHTML = `<tr><td colspan="${cols}" class="px-6 py-8 text-center text-sm"><span class="text-red-400 font-bold">🔒 ${err.message}</span> <a href="/login.html" class="underline font-bold text-accent-500">Log in</a></td></tr>`;
    return;
  }
  if (err && (err.status === 403 || err.upgrade)) {
    el.innerHTML = `<tr><td colspan="${cols}" class="px-6 py-8 text-center text-amber-500 text-sm">🔒 ${err.message || "Upgrade plan for this report."} <a href="/manageSubscriptions.html" class="underline font-bold">Upgrade</a></td></tr>`;
    return;
  }
  el.innerHTML = `<tr><td colspan="${cols}" class="px-6 py-8 text-center text-sm text-red-400">⚠️ ${err?.message || "Failed to load."} <button data-retry class="ml-2 underline font-bold text-accent-500">Retry</button></td></tr>`;
  el.querySelector("[data-retry]")?.addEventListener("click", () => retryFn && retryFn());
}
function sectionEmpty(tbodyId, cols, msg) {
  const el = document.getElementById(tbodyId);
  if (el) el.innerHTML = `<tr><td colspan="${cols}" class="px-6 py-8 text-center text-gray-500 text-sm">${msg} <button data-reset-range class="underline font-bold text-accent-500">Show last 30 days</button></td></tr>`;
  document.querySelectorAll("[data-reset-range]").forEach(b => b.addEventListener("click", resetRange));
}
function resetRange() {
  RF.preset = "last30"; RF.from = ""; RF.to = "";
  const f = document.getElementById("report-from"), t = document.getElementById("report-to");
  if (f) f.value = ""; if (t) t.value = "";
  loadAll();
}
function setBanner(text, isErr) {
  const lbl = document.getElementById("report-range-label");
  if (lbl) { lbl.textContent = text; lbl.className = isErr ? "text-xs text-red-400 ml-auto font-bold" : "text-xs text-primary-400 ml-auto"; }
}
function needChart(ctxId) {
  if (typeof Chart === "undefined") {
    const c = document.getElementById(ctxId);
    if (c && c.parentElement) c.parentElement.innerHTML = `<div class="h-full flex items-center justify-center text-xs text-amber-500 text-center p-4">📊 Charts unavailable (chart library blocked offline). Tables below still work.</div>`;
    return null;
  }
  return document.getElementById(ctxId)?.getContext("2d") || null;
}
const kes = (n) => `KES ${Number(n || 0).toFixed(2)}`;
const num = (n) => Number(n || 0).toLocaleString();
function deltaHTML(d) {
  if (d == null || isNaN(d)) return "";
  const up = d >= 0;
  return `<span class="${up ? "text-emerald-500" : "text-red-500"}">${up ? "▲" : "▼"} ${Math.abs(d)}% vs prev</span>`;
}
function tierNote(el, err) {
  if (el && err && (err.status === 403 || err.upgrade)) {
    el.innerHTML = `<tr><td colspan="8" class="px-6 py-8 text-center text-amber-500 text-sm">🔒 ${err.message || "Upgrade plan for this report."} <a href="/manageSubscriptions.html" class="underline font-bold">Upgrade</a></td></tr>`;
    return true;
  }
  return false;
}

document.addEventListener("DOMContentLoaded", () => {
  if (typeof loadSidebar === "function") loadSidebar();
  wireFilters();
  loadStores();
  loadAll();

  document.getElementById("time-range")?.addEventListener("change", (e) => loadSalesOverview(e.target.value));
  document.getElementById("export-sales-csv")?.addEventListener("click", () => exportTableToCSV("sales-table", "sales_overview.csv"));
  document.getElementById("download-sales-chart")?.addEventListener("click", () => salesChartInstance && downloadChartImage(salesChartInstance, "sales_chart.png"));
  document.getElementById("export-product-sales-csv")?.addEventListener("click", () => exportTableToCSV("product-sales-table", "product_sales.csv"));
  document.getElementById("download-product-sales-chart")?.addEventListener("click", () => productSalesChartInstance && downloadChartImage(productSalesChartInstance, "product_sales_chart.png"));
  document.getElementById("export-category-sales-csv")?.addEventListener("click", () => exportTableToCSV("category-sales-table", "category_sales.csv"));
  document.getElementById("download-category-sales-chart")?.addEventListener("click", () => categorySalesChartInstance && downloadChartImage(categorySalesChartInstance, "category_sales_chart.png"));
  document.getElementById("export-transactions-csv")?.addEventListener("click", () => exportTableToCSV("transactions-table", "transactions.csv"));
  document.getElementById("export-user-csv")?.addEventListener("click", () => exportTableToCSV("user-sales-table", "sales_by_user.csv"));
  document.getElementById("export-item-csv")?.addEventListener("click", () => exportTableToCSV("item-sales-table", "sales_by_item.csv"));
  document.getElementById("export-payments-csv")?.addEventListener("click", () => exportTableToCSV("payments-table", "payments.csv"));
  document.getElementById("export-profit-csv")?.addEventListener("click", () => exportProfitCSV());
  // Excel + PDF + full-report wiring (buttons may be added per-section in HTML)
  document.getElementById("export-sales-xls")?.addEventListener("click", () => exportTableToExcel("sales-table", "sales_overview.xls"));
  document.getElementById("export-sales-pdf")?.addEventListener("click", () => exportSectionPDF("Sales Overview", ["sales-table"]));
  document.getElementById("export-product-xls")?.addEventListener("click", () => exportTableToExcel("product-sales-table", "product_sales.xls"));
  document.getElementById("export-product-pdf")?.addEventListener("click", () => exportSectionPDF("Product Sales", ["product-sales-table"]));
  document.getElementById("export-category-xls")?.addEventListener("click", () => exportTableToExcel("category-sales-table", "category_sales.xls"));
  document.getElementById("export-category-pdf")?.addEventListener("click", () => exportSectionPDF("Sales by Category", ["category-sales-table"]));
  document.getElementById("export-tx-xls")?.addEventListener("click", () => exportTableToExcel("transactions-table", "transactions.xls"));
  document.getElementById("export-tx-pdf")?.addEventListener("click", () => exportSectionPDF("Transactions", ["transactions-table"]));
  document.getElementById("export-user-xls")?.addEventListener("click", () => exportTableToExcel("user-sales-table", "sales_by_user.xls"));
  document.getElementById("export-user-pdf")?.addEventListener("click", () => exportSectionPDF("Sales by User", ["user-sales-table"]));
  document.getElementById("export-item-xls")?.addEventListener("click", () => exportTableToExcel("item-sales-table", "sales_by_item.xls"));
  document.getElementById("export-item-pdf")?.addEventListener("click", () => exportSectionPDF("Sales by Item", ["item-sales-table"]));
  document.getElementById("export-pay-xls")?.addEventListener("click", () => exportTableToExcel("payments-table", "payments.xls"));
  document.getElementById("export-pay-pdf")?.addEventListener("click", () => exportSectionPDF("Payments", ["payments-table"]));
  document.getElementById("export-full-xls")?.addEventListener("click", exportFullReportExcel);
  document.getElementById("export-full-pdf")?.addEventListener("click", exportFullReportPDF);
  document.getElementById("export-profit-xls")?.addEventListener("click", () => exportTableToExcel("profit-table", "profit_loss.xls"));
  document.getElementById("export-profit-pdf")?.addEventListener("click", () => exportSectionPDF("Profit & Loss", ["profit-table"]));
});

function wireFilters() {
  const presets = document.getElementById("report-presets");
  const paint = (btn) => {
    presets?.querySelectorAll("button").forEach(x => x.className = "px-3 py-2 rounded-xl text-xs font-bold border border-primary-200 dark:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-800");
    if (btn) btn.className = "px-3 py-2 rounded-xl text-xs font-bold bg-primary-900 dark:bg-white text-white dark:text-primary-900";
  };
  presets?.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
    RF.preset = b.dataset.preset; RF.from = ""; RF.to = "";
    document.getElementById("report-from").value = ""; document.getElementById("report-to").value = "";
    paint(b); loadAll();
  }));
  document.getElementById("report-apply")?.addEventListener("click", () => {
    const f = document.getElementById("report-from").value, t = document.getElementById("report-to").value;
    RF.store = document.getElementById("report-store")?.value || "";
    if (f && t) { RF.from = f; RF.to = t; RF.preset = "custom"; }
    loadAll();
  });
  document.getElementById("report-store")?.addEventListener("change", (e) => { RF.store = e.target.value; loadAll(); });
}

async function loadStores() {
  try {
    const r = await fetch("/api/stores", { credentials: "include" });
    if (!r.ok) return;
    const { stores = [] } = await r.json();
    const sel = document.getElementById("report-store");
    if (sel) sel.innerHTML = `<option value="">All stores</option>` + stores.map(s => `<option value="${s._id}">${s.name}</option>`).join("");
  } catch (_) {}
}

function loadAll() {
  const lbl = document.getElementById("report-range-label");
  if (lbl) lbl.textContent = RF.from && RF.to ? `${RF.from} → ${RF.to}` : RF.preset === "last30" ? "Last 30 days" : RF.preset;
  loadKPIs();
  loadSalesOverview(document.getElementById("time-range")?.value || "daily");
  loadProductSales();
  loadCategorySales();
  loadRecentTransactions();
  loadSalesByUser();
  loadSalesByItem();
  loadPaymentsHourly();
  loadProfit();
}

async function loadKPIs() {
  try {
    const d = await rfFetch("/reports/kpis");
    const c = d.current;
    document.getElementById("kpi-revenue").textContent = kes(c.revenue);
    document.getElementById("kpi-revenue-d").innerHTML = deltaHTML(d.delta.revenue);
    document.getElementById("kpi-orders").textContent = num(c.orders);
    document.getElementById("kpi-orders-d").innerHTML = deltaHTML(d.delta.orders);
    document.getElementById("kpi-ticket").textContent = kes(c.avgTicket);
    document.getElementById("kpi-ticket-d").innerHTML = deltaHTML(d.delta.avgTicket);
    document.getElementById("kpi-profit").textContent = kes(c.grossProfit);
    document.getElementById("kpi-margin").textContent = `${c.margin}% margin`;
    document.getElementById("kpi-units").textContent = num(c.units);
    document.getElementById("kpi-discounts").textContent = `Discounts ${kes(c.discounts)}`;
    setBanner(RF.from && RF.to ? `${RF.from} → ${RF.to}` : RF.preset === "last30" ? "Last 30 days" : RF.preset, false);
  } catch (e) {
    setBanner(e.message || "Failed to load KPIs", true);
    ["kpi-revenue", "kpi-orders", "kpi-ticket", "kpi-profit", "kpi-units", "kpi-bestday"].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = "—"; });
    if (window.showToast) showToast(e.message || "Failed to load KPIs", "error");
  }
}

async function loadSalesOverview(period = "daily") {
  try {
    const { overview = [] } = await rfFetch("/reports/sales-overview", { period });
    const table = document.getElementById("sales-table");
    if (table) {
      if (!overview.length) sectionEmpty("sales-table", 4, "No sales in this range.");
      else table.innerHTML = overview.map(row => `
      <tr class="hover:bg-gray-800 transition-colors">
        <td class="px-6 py-4 text-sm font-medium text-white">${row.period}</td>
        <td class="px-6 py-4 text-sm text-gray-300">${kes(row.sales)}</td>
        <td class="px-6 py-4 text-sm text-gray-300">${row.orders}</td>
        <td class="px-6 py-4 text-sm text-gray-300">${kes(row.avgOrderValue)}</td>
      </tr>`).join("");
    }
    const ctx = needChart("sales-chart");
    if (ctx) {
      if (salesChartInstance) salesChartInstance.destroy();
      salesChartInstance = new Chart(ctx, {
        type: "line",
        data: { labels: overview.map(r => r.period), datasets: [{ label: "Sales", data: overview.map(r => r.sales), borderColor: "#0ea5e9", backgroundColor: "rgba(14,165,233,0.1)", fill: true, tension: 0.4 }] },
        options: chartOpts(),
      });
    }
    // best day KPI
    if (overview.length) {
      const best = overview.reduce((a, b) => (b.sales > a.sales ? b : a));
      document.getElementById("kpi-bestday").textContent = best.period;
      document.getElementById("kpi-bestday-v").textContent = kes(best.sales);
    } else {
      document.getElementById("kpi-bestday").textContent = "—";
      document.getElementById("kpi-bestday-v").textContent = "No sales in range";
    }
  } catch (err) { sectionError("sales-table", err, 4, () => loadSalesOverview(period)); }
}

async function loadProductSales() {
  try {
    const { products = [] } = await rfFetch("/reports/product-sales");
    const table = document.getElementById("product-sales-table");
    if (table) {
      if (!products.length) sectionEmpty("product-sales-table", 4, "No product sales in range.");
      else table.innerHTML = products.map(row => `
      <tr class="hover:bg-gray-800 transition-colors">
        <td class="px-6 py-4 text-sm font-medium text-white">${row.product}</td>
        <td class="px-6 py-4 text-sm text-gray-300">${kes(row.totalSales)}</td>
        <td class="px-6 py-4 text-sm text-gray-300">${row.quantity}</td>
        <td class="px-6 py-4 text-sm text-gray-300">${kes(row.avgPrice)}</td>
      </tr>`).join("");
    }
    const ctx = needChart("product-sales-chart");
    if (ctx) {
      if (productSalesChartInstance) productSalesChartInstance.destroy();
      productSalesChartInstance = new Chart(ctx, {
        type: "bar",
        data: { labels: products.slice(0, 12).map(r => r.product), datasets: [{ label: "Sales", data: products.slice(0, 12).map(r => r.totalSales), backgroundColor: "#d946ef" }] },
        options: chartOpts(),
      });
    }
  } catch (err) { sectionError("product-sales-table", err, 4, loadProductSales); }
}

async function loadCategorySales() {
  try {
    const { categories = [] } = await rfFetch("/reports/category-sales");
    const table = document.getElementById("category-sales-table");
    if (table) {
      if (!categories.length) sectionEmpty("category-sales-table", 4, "No category data in range.");
      else table.innerHTML = categories.map(row => `
      <tr class="hover:bg-gray-800 transition-colors">
        <td class="px-6 py-4 text-sm font-medium text-white">${row.category}</td>
        <td class="px-6 py-4 text-sm text-gray-300">${kes(row.sales)}</td>
        <td class="px-6 py-4 text-sm text-gray-300">${row.products}</td>
        <td class="px-6 py-4 text-sm text-gray-300">${row.percent}%</td>
      </tr>`).join("");
    }
    const ctx = needChart("category-sales-chart");
    if (ctx) {
      if (categorySalesChartInstance) categorySalesChartInstance.destroy();
      categorySalesChartInstance = new Chart(ctx, {
        type: "pie",
        data: { labels: categories.map(r => r.category), datasets: [{ data: categories.map(r => r.sales), backgroundColor: ["#0ea5e9", "#d946ef", "#22c55e", "#f59e0b", "#ec4899", "#6366f1"] }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: "#cbd5e1" } } } },
      });
    }
  } catch (err) { sectionError("category-sales-table", err, 4, loadCategorySales); }
}

async function loadRecentTransactions() {
  try {
    const { transactions = [] } = await rfFetch("/reports/recent-transactions", { limit: 50 });
    const table = document.getElementById("transactions-table");
    if (table) {
      if (!transactions.length) sectionEmpty("transactions-table", 5, "No transactions in range.");
      else table.innerHTML = transactions.map(tx => `
      <tr class="hover:bg-gray-800 transition-colors">
        <td class="px-6 py-4 text-sm font-medium text-white">${tx.receiptNo || tx._id}</td>
        <td class="px-6 py-4 text-sm text-gray-300">${tx.customerName || "-"}</td>
        <td class="px-6 py-4 text-sm text-gray-300">${kes(tx.total)}</td>
        <td class="px-6 py-4 text-sm text-gray-300">${new Date(tx.createdAt).toLocaleString()}</td>
        <td class="px-6 py-4 text-sm text-gray-300">${tx.paymentMethod || "-"}</td>
      </tr>`).join("");
    }
  } catch (err) { sectionError("transactions-table", err, 5, loadRecentTransactions); }
}

async function loadSalesByUser() {
  const table = document.getElementById("user-sales-table");
  try {
    const { users = [] } = await rfFetch("/reports/sales-by-user");
    if (table) table.innerHTML = users.length ? users.map(u => `
      <tr class="hover:bg-gray-800 transition-colors">
        <td class="px-6 py-4 text-sm font-medium text-white">${u.name} <span class="text-xs text-gray-400">${u.role || ""}</span></td>
        <td class="px-6 py-4 text-sm text-gray-300">${kes(u.revenue)}</td>
        <td class="px-6 py-4 text-sm text-gray-300">${u.orders}</td>
        <td class="px-6 py-4 text-sm text-gray-300">${u.units}</td>
        <td class="px-6 py-4 text-sm text-gray-300">${kes(u.avgTicket)}</td>
      </tr>`).join("") : `<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">No sales by user in range.</td></tr>`;
    const ctx = needChart("user-sales-chart");
    if (ctx) {
      if (userChartInstance) userChartInstance.destroy();
      userChartInstance = new Chart(ctx, { type: "bar", data: { labels: users.map(u => u.name), datasets: [{ label: "Revenue", data: users.map(u => u.revenue), backgroundColor: "#22c55e" }] }, options: chartOpts() });
    }
  } catch (err) { sectionError("user-sales-table", err, 5, loadSalesByUser); }
}

async function loadSalesByItem() {
  const table = document.getElementById("item-sales-table");
  try {
    const { items = [] } = await rfFetch("/reports/sales-by-item");
    if (table) table.innerHTML = items.length ? items.slice(0, 50).map(m => `
      <tr class="hover:bg-gray-800 transition-colors">
        <td class="px-4 py-3 text-sm font-medium text-white">${m.product}<div class="text-[11px] text-gray-400">${m.category}</div></td>
        <td class="px-4 py-3 text-sm text-gray-300">${m.quantity}</td>
        <td class="px-4 py-3 text-sm text-gray-300">${kes(m.revenue)}</td>
        <td class="px-4 py-3 text-sm text-gray-300">${m.margin}%</td>
        <td class="px-4 py-3 text-sm text-gray-300">${m.onHand}</td>
        <td class="px-4 py-3 text-sm text-gray-300">${m.dailyUse}/day</td>
        <td class="px-4 py-3 text-sm text-gray-300">${m.daysCover === 999 ? "∞" : m.daysCover + "d"}</td>
        <td class="px-4 py-3 text-sm">${m.status === "out" ? '<span class="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-bold">OUT</span>' : m.status === "low" ? '<span class="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold">LOW</span>' : '<span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">OK</span>'}</td>
      </tr>`).join("") : `<tr><td colspan="8" class="px-6 py-8 text-center text-gray-500">No item sales in range.</td></tr>`;
    const ctx = needChart("item-sales-chart");
    if (ctx) {
      if (itemChartInstance) itemChartInstance.destroy();
      const top = items.slice(0, 10);
      itemChartInstance = new Chart(ctx, { type: "bar", data: { labels: top.map(m => m.product), datasets: [{ label: "Qty sold", data: top.map(m => m.quantity), backgroundColor: "#0ea5e9" }] }, options: chartOpts() });
    }
  } catch (err) { sectionError("item-sales-table", err, 8, loadSalesByItem); }
}

async function loadPaymentsHourly() {
  const table = document.getElementById("payments-table");
  try {
    const [{ methods = [], total }, { hours = [] }] = await Promise.all([rfFetch("/reports/payment-breakdown"), rfFetch("/reports/hourly")]);
    if (table) table.innerHTML = methods.length ? methods.map(m => `
      <tr class="hover:bg-gray-800 transition-colors">
        <td class="px-6 py-4 text-sm font-medium text-white capitalize">${m.method.replace(/_/g, " ")}</td>
        <td class="px-6 py-4 text-sm text-gray-300">${kes(m.revenue)}</td>
        <td class="px-6 py-4 text-sm text-gray-300">${m.orders}</td>
        <td class="px-6 py-4 text-sm text-gray-300">${m.share}%</td>
      </tr>`).join("") : `<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">No payments in range.</td></tr>`;
    const pc = needChart("payments-chart");
    if (pc) {
      if (paymentsChartInstance) paymentsChartInstance.destroy();
      paymentsChartInstance = new Chart(pc, { type: "doughnut", data: { labels: methods.map(m => m.method), datasets: [{ data: methods.map(m => m.revenue), backgroundColor: ["#0ea5e9", "#d946ef", "#22c55e", "#f59e0b", "#ec4899"] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: "#cbd5e1" } } } } });
    }
    const hc = needChart("hourly-chart");
    if (hc) {
      if (hourlyChartInstance) hourlyChartInstance.destroy();
      hourlyChartInstance = new Chart(hc, { type: "bar", data: { labels: hours.map(h => `${h.hour}:00`), datasets: [{ label: "Revenue", data: hours.map(h => h.revenue), backgroundColor: "#6366f1" }] }, options: chartOpts() });
    }
  } catch (err) { sectionError("payments-table", err, 4, loadPaymentsHourly); }
}

let lastProfit = null;
async function loadProfit() {
  try {
    lastProfit = await rfFetch("/reports/profit-loss");
    const box = document.getElementById("profit-cards");
    if (box) {
      const cards = [["Revenue", kes(lastProfit.revenue)], ["Discounts", kes(lastProfit.discounts)], ["Tax", kes(lastProfit.tax)], ["COGS", kes(lastProfit.cogs)], ["Gross profit", kes(lastProfit.grossProfit)], ["Margin", `${lastProfit.margin}%`], ["Orders", num(lastProfit.orders)], ["Avg ticket", kes(lastProfit.avgTicket)]];
      box.innerHTML = cards.map(([k, v]) => `<div class="glass-card rounded-2xl p-4"><p class="text-[11px] uppercase text-primary-400 font-bold">${k}</p><h3 class="text-lg font-black">${v}</h3></div>`).join("");
      const pt = document.getElementById("profit-table");
      if (pt) pt.innerHTML = cards.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("");
    }
  } catch (err) {
    const box = document.getElementById("profit-cards");
    if (box) box.innerHTML = `<div class="col-span-full text-center text-sm ${err.status === 403 ? "text-amber-500" : "text-red-400"} p-6">${err.status === 403 ? "🔒 " : "⚠️ "}${err.message} ${err.status === 403 ? '<a href="/manageSubscriptions.html" class="underline font-bold">Upgrade</a>' : '<button onclick="loadProfit()" class="underline font-bold text-accent-500">Retry</button>'}</div>`;
  }
}
function exportProfitCSV() {
  if (!lastProfit) return;
  const rows = [["Metric", "Value"], ["Revenue", lastProfit.revenue], ["Discounts", lastProfit.discounts], ["Tax", lastProfit.tax], ["COGS", lastProfit.cogs], ["Gross profit", lastProfit.grossProfit], ["Margin %", lastProfit.margin], ["Orders", lastProfit.orders]];
  const blob = new Blob([rows.map(r => r.join(",")).join("\n")], { type: "text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "profit_loss.csv"; a.click();
}

function chartOpts() {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: "#cbd5e1" } } },
    scales: { x: { ticks: { color: "#9ca3af" }, grid: { color: "rgba(255,255,255,0.1)" } }, y: { ticks: { color: "#9ca3af" }, grid: { color: "rgba(255,255,255,0.1)" } } },
  };
}

function tableHeaders(tableId) {
  // tbody ids hold data rows; headers live in the parent <table>'s <thead>
  const body = document.getElementById(tableId);
  if (!body) return [];
  const table = body.closest("table");
  const head = table?.querySelector("thead");
  if (head) return [...head.querySelectorAll("th")].map(th => th.innerText.trim());
  return [];
}
function tableRows(tableId) {
  const body = document.getElementById(tableId);
  if (!body) return [];
  return [...body.rows].map(row => [...row.cells].map(c => c.innerText.trim()));
}
function downloadBlob(blob, filename) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob); link.download = filename;
  document.body.appendChild(link); link.click();
  setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 500);
}
function exportTableToCSV(tableId, filename) {
  const head = tableHeaders(tableId), rows = tableRows(tableId);
  if (!rows.length && !head.length) { if (window.showToast) showToast("Nothing to export", "warning"); return; }
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = (head.length ? [head.map(esc).join(",")] : []).concat(rows.map(r => r.map(esc).join(","))).join("\n");
  downloadBlob(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }), filename);
  if (window.showToast) showToast(`Exported ${filename}`, "success");
}
function exportTableToExcel(tableId, filename) {
  // .xls via HTML table — opens natively in Excel, no dependency.
  const head = tableHeaders(tableId), rows = tableRows(tableId);
  if (!rows.length && !head.length) { if (window.showToast) showToast("Nothing to export", "warning"); return; }
  const esc = (v) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body><table border="1"><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;
  downloadBlob(new Blob(["\uFEFF" + html], { type: "application/vnd.ms-excel" }), filename.endsWith(".xls") ? filename : filename + ".xls");
  if (window.showToast) showToast(`Exported ${filename}`, "success");
}
function exportSectionPDF(title, tableIds) {
  // Print-friendly report window (Save as PDF from print dialog).
  const range = RF.from && RF.to ? `${RF.from} → ${RF.to}` : RF.preset;
  const css = `<style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{font-size:20px;margin:0}h2{font-size:14px;margin:24px 0 8px;color:#333}p.meta{color:#666;font-size:12px}table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}th{background:#f1f5f9}@media print{.no-print{display:none}}</style>`;
  const esc = (v) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const sections = tableIds.map(id => {
    const head = tableHeaders(id), rows = tableRows(id);
    if (!head.length && !rows.length) return "";
    return `<h2>${esc(id.replace(/-/g, " "))}</h2><table><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  }).join("");
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) { if (window.showToast) showToast("Popup blocked — allow popups to export PDF", "warning"); return; }
  w.document.write(`<html><head><title>${esc(title)}</title>${css}</head><body><h1>${esc(title)}</h1><p class="meta">Range: ${esc(range)}${RF.store ? " • Store filtered" : ""} • Generated ${new Date().toLocaleString()}</p>${sections}<div class="no-print" style="margin-top:24px"><button onclick="window.print()" style="padding:10px 20px;font-weight:bold">Print / Save PDF</button></div></body></html>`);
  w.document.close(); w.focus();
}
function exportFullReportExcel() {
  ["sales-table", "product-sales-table", "category-sales-table", "transactions-table", "user-sales-table", "item-sales-table", "payments-table", "profit-table"].forEach((id, i) => setTimeout(() => exportTableToExcel(id, `report_${id}.xls`), i * 300));
}
function exportFullReportPDF() {
  exportSectionPDF("SwiftPOS Full Report", ["sales-table", "product-sales-table", "category-sales-table", "user-sales-table", "item-sales-table", "payments-table", "profit-table", "transactions-table"]);
}

function downloadChartImage(chartInstance, filename) {
  if (!chartInstance) return;
  const link = document.createElement("a");
  link.href = chartInstance.toBase64Image(); link.download = filename;
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

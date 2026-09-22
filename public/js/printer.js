/**
 * Printer helpers - ESC/POS + browser fallback
 * Receipt data comes from GET /receipt/:id which returns the STORED copy:
 * { sale, business, store, settings }. Business block is real BusinessDetails,
 * never hardcoded placeholders.
 */
function esc(s){ return String(s ?? "").replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
function fmtKES(n){ return `KES ${Number(n||0).toFixed(2)}`; }
function fmtDateTime(iso){
  try { return new Date(iso).toLocaleString("en-KE", { year:"numeric", month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" }); }
  catch { return String(iso||""); }
}

async function fetchReceiptData(saleId) {
  const res = await fetch(`/receipt/${saleId}`, { credentials: "include" });
  if (!res.ok) throw new Error("receipt fetch failed");
  return res.json();
}

async function fetchReceiptHtml(saleId) {
  const data = await fetchReceiptData(saleId);
  const sale = data.sale;
  const biz = data.business || {};
  const store = data.store || {};
  const settings = data.settings || {};
  const currency = settings.currency || "KES";
  const money = (n)=> `${currency} ${Number(n||0).toFixed(2)}`;
  const receiptNo = sale.receiptNo || sale.receiptNumber || "";
  const cashier = sale.cashierName || sale.cashier?.name || "Staff";
  const role = sale.cashierRole || sale.cashier?.role || "";
  return `
    <html><head><meta charset="utf-8"><style>
      body{font-family: monospace; padding: 16px; color:#111; max-width:320px; margin:0 auto}
      h1{font-size:17px; text-align:center; margin:0} .c{text-align:center; font-size:11px; color:#333}
      .line{border-top:1px dashed #999; margin:8px 0}
      table{width:100%; font-size:12px; border-collapse:collapse} .right{text-align:right}
      .tot{font-size:12px} .tot div{display:flex; justify-content:space-between; margin:2px 0}
      .grand{display:flex; justify-content:space-between; font-weight:bold; font-size:14px}
      .footer{text-align:center; font-size:10px; color:#666; margin-top:10px}
      .meta{font-size:11px}
    </style></head><body>
      ${settings.logoUrl ? `<div class="c"><img src="${esc(settings.logoUrl)}" style="max-width:90px"/></div>` : ""}
      <h1>${esc(biz.name || "Receipt")}</h1>
      ${store.name ? `<div class="c">${esc(store.name)}${store.location ? " • "+esc(store.location) : ""}</div>` : ""}
      <div class="c">${esc(biz.address || "")}</div>
      <div class="c">${esc(biz.phone || "")}${biz.email ? " • "+esc(biz.email) : ""}</div>
      <div class="line"></div>
      <div class="meta">Receipt: <b>${esc(receiptNo)}</b><br/>Date: ${esc(fmtDateTime(sale.createdAt))}<br/>Served by: ${esc(cashier)}${role ? " ("+esc(role)+")" : ""}<br/>Customer: ${esc(sale.customerName || "Walk-in")}<br/>Payment: ${esc(sale.paymentMethod || "cash")}${sale.mpesaReceipt ? " • Ref "+esc(sale.mpesaReceipt) : ""}${sale.bankRef ? " • Ref "+esc(sale.bankRef) : ""}</div>
      <div class="line"></div>
      <table>${(sale.items||[]).map(i=>`<tr><td>${esc(i.productName)} x${i.quantity}</td><td class="right">${money(i.price*i.quantity)}</td></tr>`).join("")}</table>
      <div class="line"></div>
      <div class="tot">
        <div><span>Subtotal</span><span>${money(sale.subtotal)}</span></div>
        ${(sale.discount||0) ? `<div><span>Discount</span><span>-${money(sale.discount)}</span></div>` : ""}
        <div><span>Tax (${sale.taxRate||0}%)</span><span>${money(sale.taxAmount)}</span></div>
      </div>
      <div class="grand"><span>TOTAL</span><span>${money(sale.grandTotal ?? sale.total)}</span></div>
      ${settings.footerText ? `<div class="footer">${esc(settings.footerText)}</div>` : ""}
      <div class="footer">Thank you for your business!</div>
      ${receiptNo ? `<div class="c" style="margin-top:8px"><img src="https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(receiptNo)}" /><div>${esc(receiptNo)}</div></div>` : ""}
    </body></html>
  `;
}

async function printSale(saleId) {
  try {
    const html = await fetchReceiptHtml(saleId);
    if (window.SwiftBridge && window.SwiftBridge.printReceipt) {
      await window.SwiftBridge.printReceipt({ html });
    } else {
      const w = window.open("", "_blank");
      w.document.write(html); w.document.close(); w.focus(); w.print();
    }
    if (window.SwiftBridge && window.SwiftBridge.hapticImpact) window.SwiftBridge.hapticImpact("LIGHT");
    return true;
  } catch (e) {
    console.error("printSale failed", e);
    alert("Print failed: " + e.message);
    return false;
  }
}
async function printSaleReceipt(saleId){ return printSale(saleId); }

// expose
window.Printer = { printSale, printSaleReceipt, fetchReceiptHtml, fetchReceiptData };
window.printSaleReceipt = printSaleReceipt;

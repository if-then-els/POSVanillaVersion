/**
 * Printer helpers - ESC/POS + browser fallback
 * Tier: bluetooth -> Standard+, network -> Premium; fallback PDF always allowed.
 */

async function fetchReceiptHtml(saleId) {
  const res = await fetch(`/receipt/${saleId}`, { credentials: "include" });
  if (!res.ok) throw new Error("receipt fetch failed");
  const data = await res.json();
  // build minimal printable HTML
  const sale = data.sale;
  const store = data.store;
  return `
    <html><head><meta charset="utf-8"><style>
      body{font-family: monospace; padding: 16px; color:#111}
      h1{font-size:18px; text-align:center} .line{border-top:1px dashed #999; margin:8px 0}
      table{width:100%; font-size:13px} .right{text-align:right}
      .footer{text-align:center; font-size:11px; color:#666; margin-top:12px}
    </style></head><body>
      <h1>${store?.storeName || "SwiftPOS"}</h1>
      <div style="text-align:center; font-size:11px">${store?.storeAddress || ""} ${store?.storePhone || ""}</div>
      <div class="line"></div>
      <div style="font-size:11px">Receipt: ${sale._id} • ${new Date(sale.createdAt).toLocaleString()}<br/>Customer: ${sale.customerName || "Walk-in"} • ${sale.paymentMethod || "cash"}</div>
      <div class="line"></div>
      <table>${sale.items.map(i=>`<tr><td>${i.productName} x${i.quantity}</td><td class="right">KES ${(i.price*i.quantity).toFixed(2)}</td></tr>`).join("")}</table>
      <div class="line"></div>
      <div style="display:flex; justify-content:space-between; font-weight:bold"><span>Total</span><span>KES ${sale.total.toFixed(2)}</span></div>
      ${store?.footerText ? `<div class="footer">${store.footerText}</div>` : ""}
      <div class="footer">Thank you — powered by SwiftPOS</div>
      ${sale.receiptNo ? `<div style="text-align:center; margin-top:8px"><img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(sale.receiptNo)}" /></div>` : ""}
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

// expose
window.Printer = { printSale, fetchReceiptHtml };

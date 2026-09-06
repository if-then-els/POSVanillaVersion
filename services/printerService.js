/**
 * Printer Service - backend ESC/POS buffer + QR helper
 * Used by POS to generate printable payloads. For now returns HTML; ESC/POS buffer generation
 * can be added with `escpos` lib when hardware arrives.
 */

function generateReceiptPayload(sale, store) {
  const items = (sale.items || []).map(i => ({
    name: i.productId?.productName || i.productName || "Unknown",
    qty: i.quantity,
    price: i.price,
    total: (Number(i.price) * Number(i.quantity)).toFixed(2),
  }));
  const total = Number(sale.total).toFixed(2);
  const qrData = sale.receiptNo || String(sale._id);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;
  return { items, total, qrUrl, qrData, storeName: store?.storeName, footer: store?.footerText };
}

module.exports = { generateReceiptPayload };

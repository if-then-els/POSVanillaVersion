const Inventory = require("../models/inventory");

async function getValuation(businessId, storeId) {
  const filter = { business: businessId };
  if (storeId) filter.store = storeId;
  const items = await Inventory.find(filter).lean();
  let totalValueFIFO = 0; // for now same as WAC since no batches
  let totalValueWAC = 0;
  let totalItems = 0;
  const lowStock = [];
  items.forEach(it => {
    const qty = Number(it.productQuantity) || 0;
    const cost = Number(it.costPrice ?? it.productPrice ?? 0);
    const price = Number(it.productPrice) || 0;
    totalValueWAC += qty * cost;
    totalValueFIFO += qty * cost; // placeholder FIFO same until lot tracking
    totalItems += qty;
    const reorder = Number(it.reorderLevel ?? 5);
    if (qty <= reorder) lowStock.push({ _id: it._id, productName: it.productName, quantity: qty, reorderLevel: reorder, store: it.store });
  });
  return { itemsCount: items.length, totalItems, totalValueWAC, totalValueFIFO, lowStockCount: lowStock.length, lowStock };
}

module.exports = { getValuation };

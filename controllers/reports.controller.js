const Sale = require("../models/sale");
const Inventory = require("../models/inventory");
const mongoose = require("mongoose");

// ---------- shared helpers ----------
function parseRange(query) {
  // Supports ?from=YYYY-MM-DD&to=YYYY-MM-DD or ?preset=today|yesterday|week|month|all
  // Default: last 30 days (bounded — old code pulled ALL sales ever).
  const now = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  let from = query.from || "";
  let to = query.to || "";
  const preset = (query.preset || "").toLowerCase();
  if (!from && !to) {
    if (preset === "today") { from = to = iso(now); }
    else if (preset === "yesterday") { const y = new Date(now); y.setDate(y.getDate() - 1); from = to = iso(y); }
    else if (preset === "week") { const w = new Date(now); w.setDate(w.getDate() - 6); from = iso(w); to = iso(now); }
    else if (preset === "month") { const m = new Date(now.getFullYear(), now.getMonth(), 1); from = iso(m); to = iso(now); }
    else if (preset === "all") { from = ""; to = ""; }
    else { const w = new Date(now); w.setDate(w.getDate() - 29); from = iso(w); to = iso(now); }
  }
  const filter = {};
  if (from || to) {
    filter.createdAt = {};
    if (from) { const f = new Date(from); if (!isNaN(f)) { f.setHours(0, 0, 0, 0); filter.createdAt.$gte = f; } }
    if (to) { const t = new Date(to); if (!isNaN(t)) { t.setHours(23, 59, 59, 999); filter.createdAt.$lte = t; } }
    if (!Object.keys(filter.createdAt).length) delete filter.createdAt;
  }
  const days = filter.createdAt?.$gte && filter.createdAt?.$lte
    ? Math.max(1, Math.round((filter.createdAt.$lte - filter.createdAt.$gte) / 86400000))
    : 30;
  return { filter, from, to, days };
}

function scopedFilter(req) {
  const { filter, from, to, days } = parseRange(req.query);
  filter.business = new mongoose.Types.ObjectId(req.user.business);
  if (req.query.store) {
    try { filter.store = new mongoose.Types.ObjectId(req.query.store); } catch (_) { /* ignore bad id */ }
  }
  if (req.query.payment) filter.paymentMethod = req.query.payment;
  return { filter, from, to, days };
}

function prevFilter(filter, days) {
  const pf = { ...filter };
  if (filter.createdAt?.$gte && filter.createdAt?.$lte) {
    const span = filter.createdAt.$lte - filter.createdAt.$gte;
    pf.createdAt = { $gte: new Date(filter.createdAt.$gte - span - 1), $lte: new Date(filter.createdAt.$gte - 1) };
  } else {
    const now = new Date();
    pf.createdAt = { $gte: new Date(now - days * 86400000 * 2), $lte: new Date(now - days * 86400000) };
  }
  return pf;
}

function summarize(sales) {
  let revenue = 0, orders = sales.length, units = 0, discounts = 0, tax = 0, cogs = 0;
  for (const s of sales) {
    revenue += Number(s.total) || 0;
    discounts += Number(s.discount) || 0;
    tax += Number(s.taxAmount) || 0;
    for (const it of (s.items || [])) {
      const q = Number(it.quantity) || 0;
      units += q;
      cogs += Number(it.costPrice ?? it.productId?.costPrice ?? 0) * q;
    }
  }
  const grossProfit = revenue - cogs;
  return {
    revenue, orders, units, discounts, tax, cogs, grossProfit,
    margin: revenue ? Number(((grossProfit / revenue) * 100).toFixed(2)) : 0,
    avgTicket: orders ? revenue / orders : 0,
  };
}

function pctChange(cur, prev) {
  if (!prev) return cur ? 100 : 0;
  return Number((((cur - prev) / prev) * 100).toFixed(1));
}

// Helper: group sales by period (day/week/month)
function groupByPeriod(sales, period) {
  const result = {};
  sales.forEach((sale) => {
    let key;
    const date = new Date(sale.createdAt);
    if (period === "daily") key = date.toISOString().slice(0, 10);
    else if (period === "weekly") {
      const d = new Date(date);
      d.setDate(d.getDate() - d.getDay());
      key = d.toISOString().slice(0, 10);
    } else if (period === "monthly") key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    else key = date.toISOString().slice(0, 10);
    if (!result[key]) result[key] = [];
    result[key].push(sale);
  });
  return result;
}

// ---------- endpoints (all accept ?from&to&preset&store&payment) ----------
exports.kpis = async (req, res) => {
  try {
    const { filter, from, to, days } = scopedFilter(req);
    const [cur, prev] = await Promise.all([
      Sale.find(filter).populate("items.productId", "costPrice").lean(),
      Sale.find(prevFilter(filter, days)).lean(),
    ]);
    const c = summarize(cur), p = summarize(prev);
    res.json({
      from, to, days,
      current: c, previous: p,
      delta: {
        revenue: pctChange(c.revenue, p.revenue),
        orders: pctChange(c.orders, p.orders),
        avgTicket: pctChange(c.avgTicket, p.avgTicket),
        grossProfit: pctChange(c.grossProfit, p.grossProfit),
      },
    });
  } catch (err) { res.status(500).json({ message: "Failed to load KPIs" }); }
};

exports.salesOverview = async (req, res) => {
  try {
    const { period = "daily" } = req.query;
    const { filter, from, to } = scopedFilter(req);
    const sales = await Sale.find(filter).lean();
    const grouped = groupByPeriod(sales, period);
    const overview = Object.entries(grouped)
      .map(([key, arr]) => {
        const s = summarize(arr);
        return { period: key, sales: s.revenue, orders: s.orders, avgOrderValue: s.avgTicket, units: s.units };
      })
      .sort((a, b) => (a.period < b.period ? -1 : 1));
    res.json({ overview, from, to });
  } catch (err) {
    res.status(500).json({ message: "Failed to load sales overview" });
  }
};

exports.salesByDay = async (req, res) => {
  try {
    const { filter, from, to } = scopedFilter(req);
    const sales = await Sale.find(filter).lean();
    const map = {};
    sales.forEach((s) => {
      const k = new Date(s.createdAt).toISOString().slice(0, 10);
      (map[k] = map[k] || []).push(s);
    });
    const days = Object.entries(map)
      .map(([date, arr]) => ({ date, ...summarize(arr) }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    res.json({ days, from, to });
  } catch (err) { res.status(500).json({ message: "Failed to load sales by day" }); }
};

exports.salesByUser = async (req, res) => {
  try {
    const { filter, from, to } = scopedFilter(req);
    const sales = await Sale.find(filter).populate("cashier", "name email role").lean();
    const map = {};
    sales.forEach((s) => {
      const id = s.cashier?._id?.toString() || s.cashierName || "unknown";
      if (!map[id]) map[id] = { userId: id, name: s.cashier?.name || s.cashierName || s.cashier?.email || "Staff", role: s.cashier?.role || "", sales: [] };
      map[id].sales.push(s);
    });
    const users = Object.values(map).map((u) => {
      const s = summarize(u.sales);
      return { userId: u.userId, name: u.name, role: u.role, revenue: s.revenue, orders: s.orders, units: s.units, avgTicket: s.avgTicket, discounts: s.discounts };
    }).sort((a, b) => b.revenue - a.revenue);
    res.json({ users, from, to });
  } catch (err) { res.status(500).json({ message: "Failed to load sales by user" }); }
};

exports.salesByItem = async (req, res) => {
  try {
    const { filter, from, to, days } = scopedFilter(req);
    const [sales, stock] = await Promise.all([
      Sale.find(filter).populate("items.productId").lean(),
      Inventory.find({ business: req.user.business }).select("productName productCategory productPrice productQuantity costPrice reorderLevel store").lean(),
    ]);
    const stockById = {};
    stock.forEach((p) => { stockById[p._id.toString()] = p; });
    const map = {};
    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        const id = item.productId?._id?.toString() || "unknown";
        if (!map[id]) {
          map[id] = {
            productId: id,
            product: item.productId?.productName || "Unknown",
            category: item.productId?.productCategory || "Uncategorized",
            revenue: 0, quantity: 0, cogs: 0,
          };
        }
        const q = Number(item.quantity) || 0;
        map[id].revenue += Number(item.price) * q;
        map[id].quantity += q;
        map[id].cogs += Number(item.costPrice ?? item.productId?.costPrice ?? 0) * q;
      });
    });
    const items = Object.values(map).map((m) => {
      const st = stockById[m.productId];
      const onHand = st ? Number(st.productQuantity) || 0 : 0;
      const dailyUse = m.quantity / Math.max(1, days);
      const daysCover = dailyUse > 0 ? onHand / dailyUse : (onHand > 0 ? 999 : 0);
      const grossProfit = m.revenue - m.cogs;
      return {
        ...m,
        avgPrice: m.quantity ? m.revenue / m.quantity : 0,
        grossProfit,
        margin: m.revenue ? Number(((grossProfit / m.revenue) * 100).toFixed(1)) : 0,
        onHand,
        dailyUse: Number(dailyUse.toFixed(2)),
        daysCover: Number(daysCover > 900 ? 999 : daysCover.toFixed(1)),
        reorderLevel: st?.reorderLevel ?? 5,
        status: onHand <= 0 ? "out" : daysCover <= 7 ? "low" : "ok",
      };
    }).sort((a, b) => b.revenue - a.revenue);
    res.json({ items, from, to, days });
  } catch (err) { res.status(500).json({ message: "Failed to load sales by item" }); }
};

exports.paymentBreakdown = async (req, res) => {
  try {
    const { filter, from, to } = scopedFilter(req);
    const sales = await Sale.find(filter).lean();
    const total = sales.reduce((s, x) => s + (Number(x.total) || 0), 0);
    const map = {};
    sales.forEach((s) => {
      const k = s.paymentMethod || "cash";
      if (!map[k]) map[k] = { method: k, revenue: 0, orders: 0 };
      map[k].revenue += Number(s.total) || 0;
      map[k].orders += 1;
    });
    const methods = Object.values(map)
      .map((m) => ({ ...m, share: total ? Number(((m.revenue / total) * 100).toFixed(1)) : 0 }))
      .sort((a, b) => b.revenue - a.revenue);
    res.json({ methods, total, from, to });
  } catch (err) { res.status(500).json({ message: "Failed to load payment breakdown" }); }
};

exports.hourlySales = async (req, res) => {
  try {
    const { filter, from, to } = scopedFilter(req);
    const sales = await Sale.find(filter).lean();
    const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, revenue: 0, orders: 0 }));
    sales.forEach((s) => {
      const h = new Date(s.createdAt).getHours();
      hours[h].revenue += Number(s.total) || 0;
      hours[h].orders += 1;
    });
    res.json({ hours, from, to });
  } catch (err) { res.status(500).json({ message: "Failed to load hourly sales" }); }
};

exports.consumption = async (req, res) => {
  // Consumption rate per product: qty sold in range, daily use, days of cover, reorder flag.
  try {
    const { filter, from, to, days } = scopedFilter(req);
    const [sales, stock] = await Promise.all([
      Sale.find(filter).populate("items.productId", "productName productCategory").lean(),
      Inventory.find({ business: req.user.business }).select("productName productCategory productQuantity reorderLevel").lean(),
    ]);
    const sold = {};
    sales.forEach((s) => s.items.forEach((it) => {
      const id = it.productId?._id?.toString() || "unknown";
      if (!sold[id]) sold[id] = { productId: id, product: it.productId?.productName || "Unknown", category: it.productId?.productCategory || "Uncategorized", qtySold: 0 };
      sold[id].qtySold += Number(it.quantity) || 0;
    }));
    const rows = stock.map((p) => {
      const id = p._id.toString();
      const qtySold = sold[id]?.qtySold || 0;
      const dailyUse = qtySold / Math.max(1, days);
      const onHand = Number(p.productQuantity) || 0;
      const daysCover = dailyUse > 0 ? onHand / dailyUse : (onHand > 0 ? 999 : 0);
      return {
        productId: id,
        product: p.productName,
        category: p.productCategory,
        qtySold,
        onHand,
        dailyUse: Number(dailyUse.toFixed(2)),
        daysCover: Number(daysCover > 900 ? 999 : daysCover.toFixed(1)),
        reorderLevel: p.reorderLevel ?? 5,
        needsReorder: onHand <= (p.reorderLevel ?? 5) || (dailyUse > 0 && daysCover <= 7),
      };
    }).sort((a, b) => b.qtySold - a.qtySold);
    res.json({ rows, from, to, days });
  } catch (err) { res.status(500).json({ message: "Failed to load consumption" }); }
};

exports.productSales = async (req, res) => {
  try {
    const { filter } = scopedFilter(req);
    const sales = await Sale.find(filter).populate("items.productId");
    const productMap = {};
    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        const id = item.productId?._id?.toString();
        if (!id) return;
        if (!productMap[id]) {
          productMap[id] = { product: item.productId.productName, totalSales: 0, quantity: 0, avgPrice: 0 };
        }
        productMap[id].totalSales += item.price * item.quantity;
        productMap[id].quantity += item.quantity;
      });
    });
    Object.values(productMap).forEach((p) => { p.avgPrice = p.quantity ? p.totalSales / p.quantity : 0; });
    res.json({ products: Object.values(productMap) });
  } catch (err) {
    res.status(500).json({ message: "Failed to load product sales" });
  }
};

exports.categorySales = async (req, res) => {
  try {
    const { filter } = scopedFilter(req);
    const sales = await Sale.find(filter).populate("items.productId");
    const categoryMap = {};
    let totalSales = 0;
    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        const cat = item.productId?.productCategory || "Uncategorized";
        if (!categoryMap[cat]) categoryMap[cat] = { category: cat, sales: 0, products: new Set() };
        categoryMap[cat].sales += item.price * item.quantity;
        categoryMap[cat].products.add(item.productId?._id?.toString());
        totalSales += item.price * item.quantity;
      });
    });
    const result = Object.values(categoryMap).map((c) => ({
      ...c, products: c.products.size,
      percent: totalSales ? ((c.sales / totalSales) * 100).toFixed(2) : "0.00",
    }));
    res.json({ categories: result });
  } catch (err) {
    res.status(500).json({ message: "Failed to load category sales" });
  }
};

exports.recentTransactions = async (req, res) => {
  try {
    const { filter } = scopedFilter(req);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 200);
    const sales = await Sale.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("cashier", "name email role")
      .populate("store", "name")
      .lean();
    res.json({ transactions: sales });
  } catch (err) {
    res.status(500).json({ message: "Failed to load transactions" });
  }
};

exports.profitLoss = async (req, res) => {
  try {
    const { filter, from, to } = scopedFilter(req);
    const sales = await Sale.find(filter).populate("items.productId").lean();
    const s = summarize(sales);
    res.json({ ...s, orders: sales.length, from, to });
  } catch (err) {
    res.status(500).json({ message: "Failed to load profit/loss" });
  }
};

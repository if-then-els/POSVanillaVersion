const Sale = require("../models/sale");
const Inventory = require("../models/inventory");

// Helper: group sales by period (day/week/month)
function groupByPeriod(sales, period) {
  const result = {};
  sales.forEach((sale) => {
    let key;
    const date = new Date(sale.createdAt);
    if (period === "daily") key = date.toISOString().slice(0, 10);
    else if (period === "weekly") {
      const firstDayOfWeek = new Date(
        date.setDate(date.getDate() - date.getDay())
      );
      key = firstDayOfWeek.toISOString().slice(0, 10);
    } else if (period === "monthly")
      key = `${date.getFullYear()}-${date.getMonth() + 1}`;
    else key = date.toISOString().slice(0, 10);
    if (!result[key]) result[key] = [];
    result[key].push(sale);
  });
  return result;
}

exports.salesOverview = async (req, res) => {
  try {
    const { period = "daily" } = req.query;
    const sales = await Sale.find();
    const grouped = groupByPeriod(sales, period);

    const overview = Object.entries(grouped).map(([key, salesArr]) => {
      const totalSales = salesArr.reduce((sum, s) => sum + s.total, 0);
      const orders = salesArr.length;
      const avgOrder = orders ? totalSales / orders : 0;
      return {
        period: key,
        sales: totalSales,
        orders,
        avgOrderValue: avgOrder,
      };
    });

    res.json({ overview });
  } catch (err) {
    res.status(500).json({ message: "Failed to load sales overview" });
  }
};

exports.productSales = async (req, res) => {
  try {
    const sales = await Sale.find().populate("items.productId");
    const productMap = {};
    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        const id = item.productId?._id?.toString();
        if (!id) return;
        if (!productMap[id]) {
          productMap[id] = {
            product: item.productId.productName,
            totalSales: 0,
            quantity: 0,
            avgPrice: 0,
          };
        }
        productMap[id].totalSales += item.price * item.quantity;
        productMap[id].quantity += item.quantity;
      });
    });
    // Calculate avg price
    Object.values(productMap).forEach((p) => {
      p.avgPrice = p.quantity ? p.totalSales / p.quantity : 0;
    });
    res.json({ products: Object.values(productMap) });
  } catch (err) {
    res.status(500).json({ message: "Failed to load product sales" });
  }
};

exports.categorySales = async (req, res) => {
  try {
    const sales = await Sale.find().populate("items.productId");
    const categoryMap = {};
    let totalSales = 0;
    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        const cat = item.productId?.productCategory || "Uncategorized";
        if (!categoryMap[cat]) {
          categoryMap[cat] = { category: cat, sales: 0, products: new Set() };
        }
        categoryMap[cat].sales += item.price * item.quantity;
        categoryMap[cat].products.add(item.productId?._id?.toString());
        totalSales += item.price * item.quantity;
      });
    });
    const result = Object.values(categoryMap).map((c) => ({
      ...c,
      products: c.products.size,
      percent: totalSales ? ((c.sales / totalSales) * 100).toFixed(2) : "0.00",
    }));
    res.json({ categories: result });
  } catch (err) {
    res.status(500).json({ message: "Failed to load category sales" });
  }
};

exports.recentTransactions = async (req, res) => {
  try {
    const sales = await Sale.find().sort({ createdAt: -1 }).limit(20);
    res.json({ transactions: sales });
  } catch (err) {
    res.status(500).json({ message: "Failed to load transactions" });
  }
};

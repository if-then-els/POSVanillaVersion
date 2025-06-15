const Sale = require("../models/sale");
const Inventory = require("../models/inventory");
const Settings = require("../models/settings");

exports.processSale = async (req, res) => {
  try {
    const { items, total, customerName, paymentMethod, business } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0 || !business) {
      return res
        .status(400)
        .json({ message: "No sale items or business provided" });
    }

    // Check and update inventory
    for (const item of items) {
      const product = await Inventory.findById(item.productId);
      if (!product) {
        return res
          .status(404)
          .json({ message: `Product not found: ${item.productId}` });
      }
      if (product.productQuantity < item.quantity) {
        return res
          .status(400)
          .json({ message: `Insufficient stock for ${product.productName}` });
      }
      product.productQuantity -= item.quantity;
      await product.save();
    }

    // Save sale
    const sale = new Sale({
      items,
      total,
      customerName,
      paymentMethod,
      business,
    });
    await sale.save();

    res.status(201).json({ message: "Sale processed successfully", sale });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getSales = async (req, res) => {
  try {
    const { business } = req.query;
    if (!business) {
      return res.status(400).json({ message: "Business ID required" });
    }
    const sales = await Sale.find({ business })
      .sort({ createdAt: -1 })
      .populate("items.productId");
    res.status(200).json({ sales });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.getReceipt = async (req, res) => {
  try {
    const { saleId } = req.params;
    const sale = await Sale.findById(saleId).populate("items.productId");
    if (!sale) return res.status(404).json({ message: "Sale not found" });

    //fetch store settings
    const settings = await Settings.findOne();
    if (!settings) {
      return res.status(404).json({ message: "Store settings not found" });
    }

    res.json({
      sale: {
        _id: sale._id,
        items: sale.items.map((item) => ({
          productName: item.productId?.productName || "Unknown",
          quantity: item.quantity,
          price: item.price,
        })),
        total: sale.total,
        customerName: sale.customerName,
        paymentMethod: sale.paymentMethod,
        createdAt: sale.createdAt,
      },
      store: settings || {},
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch receipt" });
  }
};

exports.getTotalSalesAmount = async (req, res) => {
  try {
    const totalSales = await Sale.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$total" },
        },
      },
    ]);

    const totalAmount = totalSales.length > 0 ? totalSales[0].totalAmount : 0;
    res.status(200).json({ totalAmount });
  } catch (error) {
    console.error("Error fetching total sales amount: ", error);
    res.status(500).json({ message: "Failed to fetch total sales amount" });
  }
};

exports.getTotalOrders = async (req, res) => {
  try {
    const totalOrders = await Sale.countDocuments();
    return res.status(200).json({ totalOrders });
  } catch (error) {
    console.error("Error fetching total orders: ", error);
    res.status(500).json({ message: "Failed to fetch total orders" });
  }
};

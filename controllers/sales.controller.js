const Sale = require("../models/sale");
const Inventory = require("../models/inventory");
const Settings = require("../models/settings");
const mongoose = require("mongoose");

exports.processSale = async (req, res) => {
  try {
    const business = req.user.business;
    // const user = req.user.name;
    const { items, total, customerName, paymentMethod } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0 || !business) {
      return res
        .status(400)
        .json({ message: "No sale items or business provided" });
    }

    // Check and update inventory
    for (const item of items) {
      const product = await Inventory.findById(item.productId, item.business);
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
      //user: req.user._id, // Assuming user ID is available in req.user
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
    const business = req.user.business;
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

    const settings = await Settings.findOne({ business: req.user.business });
    if (!settings) {
      return res.status(404).json({ message: "Store settings not found" });
    }

    // Calculate subtotal and taxes
    const subtotal = sale.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const taxRate = settings.taxRate || 0;
    const taxAmount = subtotal * (taxRate / 100);
    const grandTotal = subtotal + taxAmount;

    res.json({
      sale: {
        ...sale.toObject(),
        items: sale.items.map((item) => ({
          productName: item.productId?.productName || "Unknown",
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
        })),
        subtotal,
        taxRate,
        taxAmount,
        grandTotal,
      },
      store: settings,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch receipt" });
  }
};
exports.getTotalSalesAmount = async (req, res) => {
  try {
    const businessIdString = req.user.business;
    // console.log("1. Business ID from token (string):", businessIdString);

    if (!businessIdString) {
      return res.status(400).json({
        message: "Business ID not found in token. Authorization required.",
      });
    }

    let businessObjectId;
    try {
      businessObjectId = new mongoose.Types.ObjectId(businessIdString);
      //console.log("1a. Business ID converted to ObjectId:", businessObjectId);
    } catch (err) {
      // console.error("Error converting business ID to ObjectId:", err);
      return res.status(400).json({ message: "Invalid business ID format." });
    }

    const testSales = await Sale.find({ business: businessObjectId }).limit(1);

    // Perform the aggregation with the explicitly converted ObjectId
    const totalSales = await Sale.aggregate([
      { $match: { business: businessObjectId } }, // Use the converted ObjectId for matching
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$total" }, // Keep "$total" as confirmed in your document example
        },
      },
    ]);

    const totalAmount = totalSales.length > 0 ? totalSales[0].totalAmount : 0;
    // console.log("3. Aggregation Result:", JSON.stringify(totalSales, null, 2)); // Use JSON.stringify for aggregation result
    //console.log("4. Final Total Sales Amount:", totalAmount);

    res.status(200).json({ totalAmount });
  } catch (error) {
    //console.error("Error fetching total sales amount: ", error);
    res.status(500).json({ message: "Failed to fetch total sales amount" });
  }
};
exports.getTotalOrders = async (req, res) => {
  try {
    const totalOrders = await Sale.countDocuments({
      business: req.user.business,
    });
    return res.status(200).json({ totalOrders });
  } catch (error) {
    console.error("Error fetching total orders: ", error);
    res.status(500).json({ message: "Failed to fetch total orders" });
  }
};

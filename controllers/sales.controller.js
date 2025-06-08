const Sale = require("../models/sale");
const Inventory = require("../models/inventory");

exports.processSale = async (req, res) => {
  try {
    const { items, total, customerName, paymentMethod } = req.body;

    // Validate input
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No sale items provided" });
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
    const sale = new Sale({ items, total, customerName, paymentMethod });
    await sale.save();

    res.status(201).json({ message: "Sale processed successfully", sale });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getSales = async (req, res) => {
  try {
    const sales = await Sale.find()
      .sort({ createdAt: -1 })
      .populate("items.productId");
    res.status(200).json({ sales });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

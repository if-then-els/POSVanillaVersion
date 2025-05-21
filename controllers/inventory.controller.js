const Inventory = require("../models/inventory");

exports.addStock = async (req, res) => {
  try {
    const {
      productName,
      productPrice,
      productQuantity,
      productDescription,
      productCategory,
      productBatchNumber,
    } = req.body;
    if (
      !productName ||
      !productPrice ||
      !productQuantity ||
      !productDescription ||
      !productCategory ||
      !productBatchNumber
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const existingProduct = await Inventory.findOne({ productBatchNumber });
    if (existingProduct) {
      return res.status(400).json({ message: "Product Batch already exists" });
    }
    const newProduct = new Inventory({
      productName,
      productPrice,
      productQuantity,
      productDescription,
      productCategory,
      productBatchNumber,
    });
    await newProduct.save();
    return res
      .status(201)
      .json({ message: "Product added successfully", newProduct });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "server error" });
  }
};

exports.getInventory = async (req, res) => {
  try {
    const inventory = await Inventory.find();
    return res
      .status(200)
      .json({ message: "Inventory fetched successfully", inventory });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "server error" });
  }
};

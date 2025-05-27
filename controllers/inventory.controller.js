const Inventory = require("../models/inventory");
const path = require("path");
const bodyParser = require("body-parser");
const multer = require("multer");

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

exports.addStockByCsv = async (req, res) => {
  try {
    // console.log("Received file:", req.file);
    const csvFile = req.file;
    // console.log("CSV file path:", csvFile ? csvFile.path : "No file uploaded");
    if (!csvFile) {
      return res.status(400).json({ message: "Please upload a csv file" });
    }
    const csv = require("csvtojson");
    const jsonArray = await csv().fromFile(csvFile.path);
    if (jsonArray.length === 0) {
      return res.status(400).json({ message: "No data found in csv file" });
    }
    const products = jsonArray.map((item) => ({
      productName: item.productName,
      productPrice: parseFloat(item.productPrice),
      productQuantity: parseInt(item.productQuantity),
      productDescription: item.productDescription,
      productCategory: item.productCategory,
      productBatchNumber: item.productBatchNumber,
    }));
    const existingProducts = await Inventory.find({
      productBatchNumber: { $in: products.map((p) => p.productBatchNumber) },
    });
    if (existingProducts.length > 0) {
      return res.status(400).json({ message: "Some products already exist" });
    }
    const newProducts = await Inventory.insertMany(products);
    return res.status(201).json({
      message: "Products added successfully",
      newProducts,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "server error", error });
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

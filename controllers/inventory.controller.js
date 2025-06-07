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

exports.downloadInventory = async (req, res) => {
  try {
    const inventory = await Inventory.find();
    if (inventory.length === 0) {
      return res.status(404).json({ message: "No inventory found" });
    }
    const pdf = require("pdfkit");
    const doc = new pdf();
    const filePath = path.join(__dirname, "../uploads/inventory.pdf");
    doc.pipe(require("fs").createWriteStream(filePath));
    doc.fontSize(20).text("Inventory Report", { align: "center" });
    doc.moveDown();
    inventory.forEach((item) => {
      doc
        .fontSize(12)
        .text(`Product Name: ${item.productName}`)
        .text(`Price: $${item.productPrice}`)
        .text(`Quantity: ${item.productQuantity}`)
        .text(`Description: ${item.productDescription}`)
        .text(`Category: ${item.productCategory}`)
        .text(`Batch Number: ${item.productBatchNumber}`)
        .moveDown();
    });
    doc.end();
    doc.on("finish", () => {
      return res.download(filePath, "inventory.pdf", (err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: "Error downloading file" });
        }
      });
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

exports.getInventoryById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "Product ID is required" });
    }
    const product = await Inventory.findById(id);
    if (!product) {
      return res.ststus(404).json({ message: "product not found" });
    }
    return res
      .status(200)
      .json({ message: "Product fetched successfully", product });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "server error" });
  }
};

exports.adjustInventoryQuantity = async (req, res) => {
  try {
    const { productId, productQuantity } = req.body;
    if (!productId || !productQuantity) {
      return res
        .status(400)
        .json({ message: "Product ID and Quantity are required" });
    }
    const product = await Inventory.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.productQuantity += productQuantity;
    if (product.productQuantity < 0) {
      return res.status(400).json({ message: "Quantity cannot be negative" });
    }
    await product.save();
    return res.ststus(200).json({
      message: "Inventory adjusted sucessfully",
      productName: product.productName,
      productQuantity: product.productQuantity,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "server error" });
  }
};

exports.adjustProductPrice = async (req, res) => {
  try {
    const { productId, productPrice } = req.body;
    if (!productId || !productPrice) {
      return res
        .status(400)
        .json({ message: "Product ID and Price are required" });
    }
    const product = await Inventory.findById({ _id: req.body.productId });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    product.productPrice = productPrice;
    await product.save();
    return res.status(200).json({
      message: "Product price adjusted successfully",
      productName: product.productName,
      productPrice: product.productPrice,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ message: "Product ID is requires" });
    }
    const product = await Inventory.findByIdAndDelete(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    return res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
};

exports.uploadProductByXlsx = async (req, res) => {
  try {
    const xlsx = require("xlsx");
    const xlsxFile = req.file;
    console.log("Received file:", xlsxFile);
    console.log("File path:", xlsxFile ? xlsxFile.path : "No file uploaded");
    console.log("reqqbody: ", req.body);
    if (!xlsxFile) {
      return res.status(400).json({ message: "Please upload a xlsx file" });
    }
    const workbook = xlsx.readFile(xlsxFile.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonArray = xlsx.utils.sheet_to_json(worksheet);
    if (jsonArray.length === 0) {
      return res.status(400).json({ message: "No data found in xlsx file" });
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
    return res.status(500).json({ message: "Server Error" });
  }
};

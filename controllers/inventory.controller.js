const Inventory = require("../models/inventory");
const path = require("path");
const bodyParser = require("body-parser");
const multer = require("multer");
const { Parser } = require("json2csv");
const XLSX = require("xlsx");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const { verifyToken } = require("../middleware/auth.middleware");

exports.addStock = async (req, res) => {
  try {
    const business = req.user.business;
    const {
      productName,
      productPrice,
      productQuantity,
      productDescription,
      productCategory,
      productBatchNumber,
      sku,
      barcode,
      costPrice,
      reorderLevel,
      expiryDate,
      supplier,
      store,
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

    const newProduct = new Inventory({
      productName,
      productPrice,
      productQuantity,
      productDescription,
      productCategory,
      productBatchNumber,
      sku: sku || undefined,
      barcode: barcode || undefined,
      costPrice: costPrice !== undefined ? Number(costPrice) : undefined,
      reorderLevel: reorderLevel !== undefined ? Number(reorderLevel) : 5,
      expiryDate: expiryDate || undefined,
      supplier: supplier || undefined,
      store: store || undefined,
      business,
    });

    await newProduct.save();

    // low-stock immediate check after create (if initial qty <= reorder)
    if (Number(newProduct.productQuantity) <= Number(newProduct.reorderLevel)) {
      try { console.warn(`Low stock on create: ${newProduct.productName} qty ${newProduct.productQuantity} <= ${newProduct.reorderLevel}`); } catch {}
    }

    return res.status(201).json({ message: "Product added successfully", newProduct });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "server error" });
  }
};

exports.addStockByCsv = async (req, res) => {
  try {
    const business = req.user.business; // Get business ID from token
    if (!business) {
      return res
        .status(400)
        .json({ message: "Business ID not found in token." });
    }

    const csvFile = req.file;
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
      business: business, // Assign the business ID here
    }));

    // Check for existing products within the *same business*
    const existingProducts = await Inventory.find({
      productBatchNumber: { $in: products.map((p) => p.productBatchNumber) },
      business: business, // Filter by business as well
    });

    if (existingProducts.length > 0) {
      // You might want to return a more specific message or handle conflicts
      return res.status(400).json({
        message:
          "Some products with the same batch number already exist for this business.",
      });
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
exports.getAllInventory = async (req, res) => {
  try {
    const business = req.user.business;
    if (!business) return res.status(400).json({ message: "Business ID required" });
    const { lowStock, store, category, barcode } = req.query;
    const filter = { business };
    if (store) filter.store = store;
    if (category) filter.productCategory = category;
    if (barcode) filter.barcode = barcode;
    let products = await Inventory.find(filter).populate("supplier store").sort({ createdAt: -1 });
    if (lowStock === "true") {
      products = products.filter(p => Number(p.productQuantity) <= Number(p.reorderLevel ?? 5));
    }
    if (products.length === 0) return res.status(404).json({ message: "No products found", products: [] });
    return res.status(200).json({ message: "Products fetched successfully", products });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "server error" });
  }
};

exports.getInventoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const business = req.user.business; // Get business ID

    if (!id) {
      return res.status(400).json({ message: "Product ID is required" });
    }
    if (!business) {
      return res.status(400).json({ message: "Business ID required" });
    }

    // Find by _id AND business ID
    const product = await Inventory.findOne({ _id: id, business: business });
    if (!product) {
      return res.status(404).json({
        message: "Product not found or does not belong to this business",
      });
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
    const { productId, productQuantity, reason } = req.body;
    const business = req.user.business;
    if (!productId || typeof productQuantity === "undefined") {
      return res.status(400).json({ message: "Product ID and Quantity are required" });
    }
    if (!business) return res.status(400).json({ message: "Business ID required" });

    const product = await Inventory.findOne({ _id: productId, business });
    if (!product) return res.status(404).json({ message: "Product not found or does not belong to this business" });

    const quantityToAdd = parseInt(productQuantity);
    if (isNaN(quantityToAdd)) return res.status(400).json({ message: "Invalid quantity provided." });

    product.productQuantity += quantityToAdd;
    if (product.productQuantity < 0) return res.status(400).json({ message: "Quantity cannot be negative" });
    await product.save();

    // audit log
    try {
      const AuditLog = require("../models/auditLog.model");
      await AuditLog.create({ business, user: req.user.id, action: "inventory.adjust", entity: "Inventory", entityId: product._id, details: { delta: quantityToAdd, reason, newQty: product.productQuantity }, ip: req.ip });
    } catch {}

    // low-stock alert (console + could extend to email)
    if (product.productQuantity <= (product.reorderLevel ?? 5)) {
      console.warn(`Low stock alert: ${product.productName} qty ${product.productQuantity} <= reorder ${product.reorderLevel}`);
    }

    return res.status(200).json({ message: "Inventory adjusted successfully", productName: product.productName, productQuantity: product.productQuantity, lowStock: product.productQuantity <= (product.reorderLevel ?? 5) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "server error" });
  }
};

exports.adjustProductPrice = async (req, res) => {
  try {
    const { productId, productPrice } = req.body;
    const business = req.user.business; // Get business ID

    if (!productId || typeof productPrice === "undefined") {
      // Check for productPrice's existence
      return res
        .status(400)
        .json({ message: "Product ID and Price are required" });
    }
    if (!business) {
      return res.status(400).json({ message: "Business ID required" });
    }

    // Find by _id AND business ID
    const product = await Inventory.findOne({
      _id: productId,
      business: business,
    });
    if (!product) {
      return res.status(404).json({
        message: "Product not found or does not belong to this business",
      });
    }

    // Ensure productPrice is a valid number
    const newPrice = parseFloat(productPrice);
    if (isNaN(newPrice) || newPrice < 0) {
      // Assuming price cannot be negative
      return res
        .status(400)
        .json({ message: "Invalid product price provided." });
    }

    product.productPrice = newPrice;
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
    const { id } = req.params;
    const business = req.user.business; // Get business ID

    if (!id) {
      return res.status(400).json({ message: "Product ID is required" });
    }
    if (!business) {
      return res.status(400).json({ message: "Business ID required" });
    }

    // Find and delete by _id AND business ID
    const product = await Inventory.findOneAndDelete({
      _id: id,
      business: business,
    });
    if (!product) {
      return res.status(404).json({
        message: "Product not found or does not belong to this business",
      });
    }
    return res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
};

exports.uploadProductByXlsx = async (req, res) => {
  try {
    const business = req.user.business; // Get business ID from token
    if (!business) {
      return res
        .status(400)
        .json({ message: "Business ID not found in token." });
    }

    const xlsx = require("xlsx");
    const xlsxFile = req.file;
    // console.log("Received file:", xlsxFile);
    // console.log("File path:", xlsxFile ? xlsxFile.path : "No file uploaded");
    // console.log("reqqbody: ", req.body); // req.body might be empty here as file is processed

    if (!xlsxFile) {
      return res.status(400).json({ message: "Please upload an xlsx file" });
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
      business: business, // Assign the business ID here
    }));

    // Check for existing products within the *same business*
    const existingProducts = await Inventory.find({
      productBatchNumber: { $in: products.map((p) => p.productBatchNumber) },
      business: business, // Filter by business as well
    });

    if (existingProducts.length > 0) {
      return res.status(400).json({
        message:
          "Some products with the same batch number already exist for this business.",
      });
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

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;
    const business = req.user.business; // Get business ID

    if (!id) {
      return res.status(400).json({ message: "Product ID is required" });
    }
    if (!business) {
      return res.status(400).json({ message: "Business ID required" });
    }

    // Find and update by _id AND business ID
    const product = await Inventory.findOneAndUpdate(
      { _id: id, business: business },
      updateFields,
      { new: true }
    );
    if (!product) {
      return res.status(404).json({
        message: "Product not found or does not belong to this business",
      });
    }
    return res
      .status(200)
      .json({ message: "Product updated successfully", product });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
};

exports.bulkDeleteProducts = async (req, res) => {
  try {
    const { ids } = req.body; // array of product IDs
    const business = req.user.business; // Get business ID

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No product IDs provided" });
    }
    if (!business) {
      return res.status(400).json({ message: "Business ID required" });
    }

    // Delete products by _id (if they are in the provided list) AND business ID
    const result = await Inventory.deleteMany({
      _id: { $in: ids },
      business: business,
    });
    if (result.deletedCount === 0) {
      return res.status(404).json({
        message:
          "No products found to delete or they don't belong to this business.",
      });
    }
    return res
      .status(200)
      .json({ message: "Products deleted", deletedCount: result.deletedCount });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
};

exports.exportInventoryCsv = async (req, res) => {
  try {
    const business = req.user.business; // Get business ID
    if (!business) {
      return res.status(400).json({ message: "Business ID required" });
    }

    const inventory = await Inventory.find({ business }).lean(); // Filter by business
    if (!inventory.length) {
      return res
        .status(404)
        .json({ message: "No inventory found for this business" });
    }

    const fields = [
      "productName",
      "productPrice",
      "productQuantity",
      "productDescription",
      "productCategory",
      "productBatchNumber",
      "business", // Optionally include business ID in the export
    ];
    const parser = new Parser({ fields });
    const csv = parser.parse(inventory);

    res.header("Content-Type", "text/csv");
    res.attachment("inventory.csv");
    return res.send(csv);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
};
exports.exportInventoryExcel = async (req, res) => {
  try {
    const business = req.user.business; // Get business ID
    if (!business) {
      return res.status(400).json({ message: "Business ID required" });
    }

    const inventory = await Inventory.find({ business }).lean(); // Filter by business
    if (!inventory.length) {
      return res
        .status(404)
        .json({ message: "No inventory found for this business" });
    }

    const worksheet = XLSX.utils.json_to_sheet(inventory);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.header(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.attachment("inventory.xlsx");
    return res.send(buffer);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
};

//export pdf
exports.exportInventoryPdf = async (req, res) => {
  try {
    const business = req.user.business; // Get business ID
    if (!business) {
      return res.status(400).json({ message: "Business ID required" });
    }

    const inventory = await Inventory.find({ business }).lean(); // Filter by business
    if (!inventory.length) {
      return res
        .status(404)
        .json({ message: "No inventory found for this business" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=inventory.pdf");

    const doc = new PDFDocument();
    doc.pipe(res);

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
        // Optionally, include business ID for internal reports
        // .text(`Business ID: ${item.business}`)
        .moveDown();
    });

    doc.end();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
};

exports.lookupByBarcode = async (req, res) => {
  try {
    const { barcode } = req.params;
    const business = req.user.business;
    if (!barcode) return res.status(400).json({ message: "Barcode required" });
    const product = await Inventory.findOne({ barcode, business }).populate("supplier store");
    if (!product) return res.status(404).json({ message: "Product not found for this barcode" });
    res.json({ product });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Barcode lookup failed" });
  }
};

exports.getLowStock = async (req, res) => {
  try {
    const business = req.user.business;
    const products = await Inventory.find({ business }).lean();
    const low = products.filter(p => Number(p.productQuantity) <= Number(p.reorderLevel ?? 5));
    res.json({ lowStock: low, count: low.length });
  } catch (e) {
    res.status(500).json({ message: "Failed to get low stock" });
  }
};

exports.getValuation = async (req, res) => {
  try {
    const business = req.user.business;
    const { store } = req.query;
    const svc = require("../services/inventoryValuation");
    const val = await svc.getValuation(business, store);
    res.json(val);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Valuation failed" });
  }
};

exports.stocktake = async (req, res) => {
  try {
    const business = req.user.business;
    const { counts } = req.body; // [{productId, countedQuantity}]
    if (!Array.isArray(counts)) return res.status(400).json({ message: "counts array required" });
    const results = [];
    for (const c of counts) {
      const prod = await Inventory.findOne({ _id: c.productId, business });
      if (!prod) { results.push({ productId: c.productId, error: "not found" }); continue; }
      const diff = Number(c.countedQuantity) - Number(prod.productQuantity);
      prod.productQuantity = Number(c.countedQuantity);
      await prod.save();
      results.push({ productId: c.productId, productName: prod.productName, diff, newQty: prod.productQuantity });
      try {
        const AuditLog = require("../models/auditLog.model");
        await AuditLog.create({ business, user: req.user.id, action: "inventory.stocktake", entity: "Inventory", entityId: prod._id, details: { counted: c.countedQuantity, diff }, ip: req.ip });
      } catch {}
    }
    res.json({ results });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Stocktake failed" });
  }
};

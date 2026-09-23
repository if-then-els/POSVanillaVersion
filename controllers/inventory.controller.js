const Inventory = require("../models/inventory");
const Store = require("../models/store.model");
const StockMovement = require("../models/stockMovement.model");
const mongoose = require("mongoose");
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

    const filter = { business };
    if (req.query.store) filter.store = req.query.store;
    const inventory = await Inventory.find(filter).populate("store", "name").lean();
    if (!inventory.length) {
      return res
        .status(404)
        .json({ message: "No inventory found for this business" });
    }

    const rows = inventory.map((i) => ({ ...i, store: i.store?.name || "Default" }));
    const fields = [
      "productName",
      "productPrice",
      "productQuantity",
      "productDescription",
      "productCategory",
      "productBatchNumber",
      "store",
    ];
    const parser = new Parser({ fields });
    const csv = parser.parse(rows);

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

    const filter = { business };
    if (req.query.store) filter.store = req.query.store;
    const inventory = await Inventory.find(filter).populate("store", "name").lean();
    if (!inventory.length) {
      return res
        .status(404)
        .json({ message: "No inventory found for this business" });
    }

    const rows = inventory.map((i) => ({ ...i, store: i.store?.name || "Default" }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
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

// ---------------------------------------------------------------------------
// Store-scoped operations + disposal/loss ledger (admin workflows)
// ---------------------------------------------------------------------------

async function assertStoreInBusiness(storeId, business) {
  if (!storeId) return null;
  const store = await Store.findOne({ _id: storeId, business });
  return store || null;
}

async function logMovement(doc) {
  const movement = await StockMovement.create(doc);
  try {
    const AuditLog = require("../models/auditLog.model");
    await AuditLog.create({
      business: doc.business,
      user: doc.user,
      action: `inventory.${doc.kind}`,
      entity: "StockMovement",
      entityId: movement._id,
      details: {
        product: doc.product,
        store: doc.store,
        quantity: doc.quantity,
        reason: doc.reason,
      },
      ip: doc.ip,
    });
  } catch {}
  return movement;
}

// Admin disposes stock (damaged/expired) or marks it as loss (theft/shrinkage).
// The quantity leaves inventory permanently and is recorded at cost value so
// finance can count it in loss reports.
exports.disposeProduct = async (req, res) => {
  try {
    const business = req.user.business;
    const { productId, quantity, kind, reason } = req.body;

    if (!["disposal", "loss"].includes(kind)) {
      return res.status(400).json({ message: "kind must be 'disposal' or 'loss'" });
    }
    const qty = Math.floor(Number(quantity));
    if (!productId || !Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ message: "productId and a positive quantity are required" });
    }
    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ message: "A reason is required for audit purposes" });
    }

    const product = await Inventory.findOne({ _id: productId, business }).populate("store", "name");
    if (!product) {
      return res.status(404).json({ message: "Product not found or does not belong to this business" });
    }
    if (Number(product.productQuantity) < qty) {
      return res.status(400).json({
        message: `Insufficient stock for ${product.productName} (have ${product.productQuantity}, need ${qty})`,
      });
    }

    const unitCost = Number(product.costPrice ?? 0) || 0;
    product.productQuantity = Number(product.productQuantity) - qty;
    await product.save();

    const movement = await logMovement({
      business,
      product: product._id,
      store: product.store?._id || product.store || undefined,
      kind,
      quantity: qty,
      unitCost,
      totalCost: unitCost * qty,
      reason: String(reason).trim().slice(0, 500),
      balanceAfter: product.productQuantity,
      user: req.user.id,
      ip: req.ip,
    });

    return res.status(200).json({
      message: `${kind === "disposal" ? "Disposed" : "Marked as loss"}: ${qty} × ${product.productName}`,
      movement,
      productQuantity: product.productQuantity,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Move stock between two stores of the same business. The destination row is
// matched by (batch number + store) and created (as a copy) when missing, so
// every store carries its own row per product.
exports.transferStock = async (req, res) => {
  try {
    const business = req.user.business;
    const { productId, toStore, quantity } = req.body;

    const qty = Math.floor(Number(quantity));
    if (!productId || !toStore || !Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ message: "productId, toStore and a positive quantity are required" });
    }

    const source = await Inventory.findOne({ _id: productId, business }).populate("store", "name");
    if (!source) {
      return res.status(404).json({ message: "Product not found or does not belong to this business" });
    }
    const fromStoreId = source.store?._id?.toString() || source.store?.toString() || null;
    if (fromStoreId && fromStoreId === String(toStore)) {
      return res.status(400).json({ message: "Source and destination stores are the same" });
    }

    const destStore = await assertStoreInBusiness(toStore, business);
    if (!destStore) {
      return res.status(404).json({ message: "Destination store not found in this business" });
    }
    if (fromStoreId) {
      const srcStore = await assertStoreInBusiness(fromStoreId, business);
      if (!srcStore) {
        return res.status(400).json({ message: "Source store no longer exists" });
      }
    }
    if (Number(source.productQuantity) < qty) {
      return res.status(400).json({
        message: `Insufficient stock in ${source.store?.name || "Default"} (have ${source.productQuantity}, need ${qty})`,
      });
    }

    const crypto = require("crypto");
    const transferId = `TRF-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    const unitCost = Number(source.costPrice ?? 0) || 0;

    // Decrement source (guarded against concurrent sales/transfers).
    const updatedSource = await Inventory.findOneAndUpdate(
      { _id: source._id, business, productQuantity: { $gte: qty } },
      { $inc: { productQuantity: -qty } },
      { new: true }
    );
    if (!updatedSource) {
      return res.status(409).json({ message: "Concurrent stock update failed, please retry" });
    }

    // Find or create the destination row for the same batch in the target store.
    let dest = await Inventory.findOne({
      business,
      productBatchNumber: source.productBatchNumber,
      store: destStore._id,
    });
    if (!dest) {
      dest = await Inventory.create({
        productName: source.productName,
        productPrice: source.productPrice,
        productQuantity: 0,
        productDescription: source.productDescription,
        productCategory: source.productCategory,
        productBatchNumber: source.productBatchNumber,
        sku: source.sku || undefined,
        barcode: source.barcode || undefined,
        costPrice: source.costPrice,
        reorderLevel: source.reorderLevel ?? 5,
        expiryDate: source.expiryDate || undefined,
        supplier: source.supplier || undefined,
        store: destStore._id,
        business,
      });
    }
    dest.productQuantity = Number(dest.productQuantity) + qty;
    await dest.save();

    await logMovement({
      business,
      product: source._id,
      store: fromStoreId || undefined,
      kind: "transfer_out",
      quantity: qty,
      unitCost,
      totalCost: unitCost * qty,
      reason: `Transfer to ${destStore.name}`,
      transferId,
      relatedStore: destStore._id,
      balanceAfter: updatedSource.productQuantity,
      user: req.user.id,
      ip: req.ip,
    });
    await logMovement({
      business,
      product: dest._id,
      store: destStore._id,
      kind: "transfer_in",
      quantity: qty,
      unitCost,
      totalCost: unitCost * qty,
      reason: `Transfer from ${source.store?.name || "Default"}`,
      transferId,
      relatedStore: fromStoreId || undefined,
      balanceAfter: dest.productQuantity,
      user: req.user.id,
      ip: req.ip,
    });

    return res.status(200).json({
      message: `Transferred ${qty} × ${source.productName} to ${destStore.name}`,
      transferId,
      sourceQuantity: updatedSource.productQuantity,
      destQuantity: dest.productQuantity,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Side-by-side comparison of selected stores: totals + per-product matrix.
exports.compareStores = async (req, res) => {
  try {
    const business = req.user.business;
    const ids = String(req.query.stores || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 6);
    if (ids.length < 2) {
      return res.status(400).json({ message: "Select at least two stores to compare (max 6)" });
    }

    const stores = await Store.find({ _id: { $in: ids }, business }).lean();
    if (stores.length < 2) {
      return res.status(404).json({ message: "Stores not found in this business" });
    }

    const products = await Inventory.find({
      business,
      store: { $in: stores.map((s) => s._id) },
    })
      .select("productName productCategory productPrice productQuantity costPrice reorderLevel store productBatchNumber")
      .lean();

    const summaries = stores.map((s) => {
      const rows = products.filter((p) => String(p.store) === String(s._id));
      const units = rows.reduce((n, p) => n + (Number(p.productQuantity) || 0), 0);
      const value = rows.reduce(
        (n, p) => n + (Number(p.productQuantity) || 0) * (Number(p.costPrice ?? p.productPrice) || 0),
        0
      );
      const low = rows.filter((p) => Number(p.productQuantity) <= Number(p.reorderLevel ?? 5)).length;
      return {
        storeId: s._id,
        name: s.name,
        location: s.location || "",
        products: rows.length,
        units,
        stockValue: Math.round(value * 100) / 100,
        lowStock: low,
      };
    });

    // Matrix keyed by batch number (same product across stores).
    const byBatch = {};
    products.forEach((p) => {
      const key = p.productBatchNumber || String(p._id);
      if (!byBatch[key]) {
        byBatch[key] = {
          batch: p.productBatchNumber || "",
          name: p.productName,
          category: p.productCategory || "",
          price: p.productPrice,
          perStore: {},
        };
      }
      byBatch[key].perStore[String(p.store)] =
        (byBatch[key].perStore[String(p.store)] || 0) + (Number(p.productQuantity) || 0);
    });
    const matrix = Object.values(byBatch)
      .map((row) => {
        const qtys = stores.map((s) => row.perStore[String(s._id)] || 0);
        return {
          ...row,
          quantities: qtys,
          total: qtys.reduce((a, b) => a + b, 0),
          spread: Math.max(...qtys) - Math.min(...qtys),
        };
      })
      .filter((row) => stores.filter((s) => (row.perStore[String(s._id)] || 0) > 0).length > 0)
      .sort((a, b) => b.spread - a.spread)
      .slice(0, 200);

    return res.status(200).json({ stores: summaries, matrix });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Sync product catalog from one store to others: creates MISSING rows with
// zero quantity. Never changes existing quantities - safe by design.
exports.syncStores = async (req, res) => {
  try {
    const business = req.user.business;
    const { sourceStore, targetStores } = req.body;

    if (!sourceStore || !Array.isArray(targetStores) || targetStores.length === 0) {
      return res.status(400).json({ message: "sourceStore and at least one target store are required" });
    }
    const targets = [...new Set(targetStores.map(String))].filter((id) => id !== String(sourceStore)).slice(0, 10);
    if (targets.length === 0) {
      return res.status(400).json({ message: "No valid target stores" });
    }

    const source = await assertStoreInBusiness(sourceStore, business);
    if (!source) return res.status(404).json({ message: "Source store not found in this business" });
    const destStores = await Store.find({ _id: { $in: targets }, business }).lean();
    if (destStores.length !== targets.length) {
      return res.status(404).json({ message: "One or more target stores not found in this business" });
    }

    const sourceRows = await Inventory.find({ business, store: source._id }).lean();
    if (sourceRows.length === 0) {
      return res.status(400).json({ message: `Source store "${source.name}" has no products to sync` });
    }

    let created = 0;
    const perStore = {};
    for (const dest of destStores) {
      const existing = await Inventory.find({ business, store: dest._id })
        .select("productBatchNumber")
        .lean();
      const haveBatches = new Set(existing.map((r) => r.productBatchNumber));
      const missing = sourceRows.filter((r) => !haveBatches.has(r.productBatchNumber));
      for (const row of missing) {
        await Inventory.create({
          productName: row.productName,
          productPrice: row.productPrice,
          productQuantity: 0,
          productDescription: row.productDescription,
          productCategory: row.productCategory,
          productBatchNumber: row.productBatchNumber,
          sku: row.sku || undefined,
          barcode: row.barcode || undefined,
          costPrice: row.costPrice,
          reorderLevel: row.reorderLevel ?? 5,
          expiryDate: row.expiryDate || undefined,
          supplier: row.supplier || undefined,
          store: dest._id,
          business,
        });
        created += 1;
      }
      perStore[String(dest._id)] = { name: dest.name, created: missing.length };

      try {
        const AuditLog = require("../models/auditLog.model");
        await AuditLog.create({
          business,
          user: req.user.id,
          action: "inventory.sync",
          entity: "Store",
          entityId: dest._id,
          details: { sourceStore: source._id, created: missing.length },
          ip: req.ip,
        });
      } catch {}
    }

    return res.status(200).json({
      message: `Sync complete: ${created} product row(s) created across ${destStores.length} store(s). Quantities untouched.`,
      created,
      perStore,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Paginated ledger of stock movements (disposals, losses, transfers).
exports.getMovements = async (req, res) => {
  try {
    const business = req.user.business;
    const { store, kind, from, to } = req.query;
    let { page = 1, limit = 20 } = req.query;
    page = Math.max(1, parseInt(page, 10) || 1);
    limit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const filter = { business };
    if (store) filter.store = store;
    if (kind) {
      if (!["disposal", "loss", "transfer_out", "transfer_in", "adjustment"].includes(kind)) {
        return res.status(400).json({ message: "Invalid movement kind" });
      }
      filter.kind = kind;
    }
    if (from || to) {
      filter.createdAt = {};
      if (from) {
        const f = new Date(from);
        if (!isNaN(f)) {
          f.setHours(0, 0, 0, 0);
          filter.createdAt.$gte = f;
        }
      }
      if (to) {
        const t = new Date(to);
        if (!isNaN(t)) {
          t.setHours(23, 59, 59, 999);
          filter.createdAt.$lte = t;
        }
      }
      if (!Object.keys(filter.createdAt).length) delete filter.createdAt;
    }

    const [movements, total] = await Promise.all([
      StockMovement.find(filter)
        .populate("product", "productName productBatchNumber productCategory")
        .populate("store", "name")
        .populate("relatedStore", "name")
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      StockMovement.countDocuments(filter),
    ]);

    const matchBiz = new mongoose.Types.ObjectId(business);
    const totalsMatch = { business: matchBiz };
    if (store) {
      try {
        totalsMatch.store = new mongoose.Types.ObjectId(store);
      } catch (_) {
        /* invalid store id - totals stay global */
      }
    }
    const totals = await StockMovement.aggregate([
      { $match: totalsMatch },
      { $group: { _id: "$kind", quantity: { $sum: "$quantity" }, cost: { $sum: "$totalCost" } } },
    ]);

    return res.status(200).json({
      movements,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      currentPage: page,
      totals,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

const Sale = require("../models/sale");
const Inventory = require("../models/inventory");
const Settings = require("../models/settings");
const mongoose = require("mongoose");

exports.processSale = async (req, res) => {
  let session = null;
  let useTxn = true;
  try {
    const business = req.user.business;
    const cashierId = req.user.id;
    const { items, total, customerName, paymentMethod, store, offlineId, splitPayments, discount, taxRate } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0 || !business) {
      return res.status(400).json({ message: "No sale items or business provided" });
    }

    if (offlineId) {
      const existing = await Sale.findOne({ offlineId, business });
      if (existing) {
        return res.status(200).json({ message: "Sale already processed (idempotent)", sale: existing, duplicate: true });
      }
    }

    const allowedMethods = ["cash", "mpesa", "mpesa_stk", "mpesa_paybill", "paystack", "card", "bank", "split", "paypal", "mobile_money"];
    if (paymentMethod && !allowedMethods.includes(paymentMethod)) {
      return res.status(400).json({ message: `Invalid paymentMethod: ${paymentMethod}` });
    }

    let saleResult = null;
    const doSale = async (sess) => {
      for (const item of items) {
        if (!item.productId || !item.quantity || item.quantity <= 0) {
          throw new Error(`Invalid item: ${JSON.stringify(item)}`);
        }
        const q = { _id: item.productId, business };
        const product = sess ? await Inventory.findOne(q).session(sess) : await Inventory.findOne(q);
        if (!product) throw Object.assign(new Error(`Product not found: ${item.productId}`), { status: 404 });
        if (product.productQuantity < item.quantity) {
          throw Object.assign(new Error(`Insufficient stock for ${product.productName} (have ${product.productQuantity}, need ${item.quantity})`), { status: 400 });
        }
        const updOpts = sess ? { new: true, session: sess } : { new: true };
        const updated = await Inventory.findOneAndUpdate(
          { _id: item.productId, business, productQuantity: { $gte: item.quantity } },
          { $inc: { productQuantity: -item.quantity } },
          updOpts
        );
        if (!updated) throw Object.assign(new Error(`Concurrent stock update failed for ${product.productName}`), { status: 409 });
      }
      const sale = new Sale({
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, price: i.price, costPrice: i.costPrice })),
        subtotal: items.reduce((s, i) => s + (Number(i.price) * Number(i.quantity)), 0),
        discount: discount || 0,
        taxRate: taxRate || 0,
        total,
        customerName,
        paymentMethod: paymentMethod || "cash",
        paymentStatus: "paid",
        splitPayments,
        offlineId,
        store: store || undefined,
        business,
        cashier: cashierId,
        receiptNo: `RCT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      });
      if (sess) await sale.save({ session: sess });
      else await sale.save();
      saleResult = sale;
      try {
        const AuditLog = require("../models/auditLog.model");
        const doc = { business, user: cashierId, action: "sale.create", entity: "Sale", entityId: sale._id, details: { total, items: items.length, paymentMethod }, ip: req.ip };
        if (sess) await AuditLog.create([doc], { session: sess });
        else await AuditLog.create(doc);
      } catch (_) {}
    };

    try {
      session = await mongoose.startSession();
      await session.withTransaction(() => doSale(session));
    } catch (txnErr) {
      // Fallback if replica set not available
      if (txnErr.message && txnErr.message.includes("Transaction numbers are only allowed on a replica set")) {
        console.warn("Replica set not available, falling back to non-transactional sale");
        useTxn = false;
        saleResult = null;
        await doSale(null);
      } else {
        throw txnErr;
      }
    } finally {
      if (session) session.endSession();
    }

    const populated = await Sale.findById(saleResult._id).populate("items.productId");
    res.status(201).json({ message: "Sale processed successfully", sale: populated });
  } catch (error) {
    console.error("processSale error:", error);
    const status = error.status || 500;
    res.status(status).json({ message: error.message || "Server error" });
    if (session) try { session.endSession(); } catch {}
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
    const sale = await Sale.findOne({ _id: saleId, business: req.user.business }).populate("items.productId");
    if (!sale) return res.status(404).json({ message: "Sale not found or not in your business" });

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

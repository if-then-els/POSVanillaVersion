const Sale = require("../models/sale");
const Inventory = require("../models/inventory");
const Settings = require("../models/settings");
const BusinessDetails = require("../models/businessDetails");
const User = require("../models/user");
const Store = require("../models/store.model");
const mongoose = require("mongoose");

exports.processSale = async (req, res) => {
  let session = null;
  let useTxn = true;
  try {
    const business = req.user.business;
    const cashierId = req.user.id;
    const { items, total, customerName, customerPhone, customerEmail, paymentMethod, store, offlineId, splitPayments, discount, taxRate, mpesaReceipt, bankRef, amountTendered, changeGiven } = req.body;
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
      // Snapshot business / store / cashier so the stored receipt copy stays
      // accurate even if settings change later (accountability).
      let businessSnap = {};
      let storeSnap = {};
      let cashierName = "";
      try {
        const [biz, cashierUser, storeDoc] = await Promise.all([
          BusinessDetails.findById(business).select("businessName businessLocation businessPhone businessEmail").lean(),
          User.findById(cashierId).select("name email role").lean(),
          store ? Store.findById(store).select("name location phone").lean() : Promise.resolve(null),
        ]);
        if (biz) businessSnap = { name: biz.businessName, location: biz.businessLocation, phone: biz.businessPhone, email: biz.businessEmail };
        if (storeDoc) storeSnap = { name: storeDoc.name, location: storeDoc.location, phone: storeDoc.phone };
        if (cashierUser) cashierName = cashierUser.name || cashierUser.email || "";
      } catch (_) { /* snapshots are best-effort; sale must still succeed */ }
      const subtotalCalc = items.reduce((s, i) => s + (Number(i.price) * Number(i.quantity)), 0);
      const discountVal = Number(discount) || 0;
      const taxRateVal = Number(taxRate) || 0;
      const taxAmountCalc = Math.max(0, subtotalCalc - discountVal) * (taxRateVal / 100);
      const sale = new Sale({
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, price: i.price, costPrice: i.costPrice })),
        subtotal: subtotalCalc,
        discount: discountVal,
        taxRate: taxRateVal,
        taxAmount: taxAmountCalc,
        total,
        customerName: customerName || "Walk-in",
        customerPhone: customerPhone || "",
        customerEmail: customerEmail || "",
        bankRef: bankRef || "",
        cashierName,
        amountTendered: amountTendered != null ? Number(amountTendered) : undefined,
        changeGiven: changeGiven != null ? Number(changeGiven) : undefined,
        businessSnapshot: businessSnap,
        storeSnapshot: storeSnap,
        paymentMethod: paymentMethod || "cash",
        paymentStatus: "paid",
        splitPayments,
        mpesaReceipt: mpesaReceipt || "",
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

    const populated = await Sale.findById(saleResult._id).populate("items.productId").populate("cashier", "name email role");
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
    // Date-sortable receipts: ?from=YYYY-MM-DD&to=YYYY-MM-DD&sort=newest|oldest&limit=N
    const q = { business };
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;
    if ((from && !isNaN(from)) || (to && !isNaN(to))) {
      q.createdAt = {};
      if (from && !isNaN(from)) q.createdAt.$gte = new Date(from.setHours(0,0,0,0));
      if (to && !isNaN(to)) { const t = new Date(to); t.setHours(23,59,59,999); q.createdAt.$lte = t; }
    }
    const sortDir = req.query.sort === "oldest" ? 1 : -1;
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 200, 1), 1000);
    const sales = await Sale.find(q)
      .sort({ createdAt: sortDir })
      .limit(limit)
      .populate("items.productId")
      .populate("cashier", "name email role")
      .populate("store", "name location");
    res.status(200).json({ sales });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.getReceipt = async (req, res) => {
  try {
    const { saleId } = req.params;
    const sale = await Sale.findOne({ _id: saleId, business: req.user.business })
      .populate("items.productId")
      .populate("cashier", "name email role")
      .populate("store", "name location phone");
    if (!sale) return res.status(404).json({ message: "Sale not found or not in your business" });

    // Real business info first; settings only override display prefs.
    // Never 404 when settings are missing — fall back to BusinessDetails snapshot.
    const [settings, biz] = await Promise.all([
      Settings.findOne({ business: req.user.business }).lean(),
      BusinessDetails.findById(req.user.business).select("businessName businessLocation businessPhone businessEmail").lean(),
    ]);

    const s = sale.toObject();
    const subtotal = s.subtotal ?? sale.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discount = s.discount ?? 0;
    const taxRate = s.taxRate ?? settings?.taxRate ?? 0;
    const taxAmount = s.taxAmount ?? (Math.max(0, subtotal - discount) * (taxRate / 100));
    const grandTotal = s.total;

    const cashierName = s.cashierName
      || sale.cashier?.name
      || sale.cashier?.email
      || "Staff";
    const cashierRole = sale.cashier?.role || "";
    const receiptNo = s.receiptNo || s.receiptNumber || sale._id.toString().slice(-8).toUpperCase();

    // Business block: live BusinessDetails > stored snapshot > store settings.
    const business = {
      name: biz?.businessName || s.businessSnapshot?.name || settings?.storeName || "My Store",
      address: biz?.businessLocation || s.businessSnapshot?.location || settings?.storeAddress || "",
      phone: biz?.businessPhone || s.businessSnapshot?.phone || settings?.storePhone || "",
      email: biz?.businessEmail || s.businessSnapshot?.email || settings?.storeEmail || "",
    };
    const storeBlock = {
      name: sale.store?.name || s.storeSnapshot?.name || "",
      location: sale.store?.location || s.storeSnapshot?.location || "",
      phone: sale.store?.phone || s.storeSnapshot?.phone || "",
    };

    res.json({
      sale: {
        ...s,
        receiptNo,
        receiptNumber: receiptNo, // legacy frontend key
        items: sale.items.map((item) => ({
          productName: item.productId?.productName || "Unknown",
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
        })),
        subtotal,
        discount,
        taxRate,
        taxAmount,
        grandTotal,
        cashierName,
        cashierRole,
        createdAt: s.createdAt,
        customerName: s.customerName || "Walk-in",
      },
      business,
      store: storeBlock,
      settings: settings ? {
        currency: settings.currency || "KES",
        showLogo: settings.showLogo,
        showTax: settings.showTax,
        includeContact: settings.includeContact,
        footerText: settings.footerText || "",
        logoUrl: settings.logoUrl || "",
        taxRate,
      } : { currency: "KES", taxRate },
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

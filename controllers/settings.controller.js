const Settings = require("../models/settings");
const Users = require("../models/user");
const PaymentMethod = require("../models/paymentMethod");
const BusinessDetails = require("../models/businessDetails");
const CheckoutPayment = require("../models/CheckoutPayment");
const axios = require("axios");
const mongoose = require("mongoose");
const multer = require("multer");

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/logos/");
  },
  filename: (req, file, cb) => {
    cb(null, `logo-${Date.now()}${path.extname(file.originalname)}`);
  },
});

// Initialize logos
const logos = multer({
  storage,
  limits: { fileSize: 1000000 }, // 1MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = filetypes.test(file.mimetype);
    mimetype && extname ? cb(null, true) : cb("Error: Images Only!");
  },
}).single("logo");

// Get all settings for the current business
exports.getSettings = async (req, res) => {
  try {
    const business = req.user.business;
    let settings = await Settings.findOne({ business });
    if (!settings) {
      settings = new Settings({ business });
      await settings.save();
    }
    res.json({
      storeName: settings.storeName || "",
      storeAddress: settings.storeAddress || "",
      storePhone: settings.storePhone || "",
      storeEmail: settings.storeEmail || "",
      taxRate: settings.taxRate || 0,
      currency: settings.currency || "KES",
      showLogo: settings.showLogo,
      showTax: settings.showTax,
      includeContact: settings.includeContact,
      printAuto: settings.printAuto,
      footerText: settings.footerText || "",
      logoUrl: settings.logoUrl || "",
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch settings", error: err });
  }
};

// Update all settings for the current business
exports.updateSettings = async (req, res) => {
  try {
    const business = req.user.business;
    let settings = await Settings.findOne({ business });
    if (!settings) settings = new Settings({ business });
    Object.assign(settings, req.body);
    await settings.save();
    res.json({ success: true, message: "Settings updated", settings });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to update settings",
      error: err,
    });
  }
};

// Save or update store settings (name, address, phone, email, tax, currency, logo)
exports.saveStoreSettings = async (req, res) => {
  try {
    logos(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err,
        });
      }

      const business = req.user.business;
      let settings = await Settings.findOne({ business });
      if (!settings) settings = new Settings({ business });

      settings.storeName = req.body.name;
      settings.storeAddress = req.body.address;
      settings.storePhone = req.body.phone;
      settings.storeEmail = req.body.email;
      settings.taxRate = req.body.taxRate;
      settings.currency = req.body.currency;

      // Handle logo logos
      if (req.file) {
        settings.logoUrl = `/logos/${req.file.filename}`;
      }

      await settings.save();
      res.json({
        success: true,
        message: "Store settings saved",
        settings,
      });
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to save store settings",
      error: err.message,
    });
  }
};

exports.getStoreSettings = async (req, res) => {
  try {
    const business = req.user.business;
    let settings = await Settings.findOne({ business });
    if (!settings) {
      settings = new Settings({ business });
      await settings.save();
    }
    res.json({
      storeName: settings.storeName || "",
      storeAddress: settings.storeAddress || "",
      storePhone: settings.storePhone || "",
      storeEmail: settings.storeEmail || "",
      taxRate: settings.taxRate || 0,
      currency: settings.currency || "KES",
      showLogo: settings.showLogo,
      showTax: settings.showTax,
      includeContact: settings.includeContact,
      printAuto: settings.printAuto,
      footerText: settings.footerText || "",
      logoUrl: settings.logoUrl || "",
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch store settings", error: err });
  }
};

// Get receipt settings for the current business
exports.getReceiptSettings = async (req, res) => {
  try {
    const business = req.user.business;
    let settings = await Settings.findOne({ business });
    if (!settings) settings = new Settings({ business });
    res.json({
      showLogo: settings.showLogo,
      showTaxDetails: settings.showTax,
      includeContactInfo: settings.includeContact,
      printAutomatically: settings.printAuto,
      footerText: settings.footerText || "",
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch receipt settings", error: err });
  }
};

// Update receipt settings for the current business
exports.saveReceiptSettings = async (req, res) => {
  try {
    const business = req.user.business;
    let settings = await Settings.findOne({ business });
    if (!settings) settings = new Settings({ business });
    settings.showLogo = req.body.showLogo;
    settings.showTax = req.body.showTaxDetails;
    settings.includeContact = req.body.includeContactInfo;
    settings.printAuto = req.body.printAutomatically;
    settings.footerText = req.body.footerText;
    await settings.save();
    res.json({ success: true, message: "Receipt settings saved", settings });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to save receipt settings",
      error: err,
    });
  }
};

// Get user settings (username, email) for the current user
exports.getUserSettings = async (req, res) => {
  try {
    const user = await Users.findById(req.user.id);

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({
      username: user.userName || user.username,
      email: user.email,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch user settings", error: err });
  }
};

// Update user settings (username, email, password)
exports.updateUserSettings = async (req, res) => {
  try {
    const user = await Users.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Update username/email
    if (req.body.username) user.username = req.body.username;
    if (req.body.email) user.email = req.body.email;

    // Handle password change
    if (req.body.currentPassword && req.body.newPassword) {
      const bcrypt = require("bcrypt");
      const valid = await bcrypt.compare(
        req.body.currentPassword,
        user.password,
      );
      if (!valid) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      }
      if (req.body.newPassword !== req.body.confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match" });
      }
      user.password = await bcrypt.hash(req.body.newPassword, 10);
    }

    await user.save();
    res.json({ success: true, message: "User settings updated" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to update user settings", error: err });
  }
};

// Get payment methods for checkout
exports.getPaymentMethods = async (req, res) => {
  try {
    let business = await BusinessDetails.findOne({ users: req.user.id });
    if (!business) {
      return res.json({ success: true, methods: [] });
    }
    const methods = await PaymentMethod.find({
      businessId: business._id,
      active: true,
    });
    res.json({ success: true, methods });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Add a new payment method for checkout
exports.addPaymentMethod = async (req, res) => {
  try {
    console.log("user id in addPaymentMethod:", req.user.id);
    let business = await BusinessDetails.findOne({ users: req.user.id });
    if (!business) {
      return res.status(400).json({
        success: false,
        message:
          "Please complete your business registration first before adding payment methods.",
      });
    }

    const method = await PaymentMethod.create({
      businessId: business._id,
      type: req.body.type,
      provider: req.body.provider,
      label: req.body.label,
      config: req.body.config,
      active: true,
    });

    res.status(201).json({ success: true, method });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update a payment method
exports.updatePaymentMethod = async (req, res) => {
  try {
    const method = await PaymentMethod.findById(req.params.id);
    if (!method) {
      return res
        .status(404)
        .json({ success: false, message: "Payment method not found" });
    }

    // Verify ownership
    let business = await BusinessDetails.findOne({ users: req.user.id });
    if (!business || method.businessId.toString() !== business._id.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    if (req.body.type) method.type = req.body.type;
    if (req.body.provider) method.provider = req.body.provider;
    if (req.body.label) method.label = req.body.label;
    if (req.body.config) method.config = req.body.config;
    if (req.body.active !== undefined) method.active = req.body.active;

    await method.save();
    res.json({ success: true, method });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete a payment method
exports.deletePaymentMethod = async (req, res) => {
  try {
    const method = await PaymentMethod.findById(req.params.id);
    if (!method) {
      return res
        .status(404)
        .json({ success: false, message: "Payment method not found" });
    }

    // Verify ownership
    let business = await BusinessDetails.findOne({ users: req.user.id });
    if (!business || method.businessId.toString() !== business._id.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    method.active = false;
    await method.save();
    res.json({ success: true, message: "Payment method removed" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Helper: Get M-Pesa Access Token
const getMpesaAccessToken = async (consumerKey, consumerSecret) => {
  const key = consumerKey || process.env.MPESA_CONSUMER_KEY;
  const secret = consumerSecret || process.env.MPESA_CONSUMER_SECRET;
  
  if (!key || !secret) {
    throw new Error("M-Pesa Consumer Key and Secret are required");
  }
  
  try {
    const auth = Buffer.from(`${key}:${secret}`).toString("base64");
    const response = await axios.get(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        headers: { Authorization: `Basic ${auth}` },
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error("Error getting M-Pesa access token:", error.response?.data || error.message);
    throw new Error("Failed to get M-Pesa access token");
  }
};

// Initiate M-Pesa STK Push for checkout
exports.initiateCheckoutMpesaStkPush = async (req, res) => {
  try {
    const { phoneNumber, amount, paymentType, config } = req.body;

    if (!phoneNumber || !amount) {
      return res.status(400).json({ success: false, message: "Phone number and amount are required" });
    }

    // Get business
    const business = await BusinessDetails.findOne({ users: req.user.id });
    if (!business) {
      return res.status(400).json({ success: false, message: "Business not found" });
    }

    // Create pending payment record
    const payment = await CheckoutPayment.create({
      businessId: business._id,
      phoneNumber,
      amount,
      paymentType: paymentType || "mpesa_stk",
      status: "pending",
    });

    // Get M-Pesa credentials from config or environment
    const consumerKey = config?.consumerKey || process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = config?.consumerSecret || process.env.MPESA_CONSUMER_SECRET;
    const shortcode = config?.shortcode || process.env.MPESA_SHORTCODE;
    const passkey = config?.passkey || process.env.MPESA_PASSKEY;
    const callbackUrl = process.env.MPESA_CHECKOUT_CALLBACK_URL || process.env.MPESA_STK_PUSH_CALLBACK_URL;

    if (!shortcode || !passkey || !consumerKey || !consumerSecret) {
      // If no M-Pesa config, simulate success for demo
      payment.status = "completed";
      payment.mpesaReceiptNumber = "DEMO" + Date.now();
      payment.completedAt = new Date();
      await payment.save();
      return res.json({ 
        success: true, 
        message: "Payment completed (demo mode)",
        checkoutRequestId: "DEMO_" + Date.now(),
        paymentStatus: "completed"
      });
    }

    // Generate timestamp and password
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");

    // Get access token
    const accessToken = await getMpesaAccessToken(consumerKey, consumerSecret);

    // Initiate STK Push
    const stkRes = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.round(amount),
        PartyA: phoneNumber,
        PartyB: shortcode,
        PhoneNumber: phoneNumber,
        CallBackURL: callbackUrl,
        AccountReference: payment._id.toString(),
        TransactionDesc: `POS Checkout Payment - ${amount}`,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Store checkout request ID
    payment.mpesaCheckoutRequestId = stkRes.data.CheckoutRequestID;
    await payment.save();

    res.json({
      success: true,
      message: "STK push sent successfully",
      checkoutRequestId: stkRes.data.CheckoutRequestID,
      paymentStatus: "pending"
    });
  } catch (error) {
    console.error("M-Pesa STK Push error:", error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      message: error.response?.data?.errorMessage || error.message || "Failed to initiate payment" 
    });
  }
};

// Get payment status
exports.getCheckoutPaymentStatus = async (req, res) => {
  try {
    const { checkoutRequestId, phoneNumber } = req.query;

    if (!checkoutRequestId) {
      return res.status(400).json({ success: false, message: "Checkout request ID required" });
    }

    // For demo mode
    if (checkoutRequestId.startsWith("DEMO_")) {
      return res.json({ 
        success: true, 
        paymentStatus: "completed",
        mpesaReceiptNumber: "DEMO_RECEIPT_" + Date.now()
      });
    }

    // Get business
    const business = await BusinessDetails.findOne({ users: req.user.id });
    if (!business) {
      return res.status(400).json({ success: false, message: "Business not found" });
    }

    // Find payment
    const payment = await CheckoutPayment.findOne({
      mpesaCheckoutRequestId: checkoutRequestId,
      businessId: business._id
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    // If already completed or failed, return status
    if (payment.status !== "pending") {
      return res.json({
        success: true,
        paymentStatus: payment.status,
        mpesaReceiptNumber: payment.mpesaReceiptNumber
      });
    }

    // Query M-Pesa for status
    try {
      const consumerKey = process.env.MPESA_CONSUMER_KEY;
      const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
      const accessToken = await getMpesaAccessToken(consumerKey, consumerSecret);
      const shortcode = process.env.MPESA_SHORTCODE;
      const passkey = process.env.MPESA_PASSKEY;
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
      const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");

      const queryRes = await axios.post(
        "https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query",
        {
          BusinessShortCode: shortcode,
          Password: password,
          Timestamp: timestamp,
          CheckoutRequestID: checkoutRequestId,
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const resultCode = queryRes.data.ResultCode;

      if (resultCode === 0) {
        payment.status = "completed";
        payment.completedAt = new Date();
        await payment.save();
      } else if (resultCode === "1032" || resultCode === 1032) {
        // Request cancelled by user
        payment.status = "cancelled";
        await payment.save();
      } else {
        payment.status = "failed";
        await payment.save();
      }
    } catch (queryError) {
      console.error("M-Pesa query error:", queryError.message);
    }

    res.json({
      success: true,
      paymentStatus: payment.status,
      mpesaReceiptNumber: payment.mpesaReceiptNumber
    });
  } catch (error) {
    console.error("Get payment status error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================
// C2B (Till/Paybill) Payment Functions
// =====================

// Get platform M-Pesa credentials from env (your merchant account)
const getPlatformMpesaConfig = () => {
  return {
    consumerKey: process.env.MPESA_CONSUMER_KEY,
    consumerSecret: process.env.MPESA_CONSUMER_SECRET,
    shortcode: process.env.MPESA_SHORTCODE,
    passkey: process.env.MPESA_PASSKEY,
    c2bCallbackUrl: process.env.MPESA_C2B_CALLBACK_URL || process.env.MPESA_STK_PUSH_CALLBACK_URL,
  };
};

// Register C2B Validation and Confirmation URLs (one-time setup)
exports.registerC2BUrls = async (req, res) => {
  try {
    const config = getPlatformMpesaConfig();
    
    if (!config.consumerKey || !config.shortcode) {
      return res.status(400).json({ 
        success: false, 
        message: "Platform M-Pesa not configured. Please set MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, and MPESA_SHORTCODE in environment." 
      });
    }

    const accessToken = await getMpesaAccessToken(config.consumerKey, config.consumerSecret);
    
    const response = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/c2b/v1/registerurl",
      {
        ShortCode: config.shortcode,
        ResponseType: "Completed",
        ConfirmationURL: config.c2bCallbackUrl,
        ValidationURL: config.c2bCallbackUrl,
      },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    res.json({ success: true, message: "C2B URLs registered successfully", data: response.data });
  } catch (error) {
    console.error("C2B register URL error:", error.response?.data || error.message);
    res.status(500).json({ success: false, message: error.response?.data?.errorMessage || error.message });
  }
};

// Simulate C2B payment (for testing in sandbox)
exports.simulateC2BPayment = async (req, res) => {
  try {
    const { amount, phoneNumber, accountReference, description } = req.body;
    const config = getPlatformMpesaConfig();

    if (!config.consumerKey || !config.shortcode) {
      return res.status(400).json({ success: false, message: "Platform M-Pesa not configured" });
    }

    const accessToken = await getMpesaAccessToken(config.consumerKey, config.consumerSecret);

    const response = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/c2b/v1/simulate",
      {
        ShortCode: config.shortcode,
        CommandID: "CustomerBuyGoodsOnline",
        Amount: Math.round(amount),
        Msisdn: phoneNumber.replace(/^254/, "254"),
        BillRefNumber: accountReference,
      },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    res.json({ success: true, message: "Payment simulated", data: response.data });
  } catch (error) {
    console.error("C2B simulate error:", error.response?.data || error.message);
    res.status(500).json({ success: false, message: error.response?.data?.errorMessage || error.message });
  }
};

// C2B Callback from Safaricom
exports.c2bCallback = async (req, res) => {
  try {
    const { Body } = req.body;
    console.log("C2B Callback received:", JSON.stringify(Body, null, 2));

    const transactionType = Body?.TransactionType;
    const transactionId = Body?.TransID;
    const amount = Body?.TransAmount;
    const phoneNumber = Body?.Msisdn;
    const accountReference = Body?.BillRefNumber;
    const resultCode = Body?.ResultCode;

    // Find payment by account reference (our checkout/payment ID)
    if (accountReference && resultCode === 0) {
      const payment = await CheckoutPayment.findById(accountReference);
      if (payment) {
        payment.status = "completed";
        payment.mpesaReceiptNumber = transactionId;
        payment.completedAt = new Date();
        await payment.save();
        console.log(`C2B Payment completed for ${accountReference}: ${transactionId}`);
      }
    }

    res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (error) {
    console.error("C2B callback error:", error);
    res.status(500).json({ message: "Callback processing error" });
  }
};

// Initiate C2B payment - shows customer the till/paybill to pay to
exports.initiateC2BPayment = async (req, res) => {
  try {
    const { phoneNumber, amount, paymentType, config: clientConfig } = req.body;

    if (!phoneNumber || !amount) {
      return res.status(400).json({ success: false, message: "Phone number and amount required" });
    }

    // Get business
    const business = await BusinessDetails.findOne({ users: req.user.id });
    if (!business) {
      return res.status(400).json({ success: false, message: "Business not found" });
    }

    // Create pending payment record
    const payment = await CheckoutPayment.create({
      businessId: business._id,
      phoneNumber,
      amount,
      paymentType: paymentType || "mpesa_till",
      status: "pending",
    });

    const platformConfig = getPlatformMpesaConfig();

    // If no platform config, use demo mode
    if (!platformConfig.shortcode) {
      payment.status = "completed";
      payment.mpesaReceiptNumber = "DEMO_C2B_" + Date.now();
      payment.completedAt = new Date();
      await payment.save();
      return res.json({
        success: true,
        message: "Payment completed (demo mode)",
        checkoutRequestId: payment._id.toString(),
        paymentStatus: "completed",
        demoMode: true,
      });
    }

    // Return the till/paybill number for customer to pay to
    const tillNumber = clientConfig?.tillNumber || platformConfig.shortcode;
    const paybillNumber = clientConfig?.paybillNumber || platformConfig.shortcode;
    const accountNumber = clientConfig?.accountNumber || business._id.toString();

    const paymentDetails = paymentType === "mpesa_paybill" 
      ? { paybillNumber, accountNumber }
      : { tillNumber };

    res.json({
      success: true,
      message: "Payment initiated. Customer should pay to the provided number.",
      checkoutRequestId: payment._id.toString(),
      paymentStatus: "pending",
      paymentDetails,
      instructions: paymentType === "mpesa_paybill"
        ? `Go to M-Pesa → Pay Bill → Enter Paybill: ${paybillNumber} and Account: ${accountNumber}`
        : `Go to M-Pesa → Buy Goods and Services → Enter Till: ${tillNumber}`,
    });
  } catch (error) {
    console.error("C2B initiate error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get C2B payment status
exports.getC2BPaymentStatus = async (req, res) => {
  try {
    const { checkoutId } = req.params;
    const business = await BusinessDetails.findOne({ users: req.user.id });

    if (!business) {
      return res.status(400).json({ success: false, message: "Business not found" });
    }

    const payment = await CheckoutPayment.findOne({
      _id: checkoutId,
      businessId: business._id,
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    res.json({
      success: true,
      paymentStatus: payment.status,
      mpesaReceiptNumber: payment.mpesaReceiptNumber,
    });
  } catch (error) {
    console.error("C2B status error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Save manual payment (customer paid, entered receipt manually)
exports.saveManualPayment = async (req, res) => {
  try {
    const { phoneNumber, amount, paymentType, receiptNumber, tillNumber, paybillNumber, accountNumber } = req.body;

    if (!phoneNumber || !amount || !receiptNumber) {
      return res.status(400).json({ success: false, message: "Phone, amount and receipt number required" });
    }

    // Get business
    const business = await BusinessDetails.findOne({ users: req.user.id });
    if (!business) {
      return res.status(400).json({ success: false, message: "Business not found" });
    }

    // Create payment record
    const payment = await CheckoutPayment.create({
      businessId: business._id,
      phoneNumber,
      amount,
      paymentType: paymentType || "mpesa_till",
      status: "completed", // Mark as completed since customer provided receipt
      mpesaReceiptNumber: receiptNumber,
      completedAt: new Date(),
    });

    res.json({
      success: true,
      message: "Payment recorded successfully",
      paymentId: payment._id,
      receiptNumber,
    });
  } catch (error) {
    console.error("Save manual payment error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

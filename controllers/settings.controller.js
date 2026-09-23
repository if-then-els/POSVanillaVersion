const Settings = require("../models/settings");
const Users = require("../models/user");
const PaymentMethod = require("../models/paymentMethod");
const BusinessDetails = require("../models/businessDetails");
const CheckoutPayment = require("../models/CheckoutPayment");
const axios = require("axios");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ---------------------------------------------------------------------------
// Shared validation helpers
// ---------------------------------------------------------------------------
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || "").trim());
}

function isValidPhone(phone) {
  return /[+\d][\d\s\-()]{6,}/.test(String(phone || "").trim());
}

function isValidKenyanPhone(phone) {
  return /^254[17]\d{8}$/.test(String(phone || "").trim());
}

function parseTaxRate(value) {
  if (value === undefined || value === null || value === "") return 0;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return n;
}

// Allowed payment-method types (mirrors models/paymentMethod.js enum).
const PAYMENT_TYPES = [
  "card",
  "mobile_money",
  "paypal",
  "mpesa_stk",
  "mpesa_paybill",
  "bank",
];

// Config keys treated as secrets: masked in list responses, never logged.
const SECRET_CONFIG_KEYS = /secret|passkey|password|token|private/i;
const MASK_SENTINEL = "***MASKED***";

function maskConfigSecrets(config) {
  const out = {};
  const src =
    config instanceof Map ? Object.fromEntries(config) : config || {};
  for (const [k, v] of Object.entries(src)) {
    out[k] = SECRET_CONFIG_KEYS.test(k) ? MASK_SENTINEL : v;
  }
  return out;
}

// Pick the first usable credential, skipping masked sentinels coming back
// from the (masked) list endpoint. Secrets must fall through to env defaults
// rather than being sent to Safaricom as "***MASKED***".
function pickCredential(...values) {
  for (const v of values) {
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (!s || s === MASK_SENTINEL) continue;
    return s;
  }
  return undefined;
}

function serializePaymentMethod(doc) {
  const obj = typeof doc.toObject === "function" ? doc.toObject() : doc;
  if (obj.config !== undefined) obj.config = maskConfigSecrets(obj.config);
  return obj;
}

// Configure storage (logos directory is created on demand)
const logosDir = path.join(__dirname, "..", "public", "logos");
try {
  fs.mkdirSync(logosDir, { recursive: true });
} catch (_) {
  /* best effort - multer will surface real errors */
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, logosDir);
  },
  filename: (req, file, cb) => {
    const safeExt = path.extname(file.originalname || "").toLowerCase();
    cb(null, `logo-${Date.now()}${safeExt}`);
  },
});

// Initialize logos
const logos = multer({
  storage,
  limits: { fileSize: 1000000 }, // 1MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = filetypes.test(file.mimetype);
    mimetype && extname ? cb(null, true) : cb(new Error("Images only (jpeg, png, gif, webp, max 1MB)!"));
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

// Update all settings for the current business.
// NOTE: explicit allow-list - never Object.assign(req.body) (mass assignment
// would let clients overwrite business/_id or inject unknown fields).
const GENERAL_SETTINGS_FIELDS = [
  "storeName",
  "storeAddress",
  "storePhone",
  "storeEmail",
  "taxRate",
  "currency",
  "showLogo",
  "showTax",
  "includeContact",
  "printAuto",
  "footerText",
  "logoUrl",
];

exports.updateSettings = async (req, res) => {
  try {
    const business = req.user.business;
    let settings = await Settings.findOne({ business });
    if (!settings) settings = new Settings({ business });

    for (const field of GENERAL_SETTINGS_FIELDS) {
      if (req.body[field] !== undefined) settings[field] = req.body[field];
    }

    if (settings.taxRate !== undefined && settings.taxRate !== null) {
      const rate = parseTaxRate(settings.taxRate);
      if (rate === null) {
        return res
          .status(400)
          .json({ success: false, message: "Tax rate must be between 0 and 100" });
      }
      settings.taxRate = rate;
    }
    if (settings.storeEmail && !isValidEmail(settings.storeEmail)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid store email address" });
    }

    await settings.save();
    res.json({ success: true, message: "Settings updated", settings });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to update settings",
      error: err.message,
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
          message: err.message || err,
        });
      }

      const { name, address, phone, email, taxRate, currency } = req.body;

      // Validate inputs before persisting
      if (name !== undefined && String(name).trim().length > 120) {
        return res.status(400).json({
          success: false,
          message: "Store name is too long (max 120 characters)",
        });
      }
      if (phone !== undefined && phone !== "" && !isValidPhone(phone)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid phone number" });
      }
      if (email !== undefined && email !== "" && !isValidEmail(email)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid email address" });
      }
      const parsedTax = parseTaxRate(taxRate);
      if (parsedTax === null) {
        return res.status(400).json({
          success: false,
          message: "Tax rate must be a number between 0 and 100",
        });
      }
      let normalizedCurrency;
      if (currency !== undefined && currency !== "") {
        normalizedCurrency = String(currency).trim().toUpperCase();
        if (!/^[A-Z]{3}$/.test(normalizedCurrency)) {
          return res.status(400).json({
            success: false,
            message: "Currency must be a 3-letter code (e.g. KES, USD)",
          });
        }
      }

      const business = req.user.business;
      let settings = await Settings.findOne({ business });
      if (!settings) settings = new Settings({ business });

      if (name !== undefined) settings.storeName = String(name).trim();
      if (address !== undefined) settings.storeAddress = String(address).trim();
      if (phone !== undefined) settings.storePhone = String(phone).trim();
      if (email !== undefined) settings.storeEmail = String(email).trim().toLowerCase();
      settings.taxRate = parsedTax;
      if (normalizedCurrency !== undefined) settings.currency = normalizedCurrency;

      // Handle logo logos (remove the previous file to avoid orphans)
      if (req.file) {
        const oldUrl = settings.logoUrl;
        settings.logoUrl = `/logos/${req.file.filename}`;
        if (oldUrl && oldUrl.startsWith("/logos/")) {
          try {
            fs.unlinkSync(path.join(__dirname, "..", "public", oldUrl));
          } catch (_) {
            /* best effort */
          }
        }
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

    const toBool = (v, fallback) =>
      v === undefined ? fallback : v === true || v === "true" || v === 1 || v === "1";
    settings.showLogo = toBool(req.body.showLogo, settings.showLogo ?? true);
    settings.showTax = toBool(req.body.showTaxDetails, settings.showTax ?? true);
    settings.includeContact = toBool(
      req.body.includeContactInfo,
      settings.includeContact ?? true
    );
    settings.printAuto = toBool(
      req.body.printAutomatically,
      settings.printAuto ?? true
    );
    if (req.body.footerText !== undefined) {
      settings.footerText = String(req.body.footerText).slice(0, 500);
    }

    await settings.save();
    res.json({ success: true, message: "Receipt settings saved", settings });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to save receipt settings",
      error: err.message,
    });
  }
};

// Get profile settings for the current user (self-service)
exports.getUserSettings = async (req, res) => {
  try {
    const user = await Users.findById(req.user.id).select(
      "name email phone role status mustChangePassword"
    );

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      role: user.role || "",
      mustChangePassword: !!user.mustChangePassword,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch user settings", error: err.message });
  }
};

// Update own profile (name, email, phone, password). Email changes are
// checked for duplicates within the business.
exports.updateUserSettings = async (req, res) => {
  try {
    const user = await Users.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();
      if (!name) return res.status(400).json({ message: "Name is required" });
      if (name.length > 120) {
        return res.status(400).json({ message: "Name is too long" });
      }
      user.name = name;
    }

    if (req.body.phone !== undefined) {
      const phone = String(req.body.phone).trim();
      if (phone && !isValidPhone(phone)) {
        return res.status(400).json({ message: "Invalid phone number" });
      }
      user.phone = phone;
    }

    if (req.body.email !== undefined) {
      const email = String(req.body.email).trim().toLowerCase();
      if (!isValidEmail(email)) {
        return res.status(400).json({ message: "Invalid email address" });
      }
      if (email !== String(user.email).toLowerCase()) {
        const clash = await Users.findOne({
          business: user.business,
          email: new RegExp(
            `^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
            "i"
          ),
          _id: { $ne: user._id },
        });
        if (clash) {
          return res.status(409).json({ message: "Email already in use" });
        }
        user.email = email;
      }
    }

    // Handle password change. IMPORTANT: assign the PLAIN password and let
    // the model's pre-save hook hash it exactly once. Hashing here would
    // double-hash and lock the user out.
    if (req.body.newPassword || req.body.confirmPassword) {
      const bcrypt = require("bcrypt");
      if (!req.body.currentPassword) {
        return res
          .status(400)
          .json({ message: "Current password is required to set a new one" });
      }
      const valid = await bcrypt.compare(
        req.body.currentPassword,
        user.password,
      );
      if (!valid) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      }
      if (String(req.body.newPassword).length < 8) {
        return res
          .status(400)
          .json({ message: "New password must be at least 8 characters" });
      }
      if (req.body.newPassword !== req.body.confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match" });
      }
      user.password = String(req.body.newPassword); // hashed by pre-save hook
      user.mustChangePassword = false;
    }

    await user.save();
    res.json({
      success: true,
      message: "Profile updated",
      user: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Email already in use" });
    }
    res
      .status(500)
      .json({ message: "Failed to update user settings", error: err.message });
  }
};

// Get payment methods for checkout (secrets masked - safe for any role;
// the full config is only exposed by getPaymentMethodById, admin only).
exports.getPaymentMethods = async (req, res) => {
  try {
    const businessId = req.user.business;
    const methods = await PaymentMethod.find({
      businessId,
      active: true,
    }).sort({ dateAdded: -1 });
    res.json({ success: true, methods: methods.map(serializePaymentMethod) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get a single payment method WITH full config (admin only - needed to edit
// secrets, since the list endpoint masks them).
exports.getPaymentMethodById = async (req, res) => {
  try {
    const method = await PaymentMethod.findOne({
      _id: req.params.id,
      businessId: req.user.business,
    });
    if (!method) {
      return res
        .status(404)
        .json({ success: false, message: "Payment method not found" });
    }
    const obj =
      typeof method.toObject === "function" ? method.toObject() : method;
    if (obj.config instanceof Map) obj.config = Object.fromEntries(obj.config);
    res.json({ success: true, method: obj });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Add a new payment method for checkout
exports.addPaymentMethod = async (req, res) => {
  try {
    const businessId = req.user.business;
    const { type, provider, label, config } = req.body;

    if (!type || !PAYMENT_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Payment type is required (one of: ${PAYMENT_TYPES.join(", ")})`,
      });
    }
    if (!label || !String(label).trim()) {
      return res.status(400).json({
        success: false,
        message: "A display label is required",
      });
    }

    // Avoid exact duplicates piling up
    const duplicate = await PaymentMethod.findOne({
      businessId,
      type,
      label: String(label).trim(),
      active: true,
    });
    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "An active payment method with this label already exists",
      });
    }

    const cleanConfig = {};
    if (config && typeof config === "object") {
      for (const [k, v] of Object.entries(config)) {
        if (typeof v === "string" && v.trim() !== "") {
          cleanConfig[String(k).slice(0, 60)] = v.trim().slice(0, 500);
        }
      }
    }

    const method = await PaymentMethod.create({
      businessId,
      type,
      provider: provider ? String(provider).trim().slice(0, 120) : undefined,
      label: String(label).trim().slice(0, 120),
      config: cleanConfig,
      active: true,
    });

    res.status(201).json({ success: true, method: serializePaymentMethod(method) });
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update a payment method
exports.updatePaymentMethod = async (req, res) => {
  try {
    const method = await PaymentMethod.findOne({
      _id: req.params.id,
      businessId: req.user.business,
    });
    if (!method) {
      return res
        .status(404)
        .json({ success: false, message: "Payment method not found" });
    }

    if (req.body.type !== undefined) {
      if (!PAYMENT_TYPES.includes(req.body.type)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid payment type" });
      }
      method.type = req.body.type;
    }
    if (req.body.provider !== undefined) {
      method.provider = String(req.body.provider).trim().slice(0, 120);
    }
    if (req.body.label !== undefined) {
      const label = String(req.body.label).trim();
      if (!label) {
        return res
          .status(400)
          .json({ success: false, message: "Display label cannot be empty" });
      }
      method.label = label.slice(0, 120);
    }
    if (req.body.config && typeof req.body.config === "object") {
      // Merge: masked sentinel values keep the stored secret.
      const current =
        method.config instanceof Map
          ? Object.fromEntries(method.config)
          : { ...(method.config || {}) };
      for (const [k, v] of Object.entries(req.body.config)) {
        if (v === MASK_SENTINEL) continue; // unchanged secret
        if (typeof v === "string" && v.trim() !== "") {
          current[String(k).slice(0, 60)] = v.trim().slice(0, 500);
        } else if (v === "" || v === null) {
          delete current[k];
        }
      }
      method.config = current;
    }
    if (req.body.active !== undefined) {
      method.active = req.body.active === true || req.body.active === "true";
    }

    await method.save();
    res.json({ success: true, method: serializePaymentMethod(method) });
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete a payment method
exports.deletePaymentMethod = async (req, res) => {
  try {
    const method = await PaymentMethod.findOne({
      _id: req.params.id,
      businessId: req.user.business,
    });
    if (!method) {
      return res
        .status(404)
        .json({ success: false, message: "Payment method not found" });
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

    if (!phoneNumber || amount === undefined || amount === null) {
      return res.status(400).json({ success: false, message: "Phone number and amount are required" });
    }
    if (!isValidKenyanPhone(phoneNumber)) {
      return res.status(400).json({ success: false, message: "Phone number must be in 2547XXXXXXXX format" });
    }
    const chargeAmount = Number(amount);
    if (!Number.isFinite(chargeAmount) || chargeAmount <= 0) {
      return res.status(400).json({ success: false, message: "Amount must be greater than zero" });
    }

    // Get business
    const business = await BusinessDetails.findOne({ users: req.user.id });
    if (!business) {
      return res.status(400).json({ success: false, message: "Business not found" });
    }

    // Create pending payment record
    const payment = await CheckoutPayment.create({
      businessId: business._id,
      phoneNumber: String(phoneNumber).trim(),
      amount: chargeAmount,
      paymentType: paymentType || "mpesa_stk",
      status: "pending",
    });

    // Get M-Pesa credentials from config or environment
    const consumerKey = pickCredential(config?.consumerKey, process.env.MPESA_CONSUMER_KEY);
    const consumerSecret = pickCredential(config?.consumerSecret, process.env.MPESA_CONSUMER_SECRET);
    const shortcode = pickCredential(config?.shortcode, process.env.MPESA_SHORTCODE);
    const passkey = pickCredential(config?.passkey, process.env.MPESA_PASSKEY);
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
        Amount: Math.round(chargeAmount),
        PartyA: phoneNumber,
        PartyB: shortcode,
        PhoneNumber: phoneNumber,
        CallBackURL: callbackUrl,
        AccountReference: payment._id.toString(),
        TransactionDesc: `POS Checkout Payment - ${chargeAmount}`,
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

    if (amount === undefined || !phoneNumber) {
      return res.status(400).json({ success: false, message: "Amount and phone number are required" });
    }
    if (!isValidKenyanPhone(phoneNumber)) {
      return res.status(400).json({ success: false, message: "Phone number must be in 2547XXXXXXXX format" });
    }
    const simAmount = Number(amount);
    if (!Number.isFinite(simAmount) || simAmount <= 0) {
      return res.status(400).json({ success: false, message: "Amount must be greater than zero" });
    }

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
        Amount: Math.round(simAmount),
        Msisdn: String(phoneNumber).trim(),
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

    if (!phoneNumber || amount === undefined || amount === null) {
      return res.status(400).json({ success: false, message: "Phone number and amount required" });
    }
    if (!isValidKenyanPhone(phoneNumber)) {
      return res.status(400).json({ success: false, message: "Phone number must be in 2547XXXXXXXX format" });
    }
    const c2bAmount = Number(amount);
    if (!Number.isFinite(c2bAmount) || c2bAmount <= 0) {
      return res.status(400).json({ success: false, message: "Amount must be greater than zero" });
    }

    // Get business
    const business = await BusinessDetails.findOne({ users: req.user.id });
    if (!business) {
      return res.status(400).json({ success: false, message: "Business not found" });
    }

    // Create pending payment record
    const payment = await CheckoutPayment.create({
      businessId: business._id,
      phoneNumber: String(phoneNumber).trim(),
      amount: c2bAmount,
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

    if (!phoneNumber || amount === undefined || amount === null || !receiptNumber) {
      return res.status(400).json({ success: false, message: "Phone, amount and receipt number required" });
    }
    if (!isValidKenyanPhone(phoneNumber)) {
      return res.status(400).json({ success: false, message: "Phone number must be in 2547XXXXXXXX format" });
    }
    const manualAmount = Number(amount);
    if (!Number.isFinite(manualAmount) || manualAmount <= 0) {
      return res.status(400).json({ success: false, message: "Amount must be greater than zero" });
    }
    if (String(receiptNumber).trim().length < 4) {
      return res.status(400).json({ success: false, message: "Receipt number looks invalid" });
    }

    // Get business
    const business = await BusinessDetails.findOne({ users: req.user.id });
    if (!business) {
      return res.status(400).json({ success: false, message: "Business not found" });
    }

    // Create payment record
    const payment = await CheckoutPayment.create({
      businessId: business._id,
      phoneNumber: String(phoneNumber).trim(),
      amount: manualAmount,
      paymentType: paymentType || "mpesa_till",
      status: "completed", // Mark as completed since customer provided receipt
      mpesaReceiptNumber: String(receiptNumber).trim().toUpperCase(),
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

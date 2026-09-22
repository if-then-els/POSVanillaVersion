const express = require("express");
const app = express();
const path = require("path");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const multer = require("multer");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const pino = require("pino");
dotenv.config();

const Plan = require("./models/plan.model");

const port = process.env.PORT || 5000;

//configure mongoose
mongoose
  .connect(process.env.MONGO_URL, {})
  .then(() => {
    console.log("Connected to DB");
  })
  .catch((err) => {
    console.log("Error connecting to DB", err);
  });

app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan("combined"));
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});
app.use(limiter);

app.use(express.json());
app.use((req, res, next) => {
  // Set Content Security Policy (kept, but helmet also guards)
  res.header(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.paystack.co https://api.paystack.co https://www.paystack.co https://cdn.tailwindcss.com; connect-src 'self' https://api.paystack.co https://www.paystack.co https://ipwho.is https://api.bigdatacloud.net; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com https://paystack.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com; frame-src 'self' https://checkout.paystack.com;"
  );
  
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH");
    return res.status(200).json({});
  } else {
    next();
  }
});
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5000",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    credentials: true,
  })
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

//import routes
const paymentsRoutes = require("./routes/payments.routes");
const userRoutes = require("./routes/user.routes");
const inventoryRoutes = require("./routes/inventory.routes");
const ownerRoutes = require("./routes/owner.route");
const salesRoutes = require("./routes/sales.routes");
const reportsRoutes = require("./routes/reports.routes");
const settingsRoutes = require("./routes/settings.routes");
const businessRoutes = require("./routes/business.routes");
const subscriptionMiddleware = require("./middleware/subscription.middleware");
const subscriptionsRoutes = require("./routes/subscriptions.routes");

const businessPaymentRoutes = require("./routes/businesPayment.routes");
const supportRoutes = require("./routes/support.routes");
const superAdminRoutes = require("./routes/superAdmin.routes");

// Public plans route (before subscription middleware).
// Plan prices are stored in USD; pass ?currency=KES (or any ISO code) to get
// each plan's price converted to the caller's local currency for display.
const currencyService = require("./services/currencyService");
app.get("/plans", async (req, res) => {
  try {
    const Plan = require("./models/plan.model");
    const plans = await Plan.find({});
    const currency = req.query.currency || "";
    const converted = await Promise.all(
      plans.map((plan) => currencyService.priceForDisplay(plan, currency)),
    );
    res.json({ plans: converted });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch plans" });
  }
});

app.use("/", paymentsRoutes);
app.use("/", settingsRoutes);
app.use("/", userRoutes);
app.use("/", inventoryRoutes);
app.use("/", ownerRoutes);
app.use("/", salesRoutes);
app.use("/", reportsRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/superadmin", superAdminRoutes);
// public, must be before subscriptionMiddleware
app.use(subscriptionMiddleware); // protected
app.use("/", subscriptionsRoutes); // protected

app.use("/api/payment-methods", businessPaymentRoutes);
app.use("/api/stores", require("./routes/store.routes"));
app.use("/api/suppliers", require("./routes/supplier.routes"));
app.use("/api/purchase-orders", require("./routes/purchaseOrder.routes"));
app.use("/api/ai", require("./routes/ai.routes"));
//app.use("/", supportRoutes);

// Apply subscription middleware

async function seedPlans() {
  const plans = [
    {
      name: "basic",
      price: 15, // USD
      description: "Basic Plan - Perfect for small businesses",
      userLimit: 2,
      roleManagement: false,
      billingCycle: "monthly",
      isActive: true,
      trialDays: 0,
      features: {
        maxUsers: 2,
        maxProducts: 500,
        maxStores: 1,
        roleManagement: false,
        multiStore: false,
        barcode: false,
        offlineMode: false,
        mpesa: true,
        cardPayments: false,
        bankPayments: false,
        printerBluetooth: false,
        printerNetwork: false,
        reportsBasic: true,
        reportsAdvanced: false,
        reportsAIS: false,
        loyalty: false,
        apiAccess: false,
      },
    },
    {
      name: "Standard",
      price: 29, // USD
      description: "Standard Plan - Best for growing businesses",
      userLimit: 5,
      roleManagement: true,
      billingCycle: "monthly",
      isActive: true,
      trialDays: 0,
      features: {
        maxUsers: 5,
        maxProducts: 0, // 0 = unlimited
        maxStores: 3,
        roleManagement: true,
        multiStore: true,
        barcode: true,
        offlineMode: true,
        mpesa: true,
        cardPayments: true,
        bankPayments: false,
        printerBluetooth: true,
        printerNetwork: false,
        reportsBasic: true,
        reportsAdvanced: true,
        reportsAIS: false,
        loyalty: true,
        apiAccess: false,
      },
    },
    {
      name: "premium",
      price: 49, // USD
      description: "Premium Plan - For large / enterprise businesses",
      userLimit: 20,
      roleManagement: true,
      billingCycle: "monthly",
      isActive: true,
      trialDays: 0,
      features: {
        maxUsers: 20,
        maxProducts: 0,
        maxStores: 0, // unlimited
        roleManagement: true,
        multiStore: true,
        barcode: true,
        offlineMode: true,
        mpesa: true,
        cardPayments: true,
        bankPayments: true,
        printerBluetooth: true,
        printerNetwork: true,
        reportsBasic: true,
        reportsAdvanced: true,
        reportsAIS: true,
        loyalty: true,
        apiAccess: true,
      },
    },
    {
      name: "trial",
      price: 0,
      description: "One month free Trial",
      userLimit: 1,
      roleManagement: false,
      billingCycle: "monthly",
      isActive: true,
      trialDays: 30,
      features: {
        maxUsers: 1,
        maxProducts: 50,
        maxStores: 1,
        roleManagement: false,
        multiStore: false,
        barcode: false,
        offlineMode: false,
        mpesa: false,
        cardPayments: false,
        bankPayments: false,
        printerBluetooth: false,
        printerNetwork: false,
        reportsBasic: true,
        reportsAdvanced: false,
        reportsAIS: false,
        loyalty: false,
        apiAccess: false,
      },
    },
  ];
  for (const plan of plans) {
    await Plan.updateOne({ name: plan.name }, { $set: plan }, { upsert: true });
  }
}

// Call this after mongoose.connect(...)
mongoose.connection.once("open", () => {
  seedPlans().then(() => console.log(" Plans seeded"));
});

//start app
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

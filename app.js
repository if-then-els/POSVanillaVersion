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
const Plan = require("./models/plan.model");

const port = 5000;

dotenv.config();

//configure mongoose
mongoose
  .connect(process.env.MONGO_URL, {})
  .then(() => {
    console.log("Connected to DB");
  })
  .catch((err) => {
    console.log("Error connecting to DB", err);
  });

app.use(express.json());
app.use((req, res, next) => {
  // Middleware to handle CORS preflight requests
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH");
    return res.status(200).json({});
  } else {
    next();
  }
});
// cors
app.use(
  cors({
    origin: "http://localhost:5000",
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
//const superAdminRoutes = require("./routes/superAdmin.routes");

app.use("/", paymentsRoutes);
app.use("/", settingsRoutes);
app.use("/", userRoutes);
app.use("/", inventoryRoutes);
app.use("/", ownerRoutes);
app.use("/", salesRoutes);
app.use("/", reportsRoutes);
app.use("/", userRoutes);
app.use("/api/business", businessRoutes);
// public, must be before subscriptionMiddleware
app.use(subscriptionMiddleware); // protected
app.use("/", subscriptionsRoutes); // protected

app.use("/api/payment-methods", businessPaymentRoutes);
//app.use("/", supportRoutes);
//app.use("/api/superadmin", superAdminRoutes);

// Apply subscription middleware

async function seedPlans() {
  const plans = [
    { name: "basic", price: 2000, description: "Basic Plan" },
    { name: "Standard", price: 3500, description: "Standard Plan" },
    { name: "premium", price: 15000, description: "Premium Plan" },
    { name: "trial", price: 0, description: "One month free Trial" },
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

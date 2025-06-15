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

const port = 5000;

dotenv.config();

//configure mongoose
console.log(process.env.MONGO_URL);
mongoose
  .connect(process.env.MONGO_URL, {})
  .then(() => {
    console.log("Connected to DB");
  })
  .catch((err) => {
    console.log("Error connecting to DB", err);
  });

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
const userRoutes = require("./routes/user.routes");
const inventoryRoutes = require("./routes/inventory.routes");
const ownerRoutes = require("./routes/owner.route");
const salesRoutes = require("./routes/sales.routes");
const reportsRoutes = require("./routes/reports.routes");
const settingsRoutes = require("./routes/settings.routes");

app.use("/api/settings", settingsRoutes);
app.use("/", userRoutes);
app.use("/", inventoryRoutes);
app.use("/", ownerRoutes);
app.use("/", salesRoutes);
app.use("/", reportsRoutes);
app.use("/", userRoutes);
//start app
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

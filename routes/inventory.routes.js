const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventory.controller");
const { upload } = require("../middleware/upload.middleware");

router.post("/addInventory", inventoryController.addStock);
router.get("/getInventory", inventoryController.getInventory);
router.post(
  "/uploadStockByCsv",
  upload.single("file"), // <-- This enables file upload
  inventoryController.addStockByCsv
);

module.exports = router;

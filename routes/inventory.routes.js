// D:\projects\POS\routes\inventory.routes.js
const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventory.controller");
const upload = require("../middleware/multerConfig"); // This 'upload' is now the Multer instance

router.post("/addInventory", inventoryController.addStock);
router.get("/getInventory", inventoryController.getInventory);

router.post(
  "/uploadStockByCsv",
  upload.single("file"), // <--- CORRECT: Calling .single() on the Multer instance
  inventoryController.addStockByCsv
);

router.post(
  "/uploadStockByExcel",
  upload.single("productFile"), // <--- CORRECT: Calling .single() on the Multer instance
  inventoryController.uploadProductByXlsx
);

router.get("/getInventoryById/:id", inventoryController.getInventoryById);
router.get("/downloadInventory", inventoryController.downloadInventory);
router.put(
  "/adjustInventoryQuantity/:id",
  inventoryController.adjustInventoryQuantity
);
router.put("/updateProductPrice/:id", inventoryController.adjustProductPrice);
router.delete("/deleteInventory/:id", inventoryController.deleteProduct);

module.exports = router;

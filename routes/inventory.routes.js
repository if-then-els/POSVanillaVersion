// D:\projects\POS\routes\inventory.routes.js
const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventory.controller");
const upload = require("../middleware/multerConfig"); // This 'upload' is now the Multer instance

router.post("/addInventory", inventoryController.addStock);

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
router.get("/getInventory", inventoryController.getAllInventory);

router.get("/getInventoryById/:id", inventoryController.getInventoryById);
router.get("/downloadInventory", inventoryController.exportInventoryPdf);
router.put(
  "/adjustInventoryQuantity/:id",
  inventoryController.adjustInventoryQuantity
);
router.put("/updateProductPrice/:id", inventoryController.adjustProductPrice);
router.put("/updateInventory/:id", inventoryController.updateProduct);
router.delete("/deleteInventory/:id", inventoryController.deleteProduct);
router.post("/bulkDelete", inventoryController.bulkDeleteProducts);
router.get("/export/csv", inventoryController.exportInventoryCsv);
router.get("/export/excel", inventoryController.exportInventoryExcel);

module.exports = router;

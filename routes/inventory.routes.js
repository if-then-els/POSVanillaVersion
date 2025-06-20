// D:\projects\POS\routes\inventory.routes.js
const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventory.controller");
const upload = require("../middleware/multerConfig");
const { verifyToken } = require("../middleware/auth.middleware");

router.post("/addInventory", verifyToken, inventoryController.addStock);

router.post(
  "/uploadStockByCsv",
  upload.single("file"),
  verifyToken,
  inventoryController.addStockByCsv
);

router.post(
  "/uploadStockByExcel",
  upload.single("productFile"),
  verifyToken,
  inventoryController.uploadProductByXlsx
);
router.get("/getInventory", verifyToken, inventoryController.getAllInventory);

router.get(
  "/getInventoryById/:id",
  verifyToken,
  inventoryController.getInventoryById
);
router.get(
  "/downloadInventory",
  verifyToken,
  inventoryController.exportInventoryPdf
);
router.put(
  "/adjustInventoryQuantity/:id",
  inventoryController.adjustInventoryQuantity
);
router.put(
  "/updateProductPrice/:id",
  verifyToken,
  inventoryController.adjustProductPrice
);
router.put(
  "/updateInventory/:id",
  verifyToken,
  inventoryController.updateProduct
);
router.delete(
  "/deleteInventory/:id",
  verifyToken,
  inventoryController.deleteProduct
);
router.post("/bulkDelete", verifyToken, inventoryController.bulkDeleteProducts);
router.get("/export/csv", verifyToken, inventoryController.exportInventoryCsv);
router.get(
  "/export/excel",
  verifyToken,
  inventoryController.exportInventoryExcel
);

module.exports = router;

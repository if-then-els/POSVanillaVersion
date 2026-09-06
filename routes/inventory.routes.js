// D:\projects\POS\routes\inventory.routes.js
const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventory.controller");
const upload = require("../middleware/multerConfig");
const { verifyToken } = require("../middleware/auth.middleware");

const { authorize } = require("../middleware/rbac.middleware");
const { requireLimit, requireFeature } = require("../middleware/tier.middleware");
const Inventory = require("../models/inventory");

router.post(
  "/addInventory",
  verifyToken,
  authorize("admin", "manager", "inventory"),
  requireLimit("maxProducts", async (req) => await Inventory.countDocuments({ business: req.user.business })),
  inventoryController.addStock
);

router.post(
  "/uploadStockByCsv",
  upload.single("file"),
  verifyToken,
  authorize("admin", "manager", "inventory"),
  requireFeature("barcode"),
  inventoryController.addStockByCsv
);

router.post(
  "/uploadStockByExcel",
  upload.single("productFile"),
  verifyToken,
  authorize("admin", "manager", "inventory"),
  requireFeature("barcode"),
  inventoryController.uploadProductByXlsx
);
router.get("/getInventory", verifyToken, inventoryController.getAllInventory);
router.get("/inventory/low-stock", verifyToken, inventoryController.getLowStock);
router.get("/inventory/valuation", verifyToken, inventoryController.getValuation);
router.get("/inventory/barcode/:barcode", verifyToken, inventoryController.lookupByBarcode);
router.post("/inventory/stocktake", verifyToken, authorize("admin","manager","inventory"), inventoryController.stocktake);

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
  verifyToken,
  authorize("admin", "manager", "inventory"),
  inventoryController.adjustInventoryQuantity
);
router.put(
  "/updateProductPrice/:id",
  verifyToken,
  authorize("admin", "manager"),
  inventoryController.adjustProductPrice
);
router.put(
  "/updateInventory/:id",
  verifyToken,
  authorize("admin", "manager", "inventory"),
  inventoryController.updateProduct
);
router.delete(
  "/deleteInventory/:id",
  verifyToken,
  authorize("admin", "manager"),
  inventoryController.deleteProduct
);
router.post(
  "/bulkDelete",
  verifyToken,
  authorize("admin", "manager"),
  inventoryController.bulkDeleteProducts
);
router.get("/export/csv", verifyToken, inventoryController.exportInventoryCsv);
router.get(
  "/export/excel",
  verifyToken,
  inventoryController.exportInventoryExcel
);

module.exports = router;

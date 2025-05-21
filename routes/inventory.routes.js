const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventory.controller");

router.post("/addInventory", inventoryController.addStock);
router.get("/getInventory", inventoryController.getInventory);
//router.get("/getInventory/:id", inventoryController.getInventoryById);

// router.put("/updateInventory/:id", inventoryController.updateInventory);
// router.delete("/deleteInventory/:id", inventoryController.deleteInventory);

module.exports = router;

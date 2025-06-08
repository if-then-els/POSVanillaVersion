const express = require("express");
const router = express.Router();
const salesController = require("../controllers/sales.controller");

router.post("/processSale", salesController.processSale);
router.get("/getSales", salesController.getSales);

module.exports = router;

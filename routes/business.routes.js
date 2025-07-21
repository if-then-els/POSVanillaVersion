const express = require("express");
const router = express.Router();
const {
  registerBusiness,
  getBusinessDetails,
} = require("../controllers/business.controller");
const { verifyToken } = require("../middleware/auth.middleware");

router.post("/business/register", registerBusiness);
router.get("/business/details", verifyToken, getBusinessDetails);

module.exports = router;

const express = require("express");
const router = express.Router();
const {
  registerBusiness,
  getBusinessDetails,
  getAllBusinesses,
} = require("../controllers/business.controller");
const { verifyToken } = require("../middleware/auth.middleware");

router.post("/business/register", registerBusiness);
router.get("/business/details", verifyToken, getBusinessDetails);
router.get("/businesses", getAllBusinesses);
module.exports = router;

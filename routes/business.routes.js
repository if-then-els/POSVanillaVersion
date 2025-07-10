const express = require("express");
const router = express.Router();
const {
  registerBusiness,
  getBusinessDetails,
} = require("../controllers/business.controller");
const validateBusinessRegistration = require("../middleware/validateBusinessRegistration.middleware");

router.post("/register", registerBusiness);
router.get("/business/details", getBusinessDetails);

module.exports = router;

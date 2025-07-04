const express = require("express");
const router = express.Router();
const { registerBusiness } = require("../controllers/business.controller");
const validateBusinessRegistration = require("../middleware/validateBusinessRegistration.middleware");

router.post("/register", registerBusiness);

module.exports = router;

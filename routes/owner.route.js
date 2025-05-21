const express = require("express");
const router = express.Router();
const ownerController = require("../controllers/owners.controller");
// const { verifyToken } = require("../middleware/auth.middleware");

router.post("/addOwner", ownerController.registerOwner);
router.get("/getUsers", ownerController.getNormalUsers);
router.post("/loginOwner", ownerController.logOwner);
router.post("/manageUsers", ownerController.manageUsers);

module.exports = router;

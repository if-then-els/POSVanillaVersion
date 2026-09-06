const express = require("express");
const router = express.Router();
const ownerController = require("../controllers/owners.controller");
const { verifyToken } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");

router.post("/addOwner", ownerController.registerOwner);
router.get("/getUsers", verifyToken, authorize("admin","manager"), ownerController.getNormalUsers);
router.post("/loginOwner", ownerController.logOwner);
router.post("/manageUsers", verifyToken, authorize("admin"), ownerController.manageUsers);

module.exports = router;

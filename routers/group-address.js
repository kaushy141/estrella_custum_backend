const express = require("express");
const router = express.Router();
const groupAddressController = require("../controller/group-address");
const { authenticateToken } = require("../middleware/auth");

// Create new group address
router.post("/", authenticateToken, groupAddressController.create);

// Get all group addresses with pagination and filters
router.get("/", authenticateToken, groupAddressController.getAll);

// Get group address by ID or GUID
router.get("/:id", authenticateToken, groupAddressController.getById);

// Update group address
router.put("/:id", authenticateToken, groupAddressController.update);

// Delete group address
router.delete("/:id", authenticateToken, groupAddressController.delete);

// Get group addresses by group
router.get("/group/:groupId", authenticateToken, groupAddressController.getByGroup);

// Search group addresses by location
router.get("/search/location", authenticateToken, groupAddressController.searchByLocation);

module.exports = router;

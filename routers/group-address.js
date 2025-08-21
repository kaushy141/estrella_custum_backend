const express = require("express");
const router = express.Router();
const groupAddressController = require("../controller/group-address");

// Create new group address
router.post("/", groupAddressController.create);

// Get all group addresses with pagination and filters
router.get("/", groupAddressController.getAll);

// Get group address by ID or GUID
router.get("/:id", groupAddressController.getById);

// Update group address
router.put("/:id", groupAddressController.update);

// Delete group address
router.delete("/:id", groupAddressController.delete);

// Get group addresses by group
router.get("/group/:groupId", groupAddressController.getByGroup);

// Search group addresses by location
router.get("/search/location", groupAddressController.searchByLocation);

module.exports = router;

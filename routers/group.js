const express = require("express");
const router = express.Router();
const groupController = require("../controller/group");

// Create new group
router.post("/", groupController.create);

// Get all groups with pagination and filters
router.get("/", groupController.getAll);

// Get group by ID or GUID
router.get("/:id", groupController.getById);

// Update group
router.put("/:id", groupController.update);

// Delete group
router.delete("/:id", groupController.delete);

// Deactivate group (soft delete)
router.patch("/:id/deactivate", groupController.deactivate);
router.patch("/:id/activate", groupController.activate);

module.exports = router;

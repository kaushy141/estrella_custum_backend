const express = require("express");
const router = express.Router();
const groupController = require("../controller/group");
const { authenticateToken } = require("../middleware/auth");

// Create new group
router.post("/", authenticateToken, groupController.create);

// Get all groups with pagination and filters
router.get("/", authenticateToken, groupController.getAll);

// Get group by ID or GUID
router.get("/:id", authenticateToken, groupController.getById);

// Update group
router.put("/:id", authenticateToken, groupController.update);

// Delete group
router.delete("/:id", authenticateToken, groupController.delete);

// Deactivate group (soft delete)
router.patch("/:id/deactivate", authenticateToken, groupController.deactivate);
router.patch("/:id/activate", authenticateToken, groupController.activate);

module.exports = router;

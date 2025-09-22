const express = require("express");
const router = express.Router();
const customClearanceController = require("../controller/custom-clearance");
const { authenticateToken } = require("../middleware/auth");

// Create new custom clearance
router.post("/", authenticateToken, customClearanceController.create);

// Get all custom clearances with pagination and filters
router.get("/", authenticateToken, customClearanceController.getAll);

// Get custom clearance by ID or GUID
router.get("/:id", authenticateToken, customClearanceController.getById);

// Update custom clearance
router.put("/:id", authenticateToken, customClearanceController.update);

// Delete custom clearance
router.delete("/:id", authenticateToken, customClearanceController.delete);

// Get custom clearances by project
router.get("/project/:projectId", authenticateToken, customClearanceController.getByProject);

// Get custom clearances by group
router.get("/group/:groupId", authenticateToken, customClearanceController.getByGroup);

module.exports = router;

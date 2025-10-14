const express = require("express");
const router = express.Router();
const customClearanceController = require("../controller/custom-clearance");
const { authenticateToken } = require("../middleware/auth");

// Create new custom clearance
router.post("/", authenticateToken, customClearanceController.create);

// Get all custom clearances with pagination and filters
router.get("/", authenticateToken, customClearanceController.getAll);

// Update custom clearance
router.put("/:id", authenticateToken, customClearanceController.update);

// Delete custom clearance
router.delete("/:id", authenticateToken, customClearanceController.delete);

// Get custom clearances by project
router.get("/project/:projectId", authenticateToken, customClearanceController.getByProject);

// Get custom clearances by group
router.get("/group/:groupId", authenticateToken, customClearanceController.getByGroup);

// Generate PZ Document for a project
router.post("/generate-pz", authenticateToken, customClearanceController.generatePZDocument);

// Download custom clearance documents by project (latest by default, or get list with latest=false)
router.get("/download/project/:projectId", authenticateToken, customClearanceController.downloadByProject);

// Download custom clearance document by ID or GUID
router.get("/download/:id", authenticateToken, customClearanceController.downloadById);

// Get custom clearance by ID or GUID
router.get("/:id", authenticateToken, customClearanceController.getById);

module.exports = router;

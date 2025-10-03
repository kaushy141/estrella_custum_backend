const express = require("express");
const router = express.Router();
const customDeclarationController = require("../controller/custom-declaration");
const { uploadMiddleware } = require("../middleware/media");
const { authenticateToken } = require("../middleware/auth");

// Create new custom declaration
router.post("/", authenticateToken, uploadMiddleware("declaration").fields([{ name: "files[]", maxCount: 10 }]), customDeclarationController.create);

// Get all custom declarations with pagination and filters
router.get("/", authenticateToken, customDeclarationController.getAll);

// Get custom declaration by ID or GUID
router.get("/:id", authenticateToken, customDeclarationController.getById);

// Update custom declaration
router.put("/:id", authenticateToken, customDeclarationController.update);

// Delete custom declaration
router.delete("/:id", authenticateToken, customDeclarationController.delete);

// Get custom declarations by project
router.get("/project/:projectId", authenticateToken, customDeclarationController.getByProject);

// Get custom declarations by group
router.get("/group/:groupId", authenticateToken, customDeclarationController.getByGroup);

// Analyze custom declaration document with comprehensive invoice comparison
router.post("/analyze/:projectId", authenticateToken, customDeclarationController.analyze);

// Analyze custom declaration by ID
router.post("/analyze-by-id/:id", authenticateToken, customDeclarationController.analyzeById);

// Get custom declaration analysis results
router.get("/analyze/:projectId", authenticateToken, customDeclarationController.getAnalyze);

module.exports = router;

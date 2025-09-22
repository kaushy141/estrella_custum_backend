const express = require("express");
const router = express.Router();
const customDeclarationController = require("../controller/custom-declaration");
const { authenticateToken } = require("../middleware/auth");

// Create new custom declaration
router.post("/", authenticateToken, customDeclarationController.create);

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

module.exports = router;

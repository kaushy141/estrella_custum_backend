const express = require("express");
const router = express.Router();
const customDeclarationController = require("../controller/custom-declaration");

// Create new custom declaration
router.post("/", customDeclarationController.create);

// Get all custom declarations with pagination and filters
router.get("/", customDeclarationController.getAll);

// Get custom declaration by ID or GUID
router.get("/:id", customDeclarationController.getById);

// Update custom declaration
router.put("/:id", customDeclarationController.update);

// Delete custom declaration
router.delete("/:id", customDeclarationController.delete);

// Get custom declarations by project
router.get("/project/:projectId", customDeclarationController.getByProject);

// Get custom declarations by group
router.get("/group/:groupId", customDeclarationController.getByGroup);

module.exports = router;

const express = require("express");
const router = express.Router();
const projectController = require("../controller/project");
const { authenticateToken } = require("../middleware/auth");

// Create new project
router.post("/", authenticateToken, projectController.create);

// Get all projects with pagination and filters
router.get("/", authenticateToken, projectController.getAll);

// Get project by ID or GUID
router.get("/:id", authenticateToken, projectController.getById);

// Update project
router.put("/:id", authenticateToken, projectController.update);

// Delete project
router.delete("/:id", authenticateToken, projectController.delete);

// Get projects by group
router.get("/group/:groupId", authenticateToken, projectController.getByGroup);

module.exports = router;

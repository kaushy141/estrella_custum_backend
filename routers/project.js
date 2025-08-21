const express = require("express");
const router = express.Router();
const projectController = require("../controller/project");

// Create new project
router.post("/", projectController.create);

// Get all projects with pagination and filters
router.get("/", projectController.getAll);

// Get project by ID or GUID
router.get("/:id", projectController.getById);

// Update project
router.put("/:id", projectController.update);

// Delete project
router.delete("/:id", projectController.delete);

// Get projects by group
router.get("/group/:groupId", projectController.getByGroup);

module.exports = router;

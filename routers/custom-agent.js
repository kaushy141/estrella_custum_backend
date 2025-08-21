const express = require("express");
const router = express.Router();
const customAgentController = require("../controller/custom-agent");

// Create new custom agent
router.post("/", customAgentController.create);

// Get all custom agents with pagination and filters
router.get("/", customAgentController.getAll);

// Get custom agent by ID or GUID
router.get("/:id", customAgentController.getById);

// Update custom agent
router.put("/:id", customAgentController.update);

// Delete custom agent
router.delete("/:id", customAgentController.delete);

// Get custom agents by group
router.get("/group/:groupId", customAgentController.getByGroup);

module.exports = router;

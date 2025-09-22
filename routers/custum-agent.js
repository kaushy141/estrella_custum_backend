const express = require("express");
const router = express.Router();
const customAgentController = require("../controller/custom-agent");
const { authenticateToken } = require("../middleware/auth");

// Create new custom agent
router.post("/", authenticateToken, customAgentController.create);

// Get all custom agents with pagination and filters
router.get("/", authenticateToken, customAgentController.getAll);

// Get custom agent by ID or GUID
router.get("/:id", authenticateToken, customAgentController.getById);

// Update custom agent
router.put("/:id", authenticateToken, customAgentController.update);

// Delete custom agent
router.delete("/:id", authenticateToken, customAgentController.delete);

// Get custom agents by group
router.get("/group/:groupId", authenticateToken, customAgentController.getByGroup);

//send to custom agent
router.post("/send-to-custom-agent", authenticateToken, customAgentController.sendToCustomAgent);

module.exports = router;

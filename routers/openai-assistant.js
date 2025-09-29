const express = require("express");
const router = express.Router();
const openaiAssistantController = require("../controller/openai-assistant");
const { authenticateToken } = require("../middleware/auth");

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Initialize the assistant manager service
// POST /openai-assistant/initialize
router.post("/initialize", openaiAssistantController.initializeService);

// Get current assistant ID and service status
// GET /openai-assistant/current
router.get("/current", openaiAssistantController.getCurrentAssistantId);

// Get service status
// GET /openai-assistant/status
router.get("/status", openaiAssistantController.getServiceStatus);

// Get assistant details by ID (optional - uses current if not provided)
// GET /openai-assistant/details/:assistantId?
router.get("/details/:assistantId?", openaiAssistantController.getAssistantDetails);

// List all assistants
// GET /openai-assistant/list
router.get("/list", openaiAssistantController.listAssistants);

// Refresh assistant ID
// POST /openai-assistant/refresh
router.post("/refresh", openaiAssistantController.refreshAssistantId);

// Update assistant configuration
// PUT /openai-assistant/update/:assistantId
router.put("/update/:assistantId", openaiAssistantController.updateAssistant);

// Delete an assistant
// DELETE /openai-assistant/delete/:assistantId
router.delete("/delete/:assistantId", openaiAssistantController.deleteAssistant);

// Cleanup old assistants
// POST /openai-assistant/cleanup
router.post("/cleanup", openaiAssistantController.cleanupAssistants);

// Set refresh interval
// PUT /openai-assistant/refresh-interval
router.put("/refresh-interval", openaiAssistantController.setRefreshInterval);

module.exports = router;

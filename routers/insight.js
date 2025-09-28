const express = require("express");
const router = express.Router();
const insightController = require("../controller/insight");
const { authenticateToken } = require("../middleware/auth");
const validationMiddleware = require("../middleware/validation");

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Send project insights email to active custom agents
router.post("/send-project-insights", validationMiddleware.validateProjectInsights, insightController.sendProjectInsights);

// Send custom declaration insights email to active custom agents and shipping service users
router.post("/send-custom-declaration-insights", validationMiddleware.validateCustomDeclarationInsights, insightController.sendCustomDeclarationInsights);

// Send combined insights (invoice + custom declaration) to all relevant recipients
router.post("/send-combined-insights", validationMiddleware.validateCombinedInsights, insightController.sendCombinedInsights);

module.exports = router;

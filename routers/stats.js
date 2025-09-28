const express = require("express");
const router = express.Router();
const statsController = require("../controller/stats");
const { authenticateToken } = require("../middleware/auth");

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get basic statistics for all entities
// GET /stats
router.get("/", statsController.getAllStats);

// Get detailed statistics with breakdowns
// GET /stats/detailed
router.get("/detailed", statsController.getDetailedStats);

// Get statistics for a specific entity
// GET /stats/:entity
// Valid entities: users, projects, groups, customAgents, shippingServices, addresses
router.get("/:entity", statsController.getEntityStats);

module.exports = router;

const express = require("express");
const router = express.Router();
const activityLogController = require("../controller/activity-log");
const { authenticateToken } = require("../middleware/auth");

// Create new activity log
router.post("/",authenticateToken, activityLogController.create);

// Get all activity logs with pagination and filters
router.get("/", authenticateToken, activityLogController.getAll);

// Get activity log by ID or GUID
router.get("/:id", authenticateToken, activityLogController.getById);

// Update activity log
router.put("/:id", authenticateToken, activityLogController.update);

// Delete activity log
router.delete("/:id", authenticateToken, activityLogController.delete);

// Get activity logs by project
router.get("/project/:projectId", authenticateToken, activityLogController.getByProject);

// Get activity logs by group
router.get("/group/:groupId", authenticateToken, activityLogController.getByGroup);

// Search activity logs
router.get("/search", authenticateToken, activityLogController.search);

module.exports = router;

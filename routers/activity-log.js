const express = require("express");
const router = express.Router();
const activityLogController = require("../controller/activity-log");

// Create new activity log
router.post("/", activityLogController.create);

// Get all activity logs with pagination and filters
router.get("/", activityLogController.getAll);

// Get activity log by ID or GUID
router.get("/:id", activityLogController.getById);

// Update activity log
router.put("/:id", activityLogController.update);

// Delete activity log
router.delete("/:id", activityLogController.delete);

// Get activity logs by project
router.get("/project/:projectId", activityLogController.getByProject);

// Get activity logs by group
router.get("/group/:groupId", activityLogController.getByGroup);

// Search activity logs
router.get("/search", activityLogController.search);

module.exports = router;

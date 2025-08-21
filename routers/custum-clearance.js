const express = require("express");
const router = express.Router();
const customClearanceController = require("../controller/custom-clearance");
const { uploadMiddleware } = require("../middleware/media");

// Create new custom clearance
router.post("/", uploadMiddleware("clearance").fields([{ name: "files[]", maxCount: 10 }]), customClearanceController.create);

// Get all custom clearances with pagination and filters
router.get("/", customClearanceController.getAll);

// Get custom clearance by ID or GUID
router.get("/:id", customClearanceController.getById);

// Update custom clearance
router.put("/:id", customClearanceController.update);

// Delete custom clearance
router.delete("/:id", customClearanceController.delete);

// Get custom clearances by project
router.get("/project/:projectId", customClearanceController.getByProject);

// Get custom clearances by group
router.get("/group/:groupId", customClearanceController.getByGroup);

module.exports = router;

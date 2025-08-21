const express = require("express");
const router = express.Router();
const userController = require("../controller/user");

// Create new user
router.post("/", userController.create);

// Get all users with pagination and filters
router.get("/", userController.getAll);

// Get user by ID or GUID
router.get("/:id", userController.getById);

// Update user
router.put("/:id", userController.update);

// Delete user
router.delete("/:id", userController.delete);

// Get users by group
router.get("/group/:groupId", userController.getByGroup);

// Search users
router.get("/search", userController.search);

module.exports = router;

const express = require("express");
const router = express.Router();
const userController = require("../controller/user");
const { authenticateToken } = require("../middleware/auth");

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

// Get user profile (current authenticated user)
router.get("/profile", authenticateToken, userController.getProfile);

// Update user profile (current authenticated user)
router.put("/profile", authenticateToken, userController.updateProfile);

// Change password (current authenticated user)
router.put("/change-password", authenticateToken, userController.changePassword);

module.exports = router;

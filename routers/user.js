const express = require("express");
const router = express.Router();
const userController = require("../controller/user");
const { authenticateToken } = require("../middleware/auth");

// Create new user
router.post("/", authenticateToken, userController.create);

// Get all users with pagination and filters
router.get("/", authenticateToken, userController.getAll);

// Get user by ID or GUID
router.get("/:id", authenticateToken, userController.getById);

// Update user
router.put("/:id", authenticateToken, userController.update);

// Delete user
router.delete("/:id", authenticateToken, userController.delete);

// Get users by group
router.get("/group/:groupId", authenticateToken, userController.getByGroup);

// Search users
router.get("/search", authenticateToken, userController.search);

// Get user profile (current authenticated user)
router.get("/profile", authenticateToken, userController.getProfile);

// Update user profile (current authenticated user)
router.put("/profile", authenticateToken, userController.updateProfile);

// Change password (current authenticated user)
router.put("/change-password", authenticateToken, userController.changePassword);

module.exports = router;

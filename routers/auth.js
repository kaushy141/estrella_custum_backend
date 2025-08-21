const express = require("express");
const router = express.Router();
const authController = require("../controller/auth");

// User login
router.post("/login", authController.login);

// User logout
router.post("/logout", authController.logout);

// Verify token
router.get("/verify", authController.verifyToken);

// Refresh token
router.post("/refresh", authController.refreshToken);

module.exports = router;

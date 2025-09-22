const express = require("express");
const router = express.Router();
const shippingServiceController = require("../controller/shipping-service");
const { authenticateToken } = require("../middleware/auth");

// Create new shipping service
router.post("/", authenticateToken, shippingServiceController.create);

// Get all shipping services with pagination and filters
router.get("/", authenticateToken, shippingServiceController.getAll);

// Get shipping service by ID or GUID
router.get("/:id", authenticateToken, shippingServiceController.getById);

// Update shipping service
router.put("/:id", authenticateToken, shippingServiceController.update);

// Delete shipping service
router.delete("/:id", authenticateToken, shippingServiceController.delete);

// Get shipping services by group
router.get("/group/:groupId", authenticateToken, shippingServiceController.getByGroup);

module.exports = router;

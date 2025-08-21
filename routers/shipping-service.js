const express = require("express");
const router = express.Router();
const shippingServiceController = require("../controller/shipping-service");

// Create new shipping service
router.post("/", shippingServiceController.create);

// Get all shipping services with pagination and filters
router.get("/", shippingServiceController.getAll);

// Get shipping service by ID or GUID
router.get("/:id", shippingServiceController.getById);

// Update shipping service
router.put("/:id", shippingServiceController.update);

// Delete shipping service
router.delete("/:id", shippingServiceController.delete);

// Get shipping services by group
router.get("/group/:groupId", shippingServiceController.getByGroup);

module.exports = router;

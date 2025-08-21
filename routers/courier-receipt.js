const express = require("express");
const router = express.Router();
const courierReceiptController = require("../controller/courier-receipt");

// Create new courier receipt
router.post("/", courierReceiptController.create);

// Get all courier receipts with pagination and filters
router.get("/", courierReceiptController.getAll);

// Get courier receipt by ID or GUID
router.get("/:id", courierReceiptController.getById);

// Update courier receipt
router.put("/:id", courierReceiptController.update);

// Delete courier receipt
router.delete("/:id", courierReceiptController.delete);

// Get courier receipts by project
router.get("/project/:projectId", courierReceiptController.getByProject);

// Get courier receipts by group
router.get("/group/:groupId", courierReceiptController.getByGroup);

module.exports = router;

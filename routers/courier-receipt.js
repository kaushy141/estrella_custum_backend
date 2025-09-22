const express = require("express");
const router = express.Router();
const courierReceiptController = require("../controller/courier-receipt");
const { uploadMiddleware } = require("../middleware/media");
const { authenticateToken } = require("../middleware/auth");

// Create new courier receipt
router.post("/", authenticateToken, uploadMiddleware("courier").fields([{ name: "files[]", maxCount: 10 }]), courierReceiptController.create);

// Get all courier receipts with pagination and filters
router.get("/", authenticateToken, courierReceiptController.getAll);

// Get courier receipt by ID or GUID
router.get("/:id", authenticateToken, courierReceiptController.getById);

// Update courier receipt
router.put("/:id", authenticateToken, courierReceiptController.update);

// Delete courier receipt
router.delete("/:id", authenticateToken, courierReceiptController.delete);

// Get courier receipts by project
router.get("/project/:projectId", authenticateToken, courierReceiptController.getByProject);

// Get courier receipts by group
router.get("/group/:groupId", authenticateToken, courierReceiptController.getByGroup);

module.exports = router;

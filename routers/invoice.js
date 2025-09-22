const express = require("express");
const router = express.Router();
const invoiceController = require("../controller/invoice");
const { uploadMiddleware } = require("../middleware/media");
const { authenticateToken } = require("../middleware/auth");

// Create new invoice
router.post("/", authenticateToken, uploadMiddleware("invoices").fields([{ name: "files[]", maxCount: 10 }]), invoiceController.create);

// Get all invoices with pagination and filters
router.get("/", authenticateToken, invoiceController.getAll);

// Get invoice by ID or GUID
router.get("/:id", authenticateToken, invoiceController.getById);

// Update invoice
router.put("/:id", authenticateToken, uploadMiddleware("invoices").fields([{ name: "originalFiles[]", maxCount: 10 }, { name: "translatedFiles[]", maxCount: 10 }]), invoiceController.update);

// Delete invoice
router.delete("/:id", authenticateToken, invoiceController.delete);

// Get invoices by project
router.get("/project/:projectId", authenticateToken, invoiceController.getByProject);

// Get invoices by group
router.get("/group/:groupId", authenticateToken, invoiceController.getByGroup);

// Translate invoice
router.post("/translate/:id", authenticateToken, invoiceController.translate);

module.exports = router;

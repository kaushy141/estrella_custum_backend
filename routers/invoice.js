const express = require("express");
const router = express.Router();
const invoiceController = require("../controller/invoice");
const { uploadMiddleware } = require("../middleware/media");
// Create new invoice
router.post("/", uploadMiddleware("invoices").fields([{ name: "files[]", maxCount: 10 }]), invoiceController.create);

// Get all invoices with pagination and filters
router.get("/", invoiceController.getAll);

// Get invoice by ID or GUID
router.get("/:id", invoiceController.getById);

// Update invoice
router.put("/:id", uploadMiddleware("invoices").fields([{ name: "originalFiles[]", maxCount: 10 }, { name: "translatedFiles[]", maxCount: 10 }]), invoiceController.update);

// Delete invoice
router.delete("/:id", invoiceController.delete);

// Get invoices by project
router.get("/project/:projectId", invoiceController.getByProject);

// Get invoices by group
router.get("/group/:groupId", invoiceController.getByGroup);

module.exports = router;

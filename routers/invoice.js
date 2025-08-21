const express = require("express");
const router = express.Router();
const invoiceController = require("../controller/invoice");

// Create new invoice
router.post("/", invoiceController.create);

// Get all invoices with pagination and filters
router.get("/", invoiceController.getAll);

// Get invoice by ID or GUID
router.get("/:id", invoiceController.getById);

// Update invoice
router.put("/:id", invoiceController.update);

// Delete invoice
router.delete("/:id", invoiceController.delete);

// Get invoices by project
router.get("/project/:projectId", invoiceController.getByProject);

// Get invoices by group
router.get("/group/:groupId", invoiceController.getByGroup);

module.exports = router;

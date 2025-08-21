const express = require("express");
const router = express.Router();

// Import all route modules
const authRouter = require("./auth");
const userRouter = require("./user");
const groupRouter = require("./group");
const projectRouter = require("./project");
const invoiceRouter = require("./invoice");
const shippingServiceRouter = require("./shipping-service");
const customAgentRouter = require("./custom-agent");
const customClearanceRouter = require("./custom-clearance");
const customDeclarationRouter = require("./custom-declaration");
const courierReceiptRouter = require("./courier-receipt");
const groupAddressRouter = require("./group-address");
const activityLogRouter = require("./activity-log");
const aiWebhookRouter = require("./ai-webhook");

// Mount all routes
router.use("/auth", authRouter);
router.use("/user", userRouter);
router.use("/group", groupRouter);
router.use("/project", projectRouter);
router.use("/invoice", invoiceRouter);
router.use("/shipping-service", shippingServiceRouter);
router.use("/custom-agent", customAgentRouter);
router.use("/custom-clearance", customClearanceRouter);
router.use("/custom-declaration", customDeclarationRouter);
router.use("/courier-receipt", courierReceiptRouter);
router.use("/group-address", groupAddressRouter);
router.use("/activity-log", activityLogRouter);
router.use("/ai-webhook", aiWebhookRouter);

module.exports = router;

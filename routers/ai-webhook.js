const express = require('express');
const router = express.Router();
const { authenticateAIWebhook } = require('../middleware/ai-webhook-auth');
const {
  updateInvoiceContent,
  updateCourierReceiptContent,
  updateCustomClearanceContent,
  updateCustomDeclarationContent,
  bulkUpdateInvoices
} = require('../controller/ai-webhook');

// Apply AI webhook authentication to all routes
router.use(authenticateAIWebhook);

/**
 * @route POST /ai-webhook/invoice/update
 * @desc Update invoice file content (translatedFilePath, originalFileContent, translatedFileContent)
 * @access AI Agent only (authenticated via token)
 */
router.post('/invoice/update', updateInvoiceContent);

/**
 * @route POST /ai-webhook/invoice/bulk-update
 * @desc Bulk update multiple invoices
 * @access AI Agent only (authenticated via token)
 */
router.post('/invoice/bulk-update', bulkUpdateInvoices);

/**
 * @route POST /ai-webhook/courier-receipt/update
 * @desc Update courier receipt file content
 * @access AI Agent only (authenticated via token)
 */
router.post('/courier-receipt/update', updateCourierReceiptContent);

/**
 * @route POST /ai-webhook/custom-clearance/update
 * @desc Update custom clearance file content and insights
 * @access AI Agent only (authenticated via token)
 */
router.post('/custom-clearance/update', updateCustomClearanceContent);

/**
 * @route POST /ai-webhook/custom-declaration/update
 * @desc Update custom declaration file content and insights
 * @access AI Agent only (authenticated via token)
 */
router.post('/custom-declaration/update', updateCustomDeclarationContent);

/**
 * @route GET /ai-webhook/health
 * @desc Health check endpoint for AI webhook service
 * @access AI Agent only (authenticated via token)
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'AI Webhook service is healthy',
    timestamp: new Date().toISOString(),
    aiAgent: req.aiAgent
  });
});

module.exports = router;

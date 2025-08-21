const { Invoice } = require('../models/invoice-model');
const { CourierReceipt } = require('../models/courier-receipt-model');
const { CustomClearance } = require('../models/custom-clearance-model');
const { CustomDeclaration } = require('../models/custom-declaration-model');
const { ActivityLog } = require('../models/activity-log-model');
const { Project } = require('../models/project-model');
const { Group } = require('../models/group-model');

/**
 * Update invoice file content via webhook
 */
const updateInvoiceContent = async (req, res) => {
  try {
    const { guid, translatedFilePath, originalFileContent, translatedFileContent } = req.body;

    if (!guid) {
      return res.status(400).json({
        success: false,
        message: 'Invoice GUID is required'
      });
    }

    // Find invoice by GUID
    const invoice = await Invoice.findOne({
      where: { guid },
      include: [
        { model: Project, as: 'project' },
        { model: Group, as: 'group' }
      ]
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Update fields
    const updateData = {};
    if (translatedFilePath) updateData.translatedFilePath = translatedFilePath;
    if (originalFileContent) updateData.originalFileContent = originalFileContent;
    if (translatedFileContent) updateData.translatedFileContent = translatedFileContent;

    await invoice.update(updateData);

    // Log activity
    await ActivityLog.create({
      guid: require('crypto').randomUUID(),
      projectId: invoice.projectId,
      groupId: invoice.groupId,
      action: 'AI_WEBHOOK_UPDATE',
      description: `Invoice file content updated via AI webhook. Updated fields: ${Object.keys(updateData).join(', ')}`,
      createdBy: req.aiAgent.email
    });

    res.json({
      success: true,
      message: 'Invoice content updated successfully',
      data: {
        guid: invoice.guid,
        updatedFields: Object.keys(updateData)
      }
    });

  } catch (error) {
    console.error('Error updating invoice content:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Update courier receipt file content via webhook
 */
const updateCourierReceiptContent = async (req, res) => {
  try {
    const { guid, fileContent } = req.body;

    if (!guid) {
      return res.status(400).json({
        success: false,
        message: 'Courier receipt GUID is required'
      });
    }

    if (!fileContent) {
      return res.status(400).json({
        success: false,
        message: 'File content is required'
      });
    }

    // Find courier receipt by GUID
    const courierReceipt = await CourierReceipt.findOne({
      where: { guid },
      include: [
        { model: Project, as: 'project' },
        { model: Group, as: 'group' }
      ]
    });

    if (!courierReceipt) {
      return res.status(404).json({
        success: false,
        message: 'Courier receipt not found'
      });
    }

    // Update file content
    await courierReceipt.update({ fileContent });

    // Log activity
    await ActivityLog.create({
      guid: require('crypto').randomUUID(),
      projectId: courierReceipt.projectId,
      groupId: courierReceipt.groupId,
      action: 'AI_WEBHOOK_UPDATE',
      description: 'Courier receipt file content updated via AI webhook',
      createdBy: req.aiAgent.email
    });

    res.json({
      success: true,
      message: 'Courier receipt content updated successfully',
      data: {
        guid: courierReceipt.guid,
        updatedFields: ['fileContent']
      }
    });

  } catch (error) {
    console.error('Error updating courier receipt content:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Update custom clearance file content and insights via webhook
 */
const updateCustomClearanceContent = async (req, res) => {
  try {
    const { guid, fileContent, insights } = req.body;

    if (!guid) {
      return res.status(400).json({
        success: false,
        message: 'Custom clearance GUID is required'
      });
    }

    // Find custom clearance by GUID
    const customClearance = await CustomClearance.findOne({
      where: { guid },
      include: [
        { model: Project, as: 'project' },
        { model: Group, as: 'group' }
      ]
    });

    if (!customClearance) {
      return res.status(404).json({
        success: false,
        message: 'Custom clearance not found'
      });
    }

    // Update fields
    const updateData = {};
    if (fileContent) updateData.fileContent = fileContent;
    if (insights) updateData.insights = insights;

    await customClearance.update(updateData);

    // Log activity
    await ActivityLog.create({
      guid: require('crypto').randomUUID(),
      projectId: customClearance.projectId,
      groupId: customClearance.groupId,
      action: 'AI_WEBHOOK_UPDATE',
      description: `Custom clearance content updated via AI webhook. Updated fields: ${Object.keys(updateData).join(', ')}`,
      createdBy: req.aiAgent.email
    });

    res.json({
      success: true,
      message: 'Custom clearance content updated successfully',
      data: {
        guid: customClearance.guid,
        updatedFields: Object.keys(updateData)
      }
    });

  } catch (error) {
    console.error('Error updating custom clearance content:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Update custom declaration file content and insights via webhook
 */
const updateCustomDeclarationContent = async (req, res) => {
  try {
    const { guid, fileContent, insights } = req.body;

    if (!guid) {
      return res.status(400).json({
        success: false,
        message: 'Custom declaration GUID is required'
      });
    }

    // Find custom declaration by GUID
    const customDeclaration = await CustomDeclaration.findOne({
      where: { guid },
      include: [
        { model: Project, as: 'project' },
        { model: Group, as: 'group' }
      ]
    });

    if (!customDeclaration) {
      return res.status(404).json({
        success: false,
        message: 'Custom declaration not found'
      });
    }

    // Update fields
    const updateData = {};
    if (fileContent) updateData.fileContent = fileContent;
    if (insights) updateData.insights = insights;

    await customDeclaration.update(updateData);

    // Log activity
    await ActivityLog.create({
      guid: require('crypto').randomUUID(),
      projectId: customDeclaration.projectId,
      groupId: customDeclaration.groupId,
      action: 'AI_WEBHOOK_UPDATE',
      description: `Custom declaration content updated via AI webhook. Updated fields: ${Object.keys(updateData).join(', ')}`,
      createdBy: req.aiAgent.email
    });

    res.json({
      success: true,
      message: 'Custom declaration content updated successfully',
      data: {
        guid: customDeclaration.guid,
        updatedFields: Object.keys(updateData)
      }
    });

  } catch (error) {
    console.error('Error updating custom declaration content:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Bulk update multiple invoices via webhook
 */
const bulkUpdateInvoices = async (req, res) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Updates array is required and must not be empty'
      });
    }

    const results = [];
    const errors = [];

    for (const update of updates) {
      try {
        const { guid, translatedFilePath, originalFileContent, translatedFileContent } = update;

        if (!guid) {
          errors.push({ guid: guid || 'unknown', error: 'GUID is required' });
          continue;
        }

        const invoice = await Invoice.findOne({ where: { guid } });
        if (!invoice) {
          errors.push({ guid, error: 'Invoice not found' });
          continue;
        }

        const updateData = {};
        if (translatedFilePath) updateData.translatedFilePath = translatedFilePath;
        if (originalFileContent) updateData.originalFileContent = originalFileContent;
        if (translatedFileContent) updateData.translatedFileContent = translatedFileContent;

        await invoice.update(updateData);

        // Log activity for each update
        await ActivityLog.create({
          guid: require('crypto').randomUUID(),
          projectId: invoice.projectId,
          groupId: invoice.groupId,
          action: 'AI_WEBHOOK_BULK_UPDATE',
          description: `Invoice bulk updated via AI webhook. Updated fields: ${Object.keys(updateData).join(', ')}`,
          createdBy: req.aiAgent.email
        });

        results.push({ guid, success: true, updatedFields: Object.keys(updateData) });

      } catch (error) {
        errors.push({ guid: update.guid || 'unknown', error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Bulk update completed. ${results.length} successful, ${errors.length} failed.`,
      data: {
        successful: results,
        errors: errors
      }
    });

  } catch (error) {
    console.error('Error in bulk update:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  updateInvoiceContent,
  updateCourierReceiptContent,
  updateCustomClearanceContent,
  updateCustomDeclarationContent,
  bulkUpdateInvoices
};

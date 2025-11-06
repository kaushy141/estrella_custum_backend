const { Invoice } = require("../models/invoice-model");
const { Project } = require("../models/project-model");
const { Group } = require("../models/group-model");
const { sendResponseWithData } = require("../helper/commonResponseHandler");
const { SuccessCode, ErrorCode } = require("../helper/statusCode");
const activityHelper = require("../helper/activityHelper");
const { translateDocument } = require("../services/doc-translation.service");
const commonHelper = require("../helper/common-helper");
const _ = require("lodash");
const openAIHelper = require("../helper/openai-helper");
const { extractInvoiceData } = require("../helper/invoice-helper");
const logger = require("../utils/logger");
const controller = {
  // Create new invoice
  create: async function (req, res) {
    try {
      const data = req.body;
      console.log("data", data);
      // Verify project exists
      const project = await Project.findOne({
        where: { guid: data.projectId },
      });

      console.log("project", project);
      if (!project) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Project not found",
          null
        );
      }
      // Verify group exists
      const group = await Group.findOne({ where: { guid: data.groupId } });
      console.log("group", group);
      if (!group) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Group not found",
          null
        );
      }

      let originalFilePath = null;
      console.log("req?.files", req?.files);



      if (req?.files && req?.files["files[]"]) {
        originalFilePath = req?.files["files[]"][0]?.path;
      }
      if (req?.files && req?.files["files[]"]) {
        data.originalFileName = req?.files["files[]"][0]?.filename;
      }
      data.originalFilePath = originalFilePath;

      logger.log("Starting data extraction from the original file", originalFilePath);
      const originalFileContent = await extractInvoiceData(originalFilePath);
      //console.log("originalFileContent", originalFileContent);
      data.originalFileContent = JSON.stringify(originalFileContent);

      // Convert GUIDs to actual IDs for foreign key constraints
      data.projectId = project.id;
      data.groupId = group.id;

      const invoice = await Invoice.create(data);
      // Log activity

      try {
        await activityHelper.logInvoiceCreation(
          invoice,
          req.userId || data.createdBy || 1
        );
      } catch (activityError) {
        console.error("Activity logging failed:", activityError);
        // Don't fail the main operation if activity logging fails
      }

      let responseData = {
        status: "success",
        data: invoice,
      };

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Invoice created successfully",
        responseData
      );
    } catch (err) {
      console.error("Invoice creation failed:", err);
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to create invoice",
        err
      );
    }
  },

  // Get all invoices
  getAll: async function (req, res) {
    try {
      const { page = 1, limit = 10, projectId } = req.query;
      const offset = (page - 1) * limit;
      const groupId = req.groupId;
      const isSuperAdmin = req.isSuperAdmin;
      const project = await Project.findOne({ where: { guid: projectId } });
      const group = await Group.findOne({ where: { guid: groupId } });
      if (!project) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Project not found",
          null
        );
      }

      let whereClause = {};
      whereClause.projectId = project.id;
      whereClause.groupId = groupId;
      if (isSuperAdmin) {
        _.omit(whereClause, "groupId");
      }
      const invoices = await Invoice.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Project,
            as: "project",
            attributes: ["id", "title", "status"],
          },
          {
            model: Group,
            as: "group",
            attributes: ["id", "name", "logo"],
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["createdAt", "DESC"]],
      });

      let responseData = {
        status: "success",
        data: invoices.rows,
        count: invoices.count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(invoices.count / limit),
      };

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Invoices loaded successfully",
        responseData
      );
    } catch (err) {
      console.log("Invoice getAll error", err);
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load invoices",
        err
      );
    }
  },

  // Get invoice by ID or GUID
  getById: async function (req, res) {
    try {
      const { id } = req.params;

      const invoice = await Invoice.findOne({
        where: {
          $or: [{ id: id }, { guid: id }],
        },
        include: [
          {
            model: Project,
            as: "project",
            attributes: ["id", "title", "status", "description"],
          },
          {
            model: Group,
            as: "group",
            attributes: ["id", "name", "logo", "description"],
          },
        ],
      });

      if (!invoice) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Invoice not found",
          null
        );
      }

      let responseData = {
        status: "success",
        data: invoice,
      };

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Invoice loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load invoice",
        err
      );
    }
  },

  // Update invoice
  update: async function (req, res) {
    try {
      const { id } = req.params;
      const data = req.body;

      const invoice = await Invoice.findOne({
        where: {
          $or: [{ id: id }, { guid: id }],
        },
      });

      if (!invoice) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Invoice not found",
          null
        );
      }

      // Verify project exists if projectId is being updated
      if (data.projectId) {
        const project = await Project.findByPk(data.projectId);
        if (!project) {
          return sendResponseWithData(
            res,
            ErrorCode.NOT_FOUND,
            "Project not found",
            null
          );
        }
      }

      // Verify group exists if groupId is being updated
      if (data.groupId) {
        const group = await Group.findByPk(data.groupId);
        if (!group) {
          return sendResponseWithData(
            res,
            ErrorCode.NOT_FOUND,
            "Group not found",
            null
          );
        }
      }

      if (req?.files && req?.files["originalFiles[]"]) {
        data.originalFilePath = req?.files["originalFiles[]"][0]?.path;
      }

      if (req?.files && req?.files["translatedFiles[]"]) {
        data.translatedFilePath = req?.files["translatedFiles[]"][0]?.path;
      }

      await invoice.update(data);
      const updatedInvoice = await invoice.save();

      // Log update activity
      try {
        await activityHelper.logActivity({
          projectId: invoice.projectId,
          groupId: invoice.groupId,
          action: "INVOICE_UPDATED",
          description: `Invoice updated for project ID: ${invoice.projectId}`,
          createdBy: req.userId || 1
        });
      } catch (activityError) {
        console.error("Activity logging failed:", activityError);
        // Don't fail the main operation if activity logging fails
      }

      let responseData = {
        status: "success",
        data: updatedInvoice,
      };

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Invoice updated successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to update invoice",
        err
      );
    }
  },

  // Delete invoice
  delete: async function (req, res) {
    try {
      const { id } = req.params;

      const invoice = await Invoice.findOne({
        where: {
          $or: [{ guid: id }],
        },
      });

      if (!invoice) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Invoice not found",
          null
        );
      }

      // Log deletion activity before destroying
      try {
        await activityHelper.logActivity({
          projectId: invoice.projectId,
          groupId: invoice.groupId,
          action: "INVOICE_DELETED",
          description: `Invoice deleted for project ID: ${invoice.projectId}`,
          createdBy: req.userId || 1
        });
      } catch (activityError) {
        console.error("Activity logging failed:", activityError);
        // Don't fail the main operation if activity logging fails
      }

      // Delete OpenAI files before destroying the invoice
      try {
        const openAIDeleted = await openAIHelper.deleteInvoiceOpenAIFiles(invoice);
        if (openAIDeleted) {
          console.log(`✅ OpenAI files deleted for invoice ${invoice.id}`);
        } else {
          console.log(`⚠️ Some OpenAI files could not be deleted for invoice ${invoice.id}`);
        }
      } catch (openAIError) {
        console.error("OpenAI file deletion failed:", openAIError);
        // Don't fail the main operation if OpenAI file deletion fails
      }

      await invoice.destroy();

      let responseData = {
        status: "success",
        message: "Invoice deleted successfully",
      };

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Invoice deleted successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to delete invoice",
        err
      );
    }
  },

  // Get invoices by project
  getByProject: async function (req, res) {
    try {
      const { projectId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const invoices = await Invoice.findAndCountAll({
        where: { projectId },
        include: [
          {
            model: Group,
            as: "group",
            attributes: ["id", "name", "logo"],
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["createdAt", "DESC"]],
      });

      let responseData = {
        status: "success",
        data: invoices.rows,
        count: invoices.count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(invoices.count / limit),
      };

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Invoices loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load invoices",
        err
      );
    }
  },

  // Get invoices by group
  getByGroup: async function (req, res) {
    try {
      const { groupId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const invoices = await Invoice.findAndCountAll({
        where: { groupId },
        include: [
          {
            model: Project,
            as: "project",
            attributes: ["id", "title", "status"],
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["createdAt", "DESC"]],
      });

      let responseData = {
        status: "success",
        data: invoices.rows,
        count: invoices.count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(invoices.count / limit),
      };

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Invoices loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load invoices",
        err
      );
    }
  },
  translate: async function (req, res) {
    try {
      const { id } = req.params;

      const project = await Project.findOne({ where: { guid: id } });
      if (!project) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Project not found",
          null
        );
      }
      await Invoice.update(
        {
          translatedLanguage: project.translatedLanguage,
        },
        { where: { projectId: project.id } }
      );
      const projectInvoices = await Invoice.findAll({
        where: { projectId: project.id, translatedFileContent: null },
      });
      // Create thread ID if it doesn't exist
      let threadId = project.aiConversation;
      if (!threadId) {
        threadId = await openAIHelper.createConversationId();
        // Update project with new thread ID
        await project.update({ aiConversation: threadId });
      }

      // Process invoices sequentially to avoid concurrent run conflicts
      for (const invoice of projectInvoices) {
        try {
          console.log(`Processing invoice ${invoice.id} for project ${project.id}...`);

          await invoice.update(
            {
              status: "processing",
            },
            {
              where: { id: invoice.id },
            }
          );

          // Process translation sequentially (not in parallel)
          await openAIHelper.translateInvoice({
            id: invoice.id,
            originalFilePath: invoice.originalFilePath,
            originalFileName: invoice.originalFileName,
            originalFileContent: invoice.originalFileContent,
            language: project.language,
            translatedLanguage: project.translatedLanguage,
            currency: project.currency,
            exchangeCurrency: project.exchangeCurrency,
            exchangeRate: project.exchangeRate,
          }, threadId);

          console.log(`✅ Completed translation for invoice ${invoice.id}`);
        } catch (invoiceError) {
          console.error(`❌ Error processing invoice ${invoice.id}:`, invoiceError.message);

          // Update invoice status to failed 
          try {
            await invoice.update(
              {
                status: "failed",
                insights: invoiceError.message,
              },
              {
                where: { id: invoice.id },
              }
            );
          } catch (updateError) {
            console.error(`Failed to update invoice ${invoice.id} status:`, updateError.message);
          }

          // Continue with next invoice instead of stopping the entire process
          continue;
        }
      }
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Invoice translated successfully",
        null
      );
    } catch (err) {
      console.log("sdfsdfsdf", err);
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to translate invoice",
        err
      );
    }
  },

  // Download original invoice file by ID or GUID
  downloadOriginalById: async function (req, res) {
    try {
      const { id } = req.params;
      const groupId = req.groupId;
      const isSuperAdmin = req.isSuperAdmin;
      const { Op } = require("sequelize");
      const path = require('path');

      // Build where clause
      let whereClause = {
        [Op.or]: [
          { guid: id }
        ]
      };

      if (!isSuperAdmin) {
        whereClause.groupId = groupId;
      }

      const invoice = await Invoice.findOne({
        where: whereClause
      });

      if (!invoice) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Invoice not found",
          null
        );
      }

      if (!invoice.originalFilePath) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Original file not found for this invoice",
          null
        );
      }

      const fs = require('fs');
      const filePath = invoice.originalFilePath;
      const resolvedPath = path.resolve(filePath);

      // Check if file exists
      if (!fs.existsSync(resolvedPath)) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "File not found on server",
          { filePath: filePath }
        );
      }

      // Set headers for file download
      const fileName = invoice.originalFileName || path.basename(filePath);
      const ext = path.extname(fileName).toLowerCase();

      // Set content type based on file extension
      let contentType = 'application/octet-stream';
      if (ext === '.pdf') contentType = 'application/pdf';
      else if (ext === '.xlsx' || ext === '.xls') contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      else if (ext === '.doc' || ext === '.docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      // Stream the file
      const fileStream = fs.createReadStream(resolvedPath);
      fileStream.pipe(res);

      fileStream.on('error', (error) => {
        console.error('Error streaming file:', error);
        if (!res.headersSent) {
          return sendResponseWithData(
            res,
            ErrorCode.REQUEST_FAILED,
            "Error downloading file",
            { error: error.message }
          );
        }
      });

    } catch (err) {
      console.error('Error downloading original invoice:', err);
      if (!res.headersSent) {
        return sendResponseWithData(
          res,
          ErrorCode.REQUEST_FAILED,
          "Unable to download original invoice file",
          { error: err.message }
        );
      }
    }
  },

  // Download translated invoice file by ID or GUID
  downloadTranslatedById: async function (req, res) {
    try {
      const { id } = req.params;
      const groupId = req.groupId;
      const isSuperAdmin = req.isSuperAdmin;
      const { Op } = require("sequelize");
      const path = require('path');

      // Build where clause
      let whereClause = {
        [Op.or]: [
          { guid: id }
        ]
      };

      if (!isSuperAdmin) {
        whereClause.groupId = groupId;
      }

      const invoice = await Invoice.findOne({
        where: whereClause
      });

      if (!invoice) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Invoice not found",
          null
        );
      }

      if (!invoice.translatedFilePath) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Translated file not found for this invoice. Please ensure the invoice has been translated.",
          null
        );
      }

      const fs = require('fs');
      const filePath = invoice.translatedFilePath;
      const resolvedPath = path.resolve(filePath);

      // Check if file exists
      if (!fs.existsSync(resolvedPath)) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Translated file not found on server",
          { filePath: filePath }
        );
      }

      // Set headers for file download
      const fileName = invoice.translatedFileName || path.basename(filePath);
      const ext = path.extname(fileName).toLowerCase();

      // Set content type based on file extension
      let contentType = 'application/octet-stream';
      if (ext === '.pdf') contentType = 'application/pdf';
      else if (ext === '.xlsx' || ext === '.xls') contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      else if (ext === '.doc' || ext === '.docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      // Stream the file
      const fileStream = fs.createReadStream(resolvedPath);
      fileStream.pipe(res);

      fileStream.on('error', (error) => {
        console.error('Error streaming file:', error);
        if (!res.headersSent) {
          return sendResponseWithData(
            res,
            ErrorCode.REQUEST_FAILED,
            "Error downloading file",
            { error: error.message }
          );
        }
      });

    } catch (err) {
      console.error('Error downloading translated invoice:', err);
      if (!res.headersSent) {
        return sendResponseWithData(
          res,
          ErrorCode.REQUEST_FAILED,
          "Unable to download translated invoice file",
          { error: err.message }
        );
      }
    }
  }
};

module.exports = controller;

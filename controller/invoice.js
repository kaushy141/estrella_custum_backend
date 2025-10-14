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
const controller = {
  // Create new invoice
  create: async function (req, res) {
    try {
      const data = req.body;
      // Verify project exists
      const project = await Project.findOne({
        where: { guid: data.projectId },
      });
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
      console.log("sdfsdfsdf", err);
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
        where: { projectId: project.id },
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
};

module.exports = controller;

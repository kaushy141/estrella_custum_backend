const { CustomDeclaration } = require("../models/custom-declaration-model");
const { Project } = require("../models/project-model");
const { Group } = require("../models/group-model");
const { Invoice } = require("../models/invoice-model");
const { sendResponseWithData } = require("../helper/commonResponseHandler");
const { SuccessCode, ErrorCode } = require("../helper/statusCode");
const { Op } = require("sequelize");
const _ = require("lodash");
const activityHelper = require("../helper/activityHelper");
const openAIHelper = require("../helper/openai-helper");
const controller = {
  // Reusable function to analyze custom declaration
  analyzeCustomDeclaration: async function (customDeclaration, project, invoices) {
    try {
      // Check if custom declaration has required file
      if (!customDeclaration.filePath || !customDeclaration.fileName) {
        throw new Error("Custom declaration file is missing");
      }

      if (invoices.length === 0) {
        throw new Error("No invoices with OpenAI file IDs found for this project. Custom declaration analysis requires invoices that have been uploaded to OpenAI for comparison.");
      }

      // Get or create AI conversation thread
      let threadId = project.aiConversation;
      if (!threadId) {
        threadId = await openAIHelper.createConversationId();
        // Update project with new thread ID
        await project.update({ aiConversation: threadId });
      }

      // Note: Custom declaration model doesn't have a status field
      // The analysis will update the insights field when complete

      // Start comprehensive analysis in background
      const analysisPromise = openAIHelper.analyzeCustomDeclarationDocument(project, customDeclaration, invoices);

      // Handle the promise to avoid unhandled promise rejection
      analysisPromise
        .then((result) => {
          console.log(`Custom declaration analysis completed for custom declaration ${customDeclaration.id}:`, result);

          // Check if insights were updated
          if (result.success && result.analysisData) {
            console.log(`✅ Insights successfully updated for custom declaration ${customDeclaration.id}`);
          } else {
            console.log(`❌ Insights NOT updated for custom declaration ${customDeclaration.id}`);
            console.log('Result:', result);
          }
        })
        .catch((error) => {
          console.error(`Custom declaration analysis failed for custom declaration ${customDeclaration.id}:`, error);
        });

      return {
        success: true,
        status: "processing",
        projectId: project.id,
        customDeclarationId: customDeclaration.id,
        threadId: threadId,
        invoicesCount: invoices.length,
        message: "Comprehensive analysis is running in the background. This includes invoice comparison and mismatch detection. Check the custom declaration status for updates."
      };
    } catch (error) {
      console.error("Custom declaration analysis failed:", error);
      throw error;
    }
  },

  // Create new custom declaration
  create: async function (req, res) {
    try {
      const data = req.body;
      // Verify project exists
      const project = await Project.findOne({ where: { guid: data.projectId } });
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
      let fileName = null;
      if (req?.files && req?.files["files[]"]) {
        originalFilePath = req?.files["files[]"][0]?.path;
        // Use originalname to preserve the original uploaded filename
        fileName = req?.files["files[]"][0]?.originalname || req?.files["files[]"][0]?.filename;

        console.log('File upload details:');
        console.log('- Original filename:', req?.files["files[]"][0]?.originalname);
        console.log('- Generated filename:', req?.files["files[]"][0]?.filename);
        console.log('- Saved filename:', fileName);
        console.log('- File path:', originalFilePath);
      }
      data.projectId = project.id;
      data.groupId = group.id;
      data.filePath = originalFilePath;
      data.fileName = fileName;
      const customDeclaration = await CustomDeclaration.create(data);

      // Log activity
      try {
        await activityHelper.logCustomDeclarationCreation(
          customDeclaration,
          req.userId || data.createdBy || 1
        );
      } catch (activityError) {
        console.error("Activity logging failed:", activityError);
        // Don't fail the main operation if activity logging fails
      }

      let responseData = {
        status: "success",
        data: {
          ...customDeclaration.toJSON(),
          originalFileName: fileName,
          filePath: originalFilePath
        },
      };

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Custom declaration created successfully",
        responseData
      );
    } catch (err) {
      console.error("Error creating custom declaration:", err);
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to create custom declaration",
        err
      );
    }
  },

  // Get all custom declarations
  getAll: async function (req, res) {
    try {
      const { page = 1, limit = 10, projectId } = req.query;
      const offset = (page - 1) * limit;
      const groupId = req.groupId;
      const isSuperAdmin = req.isSuperAdmin;
      let whereClause = {};
      if (projectId) whereClause.projectId = projectId;
      whereClause.groupId = groupId;
      if (isSuperAdmin) {
        _.omit(whereClause, "groupId");
      }

      const customDeclarations = await CustomDeclaration.findAndCountAll({
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
        data: customDeclarations.rows,
        count: customDeclarations.count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(customDeclarations.count / limit),
      };

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Custom declarations loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load custom declarations",
        err
      );
    }
  },

  // Get custom declaration by ID or GUID
  getById: async function (req, res) {
    try {
      const { id } = req.params;

      const customDeclaration = await CustomDeclaration.findOne({
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

      if (!customDeclaration) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Custom declaration not found",
          null
        );
      }

      let responseData = {
        status: "success",
        data: customDeclaration,
      };

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Custom declaration loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load custom declaration",
        err
      );
    }
  },

  // Update custom declaration
  update: async function (req, res) {
    try {
      const { id } = req.params;
      const data = req.body;

      const customDeclaration = await CustomDeclaration.findOne({
        where: {
          $or: [{ id: id }, { guid: id }],
        },
      });

      if (!customDeclaration) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Custom declaration not found",
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

      await customDeclaration.update(data);
      const updatedCustomDeclaration = await customDeclaration.save();

      let responseData = {
        status: "success",
        data: updatedCustomDeclaration,
      };

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Custom declaration updated successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to update custom declaration",
        err
      );
    }
  },

  // Delete custom declaration
  delete: async function (req, res) {
    try {
      const { id } = req.params;

      const customDeclaration = await CustomDeclaration.findOne({
        where: {
          $or: [{ id: id }, { guid: id }],
        },
      });

      if (!customDeclaration) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Custom declaration not found",
          null
        );
      }

      await customDeclaration.destroy();

      let responseData = {
        status: "success",
        message: "Custom declaration deleted successfully",
      };

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Custom declaration deleted successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to delete custom declaration",
        err
      );
    }
  },

  // Get custom declarations by project
  getByProject: async function (req, res) {
    try {
      const { projectId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const customDeclarations = await CustomDeclaration.findAndCountAll({
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
        data: customDeclarations.rows,
        count: customDeclarations.count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(customDeclarations.count / limit),
      };

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Custom declarations loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load custom declarations",
        err
      );
    }
  },

  // Get custom declarations by group
  getByGroup: async function (req, res) {
    try {
      const { groupId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const customDeclarations = await CustomDeclaration.findAndCountAll({
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
        data: customDeclarations.rows,
        count: customDeclarations.count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(customDeclarations.count / limit),
      };

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Custom declarations loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load custom declarations",
        err
      );
    }
  },

  // Analyze custom declaration document with comprehensive invoice comparison
  analyze: async function (req, res) {
    try {
      const { projectId } = req.params;
      const project = await Project.findOne({ where: { guid: projectId } });
      if (!project) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Project not found",
          null
        );
      }

      const customDeclaration = await CustomDeclaration.findOne({
        where: { projectId: project.id },
        order: [['createdAt', 'DESC']]
      });

      if (!customDeclaration) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Custom declaration not found for this project",
          null
        );
      }

      // Get all invoices for this project to compare with custom declaration
      const invoices = await Invoice.findAll({
        where: {
          projectId: project.id,
          openAIFileId: { [Op.ne]: null } // Only invoices that have been uploaded to OpenAI
        },
        order: [['createdAt', 'DESC']]
      });

      // Use the reusable analysis function
      const result = await controller.analyzeCustomDeclaration(customDeclaration, project, invoices);

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Custom declaration analysis started successfully",
        result
      );

    } catch (err) {
      console.error("Custom declaration analysis failed:", err);
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to start custom declaration analysis",
        err.message
      );
    }
  },

  // Analyze custom declaration by ID
  analyzeById: async function (req, res) {
    try {
      const { id } = req.params;
      const loggedInUserGroupId = req.groupId; // From auth middleware

      // Find custom declaration by ID or GUID
      const customDeclaration = await CustomDeclaration.findOne({
        where: {
          [Op.or]: [{ id: id }, { guid: id }],
          groupId: loggedInUserGroupId // Ensure it belongs to user's group
        },
        include: [
          {
            model: Project,
            as: "project",
            attributes: ["id", "title", "guid", "aiConversation"]
          }
        ]
      });

      if (!customDeclaration) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Custom declaration not found or access denied",
          null
        );
      }

      const project = customDeclaration.project;
      if (!project) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Project not found for this custom declaration",
          null
        );
      }

      // Get all invoices for this project to compare with custom declaration
      const invoices = await Invoice.findAll({
        where: {
          projectId: project.id,
          openAIFileId: { [Op.ne]: null } // Only invoices that have been uploaded to OpenAI
        },
        order: [['createdAt', 'DESC']]
      });

      // Use the reusable analysis function
      const result = await controller.analyzeCustomDeclaration(customDeclaration, project, invoices);

      // Log activity
      await activityHelper.logActivity({
        userId: req.userId,
        groupId: loggedInUserGroupId,
        action: 'analyze_custom_declaration_by_id',
        description: `Started analysis for custom declaration "${customDeclaration.fileName}" (ID: ${customDeclaration.id})`,
        createdBy: req.userId,
        projectId: project.id,
        details: {
          customDeclarationId: customDeclaration.id,
          customDeclarationFileName: customDeclaration.fileName,
          projectTitle: project.title,
          invoicesCount: invoices.length
        }
      });

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Custom declaration analysis started successfully",
        {
          ...result,
          customDeclarationId: customDeclaration.id,
          customDeclarationFileName: customDeclaration.fileName,
          projectTitle: project.title
        }
      );

    } catch (err) {
      console.error("Custom declaration analysis by ID failed:", err);
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to start custom declaration analysis",
        err.message
      );
    }
  },

  // Get custom declaration analysis results
  getAnalyze: async function (req, res) {
    try {
      const { projectId } = req.params;
      const project = await Project.findOne({ where: { guid: projectId } });
      if (!project) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Project not found",
          null
        );
      }

      const customDeclaration = await CustomDeclaration.findOne({
        where: { projectId: project.id },
        order: [['createdAt', 'DESC']]
      });

      if (!customDeclaration) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Custom declaration not found for this project",
          null
        );
      }

      //code here

      let analysisData = null;
      if (customDeclaration.insights) {
        try {
          analysisData = JSON.parse(customDeclaration.insights);
        } catch (parseError) {
          console.error('Error parsing custom declaration insights:', parseError);
          analysisData = { error: 'Failed to parse analysis data' };
        }
      }

      // Get related invoices for context
      const invoices = await Invoice.findAll({
        where: { projectId: projectId },
        order: [['createdAt', 'DESC']],
        attributes: ['id', 'fileName', 'status', 'createdAt']
      });

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Custom declaration analysis retrieved successfully",
        {
          status: "success",
          data: {
            customDeclaration: {
              id: customDeclaration.id,
              fileName: customDeclaration.fileName,
              status: customDeclaration.status,
              createdAt: customDeclaration.createdAt,
              updatedAt: customDeclaration.updatedAt
            },
            analysis: analysisData,
            project: {
              id: project.id,
              title: project.title,
              aiConversation: project.aiConversation
            },
            relatedInvoices: invoices,
            analysisSummary: {
              totalInvoices: invoices.length,
              analysisStatus: customDeclaration.status,
              hasInsights: !!customDeclaration.insights
            }
          }
        }
      );

    } catch (err) {
      console.error("Error retrieving custom declaration analysis:", err);
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to retrieve custom declaration analysis",
        err
      );
    }
  },
};

module.exports = controller;

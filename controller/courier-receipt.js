const { CourierReceipt } = require("../models/courier-receipt-model");
const { Project } = require("../models/project-model");
const { Group } = require("../models/group-model");
const { sendResponseWithData } = require("../helper/commonResponseHandler");
const { SuccessCode, ErrorCode } = require("../helper/statusCode");
const { Op } = require("sequelize");
const activityHelper = require("../helper/activityHelper");
const _ = require("lodash");
const openAIHelper = require("../helper/openai-helper");
const controller = {
  // Create new courier receipt
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
      console.log("data", data.projectId);
      console.log("project", project);

      // Verify group exists
      console.log("data", data.groupId);
      const group = await Group.findOne({ where: { guid: data.groupId } });
      if (!group) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Group not found",
          null
        );
      }

      console.log("group", group);

      let originalFilePath = null;
      if (req?.files && req?.files["files[]"]) {
        originalFilePath = req?.files["files[]"][0]?.path;
      }
      let fileName = null;
      if (req?.files && req?.files["files[]"]) {
        fileName = req?.files["files[]"][0]?.filename;
      }

      data.filePath = originalFilePath;
      data.fileName = fileName;
      data.projectId = project.id; // Use the actual project ID, not GUID
      data.groupId = group.id; // Use the actual group ID, not GUID
      const courierReceipt = await CourierReceipt.create(data);

      // Log activity
      try {
        await activityHelper.logCourierReceiptCreation(
          courierReceipt,
          req.userId || data.createdBy || 1
        );
      } catch (activityError) {
        console.error("Activity logging failed:", activityError);
        // Don't fail the main operation if activity logging fails
      }

      let responseData = {
        status: "success",
        data: courierReceipt,
        otherData: {
          project,
          group
        }
      };

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Courier receipt created successfully",
        responseData
      );
    } catch (err) {
      console.error("Error creating courier receipt:", err);
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to create courier receipt",
        err
      );
    }
  },

  // Get all courier receipts
  getAll: async function (req, res) {
    try {
      const { page = 1, limit = 10, projectId } = req.query;
      const offset = (page - 1) * limit;
      const groupId = req.groupId;
      const isSuperAdmin = req.isSuperAdmin;
      const project = await Project.findOne({ where: { guid: projectId } });
      if (!project) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Project not found",
          null
        );
      }

      let whereClause = {};
      if (projectId) whereClause.projectId = project.id;
      whereClause.groupId = groupId;
      if (isSuperAdmin) {
        _.omit(whereClause, "groupId");
      }
      const courierReceipts = await CourierReceipt.findAndCountAll({
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
        data: courierReceipts.rows,
        count: courierReceipts.count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(courierReceipts.count / limit),
      };

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Courier receipts loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load courier receipts",
        err
      );
    }
  },

  // Get courier receipt by ID or GUID
  getById: async function (req, res) {
    try {
      const { id } = req.params;

      const courierReceipt = await CourierReceipt.findOne({
        where: {
          [Op.or]: [{ guid: id }],
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

      if (!courierReceipt) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Courier receipt not found",
          null
        );
      }

      let responseData = {
        status: "success",
        data: courierReceipt,
      };

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Courier receipt loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load courier receipt",
        err
      );
    }
  },

  // Update courier receipt
  update: async function (req, res) {
    try {
      const { id } = req.params;
      const data = req.body;

      const courierReceipt = await CourierReceipt.findOne({
        where: {
          [Op.or]: [{ id: id }, { guid: id }],
        },
      });

      if (!courierReceipt) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Courier receipt not found",
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

      await courierReceipt.update(data);
      const updatedCourierReceipt = await courierReceipt.save();

      // Log update activity
      try {
        await activityHelper.logActivity({
          projectId: courierReceipt.projectId,
          groupId: courierReceipt.groupId,
          action: "COURIER_RECEIPT_UPDATED",
          description: `Courier receipt updated for project ID: ${courierReceipt.projectId}`,
          createdBy: req.userId || data.createdBy || 1
        });
      } catch (activityError) {
        console.error("Activity logging failed:", activityError);
        // Don't fail the main operation if activity logging fails
      }

      let responseData = {
        status: "success",
        data: updatedCourierReceipt,
      };

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Courier receipt updated successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to update courier receipt",
        err
      );
    }
  },

  // Delete courier receipt
  delete: async function (req, res) {
    try {
      const { id } = req.params;

      const courierReceipt = await CourierReceipt.findOne({
        where: {
          [Op.or]: [{ guid: id }],
        },
      });

      if (!courierReceipt) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Courier receipt not found",
          null
        );
      }

      // Log deletion activity before destroying
      try {
        await activityHelper.logActivity({
          projectId: courierReceipt.projectId,
          groupId: courierReceipt.groupId,
          action: "COURIER_RECEIPT_DELETED",
          description: `Courier receipt deleted for project ID: ${courierReceipt.projectId}`,
          createdBy: req.userId || 1
        });
      } catch (activityError) {
        console.error("Activity logging failed:", activityError);
        // Don't fail the main operation if activity logging fails
      }

      // Delete OpenAI files before destroying the courier receipt
      try {
        const openAIDeleted = await openAIHelper.deleteCourierReceiptOpenAIFiles(courierReceipt);
        if (openAIDeleted) {
          console.log(`✅ OpenAI files deleted for courier receipt ${courierReceipt.id}`);
        } else {
          console.log(`⚠️ Some OpenAI files could not be deleted for courier receipt ${courierReceipt.id}`);
        }
      } catch (openAIError) {
        console.error("OpenAI file deletion failed:", openAIError);
        // Don't fail the main operation if OpenAI file deletion fails
      }

      await courierReceipt.destroy();

      let responseData = {
        status: "success",
        message: "Courier receipt deleted successfully",
      };

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Courier receipt deleted successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to delete courier receipt",
        err
      );
    }
  },

  // Get courier receipts by project
  getByProject: async function (req, res) {
    try {
      const { projectId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const courierReceipts = await CourierReceipt.findAndCountAll({
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
        data: courierReceipts.rows,
        count: courierReceipts.count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(courierReceipts.count / limit),
      };

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Courier receipts loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load courier receipts",
        err
      );
    }
  },

  // Get courier receipts by group
  getByGroup: async function (req, res) {
    try {
      const { groupId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const courierReceipts = await CourierReceipt.findAndCountAll({
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
        data: courierReceipts.rows,
        count: courierReceipts.count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(courierReceipts.count / limit),
      };

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Courier receipts loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load courier receipts",
        err
      );
    }
  },

  // Analyze courier receipt document
  analyze: async function (req, res) {
    console.log("analyze courier receipt", req.params.projectId);
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

      console.log("project", project);

      const courierReceipt = await CourierReceipt.findOne({
        where: { projectId: project.id },
        order: [['createdAt', 'DESC']]
      });

      if (!courierReceipt) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Courier receipt not found for this project",
          null
        );
      }

      // Check if courier receipt has required file
      if (!courierReceipt.filePath || !courierReceipt.fileName) {
        return sendResponseWithData(
          res,
          ErrorCode.BAD_REQUEST,
          "Courier receipt file is missing",
          null
        );
      }

      // Get or create AI conversation thread
      let threadId = project.aiConversation;
      if (!threadId) {
        threadId = await openAIHelper.createConversationId();
        // Update project with new thread ID
        await project.update({ aiConversation: threadId });
      }

      // Update courier receipt status to processing
      await courierReceipt.update({ status: "processing" });

      // Log analysis activity
      try {
        await activityHelper.logActivity({
          projectId: project.id,
          groupId: project.groupId,
          action: "COURIER_RECEIPT_ANALYSIS_STARTED",
          description: `Courier receipt analysis started for project "${project.title}"`,
          createdBy: req.userId || 1
        });
      } catch (activityError) {
        console.error("Activity logging failed:", activityError);
        // Don't fail the main operation if activity logging fails
      }

      // Start analysis in background
      const analysisPromise = openAIHelper.analyzeCourierReceiptDocument(project, courierReceipt);

      // Handle the promise to avoid unhandled promise rejection
      analysisPromise
        .then((result) => {
          console.log(`Courier receipt analysis completed for project ${projectId}:`, result);

          // Update courier receipt with analysis results
          if (result.success) {
            courierReceipt.update({
              status: "completed",
              analysisData: result.analysisData,
              analyzedAt: result.analyzedAt,
              filesAnalyzed: result.filesAnalyzed
            }).catch(updateError => {
              console.error(`Failed to update courier receipt with analysis results:`, updateError);
            });
          }
        })
        .catch((error) => {
          console.error(`Courier receipt analysis failed for project ${projectId}:`, error);

          // Update courier receipt status to failed
          courierReceipt.update({
            status: "failed",
            errorMessage: error.message
          }).catch(updateError => {
            console.error(`Failed to update courier receipt status to failed:`, updateError);
          });
        });

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Courier receipt analysis started successfully",
        {
          status: "processing",
          projectId: projectId,
          courierReceiptId: courierReceipt.id,
          threadId: threadId,
          message: "Analysis is running in the background. Check the courier receipt status for updates."
        }
      );

    } catch (err) {
      console.error("Courier receipt analysis failed:", err);
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to start courier receipt analysis",
        err
      );
    }
  },

  // Get courier receipt analysis results
  getAnalysis: async function (req, res) {
    try {
      const { projectId } = req.params;
      const project = await Project.findOne({ where: { id: projectId } });
      if (!project) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Project not found",
          null
        );
      }

      const courierReceipt = await CourierReceipt.findOne({
        where: { projectId: projectId },
        order: [['createdAt', 'DESC']]
      });

      if (!courierReceipt) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Courier receipt not found for this project",
          null
        );
      }

      let analysisData = null;
      if (courierReceipt.insights) {
        try {
          analysisData = JSON.parse(courierReceipt.insights);
        } catch (parseError) {
          console.error('Error parsing courier receipt insights:', parseError);
          analysisData = { error: 'Failed to parse analysis data' };
        }
      }

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Courier receipt analysis retrieved successfully",
        {
          status: "success",
          data: {
            courierReceipt: {
              id: courierReceipt.id,
              fileName: courierReceipt.fileName,
              status: courierReceipt.status,
              createdAt: courierReceipt.createdAt,
              updatedAt: courierReceipt.updatedAt
            },
            analysis: analysisData,
            project: {
              id: project.id,
              title: project.title,
              aiConversation: project.aiConversation
            }
          }
        }
      );

    } catch (err) {
      console.error("Get courier receipt analysis failed:", err);
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to get courier receipt analysis",
        err
      );
    }
  }
};

module.exports = controller;

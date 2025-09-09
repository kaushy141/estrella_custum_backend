const { CourierReceipt } = require("../models/courier-receipt-model");
const { Project } = require("../models/project-model");
const { Group } = require("../models/group-model");
const { sendResponseWithData } = require("../helper/commonResponseHandler");
const { SuccessCode, ErrorCode } = require("../helper/statusCode");

const controller = {
  // Create new courier receipt
  create: async function (req, res) {
    try {
      const data = req.body;

      // Verify project exists
      const project = await Project.findByPk({ guid: data.projectId });
      if (!project) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Project not found",
          null
        );
      }

      // Verify group exists
      const group = await Group.findByPk(data.groupId);
      if (!group) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Group not found",
          null
        );
      }
      let originalFilePath = null;
      if (req?.files && req?.files["files[]"]) {
        originalFilePath = req?.files["files[]"][0]?.path;
      }

      data.originalFilePath = originalFilePath;
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
      };

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Courier receipt created successfully",
        responseData
      );
    } catch (err) {
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
      const { page = 1, limit = 10, projectId, groupId } = req.query;
      const offset = (page - 1) * limit;

      let whereClause = {};
      if (projectId) whereClause.projectId = projectId;
      if (groupId) whereClause.groupId = groupId;

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
          $or: [{ id: id }, { guid: id }],
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
          $or: [{ id: id }, { guid: id }],
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
};

module.exports = controller;

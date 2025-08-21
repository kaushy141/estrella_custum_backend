const { ActivityLog } = require("../models/activity-log-model");
const { Project } = require("../models/project-model");
const { Group } = require("../models/group-model");
const { sendResponseWithData } = require("../helper/commonResponseHandler");
const { SuccessCode, ErrorCode } = require("../helper/statusCode");
const { Op } = require("sequelize");

const controller = {
  // Create new activity log
  create: async function (req, res) {
    try {
      const data = req.body;
      
      // Verify project exists
      const project = await Project.findByPk(data.projectId);
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
      
      const activityLog = await ActivityLog.create(data);
      
      let responseData = {
        status: "success",
        data: activityLog,
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Activity log created successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to create activity log",
        err
      );
    }
  },

  // Get all activity logs
  getAll: async function (req, res) {
    try {
      const { page = 1, limit = 10, projectId, groupId, action, createdBy } = req.query;
      const offset = (page - 1) * limit;
      
      let whereClause = {};
      if (projectId) whereClause.projectId = projectId;
      if (groupId) whereClause.groupId = groupId;
      if (action) whereClause.action = { [Op.iLike]: `%${action}%` };
      if (createdBy) whereClause.createdBy = { [Op.iLike]: `%${createdBy}%` };
      
      const activityLogs = await ActivityLog.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Project,
            as: 'project',
            attributes: ['id', 'title', 'status']
          },
          {
            model: Group,
            as: 'group',
            attributes: ['id', 'name', 'logo']
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']]
      });
      
      let responseData = {
        status: "success",
        data: activityLogs.rows,
        count: activityLogs.count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(activityLogs.count / limit)
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Activity logs loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load activity logs",
        err
      );
    }
  },

  // Get activity log by ID or GUID
  getById: async function (req, res) {
    try {
      const { id } = req.params;
      
      const activityLog = await ActivityLog.findOne({
        where: {
          $or: [
            { id: id },
            { guid: id }
          ]
        },
        include: [
          {
            model: Project,
            as: 'project',
            attributes: ['id', 'title', 'status', 'description']
          },
          {
            model: Group,
            as: 'group',
            attributes: ['id', 'name', 'logo', 'description']
          }
        ]
      });
      
      if (!activityLog) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Activity log not found",
          null
        );
      }
      
      let responseData = {
        status: "success",
        data: activityLog,
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Activity log loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load activity log",
        err
      );
    }
  },

  // Update activity log
  update: async function (req, res) {
    try {
      const { id } = req.params;
      const data = req.body;
      
      const activityLog = await ActivityLog.findOne({
        where: {
          $or: [
            { id: id },
            { guid: id }
          ]
        }
      });
      
      if (!activityLog) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Activity log not found",
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
      
      await activityLog.update(data);
      const updatedActivityLog = await activityLog.save();
      
      let responseData = {
        status: "success",
        data: updatedActivityLog,
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Activity log updated successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to update activity log",
        err
      );
    }
  },

  // Delete activity log
  delete: async function (req, res) {
    try {
      const { id } = req.params;
      
      const activityLog = await ActivityLog.findOne({
        where: {
          $or: [
            { id: id },
            { guid: id }
          ]
        }
      });
      
      if (!activityLog) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Activity log not found",
          null
        );
      }
      
      await activityLog.destroy();
      
      let responseData = {
        status: "success",
        message: "Activity log deleted successfully"
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Activity log deleted successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to delete activity log",
        err
      );
    }
  },

  // Get activity logs by project
  getByProject: async function (req, res) {
    try {
      const { projectId } = req.params;
      const { page = 1, limit = 10, action, createdBy } = req.query;
      const offset = (page - 1) * limit;
      
      let whereClause = { projectId };
      if (action) whereClause.action = { [Op.iLike]: `%${action}%` };
      if (createdBy) whereClause.createdBy = { [Op.iLike]: `%${createdBy}%` };
      
      const activityLogs = await ActivityLog.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Group,
            as: 'group',
            attributes: ['id', 'name', 'logo']
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']]
      });
      
      let responseData = {
        status: "success",
        data: activityLogs.rows,
        count: activityLogs.count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(activityLogs.count / limit)
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Activity logs loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load activity logs",
        err
      );
    }
  },

  // Get activity logs by group
  getByGroup: async function (req, res) {
    try {
      const { groupId } = req.params;
      const { page = 1, limit = 10, action, createdBy } = req.query;
      const offset = (page - 1) * limit;
      
      let whereClause = { groupId };
      if (action) whereClause.action = { [Op.iLike]: `%${action}%` };
      if (createdBy) whereClause.createdBy = { [Op.iLike]: `%${createdBy}%` };
      
      const activityLogs = await ActivityLog.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Project,
            as: 'project',
            attributes: ['id', 'title', 'status']
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']]
      });
      
      let responseData = {
        status: "success",
        data: activityLogs.rows,
        count: activityLogs.count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(activityLogs.count / limit)
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Activity logs loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load activity logs",
        err
      );
    }
  },

  // Search activity logs by action or description
  search: async function (req, res) {
    try {
      const { search, page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;
      
      if (!search) {
        return sendResponseWithData(
          res,
          ErrorCode.BAD_REQUEST,
          "Search term is required",
          null
        );
      }
      
      const activityLogs = await ActivityLog.findAndCountAll({
        where: {
          $or: [
            { action: { [Op.iLike]: `%${search}%` } },
            { description: { [Op.iLike]: `%${search}%` } },
            { createdBy: { [Op.iLike]: `%${search}%` } }
          ]
        },
        include: [
          {
            model: Project,
            as: 'project',
            attributes: ['id', 'title', 'status']
          },
          {
            model: Group,
            as: 'group',
            attributes: ['id', 'name', 'logo']
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']]
      });
      
      let responseData = {
        status: "success",
        data: activityLogs.rows,
        count: activityLogs.count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(activityLogs.count / limit)
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Activity logs loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load activity logs",
        err
      );
    }
  }
};

module.exports = controller;

const { Project } = require("../models/project-model");
const { Group } = require("../models/group-model");
const { sendResponseWithData } = require("../helper/commonResponseHandler");
const { SuccessCode, ErrorCode } = require("../helper/statusCode");
const activityHelper = require("../helper/activityHelper");

const controller = {
  // Create new project
  create: async function (req, res) {
    try {
      const data = req.body;
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
      data.groupId = group.id;
      const project = await Project.create(data);
      // Log activity
      try {
        await activityHelper.logProjectCreation(project, req.userId || data.createdBy || 1);
      } catch (activityError) {
        console.error("Activity logging failed:", activityError);
        // Don't fail the main operation if activity logging fails
      }

      let responseData = {
        status: "success",
        data: project,
      };

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Project created successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to create project",
        err
      );
    }
  },

  // Get all projects
  getAll: async function (req, res) {
    try {
      const { page = 1, limit = 10, status, isActive } = req.query;
      const offset = (page - 1) * limit;

      
      let whereClause = {};
      const groupId = req.groupId;
      const isSuperAdmin = req.isSuperAdmin;
      whereClause.groupId = groupId;
      if (isSuperAdmin) {
        _.omit(whereClause, "groupId");
      }
      if (status) whereClause.status = status;
      if (isActive !== undefined) {
        whereClause.isActive = isActive === 'true';
      }

      const projects = await Project.findAndCountAll({
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
        data: projects.rows,
        count: projects.count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(projects.count / limit)
      };

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Projects loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load projects",
        err
      );
    }
  },

  // Get project by ID or GUID
  getById: async function (req, res) {
    try {
      const { id } = req.params;

      const project = await Project.findOne({
        where: {
          $or: [
            { id: id },
            { guid: id }
          ]
        },
        include: [
          {
            model: Group,
            as: 'group',
            attributes: ['id', 'name', 'logo', 'description']
          }
        ]
      });

      if (!project) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Project not found",
          null
        );
      }

      let responseData = {
        status: "success",
        data: project,
      };

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Project loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load project",
        err
      );
    }
  },

  // Update project
  update: async function (req, res) {
    try {
      const { id } = req.params;
      const data = req.body;

      const project = await Project.findOne({
        where: {
          $or: [
            { id: id },
            { guid: id }
          ]
        }
      });

      if (!project) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Project not found",
          null
        );
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

      await project.update(data);
      const updatedProject = await project.save();

      let responseData = {
        status: "success",
        data: updatedProject,
      };

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Project updated successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to update project",
        err
      );
    }
  },

  // Delete project
  delete: async function (req, res) {
    try {
      const { id } = req.params;

      const project = await Project.findOne({
        where: {
          $or: [
            { id: id },
            { guid: id }
          ]
        }
      });

      if (!project) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Project not found",
          null
        );
      }

      await project.destroy();

      let responseData = {
        status: "success",
        message: "Project deleted successfully"
      };

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Project deleted successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to delete project",
        err
      );
    }
  },

  // Get projects by group
  getByGroup: async function (req, res) {
    try {
      const { groupId } = req.params;
      const { page = 1, limit = 10, status, isActive } = req.query;
      const offset = (page - 1) * limit;
      const group = await Group.findOne({ where: { guid: groupId } });
      if (!group) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Group not found",
          null
        );
      }

      let whereClause = { groupId: group.id };
      if (status) whereClause.status = status;
      if (isActive !== undefined) {
        whereClause.isActive = isActive === 'true';
      }
      const projects = await Project.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']]
      });

      let responseData = {
        status: "success",
        data: projects.rows,
        count: projects.count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(projects.count / limit)
      };

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Projects loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load projects",
        err
      );
    }
  }
};

module.exports = controller;

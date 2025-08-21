const { Project } = require("../models/project-model");
const { Group } = require("../models/group-model");
const { sendResponseWithData } = require("../helper/commonResponseHandler");
const { SuccessCode, ErrorCode } = require("../helper/statusCode");

const controller = {
  // Create new project
  create: async function (req, res) {
    try {
      const data = req.body;
      
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
      
      const project = await Project.create(data);
      
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
      const { page = 1, limit = 10, groupId, status, isActive } = req.query;
      const offset = (page - 1) * limit;
      
      let whereClause = {};
      if (groupId) whereClause.groupId = groupId;
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
      
      let whereClause = { groupId };
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

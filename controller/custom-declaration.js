const { CustomDeclaration } = require("../models/custom-declaration-model");
const { Project } = require("../models/project-model");
const { Group } = require("../models/group-model");
const { sendResponseWithData } = require("../helper/commonResponseHandler");
const { SuccessCode, ErrorCode } = require("../helper/statusCode");

const controller = {
  // Create new custom declaration
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
      let originalFilePath = null
      if (req?.files && req?.files["files[]"]) {
        originalFilePath = req?.files["files[]"][0]?.path
      }
      
      data.originalFilePath = originalFilePath
      
             const customDeclaration = await CustomDeclaration.create(data);
       
       // Log activity
       try {
         await activityHelper.logCustomDeclarationCreation(customDeclaration, req.userId || data.createdBy || 1);
       } catch (activityError) {
         console.error("Activity logging failed:", activityError);
         // Don't fail the main operation if activity logging fails
       }
       
       let responseData = {
         status: "success",
         data: customDeclaration,
       };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Custom declaration created successfully",
        responseData
      );
    } catch (err) {
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
      const { page = 1, limit = 10, projectId, groupId } = req.query;
      const offset = (page - 1) * limit;
      
      let whereClause = {};
      if (projectId) whereClause.projectId = projectId;
      if (groupId) whereClause.groupId = groupId;
      
      const customDeclarations = await CustomDeclaration.findAndCountAll({
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
        data: customDeclarations.rows,
        count: customDeclarations.count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(customDeclarations.count / limit)
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
          $or: [
            { id: id },
            { guid: id }
          ]
        }
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
          $or: [
            { id: id },
            { guid: id }
          ]
        }
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
        message: "Custom declaration deleted successfully"
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
        data: customDeclarations.rows,
        count: customDeclarations.count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(customDeclarations.count / limit)
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
        data: customDeclarations.rows,
        count: customDeclarations.count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(customDeclarations.count / limit)
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
  }
};

module.exports = controller;

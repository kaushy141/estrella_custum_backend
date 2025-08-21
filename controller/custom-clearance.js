const { CustomClearance } = require("../models/custom-clearance-model");
const { Project } = require("../models/project-model");
const { Group } = require("../models/group-model");
const { sendResponseWithData } = require("../helper/commonResponseHandler");
const { SuccessCode, ErrorCode } = require("../helper/statusCode");

const controller = {
  // Create new custom clearance
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
      
             const customClearance = await CustomClearance.create(data);
       
       // Log activity
       try {
         await activityHelper.logCustomClearanceCreation(customClearance, req.userId || data.createdBy || 1);
       } catch (activityError) {
         console.error("Activity logging failed:", activityError);
         // Don't fail the main operation if activity logging fails
       }
       
       let responseData = {
         status: "success",
         data: customClearance,
       };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Custom clearance created successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to create custom clearance",
        err
      );
    }
  },

  // Get all custom clearances
  getAll: async function (req, res) {
    try {
      const { page = 1, limit = 10, projectId, groupId } = req.query;
      const offset = (page - 1) * limit;
      
      let whereClause = {};
      if (projectId) whereClause.projectId = projectId;
      if (groupId) whereClause.groupId = groupId;
      
      const customClearances = await CustomClearance.findAndCountAll({
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
        data: customClearances.rows,
        count: customClearances.count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(customClearances.count / limit)
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Custom clearances loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load custom clearances",
        err
      );
    }
  },

  // Get custom clearance by ID or GUID
  getById: async function (req, res) {
    try {
      const { id } = req.params;
      
      const customClearance = await CustomClearance.findOne({
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
      
      if (!customClearance) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Custom clearance not found",
          null
        );
      }
      
      let responseData = {
        status: "success",
        data: customClearance,
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Custom clearance loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load custom clearance",
        err
      );
    }
  },

  // Update custom clearance
  update: async function (req, res) {
    try {
      const { id } = req.params;
      const data = req.body;
      
      const customClearance = await CustomClearance.findOne({
        where: {
          $or: [
            { id: id },
            { guid: id }
          ]
        }
      });
      
      if (!customClearance) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Custom clearance not found",
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
      
      await customClearance.update(data);
      const updatedCustomClearance = await customClearance.save();
      
      let responseData = {
        status: "success",
        data: updatedCustomClearance,
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Custom clearance updated successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to update custom clearance",
        err
      );
    }
  },

  // Delete custom clearance
  delete: async function (req, res) {
    try {
      const { id } = req.params;
      
      const customClearance = await CustomClearance.findOne({
        where: {
          $or: [
            { id: id },
            { guid: id }
          ]
        }
      });
      
      if (!customClearance) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Custom clearance not found",
          null
        );
      }
      
      await customClearance.destroy();
      
      let responseData = {
        status: "success",
        message: "Custom clearance deleted successfully"
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Custom clearance deleted successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to delete custom clearance",
        err
      );
    }
  },

  // Get custom clearances by project
  getByProject: async function (req, res) {
    try {
      const { projectId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;
      
      const customClearances = await CustomClearance.findAndCountAll({
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
        data: customClearances.rows,
        count: customClearances.count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(customClearances.count / limit)
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Custom clearances loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load custom clearances",
        err
      );
    }
  },

  // Get custom clearances by group
  getByGroup: async function (req, res) {
    try {
      const { groupId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;
      
      const customClearances = await CustomClearance.findAndCountAll({
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
        data: customClearances.rows,
        count: customClearances.count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(customClearances.count / limit)
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Custom clearances loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load custom clearances",
        err
      );
    }
  }
};

module.exports = controller;

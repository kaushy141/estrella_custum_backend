const { CustomAgent } = require("../models/custom-agent-model");
const { Group } = require("../models/group-model");
const { sendResponseWithData } = require("../helper/commonResponseHandler");
const { SuccessCode, ErrorCode } = require("../helper/statusCode");

const controller = {
  // Create new custom agent
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
      
             const customAgent = await CustomAgent.create(data);
       
       // Log activity
       try {
         await activityHelper.logCustomAgentCreation(customAgent, req.userId || data.createdBy || 1);
       } catch (activityError) {
         console.error("Activity logging failed:", activityError);
         // Don't fail the main operation if activity logging fails
       }
       
       let responseData = {
         status: "success",
         data: customAgent,
       };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Custom agent created successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to create custom agent",
        err
      );
    }
  },

  // Get all custom agents
  getAll: async function (req, res) {
    try {
      const { page = 1, limit = 10, groupId, isActive } = req.query;
      const offset = (page - 1) * limit;
      
      let whereClause = {};
      if (groupId) whereClause.groupId = groupId;
      if (isActive !== undefined) {
        whereClause.isActive = isActive === 'true';
      }
      
      const customAgents = await CustomAgent.findAndCountAll({
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
        data: customAgents.rows,
        count: customAgents.count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(customAgents.count / limit)
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Custom agents loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load custom agents",
        err
      );
    }
  },

  // Get custom agent by ID or GUID
  getById: async function (req, res) {
    try {
      const { id } = req.params;
      
      const customAgent = await CustomAgent.findOne({
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
      
      if (!customAgent) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Custom agent not found",
          null
        );
      }
      
      let responseData = {
        status: "success",
        data: customAgent,
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Custom agent loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load custom agent",
        err
      );
    }
  },

  // Update custom agent
  update: async function (req, res) {
    try {
      const { id } = req.params;
      const data = req.body;
      
      const customAgent = await CustomAgent.findOne({
        where: {
          $or: [
            { id: id },
            { guid: id }
          ]
        }
      });
      
      if (!customAgent) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Custom agent not found",
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
      
      await customAgent.update(data);
      const updatedCustomAgent = await customAgent.save();
      
      let responseData = {
        status: "success",
        data: updatedCustomAgent,
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Custom agent updated successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to update custom agent",
        err
      );
    }
  },

  // Delete custom agent
  delete: async function (req, res) {
    try {
      const { id } = req.params;
      
      const customAgent = await CustomAgent.findOne({
        where: {
          $or: [
            { id: id },
            { guid: id }
          ]
        }
      });
      
      if (!customAgent) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Custom agent not found",
          null
        );
      }
      
      await customAgent.destroy();
      
      let responseData = {
        status: "success",
        message: "Custom agent deleted successfully"
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Custom agent deleted successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to delete custom agent",
        err
      );
    }
  },

  // Get custom agents by group
  getByGroup: async function (req, res) {
    try {
      const { groupId } = req.params;
      const { page = 1, limit = 10, isActive } = req.query;
      const offset = (page - 1) * limit;
      
      let whereClause = { groupId };
      if (isActive !== undefined) {
        whereClause.isActive = isActive === 'true';
      }
      
      const customAgents = await CustomAgent.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']]
      });
      
      let responseData = {
        status: "success",
        data: customAgents.rows,
        count: customAgents.count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(customAgents.count / limit)
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Custom agents loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load custom agents",
        err
      );
    }
  }
};

module.exports = controller;

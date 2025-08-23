const { Group } = require("../models/group-model");
const { sendResponseWithData } = require("../helper/commonResponseHandler");
const { SuccessCode, ErrorCode } = require("../helper/statusCode");
const activityHelper = require("../helper/activityHelper");

const controller = {
  // Create new group
  create: async function (req, res) {
    try {
      const data = req.body;
             const group = await Group.create(data);
       
               // Log activity
        try {
          await activityHelper.logGroupCreation(group, req.userId || data.createdBy || 1);
        } catch (activityError) {
          console.error("Activity logging failed:", activityError);
          // Don't fail the main operation if activity logging fails
        }
       
       let responseData = {
         status: "success",
         data: group,
       };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Group created successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to create group",
        err
      );
    }
  },

  // Get all groups
  getAll: async function (req, res) {
    try {
      const { page = 1, limit = 10, isActive } = req.query;
      const offset = (page - 1) * limit;
      
      let whereClause = {};
      if (isActive !== undefined) {
        whereClause.isActive = isActive === 'true';
      }
      
      const groups = await Group.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']]
      });
      
      let responseData = {
        status: "success",
        data: groups.rows,
        count: groups.count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(groups.count / limit)
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Groups loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load groups",
        err
      );
    }
  },

  // Get group by ID or GUID
  getById: async function (req, res) {
    try {
      const { id } = req.params;
      
      const group = await Group.findOne({
        where: {
          $or: [
            { id: id },
            { guid: id }
          ]
        }
      });
      
      if (!group) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Group not found",
          null
        );
      }
      
      let responseData = {
        status: "success",
        data: group,
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Group loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load group",
        err
      );
    }
  },

  // Update group
  update: async function (req, res) {
    try {
      const { id } = req.params;
      const data = req.body;
      
      const group = await Group.findOne({
        where: {
          $or: [
            { id: id },
            { guid: id }
          ]
        }
      });
      
      if (!group) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Group not found",
          null
        );
      }
      
      await group.update(data);
      const updatedGroup = await group.save();
      
      let responseData = {
        status: "success",
        data: updatedGroup,
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Group updated successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to update group",
        err
      );
    }
  },

  // Delete group
  delete: async function (req, res) {
    try {
      const { id } = req.params;
      
      const group = await Group.findOne({
        where: {
          $or: [
            { id: id },
            { guid: id }
          ]
        }
      });
      
      if (!group) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Group not found",
          null
        );
      }
      
      await group.destroy();
      
      let responseData = {
        status: "success",
        message: "Group deleted successfully"
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Group deleted successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to delete group",
        err
      );
    }
  },

  // Soft delete (deactivate) group
  deactivate: async function (req, res) {
    try {
      const { id } = req.params;
      
      const group = await Group.findOne({
        where: {
          $or: [
            { id: id },
            { guid: id }
          ]
        }
      });
      
      if (!group) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Group not found",
          null
        );
      }
      
      await group.update({ isActive: false });
      const updatedGroup = await group.save();
      
      let responseData = {
        status: "success",
        data: updatedGroup,
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Group deactivated successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to deactivate group",
        err
      );
    }
  },
  activate: async function (req, res) {
    try {
      const { id } = req.params;
      
      const group = await Group.findOne({
        where: {
          $or: [
            { id: id },
            { guid: id }
          ]
        }
      });
      
      if (!group) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Group not found",
          null
        );
      }
      
      await group.update({ isActive: true });
      const updatedGroup = await group.save();
      
      let responseData = {
        status: "success",
        data: updatedGroup,
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Group activated successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to activate group",
        err
      );
    }
  }
};

module.exports = controller;

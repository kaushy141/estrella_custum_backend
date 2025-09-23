const { GroupAddress } = require("../models/group-address-model");
const { Group } = require("../models/group-model");
const { sendResponseWithData } = require("../helper/commonResponseHandler");
const { SuccessCode, ErrorCode } = require("../helper/statusCode");
const { Op } = require("sequelize");
const _ = require("lodash");
const controller = {
  // Create new group address
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
      
             const groupAddress = await GroupAddress.create(data);
       
       // Log activity
       try {
         await activityHelper.logGroupAddressCreation(groupAddress, req.userId || data.createdBy || 1);
       } catch (activityError) {
         console.error("Activity logging failed:", activityError);
         // Don't fail the main operation if activity logging fails
       }
       
       let responseData = {
         status: "success",
         data: groupAddress,
       };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Group address created successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to create group address",
        err
      );
    }
  },

  // Get all group addresses
  getAll: async function (req, res) {
    try {
      const { page = 1, limit = 10, isActive } = req.query;
      const offset = (page - 1) * limit;
      
      let whereClause = {};
      const groupId = req.groupId;
      const isSuperAdmin = req.isSuperAdmin;
      whereClause.groupId = groupId;
      if (isSuperAdmin) {
        _.omit(whereClause, "groupId");
      }
      if (isActive !== undefined) {
        whereClause.isActive = isActive === 'true';
      }
      
      const groupAddresses = await GroupAddress.findAndCountAll({
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
        data: groupAddresses.rows,
        count: groupAddresses.count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(groupAddresses.count / limit)
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Group addresses loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load group addresses",
        err
      );
    }
  },

  // Get group address by ID or GUID
  getById: async function (req, res) {
    try {
      const { id } = req.params;
      
      const groupAddress = await GroupAddress.findOne({
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
      
      if (!groupAddress) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Group address not found",
          null
        );
      }
      
      let responseData = {
        status: "success",
        data: groupAddress,
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Group address loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load group address",
        err
      );
    }
  },

  // Update group address
  update: async function (req, res) {
    try {
      const { id } = req.params;
      const data = req.body;
      
      const groupAddress = await GroupAddress.findOne({
        where: {
          $or: [
            { id: id },
            { guid: id }
          ]
        }
      });
      
      if (!groupAddress) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Group address not found",
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
      
      await groupAddress.update(data);
      const updatedGroupAddress = await groupAddress.save();
      
      let responseData = {
        status: "success",
        data: updatedGroupAddress,
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Group address updated successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to update group address",
        err
      );
    }
  },

  // Delete group address
  delete: async function (req, res) {
    try {
      const { id } = req.params;
      
      const groupAddress = await GroupAddress.findOne({
        where: {
          $or: [
            { id: id },
            { guid: id }
          ]
        }
      });
      
      if (!groupAddress) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Group address not found",
          null
        );
      }
      
      await groupAddress.destroy();
      
      let responseData = {
        status: "success",
        message: "Group address deleted successfully"
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Group address deleted successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to delete group address",
        err
      );
    }
  },

  // Get group addresses by group
  getByGroup: async function (req, res) {
    try {
      const { groupId } = req.params;
      const { page = 1, limit = 10, isActive } = req.query;
      const offset = (page - 1) * limit;
      
      let whereClause = { groupId };
      if (isActive !== undefined) {
        whereClause.isActive = isActive === 'true';
      }
      
      const groupAddresses = await GroupAddress.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']]
      });
      
      let responseData = {
        status: "success",
        data: groupAddresses.rows,
        count: groupAddresses.count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(groupAddresses.count / limit)
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Group addresses loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load group addresses",
        err
      );
    }
  },

  // Search group addresses by location
  searchByLocation: async function (req, res) {
    try {
      const { city, state, country, page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;
      
      let whereClause = {};
      if (city) whereClause.city = { [Op.iLike]: `%${city}%` };
      if (state) whereClause.state = { [Op.iLike]: `%${state}%` };
      if (country) whereClause.country = { [Op.iLike]: `%${country}%` };
      
      const groupAddresses = await GroupAddress.findAndCountAll({
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
        data: groupAddresses.rows,
        count: groupAddresses.count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(groupAddresses.count / limit)
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Group addresses loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load group addresses",
        err
      );
    }
  }
};

module.exports = controller;

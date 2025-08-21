const { ShippingService } = require("../models/shipping-service-model");
const { Group } = require("../models/group-model");
const { sendResponseWithData } = require("../helper/commonResponseHandler");
const { SuccessCode, ErrorCode } = require("../helper/statusCode");

const controller = {
  // Create new shipping service
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
      
             const shippingService = await ShippingService.create(data);
       
       // Log activity
       try {
         await activityHelper.logShippingServiceCreation(shippingService, req.userId || data.createdBy || 1);
       } catch (activityError) {
         console.error("Activity logging failed:", activityError);
         // Don't fail the main operation if activity logging fails
       }
       
       let responseData = {
         status: "success",
         data: shippingService,
       };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Shipping service created successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to create shipping service",
        err
      );
    }
  },

  // Get all shipping services
  getAll: async function (req, res) {
    try {
      const { page = 1, limit = 10, groupId, isActive } = req.query;
      const offset = (page - 1) * limit;
      
      let whereClause = {};
      if (groupId) whereClause.groupId = groupId;
      if (isActive !== undefined) {
        whereClause.isActive = isActive === 'true';
      }
      
      const shippingServices = await ShippingService.findAndCountAll({
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
        data: shippingServices.rows,
        count: shippingServices.count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(shippingServices.count / limit)
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Shipping services loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load shipping services",
        err
      );
    }
  },

  // Get shipping service by ID or GUID
  getById: async function (req, res) {
    try {
      const { id } = req.params;
      
      const shippingService = await ShippingService.findOne({
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
      
      if (!shippingService) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Shipping service not found",
          null
        );
      }
      
      let responseData = {
        status: "success",
        data: shippingService,
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Shipping service loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load shipping service",
        err
      );
    }
  },

  // Update shipping service
  update: async function (req, res) {
    try {
      const { id } = req.params;
      const data = req.body;
      
      const shippingService = await ShippingService.findOne({
        where: {
          $or: [
            { id: id },
            { guid: id }
          ]
        }
      });
      
      if (!shippingService) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Shipping service not found",
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
      
      await shippingService.update(data);
      const updatedShippingService = await shippingService.save();
      
      let responseData = {
        status: "success",
        data: updatedShippingService,
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Shipping service updated successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to update shipping service",
        err
      );
    }
  },

  // Delete shipping service
  delete: async function (req, res) {
    try {
      const { id } = req.params;
      
      const shippingService = await ShippingService.findOne({
        where: {
          $or: [
            { id: id },
            { guid: id }
          ]
        }
      });
      
      if (!shippingService) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Shipping service not found",
          null
        );
      }
      
      await shippingService.destroy();
      
      let responseData = {
        status: "success",
        message: "Shipping service deleted successfully"
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Shipping service deleted successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to delete shipping service",
        err
      );
    }
  },

  // Get shipping services by group
  getByGroup: async function (req, res) {
    try {
      const { groupId } = req.params;
      const { page = 1, limit = 10, isActive } = req.query;
      const offset = (page - 1) * limit;
      
      let whereClause = { groupId };
      if (isActive !== undefined) {
        whereClause.isActive = isActive === 'true';
      }
      
      const shippingServices = await ShippingService.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']]
      });
      
      let responseData = {
        status: "success",
        data: shippingServices.rows,
        count: shippingServices.count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(shippingServices.count / limit)
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Shipping services loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load shipping services",
        err
      );
    }
  }
};

module.exports = controller;

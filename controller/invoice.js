const { Invoice } = require("../models/invoice-model");
const { Project } = require("../models/project-model");
const { Group } = require("../models/group-model");
const { sendResponseWithData } = require("../helper/commonResponseHandler");
const { SuccessCode, ErrorCode } = require("../helper/statusCode");

const controller = {
  // Create new invoice
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
      
      const invoice = await Invoice.create(data);
      
      let responseData = {
        status: "success",
        data: invoice,
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Invoice created successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to create invoice",
        err
      );
    }
  },

  // Get all invoices
  getAll: async function (req, res) {
    try {
      const { page = 1, limit = 10, projectId, groupId } = req.query;
      const offset = (page - 1) * limit;
      
      let whereClause = {};
      if (projectId) whereClause.projectId = projectId;
      if (groupId) whereClause.groupId = groupId;
      
      const invoices = await Invoice.findAndCountAll({
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
        data: invoices.rows,
        count: invoices.count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(invoices.count / limit)
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Invoices loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load invoices",
        err
      );
    }
  },

  // Get invoice by ID or GUID
  getById: async function (req, res) {
    try {
      const { id } = req.params;
      
      const invoice = await Invoice.findOne({
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
      
      if (!invoice) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Invoice not found",
          null
        );
      }
      
      let responseData = {
        status: "success",
        data: invoice,
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Invoice loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load invoice",
        err
      );
    }
  },

  // Update invoice
  update: async function (req, res) {
    try {
      const { id } = req.params;
      const data = req.body;
      
      const invoice = await Invoice.findOne({
        where: {
          $or: [
            { id: id },
            { guid: id }
          ]
        }
      });
      
      if (!invoice) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Invoice not found",
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
      
      await invoice.update(data);
      const updatedInvoice = await invoice.save();
      
      let responseData = {
        status: "success",
        data: updatedInvoice,
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Invoice updated successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to update invoice",
        err
      );
    }
  },

  // Delete invoice
  delete: async function (req, res) {
    try {
      const { id } = req.params;
      
      const invoice = await Invoice.findOne({
        where: {
          $or: [
            { id: id },
            { guid: id }
          ]
        }
      });
      
      if (!invoice) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Invoice not found",
          null
        );
      }
      
      await invoice.destroy();
      
      let responseData = {
        status: "success",
        message: "Invoice deleted successfully"
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Invoice deleted successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to delete invoice",
        err
      );
    }
  },

  // Get invoices by project
  getByProject: async function (req, res) {
    try {
      const { projectId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;
      
      const invoices = await Invoice.findAndCountAll({
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
        data: invoices.rows,
        count: invoices.count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(invoices.count / limit)
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Invoices loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load invoices",
        err
      );
    }
  },

  // Get invoices by group
  getByGroup: async function (req, res) {
    try {
      const { groupId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;
      
      const invoices = await Invoice.findAndCountAll({
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
        data: invoices.rows,
        count: invoices.count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(invoices.count / limit)
      };
      
      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Invoices loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load invoices",
        err
      );
    }
  }
};

module.exports = controller;

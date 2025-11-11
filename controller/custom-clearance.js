const { CustomClearance } = require("../models/custom-clearance-model");
const { Project } = require("../models/project-model");
const { Group } = require("../models/group-model");
const { sendResponseWithData } = require("../helper/commonResponseHandler");
const { SuccessCode, ErrorCode } = require("../helper/statusCode");
const { Op } = require("sequelize");
const pzDocumentGenerator = require("../services/pz-document-generator.service");
const activityHelper = require("../helper/activityHelper");
const _ = require("lodash");
const path = require('path');
const { CustomDeclaration } = require("../models/custom-declaration-model");
const { CourierReceipt } = require("../models/courier-receipt-model");
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
      let originalFilePath = null
      if (req?.files && req?.files["files[]"]) {
        originalFilePath = req?.files["files[]"][0]?.path
      }

      //Generate AI PDF file for custom-clearance

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
      const { page = 1, limit = 10, projectId, } = req.query;
      const offset = (page - 1) * limit;
      const groupId = req.groupId;
      const isSuperAdmin = req.isSuperAdmin;
      let whereClause = {};
      if (projectId) whereClause.projectId = projectId;
      whereClause.groupId = groupId;
      if (isSuperAdmin) {
        _.omit(whereClause, "groupId");
      }
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

      // Log update activity
      try {
        await activityHelper.logActivity({
          projectId: customClearance.projectId,
          groupId: customClearance.groupId,
          action: "CUSTOM_CLEARANCE_UPDATED",
          description: `Custom clearance updated for project ID: ${customClearance.projectId}`,
          createdBy: req.userId || 1
        });
      } catch (activityError) {
        console.error("Activity logging failed:", activityError);
        // Don't fail the main operation if activity logging fails
      }

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

      // Log deletion activity before destroying
      try {
        await activityHelper.logActivity({
          projectId: customClearance.projectId,
          groupId: customClearance.groupId,
          action: "CUSTOM_CLEARANCE_DELETED",
          description: `Custom clearance deleted for project ID: ${customClearance.projectId}`,
          createdBy: req.userId || 1
        });
      } catch (activityError) {
        console.error("Activity logging failed:", activityError);
        // Don't fail the main operation if activity logging fails
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
  },

  // Download custom clearance document by projectId
  downloadByProject: async function (req, res) {
    try {
      const { projectId } = req.params;
      const { latest = 'false' } = req.query; // Get latest by default
      const groupId = req.groupId;
      const isSuperAdmin = req.isSuperAdmin;
      console.log("projectId in downloadByProject", projectId);

      if (!projectId) {
        return sendResponseWithData(
          res,
          ErrorCode.BAD_REQUEST,
          "Project ID is required",
          null
        );
      }

      // Verify project exists
      const project = await Project.findOne({ where: { guid: projectId } });
      if (!project) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Project not found",
          null
        );
      }

      // Build where clause
      let whereClause = { projectId: project.id };
      if (!isSuperAdmin) {
        whereClause.groupId = groupId;
      }

      // Fetch custom clearance documents
      const customClearances = await CustomClearance.findAll({
        where: whereClause,
        order: [['createdAt', 'DESC']],
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
        ]
      });

      if (!customClearances || customClearances.length === 0) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "No custom clearance documents found for this project",
          null
        );
      }

      // If latest=true, download only the latest document
      const documentToDownload = latest === 'true' ? customClearances[0] : customClearances;

      if (latest === 'true') {
        // Download single latest file
        const filePath = documentToDownload.filePath;
        const fs = require('fs');
        const resolvedPath = path.resolve(filePath);

        // Check if file exists
        if (!fs.existsSync(resolvedPath)) {
          return sendResponseWithData(
            res,
            ErrorCode.NOT_FOUND,
            "File not found on server",
            { filePath: filePath }
          );
        }

        // Set headers for file download
        const fileName = path.basename(filePath);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        // Stream the file
        const fileStream = fs.createReadStream(resolvedPath);
        fileStream.pipe(res);

        fileStream.on('error', (error) => {
          console.error('Error streaming file:', error);
          return sendResponseWithData(
            res,
            ErrorCode.REQUEST_FAILED,
            "Error downloading file",
            { error: error.message }
          );
        });

      } else {
        // Return list of all documents with download links
        const documentsInfo = customClearances.map(doc => {
          const fileName = path.basename(doc.filePath);
          return {
            id: doc.id,
            guid: doc.guid,
            filePath: doc.filePath,
            fileName: fileName,
            downloadUrl: `/api/custom-clearance/download/${doc.id}`,
            createdAt: doc.createdAt,
            project: doc.project,
            group: doc.group
          };
        });

        return sendResponseWithData(
          res,
          SuccessCode.SUCCESS,
          "Custom clearance documents retrieved successfully",
          {
            status: "success",
            count: documentsInfo.length,
            documents: documentsInfo
          }
        );
      }

    } catch (err) {
      console.error('Error downloading custom clearance:', err);
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to download custom clearance documents",
        { error: err.message }
      );
    }
  },

  // Download custom clearance document by ID
  downloadById: async function (req, res) {
    try {
      const { id } = req.params;
      const groupId = req.groupId;
      const isSuperAdmin = req.isSuperAdmin;

      // Build where clause
      let whereClause = {
        [Op.or]: [
          { guid: id }
        ]
      };

      if (!isSuperAdmin) {
        whereClause.groupId = groupId;
      }

      const customClearance = await CustomClearance.findOne({
        where: whereClause
      });

      if (!customClearance) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Custom clearance document not found",
          null
        );
      }

      const fs = require('fs');
      const filePath = customClearance.filePath;
      const resolvedPath = path.resolve(filePath);

      // Check if file exists
      if (!fs.existsSync(resolvedPath)) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "File not found on server",
          { filePath: filePath }
        );
      }

      // Set headers for file download
      const fileName = path.basename(filePath);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      // Stream the file
      const fileStream = fs.createReadStream(resolvedPath);
      fileStream.pipe(res);

      fileStream.on('error', (error) => {
        console.error('Error streaming file:', error);
        if (!res.headersSent) {
          return sendResponseWithData(
            res,
            ErrorCode.REQUEST_FAILED,
            "Error downloading file",
            { error: error.message }
          );
        }
      });

    } catch (err) {
      console.error('Error downloading custom clearance:', err);
      if (!res.headersSent) {
        return sendResponseWithData(
          res,
          ErrorCode.REQUEST_FAILED,
          "Unable to download custom clearance document",
          { error: err.message }
        );
      }
    }
  },

  // Generate PZ Document for a project
  generatePZDocument: async function (req, res) {
    try {
      const { projectId, groupId } = req.body;
      //const groupId = req.groupId;
      const userId = req.userId || 1;

      if (!projectId) {
        return sendResponseWithData(
          res,
          ErrorCode.BAD_REQUEST,
          "Project ID is required",
          null
        );
      }

      console.log("projectId in generatePZDocument-", projectId);

      // Verify project exists
      const project = await Project.findOne({ where: { guid: projectId } });
      if (!project) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Project not found.",
          null
        );
      }

      // Verify group exists
      const group = await Group.findOne({ where: { guid: groupId } });
      if (!group) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Group not found",
          null
        );
      }

      const invoices = await Invoice.findAll({ where: { projectId: project.id, groupId: group.id } });
      if (!invoices || invoices.length === 0) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "No invoices found for this project",
          null
        );
      }

      const allItems = invoices.map(invoice => JSON.parse(invoice.translatedFileContent).items).flat().map(item => ({
        name: item.description + " " + item.category,
        unit: item.UOM,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toFixed(2),
        taxRate: 23 + "%",
        netTotal: item.total.toFixed(2),
        grossTotal: (item.total * (1 + taxRate / 100)).toFixed(2)
      })).flat();

      const customDeclaration = await CustomDeclaration.findOne({ where: { projectId: project.id, groupId: group.id }, order: [['createdAt', 'DESC']] });
      if (!customDeclaration) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "No custom declaration found for this project",
          null
        );
      }

      const courierShipment = await CourierReceipt.findOne({ where: { projectId: project.id, groupId: group.id }, order: [['createdAt', 'DESC']] });

      if (!courierShipment) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "No courier shipment found for this project",
          null
        );
      }

      const customDeclarationData = JSON.parse(customDeclaration.originalFileContent);

      const courierShipmentData = JSON.parse(courierShipment.fileContent);

      // Generate PZ document
      // const pzDocumentData = await pzDocumentGenerator.generatePZDocument(project.id, group.id);
      const pdfInfo = {
        logo: group.logo,
        logoPath: group.logoPath,
        documentTitle: "Custom Clearance PZ Document",
        documentNumber: customDeclarationData.Certified_Customs_Declaration_Part_I.Message_ID,
        issueDate: new Date().toLocaleDateString('pl-PL'),
        warehouse: group.name || 'Default Warehouse',
        recipient: { ...courierShipmentData.consignee, postalCode: courierShipmentData.consignee.postal_code },
        supplier: { ...courierShipmentData.shipper, postalCode: courierShipment.shipper.postal_code },
        currency: project.exchangeCurrency,
        notes: `${courierShipmentData.shipment_details.reference_number} Dated: ${courierShipmentData.document_metadata.issue_date}`,
        notesLabel: 'Uwagi',
        totals: { net: allItems.reduce((acc, item) => acc + item.netTotal, 0), gross: allItems.reduce((acc, item) => acc + item.grossTotal, 0) },
        summaryRows: [
          { label: 'Total Net', value: allItems.reduce((acc, item) => acc + item.netTotal, 0) },
          { label: 'Total Gross', value: allItems.reduce((acc, item) => acc + item.grossTotal, 0) },
          { label: 'Total Tax', value: allItems.reduce((acc, item) => acc + item.taxTotal, 0) }
        ],
        footerText: " Wydruk pochodzi z systemu wFirma.pl wersja 25.",
        signatures: {
          issuedBy: "Issuer Name",
          receivedBy: "Receiver Name"
        }
      };


      // Prepare output directory (similar to invoice translation pattern)
      const outputDir = path.join('media', 'declaration', customDeclaration.guid.substring(0, 1));
      const fs = require('fs');
      fs.mkdirSync(outputDir, { recursive: true });

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `PZ-${project.title.replace(/[^a-zA-Z0-9]/g, '_')}-${timestamp}.pdf`;
      const outputPath = path.join(outputDir, fileName);

      const pzDocumentData = await generatePZDocumentPdfmake({
        pdfInfo,
        items: allItems,
        outputPath: outputPath
      });

      // Create CustomClearance record
      const customClearance = await CustomClearance.create({
        projectId: project.id,
        groupId: group.id,
        filePath: outputPath,
        //fileContent: pzDocumentData.fileContent,
        //insights: pzDocumentData.insights,
        openAIFileId: null // Not using OpenAI for PZ generation
      });

      console.log(`✅ CustomClearance record created with ID: ${customClearance.id}`);

      // Log activity
      try {
        await activityHelper.logCustomClearanceCreation(customClearance, userId);
      } catch (activityError) {
        console.error("Activity logging failed:", activityError);
        // Don't fail the main operation if activity logging fails
      }

      let responseData = {
        status: "success",
        data: {
          customClearance: customClearance,
          fileName: pzDocumentData.fileName,
          filePath: pzDocumentData.filePath
        },
        message: "PZ document generated and saved successfully"
      };

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "PZ document generated successfully",
        responseData
      );
    } catch (err) {
      console.error('Error generating PZ document:', err);
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        err.message || "Unable to generate PZ document",
        { error: err.message, stack: err.stack }
      );
    }
  }
};

module.exports = controller;

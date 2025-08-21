const { ActivityLog } = require("../models/activity-log-model");
const { Project } = require("../models/project.model");
const { Group } = require("../models/group-model");

const activityHelper = {
  /**
   * Log an activity
   * @param {Object} data - Activity data
   * @param {number} data.projectId - Project ID
   * @param {number} data.groupId - Group ID
   * @param {string} data.action - Action performed
   * @param {string} data.description - Description of the action
   * @param {number} data.createdBy - User ID who performed the action
   * @returns {Promise<Object>} Created activity log
   */
  logActivity: async function(data) {
    try {
      // Validate required fields
      if (!data.projectId || !data.groupId || !data.action || !data.description || !data.createdBy) {
        throw new Error("Missing required fields for activity logging");
      }

      // Verify project exists
      const project = await Project.findByPk(data.projectId);
      if (!project) {
        throw new Error("Project not found for activity logging");
      }

      // Verify group exists
      const group = await Group.findByPk(data.groupId);
      if (!group) {
        throw new Error("Group not found for activity logging");
      }

      // Create activity log
      const activityLog = await ActivityLog.create({
        projectId: data.projectId,
        groupId: data.groupId,
        action: data.action,
        description: data.description,
        createdBy: data.createdBy
      });

      return activityLog;
    } catch (error) {
      console.error("Error logging activity:", error);
      throw error;
    }
  },

  /**
   * Log user creation activity
   * @param {Object} userData - User data
   * @param {number} createdBy - User ID who created the user
   * @returns {Promise<Object>} Created activity log
   */
  logUserCreation: async function(userData, createdBy) {
    return await this.logActivity({
      projectId: userData.projectId || 1, // Default project if not specified
      groupId: userData.groupId,
      action: "USER_CREATED",
      description: `User ${userData.firstName} ${userData.lastName} (${userData.email}) was created`,
      createdBy: createdBy
    });
  },

  /**
   * Log group creation activity
   * @param {Object} groupData - Group data
   * @param {number} createdBy - User ID who created the group
   * @returns {Promise<Object>} Created activity log
   */
  logGroupCreation: async function(groupData, createdBy) {
    return await this.logActivity({
      projectId: 1, // Default project for group operations
      groupId: groupData.id,
      action: "GROUP_CREATED",
      description: `Group "${groupData.name}" was created`,
      createdBy: createdBy
    });
  },

  /**
   * Log project creation activity
   * @param {Object} projectData - Project data
   * @param {number} createdBy - User ID who created the project
   * @returns {Promise<Object>} Created activity log
   */
  logProjectCreation: async function(projectData, createdBy) {
    return await this.logActivity({
      projectId: projectData.id,
      groupId: projectData.groupId,
      action: "PROJECT_CREATED",
      description: `Project "${projectData.title}" was created`,
      createdBy: createdBy
      });
  },

  /**
   * Log invoice creation activity
   * @param {Object} invoiceData - Invoice data
   * @param {number} createdBy - User ID who created the invoice
   * @returns {Promise<Object>} Created activity log
   */
  logInvoiceCreation: async function(invoiceData, createdBy) {
    return await this.logActivity({
      projectId: invoiceData.projectId,
      groupId: invoiceData.groupId,
      action: "INVOICE_UPLOADED",
      description: `Invoice was uploaded for project ID: ${invoiceData.projectId}`,
      createdBy: createdBy
    });
  },

  /**
   * Log shipping service creation activity
   * @param {string} serviceData - Shipping service data
   * @param {number} createdBy - User ID who created the service
   * @returns {Promise<Object>} Created activity log
   */
  logShippingServiceCreation: async function(serviceData, createdBy) {
    return await this.logActivity({
      projectId: 1, // Default project for service operations
      groupId: serviceData.groupId,
      action: "SHIPPING_SERVICE_CREATED",
      description: `Shipping service "${serviceData.name}" was created`,
      createdBy: createdBy
    });
  },

  /**
   * Log custom agent creation activity
   * @param {Object} agentData - Custom agent data
   * @param {number} createdBy - User ID who created the agent
   * @returns {Promise<Object>} Created activity log
   */
  logCustomAgentCreation: async function(agentData, createdBy) {
    return await this.logActivity({
      projectId: 1, // Default project for agent operations
      groupId: agentData.groupId,
      action: "CUSTOM_AGENT_CREATED",
      description: `Custom agent "${agentData.name}" was created`,
      createdBy: createdBy
    });
  },

  /**
   * Log custom clearance creation activity
   * @param {Object} clearanceData - Custom clearance data
   * @param {number} createdBy - User ID who created the clearance
   * @returns {Promise<Object>} Created activity log
   */
  logCustomClearanceCreation: async function(clearanceData, createdBy) {
    return await this.logActivity({
      projectId: clearanceData.projectId,
      groupId: clearanceData.groupId,
      action: "CUSTOM_CLEARANCE_CREATED",
      description: `Custom clearance was created for project ID: ${clearanceData.projectId}`,
      createdBy: createdBy
    });
  },

  /**
   * Log custom declaration creation activity
   * @param {Object} declarationData - Custom declaration data
   * @param {number} createdBy - User ID who created the declaration
   * @returns {Promise<Object>} Created activity log
   */
  logCustomDeclarationCreation: async function(declarationData, createdBy) {
    return await this.logActivity({
      projectId: declarationData.projectId,
      groupId: declarationData.groupId,
      action: "CUSTOM_DECLARATION_CREATED",
      description: `Custom declaration was created for project ID: ${declarationData.projectId}`,
      createdBy: createdBy
    });
  },

  /**
   * Log courier receipt creation activity
   * @param {Object} receiptData - Courier receipt data
   * @param {number} createdBy - User ID who created the receipt
   * @returns {Promise<Object>} Created activity log
   */
  logCourierReceiptCreation: async function(receiptData, createdBy) {
    return await this.logActivity({
      projectId: receiptData.projectId,
      groupId: receiptData.groupId,
      action: "COURIER_RECEIPT_CREATED",
      description: `Courier receipt was created for project ID: ${receiptData.projectId}`,
      createdBy: createdBy
    });
  },

  /**
   * Log group address creation activity
   * @param {Object} addressData - Group address data
   * @param {number} createdBy - User ID who created the address
   * @returns {Promise<Object>} Created activity log
   */
  logGroupAddressCreation: async function(addressData, createdBy) {
    return await this.logActivity({
      projectId: 1, // Default project for address operations
      groupId: addressData.groupId,
      action: "GROUP_ADDRESS_CREATED",
      description: `Group address was created for group ID: ${addressData.groupId}`,
      createdBy: createdBy
    });
  }
};

module.exports = activityHelper;

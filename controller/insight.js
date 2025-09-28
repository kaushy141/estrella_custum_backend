const { sendResponseWithData } = require("../helper/commonResponseHandler");
const { SuccessCode, ErrorCode } = require("../helper/statusCode");
const mailHelper = require("../helper/mail-helper");
const { Project } = require("../models/project-model");
const { Invoice } = require("../models/invoice-model");
const { CustomDeclaration } = require("../models/custom-declaration-model");
const { CourierReceipt } = require("../models/courier-receipt-model");
const { CustomAgent } = require("../models/custom-agent-model");
const { ShippingService } = require("../models/shipping-service-model");
const { Group } = require("../models/group-model");
const activityHelper = require("../helper/activityHelper");
const config = require("../config/config");

// Helper function to generate insights message from project invoices
function generateInsightsMessage(project, invoices) {
    let message = `Project Insights for: ${project.title}\n\n`;

    if (project.description) {
        message += `Project Description: ${project.description}\n\n`;
    }

    message += `Total Invoices: ${invoices.length}\n\n`;

    // Group invoices by status
    const statusGroups = {};
    invoices.forEach(invoice => {
        const status = invoice.status || 'unknown';
        if (!statusGroups[status]) {
            statusGroups[status] = [];
        }
        statusGroups[status].push(invoice);
    });

    // Add status summary
    message += "Invoice Status Summary:\n";
    Object.keys(statusGroups).forEach(status => {
        message += `• ${status}: ${statusGroups[status].length} invoices\n`;
    });
    message += "\n";

    // Add insights from invoices that have them
    const invoicesWithInsights = invoices.filter(invoice => invoice.insights && invoice.insights.trim());
    if (invoicesWithInsights.length > 0) {
        message += "Key Insights:\n";
        invoicesWithInsights.forEach((invoice, index) => {
            message += `${index + 1}. ${invoice.originalFileName || `Invoice ${invoice.id}`}:\n`;
            message += `   ${invoice.insights}\n\n`;
        });
    } else {
        message += "No specific insights available for invoices at this time.\n\n";
    }

    message += "Please review the project details and contact us if you need any clarification.\n\n";
    message += "Thank you for using our services.";

    return message;
}

// Helper function to generate insights message from project custom declarations
function generateCustomDeclarationInsightsMessage(project, customDeclarations) {
    let message = `Custom Declaration Insights for: ${project.title}\n\n`;

    if (project.description) {
        message += `Project Description: ${project.description}\n\n`;
    }

    message += `Total Custom Declarations: ${customDeclarations.length}\n\n`;

    // Add insights from custom declarations that have them
    const declarationsWithInsights = customDeclarations.filter(declaration => declaration.insights && declaration.insights.trim());
    if (declarationsWithInsights.length > 0) {
        message += "Key Insights:\n";
        declarationsWithInsights.forEach((declaration, index) => {
            message += `${index + 1}. ${declaration.fileName || `Custom Declaration ${declaration.id}`}:\n`;
            message += `   ${declaration.insights}\n\n`;
        });
    } else {
        message += "No specific insights available for custom declarations at this time.\n\n";
    }

    message += "Please review the custom declaration details and contact us if you need any clarification.\n\n";
    message += "Thank you for using our services.";

    return message;
}

// Helper function to generate invoice subject based on project and invoices
function generateInvoiceSubject(project, invoices) {
    const projectTitle = project.title || 'Project';
    const invoiceCount = invoices.length;
    const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    if (invoiceCount === 0) {
        return `Invoice Insights Report - ${projectTitle}`;
    } else if (invoiceCount === 1) {
        return `Invoice Analysis Report - ${projectTitle} (${currentDate})`;
    } else {
        return `Invoice Insights Report - ${projectTitle} (${invoiceCount} Invoices) - ${currentDate}`;
    }
}

// Helper function to generate custom declaration subject based on project and custom declarations
function generateCustomDeclarationSubject(project, customDeclarations) {
    const projectTitle = project.title || 'Project';
    const declarationCount = customDeclarations.length;
    const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    if (declarationCount === 0) {
        return `Custom Declaration Insights Report - ${projectTitle}`;
    } else if (declarationCount === 1) {
        return `Custom Declaration Analysis Report - ${projectTitle} (${currentDate})`;
    } else {
        return `Custom Declaration Insights Report - ${projectTitle} (${declarationCount} Declarations) - ${currentDate}`;
    }
}

// Helper function to generate comprehensive project subject
function generateProjectSubject(project, invoices, customDeclarations) {
    const projectTitle = project.title || 'Project';
    const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const invoiceCount = invoices.length;
    const declarationCount = customDeclarations.length;

    let documentSummary = [];
    if (invoiceCount > 0) documentSummary.push(`${invoiceCount} Invoice${invoiceCount > 1 ? 's' : ''}`);
    if (declarationCount > 0) documentSummary.push(`${declarationCount} Custom Declaration${declarationCount > 1 ? 's' : ''}`);

    const summaryText = documentSummary.length > 0 ? ` (${documentSummary.join(', ')})` : '';

    return `Project Insights Report - ${projectTitle}${summaryText} - ${currentDate}`;
}

// Helper function to generate status summary for invoices
function generateStatusSummary(invoices) {
    const statusGroups = {};
    invoices.forEach(invoice => {
        const status = invoice.status || 'unknown';
        statusGroups[status] = (statusGroups[status] || 0) + 1;
    });
    return statusGroups;
}

// Helper function to generate declaration files list
function generateDeclarationFiles(customDeclarations) {
    return customDeclarations.map(declaration => ({
        fileName: declaration.fileName || `Custom Declaration ${declaration.id}`,
        id: declaration.id
    }));
}

// Helper function to generate insights message from project courier receipts
function generateCourierReceiptInsightsMessage(project, courierReceipts) {
    let message = `Courier Receipt Insights for: ${project.title}\n\n`;

    if (project.description) {
        message += `Project Description: ${project.description}\n\n`;
    }

    message += `Total Courier Receipts: ${courierReceipts.length}\n\n`;

    // Add insights from courier receipts that have them
    const receiptsWithInsights = courierReceipts.filter(receipt => receipt.insights && receipt.insights.trim());
    if (receiptsWithInsights.length > 0) {
        message += "Key Insights:\n";
        receiptsWithInsights.forEach((receipt, index) => {
            message += `${index + 1}. ${receipt.fileName || `Courier Receipt ${receipt.id}`}:\n`;
            message += `   ${receipt.insights}\n\n`;
        });
    } else {
        message += "No specific insights available for courier receipts at this time.\n\n";
    }

    message += "Please review the courier receipt details and contact us if you need any clarification.\n\n";
    message += "Thank you for using our services.";

    return message;
}

// Helper function to generate courier receipt subject
function generateCourierReceiptSubject(project, courierReceipts) {
    const projectTitle = project.title || 'Project';
    const receiptCount = courierReceipts.length;
    const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    if (receiptCount === 0) {
        return `Courier Receipt Insights Report - ${projectTitle}`;
    } else if (receiptCount === 1) {
        return `Courier Receipt Analysis Report - ${projectTitle} (${currentDate})`;
    } else {
        return `Courier Receipt Insights Report - ${projectTitle} (${receiptCount} Receipts) - ${currentDate}`;
    }
}

// Helper function to generate courier receipt files list
function generateCourierReceiptFiles(courierReceipts) {
    return courierReceipts.map(receipt => ({
        fileName: receipt.fileName || `Courier Receipt ${receipt.id}`,
        id: receipt.id,
        status: receipt.status || 'unknown'
    }));
}

const controller = {
    // Send project insights email to active custom agents
    sendProjectInsights: async function (req, res) {
        try {
            const { projectId, subject } = req.body;
            const loggedInUserGroupId = req.groupId; // From auth middleware

            // Validate required fields
            if (!projectId) {
                return sendResponseWithData(
                    res,
                    ErrorCode.BAD_REQUEST,
                    "projectId is required",
                    null
                );
            }

            // Find the project
            const project = await Project.findOne({
                where: {
                    $or: [{ id: projectId }, { guid: projectId }],
                    groupId: loggedInUserGroupId, // Ensure project belongs to user's group
                },
                include: [
                    {
                        model: Group,
                        as: "group",
                        attributes: ["id", "name"],
                    },
                ],
            });

            if (!project) {
                return sendResponseWithData(
                    res,
                    ErrorCode.NOT_FOUND,
                    "Project not found or access denied",
                    null
                );
            }

            // Get all invoices for this project
            const invoices = await Invoice.findAll({
                where: {
                    projectId: project.id,
                    groupId: loggedInUserGroupId,
                },
                attributes: ["id", "insights", "status", "originalFileName"],
            });

            if (invoices.length === 0) {
                return sendResponseWithData(
                    res,
                    ErrorCode.NOT_FOUND,
                    "No invoices found for this project",
                    null
                );
            }

            // Generate subject if not provided
            const emailSubject = subject || generateInvoiceSubject(project, invoices);

            // Generate insights message from invoices
            const insightsMessage = generateInsightsMessage(project, invoices);

            // Find active custom agents in the same group
            const customAgents = await CustomAgent.findAll({
                where: {
                    groupId: loggedInUserGroupId,
                    isActive: true,
                },
                include: [
                    {
                        model: Group,
                        as: "group",
                        attributes: ["id", "name"],
                    },
                ],
            });

            if (customAgents.length === 0) {
                return sendResponseWithData(
                    res,
                    ErrorCode.NOT_FOUND,
                    "No active custom agents found in your group",
                    null
                );
            }

            // Send emails to all active custom agents
            const emailPromises = customAgents.map(async (agent) => {
                try {
                    await mailHelper.sendInsights(
                        agent.email,
                        agent.name,
                        emailSubject,
                        insightsMessage,
                        {
                            type: 'invoice',
                            projectTitle: project.title,
                            projectDescription: project.description,
                            invoiceCount: invoices.length,
                            statusSummary: generateStatusSummary(invoices),
                            dashboardUrl: `${config.siteUrl}/dashboard/projects/${project.id}`
                        }
                    );
                    return { success: true, agentId: agent.id, email: agent.email };
                } catch (error) {
                    console.error(`Failed to send email to ${agent.email}:`, error);
                    return { success: false, agentId: agent.id, email: agent.email, error: error.message };
                }
            });

            const results = await Promise.all(emailPromises);
            const successful = results.filter(r => r.success);
            const failed = results.filter(r => !r.success);

            // Log activity
            try {
                await activityHelper.logProjectInsightEmailSent(
                    project.id,
                    emailSubject,
                    successful.length,
                    failed.length,
                    req.userId || 1
                );
            } catch (activityError) {
                console.error("Activity logging failed:", activityError);
                // Don't fail the main operation if activity logging fails
            }

            let responseData = {
                status: "success",
                message: `Project insights sent: ${successful.length} successful, ${failed.length} failed`,
                data: {
                    project: {
                        id: project.id,
                        title: project.title,
                        description: project.description,
                    },
                    invoicesCount: invoices.length,
                    customAgentsCount: customAgents.length,
                    successful: successful.length,
                    failed: failed.length,
                    results: results,
                },
            };

            return sendResponseWithData(
                res,
                SuccessCode.SUCCESS,
                "Project insights email processing completed",
                responseData
            );
        } catch (err) {
            console.error("Error sending project insights email:", err);
            return sendResponseWithData(
                res,
                ErrorCode.REQUEST_FAILED,
                "Unable to send project insights email",
                err
            );
        }
    },

    // Send custom declaration insights email to active custom agents and shipping service users
    sendCustomDeclarationInsights: async function (req, res) {
        try {
            const { projectId, subject } = req.body;
            const loggedInUserGroupId = req.groupId; // From auth middleware

            // Validate required fields
            if (!projectId) {
                return sendResponseWithData(
                    res,
                    ErrorCode.BAD_REQUEST,
                    "projectId is required",
                    null
                );
            }

            // Find the project
            const project = await Project.findOne({
                where: {
                    $or: [{ id: projectId }, { guid: projectId }],
                    groupId: loggedInUserGroupId, // Ensure project belongs to user's group
                },
                include: [
                    {
                        model: Group,
                        as: "group",
                        attributes: ["id", "name"],
                    },
                ],
            });

            if (!project) {
                return sendResponseWithData(
                    res,
                    ErrorCode.NOT_FOUND,
                    "Project not found or access denied",
                    null
                );
            }

            // Get all custom declarations for this project
            const customDeclarations = await CustomDeclaration.findAll({
                where: {
                    projectId: project.id,
                    groupId: loggedInUserGroupId,
                },
                attributes: ["id", "insights", "fileName"],
            });

            if (customDeclarations.length === 0) {
                return sendResponseWithData(
                    res,
                    ErrorCode.NOT_FOUND,
                    "No custom declarations found for this project",
                    null
                );
            }

            // Generate subject if not provided
            const emailSubject = subject || generateCustomDeclarationSubject(project, customDeclarations);

            // Generate insights message from custom declarations
            const insightsMessage = generateCustomDeclarationInsightsMessage(project, customDeclarations);

            // Find active custom agents in the same group
            const customAgents = await CustomAgent.findAll({
                where: {
                    groupId: loggedInUserGroupId,
                    isActive: true,
                },
                include: [
                    {
                        model: Group,
                        as: "group",
                        attributes: ["id", "name"],
                    },
                ],
            });

            // Find active shipping service users in the same group
            const shippingServices = await ShippingService.findAll({
                where: {
                    groupId: loggedInUserGroupId,
                    isActive: true,
                },
                include: [
                    {
                        model: Group,
                        as: "group",
                        attributes: ["id", "name"],
                    },
                ],
            });

            // Combine all recipients
            const allRecipients = [
                ...customAgents.map(agent => ({ type: 'customAgent', id: agent.id, name: agent.name, email: agent.email })),
                ...shippingServices.map(service => ({ type: 'shippingService', id: service.id, name: service.name, email: service.email }))
            ];

            if (allRecipients.length === 0) {
                return sendResponseWithData(
                    res,
                    ErrorCode.NOT_FOUND,
                    "No active custom agents or shipping service users found in your group",
                    null
                );
            }

            // Send emails to all recipients
            const emailPromises = allRecipients.map(async (recipient) => {
                try {
                    await mailHelper.sendInsights(
                        recipient.email,
                        recipient.name,
                        emailSubject,
                        insightsMessage,
                        {
                            type: 'customDeclaration',
                            projectTitle: project.title,
                            projectDescription: project.description,
                            declarationCount: customDeclarations.length,
                            declarationFiles: generateDeclarationFiles(customDeclarations),
                            dashboardUrl: `${config.siteUrl}/dashboard/projects/${project.id}`,
                            supportUrl: `${config.siteUrl}/support`
                        }
                    );
                    return { success: true, recipientId: recipient.id, email: recipient.email, type: recipient.type };
                } catch (error) {
                    console.error(`Failed to send email to ${recipient.email}:`, error);
                    return { success: false, recipientId: recipient.id, email: recipient.email, type: recipient.type, error: error.message };
                }
            });

            const results = await Promise.all(emailPromises);
            const successful = results.filter(r => r.success);
            const failed = results.filter(r => !r.success);

            // Log activity
            try {
                await activityHelper.logCustomDeclarationInsightEmailSent(
                    project.id,
                    emailSubject,
                    successful.length,
                    failed.length,
                    req.userId || 1
                );
            } catch (activityError) {
                console.error("Activity logging failed:", activityError);
                // Don't fail the main operation if activity logging fails
            }

            let responseData = {
                status: "success",
                message: `Custom declaration insights sent: ${successful.length} successful, ${failed.length} failed`,
                data: {
                    project: {
                        id: project.id,
                        title: project.title,
                        description: project.description,
                    },
                    customDeclarationsCount: customDeclarations.length,
                    customAgentsCount: customAgents.length,
                    shippingServicesCount: shippingServices.length,
                    totalRecipients: allRecipients.length,
                    successful: successful.length,
                    failed: failed.length,
                    results: results,
                },
            };

            return sendResponseWithData(
                res,
                SuccessCode.SUCCESS,
                "Custom declaration insights email processing completed",
                responseData
            );
        } catch (err) {
            console.error("Error sending custom declaration insights email:", err);
            return sendResponseWithData(
                res,
                ErrorCode.REQUEST_FAILED,
                "Unable to send custom declaration insights email",
                err
            );
        }
    },

    // Send combined insights (invoice + custom declaration) to all relevant recipients
    sendCombinedInsights: async function (req, res) {
        try {
            const { projectId, invoiceSubject, customDeclarationSubject } = req.body;
            const loggedInUserGroupId = req.groupId; // From auth middleware

            // Validate required fields
            if (!projectId) {
                return sendResponseWithData(
                    res,
                    ErrorCode.BAD_REQUEST,
                    "projectId is required",
                    null
                );
            }

            // Find the project
            const project = await Project.findOne({
                where: {
                    $or: [{ id: projectId }, { guid: projectId }],
                    groupId: loggedInUserGroupId, // Ensure project belongs to user's group
                },
                include: [
                    {
                        model: Group,
                        as: "group",
                        attributes: ["id", "name"],
                    },
                ],
            });

            if (!project) {
                return sendResponseWithData(
                    res,
                    ErrorCode.NOT_FOUND,
                    "Project not found or access denied",
                    null
                );
            }

            // Get all invoices for this project
            const invoices = await Invoice.findAll({
                where: {
                    projectId: project.id,
                    groupId: loggedInUserGroupId,
                },
                attributes: ["id", "insights", "status", "originalFileName"],
            });

            // Get all custom declarations for this project
            const customDeclarations = await CustomDeclaration.findAll({
                where: {
                    projectId: project.id,
                    groupId: loggedInUserGroupId,
                },
                attributes: ["id", "insights", "fileName"],
            });

            // Check if we have any data to send
            if (invoices.length === 0 && customDeclarations.length === 0) {
                return sendResponseWithData(
                    res,
                    ErrorCode.NOT_FOUND,
                    "No invoices or custom declarations found for this project",
                    null
                );
            }

            // Generate subjects if not provided
            const finalInvoiceSubject = invoiceSubject || generateInvoiceSubject(project, invoices);
            const finalCustomDeclarationSubject = customDeclarationSubject || generateCustomDeclarationSubject(project, customDeclarations);

            // Find active custom agents in the same group
            const customAgents = await CustomAgent.findAll({
                where: {
                    groupId: loggedInUserGroupId,
                    isActive: true,
                },
                include: [
                    {
                        model: Group,
                        as: "group",
                        attributes: ["id", "name"],
                    },
                ],
            });

            // Find active shipping service users in the same group
            const shippingServices = await ShippingService.findAll({
                where: {
                    groupId: loggedInUserGroupId,
                    isActive: true,
                },
                include: [
                    {
                        model: Group,
                        as: "group",
                        attributes: ["id", "name"],
                    },
                ],
            });

            // Prepare email tasks
            const emailTasks = [];

            // Task 1: Send invoice insights to custom agents (if invoices exist)
            if (invoices.length > 0 && customAgents.length > 0) {
                const invoiceInsightsMessage = generateInsightsMessage(project, invoices);

                customAgents.forEach(agent => {
                    emailTasks.push({
                        type: 'invoice',
                        recipient: { type: 'customAgent', id: agent.id, name: agent.name, email: agent.email },
                        subject: finalInvoiceSubject,
                        message: invoiceInsightsMessage
                    });
                });
            }

            // Task 2: Send custom declaration insights to custom agents (if custom declarations exist)
            if (customDeclarations.length > 0 && customAgents.length > 0) {
                const customDeclarationInsightsMessage = generateCustomDeclarationInsightsMessage(project, customDeclarations);

                customAgents.forEach(agent => {
                    emailTasks.push({
                        type: 'customDeclaration',
                        recipient: { type: 'customAgent', id: agent.id, name: agent.name, email: agent.email },
                        subject: finalCustomDeclarationSubject,
                        message: customDeclarationInsightsMessage
                    });
                });
            }

            // Task 3: Send custom declaration insights to shipping services (if custom declarations exist)
            if (customDeclarations.length > 0 && shippingServices.length > 0) {
                const customDeclarationInsightsMessage = generateCustomDeclarationInsightsMessage(project, customDeclarations);

                shippingServices.forEach(service => {
                    emailTasks.push({
                        type: 'customDeclaration',
                        recipient: { type: 'shippingService', id: service.id, name: service.name, email: service.email },
                        subject: finalCustomDeclarationSubject,
                        message: customDeclarationInsightsMessage
                    });
                });
            }

            if (emailTasks.length === 0) {
                return sendResponseWithData(
                    res,
                    ErrorCode.NOT_FOUND,
                    "No active recipients found for sending insights",
                    null
                );
            }

            // Execute all email tasks
            const emailPromises = emailTasks.map(async (task) => {
                try {
                    // Prepare template data based on email type
                    let templateData = {};
                    if (task.type === 'invoice') {
                        templateData = {
                            type: 'invoice',
                            projectTitle: project.title,
                            projectDescription: project.description,
                            invoiceCount: invoices.length,
                            statusSummary: generateStatusSummary(invoices),
                            dashboardUrl: `${config.siteUrl}/dashboard/projects/${project.id}`
                        };
                    } else if (task.type === 'customDeclaration') {
                        templateData = {
                            type: 'customDeclaration',
                            projectTitle: project.title,
                            projectDescription: project.description,
                            declarationCount: customDeclarations.length,
                            declarationFiles: generateDeclarationFiles(customDeclarations),
                            dashboardUrl: `${config.siteUrl}/dashboard/projects/${project.id}`,
                            supportUrl: `${config.siteUrl}/support`
                        };
                    }

                    await mailHelper.sendInsights(
                        task.recipient.email,
                        task.recipient.name,
                        task.subject,
                        task.message,
                        templateData
                    );
                    return {
                        success: true,
                        type: task.type,
                        recipientId: task.recipient.id,
                        email: task.recipient.email,
                        recipientType: task.recipient.type,
                        subject: task.subject
                    };
                } catch (error) {
                    console.error(`Failed to send ${task.type} email to ${task.recipient.email}:`, error);
                    return {
                        success: false,
                        type: task.type,
                        recipientId: task.recipient.id,
                        email: task.recipient.email,
                        recipientType: task.recipient.type,
                        subject: task.subject,
                        error: error.message
                    };
                }
            });

            const results = await Promise.all(emailPromises);
            const successful = results.filter(r => r.success);
            const failed = results.filter(r => !r.success);

            // Group results by type
            const invoiceResults = results.filter(r => r.type === 'invoice');
            const customDeclarationResults = results.filter(r => r.type === 'customDeclaration');

            // Log activity
            try {
                await activityHelper.logCombinedInsightEmailSent(
                    project.id,
                    finalInvoiceSubject,
                    finalCustomDeclarationSubject,
                    successful.length,
                    failed.length,
                    req.userId || 1
                );
            } catch (activityError) {
                console.error("Activity logging failed:", activityError);
                // Don't fail the main operation if activity logging fails
            }

            let responseData = {
                status: "success",
                message: `Combined insights sent: ${successful.length} successful, ${failed.length} failed`,
                data: {
                    project: {
                        id: project.id,
                        title: project.title,
                        description: project.description,
                    },
                    invoicesCount: invoices.length,
                    customDeclarationsCount: customDeclarations.length,
                    customAgentsCount: customAgents.length,
                    shippingServicesCount: shippingServices.length,
                    totalTasks: emailTasks.length,
                    successful: successful.length,
                    failed: failed.length,
                    breakdown: {
                        invoiceEmails: {
                            total: invoiceResults.length,
                            successful: invoiceResults.filter(r => r.success).length,
                            failed: invoiceResults.filter(r => !r.success).length
                        },
                        customDeclarationEmails: {
                            total: customDeclarationResults.length,
                            successful: customDeclarationResults.filter(r => r.success).length,
                            failed: customDeclarationResults.filter(r => !r.success).length
                        }
                    },
                    results: results,
                },
            };

            return sendResponseWithData(
                res,
                SuccessCode.SUCCESS,
                "Combined insights email processing completed",
                responseData
            );
        } catch (err) {
            console.error("Error sending combined insights email:", err);
            return sendResponseWithData(
                res,
                ErrorCode.REQUEST_FAILED,
                "Unable to send combined insights email",
                err
            );
        }
    },

    // Send custom declaration insights email to custom agents only
    sendCustomDeclarationInsightsToAgents: async function (req, res) {
        try {
            const { projectId, subject } = req.body;
            const loggedInUserGroupId = req.groupId; // From auth middleware

            // Validate required fields
            if (!projectId) {
                return sendResponseWithData(
                    res,
                    ErrorCode.BAD_REQUEST,
                    "projectId is required",
                    null
                );
            }

            // Find the project
            const project = await Project.findOne({
                where: {
                    $or: [{ id: projectId }, { guid: projectId }],
                    groupId: loggedInUserGroupId, // Ensure project belongs to user's group
                },
                include: [
                    {
                        model: Group,
                        as: "group",
                        attributes: ["id", "name"],
                    },
                ],
            });

            if (!project) {
                return sendResponseWithData(
                    res,
                    ErrorCode.NOT_FOUND,
                    "Project not found or access denied",
                    null
                );
            }

            // Get all custom declarations for this project
            const customDeclarations = await CustomDeclaration.findAll({
                where: {
                    projectId: project.id,
                    groupId: loggedInUserGroupId,
                },
                attributes: ["id", "insights", "fileName"],
            });

            if (customDeclarations.length === 0) {
                return sendResponseWithData(
                    res,
                    ErrorCode.NOT_FOUND,
                    "No custom declarations found for this project",
                    null
                );
            }

            // Generate subject if not provided
            const emailSubject = subject || generateCustomDeclarationSubject(project, customDeclarations);

            // Generate insights message from custom declarations
            const insightsMessage = generateCustomDeclarationInsightsMessage(project, customDeclarations);

            // Find active custom agents in the same group
            const customAgents = await CustomAgent.findAll({
                where: {
                    groupId: loggedInUserGroupId,
                    isActive: true,
                },
                include: [
                    {
                        model: Group,
                        as: "group",
                        attributes: ["id", "name"],
                    },
                ],
            });

            if (customAgents.length === 0) {
                return sendResponseWithData(
                    res,
                    ErrorCode.NOT_FOUND,
                    "No active custom agents found in your group",
                    null
                );
            }

            // Send emails to custom agents only
            const emailPromises = customAgents.map(async (agent) => {
                try {
                    await mailHelper.sendInsights(
                        agent.email,
                        agent.name,
                        emailSubject,
                        insightsMessage,
                        {
                            type: 'customDeclaration',
                            projectTitle: project.title,
                            projectDescription: project.description,
                            declarationCount: customDeclarations.length,
                            declarationFiles: generateDeclarationFiles(customDeclarations),
                            dashboardUrl: `${config.siteUrl}/dashboard/projects/${project.id}`,
                            supportUrl: `${config.siteUrl}/support`
                        }
                    );
                    return { success: true, agentId: agent.id, email: agent.email };
                } catch (error) {
                    console.error(`Failed to send email to ${agent.email}:`, error);
                    return { success: false, agentId: agent.id, email: agent.email, error: error.message };
                }
            });

            const results = await Promise.all(emailPromises);
            const successful = results.filter(r => r.success);
            const failed = results.filter(r => !r.success);

            // Log activity
            try {
                await activityHelper.logCustomDeclarationInsightEmailSentToAgents(
                    project.id,
                    emailSubject,
                    successful.length,
                    failed.length,
                    req.userId || 1
                );
            } catch (activityError) {
                console.error("Activity logging failed:", activityError);
                // Don't fail the main operation if activity logging fails
            }

            let responseData = {
                status: "success",
                message: `Custom declaration insights sent to agents: ${successful.length} successful, ${failed.length} failed`,
                data: {
                    project: {
                        id: project.id,
                        title: project.title,
                        description: project.description,
                    },
                    customDeclarationsCount: customDeclarations.length,
                    customAgentsCount: customAgents.length,
                    successful: successful.length,
                    failed: failed.length,
                    results: results,
                },
            };

            return sendResponseWithData(
                res,
                SuccessCode.SUCCESS,
                "Custom declaration insights email to agents processing completed",
                responseData
            );
        } catch (err) {
            console.error("Error sending custom declaration insights email to agents:", err);
            return sendResponseWithData(
                res,
                ErrorCode.REQUEST_FAILED,
                "Unable to send custom declaration insights email to agents",
                err
            );
        }
    },

    // Send custom declaration insights email to shipping services only
    sendCustomDeclarationInsightsToShippingServices: async function (req, res) {
        try {
            const { projectId, subject } = req.body;
            const loggedInUserGroupId = req.groupId; // From auth middleware

            // Validate required fields
            if (!projectId) {
                return sendResponseWithData(
                    res,
                    ErrorCode.BAD_REQUEST,
                    "projectId is required",
                    null
                );
            }

            // Find the project
            const project = await Project.findOne({
                where: {
                    $or: [{ id: projectId }, { guid: projectId }],
                    groupId: loggedInUserGroupId, // Ensure project belongs to user's group
                },
                include: [
                    {
                        model: Group,
                        as: "group",
                        attributes: ["id", "name"],
                    },
                ],
            });

            if (!project) {
                return sendResponseWithData(
                    res,
                    ErrorCode.NOT_FOUND,
                    "Project not found or access denied",
                    null
                );
            }

            // Get all custom declarations for this project
            const customDeclarations = await CustomDeclaration.findAll({
                where: {
                    projectId: project.id,
                    groupId: loggedInUserGroupId,
                },
                attributes: ["id", "insights", "fileName"],
            });

            if (customDeclarations.length === 0) {
                return sendResponseWithData(
                    res,
                    ErrorCode.NOT_FOUND,
                    "No custom declarations found for this project",
                    null
                );
            }

            // Generate subject if not provided
            const emailSubject = subject || generateCustomDeclarationSubject(project, customDeclarations);

            // Generate insights message from custom declarations
            const insightsMessage = generateCustomDeclarationInsightsMessage(project, customDeclarations);

            // Find active shipping service users in the same group
            const shippingServices = await ShippingService.findAll({
                where: {
                    groupId: loggedInUserGroupId,
                    isActive: true,
                },
                include: [
                    {
                        model: Group,
                        as: "group",
                        attributes: ["id", "name"],
                    },
                ],
            });

            if (shippingServices.length === 0) {
                return sendResponseWithData(
                    res,
                    ErrorCode.NOT_FOUND,
                    "No active shipping service users found in your group",
                    null
                );
            }

            // Send emails to shipping services only
            const emailPromises = shippingServices.map(async (service) => {
                try {
                    await mailHelper.sendInsights(
                        service.email,
                        service.name,
                        emailSubject,
                        insightsMessage,
                        {
                            type: 'customDeclaration',
                            projectTitle: project.title,
                            projectDescription: project.description,
                            declarationCount: customDeclarations.length,
                            declarationFiles: generateDeclarationFiles(customDeclarations),
                            dashboardUrl: `${config.siteUrl}/dashboard/projects/${project.id}`,
                            supportUrl: `${config.siteUrl}/support`
                        }
                    );
                    return { success: true, serviceId: service.id, email: service.email };
                } catch (error) {
                    console.error(`Failed to send email to ${service.email}:`, error);
                    return { success: false, serviceId: service.id, email: service.email, error: error.message };
                }
            });

            const results = await Promise.all(emailPromises);
            const successful = results.filter(r => r.success);
            const failed = results.filter(r => !r.success);

            // Log activity
            try {
                await activityHelper.logCustomDeclarationInsightEmailSentToShippingServices(
                    project.id,
                    emailSubject,
                    successful.length,
                    failed.length,
                    req.userId || 1
                );
            } catch (activityError) {
                console.error("Activity logging failed:", activityError);
                // Don't fail the main operation if activity logging fails
            }

            let responseData = {
                status: "success",
                message: `Custom declaration insights sent to shipping services: ${successful.length} successful, ${failed.length} failed`,
                data: {
                    project: {
                        id: project.id,
                        title: project.title,
                        description: project.description,
                    },
                    customDeclarationsCount: customDeclarations.length,
                    shippingServicesCount: shippingServices.length,
                    successful: successful.length,
                    failed: failed.length,
                    results: results,
                },
            };

            return sendResponseWithData(
                res,
                SuccessCode.SUCCESS,
                "Custom declaration insights email to shipping services processing completed",
                responseData
            );
        } catch (err) {
            console.error("Error sending custom declaration insights email to shipping services:", err);
            return sendResponseWithData(
                res,
                ErrorCode.REQUEST_FAILED,
                "Unable to send custom declaration insights email to shipping services",
                err
            );
        }
    },

    // Send courier receipt insights email to shipping services
    sendCourierReceiptInsightsToShippingServices: async function (req, res) {
        try {
            const { projectId, subject } = req.body;
            const loggedInUserGroupId = req.groupId; // From auth middleware

            // Validate required fields
            if (!projectId) {
                return sendResponseWithData(
                    res,
                    ErrorCode.BAD_REQUEST,
                    "projectId is required",
                    null
                );
            }

            // Find the project
            const project = await Project.findOne({
                where: {
                    $or: [{ id: projectId }, { guid: projectId }],
                    groupId: loggedInUserGroupId, // Ensure project belongs to user's group
                },
                include: [
                    {
                        model: Group,
                        as: "group",
                        attributes: ["id", "name"],
                    },
                ],
            });

            if (!project) {
                return sendResponseWithData(
                    res,
                    ErrorCode.NOT_FOUND,
                    "Project not found or access denied",
                    null
                );
            }

            // Get all courier receipts for this project
            const courierReceipts = await CourierReceipt.findAll({
                where: {
                    projectId: project.id,
                    groupId: loggedInUserGroupId,
                },
                attributes: ["id", "insights", "fileName", "status"],
            });

            if (courierReceipts.length === 0) {
                return sendResponseWithData(
                    res,
                    ErrorCode.NOT_FOUND,
                    "No courier receipts found for this project",
                    null
                );
            }

            // Generate subject if not provided
            const emailSubject = subject || generateCourierReceiptSubject(project, courierReceipts);

            // Generate insights message from courier receipts
            const insightsMessage = generateCourierReceiptInsightsMessage(project, courierReceipts);

            // Find active shipping service users in the same group
            const shippingServices = await ShippingService.findAll({
                where: {
                    groupId: loggedInUserGroupId,
                    isActive: true,
                },
                include: [
                    {
                        model: Group,
                        as: "group",
                        attributes: ["id", "name"],
                    },
                ],
            });

            if (shippingServices.length === 0) {
                return sendResponseWithData(
                    res,
                    ErrorCode.NOT_FOUND,
                    "No active shipping service users found in your group",
                    null
                );
            }

            // Send emails to shipping services
            const emailPromises = shippingServices.map(async (service) => {
                try {
                    await mailHelper.sendInsights(
                        service.email,
                        service.name,
                        emailSubject,
                        insightsMessage,
                        {
                            type: 'courierReceipt',
                            projectTitle: project.title,
                            projectDescription: project.description,
                            receiptCount: courierReceipts.length,
                            receiptFiles: generateCourierReceiptFiles(courierReceipts),
                            dashboardUrl: `${config.siteUrl}/dashboard/projects/${project.id}`,
                            supportUrl: `${config.siteUrl}/support`
                        }
                    );
                    return { success: true, serviceId: service.id, email: service.email };
                } catch (error) {
                    console.error(`Failed to send email to ${service.email}:`, error);
                    return { success: false, serviceId: service.id, email: service.email, error: error.message };
                }
            });

            const results = await Promise.all(emailPromises);
            const successful = results.filter(r => r.success);
            const failed = results.filter(r => !r.success);

            // Log activity
            try {
                await activityHelper.logCourierReceiptInsightEmailSentToShippingServices(
                    project.id,
                    emailSubject,
                    successful.length,
                    failed.length,
                    req.userId || 1
                );
            } catch (activityError) {
                console.error("Activity logging failed:", activityError);
                // Don't fail the main operation if activity logging fails
            }

            let responseData = {
                status: "success",
                message: `Courier receipt insights sent to shipping services: ${successful.length} successful, ${failed.length} failed`,
                data: {
                    project: {
                        id: project.id,
                        title: project.title,
                        description: project.description,
                    },
                    courierReceiptsCount: courierReceipts.length,
                    shippingServicesCount: shippingServices.length,
                    successful: successful.length,
                    failed: failed.length,
                    results: results,
                },
            };

            return sendResponseWithData(
                res,
                SuccessCode.SUCCESS,
                "Courier receipt insights email to shipping services processing completed",
                responseData
            );
        } catch (err) {
            console.error("Error sending courier receipt insights email to shipping services:", err);
            return sendResponseWithData(
                res,
                ErrorCode.REQUEST_FAILED,
                "Unable to send courier receipt insights email to shipping services",
                err
            );
        }
    },
};

module.exports = controller;

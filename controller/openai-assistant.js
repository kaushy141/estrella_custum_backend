/**
 * OpenAI Assistant Controller
 * API endpoints for managing OpenAI Assistant IDs dynamically
 */

const assistantManagerService = require('../services/openai-assistant-manager-service');
const { sendResponseWithData } = require('../helper/commonResponseHandler');
const { SuccessCode, ErrorCode } = require('../helper/statusCode');

/**
 * Get current assistant ID
 * GET /openai-assistant/current
 */
const getCurrentAssistantId = async (req, res) => {
    try {
        const assistantId = await assistantManagerService.getCurrentAssistantId();
        const status = assistantManagerService.getStatus();

        const response = {
            assistantId,
            status,
            message: "Current assistant ID retrieved successfully"
        };

        return sendResponseWithData(
            res,
            SuccessCode.OK,
            "Assistant ID retrieved successfully",
            response
        );

    } catch (error) {
        console.error("Error getting current assistant ID:", error);
        return sendResponseWithData(
            res,
            ErrorCode.REQUEST_FAILED,
            "Failed to retrieve current assistant ID",
            error.message
        );
    }
};

/**
 * Get assistant details
 * GET /openai-assistant/details/:assistantId?
 */
const getAssistantDetails = async (req, res) => {
    try {
        const { assistantId } = req.params;

        const details = await assistantManagerService.getAssistantDetails(assistantId);

        return sendResponseWithData(
            res,
            SuccessCode.OK,
            "Assistant details retrieved successfully",
            details
        );

    } catch (error) {
        console.error("Error getting assistant details:", error);
        return sendResponseWithData(
            res,
            ErrorCode.REQUEST_FAILED,
            "Failed to retrieve assistant details",
            error.message
        );
    }
};

/**
 * Refresh assistant ID
 * POST /openai-assistant/refresh
 */
const refreshAssistantId = async (req, res) => {
    try {
        const { config } = req.body;

        const newAssistantId = await assistantManagerService.refreshAssistantId(config);
        const status = assistantManagerService.getStatus();

        const response = {
            newAssistantId,
            previousAssistantId: status.assistantId,
            status,
            message: "Assistant ID refreshed successfully"
        };

        return sendResponseWithData(
            res,
            SuccessCode.OK,
            "Assistant ID refreshed successfully",
            response
        );

    } catch (error) {
        console.error("Error refreshing assistant ID:", error);
        return sendResponseWithData(
            res,
            ErrorCode.REQUEST_FAILED,
            "Failed to refresh assistant ID",
            error.message
        );
    }
};

/**
 * List all assistants
 * GET /openai-assistant/list
 */
const listAssistants = async (req, res) => {
    try {
        const assistants = await assistantManagerService.listAllAssistants();

        return sendResponseWithData(
            res,
            SuccessCode.OK,
            "Assistants listed successfully",
            {
                assistants,
                count: assistants.length
            }
        );

    } catch (error) {
        console.error("Error listing assistants:", error);
        return sendResponseWithData(
            res,
            ErrorCode.REQUEST_FAILED,
            "Failed to list assistants",
            error.message
        );
    }
};

/**
 * Update assistant configuration
 * PUT /openai-assistant/update/:assistantId
 */
const updateAssistant = async (req, res) => {
    try {
        const { assistantId } = req.params;
        const { updates } = req.body;

        if (!updates || Object.keys(updates).length === 0) {
            return sendResponseWithData(
                res,
                ErrorCode.BAD_REQUEST,
                "Updates object is required and cannot be empty",
                null
            );
        }

        const updatedAssistant = await assistantManagerService.updateAssistant(assistantId, updates);

        return sendResponseWithData(
            res,
            SuccessCode.OK,
            "Assistant updated successfully",
            updatedAssistant
        );

    } catch (error) {
        console.error("Error updating assistant:", error);
        return sendResponseWithData(
            res,
            ErrorCode.REQUEST_FAILED,
            "Failed to update assistant",
            error.message
        );
    }
};

/**
 * Delete an assistant
 * DELETE /openai-assistant/delete/:assistantId
 */
const deleteAssistant = async (req, res) => {
    try {
        const { assistantId } = req.params;

        const result = await assistantManagerService.deleteAssistant(assistantId);

        return sendResponseWithData(
            res,
            SuccessCode.OK,
            "Assistant deleted successfully",
            result
        );

    } catch (error) {
        console.error("Error deleting assistant:", error);
        return sendResponseWithData(
            res,
            ErrorCode.REQUEST_FAILED,
            "Failed to delete assistant",
            error.message
        );
    }
};

/**
 * Cleanup old assistants
 * POST /openai-assistant/cleanup
 */
const cleanupAssistants = async (req, res) => {
    try {
        const { keepCount = 5 } = req.body;

        if (typeof keepCount !== 'number' || keepCount < 1) {
            return sendResponseWithData(
                res,
                ErrorCode.BAD_REQUEST,
                "keepCount must be a positive number",
                null
            );
        }

        const deletedIds = await assistantManagerService.cleanupOldAssistants(keepCount);

        return sendResponseWithData(
            res,
            SuccessCode.OK,
            "Assistants cleaned up successfully",
            {
                deletedAssistants: deletedIds,
                deletedCount: deletedIds.length,
                keepCount
            }
        );

    } catch (error) {
        console.error("Error cleaning up assistants:", error);
        return sendResponseWithData(
            res,
            ErrorCode.REQUEST_FAILED,
            "Failed to cleanup assistants",
            error.message
        );
    }
};

/**
 * Get service status
 * GET /openai-assistant/status
 */
const getServiceStatus = async (req, res) => {
    try {
        const status = assistantManagerService.getStatus();

        return sendResponseWithData(
            res,
            SuccessCode.OK,
            "Service status retrieved successfully",
            status
        );

    } catch (error) {
        console.error("Error getting service status:", error);
        return sendResponseWithData(
            res,
            ErrorCode.REQUEST_FAILED,
            "Failed to retrieve service status",
            error.message
        );
    }
};

/**
 * Set refresh interval
 * PUT /openai-assistant/refresh-interval
 */
const setRefreshInterval = async (req, res) => {
    try {
        const { intervalMs } = req.body;

        if (typeof intervalMs !== 'number' || intervalMs < 0) {
            return sendResponseWithData(
                res,
                ErrorCode.BAD_REQUEST,
                "intervalMs must be a non-negative number",
                null
            );
        }

        assistantManagerService.setRefreshInterval(intervalMs);
        const status = assistantManagerService.getStatus();

        return sendResponseWithData(
            res,
            SuccessCode.OK,
            "Refresh interval updated successfully",
            {
                newIntervalMs: intervalMs,
                newIntervalHours: intervalMs / (1000 * 60 * 60),
                status
            }
        );

    } catch (error) {
        console.error("Error setting refresh interval:", error);
        return sendResponseWithData(
            res,
            ErrorCode.REQUEST_FAILED,
            "Failed to set refresh interval",
            error.message
        );
    }
};

/**
 * Initialize the assistant manager service
 * POST /openai-assistant/initialize
 */
const initializeService = async (req, res) => {
    try {
        const assistantId = await assistantManagerService.initialize();
        const status = assistantManagerService.getStatus();

        return sendResponseWithData(
            res,
            SuccessCode.OK,
            "Assistant manager service initialized successfully",
            {
                assistantId,
                status
            }
        );

    } catch (error) {
        console.error("Error initializing assistant manager service:", error);
        return sendResponseWithData(
            res,
            ErrorCode.REQUEST_FAILED,
            "Failed to initialize assistant manager service",
            error.message
        );
    }
};

module.exports = {
    getCurrentAssistantId,
    getAssistantDetails,
    refreshAssistantId,
    listAssistants,
    updateAssistant,
    deleteAssistant,
    cleanupAssistants,
    getServiceStatus,
    setRefreshInterval,
    initializeService
};

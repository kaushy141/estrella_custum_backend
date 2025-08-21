/**
 * Common response handler for consistent API responses
 */

/**
 * Send response with data
 * @param {Object} res - Express response object
 * @param {Object} statusCode - Status code object with code and message
 * @param {string} message - Response message
 * @param {*} data - Response data
 */
const sendResponseWithData = (res, statusCode, message, data) => {
  const response = {
    success: statusCode.code >= 200 && statusCode.code < 300,
    message: message || statusCode.message,
    data: data,
    timestamp: new Date().toISOString()
  };

  return res.status(statusCode.code).json(response);
};

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 * @param {*} data - Response data
 */
const sendSuccessResponse = (res, message, data) => {
  const response = {
    success: true,
    message: message || 'Operation completed successfully',
    data: data,
    timestamp: new Date().toISOString()
  };

  return res.status(200).json(response);
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {*} error - Error details
 */
const sendErrorResponse = (res, statusCode, message, error = null) => {
  const response = {
    success: false,
    message: message || 'An error occurred',
    error: error,
    timestamp: new Date().toISOString()
  };

  return res.status(statusCode).json(response);
};

/**
 * Send validation error response
 * @param {Object} res - Express response object
 * @param {Array} errors - Validation errors array
 */
const sendValidationError = (res, errors) => {
  const response = {
    success: false,
    message: 'Validation failed',
    errors: errors,
    timestamp: new Date().toISOString()
  };

  return res.status(400).json(response);
};

module.exports = {
  sendResponseWithData,
  sendSuccessResponse,
  sendErrorResponse,
  sendValidationError
};

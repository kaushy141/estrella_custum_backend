/**
 * Status codes for consistent API responses
 */

const SuccessCode = {
  OK: {
    code: 200,
    message: 'OK'
  },
  CREATED: {
    code: 201,
    message: 'Created successfully'
  },
  ACCEPTED: {
    code: 202,
    message: 'Accepted'
  },
  NO_CONTENT: {
    code: 204,
    message: 'No content'
  }
};

const ErrorCode = {
  BAD_REQUEST: {
    code: 400,
    message: 'Bad request'
  },
  UNAUTHORIZED: {
    code: 401,
    message: 'Unauthorized'
  },
  FORBIDDEN: {
    code: 403,
    message: 'Forbidden'
  },
  NOT_FOUND: {
    code: 404,
    message: 'Not found'
  },
  METHOD_NOT_ALLOWED: {
    code: 405,
    message: 'Method not allowed'
  },
  CONFLICT: {
    code: 409,
    message: 'Conflict'
  },
  UNPROCESSABLE_ENTITY: {
    code: 422,
    message: 'Unprocessable entity'
  },
  TOO_MANY_REQUESTS: {
    code: 429,
    message: 'Too many requests'
  },
  INTERNAL_SERVER_ERROR: {
    code: 500,
    message: 'Internal server error'
  },
  NOT_IMPLEMENTED: {
    code: 501,
    message: 'Not implemented'
  },
  SERVICE_UNAVAILABLE: {
    code: 503,
    message: 'Service unavailable'
  }
};

module.exports = {
  SuccessCode,
  ErrorCode
};

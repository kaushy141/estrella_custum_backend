const jwt = require("jsonwebtoken");
const { User } = require("../models/user-model");
const { sendResponseWithData } = require("../helper/commonResponseHandler");
const { ErrorCode } = require("../helper/statusCode");

/**
 * Session-based Authentication Middleware
 * Verifies session and adds user data to request object
 */
const authenticateSession = async (req, res, next) => {
  try {
    // Check if user is authenticated via session
    if (!req.session || !req.session.userId) {
      return sendResponseWithData(
        res,
        ErrorCode.UNAUTHORIZED,
        "Session expired or not authenticated",
        null
      );
    }
    
    // Get user data from session
    const user = await User.findOne({
      where: { id: req.session.userId },
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return sendResponseWithData(
        res,
        ErrorCode.UNAUTHORIZED,
        "Invalid session - user not found",
        null
      );
    }
    
    // Check if user is still active
    if (user.isActive === false) {
      return sendResponseWithData(
        res,
        ErrorCode.UNAUTHORIZED,
        "Account is deactivated",
        null
      );
    }
    
    // Add user data to request object
    req.user = user;
    req.userId = req.session.userId;
    
    next();
  } catch (err) {
    console.error("Session authentication middleware error:", err);
    return sendResponseWithData(
      res,
      ErrorCode.REQUEST_FAILED,
      "Authentication failed",
      err
    );
  }
};

/**
 * JWT Authentication Middleware
 * Verifies JWT token and adds user data to request object
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return sendResponseWithData(
        res,
        ErrorCode.UNAUTHORIZED,
        "Access token required",
        null
      );
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Get user data
    const user = await User.findOne({
      where: { id: decoded.userId },
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return sendResponseWithData(
        res,
        ErrorCode.UNAUTHORIZED,
        "Invalid token - user not found",
        null
      );
    }
    
    // Check if user is active
    if (user.isActive === false) {
      return sendResponseWithData(
        res,
        ErrorCode.UNAUTHORIZED,
        "Account is deactivated",
        null
      );
    }
    
    // Add user data to request object
    req.user = user;
    req.token = token;
    req.userId = user.id;
    req.isSuperAdmin = user.isSuperAdmin;
    req.groupId = user.groupId;
    
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return sendResponseWithData(
        res,
        ErrorCode.UNAUTHORIZED,
        "Invalid token",
        null
      );
    } else if (err.name === 'TokenExpiredError') {
      return sendResponseWithData(
        res,
        ErrorCode.UNAUTHORIZED,
        "Token expired",
        null
      );
    }
    
    console.error("Authentication middleware error:", err);
    return sendResponseWithData(
      res,
      ErrorCode.REQUEST_FAILED,
      "Authentication failed",
      err
    );
  }
};

/**
 * Optional Authentication Middleware
 * Verifies JWT token if provided, but doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const user = await User.findOne({
          where: { id: decoded.userId },
          attributes: { exclude: ['password'] }
        });
        
        if (user && user.isActive !== false) {
          req.user = user;
          req.token = token;
          req.userId = user.id;
        }
      } catch (tokenError) {
        // Token is invalid, but we continue without authentication
        console.log("Optional auth: Invalid token provided");
      }
    }
    
    next();
  } catch (err) {
    console.error("Optional authentication middleware error:", err);
    next(); // Continue without authentication
  }
};

/**
 * Role-based Authorization Middleware
 * Checks if user has required role/permissions
 */
const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendResponseWithData(
        res,
        ErrorCode.UNAUTHORIZED,
        "Authentication required",
        null
      );
    }
    
    // Add your role checking logic here
    // For example, check user.role === requiredRole
    // or check user.permissions.includes(requiredRole)
    
    // For now, we'll just check if user exists and is authenticated
    next();
  };
};

/**
 * Group-based Authorization Middleware
 * Checks if user belongs to required group
 */
const requireGroup = (requiredGroupId) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendResponseWithData(
        res,
        ErrorCode.UNAUTHORIZED,
        "Authentication required",
        null
      );
    }
    
    if (req.user.groupId !== requiredGroupId) {
      return sendResponseWithData(
        res,
        ErrorCode.FORBIDDEN,
        "Access denied - insufficient permissions",
        null
      );
    }
    
    next();
  };
};

module.exports = {
  authenticateToken,
  authenticateSession,
  optionalAuth,
  requireRole,
  requireGroup
};

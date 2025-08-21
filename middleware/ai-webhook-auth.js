const constants = require('../config/constants');

/**
 * Middleware to authenticate AI webhook requests
 * Uses a secure token instead of JWT authentication
 */
const authenticateAIWebhook = (req, res, next) => {
  try {
    // Get token from headers (preferred) or query parameters
    const authToken = req.headers['x-ai-token'] || 
                     req.headers['authorization']?.replace('Bearer ', '') ||
                     req.query.token;

    if (!authToken) {
      return res.status(401).json({
        success: false,
        message: 'AI authentication token is required'
      });
    }

    // Verify the token matches the configured AI Agent token
    if (authToken !== constants.AI_AGENT.AUTH_TOKEN) {
      return res.status(403).json({
        success: false,
        message: 'Invalid AI authentication token'
      });
    }

    // Add AI Agent context to request
    req.aiAgent = {
      email: constants.AI_AGENT.EMAIL,
      firstName: constants.AI_AGENT.FIRST_NAME,
      lastName: constants.AI_AGENT.LAST_NAME,
      groupId: constants.AI_AGENT.GROUP_ID
    };

    next();
  } catch (error) {
    console.error('AI webhook authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication'
    });
  }
};

module.exports = { authenticateAIWebhook };

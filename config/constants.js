require("dotenv").config();
const c = {
  AI_AGENT: {
    EMAIL: "ai.agent@estrella.com",
    FIRST_NAME: "AI",
    LAST_NAME: "Agent",
    GROUP_ID: 1, // Default group ID for AI Agent
    AUTH_TOKEN: process.env.AI_AGENT_AUTH_TOKEN || "ai_agent_secure_token_2024"
  }
};
module.exports = c;

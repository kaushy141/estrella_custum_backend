const bcrypt = require('bcrypt');
const { sequelize } = require('../db');
const { User } = require('../models/user-model');
const { Group } = require('../models/group-model');
const constants = require('../config/constants');

async function createAIAgent() {
  try {
    // Check if AI Agent already exists
    const existingAgent = await User.findOne({
      where: { email: constants.AI_AGENT.EMAIL }
    });

    if (existingAgent) {
      console.log('AI Agent already exists with ID:', existingAgent.id);
      return existingAgent;
    }

    // Create default group if it doesn't exist
    let group = await Group.findByPk(constants.AI_AGENT.GROUP_ID);
    if (!group) {
      group = await Group.create({
        id: constants.AI_AGENT.GROUP_ID,
        guid: require('crypto').randomUUID(),
        name: 'AI Agent Group',
        description: 'Default group for AI Agent operations'
      });
      console.log('Created default group for AI Agent');
    }

    // Hash the AI Agent auth token as password
    const hashedPassword = await bcrypt.hash(constants.AI_AGENT.AUTH_TOKEN, 10);

    // Create AI Agent user
    const aiAgent = await User.create({
      guid: require('crypto').randomUUID(),
      groupId: group.id,
      firstName: constants.AI_AGENT.FIRST_NAME,
      lastName: constants.AI_AGENT.LAST_NAME,
      email: constants.AI_AGENT.EMAIL,
      password: hashedPassword,
      isAdmin: true,
      isActive: true
    });

    console.log('AI Agent created successfully with ID:', aiAgent.id);
    console.log('Email:', aiAgent.email);
    console.log('Group ID:', aiAgent.groupId);
    
    return aiAgent;
  } catch (error) {
    console.error('Error creating AI Agent:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createAIAgent()
    .then(() => {
      console.log('AI Agent setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('AI Agent setup failed:', error);
      process.exit(1);
    });
}

module.exports = { createAIAgent };

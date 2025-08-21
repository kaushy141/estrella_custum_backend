const bcrypt = require('bcrypt');
const { sequelize } = require('../db');
const { User } = require('../models/user-model');
const { Group } = require('../models/group-model');
const constants = require('../config/constants');

async function createAIAgent() {
  try {
    console.log('🚀 Creating AI Agent...\n');

    // Check if AI Agent already exists
    const existingAgent = await User.findOne({
      where: { email: constants.AI_AGENT.EMAIL }
    });

    if (existingAgent) {
      console.log('✅ AI Agent already exists with ID:', existingAgent.id);
      return existingAgent;
    }

    // Find or create default group
    let group = await Group.findOne({
      where: { name: 'AI Agent Group' }
    });

    if (!group) {
      console.log('📁 Creating default group for AI Agent...');
      group = await Group.create({
        guid: require('crypto').randomUUID(),
        name: 'AI Agent Group',
        description: 'Default group for AI Agent operations'
      });
      console.log('✅ Created default group with ID:', group.id);
    } else {
      console.log('✅ Found existing group with ID:', group.id);
    }

    // Hash the AI Agent auth token as password
    const hashedPassword = await bcrypt.hash(constants.AI_AGENT.AUTH_TOKEN, 10);

    // Create AI Agent user
    console.log('👤 Creating AI Agent user...');
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

    console.log('✅ AI Agent created successfully!');
    console.log(`   ID: ${aiAgent.id}`);
    console.log(`   Email: ${aiAgent.email}`);
    console.log(`   Group ID: ${aiAgent.groupId}`);
    console.log(`   Auth Token: ${constants.AI_AGENT.AUTH_TOKEN}`);
    
    return aiAgent;
  } catch (error) {
    console.error('❌ Error creating AI Agent:', error.message);
    
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      console.log('\n💡 Foreign key constraint error. This usually means:');
      console.log('   - The group table structure is different than expected');
      console.log('   - There are missing required fields');
      console.log('   - Database constraints are not properly set up');
    }
    
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createAIAgent()
    .then(() => {
      console.log('\n🎉 AI Agent setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 AI Agent setup failed:', error.message);
      process.exit(1);
    });
}

module.exports = { createAIAgent };

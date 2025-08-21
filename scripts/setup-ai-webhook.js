const { createAIAgent } = require('./create-ai-agent');
const constants = require('../config/constants');

async function setupAIWebhook() {
  try {
    console.log('🚀 Setting up AI Webhook System...\n');

    // Step 1: Create AI Agent user
    console.log('1. Creating AI Agent user...');
    const aiAgent = await createAIAgent();
    console.log('✅ AI Agent user created/verified successfully\n');

    // Step 2: Display configuration
    console.log('2. AI Webhook Configuration:');
    console.log(`   - AI Agent Email: ${constants.AI_AGENT.EMAIL}`);
    console.log(`   - AI Agent Name: ${constants.AI_AGENT.FIRST_NAME} ${constants.AI_AGENT.LAST_NAME}`);
    console.log(`   - Group ID: ${constants.AI_AGENT.GROUP_ID}`);
    console.log(`   - Auth Token: ${constants.AI_AGENT.AUTH_TOKEN}\n`);

    // Step 3: Display endpoints
    console.log('3. Available Webhook Endpoints:');
    console.log('   - POST /api/ai-webhook/invoice/update');
    console.log('   - POST /api/ai-webhook/invoice/bulk-update');
    console.log('   - POST /api/ai-webhook/courier-receipt/update');
    console.log('   - POST /api/ai-webhook/custom-clearance/update');
    console.log('   - POST /api/ai-webhook/custom-declaration/update');
    console.log('   - GET  /api/ai-webhook/health\n');

    // Step 4: Security information
    console.log('4. Security Information:');
    console.log('   - All endpoints require authentication via X-AI-Token header');
    console.log('   - Token can also be provided via Authorization header or query parameter');
    console.log('   - All activities are logged under AI Agent user');
    console.log('   - No JWT authentication required\n');

    // Step 5: Environment setup
    console.log('5. Environment Setup:');
    console.log('   - Add AI_AGENT_AUTH_TOKEN to your .env file for custom token');
    console.log('   - Default token will be used if not specified');
    console.log('   - Restart server after changing environment variables\n');

    // Step 6: Test instructions
    console.log('6. Testing the Webhook:');
    console.log('   - Use the health endpoint to verify service is running');
    console.log('   - Test with a sample invoice update request');
    console.log('   - Check activity logs for successful operations\n');

    console.log('🎉 AI Webhook System setup completed successfully!');
    console.log('\n📚 For detailed API documentation, see: AI_WEBHOOK_API.md');
    console.log('🔐 Keep your auth token secure and don\'t share it publicly');

  } catch (error) {
    console.error('❌ Error setting up AI Webhook System:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  setupAIWebhook()
    .then(() => {
      console.log('\n✨ Setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupAIWebhook };

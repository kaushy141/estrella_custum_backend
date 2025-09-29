/**
 * Test script for OpenAI Assistant Manager
 * This script tests the basic functionality without creating actual assistants
 */

const OpenAIAssistantManager = require('./openai-assistant-manager');
require('dotenv').config();

async function testAssistantManager() {
    console.log('🧪 Testing OpenAI Assistant Manager...\n');

    try {
        // Check if API key is configured
        if (!process.env.OPENAI_API_KEY) {
            console.log('⚠️  OPENAI_API_KEY not found in environment variables');
            console.log('This test will only validate the manager class structure\n');
        } else {
            console.log('✅ OpenAI API key found');
        }

        // Test 1: Create manager instance
        console.log('Test 1: Creating manager instance...');
        const manager = new OpenAIAssistantManager();
        console.log('✅ Manager instance created successfully\n');

        // Test 2: Test configuration file operations
        console.log('Test 2: Testing configuration file operations...');

        // Test loading config (should return null if no file exists)
        const config = await manager.loadAssistantConfig();
        console.log('✅ Configuration loading test passed:', config ? 'Config found' : 'No config file (expected)');

        // Test 3: Test environment file operations
        console.log('\nTest 3: Testing environment file operations...');

        // Test reading environment file
        try {
            const envPath = manager.envFilePath;
            console.log('✅ Environment file path resolved:', envPath);
        } catch (error) {
            console.log('⚠️  Environment file operations test:', error.message);
        }

        // Test 4: Test service status
        console.log('\nTest 4: Testing service integration...');
        const assistantManagerService = require('../services/openai-assistant-manager-service');

        const status = assistantManagerService.getStatus();
        console.log('✅ Service status retrieved:', status);

        // Test 5: Test refresh interval setting
        console.log('\nTest 5: Testing refresh interval configuration...');
        assistantManagerService.setRefreshInterval(3600000); // 1 hour
        const updatedStatus = assistantManagerService.getStatus();
        console.log('✅ Refresh interval updated:', updatedStatus.refreshInterval);

        // Reset to default
        assistantManagerService.setRefreshInterval(86400000); // 24 hours

        console.log('\n🎉 All tests passed successfully!');
        console.log('\n📋 Next steps:');
        console.log('1. Ensure your OpenAI API key is configured in .env');
        console.log('2. Run: node scripts/openai-assistant-manager.js list');
        console.log('3. Run: node scripts/openai-assistant-manager.js get-or-create');
        console.log('4. Test the API endpoints with your authentication token');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run tests
if (require.main === module) {
    testAssistantManager();
}

module.exports = { testAssistantManager };

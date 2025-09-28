/**
 * Setup OpenAI Assistant for Invoice Translation
 * This script creates an OpenAI Assistant specifically for invoice translation tasks
 */

const openAIService = require('../services/openai-service');
require('dotenv').config();

async function createInvoiceTranslationAssistant() {
    try {
        console.log('Creating OpenAI Assistant for Invoice Translation...');

        const assistantId = await openAIService.getAssistantId();
        const assistant = await openAIService.getAssistant(assistantId);

        console.log('✅ Assistant created successfully!');
        console.log('Assistant ID:', assistant.id);
        console.log('Assistant Name:', assistant.name);
        console.log('Model:', assistant.model);

        console.log('\n📋 Next Steps:');
        console.log('1. Add this Assistant ID to your .env file:');
        console.log(`   OPENAI_ASSISTANT_ID=${assistant.id}`);
        console.log('2. Restart your application to use the new assistant');
        console.log('3. Test the translation functionality');

        return assistant;

    } catch (error) {
        console.error('❌ Error creating assistant:', error);
        throw error;
    }
}

async function listExistingAssistants() {
    try {
        console.log('📋 Existing Assistants:');
        const assistants = await openAIService.listAssistants();

        if (assistants.length === 0) {
            console.log('No assistants found.');
        } else {
            assistants.forEach((assistant, index) => {
                console.log(`${index + 1}. ${assistant.name} (${assistant.id})`);
                console.log(`   Model: ${assistant.model}`);
                console.log(`   Created: ${new Date(assistant.created_at * 1000).toLocaleDateString()}`);
                console.log('');
            });
        }

        return assistants;
    } catch (error) {
        console.error('❌ Error listing assistants:', error);
        throw error;
    }
}

async function main() {
    try {
        console.log('🚀 OpenAI Assistant Setup\n');

        // Check if API key is configured
        if (!process.env.OPENAI_API_KEY) {
            console.error('❌ OPENAI_API_KEY not found in environment variables');
            console.log('Please add your OpenAI API key to the .env file');
            process.exit(1);
        }

        // List existing assistants
        await listExistingAssistants();

        // Create new assistant
        const assistant = await createInvoiceTranslationAssistant();

        console.log('\n🎉 Setup completed successfully!');

    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    }
}

// Run the setup
if (require.main === module) {
    main();
}

module.exports = {
    createInvoiceTranslationAssistant,
    listExistingAssistants
};

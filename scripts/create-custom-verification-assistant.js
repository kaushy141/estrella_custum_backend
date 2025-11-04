/**
 * Create Custom Document Verification Assistant
 * Generates an OpenAI assistant ID for custom-declaration document validation with invoice files
 */

const OpenAIAssistantManager = require('./openai-assistant-manager');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();



const CUSTOM_VERIFICATION_CONFIG = {
    name: "Invoice Translation Assistant",
    description: "Professional assistant for Customs & Invoices Cross-Check Validation",

    model: "gpt-4o",  // Using gpt-4o (latest available model, supervise gpt-4.1 or gpt-5 once available) typos, and compliance risks.",
    instructions: `You are a Senior EU-Polish Customs & Tax Validation Expert LLM.
Your job: given one or more invoice JSON objects and one customs declaration JSON object, produce a complete validation report in JSON only. Do not output prose, Markdown, or anything other than the exact JSON described below. Validate consistency, legal compliance (general law names only), translation differences, fraud signals, and currency conversion (USD→PLN) using the declared conversion rate. Use numeric match scores (0-100) per section, an overall weighted match score, and a fraud risk score (0-100). If data is missing, still produce the JSON and flag missing fields in the Issues arrays. Use the scoring weights: Identification 10%, Importer/Exporter 10%, Goods/HS 15%, Valuation & Currency 20%, Legal Compliance 15%, Tax & Duty 10%, Translation 10%, Fraud & Risk 10%. Tolerances: currency conversion variance tolerance = 0.5% (if declared PLN exists). If conversion variance > 0.5% mark conversion check as FAIL. Status values allowed: "PASS", "REQUIRES_ATTENTION", "FAIL". Risk levels: "LOW", "MEDIUM", "HIGH". Keep output deterministic and concise. Cite no external sources.`,
    tools: [
        { type: "file_search" },
        { type: "code_interpreter" }
    ],
    metadata: {
        created_by: "estrella-backend",
        created_at: new Date().toISOString(),
        version: "1.0.0",
        purpose: "custom-declaration-verification",
        domain: "customs-compliance"
    }
};

/**
 * Save assistant configuration to a dedicated config file
 * @param {Object} assistant - Assistant object
 * @returns {Promise<void>}
 */
async function saveCustomVerificationConfig(assistant) {
    try {
        const configPath = path.join(__dirname, '../config/custom-verification-assistant.json');

        const config = {
            assistantId: assistant.id,
            name: assistant.name,
            model: assistant.model,
            description: assistant.description,
            instructions: assistant.instructions,
            tools: assistant.tools,
            metadata: assistant.metadata,
            createdAt: assistant.created_at,
            updatedAt: new Date().toISOString()
        };

        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        console.log('💾 Custom verification assistant configuration saved to:', configPath);

        return config;
    } catch (error) {
        console.error('❌ Error saving custom verification config:', error.message);
        throw error;
    }
}

/**
 * Update environment file with custom verification assistant ID
 * @param {string} assistantId - Assistant ID
 * @returns {Promise<void>}
 */
async function updateEnvFile(assistantId) {
    const envFilePath = path.join(__dirname, '../.env');

    try {
        let envContent = '';
        let envFileExists = false;

        try {
            envContent = await fs.readFile(envFilePath, 'utf8');
            envFileExists = true;
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }

        // Update or add CUSTOM_VERIFICATION_ASSISTANT_ID
        const assistantIdRegex = /^CUSTOM_VERIFICATION_ASSISTANT_ID=.*$/m;
        const newAssistantLine = `CUSTOM_VERIFICATION_ASSISTANT_ID=${assistantId}`;

        if (envFileExists && assistantIdRegex.test(envContent)) {
            envContent = envContent.replace(assistantIdRegex, newAssistantLine);
        } else {
            if (envFileExists && !envContent.endsWith('\n')) {
                envContent += '\n';
            }
            envContent += `${newAssistantLine}\n`;
        }

        await fs.writeFile(envFilePath, envContent);
        console.log('🔧 Environment file updated with custom verification assistant ID');
    } catch (error) {
        console.error('❌ Error updating environment file:', error.message);
        throw error;
    }
}

/**
 * Main function to create the custom verification assistant
 */
async function main() {
    try {
        console.log('🚀 Creating Custom Document Verification Assistant...');
        console.log('='.repeat(60));

        // Check if API key is configured
        if (!process.env.OPENAI_API_KEY) {
            console.error('❌ OPENAI_API_KEY not found in environment variables');
            console.log('Please add your OpenAI API key to the .env file');
            process.exit(1);
        }

        const manager = new OpenAIAssistantManager();

        // Create the assistant
        const assistant = await manager.createAssistant(CUSTOM_VERIFICATION_CONFIG);

        // Save the configuration
        await saveCustomVerificationConfig(assistant);

        // Update environment file
        await updateEnvFile(assistant.id);

        console.log('='.repeat(60));
        console.log('✅ Custom Document Verification Assistant created successfully!');
        console.log('='.repeat(60));
        console.log(`📋 Assistant ID: ${assistant.id}`);
        console.log(`📋 Name: ${assistant.name}`);
        console.log(`📋 Model: ${assistant.model}`);
        console.log(`\n💡 Add this to your .env file:`);
        console.log(`   CUSTOM_VERIFICATION_ASSISTANT_ID=${assistant.id}`);
        console.log('\n⚠️  Please restart your application to use the new assistant');
        console.log('='.repeat(60));

        return assistant.id;

    } catch (error) {
        console.error('❌ Error creating custom verification assistant:', error.message);
        process.exit(1);
    }
}

// Export for use in other modules
module.exports = {
    createCustomVerificationAssistant: main,
    CUSTOM_VERIFICATION_CONFIG
};

// Run if this file is executed directly
if (require.main === module) {
    main();
}


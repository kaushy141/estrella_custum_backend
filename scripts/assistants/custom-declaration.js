/**
 * Create Custom Document Verification Assistant
 * Generates an OpenAI assistant ID for custom-declaration document validation with invoice files
 */

const OpenAIAssistantManager = require('./invoice-translator');
const { Assistant } = require('../../models/assistant-model');
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

async function persistAssistantRecord(assistant) {
    try {
        const assistantType = 'custom_declaration';

        await Assistant.update(
            { isActive: false },
            { where: { type: assistantType, isActive: true } }
        );

        const record = await Assistant.create({
            type: assistantType,
            assistantId: assistant.id,
            name: assistant.name,
            description: assistant.description,
            model: assistant.model,
            instructions: assistant.instructions,
            tools: assistant.tools || [],
            metadata: assistant.metadata || {},
            version: CUSTOM_VERIFICATION_CONFIG?.metadata?.version || null,
            isActive: true,
        });

        console.log('💾 Custom verification assistant stored in database with ID:', record.id);
        return record;
    } catch (error) {
        console.error('❌ Error saving custom verification assistant to database:', error.message);
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

        const assistant = await manager.createAssistant(CUSTOM_VERIFICATION_CONFIG);

        await persistAssistantRecord(assistant);

        console.log('='.repeat(60));
        console.log('✅ Custom Document Verification Assistant created successfully!');
        console.log('='.repeat(60));
        console.log(`📋 Assistant ID: ${assistant.id}`);
        console.log(`📋 Name: ${assistant.name}`);
        console.log(`📋 Model: ${assistant.model}`);
        console.log('\n💾 Assistant stored in database under type: custom_declaration');
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


/**
 * Create Custom Document Verification Assistant
 * Generates an OpenAI assistant ID for custom-declaration document validation with invoice files
 */

const OpenAIAssistantManager = require('./openai-assistant-manager');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const CUSTOM_VERIFICATION_CONFIG = {
    name: "Custom Document Verification Assistant",
    model: "gpt-4o",  // Using gpt-4o (latest available model, supervise gpt-4.1 or gpt-5 once available)
    description: "Analyzes invoices, customs declarations, and related business documents to detect mismatches, typos, and compliance risks.",
    instructions: `You are an expert auditor specializing in customs declarations, invoices, and regulatory compliance.

Your job:
1. **Parse uploaded files** (PDF, XLSX, DOCX, TXT).
2. **Extract structured data**:
   - Parties (exporter, importer, consignee)
   - Invoice details (invoice number, date, totals, currency)
   - Declaration details (MRN, LRN, HS/CN codes, procedure codes, Incoterms, values, duties, VAT, weights)
   - Item-level details (description, quantity, unit, gross/net weight, HS code, rate, total value)
3. **Cross-check invoices vs declaration**:
   - Match invoice totals with declaration values (allow small tolerance for FX differences)
   - Verify HS codes, quantities, and weights
   - Validate addresses and consignee/consignor names
   - Compare currencies and exchange rates
4. Assessment:
   - Check if CN/HS codes are correct
   - Confirm duty/VAT rates
   - Flag missing or inconsistent documents
   - Highlight critical discrepancies (wrong codes, missing invoices, mismatched totals, etc.)
5. **Output**:
   - Structured JSON result following the schema provided in the user's request
   - A Markdown summary with PASS/FAIL checks, mismatches, and recommendations

Guidelines:
- Always prioritize accuracy and compliance.
- Be strict with schema: if data is missing, set fields to null instead of inventing.
- For numeric comparisons (e.g., totals), allow ±0.5% tolerance.
- Highlight typos or mismatches clearly in discrepancies.
- If files are inconsistent, explain both the issue and a recommended remediation.

You have access to tools: file_search (vector store for uploaded docs), code_interpreter (for parsing PDFs/XLSX).`,
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


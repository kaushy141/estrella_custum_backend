/**
 * Setup OpenAI Assistant for Invoice Translation
 * This script creates an OpenAI Assistant specifically for invoice translation tasks
 */

const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function createInvoiceTranslationAssistant() {
    try {
        console.log('Creating OpenAI Assistant for Invoice Translation...');

        const assistant = await openai.beta.assistants.create({
            name: "Invoice Translation Assistant",
            description: "Professional assistant for translating invoices and comparing mismatches between original and translated invoices or between invoice and customs clearance documents.",
            model: "gpt-3.5-turbo",
            instructions: `You are a professional invoice translation assistant with expertise in:

1. **Invoice Translation**: Translate invoice data while maintaining original structure and formatting
2. **Currency Conversion**: Convert currency values to specified format while preserving numerical accuracy
3. **Document Comparison**: Compare information between original and translated invoices
4. **Customs Clearance**: Compare invoice data with customs clearance documents
5. **Mismatch Detection**: Identify discrepancies between different documents

**Key Responsibilities:**
- Preserve all numerical data, dates, and business information accurately
- Maintain professional formatting and structure
- Ensure currency values are properly converted
- Highlight any discrepancies or mismatches found
- Provide clear, professional translations suitable for business use

**Translation Guidelines:**
- Keep technical terms and business terminology accurate
- Maintain invoice numbering and reference formats
- Preserve tax calculations and financial data
- Use appropriate business language for the target market
- Ensure compliance with local business practices

**Comparison Guidelines:**
- Systematically compare each field between documents
- Highlight discrepancies in amounts, dates, descriptions
- Flag missing or additional information
- Provide clear summary of differences found
- Suggest resolution for identified mismatches

Always provide professional, accurate, and detailed responses suitable for business documentation.`,
            tools: [
                {
                    type: "code_interpreter"
                }
            ],
            temperature: 0.3,
            top_p: 1,
            max_completion_tokens: 2000,
            max_prompt_tokens: 4000
        });

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
        const assistants = await openai.beta.assistants.list();

        if (assistants.data.length === 0) {
            console.log('No assistants found.');
        } else {
            assistants.data.forEach((assistant, index) => {
                console.log(`${index + 1}. ${assistant.name} (${assistant.id})`);
                console.log(`   Model: ${assistant.model}`);
                console.log(`   Created: ${new Date(assistant.created_at * 1000).toLocaleDateString()}`);
                console.log('');
            });
        }

        return assistants.data;
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

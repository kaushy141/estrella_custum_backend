/**
 * OpenAI Assistant Manager
 * Dynamic assistant ID generation, refresh, and management system
 */

const fs = require('fs').promises;
const path = require('path');
const OpenAI = require('openai');
const { Assistant } = require('../../models/assistant-model');
require('dotenv').config();

class OpenAIAssistantManager {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
        this.envFilePath = path.join(__dirname, '../../.env');
        this.configFilePath = path.join(__dirname, '../../config/openai-assistant.json');
    }

    /**
     * Create a new OpenAI Assistant with custom configuration
     * @param {Object} config - Assistant configuration
     * @returns {Promise<Object>} - Created assistant object
     */
    async createAssistant(config = {}) {
        const defaultConfig = {
            name: "Invoice Translation Assistant",
            description: "Professional assistant for translating invoices and comparing mismatches between original and translated invoices",
            model: "gpt-4o-mini",
            instructions: `You are a professional invoice translation assistant with expertise in:

1. **Invoice Translation**: Translate invoice JSON data while maintaining original structure
2. **Currency Conversion**: Convert currency values to specified format while preserving numerical accuracy
3. **Document Comparison**: Compare information between original and translated invoices
4. **Customs Clearance**: Compare invoice data with customs clearance documents
5. **Mismatch Detection**: Identify discrepancies between different documents

**Key Responsibilities:**
- Maintain data integrity during translation
- Preserve numerical precision in financial calculations
- Ensure consistent formatting across translated documents
- Provide detailed comparison reports when requested
- Handle multiple languages and currencies accurately

**Output Format:**
Always respond with valid JSON format containing the requested data structure.`,
            tools: [],
            metadata: {
                created_by: "estrella-backend",
                created_at: new Date().toISOString(),
                version: "1.0.0"
            }
        };

        const assistantConfig = { ...defaultConfig, ...config };

        try {
            console.log('🤖 Creating new OpenAI Assistant...');
            const assistant = await this.openai.beta.assistants.create(assistantConfig);

            console.log('✅ Assistant created successfully!');
            console.log(`📋 Assistant ID: ${assistant.id}`);
            console.log(`📋 Name: ${assistant.name}`);
            console.log(`📋 Model: ${assistant.model}`);
            console.log(`📋 Created: ${new Date(assistant.created_at * 1000).toLocaleString()}`);

            return assistant;
        } catch (error) {
            console.error('❌ Error creating assistant:', error.message);
            throw error;
        }
    }

    /**
     * List all existing assistants
     * @returns {Promise<Array>} - Array of assistant objects
     */
    async listAssistants() {
        try {
            console.log('📋 Fetching existing assistants...');
            const response = await this.openai.beta.assistants.list({
                order: 'desc',
                limit: 100
            });

            const assistants = response.data;
            console.log(`Found ${assistants.length} assistant(s)`);

            assistants.forEach((assistant, index) => {
                console.log(`\n${index + 1}. ${assistant.name}`);
                console.log(`   ID: ${assistant.id}`);
                console.log(`   Model: ${assistant.model}`);
                console.log(`   Created: ${new Date(assistant.created_at * 1000).toLocaleString()}`);
                console.log(`   Tools: ${assistant.tools?.map(t => t.type).join(', ') || 'None'}`);
            });

            return assistants;
        } catch (error) {
            console.error('❌ Error listing assistants:', error.message);
            throw error;
        }
    }

    /**
     * Get assistant details by ID
     * @param {string} assistantId - Assistant ID
     * @returns {Promise<Object>} - Assistant object
     */
    async getAssistant(assistantId) {
        try {
            console.log(`🔍 Fetching assistant details for ID: ${assistantId}`);
            const assistant = await this.openai.beta.assistants.retrieve(assistantId);

            console.log('✅ Assistant details retrieved:');
            console.log(`📋 Name: ${assistant.name}`);
            console.log(`📋 Model: ${assistant.model}`);
            console.log(`📋 Created: ${new Date(assistant.created_at * 1000).toLocaleString()}`);
            console.log(`📋 Tools: ${assistant.tools?.map(t => t.type).join(', ') || 'None'}`);

            return assistant;
        } catch (error) {
            console.error('❌ Error retrieving assistant:', error.message);
            throw error;
        }
    }

    /**
     * Update an existing assistant
     * @param {string} assistantId - Assistant ID
     * @param {Object} updates - Updates to apply
     * @returns {Promise<Object>} - Updated assistant object
     */
    async updateAssistant(assistantId, updates) {
        try {
            console.log(`🔄 Updating assistant: ${assistantId}`);
            const assistant = await this.openai.beta.assistants.update(assistantId, updates);

            console.log('✅ Assistant updated successfully!');
            console.log(`📋 Updated Name: ${assistant.name}`);

            return assistant;
        } catch (error) {
            console.error('❌ Error updating assistant:', error.message);
            throw error;
        }
    }

    /**
     * Delete an assistant
     * @param {string} assistantId - Assistant ID
     * @returns {Promise<Object>} - Deletion confirmation
     */
    async deleteAssistant(assistantId) {
        try {
            console.log(`🗑️ Deleting assistant: ${assistantId}`);
            const result = await this.openai.beta.assistants.del(assistantId);

            console.log('✅ Assistant deleted successfully!');
            return result;
        } catch (error) {
            console.error('❌ Error deleting assistant:', error.message);
            throw error;
        }
    }

    /**
     * Save assistant configuration to file
     * @param {Object} assistant - Assistant object
     * @returns {Promise<void>}
     */
    async saveAssistantConfig(assistant) {
        try {
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

            await fs.writeFile(this.configFilePath, JSON.stringify(config, null, 2));
            console.log('💾 Assistant configuration saved to:', this.configFilePath);

            await this.persistAssistantRecord(assistant, 'invoice_translation');
        } catch (error) {
            console.error('❌ Error saving assistant config:', error.message);
            throw error;
        }
    }

    /**
     * Persist assistant metadata to database
     * @param {Object} assistant - Assistant object from OpenAI
     * @param {string} type - Assistant type key
     * @returns {Promise<Object>} - Persisted record
     */
    async persistAssistantRecord(assistant, type = 'invoice_translation') {
        try {
            await Assistant.update(
                { isActive: false },
                { where: { type, isActive: true } }
            );

            const record = await Assistant.create({
                type,
                assistantId: assistant.id,
                name: assistant.name,
                description: assistant.description,
                model: assistant.model,
                instructions: assistant.instructions,
                tools: assistant.tools || [],
                metadata: assistant.metadata || {},
                version: assistant.metadata?.version || null,
                isActive: true,
            });

            console.log(`💾 Assistant stored in database under type: ${type} (record id: ${record.id})`);
            return record;
        } catch (error) {
            console.error('❌ Error persisting assistant to database:', error.message);
            throw error;
        }
    }

    /**
     * Load assistant configuration from file
     * @returns {Promise<Object|null>} - Assistant configuration or null
     */
    async loadAssistantConfig() {
        try {
            const data = await fs.readFile(this.configFilePath, 'utf8');
            const config = JSON.parse(data);
            console.log('📂 Assistant configuration loaded from file');
            return config;
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('📂 No assistant configuration file found');
                return null;
            }
            console.error('❌ Error loading assistant config:', error.message);
            throw error;
        }
    }

    /**
     * Update environment file with new assistant ID
     * @param {string} assistantId - New assistant ID
     * @returns {Promise<void>}
     */
    async updateEnvFile(assistantId) {
        try {
            let envContent = '';
            let envFileExists = false;

            try {
                envContent = await fs.readFile(this.envFilePath, 'utf8');
                envFileExists = true;
            } catch (error) {
                if (error.code !== 'ENOENT') throw error;
            }

            // Update or add OPENAI_ASSISTANT_ID
            const assistantIdRegex = /^OPENAI_ASSISTANT_ID=.*$/m;
            const newAssistantLine = `OPENAI_ASSISTANT_ID=${assistantId}`;

            if (envFileExists && assistantIdRegex.test(envContent)) {
                envContent = envContent.replace(assistantIdRegex, newAssistantLine);
            } else {
                if (envFileExists && !envContent.endsWith('\n')) {
                    envContent += '\n';
                }
                envContent += `${newAssistantLine}\n`;
            }

            await fs.writeFile(this.envFilePath, envContent);
            console.log('🔧 Environment file updated with new assistant ID');
        } catch (error) {
            console.error('❌ Error updating environment file:', error.message);
            throw error;
        }
    }

    /**
     * Refresh assistant ID (create new one and update config)
     * @param {Object} config - Optional configuration for new assistant
     * @returns {Promise<string>} - New assistant ID
     */
    async refreshAssistantId(config = {}) {
        try {
            console.log('🔄 Refreshing OpenAI Assistant ID...');

            // Create new assistant
            const newAssistant = await this.createAssistant(config);

            // Save configuration
            await this.saveAssistantConfig(newAssistant);

            // Update environment file
            await this.updateEnvFile(newAssistant.id);

            console.log('🎉 Assistant ID refreshed successfully!');
            console.log('📋 New Assistant ID:', newAssistant.id);
            console.log('⚠️  Please restart your application to use the new assistant');

            return newAssistant.id;
        } catch (error) {
            console.error('❌ Error refreshing assistant ID:', error.message);
            throw error;
        }
    }

    /**
     * Get or create assistant ID dynamically
     * @param {boolean} forceRefresh - Force creation of new assistant
     * @returns {Promise<string>} - Assistant ID
     */
    async getOrCreateAssistantId(forceRefresh = false) {
        try {
            // Check if force refresh is requested
            if (forceRefresh) {
                return await this.refreshAssistantId();
            }

            // Check environment variable first
            let assistantId = process.env.OPENAI_ASSISTANT_ID;
            if (assistantId && assistantId !== 'your_openai_assistant_id_here') {
                console.log('📋 Using existing assistant ID from environment:', assistantId);

                // Verify the assistant still exists
                try {
                    await this.getAssistant(assistantId);
                    return assistantId;
                } catch (error) {
                    console.log('⚠️  Assistant ID from environment is invalid, creating new one...');
                    return await this.refreshAssistantId();
                }
            }

            // Check configuration file
            const config = await this.loadAssistantConfig();
            if (config && config.assistantId) {
                console.log('📂 Using assistant ID from configuration file:', config.assistantId);

                // Verify the assistant still exists
                try {
                    await this.getAssistant(config.assistantId);
                    // Update environment file with the working ID
                    await this.updateEnvFile(config.assistantId);
                    return config.assistantId;
                } catch (error) {
                    console.log('⚠️  Assistant ID from config file is invalid, creating new one...');
                    return await this.refreshAssistantId();
                }
            }

            // Create new assistant if none exists
            console.log('🆕 No valid assistant ID found, creating new assistant...');
            return await this.refreshAssistantId();

        } catch (error) {
            console.error('❌ Error getting or creating assistant ID:', error.message);
            throw error;
        }
    }

    /**
     * Cleanup old assistants (keep only the latest N assistants)
     * @param {number} keepCount - Number of assistants to keep
     * @returns {Promise<Array>} - Array of deleted assistant IDs
     */
    async cleanupOldAssistants(keepCount = 5) {
        try {
            console.log(`🧹 Cleaning up old assistants (keeping latest ${keepCount})...`);

            const assistants = await this.listAssistants();

            if (assistants.length <= keepCount) {
                console.log('✅ No cleanup needed, assistant count is within limit');
                return [];
            }

            const assistantsToDelete = assistants.slice(keepCount);
            const deletedIds = [];

            for (const assistant of assistantsToDelete) {
                try {
                    await this.deleteAssistant(assistant.id);
                    deletedIds.push(assistant.id);
                } catch (error) {
                    console.error(`❌ Failed to delete assistant ${assistant.id}:`, error.message);
                }
            }

            console.log(`✅ Cleanup completed, deleted ${deletedIds.length} assistant(s)`);
            return deletedIds;

        } catch (error) {
            console.error('❌ Error during cleanup:', error.message);
            throw error;
        }
    }
}

// CLI Interface
async function main() {
    const manager = new OpenAIAssistantManager();
    const args = process.argv.slice(2);
    const command = args[0];

    try {
        // Check if API key is configured
        if (!process.env.OPENAI_API_KEY) {
            console.error('❌ OPENAI_API_KEY not found in environment variables');
            console.log('Please add your OpenAI API key to the .env file');
            process.exit(1);
        }

        switch (command) {
            case 'create':
                const assistant = await manager.createAssistant();
                await manager.saveAssistantConfig(assistant);
                await manager.updateEnvFile(assistant.id);
                break;

            case 'list':
                await manager.listAssistants();
                break;

            case 'get':
                const assistantId = args[1];
                if (!assistantId) {
                    console.error('❌ Please provide assistant ID: node openai-assistant-manager.js get <assistant_id>');
                    process.exit(1);
                }
                await manager.getAssistant(assistantId);
                break;

            case 'refresh':
                await manager.refreshAssistantId();
                break;

            case 'get-or-create':
                const forceRefresh = args.includes('--force');
                const id = await manager.getOrCreateAssistantId(forceRefresh);
                console.log('🎯 Final Assistant ID:', id);
                break;

            case 'cleanup':
                const keepCount = parseInt(args[1]) || 5;
                await manager.cleanupOldAssistants(keepCount);
                break;

            default:
                console.log(`
🤖 OpenAI Assistant Manager

Usage: node openai-assistant-manager.js <command> [options]

Commands:
  create              Create a new assistant and save configuration
  list                List all existing assistants
  get <id>            Get details for a specific assistant
  refresh             Create new assistant and update configuration
  get-or-create       Get existing or create new assistant ID
    --force           Force creation of new assistant
  cleanup [count]     Delete old assistants (default: keep 5)

Examples:
  node openai-assistant-manager.js create
  node openai-assistant-manager.js list
  node openai-assistant-manager.js get asst_abc123
  node openai-assistant-manager.js refresh
  node openai-assistant-manager.js get-or-create
  node openai-assistant-manager.js get-or-create --force
  node openai-assistant-manager.js cleanup 3
                `);
        }

    } catch (error) {
        console.error('❌ Command failed:', error.message);
        process.exit(1);
    }
}

// Export for use in other modules
module.exports = OpenAIAssistantManager;

// Run CLI if this file is executed directly
if (require.main === module) {
    main();
}

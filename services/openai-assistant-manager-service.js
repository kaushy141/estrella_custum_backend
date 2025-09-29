/**
 * OpenAI Assistant Manager Service
 * Service layer for dynamic assistant ID management
 */

const OpenAIAssistantManager = require('../scripts/openai-assistant-manager');
const path = require('path');

class OpenAIAssistantManagerService {
    constructor() {
        this.manager = new OpenAIAssistantManager();
        this.assistantId = null;
        this.lastRefresh = null;
        this.refreshInterval = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    }

    /**
     * Get current assistant ID, refresh if needed
     * @param {boolean} forceRefresh - Force refresh of assistant ID
     * @returns {Promise<string>} - Current assistant ID
     */
    async getCurrentAssistantId(forceRefresh = false) {
        try {
            const now = Date.now();

            // Check if we need to refresh based on time interval
            const needsRefresh = forceRefresh ||
                !this.assistantId ||
                !this.lastRefresh ||
                (now - this.lastRefresh) > this.refreshInterval;

            if (needsRefresh) {
                console.log('🔄 Refreshing assistant ID...');
                this.assistantId = await this.manager.getOrCreateAssistantId(forceRefresh);
                this.lastRefresh = now;
                console.log('✅ Assistant ID refreshed:', this.assistantId);
            }

            return this.assistantId;
        } catch (error) {
            console.error('❌ Error getting current assistant ID:', error);
            throw error;
        }
    }

    /**
     * Initialize the assistant manager service
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            console.log('🚀 Initializing OpenAI Assistant Manager Service...');

            // Get initial assistant ID
            this.assistantId = await this.manager.getOrCreateAssistantId();
            this.lastRefresh = Date.now();

            console.log('✅ Assistant Manager Service initialized');
            console.log('📋 Current Assistant ID:', this.assistantId);

            return this.assistantId;
        } catch (error) {
            console.error('❌ Error initializing assistant manager service:', error);
            throw error;
        }
    }

    /**
     * Refresh assistant ID manually
     * @param {Object} config - Optional configuration for new assistant
     * @returns {Promise<string>} - New assistant ID
     */
    async refreshAssistantId(config = {}) {
        try {
            console.log('🔄 Manual refresh of assistant ID...');

            this.assistantId = await this.manager.refreshAssistantId(config);
            this.lastRefresh = Date.now();

            console.log('✅ Assistant ID refreshed manually:', this.assistantId);
            return this.assistantId;
        } catch (error) {
            console.error('❌ Error refreshing assistant ID:', error);
            throw error;
        }
    }

    /**
     * Get assistant details
     * @param {string} assistantId - Optional assistant ID, uses current if not provided
     * @returns {Promise<Object>} - Assistant details
     */
    async getAssistantDetails(assistantId = null) {
        try {
            const id = assistantId || await this.getCurrentAssistantId();
            return await this.manager.getAssistant(id);
        } catch (error) {
            console.error('❌ Error getting assistant details:', error);
            throw error;
        }
    }

    /**
     * List all assistants
     * @returns {Promise<Array>} - Array of assistants
     */
    async listAllAssistants() {
        try {
            return await this.manager.listAssistants();
        } catch (error) {
            console.error('❌ Error listing assistants:', error);
            throw error;
        }
    }

    /**
     * Update assistant configuration
     * @param {string} assistantId - Assistant ID to update
     * @param {Object} updates - Updates to apply
     * @returns {Promise<Object>} - Updated assistant
     */
    async updateAssistant(assistantId, updates) {
        try {
            const updatedAssistant = await this.manager.updateAssistant(assistantId, updates);

            // If we updated the current assistant, refresh our cache
            if (assistantId === this.assistantId) {
                this.lastRefresh = Date.now();
            }

            return updatedAssistant;
        } catch (error) {
            console.error('❌ Error updating assistant:', error);
            throw error;
        }
    }

    /**
     * Delete an assistant
     * @param {string} assistantId - Assistant ID to delete
     * @returns {Promise<Object>} - Deletion result
     */
    async deleteAssistant(assistantId) {
        try {
            const result = await this.manager.deleteAssistant(assistantId);

            // If we deleted the current assistant, reset our cache
            if (assistantId === this.assistantId) {
                this.assistantId = null;
                this.lastRefresh = null;
            }

            return result;
        } catch (error) {
            console.error('❌ Error deleting assistant:', error);
            throw error;
        }
    }

    /**
     * Cleanup old assistants
     * @param {number} keepCount - Number of assistants to keep
     * @returns {Promise<Array>} - Array of deleted assistant IDs
     */
    async cleanupOldAssistants(keepCount = 5) {
        try {
            return await this.manager.cleanupOldAssistants(keepCount);
        } catch (error) {
            console.error('❌ Error cleaning up assistants:', error);
            throw error;
        }
    }

    /**
     * Get service status
     * @returns {Object} - Service status information
     */
    getStatus() {
        return {
            assistantId: this.assistantId,
            lastRefresh: this.lastRefresh ? new Date(this.lastRefresh).toISOString() : null,
            refreshInterval: this.refreshInterval,
            needsRefresh: this.lastRefresh ? (Date.now() - this.lastRefresh) > this.refreshInterval : true
        };
    }

    /**
     * Set refresh interval
     * @param {number} intervalMs - Refresh interval in milliseconds
     */
    setRefreshInterval(intervalMs) {
        this.refreshInterval = intervalMs;
        console.log(`🕐 Refresh interval set to ${intervalMs}ms (${intervalMs / (1000 * 60 * 60)} hours)`);
    }
}

// Create singleton instance
const assistantManagerService = new OpenAIAssistantManagerService();

module.exports = assistantManagerService;

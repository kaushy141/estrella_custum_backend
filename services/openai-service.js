const OpenAI = require('openai');
const { toFile } = require('openai');
const { CustomDeclaration } = require('../models/custom-declaration-model');
const { Assistant } = require('../models/assistant-model');
const path = require('path');
const _ = require('lodash');
const fsPromises = require('fs/promises');
const pdfParse = require('pdf-parse');
const { CourierReceipt } = require('../models/courier-receipt-model');
require('dotenv').config();

class OpenAIService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        this.assistantCache = new Map();
    }

    /**
     * Normalize assistant type aliases
     * @param {string} type
     * @returns {string}
     */
    resolveAssistantType(type = 'invoice') {
        console.log(`Resolving assistant type: ${type}`);
        const normalized = (type || '').toString().trim().toLowerCase();
        const aliasMap = {
            invoice: 'invoice_translation',
            translation: 'invoice_translation',
            'invoice-translation': 'invoice_translation',
            invoice_translation: 'invoice_translation',
            'custom-declaration': 'custom_declaration',
            customs: 'custom_declaration',
            custom: 'custom_declaration',
            custom_declaration: 'custom_declaration',
            courier: 'courier_shipment',
            'courier-shipment': 'courier_shipment',
            courier_receipt: 'courier_shipment',
            courier_shipment: 'courier_shipment',
        };

        return aliasMap[normalized] || normalized || 'invoice_translation';
    }

    /**
     * Fetch assistant record for a specific task
     * @param {string} type
     * @param {{ refresh?: boolean }} options
     * @returns {Promise<Assistant>}
     */
    async getAssistantForTask(type = 'invoice', options = {}) {
        const normalizedType = this.resolveAssistantType(type);
        const refresh = options.refresh === true;

        if (!refresh && this.assistantCache.has(normalizedType)) {
            return this.assistantCache.get(normalizedType);
        }

        const assistant = await Assistant.findOne({
            where: { type: normalizedType, isActive: true },
            order: [['createdAt', 'DESC']],
        });

        if (!assistant) {
            throw new Error(
                `No active assistant found for type '${normalizedType}'. Please run the corresponding assistant provisioning script.`
            );
        }

        this.assistantCache.set(normalizedType, assistant);
        return assistant;
    }

    /**
     * Clear cached assistant for a specific type
     * @param {string} type
     */
    invalidateAssistantCache(type) {
        const normalizedType = this.resolveAssistantType(type);
        this.assistantCache.delete(normalizedType);
    }

    /**
     * Get or create OpenAI Assistant ID
     * @returns {Promise<string>} - Assistant ID
     */
    async getAssistantId(type = 'invoice') {
        const assistant = await this.getAssistantForTask(type);
        console.log(`Using assistant '${assistant.name}' (${assistant.assistantId}) for type '${assistant.type}'`);
        return assistant.assistantId;
    }

    /**
     * Create a new OpenAI thread
     * @returns {Promise<string>} - Thread ID
     */
    async createThread() {
        try {
            const thread = await this.openai.beta.threads.create();
            console.log(`New OpenAI thread created: ${thread.id}`);
            return thread.id;
        } catch (error) {
            console.error('Error creating OpenAI thread:', error);
            throw new Error(`Failed to create OpenAI thread: ${error.message}`);
        }
    }

    /**
     * Ensure we have a usable thread ID. Creates (and optionally persists) a new one when absent.
     * @param {Object} project - Project instance to persist thread ID on (optional)
     * @param {string} threadId - Candidate thread ID
     * @returns {Promise<string>}
     */
    async ensureThreadId(project, threadId) {
        if (threadId && typeof threadId === 'string') {
            return threadId;
        }

        if (project?.aiConversation && typeof project.aiConversation === 'string') {
            return project.aiConversation;
        }

        const newThreadId = await this.createThread();

        if (project && typeof project.update === 'function') {
            try {
                await project.update({ aiConversation: newThreadId });
            } catch (error) {
                console.warn(`⚠️  Failed to persist new thread ID for project ${project.id || ''}: ${error.message}`);
            }
        }

        return newThreadId;
    }


    /**
     * Create a run for a thread
     * @param {string} threadId - OpenAI thread ID
     * @param {string} instructions - Instructions for the run
     * @returns {Promise<Object>} - Run object
     */
    async createRun(threadId, instructions, type = 'invoice', options = {}) {
        try {
            // Validate parameters
            if (!threadId || typeof threadId !== 'string') {
                throw new Error(`Invalid threadId: ${threadId}. Expected a valid string.`);
            }
            if (!instructions || typeof instructions !== 'string') {
                throw new Error(`Invalid instructions: ${instructions}. Expected a valid string.`);
            }

            // Get assistant ID
            const assistantId = await this.getAssistantId(type);
            console.log(`Using assistant ID: ${assistantId}`);

            // Prepare run parameters
            const runParams = {
                assistant_id: assistantId,
                instructions: instructions
            };

            // Add response_format if specified (for JSON mode)
            if (options.responseFormat) {
                runParams.response_format = options.responseFormat;
                console.log('Using response_format:', options.responseFormat);
            }

            if (typeof options.temperature === 'number') {
                runParams.temperature = options.temperature;
                console.log('Using temperature:', options.temperature);
            }

            // Create a run to process the message with retry logic
            let run;
            let retryCount = 0;
            const maxRetries = 3;

            while (retryCount < maxRetries) {
                try {
                    run = await this.openai.beta.threads.runs.create(threadId, runParams);
                    console.log(`✅ Created run: ${run.id} for thread: ${threadId}`);
                    break; // Success, exit retry loop
                } catch (runError) {
                    retryCount++;
                    console.log(`❌ Run creation attempt ${retryCount} failed:`, runError.message);

                    if (runError.message.includes('already has an active run')) {
                        if (retryCount < maxRetries) {
                            console.log(`⏳ Waiting 5 seconds before retry ${retryCount + 1}/${maxRetries}...`);
                            await new Promise(resolve => setTimeout(resolve, 5000));
                        } else {
                            console.error(`❌ Failed to create run after ${maxRetries} attempts`);
                            throw new Error(`Unable to create run: Thread ${threadId} has persistent active runs. Please try again later.`);
                        }
                    } else {
                        // Non-retryable error, throw immediately
                        throw runError;
                    }
                }
            }

            // Validate run object
            if (!run || !run.id) {
                throw new Error(`Invalid run object returned: ${JSON.stringify(run)}`);
            }

            return run;

        } catch (error) {
            console.error('❌ Error creating run:', error);

            // Handle specific OpenAI errors
            if (error.status === 400 && error.message.includes('already has an active run')) {
                console.log(`🔄 Thread ${threadId} has an active run. Attempting to handle gracefully...`);

                // Try to get the existing active run and wait for it
                try {
                    const existingRuns = await this.openai.beta.threads.runs.list(threadId);
                    const activeRun = existingRuns.data.find(run =>
                        run.status === 'queued' || run.status === 'in_progress'
                    );

                    if (activeRun) {
                        console.log(`⏳ Waiting for existing active run ${activeRun.id} to complete...`);
                        const runStatus = await this.waitForRunCompletion(threadId, activeRun.id);

                        if (runStatus.status === 'completed') {
                            console.log(`✅ Existing run completed. Creating new run...`);
                            // Retry creating the run
                            return await this.createRun(threadId, instructions, type, options);
                        } else {
                            throw new Error(`Existing run ${activeRun.id} failed with status: ${runStatus.status}`);
                        }
                    }
                } catch (retryError) {
                    console.error('❌ Failed to handle existing active run:', retryError.message);
                }
            }

            throw new Error(`Failed to create run: ${error.message}`);
        }
    }

    /**
     * Wait for a run to complete
     * @param {string} threadId - OpenAI thread ID
     * @param {string} runId - Run ID
     * @returns {Promise<Object>} - Final run status
     */
    async waitForRunCompletion(threadId, runId) {
        try {
            // Validate parameters
            if (!threadId || typeof threadId !== 'string') {
                throw new Error(`Invalid threadId: ${threadId}. Expected a valid string.`);
            }
            if (!runId || typeof runId !== 'string') {
                throw new Error(`Invalid runId: ${runId}. Expected a valid string.`);
            }

            console.log(`Waiting for run completion - Thread: ${threadId}, Run: ${runId}`);
            console.log(`threadId type: ${typeof threadId}, value: ${threadId}`);
            console.log(`runId type: ${typeof runId}, value: ${runId}`);

            let runStatus = await this.openai.beta.threads.runs.retrieve(runId, { thread_id: threadId });
            console.log(`Run ${runId} started with status: ${runStatus.status}`);

            while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
                runStatus = await this.openai.beta.threads.runs.retrieve(runId, { thread_id: threadId });
                console.log(`Run ${runId} status: ${runStatus.status}`);
            }

            console.log(`Final run status: ${runStatus.status}`);

            // Log detailed error information if run failed
            if (runStatus.status === 'failed') {
                console.error('❌ Run failed with detailed error information:');
                console.error('Last error:', JSON.stringify(runStatus.last_error, null, 2));
                console.error('Full run status:', JSON.stringify(runStatus, null, 2));
            }

            return runStatus;

        } catch (error) {
            console.error('Error waiting for run completion:', error);
            throw new Error(`Failed to wait for run completion: ${error.message}`);
        }
    }

    /**
     * Get messages from a thread
     * @param {string} threadId - OpenAI thread ID
     * @returns {Promise<Array>} - Messages array
     */
    async getThreadMessages(threadId) {
        try {
            const messages = await this.openai.beta.threads.messages.list(threadId);
            console.log(`Found ${messages.data.length} messages in thread`);

            if (messages.data.length === 0) {
                throw new Error('No messages found in thread');
            }

            return messages.data;

        } catch (error) {
            console.error('Error getting thread messages:', error);
            throw new Error(`Failed to get thread messages: ${error.message}`);
        }
    }

    /**
     * Extract JSON from AI response text
     * @param {string} responseText - Raw response text from AI
     * @returns {Object|null} - Parsed JSON object or null if not found
     */
    extractJsonFromResponse(responseText) {
        try {
            // Trim whitespace first
            const trimmedText = responseText.trim();

            // First try direct parsing
            return JSON.parse(trimmedText);
        } catch (error) {
            // Log the error for debugging
            console.log('JSON parsing failed, attempting pattern extraction...');
            console.log('Response text (first 500 chars):', responseText.substring(0, 500));

            // Try to find JSON in the response using various patterns
            const jsonPatterns = [
                /```json\s*(\{[\s\S]*?\})\s*```/i,  // Match JSON in ```json``` code blocks
                /```\s*(\{[\s\S]*?\})\s*```/i,      // Match JSON in generic code blocks
                /\{[\s\S]*\}/,                      // Match any object-like structure (greedy)
            ];

            for (const pattern of jsonPatterns) {
                const match = responseText.match(pattern);
                if (match) {
                    try {
                        const jsonStr = match[1] || match[0];
                        console.log('Extracted JSON string (first 200 chars):', jsonStr.substring(0, 200));
                        return JSON.parse(jsonStr);
                    } catch (parseError) {
                        console.log(`Pattern failed: ${parseError.message}`);
                        continue; // Try next pattern
                    }
                }
            }

            console.error('Failed to extract JSON from response');
            return null; // No valid JSON found
        }
    }

    /**
     * Check if file type is supported for OpenAI file search
     * @param {string} fileName - Name of the file
     * @returns {boolean} - True if file type is supported
     */
    isFileTypeSupportedForSearch(fileName) {
        const path = require('path');
        const fileExtension = path.extname(fileName).toLowerCase();

        // List of file types supported by OpenAI file search
        // NOTE: .xlsx and .xls are NOT supported by file_search, only by code_interpreter
        const supportedFileTypes = [
            '.pdf', '.txt', '.docx', '.doc', '.csv', '.json',
            '.md', '.html', '.htm', '.rtf', '.odt'
        ];

        return supportedFileTypes.includes(fileExtension);
    }

    /**
     * Upload file to OpenAI with comprehensive error handling and retry logic
     * @param {string} filePath - Path to the file
     * @param {string} fileName - Name of the file
     * @param {Object} options - Upload options
     * @returns {Promise<Object>} - Uploaded file object
     */
    async uploadFile(filePath, fileName, options = {}) {
        const {
            maxRetries = 3,
            retryDelay = 2000,
            chunkSize = 1024 * 1024, // 1MB chunks for large files
            validateFile = true,
            timeout = 300000 // 5 minutes timeout
        } = options;

        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Upload attempt ${attempt}/${maxRetries} for file: ${fileName}`);

                // Comprehensive file validation
                if (validateFile) {
                    await this.validateFile(filePath, fileName);
                }

                // Upload with appropriate method based on file size
                const uploadedFile = await this.performUpload(filePath, fileName, chunkSize, timeout);

                console.log(`✅ File uploaded successfully on attempt ${attempt}`);
                console.log(`File ID: ${uploadedFile.id}`);
                console.log(`File details: ${uploadedFile.filename} (${uploadedFile.bytes} bytes)`);

                return uploadedFile;

            } catch (error) {
                lastError = error;
                console.error(`❌ Upload attempt ${attempt} failed:`, error.message);

                // Don't retry for certain errors
                if (this.isNonRetryableError(error)) {
                    throw this.formatError(error, filePath, fileName);
                }

                // Wait before retry (exponential backoff)
                if (attempt < maxRetries) {
                    const delay = retryDelay * Math.pow(2, attempt - 1);
                    console.log(`⏳ Waiting ${delay}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        // All retries failed
        console.error(`❌ All ${maxRetries} upload attempts failed for file: ${fileName}`);
        throw this.formatError(lastError, filePath, fileName);
    }

    /**
     * Comprehensive file validation
     * @param {string} filePath - Path to the file
     * @param {string} fileName - Name of the file
     */
    async validateFile(filePath, fileName) {
        const fs = require('fs').promises;
        const path = require('path');

        // Check if file exists
        try {
            await fs.access(filePath);
        } catch (error) {
            throw new Error(`File not found: ${filePath}`);
        }

        // Get file stats
        const stats = await fs.stat(filePath);

        // Check file size
        const fileSizeInMB = stats.size / (1024 * 1024);
        const maxSizeInMB = 512; // OpenAI's limit

        if (fileSizeInMB > maxSizeInMB) {
            throw new Error(`File too large: ${fileSizeInMB.toFixed(2)} MB. Maximum allowed: ${maxSizeInMB} MB`);
        }

        // Check if file is empty
        if (stats.size === 0) {
            throw new Error(`File is empty: ${fileName}`);
        }

        // Validate file extension
        const fileExtension = path.extname(fileName).toLowerCase();
        const supportedExtensions = [
            '.pdf', '.txt', '.csv', '.json', '.xlsx', '.xls',
            '.docx', '.doc', '.png', '.jpg', '.jpeg', '.gif', '.webp'
        ];

        if (!supportedExtensions.includes(fileExtension)) {
            console.warn(`⚠️ File extension ${fileExtension} may not be supported by OpenAI`);
        }

        // Check file permissions
        try {
            await fs.readFile(filePath, { flag: 'r' });
        } catch (error) {
            throw new Error(`Permission denied accessing file: ${filePath}`);
        }

        console.log(`✅ File validation passed: ${fileName} (${fileSizeInMB.toFixed(2)} MB)`);
    }

    /**
     * Attempt to extract searchable text from a courier receipt document
     * @param {Object} courierReceipt
     * @returns {Promise<string>}
     */
    async getCourierReceiptDocumentText(courierReceipt) {
        if (!courierReceipt || !courierReceipt.filePath) {
            return '';
        }

        try {
            const absolutePath = path.join(__dirname, '..', courierReceipt.filePath);
            const fileBuffer = await fsPromises.readFile(absolutePath);
            const parsed = await pdfParse(fileBuffer);
            const text = parsed?.text || '';

            return text
                .replace(/\r\n/g, '\n')
                .replace(/\r/g, '\n')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
        } catch (error) {
            console.warn(`⚠️  Failed to extract text from courier receipt ${courierReceipt.id || ''}: ${error.message}`);
            return '';
        }
    }

    /**
     * Perform the actual file upload with appropriate method
     * @param {string} filePath - Path to the file
     * @param {string} fileName - Name of the file
     * @param {number} chunkSize - Chunk size for large files
     * @param {number} timeout - Request timeout
     * @returns {Promise<Object>} - Uploaded file object
     */
    async performUpload(filePath, fileName, chunkSize, timeout) {
        const fs = require('fs').promises;
        const path = require('path');

        const stats = await fs.stat(filePath);
        const fileSizeInMB = stats.size / (1024 * 1024);
        const fileExtension = path.extname(fileName).toLowerCase();

        // Use fs.createReadStream for all files (recommended by OpenAI)
        return await this.uploadWithStream(filePath, fileName, timeout);
    }


    /**
     * Upload file using fs.createReadStream (unified method)
     * @param {string} filePath - Path to the file
     * @param {string} fileName - Name of the file
     * @param {number} timeout - Request timeout
     * @returns {Promise<Object>} - Uploaded file object
     */
    async uploadWithStream(filePath, fileName, timeout) {
        const fs = require('fs');

        console.log(`📤 Uploading file using fs.createReadStream: ${fileName}`);

        // Use fs.createReadStream as recommended by OpenAI for all files
        const fileStream = fs.createReadStream(filePath);

        // Upload with timeout
        const uploadPromise = this.openai.files.create({
            file: fileStream,
            purpose: 'assistants'
        });

        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Upload timeout')), timeout);
        });

        return await Promise.race([uploadPromise, timeoutPromise]);
    }

    /**
     * Check if error is non-retryable
     * @param {Error} error - Error object
     * @returns {boolean} - True if error should not be retried
     */
    isNonRetryableError(error) {
        const nonRetryableCodes = ['ENOENT', 'EACCES', 'EISDIR'];
        const nonRetryableStatuses = [400, 401, 403, 404, 413];

        return nonRetryableCodes.includes(error.code) ||
            nonRetryableStatuses.includes(error.status);
    }

    /**
     * Format error message with context
     * @param {Error} error - Original error
     * @param {string} filePath - File path
     * @param {string} fileName - File name
     * @returns {Error} - Formatted error
     */
    formatError(error, filePath, fileName) {
        let message = `Failed to upload file: ${fileName}`;

        if (error.code === 'ENOENT') {
            message = `File not found: ${filePath}`;
        } else if (error.code === 'EACCES') {
            message = `Permission denied accessing file: ${filePath}`;
        } else if (error.code === 'EISDIR') {
            message = `Path is a directory, not a file: ${filePath}`;
        } else if (error.status === 413) {
            message = `File too large for OpenAI API. Please reduce file size or split into smaller chunks.`;
        } else if (error.status === 400) {
            message = `Invalid file format or corrupted file: ${fileName}`;
        } else if (error.status === 401) {
            message = `OpenAI API authentication failed. Please check your API key.`;
        } else if (error.status === 403) {
            message = `OpenAI API access forbidden. Please check your API permissions.`;
        } else if (error.status === 404) {
            message = `OpenAI API endpoint not found. Please check your API configuration.`;
        } else if (error.status === 429) {
            message = `Rate limit exceeded. Please try again later.`;
        } else if (error.status === 500) {
            message = `OpenAI API server error. Please try again later.`;
        } else if (error.status === 502) {
            message = `OpenAI API gateway error. Please try again later.`;
        } else if (error.status === 503) {
            message = `OpenAI API service unavailable. Please try again later.`;
        } else if (error.message.includes('timeout')) {
            message = `Upload timeout. File may be too large or network connection is slow.`;
        } else if (error.message.includes('network')) {
            message = `Network error during upload. Please check your internet connection.`;
        }

        const formattedError = new Error(message);
        formattedError.originalError = error;
        formattedError.filePath = filePath;
        formattedError.fileName = fileName;

        return formattedError;
    }

    /**
     * Get MIME type for file extension
     * @param {string} extension - File extension
     * @returns {string} - MIME type
     */
    getMimeType(extension) {
        const mimeTypes = {
            '.pdf': 'application/pdf',
            '.txt': 'text/plain',
            '.csv': 'text/csv',
            '.json': 'application/json',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.xls': 'application/vnd.ms-excel',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.doc': 'application/msword',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        };
        return mimeTypes[extension] || 'application/octet-stream';
    }

    /**
     * Upload multiple files with batch processing
     * @param {Array} files - Array of file objects with filePath and fileName
     * @param {Object} options - Upload options
     * @returns {Promise<Array>} - Array of upload results
     */
    async uploadMultipleFiles(files, options = {}) {
        const {
            maxConcurrent = 3,
            continueOnError = true,
            ...uploadOptions
        } = options;

        console.log(`📦 Starting batch upload of ${files.length} files`);

        const results = [];
        const errors = [];

        // Process files in batches to avoid overwhelming the API
        for (let i = 0; i < files.length; i += maxConcurrent) {
            const batch = files.slice(i, i + maxConcurrent);
            console.log(`📤 Processing batch ${Math.floor(i / maxConcurrent) + 1}/${Math.ceil(files.length / maxConcurrent)}`);

            const batchPromises = batch.map(async (file) => {
                try {
                    const result = await this.uploadFile(file.filePath, file.fileName, uploadOptions);
                    return { success: true, file: file.fileName, result };
                } catch (error) {
                    const errorResult = { success: false, file: file.fileName, error: error.message };
                    if (!continueOnError) {
                        throw error;
                    }
                    return errorResult;
                }
            });

            const batchResults = await Promise.allSettled(batchPromises);

            batchResults.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                    if (!result.value.success) {
                        errors.push(result.value);
                    }
                } else {
                    const errorResult = { success: false, file: batch[index].fileName, error: result.reason.message };
                    results.push(errorResult);
                    errors.push(errorResult);
                }
            });

            // Add delay between batches to respect rate limits
            if (i + maxConcurrent < files.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failureCount = results.length - successCount;

        console.log(`✅ Batch upload completed: ${successCount} successful, ${failureCount} failed`);

        return {
            results,
            errors,
            summary: {
                total: files.length,
                successful: successCount,
                failed: failureCount,
                successRate: `${((successCount / files.length) * 100).toFixed(1)}%`
            }
        };
    }

    /**
     * Check file upload status and health
     * @param {string} fileId - OpenAI file ID
     * @returns {Promise<Object>} - File status information
     */
    async getFileStatus(fileId) {
        try {
            const file = await this.openai.files.retrieve(fileId);
            return {
                id: file.id,
                filename: file.filename,
                bytes: file.bytes,
                status: file.status,
                purpose: file.purpose,
                createdAt: file.created_at,
                isReady: file.status === 'processed'
            };
        } catch (error) {
            console.error(`Error checking file status for ${fileId}:`, error.message);
            throw new Error(`Failed to check file status: ${error.message}`);
        }
    }

    /**
     * Delete uploaded file from OpenAI
     * @param {string} fileId - OpenAI file ID
     * @returns {Promise<boolean>} - Success status
     */
    async deleteFile(fileId) {
        try {
            await this.openai.files.delete(fileId);
            console.log(`✅ File deleted successfully: ${fileId}`);
            return true;
        } catch (error) {
            console.error(`Error deleting file ${fileId}:`, error.message);
            throw new Error(`Failed to delete file: ${error.message}`);
        }
    }

    /**
     * List all uploaded files
     * @param {Object} options - List options
     * @returns {Promise<Array>} - Array of file objects
     */
    async listFiles(options = {}) {
        try {
            const files = await this.openai.files.list(options);
            return files.data.map(file => ({
                id: file.id,
                filename: file.filename,
                bytes: file.bytes,
                status: file.status,
                purpose: file.purpose,
                createdAt: file.created_at
            }));
        } catch (error) {
            console.error('Error listing files:', error.message);
            throw new Error(`Failed to list files: ${error.message}`);
        }
    }

    /**
     * Clean up old files based on criteria
     * @param {Object} criteria - Cleanup criteria
     * @returns {Promise<Object>} - Cleanup results
     */
    async cleanupFiles(criteria = {}) {
        const {
            olderThanDays = 30,
            maxFiles = 100,
            dryRun = true
        } = criteria;

        try {
            const files = await this.listFiles();
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

            const filesToDelete = files
                .filter(file => new Date(file.createdAt) < cutoffDate)
                .slice(0, maxFiles);

            console.log(`Found ${filesToDelete.length} files to clean up`);

            if (dryRun) {
                return {
                    dryRun: true,
                    filesToDelete: filesToDelete.length,
                    files: filesToDelete.map(f => ({ id: f.id, filename: f.filename, createdAt: f.createdAt }))
                };
            }

            const results = [];
            for (const file of filesToDelete) {
                try {
                    await this.deleteFile(file.id);
                    results.push({ success: true, file: file.filename });
                } catch (error) {
                    results.push({ success: false, file: file.filename, error: error.message });
                }
            }

            return {
                dryRun: false,
                totalProcessed: filesToDelete.length,
                successful: results.filter(r => r.success).length,
                failed: results.filter(r => !r.success).length,
                results
            };

        } catch (error) {
            console.error('Error during file cleanup:', error.message);
            throw new Error(`Failed to cleanup files: ${error.message}`);
        }
    }



    /**
     * Check for and wait for any active runs on a thread
     * @param {string} threadId - OpenAI thread ID
     * @returns {Promise<void>}
     */
    async waitForActiveRuns(threadId) {
        try {
            console.log(`Checking for active runs on thread ${threadId}...`);

            // List all runs for the thread
            const runs = await this.openai.beta.threads.runs.list(threadId);

            // Find any active runs
            const activeRuns = runs.data.filter(run =>
                run.status === 'queued' ||
                run.status === 'in_progress' ||
                run.status === 'requires_action'
            );

            if (activeRuns.length > 0) {
                console.log(`Found ${activeRuns.length} active run(s). Waiting for completion...`);

                // Wait for each active run to complete
                for (const run of activeRuns) {
                    console.log(`Waiting for run ${run.id} (status: ${run.status})...`);
                    await this.waitForRunCompletion(threadId, run.id);
                }

                console.log('All active runs completed');
            } else {
                console.log('No active runs found');
            }
        } catch (error) {
            console.error('Error checking for active runs:', error);
            // Don't throw error here - we'll let the message creation attempt proceed
            // If there's still an active run, the create message call will fail with a proper error
        }
    }

    /**
     * Validate file attachments and check if they're still usable
     * @param {Array} attachments - File attachments array
     * @returns {Promise<Object>} - Validation result with valid attachments
     */
    async validateFileAttachments(attachments) {
        if (!attachments || attachments.length === 0) {
            return { valid: true, attachments: [], warnings: [] };
        }

        const validAttachments = [];
        const warnings = [];

        for (const attachment of attachments) {
            try {
                // Check if file still exists and is accessible
                const fileStatus = await this.getFileStatus(attachment.file_id);

                if (fileStatus.isReady) {
                    validAttachments.push(attachment);
                } else {
                    warnings.push(`File ${attachment.file_id} is not ready (status: ${fileStatus.status})`);
                }
            } catch (error) {
                // If file doesn't exist or can't be retrieved, log warning
                console.warn(`⚠️  File ${attachment.file_id} validation failed: ${error.message}`);
                warnings.push(`File ${attachment.file_id} is no longer accessible: ${error.message}`);
            }
        }

        return {
            valid: validAttachments.length > 0,
            attachments: validAttachments,
            warnings: warnings
        };
    }

    /**
     * Add message to thread with attachments
     * @param {string} threadId - OpenAI thread ID
     * @param {string} content - Message content
     * @param {Array} attachments - File attachments
     * @param {Object} options - Additional options
     */
    async addMessageToThread(threadId, content, attachments = [], options = {}) {
        try {
            // Wait for any active runs to complete before adding message
            await this.waitForActiveRuns(threadId);

            // Validate file attachments if enabled (default: false for backward compatibility)
            let validatedAttachments = attachments;
            if (options.validateFiles && attachments.length > 0) {
                const validation = await this.validateFileAttachments(attachments);

                if (validation.warnings.length > 0) {
                    console.warn('⚠️  File validation warnings:', validation.warnings);
                }

                validatedAttachments = validation.attachments;

                if (validatedAttachments.length === 0 && attachments.length > 0) {
                    console.warn('⚠️  All file attachments failed validation. Proceeding without attachments.');
                }
            }

            await this.openai.beta.threads.messages.create(threadId, {
                role: 'user',
                content: content,
                attachments: validatedAttachments
            });

            console.log(`Message added to thread ${threadId} with ${validatedAttachments.length} attachment(s)`);

        } catch (error) {
            console.error('Error adding message to thread:', error);

            // Check if error is due to expired vector store
            if (error.code === 'expired' || (error.message && error.message.includes('expired') && error.message.includes('vector store'))) {
                console.warn('⚠️  Vector store expired. Attempting recovery...');

                // Try multiple recovery strategies
                const strategies = [
                    // Strategy 1: Remove file_search tool but keep attachments
                    () => {
                        console.log('Strategy 1: Retrying without file_search tool...');
                        const attachmentsWithoutSearch = attachments.map(att => ({
                            file_id: att.file_id,
                            tools: [] // Remove file_search tool
                        }));
                        return this.openai.beta.threads.messages.create(threadId, {
                            role: 'user',
                            content: content,
                            attachments: attachmentsWithoutSearch
                        });
                    },
                    // Strategy 2: Try without any attachments
                    () => {
                        console.log('Strategy 2: Retrying without attachments...');
                        return this.openai.beta.threads.messages.create(threadId, {
                            role: 'user',
                            content: content + '\n\n[Note: File attachments were removed due to expired vector store]',
                            attachments: []
                        });
                    }
                ];

                // Try each strategy
                for (let i = 0; i < strategies.length; i++) {
                    try {
                        await strategies[i]();
                        console.log(`✅ Message added successfully using recovery strategy ${i + 1}`);
                        return; // Success
                    } catch (strategyError) {
                        console.warn(`Strategy ${i + 1} failed:`, strategyError.message);
                        if (i === strategies.length - 1) {
                            // Last strategy failed
                            throw new Error(`All recovery strategies failed for expired vector store. The files need to be re-uploaded. Original error: ${error.message}`);
                        }
                        // Continue to next strategy
                    }
                }
            }

            // Provide more specific error messages for common issues
            if (error.code === 'unsupported_file') {
                throw new Error(`Unsupported file type for file search. Please check OpenAI documentation for supported file types. Original error: ${error.message}`);
            } else if (error.status === 400) {
                throw new Error(`Bad request when adding message to thread. This might be due to unsupported file types or invalid attachments. Original error: ${error.message}`);
            } else {
                throw new Error(`Failed to add message to thread: ${error.message}`);
            }
        }
    }

    /**
     * Get assistant by ID
     * @param {string} assistantId - Assistant ID
     * @returns {Promise<Object>} - Assistant object
     */
    async getAssistant(assistantId) {
        try {
            const assistant = await this.openai.beta.assistants.retrieve(assistantId);
            return assistant;
        } catch (error) {
            console.error('Error getting assistant:', error);
            throw new Error(`Failed to get assistant: ${error.message}`);
        }
    }

    /**
     * List all assistants
     * @returns {Promise<Array>} - Assistants array
     */
    async listAssistants() {
        try {
            const assistants = await this.openai.beta.assistants.list();
            return assistants.data;
        } catch (error) {
            console.error('Error listing assistants:', error);
            throw new Error(`Failed to list assistants: ${error.message}`);
        }
    }

    /**
     * Analyze custom declaration document with existing files and invoice content data
     * @param {Object} project - Project object
     * @param {Object} customDeclaration - Custom declaration object
     * @param {Array} invoices - Array of invoice objects with content data
     * @param {string} threadId - OpenAI thread ID
     * @returns {Promise<Object>} - Analysis result object
     */
    async extractCustomDeclarationDocument(project, customDeclaration, courierReceipts, threadId) {
        try {
            threadId = await this.ensureThreadId(project, threadId);

            //check for customDeclaration.openAIFileId is not null
            if (!customDeclaration.openAIFileId) {
                const fullFilePath = path.join(__dirname, '..', customDeclaration.filePath);
                const openAIFileId = await this.uploadFile(fullFilePath, customDeclaration.fileName);
                await customDeclaration.update({ openAIFileId: openAIFileId.id });

                customDeclaration = await CustomDeclaration.findByPk(customDeclaration.id);
                console.log(`Custom declaration file uploaded to OpenAI with ID: ${customDeclaration.openAIFileId}`);
            }

            // Create comprehensive analysis instructions

            const extractCustomsDeclarationDataSchema = {
                "name": "extract_customs_declaration_data",
                "description": "Extracts structured customs declaration data (Parts I-VII) from a PDF or text document.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "Certified_Customs_Declaration_Part_I": {
                            "type": "object",
                            "properties": {
                                "Number_LRN": { "type": "string" },
                                "Number_MRN": { "type": "string" },
                                "Date_of_receipt_of_application": { "type": "string" },
                                "Message_ID": { "type": "string" },
                                "Creation_Date": { "type": "string" },
                                "Company_Name": { "type": "string" },
                                "Company_Address": { "type": "string" },
                                "Recipient_Name": { "type": "string" },
                                "Recipient_Address": { "type": "string" },
                                "Applicant_Name": { "type": "string" }
                            },
                            "required": []
                        },
                        "Registration_Declaration_Part_II": {
                            "type": "object",
                            "properties": {
                                "Importer": {
                                    "type": "object",
                                    "properties": {
                                        "Type_of_person": { "type": "string" },
                                        "NIP": { "type": "string" },
                                        "Region": { "type": "string" },
                                        "Identification_Number": { "type": "string" }
                                    },
                                    "required": []
                                },
                                "Applicant": {
                                    "type": "object",
                                    "properties": {
                                        "Type_of_person": { "type": "string" },
                                        "NIP": { "type": "string" },
                                        "Region": { "type": "string" },
                                        "Identification_Number": { "type": "string" },
                                        "Contact_Person": { "type": "string" },
                                        "Representative": { "type": "string" },
                                        "Type_of_representation": { "type": "string" },
                                        "Representative_Identification_Number": { "type": "string" },
                                        "Representative_Contact_Person": { "type": "string" },
                                        "tel": { "type": "string" },
                                        "email": { "type": "string" }
                                    },
                                    "required": []
                                },
                                "Permits": { "type": "string" },
                                "Security": { "type": "string" },
                                "Security_type": { "type": "string" },
                                "Application_type": { "type": "string" },
                                "Application_UC": { "type": "string" },
                                "Number_of_Items": { "type": "string" },
                                "Number_of_Packages": { "type": "string" },
                                "Currency_Exchange_Rate": { "type": "string" }
                            },
                            "required": []
                        },
                        "Delivery_Receipt_Part_III": {
                            "type": "object",
                            "properties": {
                                "Attached_documents": { "type": "string" },
                                "Reference": { "type": "string" },
                                "Shipping_Documents": { "type": "string" },
                                "Exporter_Name": { "type": "string" },
                                "Exporter_Address": { "type": "string" },
                                "Transport_type": { "type": "string" },
                                "Nationality": { "type": "string" },
                                "Goods_location": { "type": "string" },
                                "Permit_number": { "type": "string" },
                                "Gross_Weight": { "type": "string" },
                                "Invoice_value": { "type": "string" },
                                "Invoice_currency": { "type": "string" },
                                "Containers": { "type": "string" },
                                "Destination_country": { "type": "string" },
                                "Shipping": {
                                    "type": "object",
                                    "properties": {
                                        "Country": { "type": "string" },
                                        "Transport_border": { "type": "string" },
                                        "Transport_number": { "type": "string" },
                                        "Transaction_type": { "type": "string" },
                                        "Delivery_terms": { "type": "string" }
                                    },
                                    "required": []
                                }
                            },
                            "required": []
                        },
                        "Goods_Part_IV": {
                            "type": "object",
                            "properties": {
                                "Goods_description": { "type": "string" },
                                "CN_Code": { "type": "string" },
                                "Item_code": { "type": "string" },
                                "Taric": { "type": "string" },
                                "National_Additional_Code": { "type": "string" },
                                "Valuation_method": { "type": "string" },
                                "Preferences": { "type": "string" },
                                "Previous_Documents": { "type": "string" },
                                "Item_number": { "type": "string" },
                                "Packaging": { "type": "string" },
                                "Attached_Documents": { "type": "string" }
                            },
                            "required": []
                        },
                        "Other_Information_Part_V": {
                            "type": "object",
                            "properties": {
                                "Security_type": { "type": "string" },
                                "GRN": { "type": "string" },
                                "Access_Code": { "type": "string" },
                                "NR_Identifier": { "type": "string" },
                                "Additional_Tax_References": { "type": "string" },
                                "Packaging_Number": { "type": "string" },
                                "Packaging_Type": { "type": "string" },
                                "Packaging_Marking": { "type": "string" },
                                "Tax_Calculation_Duties_and_Tax": { "type": "string" },
                                "Tax": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "Type": { "type": "string" },
                                            "Base": { "type": "string" },
                                            "Rate": { "type": "string" },
                                            "Sum": { "type": "string" },
                                            "Payment_Method": { "type": "string" }
                                        },
                                        "required": []
                                    }
                                },
                                "Fired": { "type": "string" }
                            },
                            "required": []
                        },
                        "Fire_Section_Part_VI": {
                            "type": "object",
                            "properties": {
                                "Procedure": { "type": "string" },
                                "Country_of_Origin": { "type": "string" },
                                "Met_Weight": { "type": "string" },
                                "Quantity_in_refill_unit": { "type": "string" },
                                "Stat_Value": { "type": "string" }
                            },
                            "required": []
                        },
                        "Fee_Section_Part_VII": {
                            "type": "object",
                            "properties": {
                                "Fee": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "Fee_Type": { "type": "string" },
                                            "Sum": { "type": "string" },
                                            "Payment_Method": { "type": "string" }
                                        },
                                        "required": []
                                    }
                                }
                            },
                            "required": []
                        }
                    },
                    "required": []
                }
            }


            const analysisInstructions = `You are analyzing a custom declaration (ZC document)
Task:
- Extract following data from the custom declaration file:
From Certified Customs Declaration Part I:
    - Number LRN
    - Number MRN
    - Date of receipt of application:
    - Message ID
    - Creation Date
    - Company Name
    - Company Address
    - Recipient Name
    - Recipient Address
    - Applicant Name

From Registration Declaration Part II:
    - Importer
        - Type of person
        - NIP
        - Region
        - Identification Number

    - Applicant
        - Type of person
        - NIP
        - Region
        - Identification Number
        - Contact Person
        - Representative
        - Type of representation 
        - Identification Number
        - Contact Person
        - tel
        - email
    - Permits
    - Security
    - Security type
    - Application type
    - Application UC
    - Number of Items
    - NUmber of Packages
    - Currency Exchange Rate
- From Delivery Receipt Part III:
    - Attached documents
    - Reference
    - Shipping Documents
    - Exporter Name
    - Exporter Address
    - Transport type
    - Nationality
    - Goods location
    - Permit number
    - Gross Weight
    - Invoice value
    - Invoice currency
    - Containers Yes/No
    - Destination country
    - Shipping
        - Country
        - Transport border
        - Transport number
        - Transaction type
        - Delivery terms
- From Goods Part IV:
    - Goods description
    - CN Code
    - Item code
    - Taric
    - National Additional Code
    - Valuation  method
    - Preferences
    - Previous Documents
    - Item number
    - Packaging
    - Attached Documents
- From Other Information Part V:
    - Security type
    - GRN
    - Access Code
    - NR Identifier
    - Additional Tax References
    - Packaging Number
    - Packaging Type
    - Packaging Marking
    - Tax Calculation Duties and Tax
    - Tax as LIST["Type","Base","Rate","Sum","Payment Method"]
    - Fired

- From Fire Section Part VI:
    - Procedure
    - Country of Origin
    - Met Weight
    - Quantity in refill unit
    - Stat. Value

- From Fee Section Part VII:
    - Fee as LIST["Fee Type","Sum","Payment Method"]
`;

            // Prepare attachments array with available files
            const attachments = [];

            // Add custom declaration file if openAIFileId is available
            if (customDeclaration.openAIFileId) {
                attachments.push({
                    file_id: customDeclaration.openAIFileId,
                    tools: [{ "type": "file_search" }]
                });
            }

            console.log(`Prepared ${attachments.length} file attachments for custom declaration analysis (1 custom declaration)`);

            // Add message to thread with attachments
            await this.addMessageToThread(threadId, analysisInstructions, attachments);

            // Create run for analysis
            const run = await this.createRun(threadId, analysisInstructions, 'custom_declaration', { responseFormat: { type: 'json_schema', json_schema: { name: extractCustomsDeclarationDataSchema.name, schema: extractCustomsDeclarationDataSchema.parameters } }, temperature: 0 });

            // Wait for completion
            const runStatus = await this.waitForRunCompletion(threadId, run.id);

            if (runStatus.status !== 'completed') {
                const errorDetails = runStatus.last_error
                    ? `${runStatus.last_error.code}: ${runStatus.last_error.message}`
                    : 'No error details available';
                throw new Error(`Analysis run failed with status: ${runStatus.status}. Details: ${errorDetails}`);
            }

            // Get response messages
            const messages = await this.getThreadMessages(threadId);

            if (!messages || messages.length === 0) {
                throw new Error('No analysis response received');
            }

            // Extract analysis response from AI
            const aiMessage = messages[0];
            let analysisResult = null;

            if (aiMessage.content && aiMessage.content.length > 0) {
                const responseText = aiMessage.content[0].text.value;
                console.log('Raw AI response received for custom declaration analysis:', responseText.substring(0, 500) + '...');

                // Parse JSON response (when using json_schema response format, response should be valid JSON)
                analysisResult = this.extractJsonFromResponse(responseText);

                if (!analysisResult) {
                    throw new Error('Failed to parse JSON from AI response');
                }

                console.log('✅ Successfully parsed custom declaration analysis result');
            } else {
                throw new Error('Invalid response format from AI');
            }

            console.log('✅ Comprehensive custom declaration analysis completed successfully');

            return {
                success: true,
                analysisResult: analysisResult
            };


        } catch (error) {
            console.error('❌ Error in custom declaration analysis with existing files:', error);

            return {
                success: false,
                error: error.message,
            };
        }
    }

    async analyzeCustomDeclarationDocumentWithExistingFiles(project, customDeclaration, invoices, courierReceipts, threadId) {
        try {
            console.log(`Starting comprehensive custom declaration analysis with existing files for project...`);

            threadId = await this.ensureThreadId(project, threadId);

            const analysisInstructions = `{
  "invoices": [ ${_.map(invoices, "originalFileContent").join('\n')} ],
  "courierReceipt": ${courierReceipts.fileContent},
  "declaration": { ${customDeclaration.originalFileContent} },
  "config": {
    "currencyConversionTolerancePercent": 0.5,
    "supportedLanguages": ["pl","en","hi","de"]
    "invoiceCurrency": "${project.currency}"
    "exchangeCurrency": "${project.exchangeCurrency}"
    "declarationConversionRate": "${project.exchangeRate}"
    "declarationConversionRateTolerancePercent": 0.5
    "declarationConversionRateTolerance": 0.5
    "declarationConversionRateTolerance": 0.5
  }
}
You are analyzing a custom declaration (ZC document) against invoice data for comprehensive customs validation and accuracy verification.

Validation requirements (must be implemented by the LLM):

Identification: match invoice numbers, MRN, LRN, and dates. Flag missing or inconsistent IDs.

Importer/Exporter: match importer/exporter names, NIP/EORI. Flag mismatches.

Goods & HS: match invoice item HS/HSN codes vs declaration CN/TARIC; check quantity, gross/net weight consistency; flag mismatches.

Valuation & Currency: determine authoritative invoice USD total (prefer declaration Invoice_value if currency=USD else sum invoice items). Use provided conversion rate (invoice.conversionRate OR declaration.Registration_Declaration_Part_II.Currency_Exchange_Rate) to compute recalculatedPLN = invoiceUSD * conversionRate. If declaration contains a PLN/statistical/tax base value, compute variancePercent = |recalculatedPLN - declaredPLN| / declaredPLN * 100. If variancePercent > currencyConversionTolerancePercent then mark conversion FAIL. Include ConversionRate_Declared, ConversionRate_Recalculated and ConversionVariancePercent.

Legal & Compliance: check presence and consistency of Valuation method, Procedure type, Incoterms, Country of origin. Return boolean flags for compliance with: EU_Customs_Code, Polish_Customs_Act, Polish_VAT_Act (human readable — true/false based on checks, not article numbers).

Tax & Duty: recompute VAT/duty where tax block present: validate Base x Rate ≈ Sum within 0.5% tolerance.

Translation: for multilingual documents, compare main descriptions and flag translation mismatches or missing language versions.

Fraud & Risk: produce a Risk_Score (0-100) and Risk_Level. Heuristics that increase risk: missing MRN, HS mismatches, conversion variance > tolerance, freight/insurance extremely high vs goods value, duplicate MRN/LRN.

Produce both per-section Match_Score (0-100), Status, Issues[], Comments and an Overall_Match_Score (weighted), Overall_Status, Overall_Risk_Level and Remarks.

Task:
**Custom Declaration Data:**
${customDeclaration.originalFileContent}
**${invoices.length} Invoice(s) Data:**
${invoices.map(invoice => invoice.originalFileContent).join('\n')}

**Analysis Context:**
- Invoice Count: ${invoices.length}
- Invoice Items Count: ${invoices.map(invoice => JSON.parse(invoice.originalFileContent).items.length).reduce((a, b) => a + b, 0)}
- Invoice ItemsTotal Quantity: ${invoices.map(invoice => JSON.parse(invoice.originalFileContent).items.reduce((a, b) => a + b.quantity, 0)).reduce((a, b) => a + b, 0)}
- Invoice Items Total Gross Weight: ${invoices.map(invoice => JSON.parse(invoice.originalFileContent).items.reduce((a, b) => a + b.grossWeight, 0)).reduce((a, b) => a + b, 0)}
- Invoice Items Total Net Weight: ${invoices.map(invoice => JSON.parse(invoice.originalFileContent).items.reduce((a, b) => a + b.netWeight, 0)).reduce((a, b) => a + b, 0)}
- Invoice Items Total Value in ${project.currency}: ${invoices.map(invoice => JSON.parse(invoice.originalFileContent).items.reduce((a, b) => a + b.total, 0)).reduce((a, b) => a + b, 0)}

**Primary Objectives:**

**Critical Cross-Check Validations:**
1. **Address Verification:**
   - Billing address consistency between declaration and invoices
   - Shipping/delivery address alignment
   - Consignee information accuracy
   - Geographic and postal code validation

2. **Item Synchronization:**
   - Item count and quantity consistency
   - Weight and dimension validation
   - Product descriptions and specifications matching
   - Unit measurements and packaging details

3. **Financial Validation:**
   - Total cost alignment between declaration and invoices
   - Currency consistency and exchange rates
   - Unit price calculations and totals
   - Tax calculations and duty assessments
   - Discounts, fees, and surcharges breakdown

4. **Compliance Verification:**
   - HS code accuracy and classification validity
   - Country of origin documentation
   - Regulatory compliance and restrictions
   - Required certifications and permits
   - Trade agreement applicability

Scoring rules (for the LLM to follow)

- Scoring ranges: 0-100. 100 = perfect match, 0 = completely mismatch.
- Use the supplied WEIGHTS for overall weighted score. Weighted average = sum(sectionScore * weight) / sum(weights).
- Status thresholds:
- PASS = section score = 100
- REQUIRES_ATTENTION = section score in [threshold_attention, 99] (policy: attention threshold = 70 for most; 75 for HS and Legal)
- FAIL = below attention threshold
Currency conversion tolerance: 0.5% (configurable via config.currencyConversionTolerancePercent). If no declared PLN value present, mark conversion check REQUIRES_ATTENTION and preserve recalculatedPLN for review.
Follow these rules:
- Focus on providing comprehensive customs validation that ensures accurate documentation and compliance readiness.
- Return only valid JSON.`;

            const customDeclarationComprehensiveValidationSchema = {
                "name": "custom_declaration_comprehensive_validation",
                "description": "Validates a custom declaration (ZC document) against invoice data for comprehensive customs validation and accuracy verification.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "ValidationSummary": {
                            "Overall_Match_Score": 0.0,
                            "Overall_Status": "PASS|REQUIRES_ATTENTION|FAIL",
                            "Overall_Risk_Level": "LOW|MEDIUM|HIGH",
                            "Remarks": "short human readable summary"
                        },
                        "Sections": {
                            "Identification_Check": {
                                "Match_Score": 0.0,
                                "Status": "PASS|REQUIRES_ATTENTION|FAIL",
                                "Issues": ["..."],
                                "Comments": "..."
                            },
                            "Importer_Exporter_Details": {
                                "Match_Score": 0.0,
                                "Status": "PASS|REQUIRES_ATTENTION|FAIL",
                                "Issues": ["..."],
                                "Comments": "..."
                            },
                            "Goods_and_HSCode_Validation": {
                                "Match_Score": 0.0,
                                "Status": "PASS|REQUIRES_ATTENTION|FAIL",
                                "Issues": ["..."],
                                "Comments": "..."
                            },
                            "Valuation_and_Currency_Conversion_Check": {
                                "Match_Score": 0.0,
                                "Status": "PASS|REQUIRES_ATTENTION|FAIL",
                                "Issues": ["..."],
                                "ConversionRate_Declared": 0.0,
                                "ConversionRate_Recalculated": 0.0,
                                "ConversionVariancePercent": 0.0,
                                "Comments": "..."
                            },
                            "Legal_and_Compliance_Check": {
                                "Match_Score": 0.0,
                                "Status": "PASS|REQUIRES_ATTENTION|FAIL",
                                "Issues": ["..."],
                                "Legal_References": ["EU Customs Code", "Polish Customs Act", "Polish VAT Act"],
                                "Comments": "...",
                                "EU_Customs_Code_Compliance": true,
                                "Polish_Customs_Act_Compliance": true,
                                "VAT_Act_Compliance": true
                            },
                            "Tax_and_Duty_Validation": {
                                "Match_Score": 0.0,
                                "Status": "PASS|REQUIRES_ATTENTION|FAIL",
                                "Issues": ["..."],
                                "Comments": "..."
                            },
                            "Translation_and_Description_Check": {
                                "Match_Score": 0.0,
                                "Status": "PASS|REQUIRES_ATTENTION|FAIL",
                                "Issues": ["..."],
                                "Comments": "..."
                            },
                            "Fraud_and_Risk_Assessment": {
                                "Match_Score": 0.0,
                                "Status": "PASS|REQUIRES_ATTENTION|FAIL",
                                "Risk_Score": 0,
                                "Risk_Level": "LOW|MEDIUM|HIGH",
                                "Anomalies": ["..."],
                                "Comments": "..."
                            }
                        },
                        "Legal_Check_Summary": {
                            "EU_Customs_Code_Compliance": true,
                            "Polish_Customs_Act_Compliance": true,
                            "VAT_Act_Compliance": true
                        }
                    }
                }
            }


            // Prepare attachments array with available files
            const attachments = [];


            console.log(`Prepared ${attachments.length} file attachments for custom declaration analysis (1 custom declaration + ${invoices.length} invoices)`);

            // Add message to thread with attachments
            await this.addMessageToThread(threadId, analysisInstructions, attachments);

            // Create run for analysis
            const run = await this.createRun(threadId, analysisInstructions, 'custom_declaration', { responseFormat: { type: 'json_schema', json_schema: { name: customDeclarationComprehensiveValidationSchema.name, schema: customDeclarationComprehensiveValidationSchema.parameters } }, temperature: 0 });

            // Wait for completion
            const runStatus = await this.waitForRunCompletion(threadId, run.id);

            if (runStatus.status !== 'completed') {
                const errorDetails = runStatus.last_error
                    ? `${runStatus.last_error.code}: ${runStatus.last_error.message}`
                    : 'No error details available';
                throw new Error(`Analysis run failed with status: ${runStatus.status}. Details: ${errorDetails}`);
            }

            // Get response messages
            const messages = await this.getThreadMessages(threadId);

            if (!messages || messages.length === 0) {
                throw new Error('No analysis response received');
            }

            // Extract analysis response from AI
            const aiMessage = messages[0];

            if (aiMessage.content && aiMessage.content.length > 0) {
                const responseText = aiMessage.content[0].text.value;
                console.log('Raw AI response received for custom declaration analysis:', responseText.substring(0, 500) + '...');

                return {
                    success: true,
                    analysisResult: JSON.parse(responseText)
                };
            } else {
                return {
                    success: false,
                    error: 'Invalid response format from AI'
                };
            }


        } catch (error) {
            console.error('❌ Error in custom declaration analysis with existing files:', error);

            return {
                success: false,
                analysisResult: error.message,
            };
        }
    }

    async extractCourierShipmentData(courierReceipt, threadId) {
        try {
            if (!threadId) {
                throw new Error('Thread ID is required for courier shipment extraction');
            }

            const attachments = [];
            if (courierReceipt.openAIFileId) {
                attachments.push({
                    file_id: courierReceipt.openAIFileId,
                    tools: [{ type: 'file_search' }]
                });
            }

            let documentText = courierReceipt.fileContent || '';
            if (typeof documentText === 'string') {
                const trimmed = documentText.trim();
                if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                    documentText = '';
                } else {
                    documentText = trimmed;
                }
            } else {
                documentText = '';
            }

            if (!documentText) {
                const extractedText = await this.getCourierReceiptDocumentText(courierReceipt);
                documentText = extractedText;
            }

            const MAX_CONTEXT_LENGTH = 12000;
            if (documentText && documentText.length > MAX_CONTEXT_LENGTH) {
                documentText = `${documentText.slice(0, MAX_CONTEXT_LENGTH)}\n\n[TRUNCATED_OCR_TEXT]`;
            }

            const courierShipmentComprehensiveValidationSchema = {
                name: "courier_shipment_data_extraction",
                description: "Extracts structured courier shipment information from a courier receipt document.",
                parameters: {
                    type: "object",
                    properties: {
                        document_metadata: {
                            type: ["object", "null"],
                            properties: {
                                carrier_name: { type: ["string", "null"] },
                                document_type: { type: ["string", "null"] },
                                issue_date: { type: ["string", "null"] },
                                tracking_numbers: {
                                    type: "array",
                                    items: { type: "string" },
                                    default: []
                                }
                            },
                            additionalProperties: false,
                            default: {}
                        },
                        shipper: {
                            type: ["object", "null"],
                            properties: {
                                name: { type: ["string", "null"] },
                                address: { type: ["string", "null"] },
                                city: { type: ["string", "null"] },
                                postal_code: { type: ["string", "null"] },
                                country: { type: ["string", "null"] },
                            },
                            additionalProperties: false,
                            default: {}
                        },
                        consignee: {
                            type: ["object", "null"],
                            properties: {
                                name: { type: ["string", "null"] },
                                address: { type: ["string", "null"] },
                                city: { type: ["string", "null"] },
                                postal_code: { type: ["string", "null"] },
                                country: { type: ["string", "null"] },
                            },
                            additionalProperties: false,
                            default: {}
                        },
                        shipment_details: {
                            type: ["object", "null"],
                            properties: {
                                routing_code: { type: ["string", "null"], description: "Service route code or logistics routing code like 'EURT PL-WAW-GTW P1NXL'" },
                                routing_category: { type: ["string", "null"], description: "Customs / Commercial indicator like 'C'" },
                                reference_number: { type: ["string", "null"], description: "Reference number like ' EJL/25-26/724-725-726-727'" },
                                shipment_weight: { type: ["number", "null"], description: "Shipment weight in kilograms" },
                                shipment_weight_unit: { type: ["string", "null"], description: "Shipment weight unit like 'kg'" },
                                shipment_pieces: { type: ["number", "null"], description: "Shipment pieces example: 1/" },
                                shipment_pack: { type: ["number", "null"], description: "Shipment volume in cubic meters example: /1" },
                            },
                            additionalProperties: false,
                            default: {}
                        },
                        waybill_details: {
                            type: ["object", "null"],
                            properties: {
                                waybill_number: { type: ["string", "null"], description: "Waybill number like 'WAYBILL 28 3102 1244'" },
                                contents_description: { type: ["string", "null"], description: "Contents description like '18KT Gold & Silver Jewellery — Bracelets, Necklaces, Rings, Earrings'" },
                                dispatch_code: { type: ["string", "null"], description: "Waybill time like '(2L)PL02174+48000001'" },
                                post_tracking_reference_code: { type: ["string", "null"], description: "Post tracking reference like '(J) JD01 4600 0122 9646 831'" },

                            },
                            additionalProperties: false,
                            default: {}
                        },
                        waybill_docs: {
                            type: ["object", "null"],
                            properties: {
                                date_of_dispatch: { type: ["string", "null"], description: "Example '2025-01-01'" },
                            },
                            additionalProperties: false,
                            default: {
                                date_of_dispatch: null,
                            }
                        },
                        shipper: {
                            type: ["object", "null"],
                            properties: {
                                name: { type: ["string", "null"] },
                                address: { type: ["string", "null"] },
                                city: { type: ["string", "null"] },
                                postal_code: { type: ["string", "null"] },
                                country: { type: ["string", "null"] },
                                contact: { type: ["string", "null"] },
                            },
                            additionalProperties: false,
                            default: {}
                        },
                        receiver: {
                            type: ["object", "null"],
                            properties: {
                                name: { type: ["string", "null"] },
                                address: { type: ["string", "null"] },
                                city: { type: ["string", "null"] },
                                postal_code: { type: ["string", "null"] },
                                country: { type: ["string", "null"] },
                                contact: { type: ["string", "null"] },
                            },
                        },
                        multi_leg_courier_routing: {
                            type: ["object", "null"],
                            properties: {
                                routing_code: { type: ["string", "null"], description: "Service route code or logistics routing code like 'EURTIN-BOM-MPT PL-WAW-GTWP1NX'" },
                                routing_origin: { type: ["string", "null"], description: "Routing origin like 'IN-BOM'" },
                                routing_destination: { type: ["string", "null"], description: "Routing destination like 'PL-WAW'" },
                                routing_service: { type: ["string", "null"], description: "Routing service like 'P1NX'" },
                                routing_gateway: { type: ["string", "null"], description: "Routing gateway like 'GTW'" },
                                routing_route_code: { type: ["string", "null"], description: "Routing route code like 'PL-WAW-GTW P1NXL'" },
                                routing_description: { type: ["string", "null"], description: "Routing description like 'International shipment from India to Poland'" },
                            },
                        },
                        product_details: {
                            type: ["object", "null"],
                            properties: {
                                product_name: { type: ["string", "null"] }
                            },
                        },
                        payer_details: {
                            type: ["object", "null"],
                            properties: {
                                freight_account: { type: ["string", "null"], description: "Freight account number like '1234567890'" },
                                duty_account: { type: ["string", "null"], description: "Duty account number like '1234567890' or text like ' Receiver Will Pay'" },
                                taxes_account: { type: ["string", "null"], description: "Taxes account number like '1234567890' or text like ' Receiver Will Pay'" },
                            },
                            additionalProperties: false,
                            default: {}
                        },
                        shipment_details: {
                            type: ["object", "null"],
                            properties: {
                                reference_number: { type: ["string", "null"], description: "Reference number like ' EJL/25-26/724-725-726-727'" },
                                custom_value: { type: ["number", "null"], description: "Shipment custom value like 1000.00" },
                                custom_value_currency: { type: ["string", "null"], description: "Shipment custom value currency like 'USD'" },
                                customs_declared_shipment_weight: { type: ["number", "null"], description: "Shipment customs declared weight in kilograms like 1000.00" },
                                customs_declared_shipment_weight_unit: { type: ["string", "null"], description: "Shipment customs declared weight unit like 'kg'" },
                                customs_declared_shipment_pieces: { type: ["number", "null"], description: "Shipment customs declared pieces example: 1/" },
                                customs_declared_shipment_pack: { type: ["number", "null"], description: "Shipment customs declared volume in cubic meters example: /1" },
                                customs_declarator_name: { type: ["string", "null"], description: "Shipment customs declarator name like 'John Doe'" },
                                customs_declaration_date: { type: ["string", "null"], description: "Shipment customs declaration date like 'DD.MM.YYYY or DD/MM/YYYY'" },
                            },
                        },
                    },
                },
                additionalProperties: false,
                default: {}
            };

            let extractionPrompt = `
                You are analyzing a courier shipment (waybill) document
Task:
- Extract following data from the courier shipment (waybill) file:
Reference the courier receipt text enclosed between [COURIER_RECEIPT_TEXT_START] and [COURIER_RECEIPT_TEXT_END] and the attached document to answer.
From Document Top Part I:
    - carrier_name
    - document_type
    - issue_date
    - tracking_numbers
From Document "From" Part II:
    - shipper_name
    - shipper_address
    - shipper_city
    - shipper_postal_code
    - shipper_country
From Document "To" Part III:
    - consignee_name
    - consignee_address
    - consignee_city
    - consignee_postal_code
    - consignee_country
From Document "Shipment" Part IV:
    - routing_code
    - routing_category
    - reference_number
    - shipment_weight
    - shipment_weight_unit
    - shipment_pieces
    - shipment_pack
From Document "Waybill Details" Part V:
    - waybill_number
    - contents_description
    - dispatch_code
    - post_tracking_reference_code
From Document "Waybill Docs" Part VI:
    - date_of_dispatch
From Document "Shipper" Part VII:
    - name
    - address
    - city
    - postal_code
    - country
    - contact
From Document "Receiver" Part VIII:
    - name
    - address
    - city
    - postal_code
    - country
    - contact
From Document "Multi Leg Courier Routing" Part IX:
    - routing_code
    - routing_origin
    - routing_destination
    - routing_service
    - routing_gateway
    - routing_route_code
    - routing_description
From Document "Product Details" Part X:
    - product_name
From Document "Payer Details" Part XI:
    - freight_account
    - duty_account
    - taxes_account
From Document "Shipment Details" Part XII:
    - reference_number
    - custom_value
    - custom_value_currency
    - customs_declared_shipment_weight
    - customs_declared_shipment_weight_unit
    - customs_declared_shipment_pieces
    - customs_declared_shipment_pack
    - customs_declarator_name
    - customs_declaration_date
    
Extract structured courier shipment information strictly following the schema defined in the Courier Shipment Extraction Assistant.
Return ONLY valid JSON. Do not include markdown, commentary, or additional text.
If some values are missing, use null and list them in missing_fields`;

            if (documentText) {
                extractionPrompt += `\n\n[COURIER_RECEIPT_TEXT_START]\n${documentText}\n[COURIER_RECEIPT_TEXT_END]`;
            }

            await this.addMessageToThread(threadId, extractionPrompt, attachments, { validateFiles: true });

            const run = await this.createRun(
                threadId,
                'Extract courier shipment data as JSON only.',
                'courier_shipment',
                { responseFormat: { type: 'json_schema', json_schema: { name: courierShipmentComprehensiveValidationSchema.name, schema: courierShipmentComprehensiveValidationSchema.parameters } }, temperature: 0 }
            );

            const runStatus = await this.waitForRunCompletion(threadId, run.id);
            if (runStatus.status !== 'completed') {
                const errorDetails = runStatus.last_error
                    ? `${runStatus.last_error.code}: ${runStatus.last_error.message}`
                    : 'No error details available';
                throw new Error(`Courier shipment extraction failed: ${errorDetails}`);
            }

            const messages = await this.getThreadMessages(threadId);
            const aiMessage = messages.find(message => message.role === 'assistant');

            if (!aiMessage || !aiMessage.content || aiMessage.content.length === 0) {
                throw new Error('No extraction response received from assistant');
            }

            const responseText = aiMessage.content
                .map(part => (part?.text?.value || '').trim())
                .join('\n')
                .trim();

            if (!responseText) {
                throw new Error('Assistant returned empty extraction response');
            }

            const extractionResult = this.extractJsonFromResponse(responseText);
            if (!extractionResult || typeof extractionResult !== 'object') {
                throw new Error('Unable to parse extraction response as JSON');
            }

            return {
                success: true,
                data: extractionResult,
                rawResponse: responseText,
                attachmentsUsed: attachments.length,
                runId: run.id,
                generatedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Error extracting courier shipment data:', error);
            return {
                success: false,
                error: error.message,
                generatedAt: new Date().toISOString()
            };
        }
    }

    async validateCourierShipmentData(project, courierReceipt, invoices, extractedData, threadId) {
        try {
            if (!threadId) {
                throw new Error('Thread ID is required for courier shipment validation');
            }

            if (!extractedData) {
                throw new Error('Extracted courier shipment data is required for validation');
            }

            if (!Array.isArray(invoices) || invoices.length === 0) {
                throw new Error('No invoices available for validation');
            }

            const attachments = [];


            const invoiceDataset = invoices.map(invoice => {
                let parsedContent = null;
                try {
                    parsedContent = invoice.originalFileContent
                        ? JSON.parse(invoice.originalFileContent)
                        : null;
                } catch (parseError) {
                    parsedContent = invoice.originalFileContent || null;
                }

                return {
                    projectId: invoice.projectId,
                    content: parsedContent
                };
            });

            const courierShipmentDataset = {
                projectId: courierReceipt.projectId,
                content: JSON.stringify(extractedData)
            };

            const courierShipmentAndInvoiceValidationSchema = {
                name: "courier_shipment_and_invoice_validation",
                description: "Validates a courier shipment JSON against a provided invoice dataset.",
                parameters: {
                    type: "object",
                    properties: {
                        validationSummary: {
                            type: "object",
                            properties: {
                                overallMatchScore: { type: "number" },
                                overallStatus: { type: "string" },
                                overallRiskLevel: { type: "string" },
                                remarks: { type: "string" },
                                keyFindings: { type: "array", items: { type: "string" } }
                            },
                        },
                        fieldValidations: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    fieldName: { type: "string" },
                                    valueInInvoice: { type: "string" },
                                    valueInCourierShipment: { type: "string" },
                                    matchScore: { type: "number" },
                                    status: { type: "string" },
                                    notes: { type: "string" },
                                }
                            }
                        },
                        invoiceCrossChecks: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    invoiceId: { type: "number" },
                                    invoiceNumber: { type: "string", description: "Invoice number like 'EJL/25-26/449'" },
                                    matchScore: { type: "number" },
                                    matchedFields: { type: "array", items: { type: "string" } },
                                    discrepancies: { type: "array", items: { type: "string" } },
                                }
                            }
                        },
                        shipperValidation: {
                            type: "object",
                            properties: {
                                nameMatchScore: { type: "number" },
                                items: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            fieldValueInInvoice: { type: "string" },
                                            fieldValueInCourierShipment: { type: "string" },
                                            matchScore: { type: "number" },
                                            status: { type: "string" },
                                            notes: { type: "string" },
                                        }

                                    }
                                }
                            }
                        },
                        receiverValidation: {
                            type: "object",
                            properties: {
                                nameMatchScore: { type: "number" },
                                items: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            fieldValueInInvoice: { type: "string" },
                                            fieldValueInCourierShipment: { type: "string" },
                                            matchScore: { type: "number" },
                                            status: { type: "string" },
                                            notes: { type: "string" },
                                        }
                                    }
                                }
                            }
                        },
                        totalInvoiceAmountValidation: {
                            type: "object",
                            properties: {
                                matchScore: { type: "number" },
                                discrepancies: { type: "array", items: { type: "string" } },
                            }
                        },
                        totalInvoiceAmountCurrencyValidation: {
                            type: "object",
                            properties: {
                                matchScore: { type: "number" },
                                discrepancies: { type: "array", items: { type: "string" } },
                            }
                        },
                        totalShipmentWeightValidation: {
                            type: "object",
                            properties: {
                                matchScore: { type: "number" },
                                discrepancies: { type: "array", items: { type: "string" } },
                            }
                        },
                        riskAssessment: {
                            type: "object",
                            properties: {
                                level: { type: "string" },
                                issues: { type: "array", items: { type: "string" }, description: "Issues like 'Fraud detected', 'Tax evasion', 'Customs compliance issues'" },
                                recommendedActions: { type: "array", items: { type: "string" }, description: "Recommended actions like 'Review the shipment', 'Contact the customs authority', 'Contact the freight forwarder'" },
                            }
                        },
                        metadata: {
                            type: "object",
                            properties: {
                                projectId: { type: "number" },
                                courierReceiptId: { type: "number" },
                                generatedAt: { type: "string" },
                            }
                        }
                    },
                    additionalProperties: false,
                    default: {}
                }
            };
            const validationPrompt = `
            Task:
            - Validate the extracted courier shipment JSON against the provided invoice dataset.
            - For Multiple Invoice Number consider Invoice in courier shipment incrementally and validate with the invoice number Example For 3 invoices EJL/25-26/449, EJL/25-26/450, EJL/25-26/451. Invoice number in courier shipment is EJL/25-26/449-450-451 format.
            - For amount validation validate total amount of invoice with the total amount of courier shipment with matching currency.
            - For weight validation validate total weight of invoice with the total weight of courier shipment with matching weight unit.
            - For Shipper and Receiver validation validate the name, address, city, postal code, country, contact with the shipper and receiver in the invoice.
            - Reference the courier receipt text enclosed between [COURIER_RECEIPT_TEXT_START] and [COURIER_RECEIPT_TEXT_END] and the attached document to answer.
            - Use strict JSON output with the structure:
            ${courierShipmentAndInvoiceValidationSchema}
            - Courier Shipment Dataset:
            ${courierShipmentDataset}
            - Invoice Dataset:
            ${invoiceDataset}
            - Respond with JSON only. Base all comparisons on the provided extracted data and invoices.`;

            await this.addMessageToThread(threadId, validationPrompt, attachments, { validateFiles: true });

            const run = await this.createRun(
                threadId,
                'Validate courier shipment JSON against invoices and return structured validation report.',
                'custom_declaration',
                { responseFormat: { type: 'json_schema', json_schema: { name: courierShipmentAndInvoiceValidationSchema.name, schema: courierShipmentAndInvoiceValidationSchema.parameters } }, temperature: 0 }
            );

            const runStatus = await this.waitForRunCompletion(threadId, run.id);
            if (runStatus.status !== 'completed') {
                const errorDetails = runStatus.last_error
                    ? `${runStatus.last_error.code}: ${runStatus.last_error.message}`
                    : 'No error details available';
                throw new Error(`Courier shipment validation failed: ${errorDetails}`);
            }

            const messages = await this.getThreadMessages(threadId);
            const aiMessage = messages.find(message => message.role === 'assistant');

            if (!aiMessage || !aiMessage.content || aiMessage.content.length === 0) {
                throw new Error('No validation response received from assistant');
            }

            const responseText = aiMessage.content
                .map(part => (part?.text?.value || '').trim())
                .join('\n')
                .trim();

            if (!responseText) {
                throw new Error('Assistant returned empty validation response');
            }

            const validationResult = this.extractJsonFromResponse(responseText);
            if (!validationResult || typeof validationResult !== 'object') {
                throw new Error('Unable to parse validation response as JSON');
            }

            return {
                success: true,
                data: validationResult,
                rawResponse: responseText,
                attachmentsUsed: attachments.length,
                runId: run.id,
                generatedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Error validating courier shipment data:', error);
            return {
                success: false,
                error: error.message,
                generatedAt: new Date().toISOString()
            };
        }
    }

    async analyzeCourierReceiptDocumentWithContentData(project, courierReceipt, invoices, threadId) {
        try {
            console.log(`Starting courier receipt two-phase analysis for project ${project.id}...`);

            const extraction = await this.extractCourierShipmentData(courierReceipt, threadId);
            let validation = {
                success: false,
                error: 'Validation skipped due to extraction failure',
                generatedAt: new Date().toISOString()
            };
            if (extraction.success) {

                validation = await this.validateCourierShipmentData(project, courierReceipt, invoices, extraction.data, threadId);
            }

            const aggregateSuccess = extraction.success && validation.success;

            return {
                success: aggregateSuccess,
                projectId: project.id,
                courierReceiptId: courierReceipt.id,
                extraction,
                validation,
                analyzedAt: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ Error in courier receipt analysis with content data:', error);

            return {
                success: false,
                projectId: project.id,
                courierReceiptId: courierReceipt.id,
                extraction: {
                    success: false,
                    error: error.message,
                    generatedAt: new Date().toISOString()
                },
                validation: {
                    success: false,
                    error: error.message,
                    generatedAt: new Date().toISOString()
                },
                analyzedAt: new Date().toISOString()
            };
        }
    }

}

// Create and export singleton instance
const openAIService = new OpenAIService();
module.exports = openAIService;

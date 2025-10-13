const OpenAI = require('openai');
const { toFile } = require('openai');
require('dotenv').config();

class OpenAIService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        // Cache for assistant ID to avoid repeated creation
        this.assistantId = null;
        this.assistantCreated = false;
    }

    /**
     * Get or create OpenAI Assistant ID
     * @returns {Promise<string>} - Assistant ID
     */
    async getAssistantId() {
        try {
            // Return cached assistant ID if available
            if (this.assistantId && this.assistantCreated) {
                return this.assistantId;
            }

            // Check environment variable first
            let assistantId = process.env.OPENAI_ASSISTANT_ID;

            if (assistantId && assistantId !== 'your_openai_assistant_id_here') {
                console.log(`Using existing assistant ID from environment: ${assistantId}`);
                this.assistantId = assistantId;
                this.assistantCreated = true;
                return assistantId;
            }

            // Create new assistant if none exists
            console.log('Creating new OpenAI Assistant...');

            const assistant = await this.openai.beta.assistants.create({
                name: "Invoice Translation Assistant",
                description: "Professional assistant for translating invoices and comparing mismatches between original and translated invoices or between invoice and customs clearance documents.",
                model: "gpt-4o-mini",
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
                        type: "file_search"
                    }
                ]
            });

            this.assistantId = assistant.id;
            this.assistantCreated = true;

            console.log(`✅ Assistant created successfully with ID: ${this.assistantId}`);
            console.log(`💡 Add this to your .env file: OPENAI_ASSISTANT_ID=${this.assistantId}`);

            return this.assistantId;

        } catch (error) {
            console.error('Error getting assistant ID:', error);
            throw new Error(`Failed to get assistant ID: ${error.message}`);
        }
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
     * Create a run for a thread
     * @param {string} threadId - OpenAI thread ID
     * @param {string} instructions - Instructions for the run
     * @returns {Promise<Object>} - Run object
     */
    async createRun(threadId, instructions) {
        try {
            // Validate parameters
            if (!threadId || typeof threadId !== 'string') {
                throw new Error(`Invalid threadId: ${threadId}. Expected a valid string.`);
            }
            if (!instructions || typeof instructions !== 'string') {
                throw new Error(`Invalid instructions: ${instructions}. Expected a valid string.`);
            }

            // Get assistant ID
            const assistantId = await this.getAssistantId();
            console.log(`Using assistant ID: ${assistantId}`);

            // Create a run to process the message with retry logic
            let run;
            let retryCount = 0;
            const maxRetries = 3;

            while (retryCount < maxRetries) {
                try {
                    run = await this.openai.beta.threads.runs.create(threadId, {
                        assistant_id: assistantId,
                        instructions: instructions
                    });
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
                            return await this.createRun(threadId, instructions);
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
            // First try direct parsing
            return JSON.parse(responseText);
        } catch (error) {
            // Try to find JSON in the response
            const jsonPatterns = [
                /\{[\s\S]*\}/,  // Match any object-like structure
                /```json\s*(\{[\s\S]*?\})\s*```/i,  // Match JSON in code blocks
                /```\s*(\{[\s\S]*?\})\s*```/i,  // Match JSON in generic code blocks
            ];

            for (const pattern of jsonPatterns) {
                const match = responseText.match(pattern);
                if (match) {
                    try {
                        const jsonStr = match[1] || match[0];
                        return JSON.parse(jsonStr);
                    } catch (parseError) {
                        continue; // Try next pattern
                    }
                }
            }

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
     * Add message to thread with attachments
     * @param {string} threadId - OpenAI thread ID
     * @param {string} content - Message content
     * @param {Array} attachments - File attachments
     */
    async addMessageToThread(threadId, content, attachments = []) {
        try {
            await this.openai.beta.threads.messages.create(threadId, {
                role: 'user',
                content: content,
                attachments: attachments
            });

            console.log(`Message added to thread ${threadId}`);

        } catch (error) {
            console.error('Error adding message to thread:', error);

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
    async analyzeCustomDeclarationDocumentWithExistingFiles(project, customDeclarationId, invoices, threadId) {
        try {
            console.log(`Starting comprehensive custom declaration analysis with existing files for project ${project.id}...`);


            // Prepare comprehensive analysis data
            const analysisData = {
                project: {
                    id: project.id,
                    title: project.title,
                    description: project.description
                },
                customDeclaration: {
                    id: customDeclarationId,
                },
                invoices: invoices.map(invoice => ({
                    id: invoice.id,
                    originalFileContent: invoice.originalFileContent,
                    translatedFileContent: invoice.translatedFileContent
                })),
                analysisTimestamp: new Date().toISOString(),
                invoiceCount: invoices.length
            };

            console.log(`Prepared analysis data for ${invoices.length} invoices and custom declaration`);

            // Create comprehensive analysis instructions
            const analysisInstructions = `You are analyzing a custom declaration (ZC document) against invoice data for comprehensive customs validation and accuracy verification.

**Analysis Context:**
- Project: ${project.title} (ID: ${project.id})
- Invoice Count: ${invoices.length}
- Analysis Type: Comprehensive customs declaration content-based comparison

**Primary Objectives:**
1. **Custom Declaration Analysis**: Extract customs declaration details, item classifications, values, and tariff codes
2. **Invoice Cross-Reference**: Compare custom declaration data against ${invoices.length} invoice(s) for accuracy and compliance
3. **Address Validation**: Cross-check billing addresses, shipping addresses, and consignee information
4. **Item Verification**: Validate item counts, weights, dimensions, descriptions, and classifications
5. **Value Validation**: Cross-reference total costs, unit prices, currency, and cost breakdowns
6. **Compliance Check**: Ensure customs compliance, proper documentation, and regulatory adherence

**Custom Declaration Focus Areas:**
- Import/export declaration numbers and references
- Origin and destination country codes and customs offices
- Item classifications (HS codes, tariff classifications)
- Declared values, quantities, weights, and measurements
- Consignee and consignor information
- Customs duties, taxes, and fees calculation
- Document references and certifications
- Shipping method and transport details

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

Follow these rules:
  1. Extract key data: MRN, LRN, acceptance/release date, procedure code, importer/exporter/representative (EORI/NIP), CN/TARIC code, countries, Incoterm, mass, values, duty/VAT (rate/base/amount/payment method), documents, status.
  2. Compare to invoice data: totals, dates, HSN, quantities, weights, and currencies.
  3. Compute weighted match score:
     - Parties 20%, Values 25%, HS/CN 20%, Weight 10%, Dates 10%, Duty/VAT 15%.
  4. Validate CN 71131100 duty (2.5%) and VAT (23%) via TARIC/ISZTAR4.
  5. Identify VAT route: Article 33a (deferred) if VAT method=G, or Normal if paid at border.
  6. Flag top issues: mismatches, invalid IDs, wrong CN, rate differences, missing documents, procedure != 4000, status != ZWOLNIONA.
  7. Produce the JSON strictly in this format.

**Response Format Requirements:**
Provide a comprehensive JSON response with the following structure:
{
  "success": true,
  "analysisType": "custom_declaration_comprehensive_validation",
  "timestamp": "ISO_TIMESTAMP",
  "projectInfo": {
    "id": PROJECT_ID,
    "title": "PROJECT_TITLE"
  },
  "customDeclarationAnalysis": {
    "fileName": "FILENAME",
    "declarationInfo": {
      "declarationNumber": "Declaration reference number",
      "declarationType": "Import/Export type",
      "issueDate": "Declaration issue date",
      "validUntil": "Declaration validity period",
      "customsOffice": "Customs office details"
    },
    "originDestination": {
      "originCountry": "Country of origin",
      "originCity": "Origin city/port",
      "destinationCountry": "Destination country",
      "destinationCity": "Destination city/port",
      "routeTransit": "Shipping route and transit points"
    },
    "partyInfo": {
      "consignor": "Exporter/consignor information",
      "consignee": "Importer/consignee information",
      "shippingAgent": "Shipping agent details",
      "customsBroker": "Customs broker information"
    },
    "items": [
      {
        "itemIndex": INDEX,
        "description": "Product description",
        "hsCode": "HS classification code",
        "quantity": "Item quantity",
        "unit": "Measurement unit",
        "weight": "Gross/net weight",
        "dimensions": "Package dimensions",
        "value": "Declared value per unit",
        "totalValue": "Total item value",
        "originCountry": "Country of origin for item",
        "purpose": "Intended use/purpose"
      }
    ],
    "financialDetails": {
      "totalValue": "Total declared value",
      "currency": "Currency code",
      "exchangeRate": "Exchange rate if applicable",
      "duties": "Calculated duties",
      "taxes": "Additional taxes",
      "fees": "Customs fees",
      "grandTotal": "Grand total amount"
    }
  },
  "invoiceComparison": {
    "matchedInvoices": [
      {
        "invoiceId": INVOICE_ID,
        "fileName": "INVOICE_FILENAME",
        "correlationScore": "Similarity percentage",
        "addressValidation": {
          "billingAddressMatch": true/false,
          "shippingAddressMatch": true/false,
          "consigneeMatch": true/false,
          "addressDifferences": ["Specific differences"]
        },
        "itemValidation": {
          "itemCountMatch": true/false,
          "quantityVariance": "Percentage difference",
          "weightVariance": "Weight difference",
          "itemDifferences": ["Specific item discrepancies"]
        },
        "financialValidation": {
          "totalCostVariance": "Cost difference percentage",
          "currencyMatch": true/false,
          "unitPriceDifferences": ["Unit price variations"],
          "taxCalculationMatch": true/false
        },
        "matches": [
          "Specific matching criteria"
        ],
        "discrepancies": [
          "Critical discrepancies requiring attention"
        ],
        "warnings": [
          "Non-critical issues to review"
        ]
      }
    ],
    "summary": {
      "totalInvoicesAnalyzed": COUNT,
      "successfulMatches": COUNT,
      "addressConsistencyScore": "Address matching percentage",
      "itemConsistencyScore": "Item data consistency percentage",
      "financialConsistencyScore": "Financial data consistency percentage",
      "overallComplianceScore": "Overall compliance rating",
      "criticalDiscrepancies": COUNT,
      "warnings": COUNT,
      "resolvedAutomatically": COUNT
    }
  },
  "complianceAssessment": {
    "regulatoryCompliance": {
      "hsCodeAccuracy": "HS code validation result",
      "countryOfOrigin": "Origin documentation status",
      "tradeAgreementEligibility": "Trade agreement compliance",
      "restrictedItemsCheck": "Restrictions verification"
    },
    "documentationCheck": {
      "requiredCertificates": ["Required certificates"],
      "missingDocuments": ["Missing documentation"],
      "validityStatus": "Document validity assessment"
    },
    "riskFactors": [
      "Identified compliance risks"
    ]
  },
  "validationResults": {
    "dataAccuracy": "Overall data accuracy percentage",
    "completenessScore": "Document completeness assessment",
    "consistencyCheck": "Cross-document consistency rating",
    "complianceStatus": "Customs compliance status",
    "readyForSubmission": true/false,
    "requiresReview": true/false
  },
  "recommendations": {
    "immediateActions": [
      "Urgent actions required"
    ],
    "improvements": [
      "Suggested data improvements"
    ],
    "complianceActions": [
      "Required compliance steps"
    ],
    "documentationUpdates": [
      "Documentation update requirements"
    ]
  },
  "processingStats": {
    "filesProcessed": COUNT,
    "contentDataAnalyzed": COUNT,
    "crossChecksPerformed": COUNT,
    "analysisDuration": "Processing time",
    "timestamp": "Completion timestamp"
  }
}

**Analysis Guidelines:**
- Prioritize customs compliance and regulatory accuracy
- Provide detailed quantitative assessments for all validations
- Highlight critical discrepancies that could cause customs delays or rejection
- Suggest specific remediation steps for identified issues

Focus on providing comprehensive customs validation that ensures accurate documentation and compliance readiness.
Return only valid JSON.`;

            // Prepare attachments array with available files
            const attachments = [];

            // Add custom declaration file if openAIFileId is available
            if (customDeclarationId) {
                attachments.push({
                    file_id: customDeclarationId,
                    tools: [{ "type": "file_search" }]
                });
            }

            // // Add invoice files if available
            // invoices.forEach(invoice => {
            //     if (invoice.openAIFileId) {
            //         attachments.push({
            //             file_id: invoice.openAIFileId,
            //             tools: [{ "type": "file_search" }]
            //         });
            //     }
            // });

            console.log(`Prepared ${attachments.length} file attachments for custom declaration analysis`);

            // Add message to thread with attachments
            await this.addMessageToThread(threadId, analysisInstructions, attachments);

            // Create run for analysis
            const run = await this.createRun(threadId, analysisInstructions);

            // Wait for completion
            const runStatus = await this.waitForRunCompletion(threadId, run.id);

            if (runStatus.status !== 'completed') {
                throw new Error(`Analysis run failed with status: ${runStatus.status}`);
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

                analysisResult = this.extractJsonFromResponse(responseText);

                if (!analysisResult) {
                    // Fallback: create structured response from text
                    analysisResult = {
                        success: true,
                        analysisType: "custom_declaration_comprehensive_validation",
                        rawResponse: responseText,
                        timestamp: new Date().toISOString(),
                        projectInfo: analysisData.project,
                        processingStats: analysisData
                    };
                }
            } else {
                throw new Error('Invalid response format from AI');
            }

            console.log('✅ Comprehensive custom declaration analysis completed successfully');

            return {
                success: true,
                analysisData: analysisResult,
                analyzedAt: new Date().toISOString(),
                filesAnalyzed: attachments.length,
                invoiceCount: invoices.length,
                projectId: project.id,
                customDeclarationId: customDeclarationId
            };

        } catch (error) {
            console.error('❌ Error in custom declaration analysis with existing files:', error);

            return {
                success: false,
                error: error.message,
                analyzedAt: new Date().toISOString(),
                filesAnalyzed: 0,
                invoiceCount: 0,
                projectId: project.id,
                customDeclarationId: customDeclarationId
            };
        }
    }

    /**
     * Analyze courier receipt document with content data
     * @param {Object} project - Project object
     * @param {Object} courierReceipt - Courier receipt object  
     * @param {Array} invoices - Array of invoice objects with content data
     * @param {string} threadId - OpenAI thread ID
     * @returns {Promise<Object>} - Analysis result object
     */
    async analyzeCourierReceiptDocumentWithContentData(project, courierReceipt, invoices, threadId) {
        try {
            console.log(`Starting comprehensive courier receipt analysis with content data for project ${project.id}...`);

            // Prepare comprehensive analysis data
            const analysisData = {
                project: {
                    id: project.id,
                    title: project.title,
                    description: project.description
                },
                courierReceipt: {
                    id: courierReceipt.id,
                    fileName: courierReceipt.fileName,
                    filePath: courierReceipt.filePath,
                    fileContent: courierReceipt.fileContent,
                    openAIFileId: courierReceipt.openAIFileId,
                    status: courierReceipt.status
                },
                invoices: invoices.map(invoice => ({
                    id: invoice.id,
                    fileName: invoice.fileName || invoice.originalFileName,
                    originalFileContent: invoice.originalFileContent,
                    translatedFileContent: invoice.translatedFileContent,
                })),
                analysisTimestamp: new Date().toISOString(),
                invoiceCount: invoices.length
            };

            console.log(`Prepared analysis data for ${invoices.length} invoices and courier receipt ${courierReceipt.fileName}`);

            // Create comprehensive analysis instructions
            const analysisInstructions = `You are analyzing a courier receipt document against invoice data for comprehensive shipping and delivery verification.

**Analysis Context:**
- Project: ${project.title} (ID: ${project.id})
- Courier Receipt: ${courierReceipt.fileName}
- Invoice Count: ${invoices.length}
- Analysis Type: Comprehensive content-based comparison

**Primary Objectives:**
1. **Courier Receipt Analysis**: Extract shipping information, delivery details, tracking data, and shipment specifics
2. **Invoice Comparison**: Compare courier receipt data against ${invoices.length} invoice(s) for accuracy and consistency
3. **Data Validation**: Identify discrepancies, missing information, and data mismatches
4. **Comprehensive Insights**: Provide detailed analysis of shipping process, delivery status, and document conformity

**Courier Receipt Focus Areas:**
- Shipping carrier information and tracking numbers
- Origin and destination addresses and routes
- Package dimensions, weight, and contents
- Delivery dates, status, and recipient information
- Shipping costs, fees, and method details
- Special instructions or handling requirements

**Invoice Cross-Reference Analysis:**
- Compare courier receipt shipping details with invoice amounts and descriptions
- Verify recipient information matches between documents
- Cross-check delivery dates with invoice dates and terms
- Validate shipping costs alignment with invoice line items
- Identify any package or item discrepancies

**Response Format Requirements:**
Provide a comprehensive JSON response with the following structure:
{
  "success": true,
  "analysisType": "courier_receipt_with_content_data",
  "timestamp": "ISO_TIMESTAMP",
  "projectInfo": {
    "id": PROJECT_ID,
    "title": "PROJECT_TITLE"
  },
  "courierReceiptAnalysis": {
    "fileName": "FILENAME",
    "shippingInfo": {
      "carrier": "Carrier name",
      "trackingNumber": "Tracking number",
      "shipDate": "Ship date",
      "estimatedDelivery": "Estimated delivery date",
      "actualDelivery": "Actual delivery date",
      "deliveryStatus": "Status",
      "packageCount": "Number of packages"
    },
    "routingInfo": {
      "origin": "Origin address",
      "destination": "Destination address", 
      "route": "Expected route",
      "distance": "Distance if available"
    },
    "packageDetails": {
      "dimensions": "Package dimensions",
      "weight": "Package weight",
      "contents": "Package contents summary",
      "value": "Declared value",
      "specialInstructions": "Special handling instructions"
    },
    "costBreakdown": {
      "shippingCost": "Primary shipping cost",
      "fees": "Additional fees breakdown",
      "totalCost": "Total shipping cost",
      "method": "Shipping method used"
    }
  },
  "invoiceComparison": {
    "matchedInvoices": [
      {
        "invoiceId": INVOICE_ID,
        "fileName": "INVOICE_FILENAME",
        "correlationScore": "Similarity percentage",
        "matches": [
          "Specific matching criteria"
        ],
        "discrepancies": [
          "Specific differences found"
        ]
      }
    ],
    "summary": {
      "totalInvoicesAnalyzed": COUNT,
      "successfulMatches": COUNT,
      "dataConsistencyScore": "Overall consistency percentage",
      "criticalDiscrepancies": COUNT,
      "warnings": COUNT
    }
  },
  "insights": {
    "keyFindings": [
      "Important discoveries from analysis"
    ],
    "recommendations": [
      "Suggested actions based on findings"
    ],
    "riskAssessment": {
      "riskLevel": "LOW|MEDIUM|HIGH",
      "riskFactors": [
        "Potential issues identified"
      ],
      "mitigationSuggestions": [
        "Recommendations to address risks"
      ]
    }
  },
  "validationResults": {
    "dataAccuracy": "Accuracy assessment",
    "completenessScore": "How complete the data is",
    "consistencyCheck": "Cross-document consistency",
    "complianceStatus": "Compliance with shipping requirements"
  },
  "processingStats": {
    "filesProcessed": COUNT,
    "contentDataAnalyzed": COUNT,
    "analysisDuration": "Processing time",
    "timestamp": "Completion timestamp"
  }
}

**Analysis Guidelines:**
- Prioritize accuracy over speed
- Provide specific, actionable insights
- Highlight critical discrepancies that require attention
- Maintain professional business language
- Include quantitative assessments where possible
- Suggest concrete next steps for any issues found

Focus on providing comprehensive, detailed analysis that will help users understand shipping status, delivery verification, and document accuracy.`;

            // Prepare attachments array with available files
            const attachments = [];

            // Add courier receipt file if openAIFileId is available
            if (courierReceipt.openAIFileId) {
                attachments.push({
                    file_id: courierReceipt.openAIFileId,
                    tools: [{ "type": "file_search" }]
                });
            }

            // // Add invoice files if available
            // invoices.forEach(invoice => {
            //     if (invoice.openAIFileId) {
            //         attachments.push({
            //             file_id: invoice.openAIFileId,
            //             tools: [{ "type": "file_search" }]
            //         });
            //     }
            // });

            console.log(`Prepared ${attachments.length} file attachments for analysis`);

            // Add message to thread with attachments
            await this.addMessageToThread(threadId, analysisInstructions, attachments);

            // Create run for analysis
            const run = await this.createRun(threadId, analysisInstructions);

            // Wait for completion
            const runStatus = await this.waitForRunCompletion(threadId, run.id);

            if (runStatus.status !== 'completed') {
                throw new Error(`Analysis run failed with status: ${runStatus.status}`);
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
                console.log('Raw AI response received:', responseText.substring(0, 500) + '...');

                analysisResult = this.extractJsonFromResponse(responseText);

                if (!analysisResult) {
                    // Fallback: create structured response from text
                    analysisResult = {
                        success: true,
                        analysisType: "courier_receipt_with_content_data",
                        rawResponse: responseText,
                        timestamp: new Date().toISOString(),
                        projectInfo: analysisData.project,
                        processingStats: analysisData
                    };
                }
            } else {
                throw new Error('Invalid response format from AI');
            }

            console.log('✅ Comprehensive courier receipt analysis completed successfully');

            return {
                success: true,
                analysisData: analysisResult,
                analyzedAt: new Date().toISOString(),
                filesAnalyzed: attachments.length,
                invoiceCount: invoices.length,
                projectId: project.id,
                courierReceiptId: courierReceipt.id
            };

        } catch (error) {
            console.error('❌ Error in courier receipt analysis with content data:', error);

            return {
                success: false,
                error: error.message,
                analyzedAt: new Date().toISOString(),
                filesAnalyzed: 0,
                invoiceCount: 0,
                projectId: project.id,
                courierReceiptId: courierReceipt.id
            };
        }
    }

}

// Create and export singleton instance
const openAIService = new OpenAIService();
module.exports = openAIService;

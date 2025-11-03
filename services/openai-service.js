const OpenAI = require('openai');
const { toFile } = require('openai');
const { CustomDeclaration } = require('../models/custom-declaration-model');
const path = require('path');
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
    async getAssistantId(type = 'invoice') {
        try {
            // Return cached assistant ID if available
            if (this.assistantId && this.assistantCreated) {
                return this.assistantId;
            }

            // Check environment variable first
            let assistantId = process.env.OPENAI_ASSISTANT_ID;
            if (type === 'invoice') {
                assistantId = process.env.OPENAI_ASSISTANT_ID;
            } else if (type === 'custom_declaration') {
                assistantId = process.env.CUSTOM_VERIFICATION_ASSISTANT_ID;
            }

            if (assistantId && assistantId !== 'your_openai_assistant_id_here' && assistantId !== 'your_custom_verification_assistant_id_here') {
                console.log(`Using existing assistant ID from environment: ${assistantId}`);
                this.assistantId = assistantId;
                this.assistantCreated = true;
                return assistantId;
            }

            // Create new assistant if none exists
            console.log('Creating new OpenAI Assistant...');

            let assistantConfig = {
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
                    },
                    {
                        type: "code_interpreter"
                    }
                ]
            };

            if (type === 'custom_declaration') {
                assistantConfig.name = "Custom Declaration Verification Assistant";
                assistantConfig.description = "Professional assistant for verifying customs declarations against invoice data.";
                assistantConfig.instructions = `You are a professional customs declaration verification assistant with expertise in:
                1. **Custom Declaration Analysis**: Extract customs declaration details, item classifications, values, and tariff codes
2. **Invoice Cross-Reference**: Compare custom declaration data against ${invoices.length} invoice(s) for accuracy and compliance
3. **Address Validation**: Cross-check billing addresses, shipping addresses, and consignee information
4. **Item Verification**: Validate item counts, weights, dimensions, descriptions, and classifications
5. **Value Validation**: Cross-reference total costs, unit prices, currency, and cost breakdowns
6. **Compliance Check**: Ensure customs compliance, proper documentation, and regulatory adherence
                `;
                assistantConfig.tools = [
                    { type: "file_search" },
                    { type: "code_interpreter" },
                    {
                        type: "function", function: {
                            name: "analyze_custom_declaration",
                            description: "Analyze a customs declaration document and return a JSON object with the analysis results.",
                            parameters: {
                                type: "object",
                                properties: {
                                    customDeclaration: { type: "string", description: "The customs declaration document to analyze." }
                                }
                            }
                        }
                    }
                ];
            }

            const assistant = await this.openai.beta.assistants.create(assistantConfig);

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
    async extractCustomDeclarationDocument(project, customDeclaration, threadId) {
        try {

            //check for customDeclaration.openAIFileId is not null
            if (!customDeclaration.openAIFileId) {
                const fullFilePath = path.join(__dirname, '..', customDeclaration.filePath);
                const openAIFileId = await this.uploadFile(fullFilePath, customDeclaration.fileName);
                await customDeclaration.update({ openAIFileId: openAIFileId.id });

                customDeclaration = await CustomDeclaration.findByPk(customDeclaration.id);
                console.log(`Custom declaration file uploaded to OpenAI with ID: ${customDeclaration.openAIFileId}`);
            }


            // Prepare comprehensive analysis data
            const analysisData = {
                project: {
                    id: project.id,
                    title: project.title,
                    description: project.description
                },
                customDeclaration: {
                    id: customDeclaration.openAIFileId,
                },
                analysisTimestamp: new Date().toISOString(),
            };
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

    async analyzeCustomDeclarationDocumentWithExistingFiles(project, customDeclaration, invoices, threadId) {
        try {
            console.log(`Starting comprehensive custom declaration analysis with existing files for project...`);

            const analysisInstructions = `You are analyzing a custom declaration (ZC document) against invoice data for comprehensive customs validation and accuracy verification.
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

Follow these rules:


**VERIFICATION CHECKLIST REQUIREMENT:**
Your analysis MUST include a comprehensive checklist with:
- ✅ MATCHED items between custom declaration and invoice
- ❌ UNMATCHED/MISMATCHED items that need attention
- ⚠️ WARNINGS for potential issues
- 📋 Priority ranking (Critical, High, Medium, Low)

**Response Format Requirements:**
Provide a comprehensive JSON response with the following structure:


**Analysis Guidelines:**
- Prioritize customs compliance and regulatory accuracy
- Provide detailed quantitative assessments for all validations
- Highlight critical discrepancies that could cause customs delays or rejection
- Suggest specific remediation steps for identified issues

Focus on providing comprehensive customs validation that ensures accurate documentation and compliance readiness.
Return only valid JSON.`;

            const customDeclarationComprehensiveValidationSchema = {
                "name": "custom_declaration_comprehensive_validation",
                "description": "Schema for analyzing and validating customs declaration documents with invoice comparison, compliance checks, and processing statistics.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "success": { "type": "boolean" },
                        "analysisType": { "type": "string" },
                        "timestamp": { "type": "string", "description": "ISO formatted timestamp" },
                        "projectInfo": {
                            "type": "object",
                            "properties": {
                                "id": { "type": "string" },
                                "title": { "type": "string" }
                            },
                            "required": []
                        },
                        "verificationChecklist": {
                            "type": "object",
                            "properties": {
                                "matchedItems": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "field": { "type": "string" },
                                            "value": { "type": "string" },
                                            "invoiceValue": { "type": "string" },
                                            "customDeclarationValue": { "type": "string" },
                                            "status": { "type": "string" },
                                            "priority": { "type": "string" }
                                        },
                                        "required": []
                                    }
                                },
                                "unmatchedItems": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "field": { "type": "string" },
                                            "invoiceValue": { "type": "string" },
                                            "customDeclarationValue": { "type": "string" },
                                            "status": { "type": "string" },
                                            "priority": { "type": "string" },
                                            "recommendation": { "type": "string" }
                                        },
                                        "required": []
                                    }
                                },
                                "summary": {
                                    "type": "object",
                                    "properties": {
                                        "totalChecked": { "type": "number" },
                                        "matchedCount": { "type": "number" },
                                        "unmatchedCount": { "type": "number" },
                                        "missingCount": { "type": "number" },
                                        "overallMatchScore": { "type": "number" }
                                    },
                                    "required": []
                                }
                            },
                            "required": []
                        },
                        "customDeclarationAnalysis": {
                            "type": "object",
                            "properties": {
                                "fileName": { "type": "string" },
                                "declarationInfo": {
                                    "type": "object",
                                    "properties": {
                                        "declarationNumber": { "type": "string" },
                                        "declarationType": { "type": "string" },
                                        "issueDate": { "type": "string" },
                                        "validUntil": { "type": "string" },
                                        "customsOffice": { "type": "string" }
                                    },
                                    "required": []
                                },
                                "originDestination": {
                                    "type": "object",
                                    "properties": {
                                        "originCountry": { "type": "string" },
                                        "originCity": { "type": "string" },
                                        "destinationCountry": { "type": "string" },
                                        "destinationCity": { "type": "string" },
                                        "routeTransit": { "type": "string" }
                                    },
                                    "required": []
                                },
                                "partyInfo": {
                                    "type": "object",
                                    "properties": {
                                        "consignor": { "type": "string" },
                                        "consignee": { "type": "string" },
                                        "shippingAgent": { "type": "string" },
                                        "customsBroker": { "type": "string" }
                                    },
                                    "required": []
                                },
                                "items": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "itemIndex": { "type": "number" },
                                            "description": { "type": "string" },
                                            "hsCode": { "type": "string" },
                                            "quantity": { "type": "string" },
                                            "unit": { "type": "string" },
                                            "weight": { "type": "string" },
                                            "dimensions": { "type": "string" },
                                            "value": { "type": "string" },
                                            "totalValue": { "type": "string" },
                                            "originCountry": { "type": "string" },
                                            "purpose": { "type": "string" }
                                        },
                                        "required": []
                                    }
                                },
                                "financialDetails": {
                                    "type": "object",
                                    "properties": {
                                        "totalValue": { "type": "string" },
                                        "currency": { "type": "string" },
                                        "exchangeRate": { "type": "string" },
                                        "duties": { "type": "string" },
                                        "taxes": { "type": "string" },
                                        "fees": { "type": "string" },
                                        "grandTotal": { "type": "string" }
                                    },
                                    "required": []
                                }
                            },
                            "required": []
                        },
                        "invoiceComparison": {
                            "type": "object",
                            "properties": {
                                "matchedInvoices": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "invoiceId": { "type": "string" },
                                            "fileName": { "type": "string" },
                                            "correlationScore": { "type": "string" },
                                            "addressValidation": {
                                                "type": "object",
                                                "properties": {
                                                    "billingAddressMatch": { "type": "boolean" },
                                                    "shippingAddressMatch": { "type": "boolean" },
                                                    "consigneeMatch": { "type": "boolean" },
                                                    "addressDifferences": {
                                                        "type": "array",
                                                        "items": { "type": "string" }
                                                    }
                                                },
                                                "required": []
                                            },
                                            "itemValidation": {
                                                "type": "object",
                                                "properties": {
                                                    "itemCountMatch": { "type": "boolean" },
                                                    "quantityVariance": { "type": "string" },
                                                    "weightVariance": { "type": "string" },
                                                    "itemDifferences": {
                                                        "type": "array",
                                                        "items": { "type": "string" }
                                                    }
                                                },
                                                "required": []
                                            },
                                            "financialValidation": {
                                                "type": "object",
                                                "properties": {
                                                    "totalCostVariance": { "type": "string" },
                                                    "currencyMatch": { "type": "boolean" },
                                                    "unitPriceDifferences": {
                                                        "type": "array",
                                                        "items": { "type": "string" }
                                                    },
                                                    "taxCalculationMatch": { "type": "boolean" }
                                                },
                                                "required": []
                                            },
                                            "matches": { "type": "array", "items": { "type": "string" } },
                                            "discrepancies": { "type": "array", "items": { "type": "string" } },
                                            "warnings": { "type": "array", "items": { "type": "string" } }
                                        },
                                        "required": []
                                    }
                                },
                                "summary": {
                                    "type": "object",
                                    "properties": {
                                        "totalInvoicesAnalyzed": { "type": "number" },
                                        "successfulMatches": { "type": "number" },
                                        "addressConsistencyScore": { "type": "string" },
                                        "itemConsistencyScore": { "type": "string" },
                                        "financialConsistencyScore": { "type": "string" },
                                        "overallComplianceScore": { "type": "string" },
                                        "criticalDiscrepancies": { "type": "number" },
                                        "warnings": { "type": "number" },
                                        "resolvedAutomatically": { "type": "number" },
                                        "matchBreakdown": {
                                            "type": "object",
                                            "properties": {
                                                "matched": { "type": "number" },
                                                "unmatched": { "type": "number" },
                                                "missing": { "type": "number" },
                                                "percentage": { "type": "string" }
                                            },
                                            "required": []
                                        }
                                    },
                                    "required": []
                                }
                            },
                            "required": []
                        },
                        "complianceAssessment": {
                            "type": "object",
                            "properties": {
                                "regulatoryCompliance": {
                                    "type": "object",
                                    "properties": {
                                        "hsCodeAccuracy": { "type": "string" },
                                        "countryOfOrigin": { "type": "string" },
                                        "tradeAgreementEligibility": { "type": "string" },
                                        "restrictedItemsCheck": { "type": "string" }
                                    },
                                    "required": []
                                },
                                "documentationCheck": {
                                    "type": "object",
                                    "properties": {
                                        "requiredCertificates": {
                                            "type": "array",
                                            "items": { "type": "string" }
                                        },
                                        "missingDocuments": {
                                            "type": "array",
                                            "items": { "type": "string" }
                                        },
                                        "validityStatus": { "type": "string" }
                                    },
                                    "required": []
                                },
                                "riskFactors": { "type": "array", "items": { "type": "string" } }
                            },
                            "required": []
                        },
                        "validationResults": {
                            "type": "object",
                            "properties": {
                                "dataAccuracy": { "type": "string" },
                                "completenessScore": { "type": "string" },
                                "consistencyCheck": { "type": "string" },
                                "complianceStatus": { "type": "string" },
                                "readyForSubmission": { "type": "boolean" },
                                "requiresReview": { "type": "boolean" }
                            },
                            "required": []
                        },
                        "recommendations": {
                            "type": "object",
                            "properties": {
                                "immediateActions": { "type": "array", "items": { "type": "string" } },
                                "improvements": { "type": "array", "items": { "type": "string" } },
                                "complianceActions": { "type": "array", "items": { "type": "string" } },
                                "documentationUpdates": { "type": "array", "items": { "type": "string" } }
                            },
                            "required": []
                        },
                        "processingStats": {
                            "type": "object",
                            "properties": {
                                "filesProcessed": { "type": "number" },
                                "contentDataAnalyzed": { "type": "number" },
                                "crossChecksPerformed": { "type": "number" },
                                "analysisDuration": { "type": "string" },
                                "timestamp": { "type": "string" }
                            },
                            "required": []
                        }
                    },
                    "required": ["success", "analysisType"]
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
            const run = await this.createRun(threadId, analysisInstructions, 'custom_declaration');

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

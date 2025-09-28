const OpenAI = require('openai');
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
     * Clean up existing runs in a thread
     * @param {string} threadId - OpenAI thread ID
     */
    async cleanupThreadRuns(threadId) {
        try {
            const existingRuns = await this.openai.beta.threads.runs.list(threadId);
            const activeRuns = existingRuns.data.filter(run =>
                run.status === 'queued' || run.status === 'in_progress'
            );

            if (activeRuns.length > 0) {
                console.log(`Found ${activeRuns.length} active runs in thread ${threadId}, cancelling them...`);
                for (const activeRun of activeRuns) {
                    try {
                        await this.openai.beta.threads.runs.cancel(threadId, activeRun.id);
                        console.log(`Cancelled run: ${activeRun.id}`);
                    } catch (cancelError) {
                        console.log(`Could not cancel run ${activeRun.id}:`, cancelError.message);
                    }
                }
            }
        } catch (error) {
            console.log('Could not cleanup thread runs:', error.message);
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

            // Clean up any existing active runs
            await this.cleanupThreadRuns(threadId);

            // Create a run to process the message
            const run = await this.openai.beta.threads.runs.create(threadId, {
                assistant_id: assistantId,
                instructions: instructions
            });

            console.log(`Created run: ${run.id} for thread: ${threadId}`);
            console.log(`Run object:`, JSON.stringify(run, null, 2));

            // Validate run object
            if (!run || !run.id) {
                throw new Error(`Invalid run object returned: ${JSON.stringify(run)}`);
            }

            return run;

        } catch (error) {
            console.error('Error creating run:', error);
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
     * Upload file to OpenAI
     * @param {string} filePath - Path to the file
     * @param {string} fileName - Name of the file
     * @returns {Promise<Object>} - Uploaded file object
     */
    async uploadFile(filePath, fileName) {
        try {
            const fs = require('fs').promises;
            const path = require('path');

            // Check file size (OpenAI limit is 512MB)
            const stats = await fs.stat(filePath);
            const fileSizeInMB = stats.size / (1024 * 1024);
            const maxSizeInMB = 500; // Leave some buffer

            console.log(`File size: ${fileSizeInMB.toFixed(2)} MB`);

            if (fileSizeInMB > maxSizeInMB) {
                throw new Error(`File too large: ${fileSizeInMB.toFixed(2)} MB. Maximum allowed: ${maxSizeInMB} MB`);
            }

            // For Excel files, try to read as text first to reduce size
            const fileExtension = path.extname(fileName).toLowerCase();
            let fileContent;

            if (fileExtension === '.xlsx' || fileExtension === '.xls') {
                // For Excel files, try to extract text content
                try {
                    const XLSX = require('xlsx');
                    const workbook = XLSX.readFile(filePath);
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const csvData = XLSX.utils.sheet_to_csv(worksheet);
                    fileContent = Buffer.from(csvData, 'utf8');
                    console.log(`Converted Excel to CSV, new size: ${(fileContent.length / (1024 * 1024)).toFixed(2)} MB`);
                } catch (excelError) {
                    console.log('Could not convert Excel to CSV, uploading as binary:', excelError.message);
                    fileContent = await fs.readFile(filePath);
                }
            } else {
                fileContent = await fs.readFile(filePath);
            }

            const uploadedFile = await this.openai.files.create({
                file: fileContent,
                purpose: 'assistants'
            });

            console.log(`File uploaded to OpenAI with ID: ${uploadedFile.id}`);
            return uploadedFile;

        } catch (error) {
            console.error('Error uploading file:', error);
            throw new Error(`Failed to upload file: ${error.message}`);
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
            throw new Error(`Failed to add message to thread: ${error.message}`);
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
     * Delete an assistant
     * @param {string} assistantId - Assistant ID
     * @returns {Promise<boolean>} - Success status
     */
    async deleteAssistant(assistantId) {
        try {
            await this.openai.beta.assistants.del(assistantId);
            console.log(`Assistant ${assistantId} deleted successfully`);
            return true;
        } catch (error) {
            console.error('Error deleting assistant:', error);
            throw new Error(`Failed to delete assistant: ${error.message}`);
        }
    }

    /**
     * Analyze courier receipt document against uploaded invoice files
     * @param {Object} project - Project object
     * @param {Object} courierReceiptFile - Uploaded courier receipt file
     * @param {string} threadId - OpenAI thread ID
     * @returns {Promise<Object>} - Analysis results
     */
    async analyzeCourierReceiptDocument(project, courierReceiptFile, threadId) {
        try {
            const { Invoice } = require('../models/invoice-model');

            // Get all invoice files for this project
            const invoices = await Invoice.findAll({
                where: {
                    projectId: project.id,
                    status: 'completed' // Only analyze completed invoices
                },
                order: [['createdAt', 'DESC']]
            });

            console.log(`Found ${invoices.length} invoice files for project ${project.id}`);

            let attachments = [];

            // Upload courier receipt file
            attachments.push({
                "file_id": courierReceiptFile.id,
                "tools": [{ "type": "file_search" }]
            });

            // Upload invoice files for comparison
            for (const invoice of invoices) {
                try {
                    if (invoice.originalFilePath || invoice.translatedFilePath) {
                        const filePath = invoice.translatedFilePath || invoice.originalFilePath;
                        const fileName = invoice.translatedFileName || invoice.originalFileName;

                        const uploadedInvoiceFile = await this.uploadFile(filePath, fileName);
                        attachments.push({
                            "file_id": uploadedInvoiceFile.id,
                            "tools": [{ "type": "file_search" }]
                        });
                        console.log(`Uploaded invoice file: ${fileName} with ID: ${uploadedInvoiceFile.id}`);
                    }
                } catch (uploadError) {
                    console.log(`Could not upload invoice file ${invoice.originalFileName}:`, uploadError.message);
                }
            }

            // Prepare the analysis prompt
            const systemPrompt = `You are a professional shipping and logistics analyst. Your task is to analyze courier receipt documents (PDFs/images) and compare them with uploaded Excel invoice files to identify shipping information, discrepancies, and provide valuable insights.

**Key Analysis Areas:**
1. **Shipping Information Extraction**: Extract tracking numbers, courier details, delivery dates, origin/destination addresses
2. **Document Comparison**: Compare shipping data between courier receipts and invoices
3. **Discrepancy Detection**: Identify mismatches in addresses, dates, tracking numbers, or shipping details
4. **Insight Generation**: Provide actionable insights about shipping efficiency, compliance, and recommendations

**Analysis Guidelines:**
- Focus on shipping-related information only
- Be thorough in comparing all relevant shipping data
- Highlight any discrepancies or missing information
- Provide clear, actionable insights
- Maintain professional shipping industry terminology

**Output Format:**
Return a JSON object with structured insights and findings.`;

            const userPrompt = `Please analyze the attached courier receipt document and compare it with the uploaded invoice files for this project.

**Analysis Requirements:**
1. Extract all shipping information from the courier receipt (tracking numbers, courier company, delivery dates, addresses, etc.)
2. Compare shipping data between the courier receipt and invoice files
3. Identify any discrepancies, missing information, or inconsistencies
4. Generate actionable insights about the shipping process

**Return the analysis as a JSON object with this structure:**
{
  "courierReceiptAnalysis": {
    "trackingNumber": "...",
    "courierCompany": "...",
    "deliveryDate": "...",
    "originAddress": "...",
    "destinationAddress": "...",
    "packageDetails": "...",
    "shippingMethod": "...",
    "deliveryStatus": "..."
  },
  "comparisonResults": {
    "addressMatches": true/false,
    "dateMatches": true/false,
    "trackingMatches": true/false,
    "discrepancies": [
      {
        "field": "...",
        "courierReceiptValue": "...",
        "invoiceValue": "...",
        "severity": "low/medium/high"
      }
    ]
  },
  "insights": [
    {
      "category": "shipping_efficiency",
      "title": "...",
      "description": "...",
      "recommendation": "...",
      "priority": "low/medium/high"
    }
  ],
  "summary": {
    "totalDiscrepancies": 0,
    "criticalIssues": 0,
    "overallShippingHealth": "good/warning/needs_attention",
    "recommendations": ["..."]
  }
}

Please provide a comprehensive analysis focusing on shipping logistics and document accuracy.`;

            // Add message to the thread with attachments
            await this.addMessageToThread(threadId, userPrompt, attachments);

            // Create a run to process the message
            const run = await this.createRun(threadId, systemPrompt);

            // Wait for the run to complete
            const runStatus = await this.waitForRunCompletion(threadId, run.id);

            if (runStatus.status === 'completed') {
                // Get the assistant's response
                const messages = await this.getThreadMessages(threadId);
                const analysisContent = messages[0].content[0].text.value;
                console.log(`Analysis content length: ${analysisContent.length} characters`);

                // Parse the analysis content as JSON
                let analysisData;
                try {
                    analysisData = JSON.parse(analysisContent);
                    console.log('Successfully parsed analysis content as JSON');
                } catch (parseError) {
                    console.log('Could not parse as JSON, treating as raw text:', parseError.message);
                    analysisData = {
                        raw_content: analysisContent,
                        parsed: false,
                        error: parseError.message
                    };
                }

                return {
                    success: true,
                    threadId: threadId,
                    runId: run.id,
                    analysisData: analysisData,
                    analyzedAt: new Date().toISOString(),
                    usage: runStatus.usage,
                    filesAnalyzed: {
                        courierReceipt: courierReceiptFile.id,
                        invoices: invoices.length
                    }
                };
            } else {
                throw new Error(`Analysis failed with status: ${runStatus.status}`);
            }

        } catch (error) {
            console.error('Error in courier receipt analysis:', error);
            throw new Error(`Failed to analyze courier receipt document: ${error.message}`);
        }
    }

    /**
     * Analyze custom declaration document with comprehensive invoice comparison
     * This method performs deep analysis comparing custom declaration with all project invoices
     * to detect mismatches, discrepancies, and provide detailed insights
     * @param {Object} project - Project object
     * @param {Object} customDeclarationFile - Custom declaration file object
     * @param {Array} invoiceFiles - Array of invoice file objects with metadata
     * @param {string} threadId - OpenAI thread ID
     * @returns {Promise<Object>} - Comprehensive analysis results
     */
    async analyzeCustomDeclarationDocument(project, customDeclarationFile, invoiceFiles, threadId) {
        try {
            console.log(`Starting comprehensive custom declaration analysis for project ${project.id}`);
            console.log(`Analyzing custom declaration against ${invoiceFiles.length} invoice files`);

            let attachments = [];

            // Upload custom declaration file
            attachments.push({
                "file_id": customDeclarationFile.id,
                "tools": [{ "type": "file_search" }]
            });

            // Upload all invoice files for comprehensive comparison
            for (const invoiceFileData of invoiceFiles) {
                attachments.push({
                    "file_id": invoiceFileData.file.id,
                    "tools": [{ "type": "file_search" }]
                });
                console.log(`Added invoice file for analysis: ${invoiceFileData.invoice.fileName} (ID: ${invoiceFileData.file.id})`);
            }

            // Prepare comprehensive analysis prompt
            const systemPrompt = `You are a professional customs clearance and international trade analyst with expertise in:
1. **Custom Declaration Analysis**: Deep analysis of customs declaration documents (PDFs)
2. **Invoice Comparison**: Comprehensive comparison between custom declarations and invoice files
3. **Mismatch Detection**: Identifying discrepancies in product details, quantities, values, classifications, and compliance
4. **Trade Compliance**: Ensuring adherence to international trade regulations and customs requirements
5. **Risk Assessment**: Evaluating potential compliance risks and trade violations

**Key Analysis Areas:**
1. **Product Information**: Compare product descriptions, HS codes, quantities, and specifications
2. **Financial Data**: Analyze declared values, currencies, and pricing discrepancies
3. **Classification Accuracy**: Verify HS codes, tariff classifications, and duty calculations
4. **Compliance Issues**: Identify missing documentation, incorrect declarations, or regulatory violations
5. **Risk Factors**: Assess potential customs delays, penalties, or compliance issues

**Analysis Guidelines:**
- Perform line-by-line comparison between custom declaration and invoice data
- Identify any discrepancies in product details, quantities, values, or classifications
- Highlight missing or incorrect information that could cause customs issues
- Provide specific recommendations for compliance improvement
- Use professional customs and international trade terminology
- Focus on actionable insights that can prevent customs delays or penalties

**Output Format:**
Return a comprehensive JSON object with detailed analysis, mismatches, and recommendations.`;

            const userPrompt = `Please perform a comprehensive analysis of the attached custom declaration document and compare it with all uploaded invoice files for this project.

**Project Context:**
- Project ID: ${project.id}
- Project Title: ${project.title || 'N/A'}
- Total Invoice Files: ${invoiceFiles.length}

**Analysis Requirements:**
1. **Extract Custom Declaration Data**: Extract all product information, HS codes, quantities, values, and classification details
2. **Compare with Invoice Data**: Perform detailed comparison with each invoice file
3. **Identify Mismatches**: Find discrepancies in:
   - Product descriptions and specifications
   - Quantities and units of measurement
   - Declared values and currencies
   - HS codes and tariff classifications
   - Country of origin information
   - Compliance documentation requirements
4. **Assess Compliance Risks**: Evaluate potential customs issues, delays, or penalties
5. **Generate Recommendations**: Provide specific actions to resolve discrepancies

**Return the analysis as a comprehensive JSON object with this structure:**
{
  "customDeclarationAnalysis": {
    "documentInfo": {
      "fileName": "...",
      "documentType": "...",
      "declarationNumber": "...",
      "declarationDate": "...",
      "declarant": "...",
      "consignee": "..."
    },
    "extractedData": {
      "totalItems": 0,
      "totalValue": "...",
      "currency": "...",
      "products": [
        {
          "lineNumber": 1,
          "productDescription": "...",
          "hsCode": "...",
          "quantity": "...",
          "unit": "...",
          "unitValue": "...",
          "totalValue": "...",
          "countryOfOrigin": "...",
          "weight": "..."
        }
      ]
    }
  },
  "invoiceComparison": {
    "totalInvoicesAnalyzed": 0,
    "comparisonResults": [
      {
        "invoiceFileName": "...",
        "matchStatus": "matched|mismatched|partial",
        "discrepancies": [
          {
            "type": "product_description|quantity|value|hs_code|origin",
            "customDeclarationValue": "...",
            "invoiceValue": "...",
            "severity": "low|medium|high|critical",
            "description": "...",
            "recommendation": "..."
          }
        ]
      }
    ]
  },
  "mismatchAnalysis": {
    "totalMismatches": 0,
    "criticalMismatches": 0,
    "highPriorityMismatches": 0,
    "mediumPriorityMismatches": 0,
    "lowPriorityMismatches": 0,
    "mismatchSummary": {
      "productDescriptionMismatches": 0,
      "quantityMismatches": 0,
      "valueMismatches": 0,
      "hsCodeMismatches": 0,
      "originMismatches": 0,
      "missingInformation": 0
    }
  },
  "complianceAssessment": {
    "overallComplianceScore": "excellent|good|fair|poor|critical",
    "riskLevel": "low|medium|high|critical",
    "potentialIssues": [
      {
        "issue": "...",
        "impact": "...",
        "likelihood": "low|medium|high",
        "recommendation": "..."
      }
    ],
    "missingDocumentation": [
      "..."
    ]
  },
  "recommendations": {
    "immediateActions": [
      "..."
    ],
    "complianceImprovements": [
      "..."
    ],
    "riskMitigation": [
      "..."
    ]
  },
  "insights": {
    "summary": "...",
    "keyFindings": [
      "..."
    ],
    "businessImpact": "...",
    "nextSteps": "..."
  }
}

Please ensure the analysis is thorough, accurate, and provides actionable insights for customs compliance.`;

            // Create or get thread
            let thread;
            if (threadId) {
                try {
                    thread = await this.openai.beta.threads.retrieve(threadId);
                } catch (error) {
                    console.log('Thread not found, creating new one');
                    thread = await this.openai.beta.threads.create();
                }
            } else {
                thread = await this.openai.beta.threads.create();
            }

            // Get assistant ID
            const assistantId = await this.getAssistantId();

            // Create message with attachments
            const message = await this.openai.beta.threads.messages.create(thread.id, {
                role: "user",
                content: userPrompt,
                attachments: attachments
            });

            console.log(`Created message with ${attachments.length} file attachments`);

            // Run the analysis
            const run = await this.openai.beta.threads.runs.create(thread.id, {
                assistant_id: assistantId,
                instructions: systemPrompt
            });

            console.log(`Started analysis run: ${run.id}`);

            // Wait for completion
            let runStatus = await this.openai.beta.threads.runs.retrieve(thread.id, run.id);
            while (runStatus.status !== 'completed' && runStatus.status !== 'failed') {
                await new Promise(resolve => setTimeout(resolve, 2000));
                runStatus = await this.openai.beta.threads.runs.retrieve(thread.id, run.id);
                console.log(`Analysis status: ${runStatus.status}`);
            }

            if (runStatus.status === 'failed') {
                throw new Error(`Analysis failed: ${runStatus.last_error?.message || 'Unknown error'}`);
            }

            // Get the response
            const messages = await this.openai.beta.threads.messages.list(thread.id);
            const latestMessage = messages.data[0];

            if (latestMessage.content[0].type === 'text') {
                const analysisText = latestMessage.content[0].text.value;
                console.log('Received analysis response');

                try {
                    // Try to parse as JSON
                    const analysisData = JSON.parse(analysisText);
                    return {
                        success: true,
                        analysisData: analysisData,
                        threadId: thread.id,
                        runId: run.id,
                        analyzedAt: new Date().toISOString(),
                        filesAnalyzed: {
                            customDeclaration: customDeclarationFile.id,
                            invoices: invoiceFiles.length
                        }
                    };
                } catch (parseError) {
                    console.error('Failed to parse analysis as JSON:', parseError);
                    return {
                        success: true,
                        analysisData: {
                            rawAnalysis: analysisText,
                            parseError: 'Analysis received but could not be parsed as JSON'
                        },
                        threadId: thread.id
                    };
                }
            } else {
                throw new Error('Unexpected response format from OpenAI');
            }

        } catch (error) {
            console.error('Error in analyzeCustomDeclarationDocument:', error);
            return {
                success: false,
                error: error.message,
                analysisData: null
            };
        }
    }

    /**
     * Analyze custom declaration document using existing files from thread
     * This method performs deep analysis comparing custom declaration with files already uploaded to the thread
     * Only uploads the new custom declaration file, references existing invoice files from thread
     * @param {Object} project - Project object
     * @param {Object} customDeclarationFile - Custom declaration file object
     * @param {Array} invoices - Array of invoice objects for context (not uploaded again)
     * @param {string} threadId - OpenAI thread ID with existing files
     * @returns {Promise<Object>} - Comprehensive analysis results
     */
    async analyzeCustomDeclarationDocumentWithExistingFiles(project, customDeclarationFile, invoices, threadId) {
        try {
            console.log(`Starting custom declaration analysis using existing files from thread ${threadId}`);
            console.log(`Analyzing custom declaration against ${invoices.length} existing invoice files`);

            let attachments = [];

            // Upload only the custom declaration file
            attachments.push({
                "file_id": customDeclarationFile.id,
                "tools": [{ "type": "file_search" }]
            });

            console.log(`Added custom declaration file for analysis: ${customDeclarationFile.id}`);

            // Prepare comprehensive analysis prompt
            const systemPrompt = `You are a professional customs clearance and international trade analyst with expertise in:
1. **Custom Declaration Analysis**: Deep analysis of customs declaration documents (PDFs)
2. **Invoice Comparison**: Comprehensive comparison between custom declarations and invoice files
3. **Mismatch Detection**: Identifying discrepancies in product details, quantities, values, classifications, and compliance
4. **Trade Compliance**: Ensuring adherence to international trade regulations and customs requirements
5. **Risk Assessment**: Evaluating potential compliance risks and trade violations

**Key Analysis Areas:**
1. **Product Information**: Compare product descriptions, HS codes, quantities, and specifications
2. **Financial Data**: Analyze declared values, currencies, and pricing discrepancies
3. **Classification Accuracy**: Verify HS codes, tariff classifications, and duty calculations
4. **Compliance Issues**: Identify missing documentation, incorrect declarations, or regulatory violations
5. **Risk Factors**: Assess potential customs delays, penalties, or compliance issues

**Analysis Guidelines:**
- Perform line-by-line comparison between custom declaration and invoice data
- Identify any discrepancies in product details, quantities, values, or classifications
- Highlight missing or incorrect information that could cause customs issues
- Provide specific recommendations for compliance improvement
- Use professional customs and international trade terminology
- Focus on actionable insights that can prevent customs delays or penalties
- Use ALL existing files in this thread for comprehensive comparison

**Output Format:**
Return a comprehensive JSON object with detailed analysis, mismatches, and recommendations.`;

            const userPrompt = `Please perform a comprehensive analysis of the attached custom declaration document and compare it with ALL existing invoice files in this thread.

**Project Context:**
- Project ID: ${project.id}
- Project Title: ${project.title || 'N/A'}
- Total Invoice Files Available: ${invoices.length}
- Thread ID: ${threadId}

**Analysis Requirements:**
1. **Extract Custom Declaration Data**: Extract all product information, HS codes, quantities, values, and classification details
2. **Compare with ALL Invoice Data**: Perform detailed comparison with ALL existing invoice files in this thread
3. **Identify Mismatches**: Find discrepancies in:
   - Product descriptions and specifications
   - Quantities and units of measurement
   - Declared values and currencies
   - HS codes and tariff classifications
   - Country of origin information
   - Compliance documentation requirements
4. **Assess Compliance Risks**: Evaluate potential customs issues, delays, or penalties
5. **Generate Recommendations**: Provide specific actions to resolve discrepancies

**Important Notes:**
- Use ALL existing files in this thread for comparison (invoices, previous analyses, etc.)
- The custom declaration is the newly uploaded file
- Compare against ALL invoice files that are already available in this thread
- Provide comprehensive analysis covering all available data

**Return the analysis as a comprehensive JSON object with this structure:**
{
  "customDeclarationAnalysis": {
    "documentInfo": {
      "fileName": "...",
      "documentType": "...",
      "declarationNumber": "...",
      "declarationDate": "...",
      "declarant": "...",
      "consignee": "..."
    },
    "extractedData": {
      "totalItems": 0,
      "totalValue": "...",
      "currency": "...",
      "products": [
        {
          "lineNumber": 1,
          "productDescription": "...",
          "hsCode": "...",
          "quantity": "...",
          "unit": "...",
          "unitValue": "...",
          "totalValue": "...",
          "countryOfOrigin": "...",
          "weight": "..."
        }
      ]
    }
  },
  "invoiceComparison": {
    "totalInvoicesAnalyzed": 0,
    "comparisonResults": [
      {
        "invoiceFileName": "...",
        "matchStatus": "matched|mismatched|partial",
        "discrepancies": [
          {
            "type": "product_description|quantity|value|hs_code|origin",
            "customDeclarationValue": "...",
            "invoiceValue": "...",
            "severity": "low|medium|high|critical",
            "description": "...",
            "recommendation": "..."
          }
        ]
      }
    ]
  },
  "mismatchAnalysis": {
    "totalMismatches": 0,
    "criticalMismatches": 0,
    "highPriorityMismatches": 0,
    "mediumPriorityMismatches": 0,
    "lowPriorityMismatches": 0,
    "mismatchSummary": {
      "productDescriptionMismatches": 0,
      "quantityMismatches": 0,
      "valueMismatches": 0,
      "hsCodeMismatches": 0,
      "originMismatches": 0,
      "missingInformation": 0
    }
  },
  "complianceAssessment": {
    "overallComplianceScore": "excellent|good|fair|poor|critical",
    "riskLevel": "low|medium|high|critical",
    "potentialIssues": [
      {
        "issue": "...",
        "impact": "...",
        "likelihood": "low|medium|high",
        "recommendation": "..."
      }
    ],
    "missingDocumentation": [
      "..."
    ]
  },
  "recommendations": {
    "immediateActions": [
      "..."
    ],
    "complianceImprovements": [
      "..."
    ],
    "riskMitigation": [
      "..."
    ]
  },
  "insights": {
    "summary": "...",
    "keyFindings": [
      "..."
    ],
    "businessImpact": "...",
    "nextSteps": "..."
  }
}

Please ensure the analysis is thorough, accurate, and provides actionable insights for customs compliance. Use ALL available files in this thread for comprehensive comparison.`;

            // Create or get thread
            let thread;
            if (threadId) {
                try {
                    thread = await this.openai.beta.threads.retrieve(threadId);
                    console.log(`Retrieved existing thread: ${threadId}`);
                } catch (error) {
                    console.log('Thread not found, creating new one');
                    thread = await this.openai.beta.threads.create();
                }
            } else {
                thread = await this.openai.beta.threads.create();
            }

            // Get assistant ID
            const assistantId = await this.getAssistantId();

            // Create message with attachments
            const message = await this.openai.beta.threads.messages.create(thread.id, {
                role: "user",
                content: userPrompt,
                attachments: attachments
            });

            console.log(`Created message with ${attachments.length} file attachments`);

            // Run the analysis
            const run = await this.openai.beta.threads.runs.create(thread.id, {
                assistant_id: assistantId,
                instructions: systemPrompt
            });

            console.log(`Started analysis run: ${run.id}`);

            // Wait for completion
            let runStatus = await this.openai.beta.threads.runs.retrieve(thread.id, run.id);
            while (runStatus.status !== 'completed' && runStatus.status !== 'failed') {
                await new Promise(resolve => setTimeout(resolve, 2000));
                runStatus = await this.openai.beta.threads.runs.retrieve(thread.id, run.id);
                console.log(`Analysis status: ${runStatus.status}`);
            }

            if (runStatus.status === 'failed') {
                throw new Error(`Analysis failed: ${runStatus.last_error?.message || 'Unknown error'}`);
            }

            // Get the response
            const messages = await this.openai.beta.threads.messages.list(thread.id);
            const latestMessage = messages.data[0];

            if (latestMessage.content[0].type === 'text') {
                const analysisText = latestMessage.content[0].text.value;
                console.log('Received analysis response');

                try {
                    // Try to parse as JSON
                    const analysisData = JSON.parse(analysisText);
                    return {
                        success: true,
                        analysisData: analysisData,
                        threadId: thread.id,
                        runId: run.id,
                        analyzedAt: new Date().toISOString(),
                        filesAnalyzed: {
                            customDeclaration: customDeclarationFile.id,
                            existingInvoices: invoices.length,
                            threadFiles: 'all_existing_files'
                        }
                    };
                } catch (parseError) {
                    console.error('Failed to parse analysis as JSON:', parseError);
                    return {
                        success: true,
                        analysisData: {
                            rawAnalysis: analysisText,
                            parseError: 'Analysis received but could not be parsed as JSON'
                        },
                        threadId: thread.id
                    };
                }
            } else {
                throw new Error('Unexpected response format from OpenAI');
            }

        } catch (error) {
            console.error('Error in analyzeCustomDeclarationDocumentWithExistingFiles:', error);
            return {
                success: false,
                error: error.message,
                analysisData: null
            };
        }
    }
}

// Create and export singleton instance
const openAIService = new OpenAIService();
module.exports = openAIService;

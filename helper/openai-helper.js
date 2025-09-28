const crypto = require('crypto');
const moment = require('moment');
const fs = require('fs').promises;
const path = require('path');
const { Invoice } = require('../models/invoice-model');
const openAIService = require('../services/openai-service');
const invoiceTemplateService = require('../services/invoice-template-service');

class OpenAIHelper {
    constructor() {
        // Translation output directory
        this.translationDir = path.join(__dirname, '../media/invoices/translations');
        this.ensureTranslationDirectory();
    }

    /**
     * Ensure translation directory exists
     */
    async ensureTranslationDirectory() {
        try {
            await fs.access(this.translationDir);
        } catch (error) {
            await fs.mkdir(this.translationDir, { recursive: true });
            console.log('Created translation directory:', this.translationDir);
        }
    }

    /**
     * Create a new OpenAI thread ID for conversation
     * @returns {Promise<string>} - OpenAI thread ID
     */
    async createConversationId() {
        return await openAIService.createThread();
    }

    /**
     * Translate invoice files and save to filesystem (runs asynchronously in background)
     * @param {Object} invoiceData - Invoice data to translate
     * @param {string} targetLanguage - Target language for translation
     * @param {string} currency - Currency for the invoice
     * @param {string} threadId - OpenAI thread ID for tracking
     * @returns {Promise} - Returns file path when translation is complete
     */
    async translateInvoice(invoiceData, threadId) {
        return new Promise(async (resolve, reject) => {
            try {
                // Validate threadId
                if (!threadId || typeof threadId !== 'string') {
                    throw new Error(`Invalid threadId: ${threadId}. Expected a valid string.`);
                }

                let attachments = [];
                let originalFileContent = null;
                console.log(`Starting translation for thread ${threadId}...`);
                console.log(`invoiceData: `, invoiceData);

                if (invoiceData.originalFilePath) {
                    // Read the file content
                    const fullFilePath = path.join(__dirname, '..', invoiceData.originalFilePath);
                    console.log(`Reading file from: ${fullFilePath}`);

                    try {
                        const fileExtension = invoiceData.originalFileName.split('.').pop().toLowerCase();

                        // Handle different file types
                        if (fileExtension === 'xlsx' || fileExtension === 'xls') {
                            // For Excel files, convert to CSV for better processing
                            try {
                                const XLSX = require('xlsx');
                                const workbook = XLSX.readFile(fullFilePath);
                                const sheetName = workbook.SheetNames[0];
                                const worksheet = workbook.Sheets[sheetName];
                                originalFileContent = XLSX.utils.sheet_to_csv(worksheet);
                                console.log(`Excel converted to CSV, content length: ${originalFileContent.length} characters`);
                            } catch (excelError) {
                                console.log('Could not convert Excel, reading as text:', excelError.message);
                                originalFileContent = await fs.readFile(fullFilePath, 'utf8');
                            }
                        } else {
                            originalFileContent = await fs.readFile(fullFilePath, 'utf8');
                        }

                        console.log(`File content length: ${originalFileContent.length} characters`);

                        // Try to upload file if it's not too large
                        try {
                            const tempFilePath = path.join(__dirname, '../temp', `temp_${Date.now()}_${invoiceData.originalFileName}`);
                            await fs.mkdir(path.dirname(tempFilePath), { recursive: true });
                            await fs.writeFile(tempFilePath, originalFileContent, 'utf8');

                            const uploadedFile = await openAIService.uploadFile(tempFilePath, invoiceData.originalFileName);

                            attachments.push({
                                "file_id": uploadedFile.id,
                                "tools": [{ "type": "file_search" }]
                            });

                            console.log(`File uploaded to OpenAI with ID: ${uploadedFile.id}`);

                            // Clean up temp file
                            await fs.unlink(tempFilePath);

                        } catch (uploadError) {
                            console.log(`File upload failed (${uploadError.message}), using content directly in prompt`);
                            // Continue without file attachment - content will be in the prompt 
                            Invoice.update(
                                {
                                    insights: uploadError.message,
                                },
                                { where: { id: invoiceData.id } }
                            );
                        }

                    } catch (fileError) {
                        console.error(`Error reading file ${fullFilePath}:`, fileError);
                        throw new Error(`Failed to read file: ${fileError.message}`);
                    }
                }

                // Prepare the translation prompt
                const systemPrompt = `You are a professional invoice translation assistant. Translate the following invoice data to ${invoiceData.language} while maintaining the original structure and formatting. Convert currency values to ${invoiceData.currency} format. Preserve all numerical data, dates, and business information accurately. You are an assistant that extracts structured data 
from Excel invoice files, translates field labels, and applies currency conversion.
Return a valid JSON object only`;

                const userPrompt = `You are given the invoice data below:

${originalFileContent ? originalFileContent.slice(0, 1000) : 'No file content available'}

Your task is to extract the following key fields and output them in JSON:

merchant_exporter
invoice_number
invoice_date
exporter_reference
consignee
buyer
pre_carriage_by
place_of_receipt
vessel_number
port_of_loading
port_of_discharge
final_destination
country_of_origin_of_goods
country_of_final_destination
terms
banker
account_code
swift_code
ad_code

- Line items (description, hsn_code, uom, quantity, rate, amount).
- Totals (fob total or grand total if available).

Translate field labels into language: {target_language}.
Convert all amounts from {currency_conversion['source_currency']} 
to {currency_conversion['target_currency']} using exchange rate {currency_conversion['exchange_rate']}.

Output JSON with both original and converted values, 
with structure like this:

{{
  "merchant_exporter": "...",
  "invoice_number": "...",
  "invoice_date": "...",
  "exporter_reference": "...",
  "consignee": "...",
  "buyer": "...",
  "pre_carriage_by": "...",
  "place_of_receipt": "...",
  "vessel_number": "...",
  "port_of_loading": "...",
  "port_of_discharge": "...",
  "final_destination": "...",
  "country_of_origin_of_goods": "...",
  "country_of_final_destination": "...",
  "terms": "...",
  "banker": "...",
  "account_code": "...",
  "swift_code": "...",
  "ad_code": "...",
  "items": [
    {{
      "description": {{"en": "...", "{target_language}": "..."}},
      "hsn_code": "...",
      "uom": "...",
      "quantity": 0,
      "rate": {{
        "value": 0,
        "currency": "{currency_conversion['source_currency']}",
        "converted_value": 0,
        "converted_currency": "{currency_conversion['target_currency']}"
      }},
      "amount": {{
        "value": 0,
        "currency": "{currency_conversion['source_currency']}",
        "converted_value": 0,
        "converted_currency": "{currency_conversion['target_currency']}"
      }}
    }}
  ],
  "totals": {{
    "fob_total": {{
      "value": 0,
      "currency": "{currency_conversion['source_currency']}",
      "converted_value": 0,
      "converted_currency": "{currency_conversion['target_currency']}"
    }}
  }}
}}
`;


                // Add message to the thread with attachments
                await openAIService.addMessageToThread(threadId, userPrompt, attachments);

                // Create a run to process the message
                const run = await openAIService.createRun(threadId, systemPrompt);

                // Wait for the run to complete
                const runStatus = await openAIService.waitForRunCompletion(threadId, run.id);

                if (runStatus.status === 'completed') {
                    // Get the assistant's response
                    const messages = await openAIService.getThreadMessages(threadId);
                    const translatedContent = messages[0].content[0].text.value;
                    console.log(`Translation content length: ${translatedContent.length} characters`);

                    // Parse the translated content as JSON
                    let translatedData;
                    try {
                        translatedData = JSON.parse(translatedContent);
                        console.log('Successfully parsed translated content as JSON');
                    } catch (parseError) {
                        console.log('Could not parse as JSON, treating as raw text:', parseError.message);
                        translatedData = {
                            raw_content: translatedContent,
                            parsed: false
                        };
                    }

                    // Generate file with same extension as original
                    const fileInfo = await invoiceTemplateService.generateInvoiceFile(
                        translatedData,
                        invoiceData.originalFileName,
                        invoiceData.originalFilePath,
                        this.translationDir,
                        {
                            currencyConversion: {
                                exchangeRate: invoiceData.exchangeRate || 1,
                                sourceCurrency: invoiceData.currency || 'USD',
                                targetCurrency: invoiceData.exchangeCurrency || 'USD'
                            },
                            targetLanguage: invoiceData.translatedLanguage || 'Polish'
                        }
                    );

                    console.log(`Translation file generated: ${fileInfo.filePath}`);

                    // Prepare the output data
                    const outputData = {
                        threadId: threadId,
                        runId: run.id,
                        originalLanguage: 'auto-detected',
                        targetLanguage: invoiceData.translatedLanguage,
                        currency: invoiceData.currency,
                        translatedAt: moment().toISOString(),
                        originalData: invoiceData,
                        translatedData: translatedData,
                        usage: runStatus.usage,
                        generatedFile: fileInfo
                    };

                    // Save metadata as JSON
                    const metadataPath = path.join(this.translationDir, `metadata_${threadId}_${moment().format('YYYYMMDD_HHmmss')}.json`);
                    await fs.writeFile(metadataPath, JSON.stringify(outputData, null, 2), 'utf8');

                    await Invoice.update(
                        {
                            translatedFileContent: JSON.stringify(translatedData),
                            translatedFilePath: fileInfo.filePath,
                            translatedFileName: fileInfo.fileName,
                            status: "completed",
                        },
                        { where: { id: invoiceData.id } }
                    );

                    resolve({
                        success: true,
                        threadId: threadId,
                        runId: run.id,
                        filePath: fileInfo.filePath,
                        fileName: fileInfo.fileName,
                        metadataPath: metadataPath,
                        translatedAt: outputData.translatedAt,
                        usage: runStatus.usage
                    });
                } else {
                    throw new Error(`Translation failed with status: ${runStatus.status}`);
                }

            } catch (error) {
                console.error(`Error in translation for thread ${threadId}:`, error);

                // Update invoice status to failed
                try {
                    await Invoice.update(
                        {
                            status: "failed",
                        },
                        { where: { id: invoiceData.id } }
                    );
                } catch (updateError) {
                    console.error('Failed to update invoice status:', updateError);
                }

                reject({
                    success: false,
                    threadId: threadId,
                    error: error.message,
                    failedAt: moment().toISOString()
                });
            }
        });
    }

    async analyzeShippingService(project, shippingService) {

        return new Promise(async (resolve, reject) => {
            try {
                const threadId = project.aiConversation;
                const shippingServiceDocument = shippingService.document;

                resolve(aiResponse);
            } catch (error) {
                console.error(`Error analyzing shipping service: ${error}`);
                reject(error);
            }
        });
    }

    async analyzeCourierReceiptDocument(project, courierReceipt) {
        return new Promise(async (resolve, reject) => {
            try {
                console.log(`Starting courier receipt analysis for project ${project.id}...`);

                const threadId = project.aiConversation;
                const courierReceiptDocument = courierReceipt.filePath;
                const courierReceiptFileName = courierReceipt.fileName;

                // Upload the courier receipt file to OpenAI
                const courierReceiptDocumentFile = await openAIService.uploadFile(courierReceiptDocument, courierReceiptFileName);
                console.log(`Courier receipt file uploaded with ID: ${courierReceiptDocumentFile.id}`);

                // Analyze the courier receipt document against invoice files
                const aiResponse = await openAIService.analyzeCourierReceiptDocument(project, courierReceiptDocumentFile, threadId);

                console.log(`Analysis completed successfully for courier receipt: ${courierReceiptFileName}`);

                // Update courier receipt with insights
                if (aiResponse.success && aiResponse.analysisData) {
                    const { CourierReceipt } = require('../models/courier-receipt-model');

                    await CourierReceipt.update(
                        {
                            insights: JSON.stringify(aiResponse.analysisData),
                            status: "completed"
                        },
                        { where: { id: courierReceipt.id } }
                    );

                    console.log(`Courier receipt ${courierReceipt.id} updated with insights`);
                }

                resolve(aiResponse);
            } catch (error) {
                console.error(`Error analyzing courier receipt document: ${error}`);

                // Update courier receipt status to failed
                try {
                    const { CourierReceipt } = require('../models/courier-receipt-model');
                    await CourierReceipt.update(
                        {
                            status: "failed",
                            insights: JSON.stringify({ error: error.message })
                        },
                        { where: { id: courierReceipt.id } }
                    );
                } catch (updateError) {
                    console.error('Failed to update courier receipt status:', updateError);
                }

                reject(error);
            }
        });
    }

    /**
     * Analyze custom declaration document with comprehensive invoice comparison
     * This method performs deep analysis comparing custom declaration with existing files in thread
     * Uses already uploaded files from threadId for reference, only uploads latest custom declaration
     * @param {Object} project - Project object
     * @param {Object} customDeclaration - Custom declaration object
     * @param {Array} invoices - Array of invoice objects for context (not uploaded again)
     * @returns {Promise} - Analysis results
     */
    async analyzeCustomDeclarationDocument(project, customDeclaration, invoices) {
        return new Promise(async (resolve, reject) => {
            try {
                console.log(`Starting comprehensive custom declaration analysis for project ${project.id}...`);
                console.log(`Using existing files from thread, analyzing ${invoices.length} invoices against custom declaration...`);

                const threadId = project.aiConversation;
                const customDeclarationDocument = customDeclaration.filePath;
                const customDeclarationFileName = customDeclaration.fileName;

                // Upload only the custom declaration file to OpenAI
                const customDeclarationDocumentFile = await openAIService.uploadFile(customDeclarationDocument, customDeclarationFileName);
                console.log(`Custom declaration file uploaded with ID: ${customDeclarationDocumentFile.id}`);

                // Use existing files from thread instead of re-uploading invoices
                console.log(`Using existing files from thread: ${threadId}`);
                console.log(`Invoice context: ${invoices.length} invoices available for reference`);

                // Perform comprehensive analysis using existing thread files
                const aiResponse = await openAIService.analyzeCustomDeclarationDocumentWithExistingFiles(
                    project,
                    customDeclarationDocumentFile,
                    invoices,
                    threadId
                );

                console.log(`Comprehensive analysis completed successfully for custom declaration: ${customDeclarationFileName}`);

                // Update custom declaration with insights
                if (aiResponse.success && aiResponse.analysisData) {
                    const { CustomDeclaration } = require('../models/custom-declaration-model');

                    await CustomDeclaration.update(
                        {
                            insights: JSON.stringify(aiResponse.analysisData),
                            status: "completed"
                        },
                        { where: { id: customDeclaration.id } }
                    );

                    console.log(`Custom declaration ${customDeclaration.id} updated with comprehensive insights`);
                }

                resolve(aiResponse);
            } catch (error) {
                console.error(`Error analyzing custom declaration document: ${error}`);

                // Update custom declaration status to failed
                try {
                    const { CustomDeclaration } = require('../models/custom-declaration-model');
                    await CustomDeclaration.update(
                        {
                            status: "failed",
                            insights: JSON.stringify({ error: error.message })
                        },
                        { where: { id: customDeclaration.id } }
                    );
                } catch (updateError) {
                    console.error('Failed to update custom declaration status:', updateError);
                }

                reject(error);
            }
        });
    }


}

// Create and export singleton instance
const openAIHelper = new OpenAIHelper();
module.exports = openAIHelper;

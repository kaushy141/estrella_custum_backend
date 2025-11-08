const path = require('path');
const moment = require('moment');
const openAIService = require('../services/openai-service');
const { Invoice } = require('../models/invoice-model');
const { CourierReceipt } = require('../models/courier-receipt-model');
const { CustomDeclaration } = require('../models/custom-declaration-model');
const { generateTranslatedInvoiceFile } = require('./invoice-helper');
class OpenAIHelper {
    /**
     * Create a new OpenAI conversation thread
     * @returns {Promise<string>} - OpenAI thread ID
     */
    async createConversationId() {
        try {
            console.log('Creating new OpenAI conversation thread...');
            const threadId = await openAIService.createThread();
            console.log(`✅ Created new conversation thread: ${threadId}`);
            return threadId;
        } catch (error) {
            console.error('Error creating conversation thread:', error);
            throw new Error(`Failed to create conversation thread: ${error.message}`);
        }
    }

    /**
     * Translate invoice data using OpenAI
     * @param {Object} invoiceData - Invoice data object containing id, originalFilePath, originalFileName, language, translatedLanguage, currency, etc.
     * @param {string} threadId - OpenAI thread ID for tracking
     * @returns {Promise} - Returns file path when translation is complete
     */
    async translateInvoice(invoiceData, threadId) {
        try {
            // Validate threadId
            if (!threadId || typeof threadId !== 'string') {
                throw new Error(`Invalid threadId: ${threadId}. Expected a valid string.`);
            }

            // Extract parameters from invoiceData object
            const language = invoiceData.language;
            const targetLanguage = invoiceData.translatedLanguage || invoiceData.language;
            const currency = invoiceData.currency;
            const exchangeCurrency = invoiceData.exchangeCurrency;

            // Parse exchangeRate and convert to number, default to 1 if invalid
            let exchangeRate = parseFloat(invoiceData.exchangeRate);
            if (isNaN(exchangeRate) || exchangeRate <= 0) {
                console.warn(`Invalid exchangeRate: ${invoiceData.exchangeRate}, defaulting to 1`);
                exchangeRate = 1;
            }

            // Parse originalFileContent to extract totalCIFAmount
            let totalCIFAmount = 0;
            try {
                const parsedContent = typeof invoiceData.originalFileContent === 'string'
                    ? JSON.parse(invoiceData.originalFileContent)
                    : invoiceData.originalFileContent;
                totalCIFAmount = parseFloat(parsedContent.totalCIFAmount);
                if (isNaN(totalCIFAmount)) {
                    console.warn(`Invalid totalCIFAmount: ${parsedContent.totalCIFAmount}, defaulting to 0`);
                    totalCIFAmount = 0;
                }
            } catch (parseError) {
                console.error(`Error parsing originalFileContent: ${parseError.message}`);
                totalCIFAmount = 0;
            }

            // Calculate converted total value
            const convertedTotalValue = (totalCIFAmount * exchangeRate).toFixed(2);

            let attachments = [];

            const userPrompt = `Input JSON:
${invoiceData.originalFileContent}

Task:
- Translate ONLY string values from ${language} to ${targetLanguage}
- Replace JSON value of key "conversionRate" to ${exchangeRate} value
- Replace JSON value of key "totalValue" to ${convertedTotalValue} value
- Convert the value of key "totalValueWords" to "${targetLanguage}" number to its correct ${targetLanguage} cardinal form.
- Use correct ${targetLanguage} grammar and spacing. Example: For ${targetLanguage} 1000 use "tysiąc" (not "jeden tysiąc"); for 1,000,000 use "milion" (not "jeden milion") where appropriate.
- For decimals use in ${targetLanguage} "przecinek" as the separator and read each decimal digit separately (e.g., 3.14 -> "trzy przecinek jeden cztery").
- If the input is 0, return "zero".
- Keep the exact same JSON structure, keys, arrays, and numeric values
- Do NOT add, remove, or rename fields
- Preserve numbers, IDs, dates, and formats as-is; translate human-readable strings only
- Output VALID JSON only. No prose. No markdown. No code fences.`;


            console.log(`User prompt: ${userPrompt}`);

            const systemPrompt = `You are a JSON translation API.

Rules:
- Read the provided JSON and translate ONLY string values from ${language} to ${targetLanguage}
- Keep structure, keys, arrays, numbers, and dates unchanged
- Do not include explanations or markdown; output raw JSON only
- If a value is non-string, leave it unchanged

Output:
- Return valid JSON in the exact same structure as the input.`;

            // Add message to the thread with attachments
            await openAIService.addMessageToThread(threadId, userPrompt, attachments,);

            // Create a run to process the message with robust retry strategy
            let run;
            let runStatus;

            // Attempt 1: JSON mode + low temperature
            try {
                run = await openAIService.createRun(threadId, systemPrompt, 'invoice', { responseFormat: { type: 'json_object' }, temperature: 0 });
                runStatus = await openAIService.waitForRunCompletion(threadId, run.id);
            } catch (e) {
                console.log('Run creation or wait failed (attempt 1):', e.message);
            }

            // Attempt 2: if server error or not completed, try without response_format
            if (!runStatus || runStatus.status !== 'completed') {
                const lastErr = runStatus?.last_error;
                if (lastErr) {
                    console.log('Attempt 1 last_error:', JSON.stringify(lastErr));
                }
                console.log('Retrying run without response_format (attempt 2)...');
                run = await openAIService.createRun(threadId, systemPrompt, 'invoice', { temperature: 0 });
                runStatus = await openAIService.waitForRunCompletion(threadId, run.id);
            }

            // Attempt 3: if still not completed, simplify prompt and try once more
            if (runStatus.status !== 'completed') {
                const minimalSystemPrompt = `You are a strict JSON translation API.

Rules:
- Read values from the provided JSON only
- Translate text values from ${language} to ${targetLanguage}
- Convert currency values from ${currency} to ${exchangeCurrency}
- Output valid JSON only. No prose, no markdown.
`;
                console.log('Retrying with minimal system prompt (attempt 3)...');
                run = await openAIService.createRun(threadId, minimalSystemPrompt, 'invoice', { temperature: 0 });
                runStatus = await openAIService.waitForRunCompletion(threadId, run.id);
            }

            if (runStatus.status === 'completed') {
                // Get the assistant's response
                const messages = await openAIService.getThreadMessages(threadId);
                const translatedContent = messages[0].content[0].text.value;

                const translatedFilePath = await generateTranslatedInvoiceFile(invoiceData.originalFilePath, JSON.parse(translatedContent));
                const translatedFileName = path.basename(translatedFilePath);

                console.log(`Translated invoice filepath`, translatedFilePath);

                let invoice = await Invoice.findByPk(invoiceData.id);
                await invoice.update(
                    {
                        status: "completed",
                        translatedFilePath: translatedFilePath,
                        translatedFileName: translatedFileName,
                        translatedFileContent: translatedContent,
                    }
                );

                return {
                    success: true,
                    threadId: threadId,
                    runId: run.id,
                    filePath: translatedFilePath,
                    fileName: translatedFileName,
                    translatedAt: new Date().toISOString(),
                    usage: runStatus.usage,
                    insights: "Translation completed successfully",
                };
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
                        insights: error.message,
                    },
                    { where: { id: invoiceData.id } }
                );
            } catch (updateError) {
                console.error('Failed to update invoice status:', updateError);
            }

            throw error;
        }
    }

    async analyzeShippingService(project, shippingService) {
        try {
            const threadId = project.aiConversation;
            const shippingServiceDocument = shippingService.document;

            const aiResponse = await openAIService.analyzeShippingServiceDocument(project, shippingService, threadId);

            return aiResponse;
        } catch (error) {
            console.error(`Error analyzing shipping service: ${error}`);
            throw error;
        }
    }

    async analyzeCourierReceiptDocument(project, courierReceipt) {
        try {
            console.log(`Starting comprehensive courier receipt analysis for project ${project.id}...`);

            const threadId = project.aiConversation;
            let uploadedFile = null;

            // Upload the file directly without conversion
            const fullFilePath = path.join(__dirname, '..', courierReceipt.filePath);
            console.log(`Uploading file from: ${fullFilePath}`);

            try {
                uploadedFile = await openAIService.uploadFile(fullFilePath, courierReceipt.fileName);
                await CourierReceipt.update({ openAIFileId: uploadedFile.id }, { where: { id: courierReceipt.id } });
                // Keep the in-memory instance in sync so downstream steps can access the file immediately
                courierReceipt.openAIFileId = uploadedFile.id;
                console.log(`File uploaded to OpenAI with ID: ${uploadedFile.id}`);
            } catch (uploadError) {
                console.log(`File upload failed (${uploadError.message}), continuing without file attachment`);
                // Continue without file attachment - will rely on prompt content
                CourierReceipt.update(
                    {
                        insights: uploadError.message,
                    },
                    { where: { id: courierReceipt.id } }
                );
                uploadedFile = null;
            }

            // Get all invoices for this project to include in analysis
            const { Invoice } = require('../models/invoice-model');
            const { Op } = require('sequelize');
            const invoices = await Invoice.findAll({
                where: {
                    projectId: project.id,
                    originalFileContent: { [Op.ne]: null } // Only invoices that have been uploaded to OpenAI
                },
                order: [['createdAt', 'DESC']]
            });

            console.log(`Found ${invoices.length} invoices for courier receipt analysis`);

            // Use the new comprehensive analysis function that includes content data
            await CourierReceipt.update(
                { status: "processing" },
                { where: { id: courierReceipt.id } }
            );

            const aiResponse = await openAIService.analyzeCourierReceiptDocumentWithContentData(project, courierReceipt, invoices, threadId);

            console.log(`Two-phase analysis completed for courier receipt: ${courierReceipt.fileName}`);

            if (aiResponse.extraction?.success && aiResponse.extraction.data) {
                const extractionPayload = JSON.stringify(aiResponse.extraction.data);

                await CourierReceipt.update(
                    {
                        fileContent: extractionPayload,
                        status: "processing"
                    },
                    { where: { id: courierReceipt.id } }
                );

                console.log(`✅ Extraction data stored for courier receipt ${courierReceipt.id} (length: ${extractionPayload.length} chars)`);
            } else if (aiResponse.extraction && !aiResponse.extraction.success) {
                const extractionErrorInsights = {
                    success: false,
                    stage: "courier_shipment_extraction",
                    error: aiResponse.extraction.error,
                    metadata: {
                        courierReceiptId: courierReceipt.id,
                        projectId: project.id,
                        generatedAt: aiResponse.extraction.generatedAt
                    }
                };

                await CourierReceipt.update(
                    {
                        status: "failed",
                        insights: JSON.stringify(extractionErrorInsights)
                    },
                    { where: { id: courierReceipt.id } }
                );

                console.log(`❌ Extraction failed for courier receipt ${courierReceipt.id}: ${aiResponse.extraction.error}`);
                return aiResponse;
            }

            if (aiResponse.validation?.success && aiResponse.validation.data) {
                const insightsData = {
                    ...aiResponse.validation.data,
                    metadata: {
                        ...(aiResponse.validation.data.metadata || {}),
                        analysisType: "courier_shipment_validation",
                        courierReceiptId: courierReceipt.id,
                        courierReceiptFileName: courierReceipt.fileName,
                        projectId: project.id,
                        projectTitle: project.title,
                        invoicesAnalyzed: invoices.length,
                        extractionRunId: aiResponse.extraction?.runId || null,
                        validationRunId: aiResponse.validation.runId || null,
                        generatedAt: aiResponse.validation.generatedAt || new Date().toISOString()
                    }
                };

                await CourierReceipt.update(
                    {
                        insights: JSON.stringify(insightsData),
                        status: "completed"
                    },
                    { where: { id: courierReceipt.id } }
                );

                console.log(`✅ Validation insights stored for courier receipt ${courierReceipt.id}`);
            } else if (aiResponse.validation) {
                const validationErrorInsights = {
                    success: false,
                    stage: "courier_shipment_validation",
                    error: aiResponse.validation.error,
                    metadata: {
                        courierReceiptId: courierReceipt.id,
                        projectId: project.id,
                        invoicesAnalyzed: invoices.length,
                        generatedAt: aiResponse.validation.generatedAt || new Date().toISOString(),
                        extractionSucceeded: !!aiResponse.extraction?.success
                    }
                };

                await CourierReceipt.update(
                    {
                        insights: JSON.stringify(validationErrorInsights),
                        status: "failed"
                    },
                    { where: { id: courierReceipt.id } }
                );

                console.log(`❌ Validation failed for courier receipt ${courierReceipt.id}: ${aiResponse.validation.error}`);
            }

            return aiResponse;
        } catch (error) {
            console.error(`Error analyzing courier receipt document: ${error}`);

            // Update courier receipt status to failed with detailed error insights 
            try {


                const errorInsights = {
                    success: false,
                    error: {
                        message: error.message,
                        timestamp: new Date().toISOString(),
                        courierReceiptId: courierReceipt.id,
                        courierReceiptFileName: courierReceipt.fileName,
                        projectId: project.id,
                        projectTitle: project.title,
                        stage: "courier_receipt_analysis_failed",
                        possibleCauses: [
                            "File upload to OpenAI failed",
                            "OpenAI API service unavailable",
                            "Analysis timeout or response parsing error",
                            "File format not supported by OpenAI",
                            "Network connectivity issues"
                        ],
                        nextSteps: [
                            "Check courier receipt file format and size",
                            "Verify OpenAI API configuration",
                            "Retry analysis after resolving network issues",
                            "Contact support if issue persists"
                        ]
                    },
                    metadata: {
                        analysisType: "courier_receipt_error_analysis",
                        generatedBy: "OpenAI Error Handler"
                    }
                };

                const updateResult = await CourierReceipt.update(
                    {
                        status: "failed",
                        insights: JSON.stringify(errorInsights)
                    },
                    { where: { id: courierReceipt.id } }
                );

                console.log(`❌ Courier receipt ${courierReceipt.id} marked as failed`);
                console.log(`❌ Update result:`, updateResult);

                // Verify the error update
                const updatedRecord = await CourierReceipt.findByPk(courierReceipt.id);
                if (updatedRecord && updatedRecord.status === "failed") {
                    console.log(`✅ Verification: Courier receipt ${courierReceipt.id} status updated to 'failed'`);
                    console.log(`✅ Verification: Error insights stored successfully`);
                }

            } catch (updateError) {
                console.error('❌ Failed to update courier receipt status to failed:', updateError);
                console.error('❌ This indicates a serious database connectivity issue');
            }

            throw error;
        }
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

    /**
     * Delete OpenAI file if it exists
     * @param {string} openAIFileId - OpenAI file ID to delete
     * @returns {Promise<boolean>} - Success status
     */
    async deleteOpenAIFile(openAIFileId) {
        try {
            if (!openAIFileId) {
                console.log('No OpenAI file ID provided, skipping deletion');
                return true;
            }

            console.log(`Deleting OpenAI file: ${openAIFileId}`);
            await openAIService.deleteFile(openAIFileId);
            console.log(`✅ OpenAI file deleted successfully: ${openAIFileId}`);
            return true;
        } catch (error) {
            console.error(`Error deleting OpenAI file ${openAIFileId}:`, error.message);
            // Don't throw error - file deletion failure shouldn't prevent document deletion
            return false;
        }
    }

    /**
     * Delete OpenAI files for invoice
     * @param {Object} invoice - Invoice object
     * @returns {Promise<boolean>} - Success status
     */
    async deleteInvoiceOpenAIFiles(invoice) {
        try {
            let success = true;

            if (invoice.openAIFileId) {
                const deleted = await this.deleteOpenAIFile(invoice.openAIFileId);
                if (!deleted) success = false;
            }

            return success;
        } catch (error) {
            console.error('Error deleting invoice OpenAI files:', error);
            return false;
        }
    }

    /**
     * Delete OpenAI files for courier receipt
     * @param {Object} courierReceipt - Courier receipt object
     * @returns {Promise<boolean>} - Success status
     */
    async deleteCourierReceiptOpenAIFiles(courierReceipt) {
        try {
            let success = true;

            if (courierReceipt.openAIFileId) {
                const deleted = await this.deleteOpenAIFile(courierReceipt.openAIFileId);
                if (!deleted) success = false;
            }

            return success;
        } catch (error) {
            console.error('Error deleting courier receipt OpenAI files:', error);
            return false;
        }
    }

    /**
     * Delete OpenAI files for custom declaration
     * @param {Object} customDeclaration - Custom declaration object
     * @returns {Promise<boolean>} - Success status
     */
    async deleteCustomDeclarationOpenAIFiles(customDeclaration) {
        try {
            let success = true;

            if (customDeclaration.openAIFileId) {
                const deleted = await this.deleteOpenAIFile(customDeclaration.openAIFileId);
                if (!deleted) success = false;
            }

            return success;
        } catch (error) {
            console.error('Error deleting custom declaration OpenAI files:', error);
            return false;
        }
    }
}

// Create and export singleton instance
const openAIHelper = new OpenAIHelper();
module.exports = openAIHelper;
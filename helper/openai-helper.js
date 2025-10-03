const path = require('path');
const moment = require('moment');
const openAIService = require('../services/openai-service');
const invoiceTemplateService = require('../services/invoice-template-service');
const { Invoice } = require('../models/invoice-model');
const { CourierReceipt } = require('../models/courier-receipt-model');
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
            const targetLanguage = invoiceData.translatedLanguage || invoiceData.language;
            const currency = invoiceData.exchangeCurrency || invoiceData.currency;

            let attachments = [];
            console.log(`Starting translation for thread ${threadId}...`);
            console.log(`invoiceData: `, invoiceData);
            console.log(`Target language: ${targetLanguage}, Currency: ${currency}`);

            if (invoiceData.originalFilePath) {
                let uploadedFile;

                // Check if file already has an OpenAI file ID
                if (invoiceData.openAIFileId) {
                    console.log(`Using existing OpenAI file ID: ${invoiceData.openAIFileId}`);
                    uploadedFile = { id: invoiceData.openAIFileId };
                } else {
                    // Upload the file directly without conversion
                    const fullFilePath = path.join(__dirname, '..', invoiceData.originalFilePath);
                    console.log(`Uploading file from: ${fullFilePath}`);

                    try {
                        uploadedFile = await openAIService.uploadFile(fullFilePath, invoiceData.originalFileName);
                        await Invoice.update({ openAIFileId: uploadedFile.id }, { where: { id: invoiceData.id } });
                        //await Invoice.save();
                        console.log(`File uploaded to OpenAI with ID: ${uploadedFile.id}`);
                    } catch (uploadError) {
                        console.log(`File upload failed (${uploadError.message}), continuing without file attachment`);
                        // Continue without file attachment - will rely on prompt content
                        Invoice.update(
                            {
                                insights: uploadError.message,
                            },
                            { where: { id: invoiceData.id } }
                        );
                        uploadedFile = null;
                    }
                }

                // Check if file type is supported for file search
                if (uploadedFile) {
                    const fileName = invoiceData.originalFileName || '';

                    if (openAIService.isFileTypeSupportedForSearch(fileName)) {
                        console.log(`✅ File type ${path.extname(fileName).toLowerCase()} is supported for file search`);
                        attachments.push({
                            "file_id": uploadedFile.id,
                            "tools": [{ "type": "file_search" }]
                        });
                    } else {
                        console.log(`⚠️ File type ${path.extname(fileName).toLowerCase()} is not supported for file search, skipping attachment`);
                        console.log(`File will still be uploaded but not attached to the message`);
                        // Don't add the attachment, but keep the uploaded file for reference
                    }
                }
            }

            // Create comprehensive prompt for translation
            const userPrompt = `TRANSLATE INVOICE DATA TO JSON FORMAT

IMPORTANT: You MUST respond with ONLY valid JSON. Do not include any explanatory text, comments, or markdown formatting.

${attachments.length > 0 ? 'Note: File attachments are available for reference.' : 'Note: Working with invoice data only (no file attachments).'}

Invoice Data to Translate:
${JSON.stringify(invoiceData, null, 2)}

REQUIRED OUTPUT FORMAT (respond with ONLY this JSON structure):
{
  "translatedData": {
    "invoiceNumber": "translated_invoice_number",
    "date": "translated_date",
    "vendorName": "translated_vendor_name",
    "vendorAddress": "translated_vendor_address",
    "customerName": "translated_customer_name",
    "customerAddress": "translated_customer_address",
    "items": [
      {
        "description": "translated_item_description",
        "quantity": "translated_quantity",
        "unitPrice": "translated_unit_price",
        "total": "translated_total"
      }
    ],
    "subtotal": "translated_subtotal",
    "tax": "translated_tax",
    "total": "translated_total",
    "currency": "${currency}",
    "notes": "translated_notes"
  },
  "currencyConversion": {
    "originalCurrency": "${currency}",
    "targetCurrency": "${currency}",
    "exchangeRate": 1.0,
    "convertedAmount": "converted_amount"
  },
  "translatedAt": "${new Date().toISOString()}",
  "extractedData": {
    "invoiceNumber": "extracted_invoice_number",
    "date": "extracted_date",
    "vendorName": "extracted_vendor_name",
    "vendorAddress": "extracted_vendor_address",
    "customerName": "extracted_customer_name",
    "customerAddress": "extracted_customer_address",
    "items": [
      {
        "description": "extracted_item_description",
        "quantity": "extracted_quantity",
        "unitPrice": "extracted_unit_price",
        "total": "extracted_total"
      }
    ]
    "subtotal": "extracted_subtotal",
    "tax": "extracted_tax",
    "total": "extracted_total",
    "currency": "${currency}",
    "notes": "extracted_notes",
    "shipping": "extracted_shipping",
    "payment": "extracted_payment",
    "terms": "extracted_terms",
    "shippingAddress": "extracted_shipping_address",
    "billingAddress": "extracted_billing_address",
    "shippingMethod": "extracted_shipping_method",
    "paymentMethod": "extracted_payment_method",
    "paymentStatus": "extracted_payment_status",
    "paymentDate": "extracted_payment_date",
    "paymentAmount": "extracted_payment_amount",
    "paymentCurrency": "${currency}",
    "paymentStatus": "extracted_payment_status"
  }
}

CRITICAL: Your response must be ONLY the JSON object above. No additional text, explanations, or formatting.`;

            const systemPrompt = `You are a professional invoice translation assistant. Your ONLY task is to:

1. Translate all text content from the original language to ${targetLanguage}
2. Convert currency values to ${currency} using appropriate exchange rates
3. Return ONLY valid JSON in the exact format specified

CRITICAL RULES:
- Respond with ONLY valid JSON
- Do NOT include any explanatory text, comments, or markdown
- Do NOT use code blocks or formatting
- Start your response with { and end with }
- Ensure all JSON is properly formatted and valid

Translation Guidelines:
- Translate all text fields accurately
- Convert currency values using current exchange rates
- Maintain professional business language
- Preserve invoice structure and formatting
- Ensure all calculations are correct

Your response must be parseable JSON only.`;

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

                // Parse the translated content as JSON using the improved extraction method
                let translatedData = openAIService.extractJsonFromResponse(translatedContent);

                if (!translatedData) {
                    console.log('Failed to extract JSON from response, creating fallback data...');
                    console.log('Response content:', translatedContent.substring(0, 200) + '...');

                    // Create a fallback response with the original data
                    translatedData = {
                        translatedData: {
                            invoiceNumber: invoiceData.invoiceNumber || "Translation failed",
                            date: invoiceData.date || new Date().toISOString(),
                            vendorName: invoiceData.vendorName || "Translation failed",
                            vendorAddress: invoiceData.vendorAddress || "Translation failed",
                            customerName: invoiceData.customerName || "Translation failed",
                            customerAddress: invoiceData.customerAddress || "Translation failed",
                            items: invoiceData.items || [],
                            subtotal: invoiceData.subtotal || "0",
                            tax: invoiceData.tax || "0",
                            total: invoiceData.total || "0",
                            currency: invoiceData.currency || "USD",
                            notes: invoiceData.notes || "Translation failed - using original data"
                        },
                        currencyConversion: {
                            originalCurrency: invoiceData.currency || "USD",
                            targetCurrency: invoiceData.currency || "USD",
                            exchangeRate: 1.0,
                            convertedAmount: invoiceData.total || "0"
                        },
                        translatedAt: new Date().toISOString(),
                        translationError: "Failed to extract valid JSON from AI response"
                    };

                    console.log('Using fallback translation data due to parsing error');
                }

                // Validate the parsed data structure
                if (!translatedData.translatedData) {
                    console.log('Warning: translatedData structure is missing, creating fallback structure');
                    translatedData = {
                        translatedData: {
                            invoiceNumber: invoiceData.invoiceNumber || "Translation failed",
                            date: invoiceData.date || new Date().toISOString(),
                            vendorName: invoiceData.vendorName || "Translation failed",
                            vendorAddress: invoiceData.vendorAddress || "Translation failed",
                            customerName: invoiceData.customerName || "Translation failed",
                            customerAddress: invoiceData.customerAddress || "Translation failed",
                            items: invoiceData.items || [],
                            subtotal: invoiceData.subtotal || "0",
                            tax: invoiceData.tax || "0",
                            total: invoiceData.total || "0",
                            currency: invoiceData.currency || "USD",
                            notes: invoiceData.notes || "Translation failed - using original data"
                        },
                        currencyConversion: {
                            originalCurrency: invoiceData.currency || "USD",
                            targetCurrency: invoiceData.currency || "USD",
                            exchangeRate: 1.0,
                            convertedAmount: invoiceData.total || "0"
                        },
                        translatedAt: new Date().toISOString(),
                        validationError: "Missing translatedData structure"
                    };
                }

                console.log('✅ Translation data parsed successfully:', {
                    hasTranslatedData: !!translatedData.translatedData,
                    hasCurrencyConversion: !!translatedData.currencyConversion,
                    translatedAt: translatedData.translatedAt
                });

                // Generate output file
                const fileInfo = await invoiceTemplateService.generateTranslatedInvoice(translatedData, invoiceData);
                // const metadataPath = await invoiceTemplateService.generateMetadataFile(translatedData, invoiceData);

                // Update invoice with translation results
                const outputData = {
                    translatedAt: translatedData.translatedAt || new Date().toISOString(),
                    filePath: fileInfo.filePath,
                    fileName: fileInfo.fileName,
                    usage: runStatus.usage
                };

                await Invoice.update(
                    {
                        status: "completed",
                        translatedFilePath: fileInfo.filePath,
                        translatedFileName: fileInfo.fileName,
                        originalFileContent: JSON.stringify(translatedData.extractedData),
                        translatedFileContent: JSON.stringify(translatedData.translatedData),
                    },
                    { where: { id: invoiceData.id } }
                );

                return {
                    success: true,
                    threadId: threadId,
                    runId: run.id,
                    filePath: fileInfo.filePath,
                    fileName: fileInfo.fileName,
                    translatedAt: outputData.translatedAt,
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
                //await Invoice.save();
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
                    openAIFileId: { [Op.ne]: null } // Only invoices that have been uploaded to OpenAI
                },
                order: [['createdAt', 'DESC']]
            });

            console.log(`Found ${invoices.length} invoices for courier receipt analysis`);

            // Use the new comprehensive analysis function that includes content data
            const aiResponse = await openAIService.analyzeCourierReceiptDocumentWithContentData(project, courierReceipt, invoices, threadId);

            console.log(`Comprehensive analysis completed successfully for courier receipt: ${courierReceipt.fileName}`);

            // Update courier receipt with enhanced insights and verification
            if (aiResponse.success && aiResponse.analysisData) {


                console.log(`Updating courier receipt ${courierReceipt.id} with comprehensive insights...`);
                console.log('Analysis data structure:', {
                    success: aiResponse.success,
                    hasAnalysisData: !!aiResponse.analysisData,
                    analysisType: aiResponse.analysisData?.analysisType,
                    filesAnalyzed: aiResponse.filesAnalyzed,
                    invoiceCount: aiResponse.invoiceCount,
                    analyzedAt: aiResponse.analyzedAt
                });

                // Create comprehensive insights structure for courier receipt
                const insightsData = {
                    ...aiResponse.analysisData,
                    metadata: {
                        analysisType: "courier_receipt_comprehensive_analysis",
                        courierReceiptId: courierReceipt.id,
                        courierReceiptFileName: courierReceipt.fileName,
                        projectId: project.id,
                        projectTitle: project.title,
                        filesAnalyzed: aiResponse.filesAnalyzed || 0,
                        invoiceCount: aiResponse.invoiceCount || 0,
                        analyzedAt: aiResponse.analyzedAt,
                        generatedBy: "OpenAI Assistant with Content Data Analysis"
                    }
                };

                const updateResult = await CourierReceipt.update(
                    {
                        insights: JSON.stringify(insightsData),
                        status: "completed"
                    },
                    { where: { id: courierReceipt.id } }
                );

                console.log(`Courier receipt ${courierReceipt.id} update result:`, updateResult);



                // Verify the update by fetching the record
                const updatedRecord = await CourierReceipt.findByPk(courierReceipt.id);
                if (updatedRecord) {
                    console.log(`✅ Verification: Courier receipt ${courierReceipt.id} updated successfully`);
                    console.log(`✅ Verification: Status changed to: ${updatedRecord.status}`);
                    console.log(`✅ Verification: Insights field length: ${updatedRecord.insights ? updatedRecord.insights.length : 'null'} characters`);

                    if (updatedRecord.insights) {
                        try {
                            const parsedInsights = JSON.parse(updatedRecord.insights);
                            console.log(`✅ Verification: Insights contain ${Object.keys(parsedInsights).length} main sections`);
                            console.log(`✅ Verification: Analysis type: ${parsedInsights.analysisType || 'unknown'}`);
                            console.log(`✅ Verification: Files analyzed: ${parsedInsights.metadata?.filesAnalyzed || 0}`);
                            console.log(`✅ Verification: Invoice count: ${parsedInsights.metadata?.invoiceCount || 0}`);
                        } catch (e) {
                            console.log(`⚠️ Verification: Insights field exists but could not parse JSON: ${e.message}`);
                        }
                    }
                } else {
                    console.log(`❌ Verification failed: Could not fetch updated courier receipt ${courierReceipt.id}`);
                }
            } else {
                console.log('AI Response conditions not met for courier receipt insights update:');
                console.log('- success:', aiResponse.success);
                console.log('- analysisData:', aiResponse.analysisData ? 'present' : 'missing');
                console.log('- Full response structure:', {
                    success: aiResponse.success,
                    hasAnalysisData: !!aiResponse.analysisData,
                    analyzedAt: aiResponse.analyzedAt,
                    filesAnalyzed: aiResponse.filesAnalyzed,
                    error: aiResponse.error
                });
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
    async analyzeCustomDeclarationDocument(project, customDeclaration, invoices) {
        try {
            console.log(`Starting comprehensive custom declaration analysis for project ${project.id}...`);
            console.log(`Using existing files from thread, analyzing ${invoices.length} invoices against custom declaration...`);

            const threadId = project.aiConversation;
            const customDeclarationDocument = customDeclaration.filePath;
            const customDeclarationFileName = customDeclaration.fileName;

            // Upload only the custom declaration file to OpenAI
            let customDeclarationDocId;

            // Check if file already has an OpenAI file ID
            if (customDeclaration.openAIFileId) {
                console.log(`Using existing OpenAI file ID: ${customDeclaration.openAIFileId}`);
                customDeclarationDocId = customDeclaration.openAIFileId;
            } else {
                const customDeclarationDocumentFile = await openAIService.uploadFile(customDeclarationDocument, customDeclarationFileName);
                console.log(`Custom declaration file uploaded with ID: ${customDeclarationDocumentFile.id}`);
                await customDeclaration.update({ openAIFileId: customDeclarationDocumentFile.id });
                await customDeclaration.save();
                customDeclarationDocId = customDeclarationDocumentFile.id;

            }

            // Use existing files from thread instead of re-uploading invoices
            console.log(`Using existing files from thread: ${threadId}`);
            console.log(`Invoice context: ${invoices.length} invoices available for reference`);

            // Perform comprehensive analysis using existing thread files
            const aiResponse = await openAIService.analyzeCustomDeclarationDocumentWithExistingFiles(
                project,
                customDeclarationDocId,
                invoices,
                threadId
            );

            console.log(`Comprehensive analysis completed successfully for custom declaration: ${customDeclarationFileName}`);
            console.log('AI Response:', JSON.stringify(aiResponse, null, 2));

            // Update custom declaration with insights
            if (aiResponse.success && aiResponse.analysisData) {
                const { CustomDeclaration } = require('../models/custom-declaration-model');

                console.log(`Updating custom declaration ${customDeclaration.id} with insights...`);
                console.log('Analysis data:', JSON.stringify(aiResponse.analysisData, null, 2));

                const updateResult = await CustomDeclaration.update(
                    {
                        insights: JSON.stringify(aiResponse.analysisData)
                    },
                    { where: { id: customDeclaration.id } }
                );

                console.log(`Custom declaration ${customDeclaration.id} update result:`, updateResult);

                // Verify the update by fetching the record
                const updatedRecord = await CustomDeclaration.findByPk(customDeclaration.id);
                if (updatedRecord) {
                    console.log(`✅ Verification: Custom declaration ${customDeclaration.id} updated successfully`);
                    console.log(`✅ Verification: Insights field length: ${updatedRecord.insights ? updatedRecord.insights.length : 'null'}`);
                    if (updatedRecord.insights) {
                        try {
                            const parsedInsights = JSON.parse(updatedRecord.insights);
                            console.log(`✅ Verification: Insights contain ${Object.keys(parsedInsights).length} main sections`);
                        } catch (e) {
                            console.log(`⚠️ Verification: Insights field exists but could not parse JSON`);
                        }
                    }
                } else {
                    console.log(`❌ Verification failed: Could not fetch updated custom declaration ${customDeclaration.id}`);
                }
            } else {
                console.log('AI Response conditions not met:');
                console.log('- success:', aiResponse.success);
                console.log('- analysisData:', aiResponse.analysisData ? 'present' : 'missing');
                console.log('- Full response:', aiResponse);
            }

            return aiResponse;
        } catch (error) {
            console.error(`Error analyzing custom declaration document: ${error}`);

            // Update custom declaration status to failed
            try {
                const { CustomDeclaration } = require('../models/custom-declaration-model');
                await CustomDeclaration.update(
                    {
                        insights: JSON.stringify({ error: error.message })
                    },
                    { where: { id: customDeclaration.id } }
                );
            } catch (updateError) {
                console.error('Failed to update custom declaration status:', updateError);
            }

            throw error;
        }
    }
}

// Create and export singleton instance
const openAIHelper = new OpenAIHelper();
module.exports = openAIHelper;
const OpenAI = require('openai');
const crypto = require('crypto');
const moment = require('moment');
const fs = require('fs').promises;
const path = require('path');
const { Invoice } = require('../models/invoice-model');

class OpenAIHelper {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY || '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',
        });

        // Default model configuration for translation
        this.defaultModel = 'gpt-5-2025-08-07';
        this.defaultMaxTokens = 2000;
        this.defaultTemperature = 0.3;

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
        try {
            // Create a new thread using OpenAI API
            const thread = await this.openai.beta.threads.create();
            const threadId = thread.id;

            console.log(`New OpenAI thread created: ${threadId}`);
            return threadId;
        } catch (error) {
            console.error('Error creating OpenAI thread:', error);
            throw new Error(`Failed to create OpenAI thread: ${error.message}`);
        }
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
                let attachments = [];
                console.log(`Starting translation for thread ${threadId}...`);
                const originalFileContent = null;
                if (invoiceData.originalFilePath) {
                    originalFileContent = await fs.readFile(invoiceData.originalFilePath, 'utf8');
                    invoiceData.originalFileContent = originalFileContent;
                    const contentType = invoiceData.originalFileName.split('.').pop();

                    //add this file in openAI thread
                    const uploadedFile = await this.openai.beta.threads.files.create(threadId, {
                        file: {
                            file_id: invoiceData.originalFilePath,
                            filename: invoiceData.originalFileName,
                            purpose: 'assistants',
                            content_type: `application/${contentType}`,
                        },
                        purpose: 'assistants'
                    });
                    attachments.push({
                        "file_id": uploadedFile.id,
                        "file_purpose": "assistants",
                        "type": `input_file`,
                        "tools": [{ "type": "file_search" }, { "type": "code_interpreter" }]
                    })
                }

                // Prepare the translation prompt
                const systemPrompt = `You are a professional invoice translation assistant. Translate the following invoice data to ${invoiceData.language} while maintaining the original structure and formatting. Convert currency values to ${invoiceData.currency} format. Preserve all numerical data, dates, and business information accurately. You are an assistant that extracts structured data 
from Excel invoice files, translates field labels, and applies currency conversion.
Return a valid JSON object only`;

                const userPrompt = `You are given the invoice data below (pandas table):

${originalFileContent.slice(0, 50)}

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


                // Add message to the thread
                await this.openai.beta.threads.messages.create(threadId, {
                    role: 'user',
                    content: userPrompt
                });

                // Create a run to process the message
                const run = await this.openai.beta.threads.runs.create(threadId, {
                    assistant_id: process.env.OPENAI_ASSISTANT_ID || 'asst_default', // You'll need to create an assistant
                    instructions: systemPrompt,
                    attachments: attachments
                });

                // Wait for the run to complete
                let runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
                while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
                    runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
                }

                if (runStatus.status === 'completed') {
                    // Get the assistant's response
                    const messages = await this.openai.beta.threads.messages.list(threadId);
                    const translatedContent = messages.data[0].content[0].text.value;

                    // Generate filename with timestamp
                    const timestamp = moment().format('YYYYMMDD_HHmmss');
                    const filename = `translated_invoice_${threadId}_${timestamp}.json`;
                    const filePath = path.join(this.translationDir, filename);

                    // Prepare the output data
                    const outputData = {
                        threadId: threadId,
                        runId: run.id,
                        originalLanguage: 'auto-detected',
                        targetLanguage: invoiceData.translatedLanguage,
                        currency: invoiceData.currency,
                        translatedAt: moment().toISOString(),
                        originalData: invoiceData,
                        translatedData: translatedContent,
                        usage: runStatus.usage
                    };

                    // Save to filesystem
                    await fs.writeFile(filePath, JSON.stringify(outputData, null, 2), 'utf8');

                    console.log(`Translation completed and saved: ${filePath}`);

                    await Invoice.update(
                        {
                            translatedFileContent: translatedContent,
                            translatedFilePath: filePath,
                            translatedFileName: filename,
                            status: "completed",
                        },
                        { where: { id: invoiceData.id } }
                    );

                    resolve({
                        success: true,
                        threadId: threadId,
                        runId: run.id,
                        filePath: filePath,
                        translatedAt: outputData.translatedAt,
                        usage: runStatus.usage
                    });
                } else {
                    throw new Error(`Translation failed with status: ${runStatus.status}`);
                }

            } catch (error) {
                console.error(`Error in translation for thread ${threadId}:`, error);
                reject({
                    success: false,
                    threadId: threadId,
                    error: error.message,
                    failedAt: moment().toISOString()
                });
            }
        });
    }
}

// Create and export singleton instance
const openAIHelper = new OpenAIHelper();
module.exports = openAIHelper;

const ExcelTemplateUtility = require('../utils/excel-template-utility');
const EnhancedExcelTemplateUtility = require('../utils/enhanced-excel-template-utility');
const ExcelJSTemplateGenerator = require('../scripts/exceljs-template-generator');
const { generatePolishInvoiceXlsx } = require('../templates/files/excel_templates');
const path = require('path');
const fs = require('fs').promises;

/**
 * Generate Polish Invoice Excel file from translated data using Excel Template Utility
 * @param {Object} data - Translated invoice data from OpenAI
 * @param {string} outputPath - Path where to save the file
 * @returns {Promise<string>} - Path to the generated file
 */
async function generatePolishInvoiceXlsxFile(data, outputPath) {
    try {
        const excelUtility = new ExcelTemplateUtility();
        return await excelUtility.generatePolishInvoice(data, outputPath);
    } catch (error) {
        console.error('Error generating Polish invoice Excel:', error);
        throw new Error(`Failed to generate Excel file: ${error.message}`);
    }
}

/**
 * Generate invoice file based on original file extension with enhanced structure preservation
 * @param {Object} data - Translated invoice data
 * @param {string} originalFileName - Original file name
 * @param {string} originalFilePath - Original file path
 * @param {string} outputDir - Output directory
 * @param {Object} translationOptions - Translation options (currency conversion, etc.)
 * @returns {Promise<Object>} - File information object
 */
async function generateInvoiceFile(data, originalFileName, originalFilePath, outputDir, translationOptions = {}) {
    try {
        const fs = require('fs').promises;

        // Ensure output directory exists
        await fs.mkdir(outputDir, { recursive: true });

        // Get file extension
        const fileExtension = path.extname(originalFileName).toLowerCase();
        const baseName = path.basename(originalFileName, fileExtension);

        // Generate timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

        let outputPath;
        let fileName;

        switch (fileExtension) {
            case '.xlsx':
            case '.xls':
                fileName = `${baseName}_translated_${timestamp}.xlsx`;
                outputPath = path.join(outputDir, fileName);

                // Check if we have a sample-based template available
                const sampleAnalysisPath = path.join(__dirname, '../scripts/test_output/sample-invoice-analysis.json');
                const hasSampleTemplate = await fs.access(sampleAnalysisPath).then(() => true).catch(() => false);

                if (hasSampleTemplate) {
                    console.log('Using ExcelJS sample-based template for exact structure match');
                    const exceljsGenerator = new ExcelJSTemplateGenerator();
                    await exceljsGenerator.loadTemplateStructure(sampleAnalysisPath);
                    exceljsGenerator.createWorkbookFromSample();
                    await exceljsGenerator.applySampleTemplate(data, translationOptions);
                    await exceljsGenerator.saveWorkbook(outputPath);
                } else if (originalFilePath && await fs.access(originalFilePath).then(() => true).catch(() => false)) {
                    console.log('Using ExcelJS enhanced translation with structure preservation');
                    const enhancedExcelUtility = new EnhancedExcelTemplateUtility();
                    await enhancedExcelUtility.translateExcelFile(
                        originalFilePath,
                        data,
                        outputPath,
                        translationOptions
                    );
                } else {
                    console.log('Using ExcelJS standard template generation');
                    const enhancedExcelUtility = new EnhancedExcelTemplateUtility();
                    await enhancedExcelUtility.generatePolishInvoice(data, outputPath);
                }
                break;

            case '.csv':
                fileName = `${baseName}_translated_${timestamp}.csv`;
                outputPath = path.join(outputDir, fileName);
                const enhancedExcelUtility = new EnhancedExcelTemplateUtility();
                await enhancedExcelUtility.generateCSV(data, outputPath);
                break;

            case '.json':
                fileName = `${baseName}_translated_${timestamp}.json`;
                outputPath = path.join(outputDir, fileName);
                const enhancedExcelUtility2 = new EnhancedExcelTemplateUtility();
                await enhancedExcelUtility2.generateJSON(data, outputPath);
                break;

            default:
                // Default to Excel for unknown extensions
                fileName = `${baseName}_translated_${timestamp}.xlsx`;
                outputPath = path.join(outputDir, fileName);
                const enhancedExcelUtility3 = new EnhancedExcelTemplateUtility();
                await enhancedExcelUtility3.generatePolishInvoice(data, outputPath);
                break;
        }

        return {
            filePath: outputPath,
            fileName: fileName,
            fileExtension: path.extname(fileName)
        };

    } catch (error) {
        console.error('Error generating invoice file:', error);
        throw error;
    }
}

/**
 * Generate translated invoice using the new ExcelJS template
 * @param {Object} translatedData - Translated data from OpenAI
 * @param {Object} invoiceData - Original invoice data
 * @returns {Promise<Object>} - File information object
 */
async function generateTranslatedInvoice(translatedData, invoiceData) {
    try {
        console.log('Generating translated invoice using new ExcelJS template...');

        // Create output directory with relative path
        const invoiceFileLocation = invoiceData.originalFilePath;

        if (!invoiceFileLocation) {
            throw new Error('Original file path is required for generating translated invoice');
        }

        const outputDir = path.dirname(invoiceFileLocation);
        const oriFileName = path.basename(invoiceFileLocation, path.extname(invoiceFileLocation));

        console.log("outputDir", outputDir);
        console.log("oriFileName", oriFileName);

        await fs.mkdir(outputDir, { recursive: true });

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const fileName = `${oriFileName}-${invoiceData.translatedLanguage}-${timestamp}.xlsx`;
        const outputPath = path.join(outputDir, fileName);
        console.log("outputPath", outputPath);

        // Transform translated data to match the template structure
        const templateData = transformDataForTemplate(translatedData, invoiceData);

        // Generate Excel file using the new template
        const buffer = await generatePolishInvoiceXlsx(templateData);

        // Write buffer to file
        await fs.writeFile(outputPath, buffer);

        console.log(`✅ Translated invoice generated: ${outputPath}`);

        return {
            filePath: outputPath, // Relative path for database storage
            fileName: fileName,
            fileExtension: '.xlsx'
        };

    } catch (error) {
        console.error('Error generating translated invoice:', error);
        throw error;
    }
}

/**
 * Generate metadata file for the translated invoice
 * @param {Object} translatedData - Translated data from OpenAI
 * @param {Object} invoiceData - Original invoice data
 * @returns {Promise<string>} - Path to metadata file
 */
async function generateMetadataFile(translatedData, invoiceData) {
    try {
        console.log('Generating metadata file...');

        // Create output directory with relative path
        const outputDir = 'media/invoices';
        await fs.mkdir(outputDir, { recursive: true });

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const fileName = `metadata_${timestamp}.json`;
        const outputPath = path.join(outputDir, fileName);

        // Create metadata object
        const metadata = {
            originalInvoiceId: invoiceData.id,
            originalFileName: invoiceData.fileName,
            translatedAt: translatedData.translatedAt || new Date().toISOString(),
            translationData: translatedData,
            currencyConversion: translatedData.currencyConversion,
            processingInfo: {
                templateVersion: 'exceljs-v1.0',
                generatedBy: 'generatePolishInvoiceXlsx',
                timestamp: new Date().toISOString()
            }
        };

        // Write metadata to file
        await fs.writeFile(outputPath, JSON.stringify(metadata, null, 2));

        console.log(`✅ Metadata file generated: ${outputPath}`);

        return outputPath;

    } catch (error) {
        console.error('Error generating metadata file:', error);
        throw error;
    }
}

/**
 * Transform translated data to match the Excel template structure
 * @param {Object} translatedData - Translated data from OpenAI
 * @param {Object} invoiceData - Original invoice data
 * @returns {Object} - Data formatted for the Excel template
 */
function transformDataForTemplate(translatedData, invoiceData) {
    try {
        const data = translatedData.translatedData || {};

        // Transform the data to match the expected template structure
        return {
            merchant_exporter: data.merchant_exporter || data.merchantExporter || 'Merchant Exporter',
            invoice_number: data.invoice_number || data.invoiceNumber || 'INV-001',
            invoice_date: data.invoice_date || data.invoiceDate || new Date().toISOString().split('T')[0],
            exporter_reference: data.exporter_reference || data.exporterReference || 'REF-001',
            consignee: data.consignee || 'Consignee Information',
            buyer: data.buyer || data.consignee || 'Buyer Information',
            pre_carriage_by: data.pre_carriage_by || data.preCarriageBy || 'AIR FREIGHT',
            place_of_receipt: data.place_of_receipt || data.placeOfReceipt || 'INDIA',
            vessel_number: data.vessel_number || data.vesselNumber || 'AIR FREIGHT',
            port_of_loading: data.port_of_loading || data.portOfLoading || 'MUMBAI',
            port_of_discharge: data.port_of_discharge || data.portOfDischarge || 'WARSAW',
            final_destination: data.final_destination || data.finalDestination || 'POLAND',
            country_of_origin_of_goods: data.country_of_origin_of_goods || data.countryOfOriginOfGoods || 'INDIA',
            country_of_final_destination: data.country_of_final_destination || data.countryOfFinalDestination || 'POLAND',
            terms: data.terms || '90 Days',
            banker: data.banker || 'Bank Information',
            account_code: data.account_code || data.accountCode || 'ACC001',
            swift_code: data.swift_code || data.swiftCode || 'SWIFT001',
            ad_code: data.ad_code || data.adCode || 'AD001',
            arn_number: data.arn_number || data.arnNumber || 'ARN001',
            items: transformItems(data.items || [])
        };
    } catch (error) {
        console.error('Error transforming data for template:', error);
        throw error;
    }
}

/**
 * Transform items array to match template structure
 * @param {Array} items - Items array from translated data
 * @returns {Array} - Transformed items array
 */
function transformItems(items) {
    return items.map(item => ({
        description: item.description || item.item_description || 'Item Description',
        type: item.type || item.item_type || 'TYPE',
        hs_code: item.hs_code || item.hsn_code || item.hsCode || '00000000',
        uom: item.uom || item.unit || 'PCS',
        quantity: item.quantity || item.qty || 1,
        gross_wt: item.gross_wt || item.grossWeight || item.grossWt || 0,
        net_wt: item.net_wt || item.netWeight || item.netWt || 0,
        rate: item.rate || item.price || item.unitPrice || 0,
        amount: item.amount || item.total || item.totalAmount || 0
    }));
}

module.exports = {
    generatePolishInvoiceXlsxFile,
    generateInvoiceFile,
    generateTranslatedInvoice,
    generateMetadataFile
};

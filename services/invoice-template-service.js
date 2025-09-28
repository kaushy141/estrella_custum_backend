const ExcelTemplateUtility = require('../utils/excel-template-utility');
const EnhancedExcelTemplateUtility = require('../utils/enhanced-excel-template-utility');
const ExcelJSTemplateGenerator = require('../scripts/exceljs-template-generator');
const path = require('path');

/**
 * Generate Polish Invoice Excel file from translated data using Excel Template Utility
 * @param {Object} data - Translated invoice data from OpenAI
 * @param {string} outputPath - Path where to save the file
 * @returns {Promise<string>} - Path to the generated file
 */
async function generatePolishInvoiceXlsx(data, outputPath) {
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

module.exports = {
    generatePolishInvoiceXlsx,
    generateInvoiceFile
};

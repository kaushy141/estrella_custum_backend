const ExcelJS = require('exceljs');
const path = require('path');

/**
 * Excel Template Utility for Polish Invoice Generation using ExcelJS
 * Converts Python xlsxwriter template to Node.js ExcelJS
 */
class ExcelTemplateUtility {
    constructor() {
        this.workbook = null;
        this.worksheet = null;
    }

    /**
     * Create a new workbook and worksheet using ExcelJS
     */
    createWorkbook() {
        this.workbook = new ExcelJS.Workbook();
        this.worksheet = this.workbook.addWorksheet('Invoice', {
            pageSetup: {
                paperSize: 9, // A4
                orientation: 'portrait',
                margins: {
                    left: 0.7,
                    right: 0.7,
                    top: 0.75,
                    bottom: 0.75,
                    header: 0.3,
                    footer: 0.3
                }
            }
        });

        // Set column widths
        const colWidths = [25, 20, 15, 12, 12, 15, 8, 10, 12, 12];
        colWidths.forEach((width, index) => {
            this.worksheet.getColumn(index + 1).width = width;
        });

        // Set row heights
        for (let i = 1; i <= 50; i++) {
            this.worksheet.getRow(i).height = 20;
        }

        return this;
    }

    /**
     * Set cell value with formatting using ExcelJS
     * @param {number} row - Row index (1-based)
     * @param {number} col - Column index (1-based)
     * @param {string} value - Cell value
     * @param {Object} format - Format options
     */
    setCell(row, col, value, format = {}) {
        const cell = this.worksheet.getCell(row, col);
        cell.value = value;

        // Apply formatting
        const cellStyle = {
            font: {
                name: 'Arial',
                size: format.fontSize || 10,
                bold: format.bold || false,
                color: { argb: 'FF000000' }
            },
            border: {
                top: { style: 'thin', color: { argb: 'FF000000' } },
                left: { style: 'thin', color: { argb: 'FF000000' } },
                bottom: { style: 'thin', color: { argb: 'FF000000' } },
                right: { style: 'thin', color: { argb: 'FF000000' } }
            },
            alignment: {
                vertical: 'middle',
                horizontal: format.align || 'left',
                wrapText: true
            },
            fill: {
                fgColor: { argb: format.fill ? format.fill.fgColor.argb : 'FFFFFFFF' }
            }
        };

        Object.assign(cell, cellStyle);

        // Apply number format
        if (format.numFmt) {
            cell.numFmt = format.numFmt;
        }
    }

    /**
     * Merge cells using ExcelJS
     * @param {number} startRow - Start row (1-based)
     * @param {number} startCol - Start column (1-based)
     * @param {number} endRow - End row (1-based)
     * @param {number} endCol - End column (1-based)
     */
    mergeCells(startRow, startCol, endRow, endCol) {
        this.worksheet.mergeCells(startRow, startCol, endRow, endCol);
    }

    /**
     * Generate Polish Invoice using the new ExcelJS template
     * @param {Object} data - Translated invoice data
     * @param {string} outputPath - Output file path
     */
    async generatePolishInvoice(data, outputPath) {
        try {
            console.log('Generating Polish invoice using ExcelJS template...');

            // Use the template from excel_templates.js
            const { generatePolishInvoiceXlsx } = require('../templates/files/excel_templates');

            // Generate the Excel buffer
            const buffer = await generatePolishInvoiceXlsx(data);

            // Write buffer to file
            const fs = require('fs').promises;
            await fs.writeFile(outputPath, buffer);

            console.log(`✅ Polish invoice generated: ${outputPath}`);
            return outputPath;

        } catch (error) {
            console.error('Error generating Polish invoice:', error);
            throw error;
        }
    }

    /**
     * Generate Polish Invoice as buffer (useful for API responses)
     * @param {Object} data - Translated invoice data
     * @returns {Buffer} Excel file buffer
     */
    async generatePolishInvoiceBuffer(data) {
        try {
            console.log('Generating Polish invoice buffer...');

            // Use the template from excel_templates.js
            const { generatePolishInvoiceXlsx } = require('../templates/files/excel_templates');

            // Generate and return the Excel buffer
            const buffer = await generatePolishInvoiceXlsx(data);

            console.log('✅ Polish invoice buffer generated');
            return buffer;

        } catch (error) {
            console.error('Error generating Polish invoice buffer:', error);
            throw error;
        }
    }


    /**
     * Generate CSV file
     * @param {Object} data - Translated invoice data
     * @param {string} outputPath - Output file path
     */
    async generateCSV(data, outputPath) {
        try {
            const fs = require('fs').promises;

            let csvContent = 'Field,Value\n';
            csvContent += `Merchant Exporter,"${data.merchant_exporter || ''}"\n`;
            csvContent += `Invoice Number,"${data.invoice_number || ''}"\n`;
            csvContent += `Invoice Date,"${data.invoice_date || ''}"\n`;
            csvContent += `Exporter Reference,"${data.exporter_reference || ''}"\n`;
            csvContent += `Consignee,"${data.consignee || ''}"\n`;
            csvContent += `Buyer,"${data.buyer || ''}"\n`;

            if (data.items && Array.isArray(data.items)) {
                csvContent += '\nItems:\n';
                csvContent += 'Description,Type,HSN Code,UOM,Quantity,Rate,Amount\n';
                data.items.forEach(item => {
                    csvContent += `"${item.description || ''}","${item.type || ''}","${item.hsn_code || ''}","${item.uom || ''}",${item.quantity || 0},${item.rate || 0},${item.amount || 0}\n`;
                });
            }

            await fs.writeFile(outputPath, csvContent, 'utf8');
            console.log(`✅ CSV file generated: ${outputPath}`);

            return outputPath;

        } catch (error) {
            console.error('Error generating CSV:', error);
            throw error;
        }
    }

    /**
     * Generate JSON file
     * @param {Object} data - Translated invoice data
     * @param {string} outputPath - Output file path
     */
    async generateJSON(data, outputPath) {
        try {
            const fs = require('fs').promises;

            const jsonContent = JSON.stringify(data, null, 2);
            await fs.writeFile(outputPath, jsonContent, 'utf8');
            console.log(`✅ JSON file generated: ${outputPath}`);

            return outputPath;

        } catch (error) {
            console.error('Error generating JSON:', error);
            throw error;
        }
    }
}

module.exports = ExcelTemplateUtility;
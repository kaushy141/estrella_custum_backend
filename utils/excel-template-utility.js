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
     * Generate Polish Invoice using ExcelJS
     * @param {Object} data - Translated invoice data
     * @param {string} outputPath - Output file path
     */
    async generatePolishInvoice(data, outputPath) {
        try {
            console.log('Generating Polish invoice using ExcelJS...');

            // Create workbook
            this.createWorkbook();

            // Title
            this.setCell(1, 1, 'FAKTURA', {
                bold: true,
                fontSize: 16,
                align: 'center',
                fill: { fgColor: { argb: 'FFF0F0F0' } }
            });
            this.mergeCells(1, 1, 2, 10);

            // Headers
            this.setCell(3, 1, 'Kupiec-eksporter:', { bold: true, fontSize: 11 });
            this.setCell(3, 6, 'Numer i data faktury', { bold: true, fontSize: 11 });
            this.setCell(3, 9, 'Numer referencyjny eksportera:', { bold: true, fontSize: 11 });

            // Data
            this.setCell(4, 1, data.merchant_exporter || 'Merchant Exporter', { bold: true });
            this.setCell(4, 6, `${data.invoice_number || 'Invoice Number'} Data: ${data.invoice_date || 'Date'}`, { bold: true });
            this.setCell(4, 9, data.exporter_reference || 'Exporter Reference', { bold: true });

            // Consignee
            this.setCell(9, 1, 'Odbiorca:', { bold: true });
            this.setCell(10, 1, data.consignee || 'Consignee', { bold: true });

            // Buyer
            this.setCell(9, 6, 'Kupujący (jeśli inny niż odbiorca):', { bold: true });
            this.setCell(10, 6, data.buyer || 'Buyer', { bold: true });

            // Shipping info
            this.setCell(18, 1, 'Przewóz wstępny przez:', { bold: true });
            this.setCell(19, 1, data.pre_carriage_by || 'Pre-carriage', { bold: true });
            this.setCell(18, 3, 'Miejsce odbioru przez przewoźnika wstępnego:', { bold: true });
            this.setCell(19, 3, data.place_of_receipt || 'Place of Receipt', { bold: true });

            // Vessel info
            this.setCell(20, 1, 'Numer statku/lotu', { bold: true });
            this.setCell(21, 1, data.vessel_number || 'Vessel Number', { bold: true });
            this.setCell(20, 3, 'Port załadunku', { bold: true });
            this.setCell(21, 3, data.port_of_loading || 'Port of Loading', { bold: true });

            // Discharge info
            this.setCell(22, 1, 'Port rozładunku', { bold: true });
            this.setCell(23, 1, data.port_of_discharge || 'Port of Discharge', { bold: true });
            this.setCell(22, 3, 'Ostateczny cel', { bold: true });
            this.setCell(23, 3, data.final_destination || 'Final Destination', { bold: true });

            // Country info
            this.setCell(17, 6, 'Kraj pochodzenia towarów:', { bold: true });
            this.setCell(18, 6, data.country_of_origin_of_goods || 'Country of Origin', { bold: true });
            this.setCell(17, 9, 'Kraj docelowy:', { bold: true });
            this.setCell(18, 9, data.country_of_final_destination || 'Country of Destination', { bold: true });

            // Terms
            this.setCell(19, 6, 'Warunki dostawy i płatności:', { bold: true });
            this.setCell(20, 6, 'Warunki', { bold: true });
            this.setCell(20, 7, data.terms || 'Terms', { bold: true });

            // Banker
            this.setCell(21, 6, 'Bankier', { bold: true });
            this.setCell(21, 7, data.banker || 'Banker', { bold: true });

            // Account info
            this.setCell(23, 6, `A/C Code: ${data.account_code || 'Account Code'} Swift Code: ${data.swift_code || 'Swift Code'} (AD Code No.: ${data.ad_code || 'AD Code'})`, { bold: true });

            // Table headers
            this.setCell(24, 1, 'Marks & Nos.', { bold: true, align: 'center' });
            this.setCell(24, 2, 'Liczba i rodzaj opakowań.', { bold: true, align: 'center' });
            this.setCell(24, 5, 'Opis towaru', { bold: true, align: 'center' });
            this.setCell(24, 7, 'UOM', { bold: true, align: 'center' });
            this.setCell(24, 8, 'Ilość', { bold: true, align: 'center' });
            this.setCell(24, 9, 'Stawka USD $', { bold: true, align: 'center' });
            this.setCell(24, 10, 'Kwota USD $', { bold: true, align: 'center' });

            // Weight headers
            this.setCell(27, 4, 'Waga brutto (gramy)', { bold: true, align: 'center' });
            this.setCell(27, 5, 'Waga netto (gramy)', { bold: true, align: 'center' });

            // Items data
            if (data.items && Array.isArray(data.items)) {
                const rowStart = 28;
                data.items.forEach((item, index) => {
                    const row = rowStart + index;
                    const isEvenRow = index % 2 === 0;
                    const fillColor = isEvenRow ? 'FFFFFFFF' : 'FFF8F8F8';

                    this.setCell(row, 1, item.description || '', { fill: { fgColor: { argb: fillColor } } });
                    this.setCell(row, 3, item.type || '', { fill: { fgColor: { argb: fillColor } } });
                    this.setCell(row, 4, item.gross_wt || '', {
                        align: 'center',
                        numFmt: '0.000',
                        fill: { fgColor: { argb: fillColor } }
                    });
                    this.setCell(row, 5, item.net_wt || '', {
                        align: 'center',
                        numFmt: '0.000',
                        fill: { fgColor: { argb: fillColor } }
                    });
                    this.setCell(row, 6, item.hsn_code || '', {
                        align: 'center',
                        fill: { fgColor: { argb: fillColor } }
                    });
                    this.setCell(row, 7, item.uom || '', {
                        align: 'center',
                        fill: { fgColor: { argb: fillColor } }
                    });
                    this.setCell(row, 8, item.quantity || '', {
                        align: 'center',
                        numFmt: '0',
                        fill: { fgColor: { argb: fillColor } }
                    });
                    this.setCell(row, 9, item.rate || '', {
                        align: 'right',
                        numFmt: '#,##0.00',
                        fill: { fgColor: { argb: fillColor } }
                    });
                    this.setCell(row, 10, item.amount || '', {
                        align: 'right',
                        numFmt: '#,##0.00',
                        fill: { fgColor: { argb: fillColor } }
                    });
                });
            }

            // Apply merged cells
            this.addPolishInvoiceMergedCells();

            // Save workbook
            await this.workbook.xlsx.writeFile(outputPath);
            console.log(`✅ Polish invoice generated: ${outputPath}`);

            return outputPath;

        } catch (error) {
            console.error('Error generating Polish invoice:', error);
            throw error;
        }
    }

    /**
     * Add Polish invoice merged cells
     */
    addPolishInvoiceMergedCells() {
        const mergedRanges = [
            { start: { row: 1, col: 1 }, end: { row: 2, col: 10 } }, // A1:J2 - Title
            { start: { row: 3, col: 1 }, end: { row: 3, col: 5 } }, // A3:E3 - Merchant header
            { start: { row: 3, col: 6 }, end: { row: 3, col: 8 } }, // F3:H3 - Invoice header
            { start: { row: 3, col: 9 }, end: { row: 3, col: 10 } }, // I3:J3 - Reference header
            { start: { row: 4, col: 1 }, end: { row: 8, col: 5 } }, // A4:E8 - Merchant info
            { start: { row: 4, col: 6 }, end: { row: 4, col: 8 } }, // F4:H4 - Invoice info
            { start: { row: 4, col: 9 }, end: { row: 4, col: 10 } }, // I4:J4 - Reference info
            { start: { row: 5, col: 6 }, end: { row: 6, col: 10 } }, // F5:J6 - Buyer order
            { start: { row: 7, col: 6 }, end: { row: 8, col: 10 } }, // F7:J8 - EDF info
            { start: { row: 9, col: 1 }, end: { row: 9, col: 5 } }, // A9:E9 - Consignee header
            { start: { row: 9, col: 6 }, end: { row: 9, col: 10 } }, // F9:J9 - Buyer header
            { start: { row: 10, col: 1 }, end: { row: 17, col: 5 } }, // A10:E17 - Consignee info
            { start: { row: 10, col: 6 }, end: { row: 16, col: 10 } }, // F10:J16 - Buyer info
            { start: { row: 17, col: 6 }, end: { row: 18, col: 8 } }, // F17:H18 - Origin info
            { start: { row: 17, col: 9 }, end: { row: 18, col: 10 } }, // I17:J18 - Destination info
            { start: { row: 18, col: 1 }, end: { row: 19, col: 2 } }, // A18:B19 - Pre-carriage
            { start: { row: 18, col: 3 }, end: { row: 19, col: 5 } }, // C18:E19 - Place of receipt
            { start: { row: 20, col: 1 }, end: { row: 21, col: 2 } }, // A20:B21 - Vessel
            { start: { row: 20, col: 3 }, end: { row: 21, col: 5 } }, // C20:E21 - Port of loading
            { start: { row: 22, col: 1 }, end: { row: 23, col: 2 } }, // A22:B23 - Port of discharge
            { start: { row: 22, col: 3 }, end: { row: 23, col: 5 } }, // C22:E23 - Final destination
            { start: { row: 24, col: 1 }, end: { row: 24, col: 10 } }, // A24:J24 - Table headers
            { start: { row: 25, col: 1 }, end: { row: 25, col: 10 } }, // A25:J25 - Empty row
            { start: { row: 26, col: 1 }, end: { row: 26, col: 10 } }, // A26:J26 - Empty row
            { start: { row: 27, col: 1 }, end: { row: 27, col: 10 } }, // A27:J27 - Weight headers
            { start: { row: 28, col: 1 }, end: { row: 28, col: 10 } }  // A28:J28 - First item row
        ];

        mergedRanges.forEach(range => {
            this.worksheet.mergeCells(
                range.start.row,
                range.start.col,
                range.end.row,
                range.end.col
            );
        });

        console.log(`✅ Applied ${mergedRanges.length} Polish invoice merged cells`);
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
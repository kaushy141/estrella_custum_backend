const ExcelJS = require('exceljs');
const path = require('path');

/**
 * Enhanced Excel Template Utility for Invoice Translation using ExcelJS
 * Reads original Excel structure and maintains format while translating content
 */
class EnhancedExcelTemplateUtility {
    constructor() {
        this.workbook = null;
        this.worksheet = null;
        this.originalWorkbook = null;
        this.originalWorksheet = null;
    }

    /**
     * Read and analyze original Excel file structure using ExcelJS
     * @param {string} originalFilePath - Path to original Excel file
     * @returns {Object} - File structure analysis
     */
    async analyzeOriginalFile(originalFilePath) {
        try {
            console.log(`Analyzing original file: ${originalFilePath}`);

            // Read the original workbook using ExcelJS
            this.originalWorkbook = new ExcelJS.Workbook();
            await this.originalWorkbook.xlsx.readFile(originalFilePath);

            const sheetName = this.originalWorkbook.worksheets[0].name;
            this.originalWorksheet = this.originalWorkbook.getWorksheet(sheetName);

            // Get worksheet dimensions
            const rowCount = this.originalWorksheet.rowCount;
            const columnCount = this.originalWorksheet.columnCount;

            // Analyze the structure
            const analysis = {
                sheetName: sheetName,
                totalRows: rowCount || 50,
                totalCols: columnCount || 10,
                cells: {},
                mergedCells: [],
                columnWidths: [],
                rowHeights: [],
                styles: {},
                formulas: {},
                dataTypes: {}
            };

            // Get merged cells
            this.originalWorksheet.eachMergedCell((mergedCell) => {
                analysis.mergedCells.push({
                    s: { r: mergedCell.top - 1, c: mergedCell.left - 1 },
                    e: { r: mergedCell.bottom - 1, c: mergedCell.right - 1 }
                });
            });

            // Get column widths
            for (let i = 1; i <= analysis.totalCols; i++) {
                const column = this.originalWorksheet.getColumn(i);
                analysis.columnWidths.push({ wch: column.width || 18 });
            }

            // Get row heights
            for (let i = 1; i <= analysis.totalRows; i++) {
                const row = this.originalWorksheet.getRow(i);
                analysis.rowHeights.push({ hpt: row.height || 15 });
            }

            // Analyze each cell
            this.originalWorksheet.eachCell((cell, rowNumber, colNumber) => {
                const cellAddress = this.getCellAddress(rowNumber, colNumber);

                analysis.cells[cellAddress] = {
                    value: cell.value,
                    type: cell.type,
                    formula: cell.formula,
                    style: cell.style,
                    comment: cell.comment
                };

                // Track formulas
                if (cell.formula) {
                    analysis.formulas[cellAddress] = cell.formula;
                }

                // Track styles
                if (cell.style) {
                    analysis.styles[cellAddress] = cell.style;
                }

                // Track data types
                analysis.dataTypes[cellAddress] = cell.type;
            });

            console.log(`File analysis complete: ${analysis.totalRows} rows, ${analysis.totalCols} columns`);
            console.log(`Found ${Object.keys(analysis.cells).length} cells with content`);
            console.log(`Found ${analysis.mergedCells.length} merged cell ranges`);

            return analysis;

        } catch (error) {
            console.error('Error analyzing original file:', error);
            throw error;
        }
    }

    /**
     * Get cell address from row and column numbers
     */
    getCellAddress(row, col) {
        let colStr = '';
        while (col > 0) {
            col--;
            colStr = String.fromCharCode(65 + (col % 26)) + colStr;
            col = Math.floor(col / 26);
        }
        return colStr + row;
    }

    /**
     * Parse cell address (e.g., 'A1' -> {row: 1, col: 1})
     */
    parseCellAddress(cellAddress) {
        const match = cellAddress.match(/^([A-Z]+)(\d+)$/);
        if (!match) {
            throw new Error(`Invalid cell address: ${cellAddress}`);
        }

        const colStr = match[1];
        const row = parseInt(match[2]);

        // Convert column letters to number
        let col = 0;
        for (let i = 0; i < colStr.length; i++) {
            col = col * 26 + (colStr.charCodeAt(i) - 64);
        }

        return { row, col };
    }

    /**
     * Create workbook from analysis using ExcelJS
     * @param {Object} analysis - File structure analysis
     */
    createWorkbookFromAnalysis(analysis) {
        try {
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

            // Set optimized column widths for professional invoice layout
            const colWidths = [
                25, // Column A - Merchant/Company info (wider for addresses)
                20, // Column B - Package info
                15, // Column C - Type/Description
                12, // Column D - Gross weight
                12, // Column E - Net weight
                15, // Column F - HSN codes
                8,  // Column G - UOM (shorter)
                10, // Column H - Quantity
                12, // Column I - Rate
                12  // Column J - Amount
            ];

            colWidths.forEach((width, index) => {
                this.worksheet.getColumn(index + 1).width = width;
            });

            // Set row heights
            for (let i = 1; i <= analysis.totalRows; i++) {
                const row = this.worksheet.getRow(i);
                row.height = 20; // Default height
            }

            // Set specific row heights for important rows
            this.worksheet.getRow(1).height = 30; // Title row
            this.worksheet.getRow(24).height = 25; // Table header row

            console.log('✅ ExcelJS workbook created with sample structure');
            return this;

        } catch (error) {
            console.error('❌ Error creating ExcelJS workbook:', error);
            throw error;
        }
    }

    /**
     * Set cell with ExcelJS formatting
     * @param {number} row - Row index (1-based)
     * @param {number} col - Column index (1-based)
     * @param {string} value - Cell value
     * @param {Object} originalCell - Original cell data for formatting
     * @param {Object} customFormat - Custom format overrides
     */
    setCellWithOriginalFormat(row, col, value, originalCell = null, customFormat = {}) {
        const cell = this.worksheet.getCell(row, col);

        // Set value
        cell.value = value;

        // Enhanced professional formatting
        let cellStyle = {
            font: {
                name: 'Arial',
                size: 10,
                bold: false,
                color: { argb: 'FF000000' }
            },
            border: {
                top: { style: 'thin', color: { argb: 'FF000000' } },
                bottom: { style: 'thin', color: { argb: 'FF000000' } },
                left: { style: 'thin', color: { argb: 'FF000000' } },
                right: { style: 'thin', color: { argb: 'FF000000' } }
            },
            alignment: {
                horizontal: 'left',
                vertical: 'center',
                wrapText: true
            },
            fill: {
                fgColor: { argb: 'FFFFFFFF' }
            }
        };

        // Apply specific formatting based on cell type
        if (originalCell && originalCell.isHeader) {
            cellStyle.font.bold = true;
            cellStyle.font.size = 11;
            cellStyle.fill.fgColor = { argb: 'FFE6E6E6' };
        }

        if (originalCell && originalCell.isTotal) {
            cellStyle.font.bold = true;
            cellStyle.alignment.horizontal = 'right';
        }

        if (originalCell && originalCell.isData && typeof value === 'number') {
            cellStyle.alignment.horizontal = 'right';
            cell.numFmt = '#,##0.00';
        }

        // Apply the style
        Object.assign(cell, cellStyle);

        console.log(`Set cell ${this.getCellAddress(row, col)}: "${value}"`);
    }

    /**
     * Copy merged cells from original using ExcelJS
     * @param {Array} mergedCells - Array of merged cell ranges
     */
    copyMergedCells(mergedCells) {
        mergedCells.forEach(merge => {
            const startRow = merge.s.r + 1; // ExcelJS uses 1-based indexing
            const startCol = merge.s.c + 1;
            const endRow = merge.e.r + 1;
            const endCol = merge.e.c + 1;

            this.worksheet.mergeCells(startRow, startCol, endRow, endCol);
        });
        console.log(`✅ Applied ${mergedCells.length} merged cells`);
    }

    /**
     * Translate Excel file using ExcelJS
     * @param {string} originalFilePath - Path to original Excel file
     * @param {Object} translatedData - Translated data
     * @param {string} outputPath - Output file path
     * @param {Object} translationOptions - Translation options
     */
    async translateExcelFile(originalFilePath, translatedData, outputPath, translationOptions = {}) {
        try {
            console.log(`Starting ExcelJS translation: ${originalFilePath} -> ${outputPath}`);

            // Analyze original file
            const analysis = await this.analyzeOriginalFile(originalFilePath);

            // Create new workbook
            this.createWorkbookFromAnalysis(analysis);

            // Check if original file has content
            const hasContent = Object.keys(analysis.cells).length > 0;

            if (!hasContent) {
                console.log('Original file appears to be empty, populating with translated data...');
                await this.populateEmptyFileWithTranslatedData(translatedData, translationOptions, analysis);
            } else {
                console.log('Translating existing content...');
                await this.translateExistingContent(translatedData, translationOptions, analysis);
            }

            // Apply merged cells
            this.copyMergedCells(analysis.mergedCells);

            // Save the workbook
            await this.workbook.xlsx.writeFile(outputPath);
            console.log(`ExcelJS translation completed: ${outputPath}`);

            return outputPath;

        } catch (error) {
            console.error('Error in ExcelJS translation:', error);
            throw error;
        }
    }

    /**
     * Translate existing content
     */
    async translateExistingContent(translatedData, translationOptions, analysis) {
        Object.keys(analysis.cells).forEach(cellAddress => {
            const templateCell = analysis.cells[cellAddress];
            const cellRef = this.parseCellAddress(cellAddress);

            // Get translated value
            const translatedValue = this.translateCellContent(
                templateCell.value,
                translatedData,
                translationOptions
            );

            // Apply currency conversion if needed
            const finalValue = this.convertCurrency(translatedValue, translationOptions);

            // Set cell with formatting
            this.setCellWithOriginalFormat(
                cellRef.row,
                cellRef.col,
                finalValue,
                templateCell
            );
        });
    }

    /**
     * Populate empty file with translated data
     */
    async populateEmptyFileWithTranslatedData(translatedData, translationOptions, analysis) {
        console.log('Populating empty file with Polish invoice template...');

        // Get template data
        const templateData = this.createPolishInvoiceTemplate(translatedData, translationOptions);

        // Apply template data
        Object.keys(templateData).forEach(cellAddress => {
            const templateCell = templateData[cellAddress];
            const cellRef = this.parseCellAddress(cellAddress);

            this.setCellWithOriginalFormat(
                cellRef.row,
                cellRef.col,
                templateCell.value,
                templateCell
            );
        });

        // Apply merged cells for Polish invoice template
        this.addPolishInvoiceMergedCells();
    }

    /**
     * Translate cell content using OpenAI JSON structure
     */
    translateCellContent(originalValue, translatedData, options) {
        if (!originalValue) {
            return this.getTranslatedContentForEmptyCell(translatedData, options);
        }

        const lowerValue = String(originalValue).toLowerCase();

        // Map common invoice fields using OpenAI JSON structure
        if (lowerValue.includes('merchant') || lowerValue.includes('eksporter')) {
            return translatedData.merchant_exporter || originalValue;
        }
        if (lowerValue.includes('invoice') || lowerValue.includes('faktura')) {
            return translatedData.invoice_number || originalValue;
        }
        if (lowerValue.includes('consignee') || lowerValue.includes('odbiorca')) {
            return translatedData.consignee || originalValue;
        }
        if (lowerValue.includes('buyer') || lowerValue.includes('kupujący')) {
            return translatedData.buyer || originalValue;
        }

        // Check for item descriptions with language support
        if (translatedData.items && Array.isArray(translatedData.items)) {
            const targetLanguage = options.targetLanguage || 'Polish';
            for (const item of translatedData.items) {
                let description = '';
                if (typeof item.description === 'object' && item.description[targetLanguage]) {
                    description = item.description[targetLanguage];
                } else if (typeof item.description === 'string') {
                    description = item.description;
                }

                if (description && lowerValue.includes(description.toLowerCase())) {
                    return description;
                }
            }
        }

        return originalValue;
    }

    /**
     * Get translated content for empty cell
     */
    getTranslatedContentForEmptyCell(translatedData, options) {
        if (translatedData.merchant_exporter) {
            return translatedData.merchant_exporter;
        }
        if (translatedData.invoice_number) {
            return translatedData.invoice_number;
        }
        if (translatedData.consignee) {
            return translatedData.consignee;
        }
        return `Translated Invoice - ${options.targetLanguage || 'Polish'}`;
    }

    /**
     * Convert currency values
     */
    convertCurrency(value, translationOptions) {
        if (!translationOptions.currencyConversion || typeof value !== 'number') {
            return value;
        }

        const { exchangeRate, sourceCurrency, targetCurrency } = translationOptions.currencyConversion;

        if (exchangeRate && exchangeRate !== 1) {
            return value * exchangeRate;
        }

        return value;
    }

    /**
     * Create Polish invoice template
     */
    createPolishInvoiceTemplate(translatedData, translationOptions) {
        const templateData = {};

        console.log('Creating Polish invoice template with data:', translatedData);

        // Title - FAKTURA (Enhanced formatting)
        templateData['A1'] = {
            value: 'FAKTURA',
            isHeader: true,
            format: {
                bold: true,
                fontSize: 16,
                align: 'center',
                valign: 'center',
                fill: { fgColor: { argb: 'FFF0F0F0' } }
            }
        };

        // Header row 1 (Enhanced formatting)
        templateData['A3'] = {
            value: 'Kupiec-eksporter:',
            isHeader: true,
            format: {
                bold: true,
                fontSize: 11,
                align: 'left',
                fill: { fgColor: { argb: 'FFE6E6E6' } }
            }
        };
        templateData['F3'] = {
            value: 'Numer i data faktury',
            isHeader: true,
            format: {
                bold: true,
                fontSize: 11,
                align: 'left',
                fill: { fgColor: { argb: 'FFE6E6E6' } }
            }
        };
        templateData['I3'] = {
            value: 'Numer referencyjny eksportera:',
            isHeader: true,
            format: {
                bold: true,
                fontSize: 11,
                align: 'left',
                fill: { fgColor: { argb: 'FFE6E6E6' } }
            }
        };

        // Data row 1
        templateData['A4'] = { value: translatedData.merchant_exporter || 'Merchant Exporter', format: { bold: true, align: 'left', valign: 'top' } };
        templateData['F4'] = { value: `${translatedData.invoice_number || 'Invoice Number'} Data: ${translatedData.invoice_date || 'Date'}`, format: { bold: true, align: 'left' } };
        templateData['I4'] = { value: translatedData.exporter_reference || 'Exporter Reference', format: { bold: true, align: 'left' } };

        // Buyer order info
        templateData['F5'] = { value: 'Numer i data zamówienia kupującego:', format: { bold: true, align: 'left', valign: 'center' } };
        templateData['F6'] = { value: `Numer: ${translatedData.buyer_order_number || 'Order Number'} Data: ${translatedData.buyer_order_date || 'Date'}`, format: { bold: true, align: 'left', valign: 'center' } };

        // Other references
        templateData['F7'] = { value: 'Inne odniesienia: Formularz EDF nr:', format: { bold: true, align: 'left', valign: 'center' } };
        templateData['F8'] = { value: `Numer: ${translatedData.edf_number || 'EDF Number'} Data: ${translatedData.edf_date || 'Date'}`, format: { bold: true, align: 'left', valign: 'center' } };

        // Consignee
        templateData['A9'] = { value: 'Odbiorca:', format: { bold: true, align: 'left', valign: 'center' } };
        templateData['A10'] = { value: translatedData.consignee || 'Consignee', format: { bold: true, align: 'left', valign: 'top' } };

        // Buyer
        templateData['F9'] = { value: 'Kupujący (jeśli inny niż odbiorca):', format: { bold: true, align: 'left', valign: 'center' } };
        templateData['F10'] = { value: translatedData.buyer || 'Buyer', format: { bold: true, align: 'left', valign: 'top' } };

        // Shipping info
        templateData['A18'] = { value: 'Przewóz wstępny przez:', format: { bold: true, align: 'left', valign: 'center' } };
        templateData['A19'] = { value: translatedData.pre_carriage_by || 'Pre-carriage', format: { bold: true, align: 'left', valign: 'center' } };
        templateData['C18'] = { value: 'Miejsce odbioru przez przewoźnika wstępnego:', format: { bold: true, align: 'left', valign: 'center' } };
        templateData['C19'] = { value: translatedData.place_of_receipt || 'Place of Receipt', format: { bold: true, align: 'left', valign: 'center' } };

        // Vessel info
        templateData['A20'] = { value: 'Numer statku/lotu', format: { bold: true, align: 'left', valign: 'center' } };
        templateData['A21'] = { value: translatedData.vessel_number || 'Vessel Number', format: { bold: true, align: 'left', valign: 'center' } };
        templateData['C20'] = { value: 'Port załadunku', format: { bold: true, align: 'left', valign: 'center' } };
        templateData['C21'] = { value: translatedData.port_of_loading || 'Port of Loading', format: { bold: true, align: 'left', valign: 'center' } };

        // Discharge info
        templateData['A22'] = { value: 'Port rozładunku', format: { bold: true, align: 'left', valign: 'center' } };
        templateData['A23'] = { value: translatedData.port_of_discharge || 'Port of Discharge', format: { bold: true, align: 'left', valign: 'center' } };
        templateData['C22'] = { value: 'Ostateczny cel', format: { bold: true, align: 'left', valign: 'center' } };
        templateData['C23'] = { value: translatedData.final_destination || 'Final Destination', format: { bold: true, align: 'left', valign: 'center' } };

        // Country info
        templateData['F17'] = { value: 'Kraj pochodzenia towarów:', format: { bold: true, align: 'left', valign: 'center' } };
        templateData['F18'] = { value: translatedData.country_of_origin_of_goods || 'Country of Origin', format: { bold: true, align: 'left', valign: 'center' } };
        templateData['I17'] = { value: 'Kraj docelowy:', format: { bold: true, align: 'left', valign: 'center' } };
        templateData['I18'] = { value: translatedData.country_of_final_destination || 'Country of Destination', format: { bold: true, align: 'left', valign: 'center' } };

        // Terms
        templateData['F19'] = { value: 'Warunki dostawy i płatności:', format: { bold: true, align: 'left', valign: 'center' } };
        templateData['F20'] = { value: 'Warunki', format: { bold: true, align: 'left', valign: 'center' } };
        templateData['G20'] = { value: translatedData.terms || 'Terms', format: { bold: true, align: 'left', valign: 'center' } };

        // Banker
        templateData['F21'] = { value: 'Bankier', format: { bold: true, align: 'left', valign: 'center' } };
        templateData['G21'] = { value: translatedData.banker || 'Banker', format: { bold: true, align: 'left', valign: 'center' } };

        templateData['F23'] = { value: `A/C Code: ${translatedData.account_code || 'Account Code'} Swift Code: ${translatedData.swift_code || 'Swift Code'} (AD Code No.: ${translatedData.ad_code || 'AD Code'})`, format: { bold: true, align: 'left', valign: 'center' } };

        // Table headers (Enhanced formatting)
        templateData['A24'] = {
            value: 'Marks & Nos.',
            isHeader: true,
            format: {
                bold: true,
                fontSize: 11,
                align: 'center',
                valign: 'center',
                fill: { fgColor: { argb: 'FFD9D9D9' } },
                border: { top: { style: 'medium' }, bottom: { style: 'medium' } }
            }
        };
        templateData['B24'] = {
            value: 'Liczba i rodzaj opakowań.',
            isHeader: true,
            format: {
                bold: true,
                fontSize: 11,
                align: 'center',
                valign: 'center',
                fill: { fgColor: { argb: 'FFD9D9D9' } },
                border: { top: { style: 'medium' }, bottom: { style: 'medium' } }
            }
        };
        templateData['E24'] = {
            value: 'Opis towaru',
            isHeader: true,
            format: {
                bold: true,
                fontSize: 11,
                align: 'center',
                valign: 'center',
                fill: { fgColor: { argb: 'FFD9D9D9' } },
                border: { top: { style: 'medium' }, bottom: { style: 'medium' } }
            }
        };
        templateData['G24'] = {
            value: 'UOM',
            isHeader: true,
            format: {
                bold: true,
                fontSize: 11,
                align: 'center',
                valign: 'center',
                fill: { fgColor: { argb: 'FFD9D9D9' } },
                border: { top: { style: 'medium' }, bottom: { style: 'medium' } }
            }
        };
        templateData['H24'] = {
            value: 'Ilość',
            isHeader: true,
            format: {
                bold: true,
                fontSize: 11,
                align: 'center',
                valign: 'center',
                fill: { fgColor: { argb: 'FFD9D9D9' } },
                border: { top: { style: 'medium' }, bottom: { style: 'medium' } }
            }
        };
        templateData['I24'] = {
            value: 'Stawka USD $',
            isHeader: true,
            format: {
                bold: true,
                fontSize: 11,
                align: 'center',
                valign: 'center',
                fill: { fgColor: { argb: 'FFD9D9D9' } },
                border: { top: { style: 'medium' }, bottom: { style: 'medium' } }
            }
        };
        templateData['J24'] = {
            value: 'Kwota USD $',
            isHeader: true,
            format: {
                bold: true,
                fontSize: 11,
                align: 'center',
                valign: 'center',
                fill: { fgColor: { argb: 'FFD9D9D9' } },
                border: { top: { style: 'medium' }, bottom: { style: 'medium' } }
            }
        };

        // Weight headers
        templateData['D27'] = { value: 'Waga brutto (gramy)', format: { bold: true, align: 'center', valign: 'center' } };
        templateData['E27'] = { value: 'Waga netto (gramy)', format: { bold: true, align: 'center', valign: 'center' } };

        // Items data (Enhanced formatting with OpenAI JSON structure)
        if (translatedData.items && Array.isArray(translatedData.items)) {
            const rowStart = 28;
            const targetLanguage = translationOptions.targetLanguage || 'Polish';
            const useConvertedValues = translationOptions.currencyConversion && translationOptions.currencyConversion.exchangeRate !== 1;

            translatedData.items.forEach((item, index) => {
                const row = rowStart + index;
                const isEvenRow = index % 2 === 0;
                const rowFillColor = isEvenRow ? 'FFFFFFFF' : 'FFF8F8F8';

                // Handle description with language support
                let description = '';
                if (typeof item.description === 'object' && item.description[targetLanguage]) {
                    description = item.description[targetLanguage];
                } else if (typeof item.description === 'string') {
                    description = item.description;
                }

                // Handle rate with currency conversion
                let rate = '';
                if (typeof item.rate === 'object' && item.rate.converted_value !== undefined) {
                    rate = useConvertedValues ? item.rate.converted_value : item.rate.value;
                } else if (typeof item.rate === 'number') {
                    rate = item.rate;
                }

                // Handle amount with currency conversion
                let amount = '';
                if (typeof item.amount === 'object' && item.amount.converted_value !== undefined) {
                    amount = useConvertedValues ? item.amount.converted_value : item.amount.value;
                } else if (typeof item.amount === 'number') {
                    amount = item.amount;
                }

                templateData[`A${row}`] = {
                    value: description,
                    format: {
                        bold: false,
                        fontSize: 10,
                        align: 'left',
                        valign: 'center',
                        fill: { fgColor: { argb: rowFillColor } }
                    }
                };
                templateData[`C${row}`] = {
                    value: item.type || '',
                    format: {
                        bold: false,
                        fontSize: 10,
                        align: 'left',
                        valign: 'center',
                        fill: { fgColor: { argb: rowFillColor } }
                    }
                };
                templateData[`D${row}`] = {
                    value: item.gross_wt || '',
                    isData: true,
                    format: {
                        bold: false,
                        fontSize: 10,
                        align: 'center',
                        valign: 'center',
                        numFmt: '0.000',
                        fill: { fgColor: { argb: rowFillColor } }
                    }
                };
                templateData[`E${row}`] = {
                    value: item.net_wt || '',
                    isData: true,
                    format: {
                        bold: false,
                        fontSize: 10,
                        align: 'center',
                        valign: 'center',
                        numFmt: '0.000',
                        fill: { fgColor: { argb: rowFillColor } }
                    }
                };
                templateData[`F${row}`] = {
                    value: item.hsn_code || '',
                    format: {
                        bold: false,
                        fontSize: 10,
                        align: 'center',
                        valign: 'center',
                        fill: { fgColor: { argb: rowFillColor } }
                    }
                };
                templateData[`G${row}`] = {
                    value: item.uom || '',
                    format: {
                        bold: false,
                        fontSize: 10,
                        align: 'center',
                        valign: 'center',
                        fill: { fgColor: { argb: rowFillColor } }
                    }
                };
                templateData[`H${row}`] = {
                    value: item.quantity || '',
                    isData: true,
                    format: {
                        bold: false,
                        fontSize: 10,
                        align: 'center',
                        valign: 'center',
                        numFmt: '0',
                        fill: { fgColor: { argb: rowFillColor } }
                    }
                };
                templateData[`I${row}`] = {
                    value: rate,
                    isData: true,
                    format: {
                        bold: false,
                        fontSize: 10,
                        align: 'right',
                        valign: 'center',
                        numFmt: '#,##0.00',
                        fill: { fgColor: { argb: rowFillColor } }
                    }
                };
                templateData[`J${row}`] = {
                    value: amount,
                    isData: true,
                    format: {
                        bold: false,
                        fontSize: 10,
                        align: 'right',
                        valign: 'center',
                        numFmt: '#,##0.00',
                        fill: { fgColor: { argb: rowFillColor } }
                    }
                };
            });
        }

        console.log(`Created template with ${Object.keys(templateData).length} cells`);
        return templateData;
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
     * Generate Polish Invoice using ExcelJS
     * @param {Object} data - Translated invoice data
     * @param {string} outputPath - Output file path
     */
    async generatePolishInvoice(data, outputPath) {
        try {
            console.log('Generating Polish invoice using ExcelJS...');

            // Create workbook
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
            for (let i = 1; i <= 64; i++) {
                this.worksheet.getRow(i).height = 20;
            }
            this.worksheet.getRow(1).height = 30; // Title row
            this.worksheet.getRow(24).height = 25; // Table header row

            // Create template data
            const templateData = this.createPolishInvoiceTemplate(data, {});

            // Apply template data
            Object.keys(templateData).forEach(cellAddress => {
                const templateCell = templateData[cellAddress];
                const cellRef = this.parseCellAddress(cellAddress);

                this.setCellWithOriginalFormat(
                    cellRef.row,
                    cellRef.col,
                    templateCell.value,
                    templateCell
                );
            });

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

module.exports = EnhancedExcelTemplateUtility;
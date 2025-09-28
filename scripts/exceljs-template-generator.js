const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs').promises;

/**
 * ExcelJS-based Template Generator for Professional Invoice Translation
 * Uses ExcelJS for superior formatting, styling, and structure control
 */
class ExcelJSTemplateGenerator {
    constructor() {
        this.workbook = null;
        this.worksheet = null;
        this.templateStructure = null;
    }

    /**
     * Load template structure from analysis
     * @param {string} analysisPath - Path to analysis JSON file
     */
    async loadTemplateStructure(analysisPath) {
        try {
            console.log(`📂 Loading template structure from: ${analysisPath}`);
            const analysisData = JSON.parse(await fs.readFile(analysisPath, 'utf8'));
            this.templateStructure = analysisData.template;
            console.log(`✅ Template structure loaded with ${Object.keys(this.templateStructure.cells).length} cells`);
            return this.templateStructure;
        } catch (error) {
            console.error('❌ Error loading template structure:', error);
            throw error;
        }
    }

    /**
     * Create workbook using ExcelJS
     */
    createWorkbookFromSample() {
        try {
            console.log('🏗️ Creating ExcelJS workbook from sample structure...');

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

            // Set column widths based on sample structure
            this.setColumnWidths();

            // Set row heights
            this.setRowHeights();

            console.log('✅ ExcelJS workbook created with sample structure');
            return this;

        } catch (error) {
            console.error('❌ Error creating ExcelJS workbook:', error);
            throw error;
        }
    }

    /**
     * Set optimized column widths
     */
    setColumnWidths() {
        const columnWidths = [
            25, // Column A - Merchant/Company info
            20, // Column B - Package info  
            15, // Column C - Type/Description
            12, // Column D - Gross weight
            12, // Column E - Net weight
            15, // Column F - HSN codes
            8,  // Column G - UOM
            10, // Column H - Quantity
            12, // Column I - Rate
            12  // Column J - Amount
        ];

        columnWidths.forEach((width, index) => {
            this.worksheet.getColumn(index + 1).width = width;
        });

        console.log('✅ Column widths set');
    }

    /**
     * Set row heights
     */
    setRowHeights() {
        // Set default row height
        for (let i = 1; i <= 64; i++) {
            this.worksheet.getRow(i).height = 20;
        }

        // Set specific row heights for important rows
        this.worksheet.getRow(1).height = 30; // Title row
        this.worksheet.getRow(24).height = 25; // Table header row

        console.log('✅ Row heights set');
    }

    /**
     * Apply sample-based template with JSON data using ExcelJS
     * @param {Object} jsonData - JSON data to populate
     * @param {Object} options - Template options
     */
    async applySampleTemplate(jsonData, options = {}) {
        try {
            console.log('🎨 Applying ExcelJS sample-based template...');

            if (!this.templateStructure) {
                throw new Error('Template structure not loaded');
            }

            // Process each cell from the template structure
            Object.keys(this.templateStructure.cells).forEach(cellAddress => {
                const templateCell = this.templateStructure.cells[cellAddress];
                const cellRef = this.parseCellAddress(cellAddress);

                // Get translated value based on cell position and content
                const translatedValue = this.getTranslatedValue(
                    cellRef.row,
                    cellRef.col,
                    templateCell.value,
                    jsonData,
                    options
                );

                // Apply cell with ExcelJS formatting
                this.setCellWithExcelJSFormat(
                    cellRef.row,
                    cellRef.col,
                    translatedValue,
                    templateCell
                );
            });

            // Apply merged cells from sample
            this.applyMergedCells();

            // Apply formulas from sample
            this.applyFormulas(jsonData);

            console.log('✅ ExcelJS sample template applied successfully');

        } catch (error) {
            console.error('❌ Error applying ExcelJS sample template:', error);
            throw error;
        }
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
     * Get translated value based on cell position and original content
     */
    getTranslatedValue(row, col, originalValue, jsonData, options) {
        if (!originalValue) return '';

        const cellAddress = this.getCellAddress(row, col);
        const lowerValue = typeof originalValue === 'string' ? originalValue.toLowerCase() : String(originalValue).toLowerCase();

        // Map based on cell position and content
        switch (cellAddress) {
            // Title
            case 'A1':
                return 'FAKTURA';

            // Merchant/Exporter section
            case 'A3':
                return 'Kupiec-eksporter:';
            case 'A4':
                return jsonData.merchant_exporter || 'Merchant Exporter';

            // Invoice number and date
            case 'F3':
                return 'Numer i data faktury';
            case 'F4':
                return `${jsonData.invoice_number || 'Invoice Number'} Data: ${jsonData.invoice_date || 'Date'}`;

            // Exporter reference
            case 'I3':
                return 'Numer referencyjny eksportera:';
            case 'I4':
                return jsonData.exporter_reference || 'Exporter Reference';

            // Buyer order info
            case 'F5':
                return 'Numer i data zamówienia kupującego:';
            case 'F6':
                return `Numer: ${jsonData.buyer_order_number || 'Order Number'} Data: ${jsonData.buyer_order_date || 'Date'}`;

            // Other references
            case 'F7':
                return 'Inne odniesienia: Formularz EDF nr:';
            case 'F8':
                return `Numer: ${jsonData.edf_number || 'EDF Number'} Data: ${jsonData.edf_date || 'Date'}`;

            // Consignee
            case 'A9':
                return 'Odbiorca:';
            case 'A10':
                return jsonData.consignee || 'Consignee';

            // Buyer
            case 'F9':
                return 'Kupujący (jeśli inny niż odbiorca):';
            case 'F10':
                return jsonData.buyer || 'Buyer';

            // Shipping info
            case 'A18':
                return 'Przewóz wstępny przez:';
            case 'A19':
                return jsonData.pre_carriage_by || 'Pre-carriage';
            case 'C18':
                return 'Miejsce odbioru przez przewoźnika wstępnego:';
            case 'C19':
                return jsonData.place_of_receipt || 'Place of Receipt';

            // Vessel info
            case 'A20':
                return 'Numer statku/lotu';
            case 'A21':
                return jsonData.vessel_number || 'Vessel Number';
            case 'C20':
                return 'Port załadunku';
            case 'C21':
                return jsonData.port_of_loading || 'Port of Loading';

            // Discharge info
            case 'A22':
                return 'Port rozładunku';
            case 'A23':
                return jsonData.port_of_discharge || 'Port of Discharge';
            case 'C22':
                return 'Ostateczny cel';
            case 'C23':
                return jsonData.final_destination || 'Final Destination';

            // Country info
            case 'F17':
                return 'Kraj pochodzenia towarów:';
            case 'F18':
                return jsonData.country_of_origin_of_goods || 'Country of Origin';
            case 'I17':
                return 'Kraj docelowy:';
            case 'I18':
                return jsonData.country_of_final_destination || 'Country of Destination';

            // Terms
            case 'F19':
                return 'Warunki dostawy i płatności:';
            case 'F20':
                return 'Warunki';
            case 'G20':
                return jsonData.terms || 'Terms';

            // Banker
            case 'F21':
                return 'Bankier';
            case 'F22':
                return jsonData.banker || 'Banker';

            // Account info
            case 'F23':
                return `A/C Code: ${jsonData.account_code || 'Account Code'} Swift Code: ${jsonData.swift_code || 'Swift Code'} (AD Code No.: ${jsonData.ad_code || 'AD Code'})`;

            // Table headers
            case 'A24':
                return 'Marks & Nos.';
            case 'B24':
                return 'Liczba i rodzaj opakowań.';
            case 'E24':
                return 'Opis towaru';
            case 'G24':
                return 'UOM';
            case 'H24':
                return 'Ilość';
            case 'I24':
                return 'Stawka USD $';
            case 'J24':
                return 'Kwota USD $';

            // Weight headers
            case 'D27':
                return 'Waga brutto (gramy)';
            case 'E27':
                return 'Waga netto (gramy)';

            // Items data
            default:
                return this.getItemsData(row, col, jsonData, options);
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
     * Get items data for specific rows
     */
    getItemsData(row, col, jsonData, options) {
        // Items start from row 28 (1-based = 28)
        const itemRow = row - 28;

        if (itemRow < 0 || !jsonData.items || !jsonData.items[itemRow]) {
            return '';
        }

        const item = jsonData.items[itemRow];
        const cellAddress = this.getCellAddress(row, col);

        switch (cellAddress) {
            case 'A28':
            case 'A29':
            case 'A30':
            case 'A31':
            case 'A32':
            case 'A33':
            case 'A34':
            case 'A35':
                return item.description || '';
            case 'C28':
            case 'C29':
            case 'C30':
            case 'C31':
            case 'C32':
            case 'C33':
            case 'C34':
            case 'C35':
                return item.type || '';
            case 'D28':
            case 'D29':
            case 'D30':
            case 'D31':
            case 'D32':
            case 'D33':
            case 'D34':
            case 'D35':
                return item.gross_wt || '';
            case 'E28':
            case 'E29':
            case 'E30':
            case 'E31':
            case 'E32':
            case 'E33':
            case 'E34':
            case 'E35':
                return item.net_wt || '';
            case 'F28':
            case 'F29':
            case 'F30':
            case 'F31':
            case 'F32':
            case 'F33':
            case 'F34':
            case 'F35':
                return item.hsn_code || '';
            case 'G28':
            case 'G29':
            case 'G30':
            case 'G31':
            case 'G32':
            case 'G33':
            case 'G34':
            case 'G35':
                return item.uom || '';
            case 'H28':
            case 'H29':
            case 'H30':
            case 'H31':
            case 'H32':
            case 'H33':
            case 'H34':
            case 'H35':
                return item.quantity || '';
            case 'I28':
            case 'I29':
            case 'I30':
            case 'I31':
            case 'I32':
            case 'I33':
            case 'I34':
            case 'I35':
                return item.rate || '';
            case 'J28':
            case 'J29':
            case 'J30':
            case 'J31':
            case 'J32':
            case 'J33':
            case 'J34':
            case 'J35':
                return item.amount || '';
            default:
                return '';
        }
    }

    /**
     * Set cell with ExcelJS formatting
     */
    setCellWithExcelJSFormat(row, col, value, templateCell) {
        const cell = this.worksheet.getCell(row, col);

        // Set value
        cell.value = value;

        // Apply formatting based on cell type
        if (templateCell.isHeader) {
            this.applyHeaderFormatting(cell);
        } else if (templateCell.isTotal) {
            this.applyTotalFormatting(cell);
        } else if (templateCell.isData && typeof value === 'number') {
            this.applyNumberFormatting(cell);
        } else {
            this.applyDefaultFormatting(cell);
        }

        console.log(`Set cell ${this.getCellAddress(row, col)}: "${value}"`);
    }

    /**
     * Apply header formatting
     */
    applyHeaderFormatting(cell) {
        cell.font = {
            name: 'Arial',
            size: 11,
            bold: true,
            color: { argb: 'FF000000' }
        };

        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE6E6E6' }
        };

        cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
        };

        cell.alignment = {
            vertical: 'middle',
            horizontal: 'center',
            wrapText: true
        };
    }

    /**
     * Apply total formatting
     */
    applyTotalFormatting(cell) {
        cell.font = {
            name: 'Arial',
            size: 10,
            bold: true,
            color: { argb: 'FF000000' }
        };

        cell.alignment = {
            vertical: 'middle',
            horizontal: 'right',
            wrapText: true
        };

        cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
        };
    }

    /**
     * Apply number formatting
     */
    applyNumberFormatting(cell) {
        cell.font = {
            name: 'Arial',
            size: 10,
            color: { argb: 'FF000000' }
        };

        cell.alignment = {
            vertical: 'middle',
            horizontal: 'right',
            wrapText: true
        };

        cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
        };

        // Apply number format
        if (typeof cell.value === 'number') {
            cell.numFmt = '#,##0.00';
        }
    }

    /**
     * Apply default formatting
     */
    applyDefaultFormatting(cell) {
        cell.font = {
            name: 'Arial',
            size: 10,
            color: { argb: 'FF000000' }
        };

        cell.alignment = {
            vertical: 'middle',
            horizontal: 'left',
            wrapText: true
        };

        cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
        };
    }

    /**
     * Apply merged cells from sample
     */
    applyMergedCells() {
        if (this.templateStructure.mergedCells) {
            this.templateStructure.mergedCells.forEach(merge => {
                const startRow = merge.s.r + 1; // ExcelJS uses 1-based indexing
                const startCol = merge.s.c + 1;
                const endRow = merge.e.r + 1;
                const endCol = merge.e.c + 1;

                this.worksheet.mergeCells(startRow, startCol, endRow, endCol);
            });
            console.log(`✅ Applied ${this.templateStructure.mergedCells.length} merged cells`);
        }
    }

    /**
     * Apply formulas from sample
     */
    applyFormulas(jsonData) {
        if (this.templateStructure.formulas) {
            Object.keys(this.templateStructure.formulas).forEach(cellAddress => {
                const formula = this.templateStructure.formulas[cellAddress];
                const cellRef = this.parseCellAddress(cellAddress);
                const cell = this.worksheet.getCell(cellRef.row, cellRef.col);

                cell.value = { formula: formula };
                cell.font = {
                    name: 'Arial',
                    size: 10,
                    color: { argb: 'FF000000' }
                };
                cell.alignment = {
                    vertical: 'middle',
                    horizontal: 'right',
                    wrapText: true
                };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FF000000' } },
                    left: { style: 'thin', color: { argb: 'FF000000' } },
                    bottom: { style: 'thin', color: { argb: 'FF000000' } },
                    right: { style: 'thin', color: { argb: 'FF000000' } }
                };

                console.log(`Set formula ${cellAddress}: ${formula}`);
            });
            console.log(`✅ Applied ${Object.keys(this.templateStructure.formulas).length} formulas`);
        }
    }

    /**
     * Save the workbook
     * @param {string} outputPath - Path to save the file
     */
    async saveWorkbook(outputPath) {
        try {
            await this.workbook.xlsx.writeFile(outputPath);
            console.log(`💾 ExcelJS workbook saved to: ${outputPath}`);

            // Check file size
            const stats = await fs.stat(outputPath);
            console.log(`📈 File size: ${stats.size} bytes`);

            return outputPath;
        } catch (error) {
            console.error('❌ Error saving ExcelJS workbook:', error);
            throw error;
        }
    }
}

/**
 * Test function
 */
async function testExcelJSTemplate() {
    try {
        console.log('🧪 Testing ExcelJS Template Generator...');

        // Load template structure
        const generator = new ExcelJSTemplateGenerator();
        const analysisPath = path.join(__dirname, 'test_output', 'sample-invoice-analysis.json');
        await generator.loadTemplateStructure(analysisPath);

        // Create workbook
        generator.createWorkbookFromSample();

        // Sample JSON data
        const sampleJsonData = {
            "merchant_exporter": "Estrella Jewels LLP\n312, OPTIONS PRIMO PREMISES CHSL,\nMAROL INDUSTRIAL ESTATE, MIDC CROSS ROAD NO.21\nANDHERI EAST, MUMBAI 400 093, India.\nGSTIN 27AADFE3151H1ZP",
            "invoice_number": "EJL/25-26/449",
            "invoice_date": "26-07-2025",
            "exporter_reference": "IEC NR 0311011098",
            "buyer_order_number": "ORDER-001",
            "buyer_order_date": "26/07/2025",
            "edf_number": "EDF-123",
            "edf_date": "26/07/2025",
            "consignee": "Estrella Jewels Sp. z o.o., Sp. k.\nUl. Sabaly 58, 02-174 warszawa\nPoland\nVAT Nr. - 5252812119 REGON - 385302234\nContact Person : Amit Gupta\nTel : 0048 222583398 Fax : ",
            "buyer": "Estrella Jewels Sp. z o.o., Sp. k.\nUl. Wybrzeze Kosciuszkowskie 31/33. 00-379 Warszawa, Poland",
            "pre_carriage_by": "DHL",
            "place_of_receipt": "INDIA",
            "vessel_number": "AIR FREIGHT",
            "port_of_loading": "MUMBAI",
            "port_of_discharge": "WARSAW",
            "final_destination": "POLAND",
            "country_of_origin_of_goods": "INDIA",
            "country_of_final_destination": "POLAND",
            "terms": "90 dni",
            "banker": "KOTAK MAHINDRA BANK LIMITED\nJVPD SCHEME, JUHU, VILE PARLE WEST, MUMBAI 400049, INDIA",
            "account_code": "8611636434",
            "swift_code": "KKBKINBB",
            "ad_code": "018017129100091",
            "items": [
                {
                    "description": "PCS, SL925 SILVER Stud 18k Com Diam Jew",
                    "type": "BRACELET",
                    "hsn_code": "71131990",
                    "uom": "PCS",
                    "quantity": 1,
                    "gross_wt": 12.7,
                    "net_wt": 12.647,
                    "rate": 228,
                    "amount": 228
                },
                {
                    "description": "PCS, SL925 SILVER Stud 18k Com Diam Jew",
                    "type": "NECKLACE",
                    "hsn_code": "71131990",
                    "uom": "PCS",
                    "quantity": 2,
                    "gross_wt": 17.77,
                    "net_wt": 17.359,
                    "rate": 554,
                    "amount": 1108
                },
                {
                    "description": "PCS, SL925 SILVERStud With Diam Jewel",
                    "type": "RING",
                    "hsn_code": "71131143",
                    "uom": "PCS",
                    "quantity": 2,
                    "gross_wt": 3.19,
                    "net_wt": 2.793,
                    "rate": 406,
                    "amount": 812
                }
            ]
        };

        // Translation options
        const translationOptions = {
            currencyConversion: {
                exchangeRate: 4.2,
                sourceCurrency: 'USD',
                targetCurrency: 'PLN'
            },
            targetLanguage: 'Polish'
        };

        // Apply template
        await generator.applySampleTemplate(sampleJsonData, translationOptions);

        // Save workbook
        const outputPath = path.join(__dirname, 'test_output', 'exceljs-template-invoice.xlsx');
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await generator.saveWorkbook(outputPath);

        console.log('\n✅ ExcelJS template test completed successfully!');
        console.log(`📄 Generated file: ${outputPath}`);

    } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    testExcelJSTemplate()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('❌ Failed:', error);
            process.exit(1);
        });
}

module.exports = ExcelJSTemplateGenerator;

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs').promises;

/**
 * Sample Invoice Analyzer using ExcelJS - Extract exact structure and formatting
 */
class SampleInvoiceAnalyzer {
    constructor() {
        this.workbook = null;
        this.worksheet = null;
        this.analysis = null;
    }

    /**
     * Analyze the sample invoice file using ExcelJS
     * @param {string} filePath - Path to sample invoice file
     */
    async analyzeSampleInvoice(filePath) {
        try {
            console.log(`🔍 Analyzing sample invoice: ${filePath}`);

            // Read the workbook using ExcelJS
            this.workbook = new ExcelJS.Workbook();
            await this.workbook.xlsx.readFile(filePath);

            const sheetName = this.workbook.worksheets[0].name;
            this.worksheet = this.workbook.getWorksheet(sheetName);

            // Get worksheet dimensions
            const rowCount = this.worksheet.rowCount;
            const columnCount = this.worksheet.columnCount;

            // Initialize analysis structure
            this.analysis = {
                sheetName: sheetName,
                totalRows: rowCount || 50,
                totalCols: columnCount || 10,
                cells: {},
                mergedCells: [],
                columnWidths: [],
                rowHeights: [],
                styles: {},
                formulas: {},
                dataTypes: {},
                template: {
                    cells: {},
                    mergedCells: [],
                    formulas: {},
                    columnWidths: [],
                    rowHeights: []
                }
            };

            // Analyze merged cells
            this.worksheet.eachMergedCell((mergedCell) => {
                const mergeRange = {
                    s: { r: mergedCell.top - 1, c: mergedCell.left - 1 },
                    e: { r: mergedCell.bottom - 1, c: mergedCell.right - 1 }
                };
                this.analysis.mergedCells.push(mergeRange);
                this.analysis.template.mergedCells.push(mergeRange);
            });

            // Analyze column widths
            for (let i = 1; i <= this.analysis.totalCols; i++) {
                const column = this.worksheet.getColumn(i);
                const width = column.width || 18;
                this.analysis.columnWidths.push({ wch: width });
                this.analysis.template.columnWidths.push({ wch: width });
            }

            // Analyze row heights
            for (let i = 1; i <= this.analysis.totalRows; i++) {
                const row = this.worksheet.getRow(i);
                const height = row.height || 15;
                this.analysis.rowHeights.push({ hpt: height });
                this.analysis.template.rowHeights.push({ hpt: height });
            }

            // Analyze each cell
            this.worksheet.eachCell((cell, rowNumber, colNumber) => {
                const cellAddress = this.getCellAddress(rowNumber, colNumber);

                const cellData = {
                    value: cell.value,
                    type: cell.type,
                    formula: cell.formula,
                    style: cell.style,
                    comment: cell.comment,
                    isHeader: this.isHeaderCell(rowNumber, colNumber),
                    isTotal: this.isTotalCell(rowNumber, colNumber),
                    isData: this.isDataCell(rowNumber, colNumber)
                };

                this.analysis.cells[cellAddress] = cellData;
                this.analysis.template.cells[cellAddress] = cellData;

                // Track formulas
                if (cell.formula) {
                    this.analysis.formulas[cellAddress] = cell.formula;
                    this.analysis.template.formulas[cellAddress] = cell.formula;
                }

                // Track styles
                if (cell.style) {
                    this.analysis.styles[cellAddress] = cell.style;
                }

                // Track data types
                this.analysis.dataTypes[cellAddress] = cell.type;
            });

            console.log(`✅ Analysis complete: ${this.analysis.totalRows} rows, ${this.analysis.totalCols} columns`);
            console.log(`📝 Found ${Object.keys(this.analysis.cells).length} cells with content`);
            console.log(`🔗 Found ${this.analysis.mergedCells.length} merged cell ranges`);
            console.log(`🧮 Found ${Object.keys(this.analysis.formulas).length} formulas`);

            return this.analysis;

        } catch (error) {
            console.error('❌ Error analyzing sample invoice:', error);
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
     * Check if cell is a header cell
     */
    isHeaderCell(row, col) {
        // Title row
        if (row === 1) return true;

        // Table headers
        if (row === 24) return true;

        // Weight headers
        if (row === 27 && (col === 4 || col === 5)) return true;

        // Label cells (rows 3, 9, 17-23)
        if ([3, 9, 17, 18, 19, 20, 21, 22, 23].includes(row)) return true;

        return false;
    }

    /**
     * Check if cell is a total cell
     */
    isTotalCell(row, col) {
        // Total rows (36, 44, 47)
        if ([36, 44, 47].includes(row)) return true;

        return false;
    }

    /**
     * Check if cell is a data cell
     */
    isDataCell(row, col) {
        // Items data rows (28-35)
        if (row >= 28 && row <= 35) return true;

        // Weight columns (4, 5)
        if (col === 4 || col === 5) return true;

        // Rate and amount columns (9, 10)
        if (col === 9 || col === 10) return true;

        return false;
    }

    /**
     * Save analysis to JSON file
     * @param {string} outputPath - Path to save analysis
     */
    async saveAnalysis(outputPath) {
        try {
            await fs.writeFile(outputPath, JSON.stringify(this.analysis, null, 2), 'utf8');
            console.log(`💾 Analysis saved to: ${outputPath}`);
            return outputPath;
        } catch (error) {
            console.error('❌ Error saving analysis:', error);
            throw error;
        }
    }

    /**
     * Print detailed analysis
     */
    printDetailedAnalysis() {
        console.log('\n📋 DETAILED ANALYSIS:');
        console.log('==================================================');

        console.log(`\n📏 COLUMN WIDTHS:`);
        if (this.analysis.columnWidths.length > 0) {
            this.analysis.columnWidths.forEach((col, index) => {
                console.log(`   Col ${this.getCellAddress(1, index + 1)}: wch=${col.wch}`);
            });
        } else {
            console.log('No specific column width settings found.');
        }

        console.log(`\n📏 ROW HEIGHTS:`);
        if (this.analysis.rowHeights.length > 0) {
            this.analysis.rowHeights.forEach((row, index) => {
                console.log(`   Row ${index + 1}: hpt=${row.hpt}`);
            });
        } else {
            console.log('No specific row height settings found.');
        }

        console.log(`\n🔗 MERGED CELLS:`);
        this.analysis.mergedCells.forEach((merge, index) => {
            const startAddr = this.getCellAddress(merge.s.r + 1, merge.s.c + 1);
            const endAddr = this.getCellAddress(merge.e.r + 1, merge.e.c + 1);
            console.log(`   ${index + 1}. ${startAddr}:${endAddr}`);
        });

        console.log(`\n🧮 FORMULAS:`);
        Object.keys(this.analysis.formulas).forEach(cellAddress => {
            console.log(`   ${cellAddress}: ${this.analysis.formulas[cellAddress]}`);
        });

        console.log(`\n📝 CELL CONTENTS BY ROW:`);
        const cellsByRow = {};
        Object.keys(this.analysis.cells).forEach(cellAddress => {
            const cellRef = this.parseCellAddress(cellAddress);
            const row = cellRef.row;
            if (!cellsByRow[row]) cellsByRow[row] = [];
            cellsByRow[row].push(`${cellAddress}: "${this.analysis.cells[cellAddress].value}"`);
        });

        Object.keys(cellsByRow).sort((a, b) => parseInt(a) - parseInt(b)).forEach(row => {
            console.log(`   Row ${row}: ${cellsByRow[row].join(', ')}`);
        });

        console.log('\n==================================================');
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
}

/**
 * Main analysis function
 */
async function analyzeSampleInvoice(sampleFilePath) {
    try {
        console.log(`🔍 Analyzing sample invoice: ${sampleFilePath}`);

        const analyzer = new SampleInvoiceAnalyzer();
        const analysis = await analyzer.analyzeSampleInvoice(sampleFilePath);

        console.log(`📋 Sheet name: ${analysis.sheetName}`);
        console.log(`📊 Dimensions: ${analysis.totalRows} rows × ${analysis.totalCols} columns`);
        console.log(`📝 Found ${Object.keys(analysis.cells).length} cells with content`);
        console.log(`🔗 Found ${analysis.mergedCells.length} merged cell ranges`);
        console.log(`📐 Found ${analysis.columnWidths.length} column width settings`);
        console.log(`📏 Found ${analysis.rowHeights.length} row height settings`);
        console.log(`🧮 Found ${Object.keys(analysis.formulas).length} formulas`);

        // Print detailed analysis
        analyzer.printDetailedAnalysis();

        // Save analysis
        const outputDir = path.join(__dirname, 'test_output');
        await fs.mkdir(outputDir, { recursive: true });
        const outputPath = path.join(outputDir, 'sample-invoice-analysis.json');
        await analyzer.saveAnalysis(outputPath);

        console.log(`💾 Analysis saved to: ${outputPath}`);
        return analysis;

    } catch (error) {
        console.error('❌ Sample invoice analysis failed:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    const sampleInvoicePath = path.join(__dirname, 'sample-invoice.xlsx');
    analyzeSampleInvoice(sampleInvoicePath)
        .then(() => console.log('✅ Sample invoice analysis completed successfully!'))
        .catch(error => console.error('❌ Sample invoice analysis failed:', error));
}

module.exports = { SampleInvoiceAnalyzer, analyzeSampleInvoice };
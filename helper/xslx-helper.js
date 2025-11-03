const ExcelJS = require('exceljs');

const extractXlsxData = async (filePath) => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];
    const data = worksheet.rows.map(row => row.values);
    return data;
};

class XlsxHelper {
    constructor() {
        this.workbook = new ExcelJS.Workbook();
        this.worksheet = null;
    }
    async load(filePath, sheetIndex = 0) {
        await this.workbook.xlsx.readFile(filePath);
        this.worksheet = this.workbook.worksheets[sheetIndex];
        if (!this.worksheet) throw new Error('Worksheet not found at index ' + sheetIndex);
    }
    getCellValue(address) {
        if (!this.worksheet) throw new Error('Worksheet not loaded!');
        const cell = this.worksheet.getCell(address);
        return cell.value;
    }
    getRowValue(rowNumber) {
        if (!this.worksheet) throw new Error('Worksheet not loaded!');
        const row = this.worksheet.getRow(rowNumber);
        // row.values[0] is null due to 1-based index, so slice(1)
        return row.values.slice(1);
    }
}

module.exports = { extractXlsxData, XlsxHelper };
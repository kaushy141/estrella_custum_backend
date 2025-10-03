const ExcelJS = require('exceljs');

async function generatePolishInvoiceXlsx(data) {

    // Create workbook in memory
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Invoice');

    // Hide gridlines and fit to pages
    worksheet.properties.showGridLines = false;

    // Set column widths
    worksheet.getColumn('A').width = 18;
    worksheet.getColumn('B').width = 18;
    worksheet.getColumn('C').width = 18;
    worksheet.getColumn('D').width = 18;
    worksheet.getColumn('E').width = 18;
    worksheet.getColumn('F').width = 18;
    worksheet.getColumn('G').width = 18;
    worksheet.getColumn('H').width = 18;
    worksheet.getColumn('I').width = 18;
    worksheet.getColumn('J').width = 18;

    // Helper function to create border styles
    const createBorderStyle = (options = {}) => {
        const style = {
            font: { bold: options.bold || false },
            alignment: {
                horizontal: options.align || 'left',
                vertical: options.valign || 'middle'
            }
        };

        if (options.border || options.left || options.right || options.top || options.bottom) {
            style.border = {};
            if (options.border || options.left) style.border.left = { style: 'thin' };
            if (options.border || options.right) style.border.right = { style: 'thin' };
            if (options.border || options.top) style.border.top = { style: 'thin' };
            if (options.border || options.bottom) style.border.bottom = { style: 'thin' };
        }

        if (options.text_wrap) {
            style.alignment.wrapText = true;
        }

        if (options.num_format) {
            style.numFmt = options.num_format;
        }

        return style;
    };

    // FAKTURA header
    worksheet.mergeCells('A1:J2');
    worksheet.getCell('A1').value = 'FAKTURA';
    worksheet.getCell('A1').style = createBorderStyle({ bold: true, border: true, align: 'center', valign: 'middle' });

    // Header sections
    worksheet.mergeCells('A3:E3');
    worksheet.getCell('A3').value = 'Eksporter handlowy:';
    worksheet.getCell('A3').style = createBorderStyle({ bold: true, border: true, align: 'left', valign: 'middle' });

    worksheet.mergeCells('F3:H3');
    worksheet.getCell('F3').value = 'Numer i data faktury';
    worksheet.getCell('F3').style = createBorderStyle({ bold: true, border: true, align: 'left', valign: 'middle' });

    worksheet.mergeCells('I3:J3');
    worksheet.getCell('I3').value = 'Numer referencyjny eksportera:';
    worksheet.getCell('I3').style = createBorderStyle({ bold: true, border: true, align: 'left', valign: 'middle' });

    // Merchant exporter info
    worksheet.mergeCells('A4:E8');
    worksheet.getCell('A4').value = data.merchant_exporter;
    worksheet.getCell('A4').style = createBorderStyle({ bold: true, border: true, text_wrap: true, align: 'left', valign: 'top' });

    // Invoice number and date
    worksheet.mergeCells('F4:H4');
    worksheet.getCell('F4').value = `${data.invoice_number} Data: ${data.invoice_date}`;
    worksheet.getCell('F4').style = createBorderStyle({ bold: true, border: true, align: 'left', valign: 'middle' });

    // Exporter reference
    worksheet.mergeCells('I4:J4');
    worksheet.getCell('I4').value = data.exporter_reference;
    worksheet.getCell('I4').style = createBorderStyle({ bold: true, border: true, align: 'left', valign: 'middle' });

    // Order number section
    worksheet.mergeCells('F5:J6');
    worksheet.getCell('F5').value = 'Numer i data zamówienia kupującego:';
    worksheet.getCell('F5').style = createBorderStyle({ bold: true, border: true, align: 'left', valign: 'top' });

    // Other references
    worksheet.mergeCells('F7:J8');
    worksheet.getCell('F7').value = `Inne odniesienia: EDF FORMULARZ NR : \nData : ${data.invoice_date}`;
    worksheet.getCell('F7').style = createBorderStyle({ bold: true, border: true, text_wrap: true, align: 'left', valign: 'middle' });

    // Consignee and buyer headers
    worksheet.mergeCells('A9:E9');
    worksheet.getCell('A9').value = 'Odbiorca:';
    worksheet.getCell('A9').style = createBorderStyle({ bold: true, border: true, text_wrap: true, align: 'left', valign: 'top' });

    worksheet.mergeCells('F9:J9');
    worksheet.getCell('F9').value = 'Nabywca (jeśli inny niż odbiorca):';
    worksheet.getCell('F9').style = createBorderStyle({ bold: true, border: true, align: 'left', valign: 'middle' });

    // Consignee and buyer details
    worksheet.mergeCells('A10:E17');
    worksheet.getCell('A10').value = data.consignee;
    worksheet.getCell('A10').style = createBorderStyle({ bold: true, border: true, text_wrap: true, align: 'left', valign: 'top' });

    worksheet.mergeCells('F10:J16');
    worksheet.getCell('F10').value = data.buyer;
    worksheet.getCell('F10').style = createBorderStyle({ bold: true, border: true, text_wrap: true, align: 'left', valign: 'top' });

    // Pre-carriage info
    worksheet.mergeCells('A18:B19');
    worksheet.getCell('A18').value = `Przewóz wstępny przez: \n${data.pre_carriage_by}`;
    worksheet.getCell('A18').style = createBorderStyle({ bold: true, border: true, text_wrap: true, align: 'left', valign: 'top' });

    worksheet.mergeCells('C18:E19');
    worksheet.getCell('C18').value = `Miejsce odbioru przez przewoźnika wstępnego: \n${data.place_of_receipt}`;
    worksheet.getCell('C18').style = createBorderStyle({ bold: true, border: true, text_wrap: true, align: 'left', valign: 'top' });

    // Vessel and port info
    worksheet.mergeCells('A20:B21');
    worksheet.getCell('A20').value = `Numer statku/lotu \n${data.vessel_number}`;
    worksheet.getCell('A20').style = createBorderStyle({ bold: true, border: true, text_wrap: true, align: 'left', valign: 'top' });

    worksheet.mergeCells('C20:E21');
    worksheet.getCell('C20').value = `Port załadunku \n${data.port_of_loading}`;
    worksheet.getCell('C20').style = createBorderStyle({ bold: true, border: true, text_wrap: true, align: 'left', valign: 'top' });

    // Discharge and destination
    worksheet.mergeCells('A22:B23');
    worksheet.getCell('A22').value = `Port rozładunku \n${data.port_of_discharge}`;
    worksheet.getCell('A22').style = createBorderStyle({ bold: true, border: true, text_wrap: true, align: 'left', valign: 'top' });

    worksheet.mergeCells('C22:E23');
    worksheet.getCell('C22').value = `Ostateczny cel \n${data.final_destination}`;
    worksheet.getCell('C22').style = createBorderStyle({ bold: true, border: true, text_wrap: true, align: 'left', valign: 'top' });

    // Country information
    worksheet.mergeCells('F17:H18');
    worksheet.getCell('F17').value = `Kraj pochodzenia towarów: \n${data.country_of_origin_of_goods}`;
    worksheet.getCell('F17').style = createBorderStyle({ bold: true, border: true, text_wrap: true, align: 'left', valign: 'top' });

    worksheet.mergeCells('I17:J18');
    worksheet.getCell('I17').value = `Kraj docelowy: \n${data.country_of_final_destination}`;
    worksheet.getCell('I17').style = createBorderStyle({ bold: true, border: true, text_wrap: true, align: 'left', valign: 'top' });

    // Payment terms
    worksheet.mergeCells('F19:J19');
    worksheet.getCell('F19').value = 'Warunki dostawy i płatności:';
    worksheet.getCell('F19').style = createBorderStyle({ bold: true, top: true, left: true, right: true, text_wrap: true, align: 'left', valign: 'middle' });

    worksheet.getCell('F20').value = 'Warunki';
    worksheet.getCell('F20').style = createBorderStyle({ bold: true, align: 'left', valign: 'middle' });

    worksheet.mergeCells('G20:J20');
    worksheet.getCell('G20').value = data.terms;
    worksheet.getCell('G20').style = createBorderStyle({ bold: true, right: true, text_wrap: true, align: 'left', valign: 'middle' });

    // Banker information
    worksheet.mergeCells('F21:F22');
    worksheet.getCell('F21').value = 'Bankier';
    worksheet.getCell('F21').style = createBorderStyle({ bold: true, align: 'left', valign: 'middle' });

    worksheet.mergeCells('G21:J22');
    worksheet.getCell('G21').value = data.banker;
    worksheet.getCell('G21').style = createBorderStyle({ bold: true, right: true, text_wrap: true, align: 'left', valign: 'middle' });

    worksheet.mergeCells('F23:J23');
    worksheet.getCell('F23').value = `A/C Code: ${data.account_code} Swift Code: ${data.swift_code} (AD Code No.: ${data.ad_code})`;
    worksheet.getCell('F23').style = createBorderStyle({ bold: true, right: true, bottom: true, text_wrap: true, align: 'left', valign: 'middle' });

    // Table headers
    worksheet.getCell('A24').value = 'Marks & Nos.';
    worksheet.getCell('A24').style = createBorderStyle({ bold: true, left: true, align: 'left', valign: 'middle' });

    worksheet.getCell('B24').value = 'Liczba i rodzaj opakowań.';
    worksheet.getCell('B24').style = createBorderStyle({ bold: true, align: 'left', valign: 'middle' });

    worksheet.mergeCells('E24:F24');
    worksheet.getCell('E24').value = 'Opis towaru';
    worksheet.getCell('E24').style = createBorderStyle({ bold: true, right: true, text_wrap: true, align: 'left', valign: 'middle' });

    worksheet.getCell('G24').value = 'UOM';
    worksheet.getCell('G24').style = createBorderStyle({ bold: true, right: true, align: 'center', valign: 'middle' });

    worksheet.getCell('H24').value = 'Ilość';
    worksheet.getCell('H24').style = createBorderStyle({ bold: true, right: true, align: 'center', valign: 'middle' });

    worksheet.getCell('I24').value = 'Stawka USD $';
    worksheet.getCell('I24').style = createBorderStyle({ bold: true, right: true, align: 'left', valign: 'middle' });

    worksheet.getCell('J24').value = 'Kwota USD $';
    worksheet.getCell('J24').style = createBorderStyle({ bold: true, right: true, align: 'left', valign: 'middle' });

    // Weight headers
    worksheet.getCell('D27').value = 'Waga brutto (gramy)';
    worksheet.getCell('D27').style = createBorderStyle({ bold: true, text_wrap: true, align: 'center', valign: 'middle' });

    worksheet.getCell('E27').value = 'Waga netto (gramy)';
    worksheet.getCell('E27').style = createBorderStyle({ bold: true, text_wrap: true, align: 'center', valign: 'middle' });

    const rowStart = 29;

    // Add items
    data.items = data.items || [];
    data.items.forEach((item, index) => {
        const rowNum = index + rowStart;

        worksheet.mergeCells(`A${rowNum}:B${rowNum}`);
        worksheet.getCell(`A${rowNum}`).value = item.description || '';
        worksheet.getCell(`A${rowNum}`).style = createBorderStyle({ bold: true, left: true, text_wrap: true, align: 'left', valign: 'middle' });

        worksheet.getCell(`C${rowNum}`).value = item.type || '';
        worksheet.getCell(`C${rowNum}`).style = createBorderStyle({ bold: true, text_wrap: true, align: 'left', valign: 'middle' });

        worksheet.getCell(`D${rowNum}`).value = item.gross_wt || '';
        worksheet.getCell(`D${rowNum}`).style = createBorderStyle({ bold: true, num_format: '0.000', text_wrap: true, align: 'center', valign: 'middle' });

        worksheet.getCell(`E${rowNum}`).value = item.net_wt || '';
        worksheet.getCell(`E${rowNum}`).style = createBorderStyle({ bold: true, text_wrap: true, align: 'center', valign: 'middle' });

        worksheet.getCell(`F${rowNum}`).value = item.hs_code || '';
        worksheet.getCell(`F${rowNum}`).style = createBorderStyle({ bold: true, right: true, text_wrap: true, align: 'center', valign: 'middle' });

        worksheet.getCell(`G${rowNum}`).value = item.uom || '';
        worksheet.getCell(`G${rowNum}`).style = createBorderStyle({ bold: true, right: true, text_wrap: true, align: 'center', valign: 'middle' });

        worksheet.getCell(`H${rowNum}`).value = item.quantity || '';
        worksheet.getCell(`H${rowNum}`).style = createBorderStyle({ bold: true, right: true, text_wrap: true, align: 'center', valign: 'middle' });

        worksheet.getCell(`I${rowNum}`).value = item.rate || '';
        worksheet.getCell(`I${rowNum}`).style = createBorderStyle({ bold: true, right: true, text_wrap: true, align: 'right', valign: 'middle' });

        worksheet.getCell(`J${rowNum}`).value = item.amount || '';
        worksheet.getCell(`J${rowNum}`).style = createBorderStyle({ bold: true, right: true, text_wrap: true, align: 'right', valign: 'middle' });
    });

    const tableEndRow = rowStart + data.items.length;

    // Sum formulas
    worksheet.getCell(`D${tableEndRow + 1}`).value = { formula: `SUM(D${rowStart}:D${tableEndRow - 1})` };
    worksheet.getCell(`D${tableEndRow + 1}`).style = createBorderStyle({ bold: true, top: true, bottom: true, num_format: '0.000', text_wrap: true, align: 'center', valign: 'middle' });

    worksheet.getCell(`E${tableEndRow + 1}`).value = { formula: `SUM(E${rowStart}:E${tableEndRow - 1})` };
    worksheet.getCell(`E${tableEndRow + 1}`).style = createBorderStyle({ bold: true, top: true, bottom: true, num_format: '0.000', text_wrap: true, align: 'center', valign: 'middle' });

    // Final note
    worksheet.mergeCells(`A${tableEndRow + 3}:F${tableEndRow + 4}`);
    worksheet.getCell(`A${tableEndRow + 3}`).value = `DOSTAWA PRZEZNACZONA NA EKSPORT LIST ZOBOWIĄZANIA BEZ \nPŁATNOŚCI IGST POD NUMEREM LUT ARN. ${data.arn_number || ''}`;
    worksheet.getCell(`A${tableEndRow + 3}`).style = createBorderStyle({ bold: true, left: true, right: true, text_wrap: true, align: 'left', valign: 'middle' });

    // Return the workbook data as buffer
    return await workbook.xlsx.writeBuffer();
}

module.exports = {
    generatePolishInvoiceXlsx
};

// Example usage:
// const data = {
//     "merchant_exporter": "Estrella Jewels LLP\n312, OPTIONS PRIMO PREMISES CHSL,\nMAROL INDUSTRIAL ESTATE, MIDC CROSS ROAD NO.21\nANDHERI EAST, MUMBAI 400 093, India.\nGSTIN 27AADFE3151H1ZP",
//     "invoice_number": "EJL/25-26/448",
//     "invoice_date": "26-07-2025",
//     "exporter_reference": "IEC NO. 0311011098",
//     "consignee": "Estrella Jewels Sp. z o.o., Sp. k.\nUl. Sabaly 58, 02-174 warszawa\nPoland\nVAT Nr. - 5252812119 REGON - 385302234\nContact Person : Amit Gupta\nTel : 0048 222583398 Fax : ",
//     "buyer": "Estrella Jewels Sp. z o.o., Sp. k.\nUl. Wybrzeze Kosciuszkowskie 31/33. 00-379 Warszawa, Poland ",
//     "pre_carriage_by": "DHL",
//     "place_of_receipt": "INDIA",
//     "vessel_number": "AIR FREIGHT",
//     "port_of_loading": "MUMBAI",
//     "port_of_discharge": "WARSAW",
//     "final_destination": "POLAND",
//     "country_of_origin_of_goods": "INDIA",
//     "country_of_final_destination": "POLAND",
//     "terms": "90 Days",
//     "banker": "KOTAK MAHINDRA BANK LIMITED\nJVPD SCHEME, JUHU, VILE PARLE WEST, MUMBAI 400049, INDIA",
//     "account_code": "8611636434",
//     "swift_code": "KKBKINBB",
//     "ad_code": "018017129100091",
//     "items": [
//         {
//             "description": "PCS, SL925 SILVER Stud 18k Com Diam Jew",
//             "type": "BRACELET",
//             "hs_code": "71131990",
//             "uom": "PCS",
//             "quantity": 1,
//             "gross_wt": 12.7,
//             "net_wt": 12.647,
//             "rate": 228,
//             "amount": 228
//         },
//         {
//             "description": "PCS, SL925 SILVER Stud 18k Com Diam Jew",
//             "type": "NECKLACE",
//             "hs_code": "71131990",
//             "uom": "PCS",
//             "quantity": 2,
//             "gross_wt": 17.77,
//             "net_wt": 17.359,
//             "rate": 554,
//             "amount": 1108
//         },
//         {
//             "description": "PCS, SL925 SILVERStud With Diam Jewel",
//             "type": "RING",
//             "hs_code": "71131143",
//             "uom": "PCS",
//             "quantity": 2,
//             "gross_wt": 3.19,
//             "net_wt": 2.793,
//             "rate": 406,
//             "amount": 812
//         }
//     ],
//     "arn_number": "AD270325107604A"
// };
//
// generatePolishInvoiceXlsx(data).then(buffer => {
//     // Use the buffer - save to file, send as response, etc.
//     console.log('Excel file generated successfully');
// });
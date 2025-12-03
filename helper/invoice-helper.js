const { XlsxHelper } = require('./xslx-helper');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs/promises');

const extractInvoiceData = async (filePath) => {
    try {
        const xlsxHelper = new XlsxHelper();
        await xlsxHelper.load(filePath);

        // Change these to the exact cells for your file (below are generic guesses, replace if you know the correct layout)
        const invoiceNumber = xlsxHelper.getCellValue('F4');
        const date = xlsxHelper.getCellValue('F4');
        const exportReference = xlsxHelper.getCellValue('I4');
        const merchantExporter = xlsxHelper.getCellValue('A4');
        const consignee = xlsxHelper.getCellValue('A10');
        const buyer = xlsxHelper.getCellValue('F10');
        const preCarriageBy = xlsxHelper.getCellValue('A18');
        const placeOfReceipt = xlsxHelper.getCellValue('C18');
        const vesselNumber = xlsxHelper.getCellValue('A20');
        const portOfLoading = xlsxHelper.getCellValue('C20');
        const portOfDischarge = xlsxHelper.getCellValue('A22');
        const finalDestination = xlsxHelper.getCellValue('A22');
        const countryOfOriginOfGoods = xlsxHelper.getCellValue('F17');
        const countryOfFinalDestination = xlsxHelper.getCellValue('C22');
        const terms = xlsxHelper.getCellValue('G20');
        const bankerName = xlsxHelper.getCellValue('G21');
        const bankerAddress = xlsxHelper.getCellValue('G22');
        const bankerAccountDetails = xlsxHelper.getCellValue('F23');

        const packagingDetails = xlsxHelper.getCellValue('B25');
        invoiceHSNCode = xlsxHelper.getCellValue('C25');
        const itemsDescription = xlsxHelper.getCellValue('B26');

        const itemsHeaderLabelRate = xlsxHelper.getCellValue('I24');
        const itemsHeaderLabelAmount = xlsxHelper.getCellValue('J24');
        // Items (dynamic): Start from row 29, read columns A-D for each row (description, quantity, unitPrice, total) until description is empty
        const items = [];
        let row = 29;
        while (true) {
            const description = xlsxHelper.getCellValue(`A${row}`);
            if (description === undefined || description === null || description === "") break;
            const category = xlsxHelper.getCellValue(`C${row}`);
            const grossWeight = xlsxHelper.getCellValue(`D${row}`);
            const netWeight = xlsxHelper.getCellValue(`E${row}`);
            const HSCode = xlsxHelper.getCellValue(`F${row}`);
            const UOM = xlsxHelper.getCellValue(`G${row}`);
            const quantity = xlsxHelper.getCellValue(`H${row}`);
            const unitPriceInfo = xlsxHelper.getCellValue(`I${row}`);
            const unitPrice = unitPriceInfo?.result || unitPriceInfo;
            const total = xlsxHelper.getCellValue(`J${row}`);
            items.push({ description, category, grossWeight, netWeight, HSCode, UOM, quantity, unitPrice, total });
            row++;
        }

        const totalGrossWeightInfo = xlsxHelper.getCellValue(`D${row + 1}`);
        const totalGrossWeight = totalGrossWeightInfo?.result || totalGrossWeightInfo;
        const totalNetWeightInfo = xlsxHelper.getCellValue(`E${row + 1}`);
        const totalNetWeight = totalNetWeightInfo?.result || totalNetWeightInfo;

        const totalFOBAmountLabel = xlsxHelper.getCellValue(`I${row + 8}`);
        const totalFOBAmountInfo = xlsxHelper.getCellValue(`J${row + 8}`);
        const totalFOBAmount = totalFOBAmountInfo?.result || totalFOBAmountInfo;
        const totalFreightAmountLabel = xlsxHelper.getCellValue(`I${row + 9}`);
        const totalFreightAmountInfo = xlsxHelper.getCellValue(`J${row + 9}`);
        const totalFreightAmount = totalFreightAmountInfo?.result || totalFreightAmountInfo;
        const totalInsuranceAmountLabel = xlsxHelper.getCellValue(`I${row + 10}`);
        const totalInsuranceAmountInfo = xlsxHelper.getCellValue(`J${row + 10}`);
        const totalInsuranceAmount = totalInsuranceAmountInfo?.result || totalInsuranceAmountInfo;
        const totalCIFAmountLabel = xlsxHelper.getCellValue(`I${row + 11}`);
        const totalCIFAmountInfo = xlsxHelper.getCellValue(`J${row + 11}`);
        const totalCIFAmount = totalCIFAmountInfo?.result || totalCIFAmountInfo;

        const conversionRate = xlsxHelper.getCellValue(`B${row + 10}`);
        const totalValueLabel = xlsxHelper.getCellValue(`A${row + 11}`);
        const totalValueInfo = xlsxHelper.getCellValue(`B${row + 11}`);
        const totalValue = totalValueInfo?.result || totalValueInfo;
        const totalValueWords = xlsxHelper.getCellValue(`B${row + 13}`);

        const beneficiaryBankName = xlsxHelper.getCellValue(`C${row + 16}`);
        const beneficiaryBankAddress = xlsxHelper.getCellValue(`C${row + 17}`);
        const beneficiaryBankAccountNumber = xlsxHelper.getCellValue(`C${row + 18}`);
        const beneficiaryBankSwiftCode = xlsxHelper.getCellValue(`C${row + 19}`);
        const beneficiaryBankClearingCode = xlsxHelper.getCellValue(`C${row + 20}`);

        const correspondentBankName = xlsxHelper.getCellValue(`H${row + 16}`);
        const correspondentBankAddress = xlsxHelper.getCellValue(`H${row + 17}`);
        const correspondentBankAccountNumber = xlsxHelper.getCellValue(`H${row + 18}`);
        const correspondentBankSwiftCode = xlsxHelper.getCellValue(`H${row + 19}`);
        const correspondentBankClearingCode = xlsxHelper.getCellValue(`H${row + 20}`);
        const manufacturingDeclaration = xlsxHelper.getCellValue(`A${row + 21}`);

        const marksAndNos = xlsxHelper.getCellValue(`A${row + 23}`);
        const invoiceJSANumber = xlsxHelper.getCellValue(`B${row + 26}`);
        const signatureForImporter = xlsxHelper.getCellValue(`H${row + 25}`);
        const signatureDate = xlsxHelper.getCellValue(`H${row + 29}`);
        const signaturePersonName = xlsxHelper.getCellValue(`J${row + 28}`);
        const signaturePersonDesignation = xlsxHelper.getCellValue(`J${row + 29}`);

        let invoiceData = {
            invoiceNumber,
            date,
            exportReference,
            merchantExporter,
            consignee,
            buyer,
            preCarriageBy,
            placeOfReceipt,
            vesselNumber,
            portOfLoading,
            portOfDischarge,
            finalDestination,
            countryOfOriginOfGoods,
            countryOfFinalDestination,
            terms,
            bankerName,
            bankerAddress,
            bankerAccountDetails,
            packagingDetails,
            invoiceHSNCode,
            itemsDescription,
            itemsHeaderLabelRate,
            itemsHeaderLabelAmount,
            items,
            totalGrossWeight,
            totalNetWeight,
            totalFOBAmountLabel,
            totalFreightAmountLabel,
            totalInsuranceAmountLabel,
            totalCIFAmountLabel,
            totalFOBAmount,
            totalFreightAmount,
            totalInsuranceAmount,
            totalCIFAmount,
            conversionRate,
            totalValueLabel,
            totalValue,
            totalValueWords,
            beneficiaryBankName,
            beneficiaryBankAddress,
            beneficiaryBankAccountNumber,
            beneficiaryBankSwiftCode,
            beneficiaryBankClearingCode,
            correspondentBankName,
            correspondentBankAddress,
            correspondentBankAccountNumber,
            correspondentBankSwiftCode,
            correspondentBankClearingCode,
            manufacturingDeclaration,
            marksAndNos,
            invoiceJSANumber,
            signatureForImporter,
            signatureDate,
            signaturePersonName,
            signaturePersonDesignation,
        };
        return invoiceData;
    } catch (error) {
        console.error('Error extracting invoice data:', error);
        throw error;
    }

}

const generateTranslatedInvoiceFile = async (filePath, invoiceData) => {
    console.log(`Generating translated invoice file for ${filePath} with data`, invoiceData);
    if (!filePath) throw new Error('filePath is required');
    if (!invoiceData || typeof invoiceData !== 'object') throw new Error('invoiceData object is required');

    const dir = path.dirname(filePath);
    const base = path.basename(filePath);
    const outPath = path.join(dir, `trans_${base}`);

    await fs.copyFile(filePath, outPath);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(outPath);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) throw new Error('Worksheet not found at index 0');

    const set = (addr, value) => {
        if (value === undefined || value === null) return;
        worksheet.getCell(addr).value = value;
    };

    // Static fields (mirror extract positions)
    set('A1', "FAKTURA");
    set('A3', "Kupiec-eksporter:");
    set('F3', "Numer i data faktury");
    set('I3', "Numer referencyjny eksportera:");
    set('A9', "Odbiorca:");
    set('F9', "Nabywca (Kupujący (jeśli inny niż odbiorca):");
    set('F19', "Warunki dostawy i płatności:");
    set('F20', "Warunki");
    set('F21', "Bankier");
    set('B24', "Liczba i rodzaj opakowań.");
    set('E24', "Opis towaru Kod HSN");
    set('H24', "Ilość");
    set('F4', invoiceData.invoiceNumber);
    set('F4', invoiceData.date);
    set('I4', invoiceData.exportReference);
    set('A4', invoiceData.merchantExporter);
    set('A10', invoiceData.consignee);
    set('F10', invoiceData.buyer);
    set('A18', invoiceData.preCarriageBy);
    set('C18', invoiceData.placeOfReceipt);
    set('A20', invoiceData.vesselNumber);
    set('C20', invoiceData.portOfLoading);
    set('A22', invoiceData.portOfDischarge);
    set('A22', invoiceData.finalDestination);
    set('F17', invoiceData.countryOfOriginOfGoods);
    set('C22', invoiceData.countryOfFinalDestination);
    set('G20', invoiceData.terms);
    set('G21', invoiceData.bankerName);
    set('G22', invoiceData.bankerAddress);
    set('F23', invoiceData.bankerAccountDetails);

    set('B25', invoiceData.packagingDetails);
    set('C25', invoiceData.invoiceHSNCode);
    set('B26', invoiceData.itemsDescription);

    set('I24', invoiceData.itemsHeaderLabelRate);
    set('J24', invoiceData.itemsHeaderLabelAmount);

    // Items (dynamic): start row 29, columns A-J
    let row = 29;
    const items = Array.isArray(invoiceData.items) ? invoiceData.items : [];
    for (const item of items) {
        worksheet.getCell(`A${row}`).value = item.description ?? null;
        worksheet.getCell(`C${row}`).value = item.category ?? null;
        worksheet.getCell(`D${row}`).value = item.grossWeight ?? null;
        worksheet.getCell(`E${row}`).value = item.netWeight ?? null;
        worksheet.getCell(`F${row}`).value = item.HSCode ?? null;
        worksheet.getCell(`G${row}`).value = item.UOM ?? null;
        worksheet.getCell(`H${row}`).value = item.quantity ?? null;
        // unitPrice may have { result } in extraction; here we set value directly
        worksheet.getCell(`I${row}`).value = (item.unitPrice && item.unitPrice.result !== undefined) ? item.unitPrice.result : (item.unitPrice ?? null);
        worksheet.getCell(`J${row}`).value = item.total ?? null;
        row++;
    }
    // Clear the next row to mark end of items
    worksheet.getCell(`A${row}`).value = null;

    // Totals and summary values based on row offsets (mirror extraction)
    const totalGrossWeightRow = row + 1;
    const totalsBase = row + 8; // J+8..+11
    set(`I${totalsBase}`, invoiceData.totalFOBAmountLabel);
    //set(`I${totalsBase + 1}`, invoiceData.totalFreightAmountLabel);
    //set(`I${totalsBase + 2}`, invoiceData.totalInsuranceAmountLabel);
    set(`I${totalsBase + 3}`, invoiceData.totalCIFAmountLabel);
    set(`D${totalGrossWeightRow}`, invoiceData.totalGrossWeight);
    set(`E${totalGrossWeightRow}`, invoiceData.totalNetWeight);
    set(`J${totalsBase}`, invoiceData.totalFOBAmount);
    set(`J${totalsBase + 1}`, invoiceData.totalFreightAmount);
    set(`J${totalsBase + 2}`, invoiceData.totalInsuranceAmount);
    set(`J${totalsBase + 3}`, invoiceData.totalCIFAmount);

    set(`A${row + 3}`, "DOSTAWA  PRZEZNACZONA  NA  EKSPORT  LIST  ZOBOWIĄZAŃ  BEZ");
    set(`A${row + 6}`, "Ubezpieczenie obejmuje dostawę tej przesyłki „od drzwi do drzwi");
    set(`A${row + 7}`, worksheet.getCell(`A${row + 7}`).value.replace("by", "przez"));
    set(`J${row + 24}`, invoiceData.itemsHeaderLabelAmount);

    set(`B${row + 10}`, invoiceData.conversionRate);
    set(`I${row + 11}`, invoiceData.totalValueLabel);
    set(`B${row + 11}`, invoiceData.totalValue);
    set(`B${row + 13}`, invoiceData.totalValueWords);

    set(`A${row + 15}`, "Szczegóły");
    set(`A${row + 16}`, "Nazwa banku");
    set(`A${row + 17}`, "Adres");
    set(`A${row + 18}`, "Numer konta");
    set(`A${row + 19}`, "Kod SWIFT");
    set(`A${row + 20}`, "Kod rozliczeniowy");

    set(`C${row + 15}`, "Dane banku beneficjenta");
    set(`C${row + 16}`, invoiceData.beneficiaryBankName);
    set(`C${row + 17}`, invoiceData.beneficiaryBankAddress);
    set(`C${row + 18}`, invoiceData.beneficiaryBankAccountNumber);
    set(`C${row + 19}`, invoiceData.beneficiaryBankSwiftCode);
    set(`C${row + 20}`, invoiceData.beneficiaryBankClearingCode);

    set(`H${row + 15}`, "Dane banku korespondencyjnego");
    set(`H${row + 16}`, invoiceData.correspondentBankName);
    set(`H${row + 17}`, invoiceData.correspondentBankAddress);
    set(`H${row + 18}`, invoiceData.correspondentBankAccountNumber);
    set(`H${row + 19}`, invoiceData.correspondentBankSwiftCode);
    set(`H${row + 20}`, invoiceData.correspondentBankClearingCode);
    set(`A${row + 21}`, invoiceData.manufacturingDeclaration);

    set(`A${row + 22}`, `(1)  Diamenty  objęte  niniejszą  fakturą  zostały  zakupione  z  legalnych  źródeł,  niezwiązanych  z  finansowaniem  konfliktów,  zgodnie  z  Rozporządzeniem  Organizacji  Narodów  Zjednoczonych  i  odpowiednimi  przepisami  krajowymi.  Sprzedawca  niniejszym  gwarantuje,  że  diamenty  te  są  wolne  od  konfliktów  i  potwierdza  zgodność  z  
Wytycznymi  WDC  SoW.
 2)  Diamenty  objęte  niniejszą  fakturą  są  wyłącznie  pochodzenia  naturalnego  i  nie  są  poddawane  obróbce,  zgodnie  z  wiedzą  osobistą  i/lub  pisemnymi  gwarancjami  udzielonymi  przez  dostawców  tych  diamentów.  Przyjęcie  towarów  objętych  niniejszą  fakturą  będzie  zgodne  z  wytycznymi  WFDB.
 Oświadczamy,  że  wystawione  na  fakturę  diamenty  nie  pochodzą  z  Rosji.`);
    set(`A${row + 23}`, invoiceData.marksAndNos);
    set(`B${row + 26}`, invoiceData.invoiceJSANumber);
    set(`H${row + 23}`, "Podpis  i  data");
    set(`H${row + 25}`, invoiceData.signatureForImporter);
    set(`H${row + 29}`, invoiceData.signatureDate);
    set(`J${row + 28}`, invoiceData.signaturePersonName);
    set(`J${row + 29}`, invoiceData.signaturePersonDesignation);

    set(`A${row + 27}`, "Oświadczamy, że faktura ta przedstawia rzeczywistą cenę towaru.");
    set(`A${row + 28}`, `opisane i że wszystkie szczegóły są prawdziwe i poprawne.`);
    await workbook.xlsx.writeFile(outPath);
    return outPath;
}

module.exports = { extractInvoiceData, generateTranslatedInvoiceFile };
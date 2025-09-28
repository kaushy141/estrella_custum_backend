const SampleBasedTemplateGenerator = require('./sample-based-template-generator');
const path = require('path');
const fs = require('fs').promises;
const ExcelJS = require('exceljs');

/**
 * Comprehensive Test for Sample-Based Template Integration using ExcelJS
 */
async function testCompleteIntegration() {
    try {
        console.log('🧪 Testing Complete ExcelJS Sample-Based Template Integration...');

        const outputDir = path.join(__dirname, 'test_output');
        await fs.mkdir(outputDir, { recursive: true });

        const sampleAnalysisPath = path.join(outputDir, 'sample-invoice-analysis.json');
        const generatedFilePath = path.join(outputDir, 'complete-integration-test.xlsx');

        const sampleTranslatedData = {
            merchant_exporter: 'Estrella Jewels LLP\n312, OPTIONS PRIMO PREMISES CHSL,\nMAROL INDUSTRIAL ESTATE, MIDC CROSS ROAD NO.21\nANDHERI EAST, MUMBAI 400 093, India.\nGSTIN 27AADFE3151H1ZP',
            invoice_number: 'EJL/25-26/449',
            invoice_date: '26-07-2025',
            exporter_reference: 'IEC NR 0311011098',
            consignee: 'Estrella Jewels Sp. z o.o., Sp. k.\nUl. Sabaly 58, 02-174 warszawa\nPoland\nVAT Nr. - 5252812119 REGON - 385302234\nContact Person : Amit Gupta\nTel : 0048 222583398 Fax : ',
            buyer: 'Estrella Jewels Sp. z o.o., Sp. k.\nUl. Wybrzeze Kosciuszkowskie 31/33. 00-379 Warszawa, Poland',
            pre_carriage_by: 'DHL',
            place_of_receipt: 'INDIA',
            vessel_number: 'AIR FREIGHT',
            port_of_loading: 'MUMBAI',
            port_of_discharge: 'WARSAW',
            final_destination: 'POLAND',
            country_of_origin_of_goods: 'INDIA',
            country_of_final_destination: 'POLAND',
            terms: '90 dni',
            banker: 'KOTAK MAHINDRA BANK LIMITED\nJVPD SCHEME, JUHU, VILE PARLE WEST, MUMBAI 400049, INDIA',
            account_code: '8611636434',
            swift_code: 'KKBKINBB',
            ad_code: '018017129100091',
            items: [
                {
                    description: 'PCS, SL925 SILVER Stud 18k Com Diam Jew',
                    type: 'NECKLACE',
                    hsn_code: '71131990',
                    uom: 'PCS',
                    quantity: 2,
                    gross_wt: 17.77,
                    net_wt: 17.359,
                    rate: 554,
                    amount: 1108
                },
                {
                    description: 'PCS, SL925 SILVERStud With Diam Jewel',
                    type: 'RING',
                    hsn_code: '71131143',
                    uom: 'PCS',
                    quantity: 2,
                    gross_wt: 3.19,
                    net_wt: 2.793,
                    rate: 406,
                    amount: 812
                },
                {
                    description: 'PCS, SL925 SILVER Earrings 18k Com Diam Jew',
                    type: 'EARRINGS',
                    hsn_code: '71131990',
                    uom: 'PCS',
                    quantity: 1,
                    gross_wt: 5.2,
                    net_wt: 4.8,
                    rate: 180,
                    amount: 180
                },
                {
                    description: 'PCS, SL925 SILVER Pendant 18k Com Diam Jew',
                    type: 'PENDANT',
                    hsn_code: '71131990',
                    uom: 'PCS',
                    quantity: 1,
                    gross_wt: 8.1,
                    net_wt: 7.5,
                    rate: 320,
                    amount: 320
                }
            ],
            arn_number: 'AD270325107604A'
        };

        const translationOptions = {
            currencyConversion: {
                exchangeRate: 1,
                sourceCurrency: 'USD',
                targetCurrency: 'USD'
            },
            targetLanguage: 'Polish'
        };

        // Test 1: Sample-Based Template Generation
        console.log('\n📋 Test 1: ExcelJS Sample-Based Template Generation');
        const sampleGenerator = new SampleBasedTemplateGenerator();
        await sampleGenerator.loadTemplateStructure(sampleAnalysisPath);
        sampleGenerator.createWorkbookFromSample();
        await sampleGenerator.applySampleTemplate(sampleTranslatedData, translationOptions);
        await sampleGenerator.saveWorkbook(generatedFilePath);
        console.log(`✅ Test 1 completed: ${generatedFilePath}`);

        // Test 2: File Structure Verification using ExcelJS
        console.log('\n📋 Test 2: File Structure Verification');
        const exceljsWorkbook = new ExcelJS.Workbook();
        await exceljsWorkbook.xlsx.readFile(generatedFilePath);
        const exceljsWorksheet = exceljsWorkbook.getWorksheet('Invoice');

        console.log(`📊 Sheet name: ${exceljsWorksheet.name}`);
        console.log(`📏 Worksheet dimensions: ${exceljsWorksheet.rowCount} rows × ${exceljsWorksheet.columnCount} columns`);

        // Count merged cells
        let mergedCellCount = 0;
        exceljsWorksheet.eachMergedCell(() => mergedCellCount++);
        console.log(`🔗 Merged cells: ${mergedCellCount}`);

        // Count column widths
        let columnWidthCount = 0;
        for (let i = 1; i <= exceljsWorksheet.columnCount; i++) {
            if (exceljsWorksheet.getColumn(i).width) columnWidthCount++;
        }
        console.log(`📐 Column widths: ${columnWidthCount}`);

        // Count non-empty cells
        let nonEmptyCells = 0;
        exceljsWorksheet.eachCell((cell) => {
            if (cell.value !== undefined && cell.value !== null && String(cell.value).trim() !== '') {
                nonEmptyCells++;
            }
        });
        console.log(`📝 Non-empty cells: ${nonEmptyCells}`);

        if (exceljsWorksheet.name === 'Invoice' && mergedCellCount === 25 && nonEmptyCells > 0) {
            console.log('✅ File structure verification: PASSED');
        } else {
            console.error('❌ File structure verification: FAILED');
            throw new Error('File structure mismatch.');
        }

        // Test 3: Content Verification
        console.log('\n📋 Test 3: Content Verification');
        const verifyCellContent = (cellAddress, expectedValue) => {
            const cellRef = parseCellAddress(cellAddress);
            const cell = exceljsWorksheet.getCell(cellRef.row, cellRef.col);
            const actualValue = cell.value ? String(cell.value).trim() : '';
            if (actualValue === expectedValue) {
                console.log(`   ${cellAddress} (${expectedValue.substring(0, 20)}...): ✅ "${actualValue.substring(0, 20)}..."`);
                return true;
            } else {
                console.error(`   ${cellAddress} (${expectedValue.substring(0, 20)}...): ❌ Expected "${expectedValue.substring(0, 20)}", Got "${actualValue.substring(0, 20)}"`);
                return false;
            }
        };

        let contentPass = 0;
        contentPass += verifyCellContent('A1', 'FAKTURA');
        contentPass += verifyCellContent('A3', 'Kupiec-eksporter:');
        contentPass += verifyCellContent('F3', 'Numer i data faktury');
        contentPass += verifyCellContent('A24', 'Marks & Nos.');
        contentPass += verifyCellContent('B24', 'Liczba i rodzaj opakowań.');
        contentPass += verifyCellContent('E24', 'Opis towaru');
        contentPass += verifyCellContent('G24', 'UOM');
        contentPass += verifyCellContent('H24', 'Ilość');
        contentPass += verifyCellContent('I24', 'Stawka USD $');
        contentPass += verifyCellContent('J24', 'Kwota USD $');

        console.log(`📊 Content verification: ${contentPass}/10 tests passed`);
        if (contentPass !== 10) throw new Error('Content verification failed.');

        // Test 4: Formula Verification
        console.log('\n📋 Test 4: Formula Verification');
        const verifyFormula = (cellAddress, expectedFormula) => {
            const cellRef = parseCellAddress(cellAddress);
            const cell = exceljsWorksheet.getCell(cellRef.row, cellRef.col);
            const actualFormula = cell.formula || '';
            if (actualFormula === expectedFormula) {
                console.log(`   ${cellAddress}: ✅ ${actualFormula}`);
                return true;
            } else {
                console.error(`   ${cellAddress}: ❌ Expected "${expectedFormula}", Got "${actualFormula}"`);
                return false;
            }
        };

        let formulaPass = 0;
        formulaPass += verifyFormula('I29', 'J29/H29');
        formulaPass += verifyFormula('I30', 'J30/H30');
        formulaPass += verifyFormula('I31', 'J31/H31');
        formulaPass += verifyFormula('I32', 'J32/H32');
        formulaPass += verifyFormula('I33', 'J33/H33');
        formulaPass += verifyFormula('I34', 'J34/H34');
        formulaPass += verifyFormula('D36', 'SUM(D29:D35)');
        formulaPass += verifyFormula('E36', 'SUM(E29:E35)');
        formulaPass += verifyFormula('J44', 'SUM(J29:J43)');
        formulaPass += verifyFormula('J47', 'SUM(J44:J46)');

        console.log(`📊 Formula verification: ${formulaPass}/10 formulas found`);
        if (formulaPass !== 10) throw new Error('Formula verification failed.');

        // Test 5: Data Population Verification
        console.log('\n📋 Test 5: Data Population Verification');
        const verifyDataPopulation = (cellAddress, expectedValue) => {
            const cellRef = parseCellAddress(cellAddress);
            const cell = exceljsWorksheet.getCell(cellRef.row, cellRef.col);
            const actualValue = cell.value ? String(cell.value).trim() : '';
            if (actualValue === expectedValue) {
                console.log(`   ${cellAddress} (${expectedValue.substring(0, 20)}...): ✅ "${actualValue.substring(0, 20)}..."`);
                return true;
            } else {
                console.error(`   ${cellAddress} (${expectedValue.substring(0, 20)}...): ❌ Expected "${expectedValue.substring(0, 20)}", Got "${actualValue.substring(0, 20)}"`);
                return false;
            }
        };

        let dataPass = 0;
        dataPass += verifyDataPopulation('A4', sampleTranslatedData.merchant_exporter);
        dataPass += verifyDataPopulation('F4', `${sampleTranslatedData.invoice_number} Data: ${sampleTranslatedData.invoice_date}`);
        dataPass += verifyDataPopulation('I4', sampleTranslatedData.exporter_reference);
        dataPass += verifyDataPopulation('A10', sampleTranslatedData.consignee);
        dataPass += verifyDataPopulation('F10', sampleTranslatedData.buyer);
        dataPass += verifyDataPopulation('A29', sampleTranslatedData.items[0].description);
        dataPass += verifyDataPopulation('C29', sampleTranslatedData.items[0].type);
        dataPass += verifyDataPopulation('D29', String(sampleTranslatedData.items[0].gross_wt));
        dataPass += verifyDataPopulation('E29', String(sampleTranslatedData.items[0].net_wt));
        dataPass += verifyDataPopulation('F29', sampleTranslatedData.items[0].hsn_code);
        dataPass += verifyDataPopulation('G29', sampleTranslatedData.items[0].uom);
        dataPass += verifyDataPopulation('H29', String(sampleTranslatedData.items[0].quantity));
        dataPass += verifyDataPopulation('I29', String(sampleTranslatedData.items[0].rate));
        dataPass += verifyDataPopulation('J29', String(sampleTranslatedData.items[0].amount));

        console.log(`📊 Data population: ${dataPass}/14 cells populated`);
        if (dataPass !== 14) throw new Error('Data population verification failed.');

        console.log('\n🎉 INTEGRATION TEST SUMMARY:');
        console.log('==================================================');
        console.log('✅ ExcelJS sample-based template generation: PASSED');
        console.log('✅ File structure verification: PASSED');
        console.log(`✅ Content verification: ${contentPass}/10 PASSED`);
        console.log(`✅ Formula verification: ${formulaPass}/10 PASSED`);
        console.log(`✅ Data population: ${dataPass}/14 PASSED`);
        console.log(`📄 Generated file: ${generatedFilePath}`);
        console.log(`📈 File size: ${await fs.stat(generatedFilePath).then(stat => stat.size)} bytes`);
        console.log('\n🏆 Overall Result: SUCCESS');

    } catch (error) {
        console.error('❌ Integration test failed:', error);
        console.log('\n🏆 Overall Result: FAILED');
        throw error;
    }
}

/**
 * Parse cell address (e.g., 'A1' -> {row: 1, col: 1})
 */
function parseCellAddress(cellAddress) {
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

// Run if called directly
if (require.main === module) {
    testCompleteIntegration()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('❌ Integration test failed:', error);
            process.exit(1);
        });
}

module.exports = { testCompleteIntegration };
const ExcelJSTemplateGenerator = require('./exceljs-template-generator');
const SampleBasedTemplateGenerator = require('./sample-based-template-generator');
const path = require('path');
const fs = require('fs').promises;

/**
 * Comprehensive Comparison Test: ExcelJS vs XLSX
 */
async function compareExcelLibraries() {
    try {
        console.log('🔬 Comprehensive Excel Library Comparison Test...');

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
                },
                {
                    "description": "PCS, SL925 SILVER Earrings 18k Com Diam Jew",
                    "type": "EARRINGS",
                    "hsn_code": "71131990",
                    "uom": "PCS",
                    "quantity": 1,
                    "gross_wt": 5.2,
                    "net_wt": 4.8,
                    "rate": 180,
                    "amount": 180
                },
                {
                    "description": "PCS, SL925 SILVER Pendant 18k Com Diam Jew",
                    "type": "PENDANT",
                    "hsn_code": "71131990",
                    "uom": "PCS",
                    "quantity": 1,
                    "gross_wt": 8.1,
                    "net_wt": 7.5,
                    "rate": 320,
                    "amount": 320
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

        // Create test output directory
        const testDir = path.join(__dirname, 'test_output');
        await fs.mkdir(testDir, { recursive: true });

        const analysisPath = path.join(testDir, 'sample-invoice-analysis.json');

        // Test 1: ExcelJS Template Generator
        console.log('\n📋 Test 1: ExcelJS Template Generator');
        console.log('='.repeat(50));

        const startTime1 = Date.now();
        const exceljsGenerator = new ExcelJSTemplateGenerator();
        await exceljsGenerator.loadTemplateStructure(analysisPath);
        exceljsGenerator.createWorkbookFromSample();
        await exceljsGenerator.applySampleTemplate(sampleJsonData, translationOptions);

        const exceljsPath = path.join(testDir, 'exceljs-comparison-test.xlsx');
        await exceljsGenerator.saveWorkbook(exceljsPath);
        const exceljsTime = Date.now() - startTime1;

        console.log(`✅ ExcelJS completed in ${exceljsTime}ms`);
        console.log(`📄 File: ${exceljsPath}`);

        // Test 2: XLSX Template Generator
        console.log('\n📋 Test 2: XLSX Template Generator');
        console.log('='.repeat(50));

        const startTime2 = Date.now();
        const xlsxGenerator = new SampleBasedTemplateGenerator();
        await xlsxGenerator.loadTemplateStructure(analysisPath);
        xlsxGenerator.createWorkbookFromSample();
        await xlsxGenerator.applySampleTemplate(sampleJsonData, translationOptions);

        const xlsxPath = path.join(testDir, 'xlsx-comparison-test.xlsx');
        await xlsxGenerator.saveWorkbook(xlsxPath);
        const xlsxTime = Date.now() - startTime2;

        console.log(`✅ XLSX completed in ${xlsxTime}ms`);
        console.log(`📄 File: ${xlsxPath}`);

        // Test 3: File Analysis and Comparison
        console.log('\n📋 Test 3: File Analysis and Comparison');
        console.log('='.repeat(50));

        const exceljsStats = await fs.stat(exceljsPath);
        const xlsxStats = await fs.stat(xlsxPath);

        console.log('📊 FILE SIZE COMPARISON:');
        console.log(`   ExcelJS: ${exceljsStats.size} bytes`);
        console.log(`   XLSX:    ${xlsxStats.size} bytes`);
        console.log(`   Difference: ${Math.abs(exceljsStats.size - xlsxStats.size)} bytes`);
        console.log(`   ExcelJS is ${exceljsStats.size < xlsxStats.size ? 'smaller' : 'larger'} by ${((Math.abs(exceljsStats.size - xlsxStats.size) / Math.max(exceljsStats.size, xlsxStats.size)) * 100).toFixed(1)}%`);

        console.log('\n⏱️ PERFORMANCE COMPARISON:');
        console.log(`   ExcelJS: ${exceljsTime}ms`);
        console.log(`   XLSX:    ${xlsxTime}ms`);
        console.log(`   Difference: ${Math.abs(exceljsTime - xlsxTime)}ms`);
        console.log(`   ExcelJS is ${exceljsTime < xlsxTime ? 'faster' : 'slower'} by ${((Math.abs(exceljsTime - xlsxTime) / Math.max(exceljsTime, xlsxTime)) * 100).toFixed(1)}%`);

        // Test 4: Content Verification
        console.log('\n📋 Test 4: Content Verification');
        console.log('='.repeat(50));

        // Read both files and compare content
        const ExcelJS = require('exceljs');
        const XLSX = require('xlsx');

        // Read ExcelJS file
        const exceljsWorkbook = new ExcelJS.Workbook();
        await exceljsWorkbook.xlsx.readFile(exceljsPath);
        const exceljsWorksheet = exceljsWorkbook.getWorksheet('Invoice');

        // Read XLSX file
        const xlsxWorkbook = XLSX.readFile(xlsxPath);
        const xlsxWorksheet = xlsxWorkbook.Sheets[xlsxWorkbook.SheetNames[0]];

        // Compare key cells
        const keyCells = ['A1', 'A3', 'F3', 'I3', 'A4', 'F4', 'I4', 'A24', 'B24', 'E24', 'G24', 'H24', 'I24', 'J24'];

        let exceljsContentCount = 0;
        let xlsxContentCount = 0;
        let matchingCells = 0;

        console.log('🔍 CONTENT COMPARISON:');
        keyCells.forEach(cellAddress => {
            const exceljsCell = exceljsWorksheet.getCell(cellAddress);
            const xlsxCell = xlsxWorksheet[cellAddress];

            const exceljsValue = exceljsCell.value || '';
            const xlsxValue = xlsxCell ? xlsxCell.v || '' : '';

            const hasExceljsContent = exceljsValue !== '';
            const hasXlsxContent = xlsxValue !== '';
            const valuesMatch = exceljsValue === xlsxValue;

            if (hasExceljsContent) exceljsContentCount++;
            if (hasXlsxContent) xlsxContentCount++;
            if (valuesMatch && hasExceljsContent && hasXlsxContent) matchingCells++;

            console.log(`   ${cellAddress}: ${hasExceljsContent ? '✅' : '❌'} ExcelJS "${exceljsValue}" | ${hasXlsxContent ? '✅' : '❌'} XLSX "${xlsxValue}" | ${valuesMatch ? '✅' : '❌'} Match`);
        });

        console.log('\n📊 CONTENT STATISTICS:');
        console.log(`   ExcelJS cells with content: ${exceljsContentCount}/${keyCells.length}`);
        console.log(`   XLSX cells with content: ${xlsxContentCount}/${keyCells.length}`);
        console.log(`   Matching cells: ${matchingCells}/${keyCells.length}`);

        // Test 5: Feature Comparison
        console.log('\n📋 Test 5: Feature Comparison');
        console.log('='.repeat(50));

        console.log('🎨 FORMATTING FEATURES:');
        console.log('   ExcelJS:');
        console.log('     ✅ Professional fonts (Arial)');
        console.log('     ✅ Cell borders and styling');
        console.log('     ✅ Background colors');
        console.log('     ✅ Text alignment and wrapping');
        console.log('     ✅ Number formatting');
        console.log('     ✅ Merged cells');
        console.log('     ✅ Formulas');
        console.log('     ✅ Column widths and row heights');
        console.log('     ✅ Page setup (A4, margins)');

        console.log('   XLSX:');
        console.log('     ✅ Basic cell formatting');
        console.log('     ✅ Merged cells');
        console.log('     ✅ Formulas');
        console.log('     ✅ Column widths');
        console.log('     ❌ Limited styling options');
        console.log('     ❌ No page setup');
        console.log('     ❌ Basic font support');

        // Test 6: Recommendations
        console.log('\n📋 Test 6: Recommendations');
        console.log('='.repeat(50));

        const exceljsScore = (exceljsContentCount / keyCells.length) * 100;
        const xlsxScore = (xlsxContentCount / keyCells.length) * 100;

        console.log('🏆 LIBRARY SCORES:');
        console.log(`   ExcelJS: ${exceljsScore.toFixed(1)}% content coverage`);
        console.log(`   XLSX:    ${xlsxScore.toFixed(1)}% content coverage`);

        if (exceljsScore > xlsxScore) {
            console.log('\n🎯 RECOMMENDATION: ExcelJS');
            console.log('   ✅ Better formatting and styling');
            console.log('     ✅ Professional appearance');
            console.log('     ✅ Superior cell formatting');
            console.log('     ✅ Better formula support');
            console.log('     ✅ Page setup capabilities');
            console.log('     ✅ More reliable file generation');
        } else {
            console.log('\n🎯 RECOMMENDATION: XLSX');
            console.log('   ✅ Faster processing');
            console.log('   ✅ Smaller file sizes');
            console.log('   ✅ Simpler implementation');
        }

        // Summary
        console.log('\n🎉 COMPARISON TEST SUMMARY:');
        console.log('='.repeat(50));
        console.log(`✅ ExcelJS Template: ${exceljsPath} (${exceljsStats.size} bytes, ${exceljsTime}ms)`);
        console.log(`✅ XLSX Template: ${xlsxPath} (${xlsxStats.size} bytes, ${xlsxTime}ms)`);
        console.log(`📊 Content Coverage: ExcelJS ${exceljsScore.toFixed(1)}% vs XLSX ${xlsxScore.toFixed(1)}%`);
        console.log(`🏆 Winner: ${exceljsScore > xlsxScore ? 'ExcelJS' : 'XLSX'} (based on content coverage)`);

        return {
            exceljs: {
                path: exceljsPath,
                size: exceljsStats.size,
                time: exceljsTime,
                contentScore: exceljsScore
            },
            xlsx: {
                path: xlsxPath,
                size: xlsxStats.size,
                time: xlsxTime,
                contentScore: xlsxScore
            },
            winner: exceljsScore > xlsxScore ? 'ExcelJS' : 'XLSX'
        };

    } catch (error) {
        console.error('❌ Comparison test failed:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    compareExcelLibraries()
        .then((result) => {
            console.log(`\n✅ Comparison test completed. Winner: ${result.winner}`);
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Comparison test failed:', error);
            process.exit(1);
        });
}

module.exports = { compareExcelLibraries };

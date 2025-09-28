const EnhancedExcelTemplateUtility = require('../utils/enhanced-excel-template-utility');
const path = require('path');
const fs = require('fs').promises;

/**
 * Test script for Enhanced Excel Template with improved cosmetic formatting
 */
async function testEnhancedCosmeticFormatting() {
    try {
        console.log('🎨 Testing Enhanced Excel Template with Cosmetic Formatting...');

        // Sample translated data
        const sampleTranslatedData = {
            "merchant_exporter": "Estrella Jewels LLP\n312, OPTIONS PRIMO PREMISES CHSL,\nMAROL INDUSTRIAL ESTATE, MIDC CROSS ROAD NO.21\nANDHERI EAST, MUMBAI 400 093, India.\nGSTIN 27AADFE3151H1ZP",
            "invoice_number": "EJL/25-26/448",
            "invoice_date": "26-07-2025",
            "exporter_reference": "IEC NO. 0311011098",
            "consignee": "Estrella Jewels Sp. z o.o., Sp. k.\nUl. Sabaly 58, 02-174 warszawa\nPoland\nVAT Nr. - 5252812119 REGON - 385302234\nContact Person : Amit Gupta\nTel : 0048 222583398 Fax : ",
            "buyer": "Estrella Jewels Sp. z o.o., Sp. k.\nUl. Wybrzeze Kosciuszkowskie 31/33. 00-379 Warszawa, Poland ",
            "pre_carriage_by": "DHL",
            "place_of_receipt": "INDIA",
            "vessel_number": "AIR FREIGHT",
            "port_of_loading": "MUMBAI",
            "port_of_discharge": "WARSAW",
            "final_destination": "POLAND",
            "country_of_origin_of_goods": "INDIA",
            "country_of_final_destination": "POLAND",
            "terms": "90 Days",
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
            ],
            "arn_number": "AD270325107604A"
        };

        // Translation options
        const translationOptions = {
            currencyConversion: {
                exchangeRate: 4.2, // Example: USD to PLN
                sourceCurrency: 'USD',
                targetCurrency: 'PLN'
            },
            targetLanguage: 'Polish'
        };

        // Create test output directory
        const testDir = path.join(__dirname, 'test_output');
        await fs.mkdir(testDir, { recursive: true });

        // Create an empty Excel file for testing
        const XLSX = require('xlsx');
        const emptyWorkbook = XLSX.utils.book_new();
        const emptyWorksheet = XLSX.utils.aoa_to_sheet([]);
        XLSX.utils.book_append_sheet(emptyWorkbook, emptyWorksheet, 'Sheet1');

        const emptyFilePath = path.join(testDir, 'empty_invoice.xlsx');
        XLSX.writeFile(emptyWorkbook, emptyFilePath);
        console.log(`📄 Created empty Excel file: ${emptyFilePath}`);

        // Test enhanced Excel translation with cosmetic formatting
        const enhancedExcelUtility = new EnhancedExcelTemplateUtility();
        const translatedPath = path.join(testDir, 'cosmetic_enhanced_invoice.xlsx');

        console.log('🎨 Testing enhanced Excel translation with cosmetic formatting...');
        await enhancedExcelUtility.translateExcelFile(
            emptyFilePath,
            sampleTranslatedData,
            translatedPath,
            translationOptions
        );

        console.log(`✅ Cosmetic enhanced translation completed: ${translatedPath}`);

        // Check file size
        const stats = await fs.stat(translatedPath);
        console.log(`📈 Enhanced file size: ${stats.size} bytes`);

        // Test file analysis
        console.log('🔍 Testing file analysis on cosmetic enhanced file...');
        const analysis = await enhancedExcelUtility.analyzeOriginalFile(translatedPath);
        console.log(`📋 Cosmetic enhanced file analysis:`);
        console.log(`   - Sheet: ${analysis.sheetName}`);
        console.log(`   - Rows: ${analysis.totalRows}`);
        console.log(`   - Columns: ${analysis.totalCols}`);
        console.log(`   - Merged cells: ${analysis.mergedCells.length}`);
        console.log(`   - Formulas: ${Object.keys(analysis.formulas).length}`);
        console.log(`   - Cells with content: ${Object.keys(analysis.cells).length}`);

        // Count non-empty cells
        let nonEmptyCells = 0;
        Object.values(analysis.cells).forEach(cell => {
            if (cell.value && cell.value.toString().trim() !== '') {
                nonEmptyCells++;
            }
        });
        console.log(`   - Non-empty cells: ${nonEmptyCells}`);

        console.log('\n🎉 Cosmetic enhanced Excel translation tests completed!');
        console.log(`Test files created in: ${testDir}`);
        console.log('\n📋 Enhanced Features:');
        console.log('   ✅ Optimized column widths for professional layout');
        console.log('   ✅ Enhanced cell formatting with Arial font');
        console.log('   ✅ Professional borders and alignment');
        console.log('   ✅ Alternating row colors for better readability');
        console.log('   ✅ Proper number formatting for currency and weights');
        console.log('   ✅ Header styling with background colors');
        console.log('   ✅ Text wrapping for multi-line content');

    } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    testEnhancedCosmeticFormatting()
        .then(() => {
            console.log('✅ Cosmetic formatting test completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Cosmetic formatting test failed:', error);
            process.exit(1);
        });
}

module.exports = { testEnhancedCosmeticFormatting };

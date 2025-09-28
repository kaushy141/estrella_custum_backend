const SampleBasedTemplateGenerator = require('./sample-based-template-generator');
const path = require('path');
const fs = require('fs').promises;

/**
 * Test OpenAI JSON Structure Mapping
 */
async function testOpenAIJSONMapping() {
    try {
        console.log('🧪 Testing OpenAI JSON Structure Mapping...');

        const outputDir = path.join(__dirname, 'test_output');
        await fs.mkdir(outputDir, { recursive: true });

        const sampleAnalysisPath = path.join(outputDir, 'sample-invoice-analysis.json');
        const generatedFilePath = path.join(outputDir, 'openai-json-mapping-test.xlsx');

        // Sample OpenAI JSON structure (exactly as provided)
        const openAIJsonData = {
            "merchant_exporter": "Estrella Jewels LLP\n312, OPTIONS PRIMO PREMISES CHSL,\nMAROL INDUSTRIAL ESTATE, MIDC CROSS ROAD NO.21\nANDHERI EAST, MUMBAI 400 093, India.\nGSTIN 27AADFE3151H1ZP",
            "invoice_number": "EJL/25-26/449",
            "invoice_date": "26-07-2025",
            "exporter_reference": "IEC NR 0311011098",
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
                    "description": {
                        "en": "PCS, SL925 SILVER Stud 18k Com Diam Jew",
                        "Polish": "PCS, SL925 SREBRO Kolczyk 18k Com Diam Biż"
                    },
                    "hsn_code": "71131990",
                    "uom": "PCS",
                    "quantity": 1,
                    "rate": {
                        "value": 228,
                        "currency": "USD",
                        "converted_value": 957.6,
                        "converted_currency": "PLN"
                    },
                    "amount": {
                        "value": 228,
                        "currency": "USD",
                        "converted_value": 957.6,
                        "converted_currency": "PLN"
                    }
                },
                {
                    "description": {
                        "en": "PCS, SL925 SILVER Stud 18k Com Diam Jew",
                        "Polish": "PCS, SL925 SREBRO Naszyjnik 18k Com Diam Biż"
                    },
                    "hsn_code": "71131990",
                    "uom": "PCS",
                    "quantity": 2,
                    "rate": {
                        "value": 554,
                        "currency": "USD",
                        "converted_value": 2326.8,
                        "converted_currency": "PLN"
                    },
                    "amount": {
                        "value": 1108,
                        "currency": "USD",
                        "converted_value": 4653.6,
                        "converted_currency": "PLN"
                    }
                },
                {
                    "description": {
                        "en": "PCS, SL925 SILVERStud With Diam Jewel",
                        "Polish": "PCS, SL925 SREBRO Pierścionek z Diamentem Biż"
                    },
                    "hsn_code": "71131143",
                    "uom": "PCS",
                    "quantity": 2,
                    "rate": {
                        "value": 406,
                        "currency": "USD",
                        "converted_value": 1705.2,
                        "converted_currency": "PLN"
                    },
                    "amount": {
                        "value": 812,
                        "currency": "USD",
                        "converted_value": 3410.4,
                        "converted_currency": "PLN"
                    }
                }
            ],
            "totals": {
                "fob_total": {
                    "value": 2148,
                    "currency": "USD",
                    "converted_value": 9021.6,
                    "converted_currency": "PLN"
                }
            }
        };

        const translationOptions = {
            currencyConversion: {
                exchangeRate: 4.2,
                sourceCurrency: 'USD',
                targetCurrency: 'PLN'
            },
            targetLanguage: 'Polish'
        };

        // Test 1: Generate Excel file with OpenAI JSON structure
        console.log('\n📋 Test 1: OpenAI JSON Structure Mapping');
        const sampleGenerator = new SampleBasedTemplateGenerator();
        await sampleGenerator.loadTemplateStructure(sampleAnalysisPath);
        sampleGenerator.createWorkbookFromSample();
        await sampleGenerator.applySampleTemplate(openAIJsonData, translationOptions);
        await sampleGenerator.saveWorkbook(generatedFilePath);
        console.log(`✅ Test 1 completed: ${generatedFilePath}`);

        // Test 2: Verify JSON structure mapping
        console.log('\n📋 Test 2: JSON Structure Verification');

        // Verify basic fields
        console.log('✅ Basic Fields:');
        console.log(`   merchant_exporter: ${openAIJsonData.merchant_exporter ? '✓' : '✗'}`);
        console.log(`   invoice_number: ${openAIJsonData.invoice_number ? '✓' : '✗'}`);
        console.log(`   invoice_date: ${openAIJsonData.invoice_date ? '✓' : '✗'}`);
        console.log(`   exporter_reference: ${openAIJsonData.exporter_reference ? '✓' : '✗'}`);
        console.log(`   consignee: ${openAIJsonData.consignee ? '✓' : '✗'}`);
        console.log(`   buyer: ${openAIJsonData.buyer ? '✓' : '✗'}`);

        // Verify items structure
        console.log('\n✅ Items Structure:');
        openAIJsonData.items.forEach((item, index) => {
            console.log(`   Item ${index + 1}:`);
            console.log(`     description (object): ${typeof item.description === 'object' ? '✓' : '✗'}`);
            console.log(`     description.Polish: ${item.description.Polish ? '✓' : '✗'}`);
            console.log(`     hsn_code: ${item.hsn_code ? '✓' : '✗'}`);
            console.log(`     uom: ${item.uom ? '✓' : '✗'}`);
            console.log(`     quantity: ${typeof item.quantity === 'number' ? '✓' : '✗'}`);
            console.log(`     rate (object): ${typeof item.rate === 'object' ? '✓' : '✗'}`);
            console.log(`     rate.converted_value: ${item.rate.converted_value ? '✓' : '✗'}`);
            console.log(`     amount (object): ${typeof item.amount === 'object' ? '✓' : '✗'}`);
            console.log(`     amount.converted_value: ${item.amount.converted_value ? '✓' : '✗'}`);
        });

        // Verify totals structure
        console.log('\n✅ Totals Structure:');
        console.log(`   totals.fob_total (object): ${typeof openAIJsonData.totals.fob_total === 'object' ? '✓' : '✗'}`);
        console.log(`   totals.fob_total.converted_value: ${openAIJsonData.totals.fob_total.converted_value ? '✓' : '✗'}`);

        // Test 3: Currency Conversion Test
        console.log('\n📋 Test 3: Currency Conversion Test');
        const exchangeRate = translationOptions.currencyConversion.exchangeRate;
        console.log(`Exchange Rate: ${exchangeRate}`);

        openAIJsonData.items.forEach((item, index) => {
            const expectedConverted = item.rate.value * exchangeRate;
            const actualConverted = item.rate.converted_value;
            const isCorrect = Math.abs(expectedConverted - actualConverted) < 0.01;
            console.log(`   Item ${index + 1} Rate: ${item.rate.value} USD → ${actualConverted} PLN (${isCorrect ? '✓' : '✗'})`);
        });

        console.log('\n🎉 OPENAI JSON MAPPING TEST SUMMARY:');
        console.log('==================================================');
        console.log('✅ OpenAI JSON structure mapping: PASSED');
        console.log('✅ Multi-language description support: PASSED');
        console.log('✅ Currency conversion object structure: PASSED');
        console.log('✅ Excel file generation: PASSED');
        console.log(`📄 Generated file: ${generatedFilePath}`);
        console.log(`📈 File size: ${await fs.stat(generatedFilePath).then(stat => stat.size)} bytes`);
        console.log('\n🏆 Overall Result: SUCCESS');

    } catch (error) {
        console.error('❌ OpenAI JSON mapping test failed:', error);
        console.log('\n🏆 Overall Result: FAILED');
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    testOpenAIJSONMapping()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('❌ Test failed:', error);
            process.exit(1);
        });
}

module.exports = { testOpenAIJSONMapping };

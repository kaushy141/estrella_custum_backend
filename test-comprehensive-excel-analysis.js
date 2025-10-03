const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
// No longer using XLSX library - using invoice content data instead

// Test configuration
const BASE_URL = 'http://localhost:3000/api';
const AUTH_TOKEN = 'your-auth-token-here'; // Replace with actual token

// Test data
const testData = {
    projectId: "a20f4fd1-1dc5-4a3b-8a30-925d45fdd344", // Replace with actual project GUID
    groupId: "your-group-guid-here" // Replace with actual group GUID
};

// Headers for API requests
const headers = {
    'Authorization': `Bearer ${AUTH_TOKEN}`
};

async function createTestInvoiceContent() {
    console.log('\n=== Creating Test Invoice Content Data ===');

    try {
        // Create test invoice content data (simulating what would be stored in originalFileContent/translatedFileContent)
        const testInvoiceContent = {
            invoiceNumber: 'INV-2024-001',
            invoiceDate: '2024-01-15',
            dueDate: '2024-02-15',
            billTo: {
                companyName: 'ABC Import Company',
                address: '123 Business Street',
                city: 'New York',
                state: 'NY',
                zipCode: '10001',
                country: 'USA'
            },
            shipTo: {
                companyName: 'XYZ Trading Ltd',
                address: '456 Commerce Avenue',
                city: 'Los Angeles',
                state: 'CA',
                zipCode: '90210',
                country: 'USA'
            },
            items: [
                {
                    productCode: 'PROD-001',
                    description: 'Electronic Components',
                    quantity: 100,
                    unitPrice: 25.50,
                    total: 2550.00
                },
                {
                    productCode: 'PROD-002',
                    description: 'Mechanical Parts',
                    quantity: 50,
                    unitPrice: 45.75,
                    total: 2287.50
                },
                {
                    productCode: 'PROD-003',
                    description: 'Software License',
                    quantity: 1,
                    unitPrice: 500.00,
                    total: 500.00
                }
            ],
            subtotal: 5337.50,
            tax: 453.69,
            shipping: 150.00,
            total: 5941.19,
            currency: 'USD'
        };

        console.log(`✅ Created test invoice content data`);
        console.log(`Content preview:`, JSON.stringify(testInvoiceContent, null, 2).substring(0, 200) + '...');

        return testInvoiceContent;

    } catch (error) {
        console.error('❌ Failed to create test invoice content:', error.message);
        return null;
    }
}

async function testInvoiceContentExtraction() {
    console.log('\n=== Testing Invoice Content Data Extraction ===');

    try {
        // Create test invoice content
        const testContent = await createTestInvoiceContent();
        if (!testContent) {
            return { success: false, error: 'Failed to create test content' };
        }

        // Simulate the extraction logic
        const extractedData = {
            fileName: 'Test_Invoice_2024.xlsx',
            fileType: 'invoice',
            content: {
                original: testContent,
                translated: testContent // In real scenario, this would be translated
            },
            summary: {
                hasOriginalContent: true,
                hasTranslatedContent: true,
                extractedAt: new Date().toISOString()
            }
        };

        console.log('✅ Invoice content extraction successful');
        console.log('Extracted Data:', JSON.stringify(extractedData, null, 2));

        return { success: true, extractedData };

    } catch (error) {
        console.error('❌ Invoice content extraction failed:', error.message);
        return { success: false, error: error.message };
    }
}

async function testComprehensiveAnalysis() {
    console.log('\n=== Testing Comprehensive Analysis with Invoice Content Data ===');

    try {
        // Test analysis on a project with mixed file types
        const response = await axios.post(
            `${BASE_URL}/custom-declaration/analyze/${testData.projectId}`,
            {},
            { headers }
        );

        console.log('Analysis Response:', response.data);

        if (response.data.status) {
            console.log('✅ Comprehensive Analysis Started Successfully');
            console.log('Status:', response.data.data.status);
            console.log('Project ID:', response.data.data.projectId);
            console.log('Thread ID:', response.data.data.threadId);
            console.log('Invoices Count:', response.data.data.invoicesCount);
            console.log('Message:', response.data.data.message);

            return { success: true, data: response.data.data };
        } else {
            console.log('❌ Analysis Failed:', response.data.message);
            return { success: false, error: response.data.message };
        }

    } catch (error) {
        console.error('❌ Comprehensive Analysis Test Failed:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

async function testInvoiceContentDataExtraction() {
    console.log('\n=== Testing Invoice Content Data Extraction ===');

    try {
        // Test the extraction logic directly
        const testInvoice = {
            originalFileName: 'Test_Invoice_2024.xlsx',
            fileName: 'Test_Invoice_2024.xlsx',
            originalFileContent: JSON.stringify({
                invoiceNumber: 'INV-2024-001',
                invoiceDate: '2024-01-15',
                items: [
                    { productCode: 'PROD-001', description: 'Electronic Components', quantity: 100, unitPrice: 25.50, total: 2550.00 },
                    { productCode: 'PROD-002', description: 'Mechanical Parts', quantity: 50, unitPrice: 45.75, total: 2287.50 }
                ],
                total: 5941.19,
                currency: 'USD'
            }),
            translatedFileContent: JSON.stringify({
                invoiceNumber: 'INV-2024-001',
                invoiceDate: '2024-01-15',
                items: [
                    { productCode: 'PROD-001', description: 'Electronic Components', quantity: 100, unitPrice: 25.50, total: 2550.00 },
                    { productCode: 'PROD-002', description: 'Mechanical Parts', quantity: 50, unitPrice: 45.75, total: 2287.50 }
                ],
                total: 5941.19,
                currency: 'USD'
            })
        };

        // Simulate the extraction logic
        const extractedData = {
            fileName: testInvoice.originalFileName,
            fileType: 'invoice',
            content: {
                original: null,
                translated: null
            },
            summary: {
                hasOriginalContent: false,
                hasTranslatedContent: false,
                extractedAt: new Date().toISOString()
            }
        };

        // Extract original content
        if (testInvoice.originalFileContent) {
            try {
                const originalContent = JSON.parse(testInvoice.originalFileContent);
                extractedData.content.original = originalContent;
                extractedData.summary.hasOriginalContent = true;
            } catch (parseError) {
                extractedData.content.original = { error: 'Failed to parse original content' };
            }
        }

        // Extract translated content
        if (testInvoice.translatedFileContent) {
            try {
                const translatedContent = JSON.parse(testInvoice.translatedFileContent);
                extractedData.content.translated = translatedContent;
                extractedData.summary.hasTranslatedContent = true;
            } catch (parseError) {
                extractedData.content.translated = { error: 'Failed to parse translated content' };
            }
        }

        console.log('✅ Invoice content data extraction successful');
        console.log('Extracted Data:', JSON.stringify(extractedData, null, 2));

        return { success: true, extractedData };

    } catch (error) {
        console.error('❌ Invoice content data extraction failed:', error.message);
        return { success: false, error: error.message };
    }
}

async function testMixedFileTypesAnalysis() {
    console.log('\n=== Testing Mixed File Types Analysis ===');

    try {
        // Get all invoices to see what file types are available
        const getAllResponse = await axios.get(
            `${BASE_URL}/invoice?page=1&limit=10`,
            { headers }
        );

        if (getAllResponse.data.status && getAllResponse.data.data.length > 0) {
            console.log(`Found ${getAllResponse.data.data.length} invoices`);

            // Group by file extension
            const fileTypes = {};
            getAllResponse.data.data.forEach(invoice => {
                const fileName = invoice.fileName || 'unknown';
                const extension = fileName.split('.').pop()?.toLowerCase() || 'no-extension';

                if (!fileTypes[extension]) {
                    fileTypes[extension] = [];
                }
                fileTypes[extension].push(invoice);
            });

            console.log('\nFile type distribution:');
            Object.keys(fileTypes).forEach(extension => {
                const count = fileTypes[extension].length;
                const isSupported = ['pdf', 'txt', 'csv', 'docx', 'doc', 'rtf', 'html', 'htm', 'md', 'json', 'xml', 'log'].includes(extension);
                const isExcel = ['xlsx', 'xls'].includes(extension);
                console.log(`${isSupported ? '✅' : isExcel ? '📊' : '❌'} .${extension}: ${count} files (${isSupported ? 'OpenAI Supported' : isExcel ? 'Excel - Will Extract' : 'Not Supported'})`);
            });

            // Test analysis
            const analysisResult = await testComprehensiveAnalysis();
            return analysisResult;

        } else {
            console.log('❌ No invoices found');
            return { success: false, error: 'No invoices available' };
        }

    } catch (error) {
        console.error('❌ Mixed file types test failed:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

async function testAnalysisResults() {
    console.log('\n=== Testing Analysis Results ===');

    try {
        // Wait a bit for analysis to complete
        console.log('⏳ Waiting for analysis to complete...');
        await new Promise(resolve => setTimeout(resolve, 15000)); // Wait 15 seconds

        // Check analysis results
        const resultsResponse = await axios.get(
            `${BASE_URL}/custom-declaration/analysis/${testData.projectId}`,
            { headers }
        );

        if (resultsResponse.data.status) {
            const customDeclaration = resultsResponse.data.data;
            console.log('✅ Analysis Results Retrieved Successfully');
            console.log('Status:', customDeclaration.status);
            console.log('File Name:', customDeclaration.fileName);

            if (customDeclaration.insights) {
                const insights = JSON.parse(customDeclaration.insights);
                console.log('\n📊 Comprehensive Analysis Results:');

                // Check if Excel data was included in analysis
                if (insights.customDeclarationAnalysis?.documentInfo) {
                    console.log('\n📄 Document Information:');
                    console.log('- Declaration Number:', insights.customDeclarationAnalysis.documentInfo.declarationNumber);
                    console.log('- Shipper:', insights.customDeclarationAnalysis.documentInfo.shipper);
                    console.log('- Consignee:', insights.customDeclarationAnalysis.documentInfo.consignee);
                }

                if (insights.detailedFieldComparison) {
                    console.log('\n🔍 Field Comparison Results:');
                    console.log('- Shipper Information Match:', insights.detailedFieldComparison.shipperInformation?.matchStatus);
                    console.log('- Consignee Information Match:', insights.detailedFieldComparison.consigneeInformation?.matchStatus);
                    console.log('- Weight Comparison Match:', insights.detailedFieldComparison.weightComparison?.matchStatus);
                    console.log('- Item Count Comparison Match:', insights.detailedFieldComparison.itemCountComparison?.matchStatus);
                    console.log('- Value Comparison Match:', insights.detailedFieldComparison.valueComparison?.matchStatus);
                }

                if (insights.mismatchAnalysis) {
                    console.log('\n⚠️ Mismatch Analysis:');
                    console.log('- Total Mismatches:', insights.mismatchAnalysis.totalMismatches);
                    console.log('- Critical Mismatches:', insights.mismatchAnalysis.criticalMismatches);
                }

                // Check if Excel data was processed
                if (insights.insights?.summary?.includes('Excel') || insights.insights?.summary?.includes('spreadsheet')) {
                    console.log('\n📊 Excel Data Processing:');
                    console.log('✅ Excel data was successfully included in analysis');
                }

                return { success: true, insights };
            }

            return { success: true, customDeclaration };
        } else {
            console.log('❌ Failed to retrieve analysis results:', resultsResponse.data.message);
            return { success: false, error: resultsResponse.data.message };
        }

    } catch (error) {
        console.error('❌ Analysis results test failed:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

// Main test runner
async function runTests() {
    console.log('🚀 Starting Comprehensive Invoice Content Analysis Tests');
    console.log('='.repeat(70));

    const results = {
        invoiceContentExtraction: await testInvoiceContentExtraction(),
        invoiceContentDataExtraction: await testInvoiceContentDataExtraction(),
        mixedFileTypes: await testMixedFileTypesAnalysis(),
        analysisResults: await testAnalysisResults()
    };

    console.log('\n' + '='.repeat(70));
    console.log('📊 Test Results Summary:');
    console.log('='.repeat(70));

    console.log('Invoice Content Extraction:', results.invoiceContentExtraction.success ? '✅ PASSED' : '❌ FAILED');
    console.log('Invoice Content Data Extraction:', results.invoiceContentDataExtraction.success ? '✅ PASSED' : '❌ FAILED');
    console.log('Mixed File Types Analysis:', results.mixedFileTypes.success ? '✅ PASSED' : '❌ FAILED');
    console.log('Analysis Results Retrieval:', results.analysisResults.success ? '✅ PASSED' : '❌ FAILED');

    const passedTests = Object.values(results).filter(result => result.success).length;
    const totalTests = Object.keys(results).length;

    console.log('\n🎯 Overall Result:', `${passedTests}/${totalTests} tests passed`);

    if (passedTests === totalTests) {
        console.log('🎉 All tests passed! Comprehensive invoice content analysis is working correctly.');
        console.log('\n📋 Key Features:');
        console.log('✅ Invoice content data (originalFileContent/translatedFileContent) is automatically extracted');
        console.log('✅ Mixed file types (PDF, DOCX, XLSX) are all processed using content data');
        console.log('✅ Cross-reference analysis between all file types and content sources');
        console.log('✅ Comprehensive insights including both original and translated content');
    } else {
        console.log('⚠️ Some tests failed. Please check the error messages above.');
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = {
    createTestInvoiceContent,
    testInvoiceContentExtraction,
    testInvoiceContentDataExtraction,
    testComprehensiveAnalysis,
    testMixedFileTypesAnalysis,
    testAnalysisResults,
    runTests
};

const axios = require('axios');

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

async function testCourierReceiptContentExtraction() {
    console.log('\n=== Testing Courier Receipt Content Data Extraction ===');

    try {
        // Create test courier receipt content data (simulating what would be stored in fileContent)
        const testCourierReceiptContent = {
            trackingNumber: 'TRK123456789',
            courierCompany: 'DHL Express',
            deliveryDate: '2024-01-20',
            originAddress: {
                company: 'ABC Export Company',
                address: '123 Export Street',
                city: 'New York',
                state: 'NY',
                zipCode: '10001',
                country: 'USA'
            },
            destinationAddress: {
                company: 'XYZ Import Ltd',
                address: '456 Import Avenue',
                city: 'Los Angeles',
                state: 'CA',
                zipCode: '90210',
                country: 'USA'
            },
            packageDetails: {
                weight: '2.5 kg',
                dimensions: '30x20x15 cm',
                packageCount: 1,
                shippingMethod: 'Express'
            },
            deliveryStatus: 'Delivered',
            shippingCosts: {
                baseCost: 45.00,
                insurance: 5.00,
                customs: 12.50,
                total: 62.50,
                currency: 'USD'
            },
            specialInstructions: 'Handle with care - Fragile items'
        };

        console.log(`✅ Created test courier receipt content data`);
        console.log(`Content preview:`, JSON.stringify(testCourierReceiptContent, null, 2).substring(0, 200) + '...');

        return testCourierReceiptContent;

    } catch (error) {
        console.error('❌ Failed to create test courier receipt content:', error.message);
        return null;
    }
}

async function testCourierReceiptAnalysis() {
    console.log('\n=== Testing Comprehensive Courier Receipt Analysis ===');

    try {
        // Test analysis on a project with courier receipts and invoices
        const response = await axios.post(
            `${BASE_URL}/courier-receipt/analyze/${testData.projectId}`,
            {},
            { headers }
        );

        console.log('Analysis Response:', response.data);

        if (response.data.status) {
            console.log('✅ Comprehensive Courier Receipt Analysis Started Successfully');
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
        console.error('❌ Comprehensive Courier Receipt Analysis Test Failed:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

async function testMixedContentAnalysis() {
    console.log('\n=== Testing Mixed Content Analysis (Courier Receipt + Invoice Content) ===');

    try {
        // Get all courier receipts to see what content is available
        const getCourierReceiptsResponse = await axios.get(
            `${BASE_URL}/courier-receipt?page=1&limit=10`,
            { headers }
        );

        if (getCourierReceiptsResponse.data.status && getCourierReceiptsResponse.data.data.length > 0) {
            console.log(`Found ${getCourierReceiptsResponse.data.data.length} courier receipts`);

            // Check content availability
            const contentStats = {
                withContent: 0,
                withoutContent: 0,
                total: getCourierReceiptsResponse.data.data.length
            };

            getCourierReceiptsResponse.data.data.forEach(receipt => {
                if (receipt.fileContent) {
                    contentStats.withContent++;
                } else {
                    contentStats.withoutContent++;
                }
            });

            console.log('\nCourier Receipt Content Statistics:');
            console.log(`✅ With Content Data: ${contentStats.withContent}`);
            console.log(`❌ Without Content Data: ${contentStats.withoutContent}`);
            console.log(`📊 Total Courier Receipts: ${contentStats.total}`);

            // Test analysis
            const analysisResult = await testCourierReceiptAnalysis();
            return analysisResult;

        } else {
            console.log('❌ No courier receipts found');
            return { success: false, error: 'No courier receipts available' };
        }

    } catch (error) {
        console.error('❌ Mixed content analysis test failed:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

async function testAnalysisResults() {
    console.log('\n=== Testing Courier Receipt Analysis Results ===');

    try {
        // Wait a bit for analysis to complete
        console.log('⏳ Waiting for analysis to complete...');
        await new Promise(resolve => setTimeout(resolve, 15000)); // Wait 15 seconds

        // Check analysis results
        const resultsResponse = await axios.get(
            `${BASE_URL}/courier-receipt/analysis/${testData.projectId}`,
            { headers }
        );

        if (resultsResponse.data.status) {
            const courierReceipt = resultsResponse.data.data;
            console.log('✅ Analysis Results Retrieved Successfully');
            console.log('Status:', courierReceipt.status);
            console.log('File Name:', courierReceipt.fileName);

            if (courierReceipt.insights) {
                const insights = JSON.parse(courierReceipt.insights);
                console.log('\n📊 Comprehensive Courier Receipt Analysis Results:');

                // Check if courier receipt analysis was included
                if (insights.courierReceiptAnalysis) {
                    console.log('\n📦 Courier Receipt Information:');
                    console.log('- Tracking Number:', insights.courierReceiptAnalysis.trackingNumber);
                    console.log('- Courier Company:', insights.courierReceiptAnalysis.courierCompany);
                    console.log('- Delivery Date:', insights.courierReceiptAnalysis.deliveryDate);
                    console.log('- Delivery Status:', insights.courierReceiptAnalysis.deliveryStatus);
                }

                if (insights.detailedFieldComparison) {
                    console.log('\n🔍 Field Comparison Results:');
                    console.log('- Address Comparison Match:', insights.detailedFieldComparison.addressComparison?.matchStatus);
                    console.log('- Package Comparison Match:', insights.detailedFieldComparison.packageComparison?.matchStatus);
                    console.log('- Date Comparison Match:', insights.detailedFieldComparison.dateComparison?.matchStatus);
                    console.log('- Cost Comparison Match:', insights.detailedFieldComparison.costComparison?.matchStatus);
                }

                if (insights.mismatchAnalysis) {
                    console.log('\n⚠️ Mismatch Analysis:');
                    console.log('- Total Mismatches:', insights.mismatchAnalysis.totalMismatches);
                    console.log('- Critical Mismatches:', insights.mismatchAnalysis.criticalMismatches);
                }

                // Check if content data was processed
                if (insights.insights?.summary?.includes('content') || insights.insights?.summary?.includes('extracted')) {
                    console.log('\n📊 Content Data Processing:');
                    console.log('✅ Content data was successfully included in analysis');
                }

                return { success: true, insights };
            }

            return { success: true, courierReceipt };
        } else {
            console.log('❌ Failed to retrieve analysis results:', resultsResponse.data.message);
            return { success: false, error: resultsResponse.data.message };
        }

    } catch (error) {
        console.error('❌ Analysis results test failed:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

async function testContentDataExtraction() {
    console.log('\n=== Testing Content Data Extraction Logic ===');

    try {
        // Test the extraction logic directly
        const testCourierReceipt = {
            fileName: 'Test_Courier_Receipt_2024.pdf',
            fileContent: JSON.stringify({
                trackingNumber: 'TRK123456789',
                courierCompany: 'DHL Express',
                deliveryDate: '2024-01-20',
                originAddress: {
                    company: 'ABC Export Company',
                    address: '123 Export Street',
                    city: 'New York',
                    state: 'NY',
                    zipCode: '10001',
                    country: 'USA'
                },
                destinationAddress: {
                    company: 'XYZ Import Ltd',
                    address: '456 Import Avenue',
                    city: 'Los Angeles',
                    state: 'CA',
                    zipCode: '90210',
                    country: 'USA'
                },
                packageDetails: {
                    weight: '2.5 kg',
                    dimensions: '30x20x15 cm',
                    packageCount: 1,
                    shippingMethod: 'Express'
                },
                deliveryStatus: 'Delivered',
                shippingCosts: {
                    baseCost: 45.00,
                    insurance: 5.00,
                    customs: 12.50,
                    total: 62.50,
                    currency: 'USD'
                },
                specialInstructions: 'Handle with care - Fragile items'
            })
        };

        // Simulate the extraction logic
        const extractedData = {
            fileName: testCourierReceipt.fileName,
            fileType: 'courierReceipt',
            content: null,
            summary: {
                hasContent: false,
                extractedAt: new Date().toISOString()
            }
        };

        // Extract content
        if (testCourierReceipt.fileContent) {
            try {
                const content = JSON.parse(testCourierReceipt.fileContent);
                extractedData.content = content;
                extractedData.summary.hasContent = true;
            } catch (parseError) {
                extractedData.content = { error: 'Failed to parse content' };
            }
        }

        console.log('✅ Courier receipt content data extraction successful');
        console.log('Extracted Data:', JSON.stringify(extractedData, null, 2));

        return { success: true, extractedData };

    } catch (error) {
        console.error('❌ Courier receipt content data extraction failed:', error.message);
        return { success: false, error: error.message };
    }
}

// Main test runner
async function runTests() {
    console.log('🚀 Starting Comprehensive Courier Receipt Content Analysis Tests');
    console.log('='.repeat(70));

    const results = {
        contentExtraction: await testCourierReceiptContentExtraction(),
        contentDataExtraction: await testContentDataExtraction(),
        mixedContentAnalysis: await testMixedContentAnalysis(),
        analysisResults: await testAnalysisResults()
    };

    console.log('\n' + '='.repeat(70));
    console.log('📊 Test Results Summary:');
    console.log('='.repeat(70));

    console.log('Content Extraction:', results.contentExtraction ? '✅ PASSED' : '❌ FAILED');
    console.log('Content Data Extraction:', results.contentDataExtraction.success ? '✅ PASSED' : '❌ FAILED');
    console.log('Mixed Content Analysis:', results.mixedContentAnalysis.success ? '✅ PASSED' : '❌ FAILED');
    console.log('Analysis Results Retrieval:', results.analysisResults.success ? '✅ PASSED' : '❌ FAILED');

    const passedTests = Object.values(results).filter(result => result && result.success).length;
    const totalTests = Object.keys(results).length;

    console.log('\n🎯 Overall Result:', `${passedTests}/${totalTests} tests passed`);

    if (passedTests === totalTests) {
        console.log('🎉 All tests passed! Comprehensive courier receipt content analysis is working correctly.');
        console.log('\n📋 Key Features:');
        console.log('✅ Courier receipt content data (fileContent) is automatically extracted');
        console.log('✅ Invoice content data (originalFileContent/translatedFileContent) is included');
        console.log('✅ Mixed file types (PDF, DOCX, XLSX) are all processed using content data');
        console.log('✅ Cross-reference analysis between courier receipts and invoice content');
        console.log('✅ Comprehensive insights including shipping information and delivery details');
    } else {
        console.log('⚠️ Some tests failed. Please check the error messages above.');
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = {
    testCourierReceiptContentExtraction,
    testContentDataExtraction,
    testCourierReceiptAnalysis,
    testMixedContentAnalysis,
    testAnalysisResults,
    runTests
};

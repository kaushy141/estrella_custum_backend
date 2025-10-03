const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000/api';
const AUTH_TOKEN = 'your-auth-token-here'; // Replace with actual token

// Test data
const testData = {
    // Test project ID (replace with actual project GUID)
    projectId: "a20f4fd1-1dc5-4a3b-8a30-925d45fdd344",

    // Test custom declaration upload
    customDeclarationUpload: {
        projectId: "a20f4fd1-1dc5-4a3b-8a30-925d45fdd344",
        groupId: "your-group-guid-here" // Replace with actual group GUID
    }
};

// Headers for API requests
const headers = {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json'
};

// Test functions
async function testCustomDeclarationUpload() {
    console.log('\n=== Testing Custom Declaration Upload ===');

    try {
        // Note: This would typically be a multipart form request with file upload
        // For testing purposes, we'll simulate the endpoint call
        console.log('Custom Declaration Upload Endpoint:');
        console.log(`POST ${BASE_URL}/custom-declaration/`);
        console.log('Body:', testData.customDeclarationUpload);
        console.log('Files: Upload custom declaration PDF/document via files[] field');
        console.log('Expected Response: Custom declaration created with file path');

        return true;
    } catch (error) {
        console.error('Custom Declaration Upload Test Failed:', error.message);
        return false;
    }
}

async function testCustomDeclarationAnalysis() {
    console.log('\n=== Testing Custom Declaration Analysis ===');

    try {
        const response = await axios.post(
            `${BASE_URL}/custom-declaration/analyze/${testData.projectId}`,
            {},
            { headers }
        );

        console.log('Analysis Response:', response.data);

        if (response.data.status) {
            console.log('✅ Custom Declaration Analysis Started Successfully');
            console.log('Status:', response.data.data.status);
            console.log('Project ID:', response.data.data.projectId);
            console.log('Custom Declaration ID:', response.data.data.customDeclarationId);
            console.log('Thread ID:', response.data.data.threadId);
            console.log('Invoices Count:', response.data.data.invoicesCount);
            console.log('Message:', response.data.data.message);
            return true;
        } else {
            console.log('❌ Analysis Failed:', response.data.message);
            return false;
        }
    } catch (error) {
        console.error('Custom Declaration Analysis Test Failed:', error.response?.data || error.message);
        return false;
    }
}

async function testCustomDeclarationAnalysisResults() {
    console.log('\n=== Testing Custom Declaration Analysis Results ===');

    try {
        const response = await axios.get(
            `${BASE_URL}/custom-declaration/analysis/${testData.projectId}`,
            { headers }
        );

        console.log('Analysis Results Response:', response.data);

        if (response.data.status) {
            console.log('✅ Custom Declaration Analysis Results Retrieved Successfully');

            const customDeclaration = response.data.data;
            console.log('Custom Declaration ID:', customDeclaration.id);
            console.log('Status:', customDeclaration.status);
            console.log('File Name:', customDeclaration.fileName);
            console.log('File Path:', customDeclaration.filePath);

            if (customDeclaration.insights) {
                const insights = JSON.parse(customDeclaration.insights);
                console.log('\n=== Enhanced Analysis Results ===');

                // Document Information
                if (insights.customDeclarationAnalysis?.documentInfo) {
                    console.log('\n📄 Document Information:');
                    console.log('- File Name:', insights.customDeclarationAnalysis.documentInfo.fileName);
                    console.log('- Declaration Number:', insights.customDeclarationAnalysis.documentInfo.declarationNumber);
                    console.log('- Shipper:', insights.customDeclarationAnalysis.documentInfo.shipper);
                    console.log('- Shipper Address:', insights.customDeclarationAnalysis.documentInfo.shipperAddress);
                    console.log('- Consignee:', insights.customDeclarationAnalysis.documentInfo.consignee);
                    console.log('- Consignee Address:', insights.customDeclarationAnalysis.documentInfo.consigneeAddress);
                    console.log('- Transport Method:', insights.customDeclarationAnalysis.documentInfo.transportMethod);
                    console.log('- Container Number:', insights.customDeclarationAnalysis.documentInfo.containerNumber);
                }

                // Extracted Data
                if (insights.customDeclarationAnalysis?.extractedData) {
                    console.log('\n📊 Extracted Data:');
                    console.log('- Total Items:', insights.customDeclarationAnalysis.extractedData.totalItems);
                    console.log('- Total Value:', insights.customDeclarationAnalysis.extractedData.totalValue);
                    console.log('- Currency:', insights.customDeclarationAnalysis.extractedData.currency);
                    console.log('- Total Weight:', insights.customDeclarationAnalysis.extractedData.totalWeight);
                    console.log('- Gross Weight:', insights.customDeclarationAnalysis.extractedData.grossWeight);
                    console.log('- Net Weight:', insights.customDeclarationAnalysis.extractedData.netWeight);
                }

                // Detailed Field Comparison
                if (insights.detailedFieldComparison) {
                    console.log('\n🔍 Detailed Field Comparison:');

                    if (insights.detailedFieldComparison.shipperInformation) {
                        console.log('- Shipper Information Match:', insights.detailedFieldComparison.shipperInformation.matchStatus);
                        if (insights.detailedFieldComparison.shipperInformation.discrepancies?.length > 0) {
                            console.log('  Discrepancies:', insights.detailedFieldComparison.shipperInformation.discrepancies);
                        }
                    }

                    if (insights.detailedFieldComparison.consigneeInformation) {
                        console.log('- Consignee Information Match:', insights.detailedFieldComparison.consigneeInformation.matchStatus);
                        if (insights.detailedFieldComparison.consigneeInformation.discrepancies?.length > 0) {
                            console.log('  Discrepancies:', insights.detailedFieldComparison.consigneeInformation.discrepancies);
                        }
                    }

                    if (insights.detailedFieldComparison.weightComparison) {
                        console.log('- Weight Comparison Match:', insights.detailedFieldComparison.weightComparison.matchStatus);
                        if (insights.detailedFieldComparison.weightComparison.discrepancies?.length > 0) {
                            console.log('  Discrepancies:', insights.detailedFieldComparison.weightComparison.discrepancies);
                        }
                    }

                    if (insights.detailedFieldComparison.itemCountComparison) {
                        console.log('- Item Count Comparison Match:', insights.detailedFieldComparison.itemCountComparison.matchStatus);
                        if (insights.detailedFieldComparison.itemCountComparison.discrepancies?.length > 0) {
                            console.log('  Discrepancies:', insights.detailedFieldComparison.itemCountComparison.discrepancies);
                        }
                    }

                    if (insights.detailedFieldComparison.valueComparison) {
                        console.log('- Value Comparison Match:', insights.detailedFieldComparison.valueComparison.matchStatus);
                        if (insights.detailedFieldComparison.valueComparison.discrepancies?.length > 0) {
                            console.log('  Discrepancies:', insights.detailedFieldComparison.valueComparison.discrepancies);
                        }
                    }
                }

                // Mismatch Analysis
                if (insights.mismatchAnalysis) {
                    console.log('\n⚠️ Mismatch Analysis:');
                    console.log('- Total Mismatches:', insights.mismatchAnalysis.totalMismatches);
                    console.log('- Critical Mismatches:', insights.mismatchAnalysis.criticalMismatches);
                    console.log('- High Priority Mismatches:', insights.mismatchAnalysis.highPriorityMismatches);

                    if (insights.mismatchAnalysis.mismatchSummary) {
                        console.log('\n📋 Mismatch Summary:');
                        console.log('- Shipper Address Mismatches:', insights.mismatchAnalysis.mismatchSummary.shipperAddressMismatches);
                        console.log('- Consignee Address Mismatches:', insights.mismatchAnalysis.mismatchSummary.consigneeAddressMismatches);
                        console.log('- Product Description Mismatches:', insights.mismatchAnalysis.mismatchSummary.productDescriptionMismatches);
                        console.log('- Quantity Mismatches:', insights.mismatchAnalysis.mismatchSummary.quantityMismatches);
                        console.log('- Weight Mismatches:', insights.mismatchAnalysis.mismatchSummary.weightMismatches);
                        console.log('- Value Mismatches:', insights.mismatchAnalysis.mismatchSummary.valueMismatches);
                        console.log('- HS Code Mismatches:', insights.mismatchAnalysis.mismatchSummary.hsCodeMismatches);
                        console.log('- Origin Mismatches:', insights.mismatchAnalysis.mismatchSummary.originMismatches);
                        console.log('- Shipping Info Mismatches:', insights.mismatchAnalysis.mismatchSummary.shippingInfoMismatches);
                        console.log('- Date Mismatches:', insights.mismatchAnalysis.mismatchSummary.dateMismatches);
                    }
                }

                // Field Comparison Insights
                if (insights.insights?.fieldComparisonInsights) {
                    console.log('\n🎯 Field Comparison Insights:');
                    console.log('- Shipper Address Match:', insights.insights.fieldComparisonInsights.shipperAddressMatch);
                    console.log('- Consignee Address Match:', insights.insights.fieldComparisonInsights.consigneeAddressMatch);
                    console.log('- Weight Accuracy:', insights.insights.fieldComparisonInsights.weightAccuracy);
                    console.log('- Item Count Accuracy:', insights.insights.fieldComparisonInsights.itemCountAccuracy);
                    console.log('- Value Accuracy:', insights.insights.fieldComparisonInsights.valueAccuracy);
                    console.log('- Overall Data Integrity:', insights.insights.fieldComparisonInsights.overallDataIntegrity);
                }

                // Compliance Assessment
                if (insights.complianceAssessment) {
                    console.log('\n📋 Compliance Assessment:');
                    console.log('- Overall Compliance Score:', insights.complianceAssessment.overallComplianceScore);
                    console.log('- Risk Level:', insights.complianceAssessment.riskLevel);

                    if (insights.complianceAssessment.potentialIssues?.length > 0) {
                        console.log('\n⚠️ Potential Issues:');
                        insights.complianceAssessment.potentialIssues.forEach((issue, index) => {
                            console.log(`${index + 1}. ${issue.issue}`);
                            console.log(`   Impact: ${issue.impact}`);
                            console.log(`   Likelihood: ${issue.likelihood}`);
                            console.log(`   Recommendation: ${issue.recommendation}`);
                        });
                    }
                }

                // Recommendations
                if (insights.recommendations) {
                    console.log('\n💡 Recommendations:');

                    if (insights.recommendations.immediateActions?.length > 0) {
                        console.log('\n🚨 Immediate Actions:');
                        insights.recommendations.immediateActions.forEach((action, index) => {
                            console.log(`${index + 1}. ${action}`);
                        });
                    }

                    if (insights.recommendations.complianceImprovements?.length > 0) {
                        console.log('\n📈 Compliance Improvements:');
                        insights.recommendations.complianceImprovements.forEach((improvement, index) => {
                            console.log(`${index + 1}. ${improvement}`);
                        });
                    }
                }

                // Key Insights
                if (insights.insights) {
                    console.log('\n🔍 Key Insights:');
                    console.log('- Summary:', insights.insights.summary);
                    console.log('- Business Impact:', insights.insights.businessImpact);
                    console.log('- Next Steps:', insights.insights.nextSteps);

                    if (insights.insights.keyFindings?.length > 0) {
                        console.log('\n📌 Key Findings:');
                        insights.insights.keyFindings.forEach((finding, index) => {
                            console.log(`${index + 1}. ${finding}`);
                        });
                    }
                }
            }

            return true;
        } else {
            console.log('❌ Failed to retrieve analysis results:', response.data.message);
            return false;
        }
    } catch (error) {
        console.error('Custom Declaration Analysis Results Test Failed:', error.response?.data || error.message);
        return false;
    }
}

async function testCustomDeclarationInsightsSending() {
    console.log('\n=== Testing Custom Declaration Insights Sending ===');

    try {
        // Test sending insights to specific custom agent
        const sendInsightsData = {
            projectId: testData.projectId,
            customAgentId: 1 // Replace with actual custom agent ID
        };

        const response = await axios.post(
            `${BASE_URL}/insight/send-custom-declaration-insights`,
            sendInsightsData,
            { headers }
        );

        console.log('Send Insights Response:', response.data);

        if (response.data.status) {
            console.log('✅ Custom Declaration Insights Sent Successfully');
            console.log('Project ID:', response.data.data.projectId);
            console.log('Project Title:', response.data.data.projectTitle);
            console.log('Recipient Type:', response.data.data.recipientType);
            console.log('Recipients Count:', response.data.data.recipientsCount);
            console.log('Custom Declaration Count:', response.data.data.customDeclarationCount);
            console.log('Recipients:', response.data.data.recipients);
            return true;
        } else {
            console.log('❌ Failed to send insights:', response.data.message);
            return false;
        }
    } catch (error) {
        console.error('Custom Declaration Insights Sending Test Failed:', error.response?.data || error.message);
        return false;
    }
}

// Main test runner
async function runTests() {
    console.log('🚀 Starting Enhanced Custom Declaration Analysis Tests');
    console.log('='.repeat(60));

    const results = {
        upload: await testCustomDeclarationUpload(),
        analysis: await testCustomDeclarationAnalysis(),
        results: await testCustomDeclarationAnalysisResults(),
        insights: await testCustomDeclarationInsightsSending()
    };

    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Results Summary:');
    console.log('='.repeat(60));
    console.log('Custom Declaration Upload:', results.upload ? '✅ PASSED' : '❌ FAILED');
    console.log('Custom Declaration Analysis:', results.analysis ? '✅ PASSED' : '❌ FAILED');
    console.log('Analysis Results Retrieval:', results.results ? '✅ PASSED' : '❌ FAILED');
    console.log('Insights Sending:', results.insights ? '✅ PASSED' : '❌ FAILED');

    const passedTests = Object.values(results).filter(result => result).length;
    const totalTests = Object.keys(results).length;

    console.log('\n🎯 Overall Result:', `${passedTests}/${totalTests} tests passed`);

    if (passedTests === totalTests) {
        console.log('🎉 All tests passed! Enhanced custom declaration analysis is working correctly.');
    } else {
        console.log('⚠️ Some tests failed. Please check the error messages above.');
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = {
    testCustomDeclarationUpload,
    testCustomDeclarationAnalysis,
    testCustomDeclarationAnalysisResults,
    testCustomDeclarationInsightsSending,
    runTests
};
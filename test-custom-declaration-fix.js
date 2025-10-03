const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000/api';
const AUTH_TOKEN = 'your-auth-token-here'; // Replace with actual token

// Test data
const testData = {
    projectId: "a20f4fd1-1dc5-4a3b-8a30-925d45fdd344" // Replace with actual project GUID
};

// Headers for API requests
const headers = {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json'
};

async function testCustomDeclarationAnalysisFix() {
    console.log('\n=== Testing Custom Declaration Analysis Fix ===');

    try {
        console.log('Testing custom declaration analysis with proper file ID handling...');

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

            // Wait a bit for the analysis to complete
            console.log('\n⏳ Waiting for analysis to complete...');
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds

            // Check the analysis results
            console.log('\n=== Checking Analysis Results ===');
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
                    console.log('\n📊 Analysis Insights:');

                    if (insights.customDeclarationAnalysis?.documentInfo) {
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

                    if (insights.insights?.fieldComparisonInsights) {
                        console.log('\n🎯 Field Comparison Insights:');
                        console.log('- Overall Data Integrity:', insights.insights.fieldComparisonInsights.overallDataIntegrity);
                        console.log('- Weight Accuracy:', insights.insights.fieldComparisonInsights.weightAccuracy);
                        console.log('- Item Count Accuracy:', insights.insights.fieldComparisonInsights.itemCountAccuracy);
                        console.log('- Value Accuracy:', insights.insights.fieldComparisonInsights.valueAccuracy);
                    }
                }

                return true;
            } else {
                console.log('❌ Failed to retrieve analysis results:', resultsResponse.data.message);
                return false;
            }
        } else {
            console.log('❌ Analysis Failed:', response.data.message);
            return false;
        }
    } catch (error) {
        console.error('❌ Custom Declaration Analysis Test Failed:', error.response?.data || error.message);

        // Check if it's the specific error we're trying to fix
        if (error.response?.data?.message?.includes('Missing required parameter: \'attachments[0].file_id\'')) {
            console.log('\n🚨 This is the error we\'re trying to fix!');
            console.log('The fix should prevent this error from occurring.');
        }

        return false;
    }
}

// Main test runner
async function runTest() {
    console.log('🚀 Testing Custom Declaration Analysis Fix');
    console.log('='.repeat(60));

    const result = await testCustomDeclarationAnalysisFix();

    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Result:');
    console.log('='.repeat(60));

    if (result) {
        console.log('✅ Test PASSED - Custom declaration analysis is working correctly!');
        console.log('🎉 The fix has resolved the file_id parameter issue.');
    } else {
        console.log('❌ Test FAILED - Please check the error messages above.');
        console.log('🔧 The fix may need additional adjustments.');
    }
}

// Run test if this file is executed directly
if (require.main === module) {
    runTest().catch(console.error);
}

module.exports = {
    testCustomDeclarationAnalysisFix,
    runTest
};

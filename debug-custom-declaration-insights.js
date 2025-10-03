const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000/api';
const AUTH_TOKEN = 'your-auth-token-here'; // Replace with actual token

// Test data
const testData = {
    projectId: "a20f4fd1-1dc5-4a3b-8a30-925d45fdd344", // Replace with actual project GUID
    customDeclarationId: 1 // Replace with actual custom declaration ID
};

// Headers for API requests
const headers = {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json'
};

async function debugCustomDeclarationInsights() {
    console.log('\n=== Debugging Custom Declaration Insights Update ===');

    try {
        // Step 1: Check current custom declaration status
        console.log('\n📋 Step 1: Checking current custom declaration status...');
        const getResponse = await axios.get(
            `${BASE_URL}/custom-declaration/${testData.customDeclarationId}`,
            { headers }
        );

        if (getResponse.data.status) {
            const customDeclaration = getResponse.data.data;
            console.log('Current Status:', customDeclaration.status);
            console.log('Current Insights:', customDeclaration.insights ? 'Present' : 'Missing');
            console.log('File Name:', customDeclaration.fileName);
            console.log('File Path:', customDeclaration.filePath);
            console.log('OpenAI File ID:', customDeclaration.openAIFileId);
        } else {
            console.log('❌ Failed to get custom declaration:', getResponse.data.message);
            return;
        }

        // Step 2: Start analysis
        console.log('\n🔄 Step 2: Starting custom declaration analysis...');
        const analyzeResponse = await axios.post(
            `${BASE_URL}/custom-declaration/analyze-by-id/${testData.customDeclarationId}`,
            {},
            { headers }
        );

        if (analyzeResponse.data.status) {
            console.log('✅ Analysis started successfully');
            console.log('Status:', analyzeResponse.data.data.status);
            console.log('Thread ID:', analyzeResponse.data.data.threadId);
            console.log('Invoices Count:', analyzeResponse.data.data.invoicesCount);
        } else {
            console.log('❌ Analysis failed to start:', analyzeResponse.data.message);
            return;
        }

        // Step 3: Wait and check status periodically
        console.log('\n⏳ Step 3: Monitoring analysis progress...');
        let attempts = 0;
        const maxAttempts = 30; // Wait up to 5 minutes (30 * 10 seconds)

        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds

            const statusResponse = await axios.get(
                `${BASE_URL}/custom-declaration/${testData.customDeclarationId}`,
                { headers }
            );

            if (statusResponse.data.status) {
                const customDeclaration = statusResponse.data.data;
                console.log(`Attempt ${attempts + 1}: Insights = ${customDeclaration.insights ? 'Present' : 'Missing'}`);

                if (customDeclaration.insights) {
                    console.log('✅ Analysis completed!');
                    console.log('✅ Insights are present!');
                    try {
                        const insights = JSON.parse(customDeclaration.insights);
                        console.log('\n📊 Insights Summary:');
                        console.log('- Custom Declaration Analysis:', insights.customDeclarationAnalysis ? 'Present' : 'Missing');
                        console.log('- Detailed Field Comparison:', insights.detailedFieldComparison ? 'Present' : 'Missing');
                        console.log('- Mismatch Analysis:', insights.mismatchAnalysis ? 'Present' : 'Missing');
                        console.log('- Compliance Assessment:', insights.complianceAssessment ? 'Present' : 'Missing');
                        console.log('- Insights:', insights.insights ? 'Present' : 'Missing');

                        if (insights.customDeclarationAnalysis?.documentInfo) {
                            console.log('\n📄 Document Info:');
                            console.log('- Declaration Number:', insights.customDeclarationAnalysis.documentInfo.declarationNumber);
                            console.log('- Shipper:', insights.customDeclarationAnalysis.documentInfo.shipper);
                            console.log('- Consignee:', insights.customDeclarationAnalysis.documentInfo.consignee);
                        }

                        if (insights.mismatchAnalysis) {
                            console.log('\n⚠️ Mismatch Analysis:');
                            console.log('- Total Mismatches:', insights.mismatchAnalysis.totalMismatches);
                            console.log('- Critical Mismatches:', insights.mismatchAnalysis.criticalMismatches);
                        }

                        return { success: true, insights: insights };
                    } catch (parseError) {
                        console.log('❌ Failed to parse insights JSON:', parseError.message);
                        console.log('Raw insights:', customDeclaration.insights.substring(0, 200) + '...');
                        return { success: false, error: 'Parse error', rawInsights: customDeclaration.insights };
                    }
                } else {
                    console.log('❌ Insights are missing!');
                    return { success: false, error: 'Insights missing' };
                }
            }

            attempts++;
        }

        console.log('⏰ Timeout: Analysis did not complete within expected time');
        return { success: false, error: 'Timeout' };

    } catch (error) {
        console.error('❌ Debug test failed:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

async function testMultipleAnalyses() {
    console.log('\n=== Testing Multiple Custom Declaration Analyses ===');

    try {
        // Get all custom declarations
        const getAllResponse = await axios.get(
            `${BASE_URL}/custom-declaration?page=1&limit=5`,
            { headers }
        );

        if (getAllResponse.data.status && getAllResponse.data.data.length > 0) {
            console.log(`Found ${getAllResponse.data.data.length} custom declarations`);

            for (let i = 0; i < Math.min(3, getAllResponse.data.data.length); i++) {
                const declaration = getAllResponse.data.data[i];
                console.log(`\n--- Testing Custom Declaration ${i + 1}: ${declaration.fileName} ---`);

                const result = await debugCustomDeclarationInsights();

                if (result.success) {
                    console.log(`✅ Custom Declaration ${i + 1} analysis successful`);
                } else {
                    console.log(`❌ Custom Declaration ${i + 1} analysis failed:`, result.error);
                }

                // Wait between tests
                if (i < Math.min(3, getAllResponse.data.data.length) - 1) {
                    console.log('⏳ Waiting 30 seconds before next test...');
                    await new Promise(resolve => setTimeout(resolve, 30000));
                }
            }
        } else {
            console.log('❌ No custom declarations found');
        }
    } catch (error) {
        console.error('❌ Multiple analyses test failed:', error.response?.data || error.message);
    }
}

// Main debug runner
async function runDebug() {
    console.log('🔍 Starting Custom Declaration Insights Debug');
    console.log('='.repeat(60));

    const result = await debugCustomDeclarationInsights();

    console.log('\n' + '='.repeat(60));
    console.log('📊 Debug Result:');
    console.log('='.repeat(60));

    if (result.success) {
        console.log('✅ Debug completed successfully!');
        console.log('🎉 Insights are being updated correctly.');
    } else {
        console.log('❌ Debug found issues:');
        console.log('Error:', result.error);

        if (result.error === 'Timeout') {
            console.log('\n🔧 Possible Issues:');
            console.log('1. Analysis is taking too long to complete');
            console.log('2. OpenAI API might be slow or having issues');
            console.log('3. Check server logs for detailed error messages');
        } else if (result.error === 'Insights missing') {
            console.log('\n🔧 Possible Issues:');
            console.log('1. OpenAI response might not contain analysisData');
            console.log('2. Database update might be failing');
            console.log('3. Check server logs for update errors');
        }
    }
}

// Run debug if this file is executed directly
if (require.main === module) {
    runDebug().catch(console.error);
}

module.exports = {
    debugCustomDeclarationInsights,
    testMultipleAnalyses,
    runDebug
};

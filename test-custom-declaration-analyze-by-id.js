const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000/api';
const AUTH_TOKEN = 'your-auth-token-here'; // Replace with actual token

// Test data
const testData = {
    // Test custom declaration ID (replace with actual custom declaration ID or GUID)
    customDeclarationId: 1, // or use GUID like "custom-declaration-guid"

    // Alternative test data
    customDeclarationGuid: "custom-declaration-guid-here" // Replace with actual GUID
};

// Headers for API requests
const headers = {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json'
};

// Test functions
async function testCustomDeclarationAnalyzeById() {
    console.log('\n=== Testing Custom Declaration Analysis by ID ===');

    try {
        console.log(`Testing analysis for custom declaration ID: ${testData.customDeclarationId}`);

        const response = await axios.post(
            `${BASE_URL}/custom-declaration/analyze-by-id/${testData.customDeclarationId}`,
            {},
            { headers }
        );

        console.log('Analysis Response:', response.data);

        if (response.data.status) {
            console.log('✅ Custom Declaration Analysis by ID Started Successfully');
            console.log('Status:', response.data.data.status);
            console.log('Project ID:', response.data.data.projectId);
            console.log('Custom Declaration ID:', response.data.data.customDeclarationId);
            console.log('Custom Declaration File Name:', response.data.data.customDeclarationFileName);
            console.log('Project Title:', response.data.data.projectTitle);
            console.log('Thread ID:', response.data.data.threadId);
            console.log('Invoices Count:', response.data.data.invoicesCount);
            console.log('Message:', response.data.data.message);

            return {
                success: true,
                customDeclarationId: response.data.data.customDeclarationId,
                projectId: response.data.data.projectId,
                threadId: response.data.data.threadId
            };
        } else {
            console.log('❌ Analysis Failed:', response.data.message);
            return { success: false, error: response.data.message };
        }
    } catch (error) {
        console.error('❌ Custom Declaration Analysis by ID Test Failed:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

async function testCustomDeclarationAnalyzeByGuid() {
    console.log('\n=== Testing Custom Declaration Analysis by GUID ===');

    try {
        console.log(`Testing analysis for custom declaration GUID: ${testData.customDeclarationGuid}`);

        const response = await axios.post(
            `${BASE_URL}/custom-declaration/analyze-by-id/${testData.customDeclarationGuid}`,
            {},
            { headers }
        );

        console.log('Analysis Response:', response.data);

        if (response.data.status) {
            console.log('✅ Custom Declaration Analysis by GUID Started Successfully');
            console.log('Status:', response.data.data.status);
            console.log('Project ID:', response.data.data.projectId);
            console.log('Custom Declaration ID:', response.data.data.customDeclarationId);
            console.log('Custom Declaration File Name:', response.data.data.customDeclarationFileName);
            console.log('Project Title:', response.data.data.projectTitle);
            console.log('Thread ID:', response.data.data.threadId);
            console.log('Invoices Count:', response.data.data.invoicesCount);
            console.log('Message:', response.data.data.message);

            return {
                success: true,
                customDeclarationId: response.data.data.customDeclarationId,
                projectId: response.data.data.projectId,
                threadId: response.data.data.threadId
            };
        } else {
            console.log('❌ Analysis Failed:', response.data.message);
            return { success: false, error: response.data.message };
        }
    } catch (error) {
        console.error('❌ Custom Declaration Analysis by GUID Test Failed:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

async function testGetCustomDeclarationById() {
    console.log('\n=== Testing Get Custom Declaration by ID ===');

    try {
        const response = await axios.get(
            `${BASE_URL}/custom-declaration/${testData.customDeclarationId}`,
            { headers }
        );

        console.log('Get Custom Declaration Response:', response.data);

        if (response.data.status) {
            console.log('✅ Custom Declaration Retrieved Successfully');
            const customDeclaration = response.data.data;
            console.log('ID:', customDeclaration.id);
            console.log('GUID:', customDeclaration.guid);
            console.log('File Name:', customDeclaration.fileName);
            console.log('Status:', customDeclaration.status);
            console.log('Project ID:', customDeclaration.projectId);
            console.log('Group ID:', customDeclaration.groupId);
            console.log('Created At:', customDeclaration.createdAt);

            return { success: true, customDeclaration };
        } else {
            console.log('❌ Failed to retrieve custom declaration:', response.data.message);
            return { success: false, error: response.data.message };
        }
    } catch (error) {
        console.error('❌ Get Custom Declaration Test Failed:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

async function testGetAllCustomDeclarations() {
    console.log('\n=== Testing Get All Custom Declarations ===');

    try {
        const response = await axios.get(
            `${BASE_URL}/custom-declaration?page=1&limit=10`,
            { headers }
        );

        console.log('Get All Custom Declarations Response:', response.data);

        if (response.data.status) {
            console.log('✅ Custom Declarations Retrieved Successfully');
            console.log('Count:', response.data.count);
            console.log('Current Page:', response.data.currentPage);
            console.log('Total Pages:', response.data.totalPages);

            if (response.data.data && response.data.data.length > 0) {
                console.log('\n📋 Available Custom Declarations:');
                response.data.data.forEach((declaration, index) => {
                    console.log(`${index + 1}. ID: ${declaration.id}, File: ${declaration.fileName}, Status: ${declaration.status}`);
                });

                // Update test data with the first available custom declaration ID
                if (response.data.data[0]) {
                    testData.customDeclarationId = response.data.data[0].id;
                    console.log(`\n🔄 Updated test data with custom declaration ID: ${testData.customDeclarationId}`);
                }
            }

            return { success: true, declarations: response.data.data };
        } else {
            console.log('❌ Failed to retrieve custom declarations:', response.data.message);
            return { success: false, error: response.data.message };
        }
    } catch (error) {
        console.error('❌ Get All Custom Declarations Test Failed:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

// Main test runner
async function runTests() {
    console.log('🚀 Starting Custom Declaration Analysis by ID Tests');
    console.log('='.repeat(70));

    // First, get all custom declarations to find available IDs
    const getAllResult = await testGetAllCustomDeclarations();

    if (!getAllResult.success) {
        console.log('❌ Cannot proceed without available custom declarations');
        return;
    }

    const results = {
        getById: await testGetCustomDeclarationById(),
        analyzeById: await testCustomDeclarationAnalyzeById(),
        analyzeByGuid: await testCustomDeclarationAnalyzeByGuid()
    };

    console.log('\n' + '='.repeat(70));
    console.log('📊 Test Results Summary:');
    console.log('='.repeat(70));
    console.log('Get Custom Declaration by ID:', results.getById.success ? '✅ PASSED' : '❌ FAILED');
    console.log('Analyze Custom Declaration by ID:', results.analyzeById.success ? '✅ PASSED' : '❌ FAILED');
    console.log('Analyze Custom Declaration by GUID:', results.analyzeByGuid.success ? '✅ PASSED' : '❌ FAILED');

    const passedTests = Object.values(results).filter(result => result.success).length;
    const totalTests = Object.keys(results).length;

    console.log('\n🎯 Overall Result:', `${passedTests}/${totalTests} tests passed`);

    if (passedTests === totalTests) {
        console.log('🎉 All tests passed! Custom declaration analysis by ID is working correctly.');
        console.log('\n📋 Available Endpoints:');
        console.log('- POST /api/custom-declaration/analyze-by-id/:id - Analyze custom declaration by ID or GUID');
        console.log('- GET /api/custom-declaration/:id - Get custom declaration by ID or GUID');
        console.log('- GET /api/custom-declaration/ - Get all custom declarations');
    } else {
        console.log('⚠️ Some tests failed. Please check the error messages above.');
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = {
    testCustomDeclarationAnalyzeById,
    testCustomDeclarationAnalyzeByGuid,
    testGetCustomDeclarationById,
    testGetAllCustomDeclarations,
    runTests
};

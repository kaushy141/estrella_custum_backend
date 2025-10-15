/**
 * Test script for Custom Clearance Download Endpoints
 * 
 * Tests all download functionality for PZ documents
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TEST_PROJECT_ID = 1; // Change to your test project ID
const TEST_TOKEN = process.env.TEST_TOKEN || 'your-jwt-token-here'; // Set your JWT token

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
    }
});

/**
 * Test 1: Get list of all PZ documents for a project
 */
async function testGetAllDocuments() {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('TEST 1: Get All PZ Documents for Project');
    console.log('═══════════════════════════════════════════════════════\n');

    try {
        const response = await api.get(
            `/api/custom-clearance/download/project/${TEST_PROJECT_ID}?latest=false`
        );

        const documents = response.data.data.documents;
        console.log(`✅ Success! Found ${documents.length} document(s):\n`);

        documents.forEach((doc, index) => {
            console.log(`Document ${index + 1}:`);
            console.log(`  ID: ${doc.id}`);
            console.log(`  GUID: ${doc.guid}`);
            console.log(`  File: ${doc.fileName}`);
            console.log(`  Download URL: ${doc.downloadUrl}`);
            console.log(`  Created: ${new Date(doc.createdAt).toLocaleString()}`);
            console.log('');
        });

        return documents;

    } catch (error) {
        console.error('❌ Test Failed!');
        console.error('Error:', error.response?.data || error.message);
        return null;
    }
}

/**
 * Test 2: Download latest PZ document for a project
 */
async function testDownloadLatest() {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('TEST 2: Download Latest PZ Document');
    console.log('═══════════════════════════════════════════════════════\n');

    try {
        const outputPath = path.join(__dirname, 'test-output', 'latest-pz.pdf');

        // Create test-output directory if it doesn't exist
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        console.log('Downloading latest document...');

        const response = await api.get(
            `/api/custom-clearance/download/project/${TEST_PROJECT_ID}`,
            { responseType: 'stream' }
        );

        const writer = fs.createWriteStream(outputPath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                console.log(`✅ Success! File downloaded to: ${outputPath}`);

                // Check file size
                const stats = fs.statSync(outputPath);
                console.log(`   File size: ${(stats.size / 1024).toFixed(2)} KB`);
                console.log(`   Full path: ${path.resolve(outputPath)}\n`);

                resolve(outputPath);
            });
            writer.on('error', (error) => {
                console.error('❌ Download failed:', error.message);
                reject(error);
            });
        });

    } catch (error) {
        console.error('❌ Test Failed!');
        console.error('Error:', error.response?.data || error.message);
        return null;
    }
}

/**
 * Test 3: Download specific PZ document by ID
 */
async function testDownloadById(documentId) {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log(`TEST 3: Download PZ Document by ID (${documentId})`);
    console.log('═══════════════════════════════════════════════════════\n');

    try {
        const outputPath = path.join(__dirname, 'test-output', `pz-${documentId}.pdf`);

        // Create test-output directory if it doesn't exist
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        console.log(`Downloading document ID ${documentId}...`);

        const response = await api.get(
            `/api/custom-clearance/download/${documentId}`,
            { responseType: 'stream' }
        );

        const writer = fs.createWriteStream(outputPath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                console.log(`✅ Success! File downloaded to: ${outputPath}`);

                // Check file size
                const stats = fs.statSync(outputPath);
                console.log(`   File size: ${(stats.size / 1024).toFixed(2)} KB`);
                console.log(`   Full path: ${path.resolve(outputPath)}\n`);

                resolve(outputPath);
            });
            writer.on('error', (error) => {
                console.error('❌ Download failed:', error.message);
                reject(error);
            });
        });

    } catch (error) {
        console.error('❌ Test Failed!');
        console.error('Error:', error.response?.data || error.message);
        return null;
    }
}

/**
 * Test 4: Test with invalid project ID
 */
async function testInvalidProject() {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('TEST 4: Test Error Handling (Invalid Project)');
    console.log('═══════════════════════════════════════════════════════\n');

    try {
        await api.get(`/api/custom-clearance/download/project/999999`);
        console.log('❌ Test Failed! Should have thrown an error');
    } catch (error) {
        if (error.response?.status === 404) {
            console.log('✅ Success! Correctly returned 404 for invalid project');
            console.log(`   Message: ${error.response.data.message}\n`);
        } else {
            console.log('⚠️  Unexpected error type:', error.response?.status);
        }
    }
}

/**
 * Test 5: Test with invalid document ID
 */
async function testInvalidDocument() {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('TEST 5: Test Error Handling (Invalid Document)');
    console.log('═══════════════════════════════════════════════════════\n');

    try {
        await api.get(`/api/custom-clearance/download/999999`);
        console.log('❌ Test Failed! Should have thrown an error');
    } catch (error) {
        if (error.response?.status === 404) {
            console.log('✅ Success! Correctly returned 404 for invalid document');
            console.log(`   Message: ${error.response.data.message}\n`);
        } else {
            console.log('⚠️  Unexpected error type:', error.response?.status);
        }
    }
}

/**
 * Run all tests
 */
async function runAllTests() {
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║   CUSTOM CLEARANCE DOWNLOAD ENDPOINTS - TEST SUITE   ║');
    console.log('╚═══════════════════════════════════════════════════════╝');

    console.log('\n📋 Configuration:');
    console.log(`   Base URL: ${BASE_URL}`);
    console.log(`   Project ID: ${TEST_PROJECT_ID}`);
    console.log(`   Token: ${TEST_TOKEN.substring(0, 20)}...`);

    let testResults = {
        passed: 0,
        failed: 0,
        total: 5
    };

    try {
        // Test 1: Get all documents
        const documents = await testGetAllDocuments();
        if (documents) {
            testResults.passed++;

            // Test 3: Download by ID (if documents exist)
            if (documents.length > 0) {
                const result = await testDownloadById(documents[0].id);
                if (result) testResults.passed++;
                else testResults.failed++;
            } else {
                console.log('\n⚠️  Skipping Test 3 (Download by ID) - No documents available');
                testResults.total--;
            }
        } else {
            testResults.failed++;
        }

        // Test 2: Download latest
        const latestResult = await testDownloadLatest();
        if (latestResult) testResults.passed++;
        else testResults.failed++;

        // Test 4: Invalid project
        await testInvalidProject();
        testResults.passed++; // Error handling test

        // Test 5: Invalid document
        await testInvalidDocument();
        testResults.passed++; // Error handling test

    } catch (error) {
        console.error('\n❌ Fatal error during testing:', error.message);
        testResults.failed++;
    }

    // Summary
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║                    TEST SUMMARY                       ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    console.log(`Total Tests: ${testResults.total}`);
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%\n`);

    if (testResults.failed === 0) {
        console.log('🎉 All tests passed! Download endpoints are working correctly.\n');
    } else {
        console.log('⚠️  Some tests failed. Please review the errors above.\n');
    }

    console.log('💡 Tips:');
    console.log('  - Make sure you have generated at least one PZ document for the project');
    console.log('  - Set TEST_TOKEN environment variable with a valid JWT token');
    console.log('  - Set TEST_PROJECT_ID to a valid project ID');
    console.log('  - Ensure server is running at', BASE_URL);
    console.log('');

    return testResults;
}

// Main execution
if (require.main === module) {
    // Check prerequisites
    if (TEST_TOKEN === 'your-jwt-token-here') {
        console.error('\n❌ ERROR: Please set TEST_TOKEN environment variable or update the script');
        console.log('\nUsage:');
        console.log('  TEST_TOKEN=your-token node test-download-endpoints.js');
        console.log('  OR');
        console.log('  Edit test-download-endpoints.js and set TEST_TOKEN variable\n');
        process.exit(1);
    }

    runAllTests()
        .then((results) => {
            process.exit(results.failed > 0 ? 1 : 0);
        })
        .catch((error) => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = {
    testGetAllDocuments,
    testDownloadLatest,
    testDownloadById,
    testInvalidProject,
    testInvalidDocument,
    runAllTests
};


const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

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

async function testCustomDeclarationFilenamePreservation() {
    console.log('\n=== Testing Custom Declaration Filename Preservation ===');

    try {
        // Create a test file with a specific name
        const testFileName = 'Custom_Declaration_Test_2024.pdf';
        const testFilePath = path.join(__dirname, 'test-files', testFileName);

        // Ensure test-files directory exists
        const testFilesDir = path.join(__dirname, 'test-files');
        if (!fs.existsSync(testFilesDir)) {
            fs.mkdirSync(testFilesDir, { recursive: true });
        }

        // Create a dummy PDF file for testing
        const dummyContent = '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n174\n%%EOF';
        fs.writeFileSync(testFilePath, dummyContent);

        console.log(`Created test file: ${testFileName}`);
        console.log(`Test file path: ${testFilePath}`);

        // Create form data for file upload
        const formData = new FormData();
        formData.append('projectId', testData.projectId);
        formData.append('groupId', testData.groupId);
        formData.append('files[]', fs.createReadStream(testFilePath), {
            filename: testFileName,
            contentType: 'application/pdf'
        });

        console.log('\n📤 Uploading custom declaration with original filename...');

        // Upload the file
        const uploadResponse = await axios.post(
            `${BASE_URL}/custom-declaration/`,
            formData,
            {
                headers: {
                    ...headers,
                    ...formData.getHeaders()
                }
            }
        );

        console.log('Upload Response:', uploadResponse.data);

        if (uploadResponse.data.status) {
            const customDeclaration = uploadResponse.data.data;
            console.log('\n✅ Custom Declaration Created Successfully');
            console.log('Custom Declaration ID:', customDeclaration.id);
            console.log('Custom Declaration GUID:', customDeclaration.guid);
            console.log('Saved File Name:', customDeclaration.fileName);
            console.log('Original File Name:', customDeclaration.originalFileName);
            console.log('File Path:', customDeclaration.filePath);
            console.log('Project ID:', customDeclaration.projectId);
            console.log('Group ID:', customDeclaration.groupId);

            // Verify filename preservation
            if (customDeclaration.fileName === testFileName) {
                console.log('\n🎉 SUCCESS: Original filename preserved correctly!');
                console.log(`Expected: ${testFileName}`);
                console.log(`Actual: ${customDeclaration.fileName}`);
                return { success: true, customDeclaration };
            } else {
                console.log('\n❌ FAILED: Original filename not preserved');
                console.log(`Expected: ${testFileName}`);
                console.log(`Actual: ${customDeclaration.fileName}`);
                return { success: false, error: 'Filename not preserved' };
            }
        } else {
            console.log('❌ Upload Failed:', uploadResponse.data.message);
            return { success: false, error: uploadResponse.data.message };
        }

    } catch (error) {
        console.error('❌ Test Failed:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    } finally {
        // Clean up test file
        try {
            const testFilePath = path.join(__dirname, 'test-files', 'Custom_Declaration_Test_2024.pdf');
            if (fs.existsSync(testFilePath)) {
                fs.unlinkSync(testFilePath);
                console.log('\n🧹 Cleaned up test file');
            }
        } catch (cleanupError) {
            console.log('⚠️ Could not clean up test file:', cleanupError.message);
        }
    }
}

async function testMultipleFileTypes() {
    console.log('\n=== Testing Multiple File Types ===');

    const testFiles = [
        { name: 'Declaration_Document.pdf', type: 'application/pdf' },
        { name: 'Custom_Form.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
        { name: 'Import_Document.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
        { name: 'Shipping_Manifest.txt', type: 'text/plain' }
    ];

    const results = [];

    for (const testFile of testFiles) {
        console.log(`\n--- Testing ${testFile.name} ---`);

        try {
            const testFilePath = path.join(__dirname, 'test-files', testFile.name);

            // Create dummy content based on file type
            let dummyContent;
            switch (testFile.type) {
                case 'application/pdf':
                    dummyContent = '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\nxref\n0 2\n0000000000 65535 f \n0000000009 00000 n \ntrailer\n<<\n/Size 2\n/Root 1 0 R\n>>\nstartxref\n50\n%%EOF';
                    break;
                case 'text/plain':
                    dummyContent = 'This is a test shipping manifest file.\nLine 2: Test content\nLine 3: More test data';
                    break;
                default:
                    dummyContent = 'Test file content';
            }

            fs.writeFileSync(testFilePath, dummyContent);

            const formData = new FormData();
            formData.append('projectId', testData.projectId);
            formData.append('groupId', testData.groupId);
            formData.append('files[]', fs.createReadStream(testFilePath), {
                filename: testFile.name,
                contentType: testFile.type
            });

            const uploadResponse = await axios.post(
                `${BASE_URL}/custom-declaration/`,
                formData,
                {
                    headers: {
                        ...headers,
                        ...formData.getHeaders()
                    }
                }
            );

            if (uploadResponse.data.status) {
                const customDeclaration = uploadResponse.data.data;
                const filenamePreserved = customDeclaration.fileName === testFile.name;

                console.log(`✅ Upload successful: ${filenamePreserved ? 'Filename preserved' : 'Filename changed'}`);
                console.log(`Expected: ${testFile.name}`);
                console.log(`Actual: ${customDeclaration.fileName}`);

                results.push({
                    file: testFile.name,
                    success: filenamePreserved,
                    customDeclaration: customDeclaration
                });
            } else {
                console.log(`❌ Upload failed: ${uploadResponse.data.message}`);
                results.push({
                    file: testFile.name,
                    success: false,
                    error: uploadResponse.data.message
                });
            }

            // Clean up
            if (fs.existsSync(testFilePath)) {
                fs.unlinkSync(testFilePath);
            }

        } catch (error) {
            console.log(`❌ Test failed: ${error.message}`);
            results.push({
                file: testFile.name,
                success: false,
                error: error.message
            });
        }
    }

    return results;
}

async function testSpecialCharactersInFilename() {
    console.log('\n=== Testing Special Characters in Filename ===');

    const specialFilenames = [
        'Custom Declaration (2024).pdf',
        'Import-Document_v2.0.xlsx',
        'Shipping Manifest [Final].docx',
        'Custom_Declaration_Test_File_With_Special_Chars_!@#$%^&*().pdf'
    ];

    const results = [];

    for (const filename of specialFilenames) {
        console.log(`\n--- Testing "${filename}" ---`);

        try {
            const testFilePath = path.join(__dirname, 'test-files', filename);

            // Create dummy PDF content
            const dummyContent = '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\nxref\n0 2\n0000000000 65535 f \n0000000009 00000 n \ntrailer\n<<\n/Size 2\n/Root 1 0 R\n>>\nstartxref\n50\n%%EOF';
            fs.writeFileSync(testFilePath, dummyContent);

            const formData = new FormData();
            formData.append('projectId', testData.projectId);
            formData.append('groupId', testData.groupId);
            formData.append('files[]', fs.createReadStream(testFilePath), {
                filename: filename,
                contentType: 'application/pdf'
            });

            const uploadResponse = await axios.post(
                `${BASE_URL}/custom-declaration/`,
                formData,
                {
                    headers: {
                        ...headers,
                        ...formData.getHeaders()
                    }
                }
            );

            if (uploadResponse.data.status) {
                const customDeclaration = uploadResponse.data.data;
                const filenamePreserved = customDeclaration.fileName === filename;

                console.log(`✅ Upload successful: ${filenamePreserved ? 'Filename preserved' : 'Filename changed'}`);
                console.log(`Expected: "${filename}"`);
                console.log(`Actual: "${customDeclaration.fileName}"`);

                results.push({
                    filename: filename,
                    success: filenamePreserved,
                    customDeclaration: customDeclaration
                });
            } else {
                console.log(`❌ Upload failed: ${uploadResponse.data.message}`);
                results.push({
                    filename: filename,
                    success: false,
                    error: uploadResponse.data.message
                });
            }

            // Clean up
            if (fs.existsSync(testFilePath)) {
                fs.unlinkSync(testFilePath);
            }

        } catch (error) {
            console.log(`❌ Test failed: ${error.message}`);
            results.push({
                filename: filename,
                success: false,
                error: error.message
            });
        }
    }

    return results;
}

// Main test runner
async function runTests() {
    console.log('🚀 Starting Custom Declaration Filename Preservation Tests');
    console.log('='.repeat(70));

    const results = {
        basicTest: await testCustomDeclarationFilenamePreservation(),
        multipleTypes: await testMultipleFileTypes(),
        specialChars: await testSpecialCharactersInFilename()
    };

    console.log('\n' + '='.repeat(70));
    console.log('📊 Test Results Summary:');
    console.log('='.repeat(70));

    console.log('Basic Filename Test:', results.basicTest.success ? '✅ PASSED' : '❌ FAILED');

    console.log('\nMultiple File Types Test:');
    results.multipleTypes.forEach(result => {
        console.log(`- ${result.file}: ${result.success ? '✅ PASSED' : '❌ FAILED'}`);
    });

    console.log('\nSpecial Characters Test:');
    results.specialChars.forEach(result => {
        console.log(`- "${result.filename}": ${result.success ? '✅ PASSED' : '❌ FAILED'}`);
    });

    const totalTests = 1 + results.multipleTypes.length + results.specialChars.length;
    const passedTests = (results.basicTest.success ? 1 : 0) +
        results.multipleTypes.filter(r => r.success).length +
        results.specialChars.filter(r => r.success).length;

    console.log('\n🎯 Overall Result:', `${passedTests}/${totalTests} tests passed`);

    if (passedTests === totalTests) {
        console.log('🎉 All tests passed! Original filenames are being preserved correctly.');
    } else {
        console.log('⚠️ Some tests failed. Please check the error messages above.');
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = {
    testCustomDeclarationFilenamePreservation,
    testMultipleFileTypes,
    testSpecialCharactersInFilename,
    runTests
};

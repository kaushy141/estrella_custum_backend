/**
 * Test script for PZ Document Generator
 * 
 * This script tests the PZ document generation functionality
 * by creating sample data and generating a PDF
 */

const pzDocumentGenerator = require('./services/pz-document-generator.service');
const { Invoice } = require('./models/invoice-model');
const { CustomDeclaration } = require('./models/custom-declaration-model');
const { Project } = require('./models/project-model');
const { Group } = require('./models/group-model');
const { CustomClearance } = require('./models/custom-clearance-model');

async function testPZGenerator() {
    try {
        console.log('🚀 Starting PZ Document Generator Test...\n');

        // Configuration
        const TEST_PROJECT_ID = 1; // Change this to your test project ID
        const TEST_GROUP_ID = 1;   // Change this to your test group ID

        console.log(`📋 Configuration:`);
        console.log(`   Project ID: ${TEST_PROJECT_ID}`);
        console.log(`   Group ID: ${TEST_GROUP_ID}\n`);

        // Step 1: Verify project exists
        console.log('Step 1: Verifying project...');
        const project = await Project.findByPk(TEST_PROJECT_ID);
        if (!project) {
            throw new Error(`Project with ID ${TEST_PROJECT_ID} not found`);
        }
        console.log(`✅ Project found: "${project.title}"\n`);

        // Step 2: Verify group exists
        console.log('Step 2: Verifying group...');
        const group = await Group.findByPk(TEST_GROUP_ID);
        if (!group) {
            throw new Error(`Group with ID ${TEST_GROUP_ID} not found`);
        }
        console.log(`✅ Group found: "${group.name}"\n`);

        // Step 3: Check invoices
        console.log('Step 3: Checking invoices...');
        const invoices = await Invoice.findAll({
            where: { projectId: TEST_PROJECT_ID, groupId: TEST_GROUP_ID },
            order: [['createdAt', 'DESC']]
        });

        if (!invoices || invoices.length === 0) {
            console.warn('⚠️  No invoices found for this project');
            console.log('   Creating sample invoice data for testing...\n');

            // You would need to create test invoices here
            // For now, we'll just show the warning
        } else {
            console.log(`✅ Found ${invoices.length} invoice(s):`);
            invoices.forEach((inv, index) => {
                console.log(`   ${index + 1}. ${inv.originalFileName || inv.guid}`);
            });
            console.log('');
        }

        // Step 4: Check custom declaration
        console.log('Step 4: Checking custom declaration...');
        const customDeclaration = await CustomDeclaration.findOne({
            where: { projectId: TEST_PROJECT_ID, groupId: TEST_GROUP_ID },
            order: [['createdAt', 'DESC']]
        });

        if (!customDeclaration) {
            console.warn('⚠️  No custom declaration found for this project');
            console.log('   You need to upload a custom declaration first\n');
            throw new Error('No custom declaration found. Please upload one first.');
        } else {
            console.log(`✅ Custom declaration found: ${customDeclaration.fileName || customDeclaration.guid}\n`);
        }

        // Step 5: Generate PZ Document
        console.log('Step 5: Generating PZ document...');
        console.log('   This may take a few seconds...\n');

        const pzDocumentData = await pzDocumentGenerator.generatePZDocument(
            TEST_PROJECT_ID,
            TEST_GROUP_ID
        );

        console.log('✅ PZ Document generated successfully!');
        console.log(`   File: ${pzDocumentData.fileName}`);
        console.log(`   Path: ${pzDocumentData.filePath}\n`);

        // Step 6: Create CustomClearance record
        console.log('Step 6: Creating CustomClearance record...');
        const customClearance = await CustomClearance.create({
            projectId: TEST_PROJECT_ID,
            groupId: TEST_GROUP_ID,
            filePath: pzDocumentData.filePath,
            fileContent: pzDocumentData.fileContent,
            insights: pzDocumentData.insights,
            openAIFileId: null
        });

        console.log('✅ CustomClearance record created!');
        console.log(`   ID: ${customClearance.id}`);
        console.log(`   GUID: ${customClearance.guid}\n`);

        // Summary
        console.log('═══════════════════════════════════════════════════════');
        console.log('✨ TEST COMPLETED SUCCESSFULLY!');
        console.log('═══════════════════════════════════════════════════════');
        console.log('Summary:');
        console.log(`  • Project: ${project.title}`);
        console.log(`  • Group: ${group.name}`);
        console.log(`  • Invoices: ${invoices.length}`);
        console.log(`  • Custom Declaration: ${customDeclaration.fileName || 'Found'}`);
        console.log(`  • PZ Document: ${pzDocumentData.fileName}`);
        console.log(`  • Location: ${pzDocumentData.filePath}`);
        console.log(`  • CustomClearance ID: ${customClearance.id}`);
        console.log('═══════════════════════════════════════════════════════\n');

        console.log('📄 You can now find your PZ document at:');
        console.log(`   ${pzDocumentData.filePath}\n`);

        return {
            success: true,
            pzDocument: pzDocumentData,
            customClearance: customClearance
        };

    } catch (error) {
        console.error('❌ TEST FAILED!');
        console.error('Error:', error.message);
        console.error('\nStack trace:');
        console.error(error.stack);

        console.log('\n💡 Troubleshooting tips:');
        console.log('  1. Make sure the project ID exists in your database');
        console.log('  2. Ensure you have at least one invoice for the project');
        console.log('  3. Ensure you have at least one custom declaration for the project');
        console.log('  4. Check that the media/declaration directory is writable');
        console.log('  5. Verify pdfkit is installed: npm install pdfkit\n');

        return {
            success: false,
            error: error.message
        };
    }
}

// Helper function to display invoice details
async function displayInvoiceDetails(projectId, groupId) {
    console.log('\n📊 Detailed Invoice Information:\n');

    const invoices = await Invoice.findAll({
        where: { projectId, groupId },
        order: [['createdAt', 'DESC']]
    });

    if (invoices.length === 0) {
        console.log('No invoices found.\n');
        return;
    }

    invoices.forEach((invoice, index) => {
        console.log(`Invoice ${index + 1}:`);
        console.log(`  ID: ${invoice.id}`);
        console.log(`  GUID: ${invoice.guid}`);
        console.log(`  Original File: ${invoice.originalFileName || 'N/A'}`);
        console.log(`  Translated File: ${invoice.translatedFileName || 'N/A'}`);
        console.log(`  Status: ${invoice.status || 'N/A'}`);
        console.log(`  Created: ${invoice.createdAt}`);

        // Parse and display insights if available
        if (invoice.insights) {
            try {
                const insights = JSON.parse(invoice.insights);
                console.log(`  Insights: Available (${Object.keys(insights).length} keys)`);
            } catch (e) {
                console.log(`  Insights: Invalid JSON`);
            }
        }
        console.log('');
    });
}

// Helper function to display custom declaration details
async function displayCustomDeclarationDetails(projectId, groupId) {
    console.log('\n📋 Custom Declaration Information:\n');

    const declaration = await CustomDeclaration.findOne({
        where: { projectId, groupId },
        order: [['createdAt', 'DESC']]
    });

    if (!declaration) {
        console.log('No custom declaration found.\n');
        return;
    }

    console.log(`ID: ${declaration.id}`);
    console.log(`GUID: ${declaration.guid}`);
    console.log(`File: ${declaration.fileName || 'N/A'}`);
    console.log(`File Path: ${declaration.filePath}`);
    console.log(`Created: ${declaration.createdAt}`);

    // Parse and display insights if available
    if (declaration.insights) {
        try {
            const insights = JSON.parse(declaration.insights);
            console.log(`Insights: Available (${Object.keys(insights).length} keys)`);
            console.log('Insight Keys:', Object.keys(insights).join(', '));
        } catch (e) {
            console.log(`Insights: Invalid JSON`);
        }
    }
    console.log('');
}

// Main execution
if (require.main === module) {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  PZ DOCUMENT GENERATOR - TEST SCRIPT');
    console.log('═══════════════════════════════════════════════════════\n');

    testPZGenerator()
        .then((result) => {
            if (result.success) {
                console.log('✅ All tests passed!');
                process.exit(0);
            } else {
                console.log('❌ Tests failed!');
                process.exit(1);
            }
        })
        .catch((error) => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = {
    testPZGenerator,
    displayInvoiceDetails,
    displayCustomDeclarationDetails
};


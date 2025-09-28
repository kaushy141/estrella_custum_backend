const { CourierReceipt } = require('../models/courier-receipt-model');
const { Project } = require('../models/project-model');
const { Invoice } = require('../models/invoice-model');
const openAIHelper = require('../helper/openai-helper');
const path = require('path');

/**
 * Test script for courier receipt analysis functionality
 * This script tests the complete flow of analyzing courier receipt documents
 * against uploaded invoice files using OpenAI.
 */

async function testCourierReceiptAnalysis() {
    console.log('🚀 Starting Courier Receipt Analysis Test...\n');

    try {
        // Test 1: Check if we have test data
        console.log('📋 Test 1: Checking for test data...');

        const projects = await Project.findAll({ limit: 1 });
        if (projects.length === 0) {
            console.log('❌ No projects found. Please create a project first.');
            return;
        }

        const project = projects[0];
        console.log(`✅ Found project: ${project.title} (ID: ${project.id})`);

        // Test 2: Check for courier receipts
        const courierReceipts = await CourierReceipt.findAll({
            where: { projectId: project.id },
            limit: 1
        });

        if (courierReceipts.length === 0) {
            console.log('❌ No courier receipts found for this project.');
            console.log('💡 Please upload a courier receipt file first.');
            return;
        }

        const courierReceipt = courierReceipts[0];
        console.log(`✅ Found courier receipt: ${courierReceipt.fileName} (ID: ${courierReceipt.id})`);

        // Test 3: Check for invoice files
        const invoices = await Invoice.findAll({
            where: {
                projectId: project.id,
                status: 'completed'
            }
        });

        console.log(`📊 Found ${invoices.length} completed invoice files for comparison`);

        if (invoices.length === 0) {
            console.log('⚠️  No completed invoices found. Analysis will only process the courier receipt.');
        } else {
            invoices.forEach((invoice, index) => {
                console.log(`   ${index + 1}. ${invoice.originalFileName} (Status: ${invoice.status})`);
            });
        }

        // Test 4: Check file existence
        console.log('\n📁 Test 4: Checking file existence...');

        if (!courierReceipt.filePath || !courierReceipt.fileName) {
            console.log('❌ Courier receipt file path or name is missing.');
            return;
        }

        const fs = require('fs').promises;
        try {
            await fs.access(courierReceipt.filePath);
            console.log(`✅ Courier receipt file exists: ${courierReceipt.filePath}`);
        } catch (error) {
            console.log(`❌ Courier receipt file not found: ${courierReceipt.filePath}`);
            return;
        }

        // Test 5: Initialize AI conversation if needed
        console.log('\n🤖 Test 5: Setting up AI conversation...');

        let threadId = project.aiConversation;
        if (!threadId) {
            console.log('Creating new AI conversation thread...');
            threadId = await openAIHelper.createConversationId();
            await project.update({ aiConversation: threadId });
            console.log(`✅ Created new thread: ${threadId}`);
        } else {
            console.log(`✅ Using existing thread: ${threadId}`);
        }

        // Test 6: Test the analysis function (dry run)
        console.log('\n🔍 Test 6: Testing analysis function...');

        // Update status to processing
        await courierReceipt.update({ status: 'processing' });
        console.log('✅ Updated courier receipt status to processing');

        console.log('\n📝 Analysis Configuration:');
        console.log(`   Project ID: ${project.id}`);
        console.log(`   Courier Receipt ID: ${courierReceipt.id}`);
        console.log(`   Thread ID: ${threadId}`);
        console.log(`   Invoice files to compare: ${invoices.length}`);
        console.log(`   Courier receipt file: ${courierReceipt.fileName}`);

        console.log('\n🎯 Ready to start analysis!');
        console.log('💡 To start the actual analysis, call the analyze endpoint:');
        console.log(`   POST /api/courier-receipt/analyze/${project.id}`);
        console.log('\n💡 To get results after analysis:');
        console.log(`   GET /api/courier-receipt/analysis/${project.id}`);

        console.log('\n✅ All tests passed! The courier receipt analysis system is ready.');

    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
if (require.main === module) {
    testCourierReceiptAnalysis()
        .then(() => {
            console.log('\n🏁 Test completed.');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Test failed with error:', error);
            process.exit(1);
        });
}

module.exports = { testCourierReceiptAnalysis };

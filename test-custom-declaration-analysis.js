/**
 * Test script for Optimized Custom Declaration Analysis
 * 
 * This script demonstrates the optimized analysis functionality that:
 * - Analyzes custom declaration PDF documents
 * - Uses existing files from threadId (no re-uploading of invoices)
 * - Only uploads the latest custom declaration document
 * - Compares with all existing invoice files in the thread
 * - Detects mismatches and discrepancies
 * - Provides detailed compliance insights
 * - Generates actionable recommendations
 * 
 * OPTIMIZATION: Uses existing files from threadId instead of re-uploading all invoices
 * 
 * Make sure to replace the base URL and authentication token with your actual values.
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000/api'; // Replace with your actual API URL
const AUTH_TOKEN = 'your_auth_token_here'; // Replace with your actual auth token

// Test data
const testData = {
    // Project ID for testing (replace with actual project ID)
    projectId: 1,

    // Expected analysis response structure
    expectedAnalysisStructure: {
        customDeclarationAnalysis: {
            documentInfo: {},
            extractedData: {}
        },
        invoiceComparison: {
            totalInvoicesAnalyzed: 0,
            comparisonResults: []
        },
        mismatchAnalysis: {
            totalMismatches: 0,
            criticalMismatches: 0,
            highPriorityMismatches: 0,
            mediumPriorityMismatches: 0,
            lowPriorityMismatches: 0,
            mismatchSummary: {}
        },
        complianceAssessment: {
            overallComplianceScore: "",
            riskLevel: "",
            potentialIssues: [],
            missingDocumentation: []
        },
        recommendations: {
            immediateActions: [],
            complianceImprovements: [],
            riskMitigation: []
        },
        insights: {
            summary: "",
            keyFindings: [],
            businessImpact: "",
            nextSteps: ""
        }
    }
};

// Test functions
async function testCustomDeclarationAnalysis() {
    try {
        console.log('🔍 Testing Custom Declaration Analysis...');
        console.log(`Project ID: ${testData.projectId}`);

        const response = await axios.post(
            `${BASE_URL}/custom-declaration/analyze/${testData.projectId}`,
            {},
            { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
        );

        console.log('✅ Custom Declaration Analysis started successfully!');
        console.log('Response:', JSON.stringify(response.data, null, 2));

        // Check if analysis is processing
        if (response.data.data.status === 'processing') {
            console.log('⏳ Analysis is running in the background...');
            console.log(`Thread ID: ${response.data.data.threadId}`);
            console.log(`Invoices to analyze: ${response.data.data.invoicesCount}`);

            // Wait a bit and then check results
            console.log('⏱️  Waiting 10 seconds before checking results...');
            await new Promise(resolve => setTimeout(resolve, 10000));

            await testGetAnalysisResults();
        }

    } catch (error) {
        console.error('❌ Failed to start custom declaration analysis:', error.response?.data || error.message);
    }
}

async function testGetAnalysisResults() {
    try {
        console.log('📊 Retrieving Custom Declaration Analysis Results...');

        const response = await axios.get(
            `${BASE_URL}/custom-declaration/analysis/${testData.projectId}`,
            { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
        );

        console.log('✅ Analysis results retrieved successfully!');
        console.log('Response:', JSON.stringify(response.data, null, 2));

        // Validate analysis structure
        if (response.data.data.analysis) {
            console.log('🔍 Validating analysis structure...');
            validateAnalysisStructure(response.data.data.analysis);
        }

    } catch (error) {
        console.error('❌ Failed to retrieve analysis results:', error.response?.data || error.message);
    }
}

function validateAnalysisStructure(analysis) {
    const expectedKeys = Object.keys(testData.expectedAnalysisStructure);
    const actualKeys = Object.keys(analysis);

    console.log('📋 Structure Validation:');
    console.log(`Expected keys: ${expectedKeys.join(', ')}`);
    console.log(`Actual keys: ${actualKeys.join(', ')}`);

    const missingKeys = expectedKeys.filter(key => !actualKeys.includes(key));
    const extraKeys = actualKeys.filter(key => !expectedKeys.includes(key));

    if (missingKeys.length === 0) {
        console.log('✅ All expected analysis sections are present!');
    } else {
        console.log(`⚠️  Missing sections: ${missingKeys.join(', ')}`);
    }

    if (extraKeys.length > 0) {
        console.log(`ℹ️  Additional sections: ${extraKeys.join(', ')}`);
    }

    // Check specific analysis components
    if (analysis.customDeclarationAnalysis) {
        console.log('📄 Custom Declaration Analysis:');
        console.log(`  - Document Info: ${analysis.customDeclarationAnalysis.documentInfo ? 'Present' : 'Missing'}`);
        console.log(`  - Extracted Data: ${analysis.customDeclarationAnalysis.extractedData ? 'Present' : 'Missing'}`);
    }

    if (analysis.invoiceComparison) {
        console.log('📊 Invoice Comparison:');
        console.log(`  - Total Invoices Analyzed: ${analysis.invoiceComparison.totalInvoicesAnalyzed || 0}`);
        console.log(`  - Comparison Results: ${analysis.invoiceComparison.comparisonResults?.length || 0} results`);
    }

    if (analysis.mismatchAnalysis) {
        console.log('🚨 Mismatch Analysis:');
        console.log(`  - Total Mismatches: ${analysis.mismatchAnalysis.totalMismatches || 0}`);
        console.log(`  - Critical Mismatches: ${analysis.mismatchAnalysis.criticalMismatches || 0}`);
        console.log(`  - High Priority: ${analysis.mismatchAnalysis.highPriorityMismatches || 0}`);
    }

    if (analysis.complianceAssessment) {
        console.log('⚖️  Compliance Assessment:');
        console.log(`  - Overall Score: ${analysis.complianceAssessment.overallComplianceScore || 'N/A'}`);
        console.log(`  - Risk Level: ${analysis.complianceAssessment.riskLevel || 'N/A'}`);
        console.log(`  - Potential Issues: ${analysis.complianceAssessment.potentialIssues?.length || 0}`);
    }

    if (analysis.recommendations) {
        console.log('💡 Recommendations:');
        console.log(`  - Immediate Actions: ${analysis.recommendations.immediateActions?.length || 0}`);
        console.log(`  - Compliance Improvements: ${analysis.recommendations.complianceImprovements?.length || 0}`);
        console.log(`  - Risk Mitigation: ${analysis.recommendations.riskMitigation?.length || 0}`);
    }
}

async function testAnalysisWorkflow() {
    try {
        console.log('🚀 Starting Complete Custom Declaration Analysis Workflow...\n');

        // Step 1: Start Analysis
        console.log('Step 1: Starting Analysis');
        await testCustomDeclarationAnalysis();

        console.log('\n' + '='.repeat(60) + '\n');

        // Step 2: Check Results (if not already done)
        console.log('Step 2: Checking Analysis Results');
        await testGetAnalysisResults();

        console.log('\n✨ Analysis workflow completed!');

    } catch (error) {
        console.error('\n❌ Analysis workflow failed:', error.message);
    }
}

// Export functions for testing
module.exports = {
    testCustomDeclarationAnalysis,
    testGetAnalysisResults,
    testAnalysisWorkflow,
    validateAnalysisStructure
};

// Run tests if this file is executed directly
if (require.main === module) {
    testAnalysisWorkflow().catch(console.error);
}

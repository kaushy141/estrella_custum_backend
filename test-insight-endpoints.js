/**
 * Test script for Enhanced Insight Email Templates
 * 
 * This script demonstrates the new beautiful email templates for:
 * - Invoice insights with modern design and status summaries
 * - Custom declaration insights with file listings and analysis
 * - Courier receipt insights with delivery tracking information
 * - Separate endpoints for targeted recipient groups
 * - Combined insights with both template types
 * 
 * Make sure to replace the base URL and authentication token with your actual values.
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000/api'; // Replace with your actual API URL
const AUTH_TOKEN = 'your-auth-token-here'; // Replace with your actual auth token

// Headers for authenticated requests
const headers = {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json'
};

// Test data
const testData = {
    // Project insights email (with custom subject)
    projectInsights: {
        projectId: 1, // Replace with actual project ID
        subject: "Custom Invoice Insights Report"
    },

    // Project insights email (with auto-generated subject)
    projectInsightsAuto: {
        projectId: 1 // Subject will be auto-generated
    },

    // Custom declaration insights email (with custom subject)
    customDeclarationInsights: {
        projectId: 1, // Replace with actual project ID
        subject: "Custom Declaration Analysis Report"
    },

    // Custom declaration insights email (with auto-generated subject)
    customDeclarationInsightsAuto: {
        projectId: 1 // Subject will be auto-generated
    },

    // Combined insights email (with custom subjects)
    combinedInsights: {
        projectId: 1, // Replace with actual project ID
        invoiceSubject: "Custom Invoice Report",
        customDeclarationSubject: "Custom Declaration Report"
    },

    // Combined insights email (with auto-generated subjects)
    combinedInsightsAuto: {
        projectId: 1 // Both subjects will be auto-generated
    },

    // Custom declaration insights to agents only (with custom subject)
    customDeclarationToAgents: {
        projectId: 1, // Replace with actual project ID
        subject: "Custom Declaration Report for Agents"
    },

    // Custom declaration insights to agents only (with auto-generated subject)
    customDeclarationToAgentsAuto: {
        projectId: 1 // Subject will be auto-generated
    },

    // Custom declaration insights to shipping services only (with custom subject)
    customDeclarationToShippingServices: {
        projectId: 1, // Replace with actual project ID
        subject: "Custom Declaration Report for Shipping Services"
    },

    // Custom declaration insights to shipping services only (with auto-generated subject)
    customDeclarationToShippingServicesAuto: {
        projectId: 1 // Subject will be auto-generated
    },

    // Courier receipt insights to shipping services (with custom subject)
    courierReceiptToShippingServices: {
        projectId: 1, // Replace with actual project ID
        subject: "Courier Receipt Analysis Report"
    },

    // Courier receipt insights to shipping services (with auto-generated subject)
    courierReceiptToShippingServicesAuto: {
        projectId: 1 // Subject will be auto-generated
    }
};

// Test functions
async function testProjectInsights() {
    try {
        console.log('Testing project insights email...');
        const response = await axios.post(
            `${BASE_URL}/insight/send-project-insights`,
            testData.projectInsights,
            { headers }
        );
        console.log('✅ Project insights email sent successfully:', response.data);
    } catch (error) {
        console.error('❌ Error sending project insights email:', error.response?.data || error.message);
    }
}

async function testCustomDeclarationInsights() {
    try {
        console.log('Testing custom declaration insights email...');
        const response = await axios.post(
            `${BASE_URL}/insight/send-custom-declaration-insights`,
            testData.customDeclarationInsights,
            { headers }
        );
        console.log('✅ Custom declaration insights email sent successfully:', response.data);
    } catch (error) {
        console.error('❌ Error sending custom declaration insights email:', error.response?.data || error.message);
    }
}

async function testProjectInsightsAuto() {
    try {
        console.log('Testing project insights email with auto-generated subject...');
        const response = await axios.post(
            `${BASE_URL}/insight/send-project-insights`,
            testData.projectInsightsAuto,
            { headers }
        );
        console.log('✅ Project insights email with auto-generated subject sent successfully:', response.data);
    } catch (error) {
        console.error('❌ Error sending project insights email with auto-generated subject:', error.response?.data || error.message);
    }
}

async function testCustomDeclarationInsightsAuto() {
    try {
        console.log('Testing custom declaration insights email with auto-generated subject...');
        const response = await axios.post(
            `${BASE_URL}/insight/send-custom-declaration-insights`,
            testData.customDeclarationInsightsAuto,
            { headers }
        );
        console.log('✅ Custom declaration insights email with auto-generated subject sent successfully:', response.data);
    } catch (error) {
        console.error('❌ Error sending custom declaration insights email with auto-generated subject:', error.response?.data || error.message);
    }
}

async function testCombinedInsights() {
    try {
        console.log('Testing combined insights email with custom subjects...');
        const response = await axios.post(
            `${BASE_URL}/insight/send-combined-insights`,
            testData.combinedInsights,
            { headers }
        );
        console.log('✅ Combined insights email with custom subjects sent successfully:', response.data);
    } catch (error) {
        console.error('❌ Error sending combined insights email with custom subjects:', error.response?.data || error.message);
    }
}

async function testCombinedInsightsAuto() {
    try {
        console.log('Testing combined insights email with auto-generated subjects...');
        const response = await axios.post(
            `${BASE_URL}/insight/send-combined-insights`,
            testData.combinedInsightsAuto,
            { headers }
        );
        console.log('✅ Combined insights email with auto-generated subjects sent successfully:', response.data);
    } catch (error) {
        console.error('❌ Error sending combined insights email with auto-generated subjects:', error.response?.data || error.message);
    }
}

// Run tests
async function runTests() {
    console.log('🚀 Starting Insight Email Endpoint Tests...\n');

    console.log('📧 Testing with custom subjects:');
    await testProjectInsights();
    console.log('');

    await testCustomDeclarationInsights();
    console.log('');

    await testCombinedInsights();
    console.log('');

    console.log('🤖 Testing with auto-generated subjects:');
    await testProjectInsightsAuto();
    console.log('');

    await testCustomDeclarationInsightsAuto();
    console.log('');

    await testCombinedInsightsAuto();
    console.log('');

    // New separate endpoint tests
    console.log('--- Testing Separate Endpoints ---');
    await testCustomDeclarationToAgents();
    console.log('');
    await testCustomDeclarationToAgentsAuto();
    console.log('');
    await testCustomDeclarationToShippingServices();
    console.log('');
    await testCustomDeclarationToShippingServicesAuto();
    console.log('');
    await testCourierReceiptToShippingServices();
    console.log('');
    await testCourierReceiptToShippingServicesAuto();
    console.log('');

    console.log('✨ All tests completed!');
}

// Test custom declaration insights to agents only
async function testCustomDeclarationToAgents() {
    try {
        console.log('Testing custom declaration insights to agents...');

        const response = await axios.post(
            `${BASE_URL}/insight/send-custom-declaration-insights-to-agents`,
            testData.customDeclarationToAgents,
            { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
        );

        console.log('✅ Custom declaration insights to agents sent successfully!');
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('❌ Failed to send custom declaration insights to agents:', error.response?.data || error.message);
    }
}

// Test custom declaration insights to agents only (auto subject)
async function testCustomDeclarationToAgentsAuto() {
    try {
        console.log('Testing custom declaration insights to agents (auto subject)...');

        const response = await axios.post(
            `${BASE_URL}/insight/send-custom-declaration-insights-to-agents`,
            testData.customDeclarationToAgentsAuto,
            { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
        );

        console.log('✅ Custom declaration insights to agents (auto subject) sent successfully!');
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('❌ Failed to send custom declaration insights to agents (auto subject):', error.response?.data || error.message);
    }
}

// Test custom declaration insights to shipping services only
async function testCustomDeclarationToShippingServices() {
    try {
        console.log('Testing custom declaration insights to shipping services...');

        const response = await axios.post(
            `${BASE_URL}/insight/send-custom-declaration-insights-to-shipping-services`,
            testData.customDeclarationToShippingServices,
            { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
        );

        console.log('✅ Custom declaration insights to shipping services sent successfully!');
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('❌ Failed to send custom declaration insights to shipping services:', error.response?.data || error.message);
    }
}

// Test custom declaration insights to shipping services only (auto subject)
async function testCustomDeclarationToShippingServicesAuto() {
    try {
        console.log('Testing custom declaration insights to shipping services (auto subject)...');

        const response = await axios.post(
            `${BASE_URL}/insight/send-custom-declaration-insights-to-shipping-services`,
            testData.customDeclarationToShippingServicesAuto,
            { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
        );

        console.log('✅ Custom declaration insights to shipping services (auto subject) sent successfully!');
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('❌ Failed to send custom declaration insights to shipping services (auto subject):', error.response?.data || error.message);
    }
}

// Test courier receipt insights to shipping services
async function testCourierReceiptToShippingServices() {
    try {
        console.log('Testing courier receipt insights to shipping services...');

        const response = await axios.post(
            `${BASE_URL}/insight/send-courier-receipt-insights-to-shipping-services`,
            testData.courierReceiptToShippingServices,
            { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
        );

        console.log('✅ Courier receipt insights to shipping services sent successfully!');
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('❌ Failed to send courier receipt insights to shipping services:', error.response?.data || error.message);
    }
}

// Test courier receipt insights to shipping services (auto subject)
async function testCourierReceiptToShippingServicesAuto() {
    try {
        console.log('Testing courier receipt insights to shipping services (auto subject)...');

        const response = await axios.post(
            `${BASE_URL}/insight/send-courier-receipt-insights-to-shipping-services`,
            testData.courierReceiptToShippingServicesAuto,
            { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
        );

        console.log('✅ Courier receipt insights to shipping services (auto subject) sent successfully!');
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('❌ Failed to send courier receipt insights to shipping services (auto subject):', error.response?.data || error.message);
    }
}

// Export functions for testing
module.exports = {
    testProjectInsights,
    testProjectInsightsAuto,
    testCustomDeclarationInsights,
    testCustomDeclarationInsightsAuto,
    testCombinedInsights,
    testCombinedInsightsAuto,
    testCustomDeclarationToAgents,
    testCustomDeclarationToAgentsAuto,
    testCustomDeclarationToShippingServices,
    testCustomDeclarationToShippingServicesAuto,
    testCourierReceiptToShippingServices,
    testCourierReceiptToShippingServicesAuto,
    runTests
};

// Run tests if this file is executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

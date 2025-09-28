# Courier Receipt Analysis Feature

## Overview

The Courier Receipt Analysis feature allows you to analyze courier receipt documents (PDFs/images) and compare them against uploaded Excel invoice files to identify shipping information, discrepancies, and generate valuable insights about the shipping process.

## Features

- **Document Analysis**: Extract shipping information from courier receipt PDFs/images
- **Cross-Reference Comparison**: Compare shipping data between courier receipts and invoice files
- **Discrepancy Detection**: Identify mismatches in addresses, dates, tracking numbers, or shipping details
- **Insight Generation**: Provide actionable insights about shipping efficiency, compliance, and recommendations
- **Background Processing**: Analysis runs asynchronously in the background
- **Status Tracking**: Monitor analysis progress with status updates

## API Endpoints

### 1. Start Analysis

**POST** `/api/courier-receipt/analyze/:projectId`

Starts the analysis of courier receipt documents for a specific project.

**Response:**

```json
{
  "status": "success",
  "data": {
    "status": "processing",
    "projectId": 1,
    "courierReceiptId": 123,
    "threadId": "thread_abc123",
    "message": "Analysis is running in the background. Check the courier receipt status for updates."
  }
}
```

### 2. Get Analysis Results

**GET** `/api/courier-receipt/analysis/:projectId`

Retrieves the analysis results for a project's courier receipt.

**Response:**

```json
{
  "status": "success",
  "data": {
    "courierReceipt": {
      "id": 123,
      "fileName": "receipt.pdf",
      "status": "completed",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:35:00Z"
    },
    "analysis": {
      "courierReceiptAnalysis": {
        "trackingNumber": "TN123456789",
        "courierCompany": "FedEx",
        "deliveryDate": "2024-01-14",
        "originAddress": "123 Main St, City, State",
        "destinationAddress": "456 Oak Ave, City, State",
        "packageDetails": "Electronics - 2 boxes",
        "shippingMethod": "Express",
        "deliveryStatus": "Delivered"
      },
      "comparisonResults": {
        "addressMatches": true,
        "dateMatches": false,
        "trackingMatches": true,
        "discrepancies": [
          {
            "field": "deliveryDate",
            "courierReceiptValue": "2024-01-14",
            "invoiceValue": "2024-01-15",
            "severity": "medium"
          }
        ]
      },
      "insights": [
        {
          "category": "shipping_efficiency",
          "title": "Delivery Date Mismatch",
          "description": "The courier receipt shows delivery on 2024-01-14, but the invoice indicates 2024-01-15",
          "recommendation": "Verify the actual delivery date with the recipient",
          "priority": "medium"
        }
      ],
      "summary": {
        "totalDiscrepancies": 1,
        "criticalIssues": 0,
        "overallShippingHealth": "warning",
        "recommendations": [
          "Verify delivery dates with recipients",
          "Implement tracking number validation"
        ]
      }
    },
    "project": {
      "id": 1,
      "title": "Sample Project",
      "aiConversation": "thread_abc123"
    }
  }
}
```

## Analysis Process

1. **File Upload**: Courier receipt files are uploaded via the courier receipt creation endpoint
2. **Analysis Trigger**: Call the analyze endpoint to start the analysis process
3. **Background Processing**: The system uploads files to OpenAI and processes them
4. **Comparison**: Shipping data is compared between courier receipts and invoice files
5. **Insight Generation**: AI generates structured insights and recommendations
6. **Status Update**: Courier receipt status is updated to "completed" or "failed"
7. **Results Retrieval**: Use the analysis endpoint to get the results

## Analysis Output Structure

### Courier Receipt Analysis

- **trackingNumber**: Tracking number from the receipt
- **courierCompany**: Name of the courier company
- **deliveryDate**: Date of delivery
- **originAddress**: Shipping origin address
- **destinationAddress**: Delivery destination address
- **packageDetails**: Details about the shipped package
- **shippingMethod**: Method of shipping used
- **deliveryStatus**: Current delivery status

### Comparison Results

- **addressMatches**: Whether addresses match between documents
- **dateMatches**: Whether dates are consistent
- **trackingMatches**: Whether tracking numbers match
- **discrepancies**: Array of identified discrepancies with severity levels

### Insights

- **category**: Type of insight (shipping_efficiency, compliance, etc.)
- **title**: Brief title of the insight
- **description**: Detailed description of the finding
- **recommendation**: Suggested action to take
- **priority**: Priority level (low/medium/high)

### Summary

- **totalDiscrepancies**: Total number of discrepancies found
- **criticalIssues**: Number of critical issues requiring immediate attention
- **overallShippingHealth**: Overall health status (good/warning/needs_attention)
- **recommendations**: List of actionable recommendations

## Status Values

- **uploaded**: Courier receipt has been uploaded but not analyzed
- **processing**: Analysis is currently in progress
- **completed**: Analysis has been completed successfully
- **failed**: Analysis failed due to an error

## Requirements

1. **Courier Receipt File**: Must be a PDF or image file containing shipping information
2. **Invoice Files**: Excel files (.xlsx/.xls) for comparison (optional but recommended)
3. **Project**: Must have a valid project ID
4. **OpenAI API**: Requires valid OpenAI API key and assistant setup

## Error Handling

The system handles various error scenarios:

- **Missing Files**: Returns error if courier receipt file is missing
- **Upload Failures**: Gracefully handles file upload failures
- **Analysis Errors**: Updates status to "failed" with error details
- **Parsing Errors**: Handles JSON parsing errors in analysis results

## Testing

Use the provided test script to verify the functionality:

```bash
node scripts/test-courier-receipt-analysis.js
```

This script will:

1. Check for existing test data
2. Verify file existence
3. Test AI conversation setup
4. Validate the analysis configuration

## Best Practices

1. **File Quality**: Ensure courier receipt files are clear and readable
2. **Regular Monitoring**: Check analysis status regularly for large files
3. **Error Handling**: Always check the response status and handle errors appropriately
4. **Data Validation**: Verify analysis results before taking action on recommendations
5. **Security**: Ensure proper authentication when accessing analysis endpoints

## Troubleshooting

### Common Issues

1. **Analysis Stuck in Processing**: Check OpenAI API status and file upload limits
2. **No Invoice Files**: Analysis will still work but with limited comparison data
3. **Parsing Errors**: Check if the courier receipt file is corrupted or unreadable
4. **Thread Issues**: Create a new AI conversation thread if analysis fails repeatedly

### Support

For technical support or issues, check:

1. Server logs for detailed error messages
2. OpenAI API status and quota limits
3. File upload middleware configuration
4. Database connection and model associations

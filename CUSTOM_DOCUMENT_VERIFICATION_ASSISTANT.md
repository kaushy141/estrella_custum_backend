# Custom Document Verification Assistant

## Overview

The Custom Document Verification Assistant is an AI-powered assistant specifically designed for analyzing and validating customs declarations against invoice documents to detect mismatches, typos, and compliance risks.

## Features

- **Multi-format document parsing**: Supports PDF, XLSX, DOCX, and TXT files
- **Structured data extraction**: Automatically extracts key information from invoices and customs declarations
- **Cross-validation**: Compares invoice data with declaration data to identify discrepancies
- **Compliance checking**: Validates HS/CN codes, duty rates, VAT calculations, and regulatory compliance
- **Detailed reporting**: Provides both structured JSON and Markdown summaries

## Assistant Configuration

### Specifications

- **Name**: Custom Document Verification Assistant
- **Model**: gpt-4o (or gpt-4.1/gpt-5 when available)
- **Tools**:
  - `file_search`: Vector store for uploaded documents
  - `code_interpreter`: For parsing PDFs and XLSX files
- **Purpose**: Customs declaration validation and invoice verification

### Capabilities

1. **Document Parsing**:

   - Extracts parties (exporter, importer, consignee)
   - Invoice details (number, date, totals, currency)
   - Declaration details (MRN, LRN, HS/CN codes, procedure codes, Incoterms, values, duties, VAT, weights)
   - Item-level details (description, quantity, unit, gross/net weight, HS code, rate, total value)

2. **Cross-validation**:

   - Matches invoice totals with declaration values (±0.5% tolerance)
   - Verifies HS codes, quantities, and weights
   - Validates addresses and consignee/consignor names
   - Compares currencies and exchange rates

3. **Compliance Validation**:

   - Checks CN/HS code correctness
   - Confirms duty/VAT rates
   - Flags missing or inconsistent documents
   - Highlights critical discrepancies

4. **Output Format**:
   - Structured JSON following requested schema
   - Markdown summary with PASS/FAIL checks, mismatches, and recommendations

## Setup Instructions

### 1. Create the Assistant

Run the creation script:

```bash
node scripts/create-custom-verification-assistant.js
```

This will:

- Create a new OpenAI assistant with the specified configuration
- Save the configuration to `config/custom-verification-assistant.json`
- Update your `.env` file with the assistant ID

### 2. Environment Configuration

The assistant ID will be automatically added to your `.env` file:

```env
CUSTOM_VERIFICATION_ASSISTANT_ID=asst_your_assistant_id_here
```

### 3. Usage in Your Application

You can use this assistant in your application:

```javascript
const OpenAIService = require("./services/openai-service");

// Get the assistant ID from environment
const assistantId = process.env.CUSTOM_VERIFICATION_ASSISTANT_ID;

// Use the assistant for document verification
const service = new OpenAIService();
const result = await service.analyzeCustomDeclaration(
  assistantId,
  invoiceFile,
  declarationFile
);
```

## Configuration File

The assistant configuration is saved in `config/custom-verification-assistant.json`:

```json
{
  "assistantId": "asst_xxxxx",
  "name": "Custom Document Verification Assistant",
  "model": "gpt-4o",
  "description": "Analyzes invoices, customs declarations, and related business documents...",
  "instructions": "...",
  "tools": [...],
  "metadata": {
    "created_by": "estrella-backend",
    "created_at": "2025-01-XX...",
    "version descript": "1.0.0",
    "purpose": "custom-declaration-verification",
    "domain": "customs-compliance"
  }
}
```

## Workflow

### Typical Validation Process

1. **Upload Documents**:

   - Invoice file (PDF/XLSX)
   - Customs declaration file (PDF/XLSX)

2. **Document Parsing**:

   - Extract structured data from both documents
   - Parse invoice details and declaration details

3. **Cross-validation**:

   - Compare invoice totals with declaration values
   - Verify HS codes and quantities
   - Check addresses and parties

4. **Compliance Check**:

   - Validate HS/CN codes
   - Check duty/VAT rates
   - Flag discrepancies

5. **Reporting**:
   - Generate structured JSON output
   - Create Markdown summary with recommendations

### Output Schema

The assistant provides structured output including:

- **Extracted Data**: All key information from documents
- **Comparison Results**: Side-by-side comparison of invoice vs declaration
- **Discrepancies**: List of mismatches and issues found
- **Compliance Status**: PASS/FAIL for each compliance check
- **Recommendations**: Suggestions for resolving issues

## Validation Rules

### Tolerance Levels

- **Numeric comparisons**: ±0.5% tolerance for differences
- **Currency conversion**: Allow for FX rate variations
- **Weight measurements**: Consider rounding differences

### Data Handling

- If data is missing, set fields to `null` instead of inventing values
- Always preserve original values from documents
- Flag any assumptions or estimations made

### Error Reporting

- **Critical Discrepancies**: Wrong codes, missing invoices, mismatched totals
- **Warnings**: Typos, minor inconsistencies, optional fields missing
- **Info**: Recommended improvements or best practices

## Examples

### Example Use Case

```javascript
// Verify customs declaration against invoice
const verificationResult = await verifyCustomDeclaration({
  invoice: "path/to/invoice.pdf",
  declaration: "path/to/declaration.pdf",
  assistantId: process.env.CUSTOM_VERIFICATION_ASSISTANT_ID,
});

// Process results
if (verificationResult.compliance.passed) {
  console.log("✅ Declaration is compliant");
} else {
  console.log("❌ Issues found:");
  verificationResult.discrepancies.forEach((issue) => {
    console.log(`- ${issue.type}: ${issue.description}`);
  });
}
```

## Maintenance

### Updating the Assistant

If you need to update the assistant configuration:

```javascript
const manager = new OpenAIAssistantManager();
const assistantId = process.env.CUSTOM_VERIFICATION_ASSISTANT_ID;

await manager.updateAssistant(assistantId, {
  instructions: "Updated instructions...",
  // ... other updates
});
```

### Listing Assistants

To see all assistants:

```bash
node scripts/openai-assistant-manager.js list
```

### Retrieving Assistant Details

```bash
node scripts/openai-assistant-manager.js get asst_your_assistant_id
```

### Cleanup

To clean up old assistants:

```bash
node scripts/openai-assistant-manager.js cleanup 5
```

## Troubleshooting

### Common Issues

1. **Assistant ID not found**

   - Ensure the assistant has been created
   - Check that `.env` file has the correct ID
   - Verify the assistant ID in OpenAI dashboard

2. **Parse errors**

   - Ensure documents are in supported formats
   - Check file permissions and accessibility
   - Verify document content is not corrupted

3. **Validation failures**
   - Review discrepancy reports for details
   - Check if tolerance settings are appropriate
   - Verify source document quality

## Best Practices

1. **Document Quality**: Use clear, high-quality scans
2. **File Formats**: Prefer PDF or XLSX for better parsing
3. **Data Completeness**: Ensure all required fields are filled
4. **Regular Updates**: Keep assistant configuration up to date
5. **Error Handling**: Always handle validation errors gracefully

## Support

For issues or questions:

- Check the assistant configuration in `config/custom-verification-assistant.json`
- Review OpenAI API documentation
- Check system logs for detailed error messages

## License

Part of the Estrella Custom Backend project.

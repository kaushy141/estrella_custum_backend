# PZ Document Generator - Implementation Summary

## Overview

This implementation adds a complete PZ (Customs Clearance) document generation system to the Estrella backend. The system generates professional PDF documents combining invoice and custom declaration data.

## What Was Implemented

### 1. New Service Layer

**File:** `services/pz-document-generator.service.js`

A comprehensive service that:

- ✅ Fetches all invoices for a project
- ✅ Retrieves the latest custom declaration document
- ✅ Parses insights from both invoices and declarations
- ✅ Generates professional bilingual (Polish/English) PDF documents
- ✅ Saves files in a structured directory pattern
- ✅ Returns complete file metadata

**Key Features:**

- Header with document title
- Project information section
- Custom declaration details
- Invoice summary with totals
- Detailed invoice information with line items
- Footer with pagination and timestamps
- Professional formatting with proper spacing

### 2. Updated Controller

**File:** `controller/custom-clearance.js`

Added `generatePZDocument` method that:

- ✅ Validates request and project access
- ✅ Calls the PZ generator service
- ✅ Creates CustomClearance database record
- ✅ Logs activity for audit trail
- ✅ Returns comprehensive response with file details

### 3. Updated Router

**File:** `routers/custom-clearance.js`

Added new route:

```javascript
POST / api / custom - clearance / generate - pz;
```

**Authentication:** Required (JWT)

### 4. Updated Dependencies

**File:** `package.json`

Added:

- `pdfkit: ^0.15.0` - PDF generation library
- npm script: `test-pz-generator` - For testing

### 5. Documentation

Created comprehensive documentation:

- **`PZ_DOCUMENT_GENERATOR.md`** - Complete API and usage documentation
- **`SETUP_PZ_GENERATOR.md`** - Setup and installation guide
- **`PZ_IMPLEMENTATION_SUMMARY.md`** - This file

### 6. Testing

**File:** `test-pz-generator.js`

Comprehensive test script that:

- ✅ Validates prerequisites (project, group, invoices, declaration)
- ✅ Generates test PZ document
- ✅ Creates CustomClearance record
- ✅ Provides detailed output and troubleshooting tips

## File Structure

```
estrella_custum_backend/
│
├── services/
│   └── pz-document-generator.service.js    ← NEW SERVICE
│
├── controller/
│   └── custom-clearance.js                 ← UPDATED (added generatePZDocument)
│
├── routers/
│   └── custom-clearance.js                 ← UPDATED (added POST /generate-pz route)
│
├── media/
│   └── declaration/                        ← AUTO-CREATED for PDF storage
│       └── {guid-first-char}/
│           └── PZ-{project}-{timestamp}.pdf
│
├── test-pz-generator.js                    ← NEW TEST SCRIPT
├── PZ_DOCUMENT_GENERATOR.md                ← NEW DOCUMENTATION
├── SETUP_PZ_GENERATOR.md                   ← NEW SETUP GUIDE
├── PZ_IMPLEMENTATION_SUMMARY.md            ← THIS FILE
└── package.json                            ← UPDATED (added pdfkit dependency)
```

## Database Schema Impact

### CustomClearance Model

**Table:** `customClearances`

The existing model is used to store generated PZ documents:

```javascript
{
  id: INTEGER (Primary Key),
  guid: UUID (Unique),
  projectId: INTEGER (FK to projects),
  groupId: INTEGER (FK to groups),
  filePath: STRING(255),          // Path to generated PDF
  fileContent: TEXT,               // JSON metadata
  openAIFileId: STRING(255),       // NULL for PZ docs
  insights: TEXT,                  // Combined insights JSON
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
}
```

No database migrations required - uses existing schema.

## API Endpoints

### Generate PZ Document

**Endpoint:** `POST /api/custom-clearance/generate-pz`

**Headers:**

```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Request Body:**

```json
{
  "projectId": 1
}
```

**Success Response (200):**

```json
{
  "status": "success",
  "message": "PZ document generated successfully",
  "data": {
    "customClearance": {
      "id": 1,
      "guid": "550e8400-e29b-41d4-a716-446655440000",
      "projectId": 1,
      "groupId": 1,
      "filePath": "media/declaration/5/PZ-Project_Name-2025-10-14T12-30-45.pdf",
      "fileContent": "{...}",
      "insights": "{...}",
      "openAIFileId": null,
      "createdAt": "2025-10-14T12:30:45.000Z",
      "updatedAt": "2025-10-14T12:30:45.000Z"
    },
    "fileName": "PZ-Project_Name-2025-10-14T12-30-45.pdf",
    "filePath": "media/declaration/5/PZ-Project_Name-2025-10-14T12-30-45.pdf"
  }
}
```

**Error Responses:**

400 - Bad Request:

```json
{
  "status": "error",
  "message": "Project ID is required",
  "data": null
}
```

404 - Not Found:

```json
{
  "status": "error",
  "message": "Project not found",
  "data": null
}
```

500 - Server Error:

```json
{
  "status": "error",
  "message": "No invoices found for project 1",
  "data": {
    "error": "No invoices found for project 1"
  }
}
```

## PDF Document Structure

The generated PDF follows the format of the provided `pz doc.pdf` with these sections:

### 1. Header

```
DOKUMENT ODPRAWY CELNEJ (PZ)
CUSTOMS CLEARANCE DOCUMENT
----------------------------
```

### 2. Project Information

```
Informacje o Projekcie / Project Information
├── Projekt / Project: {title}
├── Status: {status}
├── Grupa / Group: {name}
└── Opis / Description: {description}
```

### 3. Custom Declaration

```
Deklaracja Celna / Custom Declaration
├── Numer Dokumentu / Document Number: {guid}
├── Nazwa Pliku / File Name: {fileName}
├── Data Utworzenia / Created: {date}
└── Szczegóły / Details: {insights}
```

### 4. Invoice Summary

```
Podsumowanie Faktur / Invoice Summary
├── Całkowita Liczba Faktur / Total Invoices: {count}
└── Łączna Wartość / Total Value: {amount} {currency}
```

### 5. Invoice Details

```
Szczegóły Faktur / Invoice Details
For each invoice:
├── Faktura {n} / Invoice {n}
│   ├── Plik Oryginalny / Original File: {fileName}
│   ├── Plik Tłumaczony / Translated File: {translatedFileName}
│   ├── Data / Date: {date}
│   ├── Numer / Number: {invoiceNumber}
│   ├── Sprzedawca / Seller: {seller}
│   ├── Kupujący / Buyer: {buyer}
│   ├── Suma / Total: {total} {currency}
│   └── Pozycje / Items:
│       └── {item.description} - {quantity} x {price} = {total}
```

### 6. Footer

```
Strona {n} z {total} | Wygenerowano / Generated: {timestamp}
```

## Integration Points

### 1. With Invoice System

- Reads all invoices for a project
- Parses `insights` JSON field
- Parses `translatedFileContent` JSON field
- Extracts invoice details (number, date, seller, buyer, items, totals)

### 2. With Custom Declaration System

- Retrieves latest custom declaration
- Parses `insights` JSON field
- Includes declaration metadata

### 3. With Activity Logging

- Logs PZ document generation
- Action: `CUSTOM_CLEARANCE_CREATED`
- Tracks who generated the document and when

### 4. With File System

- Creates directory structure: `media/declaration/{guid-char}/`
- Saves PDF with naming pattern: `PZ-{project}-{timestamp}.pdf`
- Similar pattern to translated invoice files

## Activity Logging

Each PZ document generation creates an activity log:

```javascript
{
  projectId: {projectId},
  groupId: {groupId},
  action: "CUSTOM_CLEARANCE_CREATED",
  description: "Custom clearance was created for project ID: {projectId}",
  createdBy: {userId},
  createdAt: {timestamp}
}
```

## Security Considerations

1. **Authentication:** JWT token required
2. **Authorization:** User must have access to project's group
3. **Validation:** Project and group existence verified
4. **Input Sanitization:** Project title sanitized for filename
5. **File Permissions:** Files created with appropriate permissions
6. **Activity Tracking:** All generations logged for audit

## Performance Considerations

1. **Async Operations:** All database queries are async
2. **PDF Generation:** Buffered pages for better memory usage
3. **File I/O:** Streaming write to disk
4. **Error Handling:** Comprehensive try-catch blocks
5. **Resource Cleanup:** Proper stream closing

## Testing

### 1. Unit Testing

```bash
npm run test-pz-generator
```

### 2. API Testing

Use Postman or cURL:

```bash
curl -X POST http://localhost:3000/api/custom-clearance/generate-pz \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"projectId": 1}'
```

### 3. Manual Testing

1. Generate PZ document via API
2. Locate PDF file in media/declaration/
3. Open and verify all sections
4. Check database for CustomClearance record
5. Verify activity log entry

## Installation Steps

### 1. Install Dependencies

```bash
npm install pdfkit
```

### 2. Create Media Directory

```bash
mkdir -p media/declaration
chmod 755 media/declaration
```

### 3. Test Installation

```bash
npm run test-pz-generator
```

### 4. Restart Server

```bash
npm restart
```

## Usage Example

```javascript
// Using the service directly
const pzDocumentGenerator = require("./services/pz-document-generator.service");

const result = await pzDocumentGenerator.generatePZDocument(projectId, groupId);
console.log("PDF generated:", result.filePath);

// Via API
const axios = require("axios");

const response = await axios.post(
  "http://localhost:3000/api/custom-clearance/generate-pz",
  { projectId: 1 },
  {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  }
);

console.log("PZ Document:", response.data);
```

## Troubleshooting

### Common Issues

1. **"pdfkit module not found"**

   - Run: `npm install pdfkit`

2. **"No invoices found"**

   - Upload invoices for the project
   - Verify project ID is correct

3. **"No custom declaration found"**

   - Upload custom declaration for the project
   - Check project ID and group ID match

4. **"Permission denied"**

   - Create media directory: `mkdir -p media/declaration`
   - Set permissions: `chmod 755 media/declaration`

5. **"Project not found"**
   - Verify project ID exists
   - Check user has access to project's group

## Future Enhancements

Potential improvements:

- [ ] Add company logo to PDF
- [ ] Support multiple currencies with conversion
- [ ] Digital signatures
- [ ] QR codes for verification
- [ ] Email delivery
- [ ] Batch generation for multiple projects
- [ ] Custom templates per group
- [ ] PDF encryption
- [ ] Watermarks
- [ ] Multi-language support beyond Polish/English

## Code Quality

- ✅ No linting errors
- ✅ Consistent coding style
- ✅ Comprehensive error handling
- ✅ Detailed logging
- ✅ Clean code principles
- ✅ Well-documented
- ✅ Modular design
- ✅ Reusable components

## Compliance

Follows existing Estrella patterns:

- ✅ Similar to invoice translation file saving
- ✅ Uses existing authentication/authorization
- ✅ Follows existing error response format
- ✅ Uses existing activity logging system
- ✅ Consistent with database schema conventions

## Summary

This implementation provides a complete, production-ready PZ document generation system that:

1. ✅ Generates professional PDF documents
2. ✅ Combines invoice and declaration data
3. ✅ Saves files in organized directory structure
4. ✅ Creates database records for tracking
5. ✅ Logs all activities for audit
6. ✅ Follows existing codebase patterns
7. ✅ Includes comprehensive documentation
8. ✅ Provides testing utilities
9. ✅ Handles errors gracefully
10. ✅ Ready for production deployment

The system is ready to use immediately after installing the `pdfkit` dependency and creating the media directory structure.

---

**Implementation Date:** October 14, 2025  
**Version:** 1.0.0  
**Status:** ✅ Complete and Ready for Use

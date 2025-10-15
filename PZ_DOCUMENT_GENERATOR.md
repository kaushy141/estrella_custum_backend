# PZ Document Generator

## Overview

The PZ Document Generator is a service that creates professional PDF documents for customs clearance based on:

- All invoices from a project
- Latest custom declaration document and its insights
- Project and group information

## Features

- ✅ Generates PDF in Polish/English bilingual format
- ✅ Combines all project invoices into a single document
- ✅ Includes custom declaration insights
- ✅ Saves to local path similar to translated invoice files
- ✅ Automatically creates CustomClearance record
- ✅ Activity logging support

## Installation

First, install the required dependencies:

```bash
npm install pdfkit
```

## API Endpoint

### Generate PZ Document

**Endpoint:** `POST /api/custom-clearance/generate-pz`

**Authentication:** Required (JWT token)

**Request Body:**

```json
{
  "projectId": 1
}
```

**Response:**

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

## File Structure

The generated PDF includes:

### 1. Header

- Document title in Polish and English
- "DOKUMENT ODPRAWY CELNEJ (PZ)"
- "CUSTOMS CLEARANCE DOCUMENT"

### 2. Project Information

- Project name/title
- Project status
- Group name
- Project description (if available)

### 3. Custom Declaration Information

- Document number (GUID)
- File name
- Creation date
- Detailed insights from AI analysis

### 4. Invoice Summary

- Total number of invoices
- Total value (if available)
- Currency information

### 5. Invoice Details

- For each invoice:
  - Original file name
  - Translated file name
  - Invoice date
  - Invoice number
  - Seller information
  - Buyer information
  - Total amount
  - Line items (if available)

### 6. Footer

- Page numbers
- Generation timestamp

## File Storage

Files are saved following this pattern:

```
media/declaration/{first-char-of-declaration-guid}/PZ-{project-title}-{timestamp}.pdf
```

Example:

```
media/declaration/5/PZ-Import_Electronics-2025-10-14T12-30-45.pdf
```

## Usage Examples

### Using cURL

```bash
curl -X POST http://localhost:3000/api/custom-clearance/generate-pz \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"projectId": 1}'
```

### Using JavaScript/Axios

```javascript
const axios = require("axios");

async function generatePZDocument(projectId, token) {
  try {
    const response = await axios.post(
      "http://localhost:3000/api/custom-clearance/generate-pz",
      { projectId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("PZ Document generated:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Error generating PZ document:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// Usage
generatePZDocument(1, "your-jwt-token-here");
```

### Using Postman

1. Set method to `POST`
2. URL: `http://localhost:3000/api/custom-clearance/generate-pz`
3. Headers:
   - `Authorization`: `Bearer YOUR_JWT_TOKEN`
   - `Content-Type`: `application/json`
4. Body (raw JSON):

```json
{
  "projectId": 1
}
```

## Requirements

Before generating a PZ document, ensure:

1. ✅ Project exists with valid ID
2. ✅ At least one invoice exists for the project
3. ✅ At least one custom declaration exists for the project
4. ✅ User is authenticated with valid JWT token
5. ✅ User has access to the project's group

## Error Handling

### Common Errors

**Project not found:**

```json
{
  "status": "error",
  "message": "Project not found",
  "data": null
}
```

**No invoices found:**

```json
{
  "status": "error",
  "message": "No invoices found for project 1",
  "data": {
    "error": "No invoices found for project 1"
  }
}
```

**No custom declaration found:**

```json
{
  "status": "error",
  "message": "No custom declaration found for project 1",
  "data": {
    "error": "No custom declaration found for project 1"
  }
}
```

## Database Schema

### CustomClearance Model

```javascript
{
  id: INTEGER (Primary Key, Auto Increment),
  guid: UUID (Unique, Auto-generated),
  projectId: INTEGER (Foreign Key),
  groupId: INTEGER (Foreign Key),
  filePath: STRING(255),
  fileContent: TEXT,
  openAIFileId: STRING(255), // Nullable
  insights: TEXT,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
}
```

## Implementation Details

### Service: `pz-document-generator.service.js`

The service handles:

- Fetching project, group, invoices, and custom declaration data
- Parsing JSON insights
- Creating PDF with proper formatting
- Managing file storage

### Controller: `custom-clearance.js`

The controller method `generatePZDocument`:

- Validates request
- Calls the PZ generator service
- Creates CustomClearance record
- Logs activity
- Returns response

### Router: `custom-clearance.js`

Route definition:

```javascript
router.post(
  "/generate-pz",
  authenticateToken,
  customClearanceController.generatePZDocument
);
```

## Activity Logging

Each PZ document generation is logged with:

- Action: `CUSTOM_CLEARANCE_CREATED`
- Description: Custom clearance was created for project ID: {projectId}
- User ID: Who generated the document
- Timestamp: When it was generated

## Future Enhancements

Potential improvements:

- [ ] Add company logo to PDF header
- [ ] Support for multiple currencies
- [ ] Digital signature support
- [ ] QR code for document verification
- [ ] Email delivery option
- [ ] Batch generation for multiple projects
- [ ] Custom templates per group
- [ ] Watermark support
- [ ] PDF encryption option

## Testing

See `test-pz-generator.js` for testing examples.

## Troubleshooting

### PDF not generating

1. Check if `pdfkit` is installed: `npm list pdfkit`
2. Verify directory permissions for `media/declaration/`
3. Check logs for detailed error messages

### Missing data in PDF

1. Verify invoices have `insights` and `translatedFileContent`
2. Check custom declaration has valid `insights` JSON
3. Ensure data is properly parsed (check JSON format)

### File path issues

1. Ensure `media` directory exists in project root
2. Check write permissions
3. Verify custom declaration GUID is valid

## Support

For issues or questions:

1. Check server logs for detailed error messages
2. Verify all prerequisites are met
3. Test with sample data first
4. Contact development team

## License

Part of Estrella Custom Backend API

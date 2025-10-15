# Invoice Download Endpoints

## Overview

New download endpoints have been added to the Invoice API to allow downloading both original and translated invoice files. These endpoints follow the same pattern as the custom-clearance download functionality.

## Endpoints

### 1. Download Original Invoice File

**Endpoint:** `GET /api/v1/invoice/download/original/:id`

**Description:** Downloads the original invoice file by invoice ID or GUID.

**Authentication:** Required (Bearer token)

**Parameters:**

- `id` (path parameter): Invoice ID or GUID

**Response:**

- Success: File stream with appropriate content-type
- 404: Invoice not found or original file doesn't exist
- 401: Unauthorized (invalid or missing token)

**Supported File Formats:**

- PDF (`.pdf`)
- Excel (`.xlsx`, `.xls`)
- Word (`.doc`, `.docx`)
- Images (`.png`, `.jpg`, `.jpeg`)
- Other formats (served as `application/octet-stream`)

**Example:**

```bash
curl -X GET \
  http://localhost:3001/api/v1/invoice/download/original/550e8400-e29b-41d4-a716-446655440000 \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  --output original_invoice.xlsx
```

---

### 2. Download Translated Invoice File

**Endpoint:** `GET /api/v1/invoice/download/translated/:id`

**Description:** Downloads the translated invoice file by invoice ID or GUID.

**Authentication:** Required (Bearer token)

**Parameters:**

- `id` (path parameter): Invoice ID or GUID

**Response:**

- Success: File stream with appropriate content-type
- 404: Invoice not found, translated file doesn't exist, or invoice hasn't been translated
- 401: Unauthorized (invalid or missing token)

**Supported File Formats:**

- PDF (`.pdf`)
- Excel (`.xlsx`, `.xls`)
- Word (`.doc`, `.docx`)
- Images (`.png`, `.jpg`, `.jpeg`)
- Other formats (served as `application/octet-stream`)

**Example:**

```bash
curl -X GET \
  http://localhost:3001/api/v1/invoice/download/translated/550e8400-e29b-41d4-a716-446655440000 \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  --output translated_invoice.xlsx
```

---

## Implementation Details

### Controller Methods

Two new methods have been added to `controller/invoice.js`:

1. **`downloadOriginalById`** - Handles downloading original invoice files
2. **`downloadTranslatedById`** - Handles downloading translated invoice files

### Security Features

- **Authentication Required:** All download endpoints require a valid JWT token
- **Group-based Access Control:** Non-super admin users can only download invoices from their own group
- **File Validation:** Checks if the file exists on the server before streaming
- **Error Handling:** Comprehensive error handling with appropriate HTTP status codes

### File Streaming

- Files are streamed directly to the client (not loaded into memory)
- Proper content-type headers are set based on file extension
- Content-Disposition header includes the original filename
- Efficient for large files

### Error Responses

**Invoice Not Found:**

```json
{
  "status": "error",
  "message": "Invoice not found"
}
```

**Original File Not Found:**

```json
{
  "status": "error",
  "message": "Original file not found for this invoice"
}
```

**Translated File Not Found:**

```json
{
  "status": "error",
  "message": "Translated file not found for this invoice. Please ensure the invoice has been translated."
}
```

**File Not on Server:**

```json
{
  "status": "error",
  "message": "File not found on server",
  "data": {
    "filePath": "/path/to/missing/file"
  }
}
```

---

## Testing

A test script has been provided: `test-invoice-download.js`

### How to Use the Test Script:

1. Open `test-invoice-download.js`
2. Update the following variables:
   ```javascript
   const AUTH_TOKEN = "your_actual_token_here";
   const INVOICE_ID = "your_invoice_id_or_guid_here";
   ```
3. Run the tests:
   ```bash
   node test-invoice-download.js
   ```

### Test Cases Covered:

1. ✅ Download original invoice file
2. ✅ Download translated invoice file
3. ✅ Handle invalid invoice ID (404 error)

---

## Database Schema

The invoice model uses the following fields for file storage:

```javascript
{
  originalFilePath: STRING(255),      // Path to original file
  originalFileName: STRING(100),      // Original filename
  translatedFilePath: STRING(255),    // Path to translated file
  translatedFileName: STRING(100),    // Translated filename
  originalFileContent: TEXT,          // Parsed content from original
  translatedFileContent: TEXT,        // Parsed content from translated
  translatedLanguage: STRING(50),     // Language of translation
  status: STRING(50)                  // uploaded, processing, completed, failed
}
```

---

## Integration with Frontend

### React/JavaScript Example:

```javascript
// Download original invoice
async function downloadOriginalInvoice(invoiceId, token) {
  try {
    const response = await fetch(
      `http://localhost:3001/api/v1/invoice/download/original/${invoiceId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Download failed");
    }

    // Get filename from Content-Disposition header
    const contentDisposition = response.headers.get("content-disposition");
    const filename = contentDisposition
      ? contentDisposition.split("filename=")[1].replace(/"/g, "")
      : "invoice.xlsx";

    // Create blob and download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error("Error downloading invoice:", error);
    alert("Failed to download invoice");
  }
}

// Download translated invoice
async function downloadTranslatedInvoice(invoiceId, token) {
  try {
    const response = await fetch(
      `http://localhost:3001/api/v1/invoice/download/translated/${invoiceId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status === 404) {
      alert("This invoice has not been translated yet");
      return;
    }

    if (!response.ok) {
      throw new Error("Download failed");
    }

    // Get filename from Content-Disposition header
    const contentDisposition = response.headers.get("content-disposition");
    const filename = contentDisposition
      ? contentDisposition.split("filename=")[1].replace(/"/g, "")
      : "translated_invoice.xlsx";

    // Create blob and download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error("Error downloading invoice:", error);
    alert("Failed to download invoice");
  }
}
```

---

## Comparison with Custom Clearance Download

### Similarities:

- Both use file streaming for efficient downloads
- Both support ID and GUID lookup
- Both implement group-based access control
- Both use similar error handling patterns

### Differences:

- Invoice has separate endpoints for original vs translated files
- Custom clearance has project-based download with `latest` query parameter
- Invoice supports more file types (Excel, Word, Images)
- Custom clearance only handles PDF files

---

## Files Modified

1. **`controller/invoice.js`** - Added two new download methods
2. **`routers/invoice.js`** - Added two new GET routes
3. **`API_DOCUMENTATION.md`** - Updated with new endpoint documentation

## Files Created

1. **`test-invoice-download.js`** - Test script for download endpoints
2. **`INVOICE_DOWNLOAD_ENDPOINTS.md`** - This documentation file

---

## Next Steps

### Recommended Enhancements:

1. **Batch Download:** Add endpoint to download multiple invoices as a ZIP file
2. **Project-based Download:** Add endpoint to download all invoices for a project
3. **Download History:** Track download events in activity logs
4. **Presigned URLs:** Generate temporary download URLs for enhanced security
5. **File Preview:** Add endpoints to preview files without downloading

### Frontend Integration:

1. Add download buttons to invoice list and detail views
2. Show download progress indicator for large files
3. Handle file type icons based on extension
4. Display translated status before allowing translated download
5. Add bulk download functionality for multiple invoices

---

## Support

For issues or questions:

- Check the main `API_DOCUMENTATION.md` for general API usage
- Review `START_HERE.md` for project setup instructions
- Consult `QUICK_REFERENCE.md` for common patterns and examples

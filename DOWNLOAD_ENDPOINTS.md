# Custom Clearance Download Endpoints

## Overview

Two new endpoints have been added to download custom clearance (PZ) documents by project ID or document ID.

---

## Endpoints

### 1. Download by Project ID

Download custom clearance documents for a specific project.

**Endpoint:** `GET /api/custom-clearance/download/project/:projectId`

**Authentication:** Required (JWT token)

**Parameters:**

- `projectId` (path parameter) - The project ID
- `latest` (query parameter) - Optional, default: `true`
  - `true`: Downloads the latest PZ document for the project
  - `false`: Returns list of all PZ documents with download links

#### Download Latest Document

**Request:**

```bash
GET /api/custom-clearance/download/project/1
GET /api/custom-clearance/download/project/1?latest=true
```

**Response:**

- File download (PDF)
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="PZ-Project_Name-2025-10-14T12-30-45.pdf"`

**Example with cURL:**

```bash
curl -X GET "http://localhost:3000/api/custom-clearance/download/project/1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  --output "custom-clearance.pdf"
```

**Example with JavaScript:**

```javascript
const axios = require("axios");
const fs = require("fs");

async function downloadLatestPZ(projectId, token) {
  const response = await axios.get(
    `http://localhost:3000/api/custom-clearance/download/project/${projectId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      responseType: "stream",
    }
  );

  const writer = fs.createWriteStream("custom-clearance.pdf");
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}
```

#### Get List of All Documents

**Request:**

```bash
GET /api/custom-clearance/download/project/1?latest=false
```

**Response:**

```json
{
  "status": "success",
  "message": "Custom clearance documents retrieved successfully",
  "data": {
    "status": "success",
    "count": 3,
    "documents": [
      {
        "id": 1,
        "guid": "550e8400-e29b-41d4-a716-446655440000",
        "filePath": "media/declaration/5/PZ-Project-2025-10-14T12-30-45.pdf",
        "fileName": "PZ-Project-2025-10-14T12-30-45.pdf",
        "downloadUrl": "/api/custom-clearance/download/1",
        "createdAt": "2025-10-14T12:30:45.000Z",
        "project": {
          "id": 1,
          "title": "Project Name",
          "status": "active"
        },
        "group": {
          "id": 1,
          "name": "Group Name",
          "logo": "logo.png"
        }
      }
      // ... more documents
    ]
  }
}
```

**Example with JavaScript:**

```javascript
async function getAllPZDocuments(projectId, token) {
  const response = await axios.get(
    `http://localhost:3000/api/custom-clearance/download/project/${projectId}?latest=false`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  console.log(`Found ${response.data.data.count} documents`);
  return response.data.data.documents;
}
```

---

### 2. Download by Document ID

Download a specific custom clearance document by its ID or GUID.

**Endpoint:** `GET /api/custom-clearance/download/:id`

**Authentication:** Required (JWT token)

**Parameters:**

- `id` (path parameter) - Document ID or GUID

**Request:**

```bash
GET /api/custom-clearance/download/1
GET /api/custom-clearance/download/550e8400-e29b-41d4-a716-446655440000
```

**Response:**

- File download (PDF)
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="PZ-Project_Name-2025-10-14T12-30-45.pdf"`

**Example with cURL:**

```bash
# Download by ID
curl -X GET "http://localhost:3000/api/custom-clearance/download/1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  --output "pz-document.pdf"

# Download by GUID
curl -X GET "http://localhost:3000/api/custom-clearance/download/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  --output "pz-document.pdf"
```

**Example with JavaScript:**

```javascript
async function downloadPZById(
  documentId,
  token,
  outputPath = "pz-document.pdf"
) {
  const response = await axios.get(
    `http://localhost:3000/api/custom-clearance/download/${documentId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      responseType: "stream",
    }
  );

  const writer = fs.createWriteStream(outputPath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", () => {
      console.log(`File downloaded: ${outputPath}`);
      resolve(outputPath);
    });
    writer.on("error", reject);
  });
}
```

---

## Usage Examples

### Scenario 1: Download Latest PZ for a Project

```bash
curl -X GET "http://localhost:3000/api/custom-clearance/download/project/1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -o "latest-pz.pdf"
```

### Scenario 2: Get List of All PZ Documents

```bash
curl -X GET "http://localhost:3000/api/custom-clearance/download/project/1?latest=false" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response shows all available documents with individual download URLs.

### Scenario 3: Download Specific Document

```bash
# From the list above, pick an ID and download
curl -X GET "http://localhost:3000/api/custom-clearance/download/1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -o "specific-pz.pdf"
```

---

## Frontend Integration

### React Example

```javascript
import axios from "axios";

// Download latest PZ document
const downloadLatestPZ = async (projectId) => {
  try {
    const response = await axios.get(
      `/api/custom-clearance/download/project/${projectId}`,
      {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        responseType: "blob",
      }
    );

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `PZ-Document-${projectId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error("Download failed:", error);
  }
};

// Get list of all PZ documents
const getAllPZDocuments = async (projectId) => {
  try {
    const response = await axios.get(
      `/api/custom-clearance/download/project/${projectId}?latest=false`,
      {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }
    );

    return response.data.data.documents;
  } catch (error) {
    console.error("Failed to get documents:", error);
  }
};

// Download specific document by ID
const downloadPZById = async (documentId) => {
  try {
    const response = await axios.get(
      `/api/custom-clearance/download/${documentId}`,
      {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        responseType: "blob",
      }
    );

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `PZ-Document-${documentId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error("Download failed:", error);
  }
};
```

### Vue.js Example

```javascript
// In your Vue component
methods: {
  async downloadLatestPZ(projectId) {
    try {
      const response = await this.$axios.get(
        `/api/custom-clearance/download/project/${projectId}`,
        {
          responseType: 'blob',
          headers: { 'Authorization': `Bearer ${this.$auth.token}` }
        }
      );

      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `PZ-Document-${projectId}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      this.$notify.error('Failed to download document');
    }
  },

  async fetchAllPZDocuments(projectId) {
    const response = await this.$axios.get(
      `/api/custom-clearance/download/project/${projectId}?latest=false`,
      {
        headers: { 'Authorization': `Bearer ${this.$auth.token}` }
      }
    );

    this.documents = response.data.data.documents;
  }
}
```

---

## Error Responses

### 400 - Bad Request

```json
{
  "status": "error",
  "message": "Project ID is required",
  "data": null
}
```

### 404 - Project Not Found

```json
{
  "status": "error",
  "message": "Project not found",
  "data": null
}
```

### 404 - No Documents Found

```json
{
  "status": "error",
  "message": "No custom clearance documents found for this project",
  "data": null
}
```

### 404 - File Not Found

```json
{
  "status": "error",
  "message": "File not found on server",
  "data": {
    "filePath": "media/declaration/5/PZ-Project-2025-10-14.pdf"
  }
}
```

### 500 - Server Error

```json
{
  "status": "error",
  "message": "Unable to download custom clearance documents",
  "data": {
    "error": "Error message details"
  }
}
```

---

## Postman Collection

### Download Latest PZ Document

1. **Method:** GET
2. **URL:** `http://localhost:3000/api/custom-clearance/download/project/1`
3. **Headers:**
   - `Authorization`: `Bearer YOUR_JWT_TOKEN`
4. **Send & Save Response** - Choose "Save to file"

### Get All PZ Documents List

1. **Method:** GET
2. **URL:** `http://localhost:3000/api/custom-clearance/download/project/1?latest=false`
3. **Headers:**
   - `Authorization`: `Bearer YOUR_JWT_TOKEN`

### Download Specific Document

1. **Method:** GET
2. **URL:** `http://localhost:3000/api/custom-clearance/download/1`
3. **Headers:**
   - `Authorization`: `Bearer YOUR_JWT_TOKEN`
4. **Send & Save Response** - Choose "Save to file"

---

## Security & Access Control

### Authentication

- ✅ JWT token required
- ✅ Token must be valid and not expired

### Authorization

- ✅ User must belong to the project's group (unless super admin)
- ✅ Super admins can download any document
- ✅ Regular users limited to their group's documents

### File Security

- ✅ File paths validated before serving
- ✅ File existence checked
- ✅ No directory traversal allowed
- ✅ Only PDF files served

---

## Workflow

### Complete Document Lifecycle

1. **Generate PZ Document**

   ```bash
   POST /api/custom-clearance/generate-pz
   Body: { "projectId": 1 }
   ```

2. **Get List of Documents** (optional)

   ```bash
   GET /api/custom-clearance/download/project/1?latest=false
   ```

3. **Download Document**

   ```bash
   # Download latest
   GET /api/custom-clearance/download/project/1

   # OR download specific
   GET /api/custom-clearance/download/123
   ```

---

## Use Cases

### Use Case 1: Quick Download

User wants the latest PZ document for a project:

```bash
GET /api/custom-clearance/download/project/1
→ Immediately downloads latest PDF
```

### Use Case 2: Browse and Select

User wants to see all available documents and choose:

```bash
# Step 1: Get list
GET /api/custom-clearance/download/project/1?latest=false
→ Returns list with IDs

# Step 2: Download selected
GET /api/custom-clearance/download/3
→ Downloads specific document
```

### Use Case 3: Archive All

User wants to download all PZ documents for archival:

```bash
# Get list
GET /api/custom-clearance/download/project/1?latest=false

# Download each using the returned IDs
GET /api/custom-clearance/download/1
GET /api/custom-clearance/download/2
GET /api/custom-clearance/download/3
```

---

## Implementation Details

### Controller Methods

#### `downloadByProject(req, res)`

**Features:**

- Fetches all custom clearance documents for a project
- Filters by user's group (unless super admin)
- Latest mode: Streams PDF file for download
- List mode: Returns metadata with download URLs
- Validates file existence before download

#### `downloadById(req, res)`

**Features:**

- Accepts ID or GUID
- Validates user access (group check)
- Streams PDF file for download
- Handles file not found errors
- Prevents download after headers sent

### File Streaming

Both methods use Node.js streams for efficient file delivery:

```javascript
const fileStream = fs.createReadStream(resolvedPath);
fileStream.pipe(res);
```

**Benefits:**

- ✅ Memory efficient (doesn't load entire file into memory)
- ✅ Faster response times
- ✅ Handles large files gracefully
- ✅ Automatic flow control

---

## Testing

### Test Download Endpoints

```bash
# Test 1: Download latest
curl -X GET "http://localhost:3000/api/custom-clearance/download/project/1" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o "test-latest.pdf"

# Test 2: Get list
curl -X GET "http://localhost:3000/api/custom-clearance/download/project/1?latest=false" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test 3: Download by ID
curl -X GET "http://localhost:3000/api/custom-clearance/download/1" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o "test-by-id.pdf"

# Test 4: Download by GUID
curl -X GET "http://localhost:3000/api/custom-clearance/download/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o "test-by-guid.pdf"
```

### Verify Downloads

```bash
# Check file size
ls -lh test-latest.pdf

# Open PDF
open test-latest.pdf  # Mac
start test-latest.pdf # Windows
xdg-open test-latest.pdf # Linux
```

---

## Complete API Flow Example

### Node.js Complete Example

```javascript
const axios = require("axios");
const fs = require("fs");

class PZDocumentAPI {
  constructor(baseURL, token) {
    this.client = axios.create({
      baseURL,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  // Generate PZ document
  async generatePZ(projectId) {
    const response = await this.client.post(
      "/api/custom-clearance/generate-pz",
      {
        projectId,
      }
    );
    return response.data;
  }

  // Get all PZ documents for a project
  async getAllPZDocuments(projectId) {
    const response = await this.client.get(
      `/api/custom-clearance/download/project/${projectId}?latest=false`
    );
    return response.data.data.documents;
  }

  // Download latest PZ document
  async downloadLatestPZ(projectId, outputPath) {
    const response = await this.client.get(
      `/api/custom-clearance/download/project/${projectId}`,
      { responseType: "stream" }
    );

    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", () => resolve(outputPath));
      writer.on("error", reject);
    });
  }

  // Download PZ document by ID
  async downloadPZById(documentId, outputPath) {
    const response = await this.client.get(
      `/api/custom-clearance/download/${documentId}`,
      { responseType: "stream" }
    );

    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", () => resolve(outputPath));
      writer.on("error", reject);
    });
  }
}

// Usage
const api = new PZDocumentAPI("http://localhost:3000", "your-jwt-token");

// Generate and download
async function generateAndDownload(projectId) {
  // Step 1: Generate
  const result = await api.generatePZ(projectId);
  console.log("Generated:", result.data.fileName);

  // Step 2: Download
  const downloadPath = await api.downloadLatestPZ(projectId, "./my-pz.pdf");
  console.log("Downloaded to:", downloadPath);
}

// Browse and download specific
async function browseAndDownload(projectId) {
  // Step 1: Get all documents
  const documents = await api.getAllPZDocuments(projectId);
  console.log(`Found ${documents.length} documents`);

  // Step 2: Download specific one
  if (documents.length > 0) {
    await api.downloadPZById(documents[0].id, "./selected-pz.pdf");
    console.log("Downloaded selected document");
  }
}
```

---

## Troubleshooting

### Issue: "No custom clearance documents found"

**Solution:**

- Generate a PZ document first: `POST /api/custom-clearance/generate-pz`
- Verify project ID is correct
- Check that documents exist for this project

### Issue: "File not found on server"

**Solution:**

- Check that the file path in database is correct
- Verify the file exists in `media/declaration/` directory
- Ensure file wasn't manually deleted

### Issue: "Document not found" (with valid ID)

**Solution:**

- Verify you have access to the project's group
- Check if you're using correct ID or GUID
- Super admins can access all documents

### Issue: Download corrupted or empty

**Solution:**

- Verify file on server is valid
- Check server logs for streaming errors
- Ensure sufficient disk space
- Try downloading again

---

## Performance Considerations

### File Streaming

- ✅ Uses Node.js streams (memory efficient)
- ✅ No file size limitations
- ✅ Handles large PDFs gracefully
- ✅ Non-blocking I/O

### Bandwidth

- Single document: Immediate download
- Multiple documents: List returned, then download individually
- Recommended: Download one at a time for stability

---

## Security Best Practices

### Server Side

1. **Validate paths** - Prevent directory traversal
2. **Check file existence** - Before attempting download
3. **Verify permissions** - User must have access
4. **Stream files** - Don't load entire file into memory
5. **Handle errors** - Check if headers already sent

### Client Side

1. **Validate response type** - Ensure it's a PDF
2. **Check file size** - Before saving locally
3. **Handle errors** - Show user-friendly messages
4. **Save securely** - Use appropriate file locations

---

## Route Summary

| Method | Endpoint                                                         | Description                              |
| ------ | ---------------------------------------------------------------- | ---------------------------------------- |
| GET    | `/api/custom-clearance/download/project/:projectId`              | Download latest PZ for project (default) |
| GET    | `/api/custom-clearance/download/project/:projectId?latest=false` | Get list of all PZ documents             |
| GET    | `/api/custom-clearance/download/:id`                             | Download specific PZ by ID/GUID          |

---

## Code Quality

- ✅ No linting errors
- ✅ Proper error handling
- ✅ Stream-based file delivery
- ✅ Authentication & authorization
- ✅ Comprehensive logging
- ✅ Consistent with codebase patterns

---

## Future Enhancements

Potential improvements:

- [ ] Bulk download as ZIP archive
- [ ] Download all project documents in one request
- [ ] PDF preview endpoint (inline display)
- [ ] Download history tracking
- [ ] Rate limiting for downloads
- [ ] CDN integration for faster delivery
- [ ] Thumbnail generation for previews

---

## Summary

Two new download endpoints provide flexible access to custom clearance documents:

✅ **Download Latest** - Quick access to most recent PZ document  
✅ **Download by ID** - Specific document download  
✅ **List All** - Browse available documents  
✅ **Secure** - Authentication and authorization enforced  
✅ **Efficient** - Stream-based delivery  
✅ **Flexible** - Supports ID or GUID

**Ready for immediate use!** 🚀

---

**Implementation Date:** October 14, 2025  
**Version:** 2.1.0  
**Status:** ✅ Complete and Ready

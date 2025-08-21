# AI Webhook API Documentation

## Overview
The AI Webhook API provides secure endpoints for AI systems to update file content and insights across various document types in the Estrella system. All endpoints are protected by a secure authentication token and automatically log activities under the AI Agent user.

## Authentication
All webhook endpoints require authentication using the AI Agent token. You can provide the token in one of these ways:

### Headers (Recommended)
```
X-AI-Token: your_secure_token_here
```

### Authorization Header
```
Authorization: Bearer your_secure_token_here
```

### Query Parameter
```
?token=your_secure_token_here
```

## Base URL
```
POST /api/ai-webhook/{endpoint}
```

## Endpoints

### 1. Update Invoice Content
**Endpoint:** `POST /ai-webhook/invoice/update`

**Description:** Updates invoice file content including translated file path, original file content, and translated file content.

**Request Body:**
```json
{
  "guid": "uuid-of-invoice",
  "translatedFilePath": "path/to/translated/file.pdf",
  "originalFileContent": "Original document content...",
  "translatedFileContent": "Translated document content..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Invoice content updated successfully",
  "data": {
    "guid": "uuid-of-invoice",
    "updatedFields": ["translatedFilePath", "originalFileContent", "translatedFileContent"]
  }
}
```

### 2. Bulk Update Invoices
**Endpoint:** `POST /ai-webhook/invoice/bulk-update`

**Description:** Updates multiple invoices in a single request.

**Request Body:**
```json
{
  "updates": [
    {
      "guid": "uuid-of-invoice-1",
      "translatedFilePath": "path/to/translated/file1.pdf",
      "originalFileContent": "Original content 1...",
      "translatedFileContent": "Translated content 1..."
    },
    {
      "guid": "uuid-of-invoice-2",
      "translatedFileContent": "Translated content 2..."
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk update completed. 2 successful, 0 failed.",
  "data": {
    "successful": [
      {
        "guid": "uuid-of-invoice-1",
        "success": true,
        "updatedFields": ["translatedFilePath", "originalFileContent", "translatedFileContent"]
      },
      {
        "guid": "uuid-of-invoice-2",
        "success": true,
        "updatedFields": ["translatedFileContent"]
      }
    ],
    "errors": []
  }
}
```

### 3. Update Courier Receipt Content
**Endpoint:** `POST /ai-webhook/courier-receipt/update`

**Description:** Updates courier receipt file content.

**Request Body:**
```json
{
  "guid": "uuid-of-courier-receipt",
  "fileContent": "Updated courier receipt content..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Courier receipt content updated successfully",
  "data": {
    "guid": "uuid-of-courier-receipt",
    "updatedFields": ["fileContent"]
  }
}
```

### 4. Update Custom Clearance Content
**Endpoint:** `POST /ai-webhook/custom-clearance/update`

**Description:** Updates custom clearance file content and insights.

**Request Body:**
```json
{
  "guid": "uuid-of-custom-clearance",
  "fileContent": "Updated custom clearance content...",
  "insights": "AI-generated insights about the document..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Custom clearance content updated successfully",
  "data": {
    "guid": "uuid-of-custom-clearance",
    "updatedFields": ["fileContent", "insights"]
  }
}
```

### 5. Update Custom Declaration Content
**Endpoint:** `POST /ai-webhook/custom-declaration/update`

**Description:** Updates custom declaration file content and insights.

**Request Body:**
```json
{
  "guid": "uuid-of-custom-declaration",
  "fileContent": "Updated custom declaration content...",
  "insights": "AI-generated insights about the document..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Custom declaration content updated successfully",
  "data": {
    "guid": "uuid-of-custom-declaration",
    "updatedFields": ["fileContent", "insights"]
  }
}
```

### 6. Health Check
**Endpoint:** `GET /ai-webhook/health`

**Description:** Health check endpoint to verify the AI webhook service is running.

**Response:**
```json
{
  "success": true,
  "message": "AI Webhook service is healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "aiAgent": {
    "email": "ai.agent@estrella.com",
    "firstName": "AI",
    "lastName": "Agent",
    "groupId": 1
  }
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Invoice GUID is required"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "AI authentication token is required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Invalid AI authentication token"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Invoice not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Error details..."
}
```

## Activity Logging
All webhook operations are automatically logged in the activity log with:
- **Action:** `AI_WEBHOOK_UPDATE` or `AI_WEBHOOK_BULK_UPDATE`
- **Created By:** `ai.agent@estrella.com`
- **Description:** Detailed description of what was updated
- **Project ID & Group ID:** From the updated document

## Security Features
1. **Token-based Authentication:** Secure token required for all requests
2. **Non-JWT Authentication:** Simple token validation for AI systems
3. **Automatic Logging:** All activities are tracked and attributed to AI Agent
4. **Input Validation:** Comprehensive validation of request data
5. **Error Handling:** Graceful error handling with detailed messages

## Usage Examples

### cURL Example
```bash
curl -X POST http://localhost:3000/api/ai-webhook/invoice/update \
  -H "Content-Type: application/json" \
  -H "X-AI-Token: your_secure_token_here" \
  -d '{
    "guid": "123e4567-e89b-12d3-a456-426614174000",
    "translatedFileContent": "Updated translated content..."
  }'
```

### Python Example
```python
import requests

url = "http://localhost:3000/api/ai-webhook/invoice/update"
headers = {
    "Content-Type": "application/json",
    "X-AI-Token": "your_secure_token_here"
}
data = {
    "guid": "123e4567-e89b-12d3-a456-426614174000",
    "translatedFileContent": "Updated translated content..."
}

response = requests.post(url, json=data, headers=headers)
print(response.json())
```

### JavaScript Example
```javascript
const response = await fetch('http://localhost:3000/api/ai-webhook/invoice/update', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-AI-Token': 'your_secure_token_here'
  },
  body: JSON.stringify({
    guid: '123e4567-e89b-12d3-a456-426614174000',
    translatedFileContent: 'Updated translated content...'
  })
});

const result = await response.json();
console.log(result);
```

## Notes
- All file content fields support large text content
- GUIDs are required for all update operations
- Partial updates are supported (only provide fields you want to update)
- Bulk operations provide detailed success/error reporting
- The service automatically handles database transactions and rollbacks

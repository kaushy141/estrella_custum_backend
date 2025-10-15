# API Documentation

This document outlines all the available API endpoints for the Estrella Custom Backend system.

## Base URL

```
http://localhost:3000/api
```

## Authentication

All endpoints require proper authentication unless specified otherwise.

## Response Format

All API responses follow this standard format:

```json
{
  "status": "success|error",
  "message": "Response message",
  "data": {},
  "count": 0,
  "currentPage": 1,
  "totalPages": 1
}
```

## Endpoints

### 1. Authentication

#### User Login

- **POST** `/auth/login`
- **Body:**
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```
- **Response:**
  ```json
  {
    "status": "success",
    "message": "Login successful",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": 1,
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "groupId": 1,
        "isActive": true,
        "group": {
          "id": 1,
          "name": "Company Name",
          "logo": "logo.png"
        }
      }
    }
  }
  ```

#### User Logout

- **POST** `/auth/logout`
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
  ```json
  {
    "status": "success",
    "message": "Logout successful"
  }
  ```

#### Verify Token

- **GET** `/auth/verify`
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
  ```json
  {
    "status": "success",
    "message": "Token verified successfully",
    "data": {
      "user": {
        /* user data */
      },
      "token": "current_token"
    }
  }
  ```

#### Refresh Token

- **POST** `/auth/refresh`
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
  ```json
  {
    "status": "success",
    "message": "Token refreshed successfully",
    "data": {
      "token": "new_token",
      "user": {
        /* user data */
      }
    }
  }
  ```

---

### 2. User Management

#### Create User

- **POST** `/user`
- **Body:**
  ```json
  {
    "groupId": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "password": "password123",
    "isActive": true
  }
  ```

#### Get All Users

- **GET** `/user?page=1&limit=10&groupId=1&isActive=true`
- **Query Parameters:**
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
  - `groupId`: Filter by group ID
  - `isActive`: Filter by active status

#### Get User by ID/GUID

- **GET** `/user/:id`
- **Parameters:**
  - `id`: User ID or GUID

#### Update User

- **PUT** `/user/:id`
- **Body:** Same as create user (all fields optional)

#### Delete User

- **DELETE** `/user/:id`

#### Get Users by Group

- **GET** `/user/group/:groupId?page=1&limit=10&isActive=true`

#### Search Users

- **GET** `/user/search?search=john&page=1&limit=10`

---

### 3. Group Management

#### Create Group

- **POST** `/group`
- **Body:**
  ```json
  {
    "name": "Company Name",
    "logo": "logo.png",
    "description": "Company description",
    "isActive": true
  }
  ```

#### Get All Groups

- **GET** `/group?page=1&limit=10&isActive=true`

#### Get Group by ID/GUID

- **GET** `/group/:id`

#### Update Group

- **PUT** `/group/:id`

#### Delete Group

- **DELETE** `/group/:id`

#### Deactivate Group

- **PATCH** `/group/:id/deactivate`

---

### 4. Project Management

#### Create Project

- **POST** `/project`
- **Body:**
  ```json
  {
    "groupId": 1,
    "title": "Project Title",
    "description": "Project description",
    "status": "active",
    "isActive": true
  }
  ```

#### Get All Projects

- **GET** `/project?page=1&limit=10&groupId=1&status=active&isActive=true`

#### Get Project by ID/GUID

- **GET** `/project/:id`

#### Update Project

- **PUT** `/project/:id`

#### Delete Project

- **DELETE** `/project/:id`

#### Get Projects by Group

- **GET** `/project/group/:groupId?page=1&limit=10&status=active&isActive=true`

---

### 5. Invoice Management

#### Create Invoice

- **POST** `/invoice`
- **Body:**
  ```json
  {
    "projectId": 1,
    "groupId": 1,
    "originalFilePath": "/path/to/original",
    "translatedFilePath": "/path/to/translated",
    "originalFileContent": "Original content",
    "translatedFileContent": "Translated content"
  }
  ```

#### Get All Invoices

- **GET** `/invoice?page=1&limit=10&projectId=1&groupId=1`

#### Get Invoice by ID/GUID

- **GET** `/invoice/:id`

#### Update Invoice

- **PUT** `/invoice/:id`

#### Delete Invoice

- **DELETE** `/invoice/:id`

#### Get Invoices by Project

- **GET** `/invoice/project/:projectId?page=1&limit=10`

#### Get Invoices by Group

- **GET** `/invoice/group/:groupId?page=1&limit=10`

#### Download Original Invoice File

- **GET** `/invoice/download/original/:id`
- **Headers:** `Authorization: Bearer <token>`
- **Parameters:**
  - `id`: Invoice ID or GUID
- **Response:** File stream (PDF, Excel, Word, Image, etc.)
- **Content-Disposition:** `attachment; filename="original_invoice.xlsx"`
- **Description:** Downloads the original invoice file. Supports multiple file formats (PDF, Excel, Word, images).

#### Download Translated Invoice File

- **GET** `/invoice/download/translated/:id`
- **Headers:** `Authorization: Bearer <token>`
- **Parameters:**
  - `id`: Invoice ID or GUID
- **Response:** File stream (PDF, Excel, Word, Image, etc.)
- **Content-Disposition:** `attachment; filename="translated_invoice.xlsx"`
- **Description:** Downloads the translated invoice file. Returns 404 if invoice hasn't been translated yet.

---

### 6. Shipping Service Management

#### Create Shipping Service

- **POST** `/shipping-service`
- **Body:**
  ```json
  {
    "name": "Service Name",
    "groupId": 1,
    "email": "service@example.com",
    "phone": "+1234567890",
    "isActive": true
  }
  ```

#### Get All Shipping Services

- **GET** `/shipping-service?page=1&limit=10&groupId=1&isActive=true`

#### Get Shipping Service by ID/GUID

- **GET** `/shipping-service/:id`

#### Update Shipping Service

- **PUT** `/shipping-service/:id`

#### Delete Shipping Service

- **DELETE** `/shipping-service/:id`

#### Get Shipping Services by Group

- **GET** `/shipping-service/group/:groupId?page=1&limit=10&isActive=true`

---

### 7. Custom Agent Management

#### Create Custom Agent

- **POST** `/custom-agent`
- **Body:**
  ```json
  {
    "name": "Agent Name",
    "groupId": 1,
    "email": "agent@example.com",
    "phone": "+1234567890",
    "isActive": true
  }
  ```

#### Get All Custom Agents

- **GET** `/custom-agent?page=1&limit=10&groupId=1&isActive=true`

#### Get Custom Agent by ID/GUID

- **GET** `/custom-agent/:id`

#### Update Custom Agent

- **PUT** `/custom-agent/:id`

#### Delete Custom Agent

- **DELETE** `/custom-agent/:id`

#### Get Custom Agents by Group

- **GET** `/custom-agent/group/:groupId?page=1&limit=10&isActive=true`

---

### 8. Custom Clearance Management

#### Create Custom Clearance

- **POST** `/custom-clearance`
- **Body:**
  ```json
  {
    "projectId": 1,
    "groupId": 1,
    "filePath": "/path/to/file",
    "fileContent": "File content",
    "insights": "Clearance insights"
  }
  ```

#### Get All Custom Clearances

- **GET** `/custom-clearance?page=1&limit=10&projectId=1&groupId=1`

#### Get Custom Clearance by ID/GUID

- **GET** `/custom-clearance/:id`

#### Update Custom Clearance

- **PUT** `/custom-clearance/:id`

#### Delete Custom Clearance

- **DELETE** `/custom-clearance/:id`

#### Get Custom Clearances by Project

- **GET** `/custom-clearance/project/:projectId?page=1&limit=10`

#### Get Custom Clearances by Group

- **GET** `/custom-clearance/group/:groupId?page=1&limit=10`

---

### 9. Custom Declaration Management

#### Create Custom Declaration (File Upload)

- **POST** `/custom-declaration`
- **Description:** Upload custom declaration file for analysis
- **Authentication:** Required
- **Content-Type:** `multipart/form-data`
- **Body:**
  ```json
  {
    "projectId": "project-guid",
    "groupId": "group-guid"
  }
  ```
- **Files:** Upload via `files[]` field (PDF, Excel, Word documents)
- **Response:**
  ```json
  {
    "status": "success",
    "message": "Custom declaration created successfully",
    "data": {
      "id": 1,
      "guid": "custom-declaration-guid",
      "fileName": "Custom_Declaration_2024.pdf",
      "originalFileName": "Custom_Declaration_2024.pdf",
      "filePath": "/path/to/file",
      "projectId": 1,
      "groupId": 1
    }
  }
  ```
- **Notes:**
  - The `fileName` field preserves the original uploaded filename
  - Supports various file formats (PDF, Word documents, text files, Excel spreadsheets)
  - Handles special characters in filenames
  - File is stored with a generated path but original name is preserved
  - **Comprehensive Analysis**: All file types are included in analysis:
    - **Supported Formats**: PDF, DOCX, TXT, CSV, HTML, JSON, XML are analyzed directly by OpenAI
    - **Invoice Content Data**: Uses `originalFileContent` and `translatedFileContent` fields from invoice records
    - **Cross-Reference**: Data from all file types and content sources is compared for comprehensive insights

#### Analyze Custom Declaration

- **POST** `/custom-declaration/analyze/:projectId`
- **Description:** Analyze the latest uploaded custom declaration with comprehensive invoice comparison
- **Authentication:** Required
- **Response:**
  ```json
  {
    "status": "success",
    "message": "Custom declaration analysis started successfully",
    "data": {
      "status": "processing",
      "projectId": 1,
      "customDeclarationId": 1,
      "threadId": "thread-123",
      "invoicesCount": 3,
      "message": "Comprehensive analysis is running in the background. This includes invoice comparison and mismatch detection. Check the custom declaration status for updates."
    }
  }
  ```

#### Analyze Custom Declaration by ID

- **POST** `/custom-declaration/analyze-by-id/:id`
- **Description:** Analyze a specific custom declaration by its ID or GUID with comprehensive invoice comparison
- **Authentication:** Required
- **Parameters:**
  - `id`: Custom declaration ID (integer) or GUID (string)
- **Response:**
  ```json
  {
    "status": "success",
    "message": "Custom declaration analysis started successfully",
    "data": {
      "status": "processing",
      "projectId": 1,
      "customDeclarationId": 1,
      "customDeclarationFileName": "declaration.pdf",
      "projectTitle": "Project Name",
      "threadId": "thread-123",
      "invoicesCount": 3,
      "message": "Comprehensive analysis is running in the background. This includes invoice comparison and mismatch detection. Check the custom declaration status for updates."
    }
  }
  ```
- **Notes:**
  - Can analyze any custom declaration by providing its ID or GUID
  - Automatically finds the associated project and invoices
  - Includes activity logging for audit purposes
  - Ensures user can only analyze custom declarations from their group

#### Get Custom Declaration Analysis Results

- **GET** `/custom-declaration/analysis/:projectId`
- **Description:** Retrieve comprehensive analysis results with detailed field comparisons
- **Authentication:** Required
- **Response:**
  ```json
  {
    "status": "success",
    "message": "Custom declaration analysis results retrieved successfully",
    "data": {
      "id": 1,
      "fileName": "declaration.pdf",
      "status": "completed",
      "insights": {
        "customDeclarationAnalysis": {
          "documentInfo": {
            "fileName": "declaration.pdf",
            "declarationNumber": "CD-2024-001",
            "shipper": "ABC Company Ltd",
            "shipperAddress": "123 Main St, City, Country",
            "consignee": "XYZ Corp",
            "consigneeAddress": "456 Business Ave, City, Country",
            "transportMethod": "Sea Freight",
            "containerNumber": "CONT-123456",
            "sealNumber": "SEAL-789"
          },
          "extractedData": {
            "totalItems": 5,
            "totalValue": "15000.00",
            "currency": "USD",
            "totalWeight": "2500.00",
            "grossWeight": "2600.00",
            "netWeight": "2400.00",
            "products": [...]
          }
        },
        "detailedFieldComparison": {
          "shipperInformation": {
            "matchStatus": "matched",
            "discrepancies": []
          },
          "consigneeInformation": {
            "matchStatus": "matched",
            "discrepancies": []
          },
          "weightComparison": {
            "matchStatus": "matched",
            "discrepancies": []
          },
          "itemCountComparison": {
            "matchStatus": "matched",
            "discrepancies": []
          },
          "valueComparison": {
            "matchStatus": "matched",
            "discrepancies": []
          }
        },
        "mismatchAnalysis": {
          "totalMismatches": 0,
          "criticalMismatches": 0,
          "mismatchSummary": {
            "shipperAddressMismatches": 0,
            "consigneeAddressMismatches": 0,
            "productDescriptionMismatches": 0,
            "quantityMismatches": 0,
            "weightMismatches": 0,
            "valueMismatches": 0,
            "hsCodeMismatches": 0,
            "originMismatches": 0,
            "shippingInfoMismatches": 0,
            "dateMismatches": 0
          }
        },
        "insights": {
          "fieldComparisonInsights": {
            "shipperAddressMatch": "matched",
            "consigneeAddressMatch": "matched",
            "weightAccuracy": "accurate",
            "itemCountAccuracy": "accurate",
            "valueAccuracy": "accurate",
            "overallDataIntegrity": "excellent"
          },
          "summary": "Custom declaration matches invoice data perfectly",
          "businessImpact": "No compliance risks identified",
          "nextSteps": "Proceed with customs clearance"
        }
      }
    }
  }
  ```

#### Get All Custom Declarations

- **GET** `/custom-declaration?page=1&limit=10&projectId=1&groupId=1`

#### Get Custom Declaration by ID/GUID

- **GET** `/custom-declaration/:id`

#### Update Custom Declaration

- **PUT** `/custom-declaration/:id`

#### Delete Custom Declaration

- **DELETE** `/custom-declaration/:id`

#### Get Custom Declarations by Project

- **GET** `/custom-declaration/project/:projectId?page=1&limit=10`

#### Get Custom Declarations by Group

- **GET** `/custom-declaration/group/:groupId?page=1&limit=10`

---

### 10. Courier Receipt Management

#### Create Courier Receipt

- **POST** `/courier-receipt`
- **Body:**
  ```json
  {
    "projectId": 1,
    "groupId": 1,
    "filePath": "/path/to/file",
    "fileContent": "File content"
  }
  ```

#### Get All Courier Receipts

- **GET** `/courier-receipt?page=1&limit=10&projectId=1&groupId=1`

#### Get Courier Receipt by ID/GUID

- **GET** `/courier-receipt/:id`

#### Update Courier Receipt

- **PUT** `/courier-receipt/:id`

#### Delete Courier Receipt

- **DELETE** `/courier-receipt/:id`

#### Get Courier Receipts by Project

- **GET** `/courier-receipt/project/:projectId?page=1&limit=10`

#### Get Courier Receipts by Group

- **GET** `/courier-receipt/group/:groupId?page=1&limit=10`

#### Analyze Courier Receipt

- **POST** `/courier-receipt/analyze/:projectId`
- **Description:** Analyze the latest uploaded courier receipt document with comprehensive invoice comparison
- **Parameters:**
  - `projectId` (path): Project GUID
- **Response:**
  ```json
  {
    "status": "success",
    "data": {
      "status": "processing",
      "projectId": "a20f4fd1-1dc5-4a3b-8a30-925d45fdd344",
      "threadId": "thread_abc123",
      "invoicesCount": 5,
      "message": "Comprehensive courier receipt analysis started successfully"
    }
  }
  ```
- **Notes:**
  - **Comprehensive Analysis**: Uses extracted content data from all sources:
    - **Courier Receipt Content**: Uses `fileContent` field for shipping information
    - **Invoice Content Data**: Uses `originalFileContent` and `translatedFileContent` fields
    - **Supported Files**: PDF, DOCX, TXT files analyzed directly by OpenAI
    - **Cross-Reference**: Compares shipping details with invoice data for accuracy
  - Analyzes courier receipt against ALL available invoice files and content data
  - Uses OpenAI Assistant for comprehensive document analysis
  - Results include shipping information, delivery details, and data consistency checks
  - Analysis runs in background with comprehensive insights

---

### 11. Group Address Management

#### Create Group Address

- **POST** `/group-address`
- **Body:**
  ```json
  {
    "groupId": 1,
    "address": "123 Main St",
    "city": "City Name",
    "state": "State",
    "zip": "12345",
    "country": "Country",
    "contactName": "Contact Person",
    "contactPhone": "+1234567890",
    "contactEmail": "contact@example.com",
    "latitude": "40.7128",
    "longitude": "-74.0060",
    "isActive": true
  }
  ```

#### Get All Group Addresses

- **GET** `/group-address?page=1&limit=10&groupId=1&isActive=true`

#### Get Group Address by ID/GUID

- **GET** `/group-address/:id`

#### Update Group Address

- **PUT** `/group-address/:id`

#### Delete Group Address

- **DELETE** `/group-address/:id`

#### Get Group Addresses by Group

- **GET** `/group-address/group/:groupId?page=1&limit=10&isActive=true`

#### Search Group Addresses by Location

- **GET** `/group-address/search/location?city=City&state=State&country=Country&page=1&limit=10`

---

### 12. Activity Log Management

#### Create Activity Log

- **POST** `/activity-log`
- **Body:**
  ```json
  {
    "projectId": 1,
    "groupId": 1,
    "action": "USER_LOGIN",
    "description": "User logged in successfully",
    "createdBy": "john@example.com"
  }
  ```

#### Get All Activity Logs

- **GET** `/activity-log?page=1&limit=10&projectId=1&groupId=1&action=USER_LOGIN&createdBy=john@example.com`

#### Get Activity Log by ID/GUID

- **GET** `/activity-log/:id`

#### Update Activity Log

- **PUT** `/activity-log/:id`

#### Delete Activity Log

- **DELETE** `/activity-log/:id`

#### Get Activity Logs by Project

- **GET** `/activity-log/project/:projectId?page=1&limit=10&action=USER_LOGIN&createdBy=john@example.com`

#### Get Activity Logs by Group

- **GET** `/activity-log/group/:groupId?page=1&limit=10&action=USER_LOGIN&createdBy=john@example.com`

#### Search Activity Logs

- **GET** `/activity-log/search?search=login&page=1&limit=10`

---

## Insight Endpoints

### Send Shipment Label Insights

- **POST** `/insight/send-shipment-label-insights`
- **Description:** Send shipment label insights collected from project courier receipts to custom officers and/or shipping agents
- **Authentication:** Required
- **Body Options:**

  **Option 1: Send to specific custom agent**

  ```json
  {
    "projectId": "a20f4fd1-1dc5-4a3b-8a30-925d45fdd344",
    "customAgentId": 1
  }
  ```

  **Option 2: Send to specific courier/shipping service**

  ```json
  {
    "projectId": "a20f4fd1-1dc5-4a3b-8a30-925d45fdd344",
    "courierId": 1
  }
  ```

  **Option 3: Send to all users (explicit)**

  ```json
  {
    "projectId": "a20f4fd1-1dc5-4a3b-8a30-925d45fdd344",
    "type": "both"
  }
  ```

  **Option 4: Send to all users (default)**

  ```json
  {
    "projectId": "a20f4fd1-1dc5-4a3b-8a30-925d45fdd344"
  }
  ```

- **Response:**
  ```json
  {
    "status": "success",
    "message": "Shipment label insights email sent successfully to 1 recipients",
    "data": {
      "projectId": 1,
      "projectTitle": "Sample Project",
      "recipientType": "custom",
      "recipientsCount": 1,
      "shipmentDocumentCount": 2,
      "recipients": [
        {
          "email": "agent@example.com",
          "type": "Custom Agent"
        }
      ]
    }
  }
  ```
- **Request Body Rules:**
  - `projectId` is always required (can be ID or GUID)
  - Provide `customAgentId` to send to a specific custom agent
  - Provide `courierId` to send to a specific shipping service
  - Provide `type: "both"` to explicitly send to all users
  - Cannot provide both `customAgentId` and `courierId` in the same request
  - If no specific ID is provided, defaults to sending to all active users
- **Notes:**
  - Collects insights from courier receipts (shipment documents) associated with the project
  - Auto-detects recipient type based on provided parameters
  - Insights include tracking information, delivery status, and recommendations
  - Subject line is auto-generated

### Send Custom Declaration Insights

- **POST** `/insight/send-custom-declaration-insights`
- **Description:** Send comprehensive custom declaration insights with detailed field comparisons to custom officers and shipping agents
- **Authentication:** Required
- **Body Options:**

  **Send to specific custom agent:**

  ```json
  {
    "projectId": "project-guid",
    "customAgentId": 1
  }
  ```

  **Send to specific shipping service:**

  ```json
  {
    "projectId": "project-guid",
    "courierId": 1
  }
  ```

  **Send to all users:**

  ```json
  {
    "projectId": "project-guid",
    "type": "both"
  }
  ```

- **Response:**

  ```json
  {
    "status": "success",
    "message": "Custom declaration insights email sent successfully to 3 recipients",
    "data": {
      "projectId": 1,
      "projectTitle": "Project Name",
      "recipientType": "custom",
      "recipientsCount": 3,
      "customDeclarationCount": 1,
      "recipients": [
        {
          "email": "agent@example.com",
          "type": "Custom Agent"
        }
      ]
    }
  }
  ```

- **Notes:**
  - Insights include detailed field comparisons (shipper address, consignee address, weights, item counts, values)
  - Mismatch analysis with severity levels (low, medium, high, critical)
  - Compliance assessment and risk evaluation
  - Specific recommendations for resolving discrepancies

### Send Project Insights

- **POST** `/insight/send-project-insights`
- **Description:** Send project insights to active custom agents
- **Authentication:** Required
- **Body:**
  ```json
  {
    "projectId": 1,
    "subject": "Project Insights Report" // Optional
  }
  ```

### Send Combined Insights

- **POST** `/insight/send-combined-insights`
- **Description:** Send combined insights (invoice + custom declaration) to all relevant recipients
- **Authentication:** Required
- **Body:**
  ```json
  {
    "projectId": 1,
    "invoiceSubject": "Invoice Report", // Optional
    "customDeclarationSubject": "Declaration Report" // Optional
  }
  ```

## Common Query Parameters

### Pagination

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

### Filtering

- `groupId`: Filter by group ID
- `projectId`: Filter by project ID
- `isActive`: Filter by active status (true/false)
- `status`: Filter by status (for projects)

### Search

- `search`: Search term for text-based searches

## Error Codes

- `200`: Success
- `400`: Bad Request
- `401`: Unauthorized
- `404`: Not Found
- `500`: Internal Server Error

## Notes

1. **Authentication**: Most endpoints require JWT authentication via `Authorization: Bearer <token>` header
2. **Token Management**: JWT tokens expire in 24 hours and can be refreshed using `/auth/refresh`
3. **Activity Logging**: All user actions (login, logout, CRUD operations) are automatically logged
4. **Password Security**: Passwords are hashed using SHA-256 before storage
5. **ID Support**: All endpoints support both ID and GUID for identification
6. **Pagination**: Pagination is implemented across all list endpoints with `page` and `limit` parameters
7. **Validation**: Foreign key relationships are validated before creation/updates
8. **Soft Delete**: Soft delete is implemented for some entities (e.g., groups) using `isActive` flag
9. **File Storage**: File paths and content are stored as strings/text fields
10. **Timestamps**: All timestamps (createdAt, updatedAt) are automatically managed by Sequelize

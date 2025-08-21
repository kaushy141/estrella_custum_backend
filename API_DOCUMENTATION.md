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

### 1. User Management

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

### 2. Group Management

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

### 3. Project Management

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

### 4. Invoice Management

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

---

### 5. Shipping Service Management

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

### 6. Custom Agent Management

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

### 7. Custom Clearance Management

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

### 8. Custom Declaration Management

#### Create Custom Declaration
- **POST** `/custom-declaration`
- **Body:**
  ```json
  {
    "projectId": 1,
    "groupId": 1,
    "filePath": "/path/to/file",
    "fileContent": "File content",
    "insights": "Declaration insights"
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

### 9. Courier Receipt Management

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

---

### 10. Group Address Management

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

1. All endpoints support both ID and GUID for identification
2. Pagination is implemented across all list endpoints
3. Foreign key relationships are validated before creation/updates
4. Soft delete is implemented for some entities (e.g., groups)
5. Password hashing is automatically handled for user operations
6. File paths and content are stored as strings/text fields
7. All timestamps (createdAt, updatedAt) are automatically managed by Sequelize

# User Service Endpoints Summary

## Overview
This document summarizes all the user-related endpoints that have been implemented in the Estrella Custom Backend API to support the UserService class.

## 🔐 Authentication Required Endpoints

### 1. Get User Profile
- **Endpoint**: `GET /user/profile`
- **Authentication**: Required (JWT Bearer Token)
- **Description**: Retrieves the profile of the currently authenticated user
- **Response**: User object with group information (password excluded)

### 2. Update User Profile
- **Endpoint**: `PUT /user/profile`
- **Authentication**: Required (JWT Bearer Token)
- **Description**: Updates the profile of the currently authenticated user
- **Allowed Fields**: `firstName`, `lastName`, `email`, `groupId`
- **Request Body**:
  ```json
  {
    "firstName": "Updated Name",
    "lastName": "Updated Last Name",
    "email": "updated@example.com"
  }
  ```
- **Response**: Updated user object

### 3. Change Password
- **Endpoint**: `PUT /user/change-password`
- **Authentication**: Required (JWT Bearer Token)
- **Description**: Changes the password for the currently authenticated user
- **Request Body**:
  ```json
  {
    "currentPassword": "oldpassword123",
    "newPassword": "newpassword123"
  }
  ```
- **Response**: Success message

## 🔓 Public Endpoints (No Authentication Required)

### 4. Create User
- **Endpoint**: `POST /user`
- **Authentication**: None
- **Description**: Creates a new user
- **Request Body**:
  ```json
  {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "password": "password123",
    "groupId": 1,
    "isAdmin": false
  }
  ```
- **Response**: Created user object

### 5. Get All Users
- **Endpoint**: `GET /user`
- **Authentication**: None
- **Description**: Retrieves all users with pagination and filtering
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
  - `groupId`: Filter by group ID
  - `isActive`: Filter by active status
- **Response**: Paginated list of users with group information

### 6. Get User by ID
- **Endpoint**: `GET /user/:id`
- **Authentication**: None
- **Description**: Retrieves a user by ID or GUID
- **Parameters**: `id` - User ID or GUID
- **Response**: User object with group information

### 7. Update User
- **Endpoint**: `PUT /user/:id`
- **Authentication**: None
- **Description**: Updates an existing user
- **Parameters**: `id` - User ID or GUID
- **Request Body**: User fields to update
- **Response**: Updated user object

### 8. Delete User
- **Endpoint**: `DELETE /user/:id`
- **Authentication**: None
- **Description**: Deletes a user
- **Parameters**: `id` - User ID or GUID
- **Response**: Success message

### 9. Get Users by Group
- **Endpoint**: `GET /user/group/:groupId`
- **Authentication**: None
- **Description**: Retrieves all users belonging to a specific group
- **Parameters**: `groupId` - Group ID
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
  - `isActive`: Filter by active status
- **Response**: Paginated list of users

### 10. Search Users
- **Endpoint**: `GET /user/search`
- **Authentication**: None
- **Description**: Searches users by email, firstName, or lastName
- **Query Parameters**:
  - `search`: Search term
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
- **Response**: Paginated list of matching users

## 🔧 Implementation Details

### Authentication Middleware
- Profile endpoints use `authenticateToken` middleware
- JWT tokens are verified and user ID is extracted
- User must be active to access protected endpoints

### Password Security
- Passwords are hashed using SHA-256 before storage
- Password verification is done by comparing hashes
- Password field is excluded from all responses

### Group Validation
- All user operations validate group existence
- Users must belong to a valid group
- Group information is included in user responses

### Activity Logging
- User creation is logged for audit purposes
- Uses the activity helper system
- Logs are attributed to the creating user

## 📝 Usage Examples

### Frontend Service Integration
```javascript
import api from './api';

class UserService {
  // Get current user profile
  async getUserProfile() {
    return api.get('/user/profile');
  }

  // Update profile
  async updateUserProfile(userData) {
    return api.put('/user/profile', userData);
  }

  // Change password
  async changePassword(currentPassword, newPassword) {
    return api.put('/user/change-password', {
      currentPassword,
      newPassword,
    });
  }
}
```

### Testing
A comprehensive test script (`test-user-endpoints.js`) is provided to verify all endpoints work correctly.

## 🚀 Next Steps

1. **Role-based Access Control**: Implement role-based permissions for admin operations
2. **User Sessions**: Add session management for better security
3. **Password Policies**: Implement password strength requirements
4. **Email Verification**: Add email verification for new users
5. **Rate Limiting**: Add rate limiting for authentication endpoints

## 📚 Related Files

- **Router**: `routers/user.js`
- **Controller**: `controller/user.js`
- **Middleware**: `middleware/auth.js`
- **Models**: `models/user-model.js`, `models/group-model.js`
- **Helpers**: `helper/commonResponseHandler.js`, `helper/statusCode.js`
- **Test Script**: `test-user-endpoints.js`
- **Postman Collection**: `Estrella_API_Collection.json`

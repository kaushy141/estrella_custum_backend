# Estrella Custom Backend API - Frontend Integration Guide

## 🚀 Quick Start

### Base URL
```
Development: http://localhost:3000/api/v1
Production: https://your-production-domain.com/api/v1
```

### Authentication
All protected endpoints require JWT Bearer token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## 📋 Core Endpoints Summary

### 🔐 Authentication
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/login` | User login | ❌ |
| POST | `/auth/logout` | User logout | ✅ |
| GET | `/auth/verify` | Verify token | ✅ |
| POST | `/auth/refresh` | Refresh token | ✅ |

### 👥 Users
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/user` | Create user | ❌ |
| GET | `/user` | Get all users | ❌ |
| GET | `/user/{id}` | Get user by ID | ❌ |
| PUT | `/user/{id}` | Update user | ❌ |
| DELETE | `/user/{id}` | Delete user | ❌ |
| GET | `/user/profile` | Get current user profile | ✅ |
| PUT | `/user/profile` | Update current user profile | ✅ |
| PUT | `/user/change-password` | Change password | ✅ |

### 🏢 Groups
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/group` | Create group |
| GET | `/group` | Get all groups |
| GET | `/group/{id}` | Get group by ID |
| PUT | `/group/{id}` | Update group |
| DELETE | `/group/{id}` | Delete group |
| PATCH | `/group/{id}/deactivate` | Deactivate group |

### 📁 Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/project` | Create project |
| GET | `/project` | Get all projects |
| GET | `/project/{id}` | Get project by ID |
| PUT | `/project/{id}` | Update project |
| DELETE | `/project/{id}` | Delete project |
| GET | `/project/group/{groupId}` | Get projects by group |

### 📄 Invoices (with File Upload)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/invoice` | Create invoice (supports file upload) |
| GET | `/invoice` | Get all invoices |
| GET | `/invoice/{id}` | Get invoice by ID |
| PUT | `/invoice/{id}` | Update invoice |
| DELETE | `/invoice/{id}` | Delete invoice |
| GET | `/invoice/project/{projectId}` | Get invoices by project |
| GET | `/invoice/group/{groupId}` | Get invoices by group |

### 🚚 Shipping Services
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/shipping-service` | Create shipping service |
| GET | `/shipping-service` | Get all shipping services |
| GET | `/shipping-service/{id}` | Get shipping service by ID |
| PUT | `/shipping-service/{id}` | Update shipping service |
| DELETE | `/shipping-service/{id}` | Delete shipping service |

### 🏛️ Custom Clearance
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/custom-clearance` | Create custom clearance |
| GET | `/custom-clearance` | Get all custom clearances |
| GET | `/custom-clearance/{id}` | Get custom clearance by ID |
| PUT | `/custom-clearance/{id}` | Update custom clearance |
| DELETE | `/custom-clearance/{id}` | Delete custom clearance |
| GET | `/custom-clearance/project/{projectId}` | Get by project |
| GET | `/custom-clearance/group/{groupId}` | Get by group |

### 📋 Custom Declaration (with File Upload)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/custom-declaration` | Create custom declaration (supports file upload) |
| GET | `/custom-declaration` | Get all custom declarations |
| GET | `/custom-declaration/{id}` | Get custom declaration by ID |
| PUT | `/custom-declaration/{id}` | Update custom declaration |
| DELETE | `/custom-declaration/{id}` | Delete custom declaration |

### 📦 Courier Receipt (with File Upload)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/courier-receipt` | Create courier receipt (supports file upload) |
| GET | `/courier-receipt` | Get all courier receipts |
| GET | `/courier-receipt/{id}` | Get courier receipt by ID |
| PUT | `/courier-receipt/{id}` | Update courier receipt |
| DELETE | `/courier-receipt/{id}` | Delete courier receipt |

### 📍 Group Addresses
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/group-address` | Create group address |
| GET | `/group-address` | Get all group addresses |
| GET | `/group-address/{id}` | Get group address by ID |
| PUT | `/group-address/{id}` | Update group address |
| DELETE | `/group-address/{id}` | Delete group address |
| GET | `/group-address/search/location` | Search by location |

### 📊 Activity Logs
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/activity-log` | Create activity log |
| GET | `/activity-log` | Get all activity logs |
| GET | `/activity-log/{id}` | Get activity log by ID |
| PUT | `/activity-log/{id}` | Update activity log |
| DELETE | `/activity-log/{id}` | Delete activity log |
| GET | `/activity-log/search` | Search activity logs |

### 🤖 AI Webhook (Special Authentication Required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/ai-webhook/health` | AI webhook health check |
| POST | `/ai-webhook/invoice/update` | Update invoice content |
| POST | `/ai-webhook/invoice/bulk-update` | Bulk update invoices |
| POST | `/ai-webhook/courier-receipt/update` | Update courier receipt |
| POST | `/ai-webhook/custom-clearance/update` | Update custom clearance |
| POST | `/ai-webhook/custom-declaration/update` | Update custom declaration |

## 💡 Frontend Integration Examples

### JavaScript/Fetch API

#### Login Example
```javascript
const login = async (email, password) => {
  try {
    const response = await fetch('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    if (data.data && data.data.token) {
      localStorage.setItem('jwt_token', data.data.token);
      return data.data;
    }
  } catch (error) {
    console.error('Login error:', error);
  }
};
```

#### Authenticated Request Example
```javascript
const getProfile = async () => {
  const token = localStorage.getItem('jwt_token');
  try {
    const response = await fetch('http://localhost:3000/api/v1/user/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    return await response.json();
  } catch (error) {
    console.error('Profile fetch error:', error);
  }
};
```

#### File Upload Example (Invoice)
```javascript
const createInvoice = async (formData) => {
  const token = localStorage.getItem('jwt_token');
  try {
    const response = await fetch('http://localhost:3000/api/v1/invoice', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData, // FormData object with files
    });
    
    return await response.json();
  } catch (error) {
    console.error('Invoice creation error:', error);
  }
};
```

### React/Axios Example

#### Setup Axios Interceptor
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

#### React Hook Example
```javascript
import { useState, useEffect } from 'react';
import api from './api';

const useUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get('/user');
        setUsers(response.data.data);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return { users, loading };
};
```

## 🔧 Common Query Parameters

### Pagination
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

### Filtering
- `groupId`: Filter by group ID
- `projectId`: Filter by project ID
- `isActive`: Filter by active status

### Search
- `q`: Search query string

## 📝 Response Format

### Success Response
```json
{
  "status": "success",
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  }
}
```

### Error Response
```json
{
  "status": "error",
  "message": "Error description",
  "error": {
    // Error details
  }
}
```

## 🔒 Security Notes

1. **JWT Token**: Store securely (consider httpOnly cookies for production)
2. **Token Expiry**: Tokens expire in 24 hours - use refresh endpoint
3. **CORS**: Configure CORS settings for your frontend domain
4. **File Uploads**: Maximum 10 files per request
5. **AI Webhook**: Requires special authentication token

## 📚 Additional Resources

- **OpenAPI Documentation**: `api-documentation.yaml`
- **Postman Collection**: `Estrella_API_Collection_v2.json`
- **Environment Variables**: Check `env.template` for required configs

## 🐛 Troubleshooting

### Common Issues
1. **401 Unauthorized**: Check if JWT token is valid and not expired
2. **CORS Error**: Ensure your frontend domain is in CORS whitelist
3. **File Upload Fails**: Check file size limits and supported formats
4. **Database Connection**: Verify database configuration in environment variables

### Health Check
Always test connectivity with: `GET /health`

---

**Need help?** Check the full OpenAPI documentation or import the Postman collection for detailed examples.

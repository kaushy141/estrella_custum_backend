# Estrella Custom Backend

A comprehensive Node.js backend API built with Express.js and Sequelize ORM, featuring full CRUD operations for all models and comprehensive activity logging.

## Features

- 🔐 **JWT Authentication** - Secure login/logout with token management
- 🆔 **Session Management** - User ID stored in session for activity logging
- 📝 **Full CRUD Operations** - Complete Create, Read, Update, Delete for all models
- 📊 **Activity Logging** - Automatic logging of all user actions using session userId
- 🔒 **Role-based Access Control** - Middleware for protecting routes
- 📄 **Pagination** - Built-in pagination for all list endpoints
- 🔍 **Advanced Search** - Search functionality across multiple fields
- 🗄️ **Database Relationships** - Proper foreign key validation and associations
- 🚀 **RESTful API** - Clean, consistent API design

## Models

- **User** - User management with password hashing
- **Group** - Organization/company management
- **Project** - Project tracking and management
- **Invoice** - Invoice management
- **Shipping Service** - Shipping service management
- **Custom Agent** - Custom agent management
- **Custom Clearance** - Customs clearance management
- **Custom Declaration** - Customs declaration management
- **Courier Receipt** - Courier receipt management
- **Group Address** - Address management for groups
- **Activity Log** - Comprehensive activity tracking

## API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `GET /auth/verify` - Verify token
- `POST /auth/refresh` - Refresh token

### User Management
- `POST /user` - Create user
- `GET /user` - Get all users (with pagination)
- `GET /user/:id` - Get user by ID/GUID
- `PUT /user/:id` - Update user
- `DELETE /user/:id` - Delete user
- `GET /user/group/:groupId` - Get users by group
- `GET /user/search` - Search users

### Group Management
- `POST /group` - Create group
- `GET /group` - Get all groups (with pagination)
- `GET /group/:id` - Get group by ID/GUID
- `PUT /group/:id` - Update group
- `DELETE /group/:id` - Delete group
- `PATCH /group/:id/deactivate` - Deactivate group (soft delete)

### Project Management
- `POST /project` - Create project
- `GET /project` - Get all projects (with pagination)
- `GET /project/:id` - Get project by ID/GUID
- `PUT /project/:id` - Update project
- `DELETE /project/:id` - Delete project
- `GET /project/group/:groupId` - Get projects by group

### And many more endpoints for all models...

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd estrella_custom_backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=estrella_db
   DB_USER=your_username
   DB_PASSWORD=your_password
   
   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key
   
   # Session Configuration
   SESSION_SECRET=your-super-secret-session-key
   
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
   ```

4. **Database Setup**
   - Ensure PostgreSQL is running
   - Create the database: `CREATE DATABASE estrella_db;`
   - Run migrations (if any) or let Sequelize sync the models

5. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## Usage

### Authentication Flow

1. **Login** (creates session with userId)
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "user@example.com",
       "password": "password123"
     }'
   ```

2. **Use the returned token or session**
   ```bash
   # With JWT token
   curl -X GET http://localhost:3000/api/user \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   
   # With session (cookies automatically sent)
   curl -X GET http://localhost:3000/api/user \
     -b cookies.txt
   ```

### Creating Records

```bash
# Create a group
curl -X POST http://localhost:3000/api/group \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "My Company",
    "description": "Company description",
    "logo": "logo.png"
  }'
```

### Pagination and Filtering

```bash
# Get users with pagination and filtering
GET /api/user?page=1&limit=10&groupId=1&isActive=true
```

## Middleware

### Authentication Middleware

```javascript
const { authenticateToken, authenticateSession } = require('./middleware/auth');

// Protect a route with JWT token
router.get('/protected', authenticateToken, (req, res) => {
  // req.user contains the authenticated user
  // req.userId contains the user ID
  res.json({ user: req.user });
});

// Protect a route with session
router.get('/session-protected', authenticateSession, (req, res) => {
  // req.user contains the authenticated user
  // req.userId contains the user ID from session
  res.json({ user: req.user });
});
```

### Role-based Authorization

```javascript
const { requireRole, requireGroup } = require('./middleware/auth');

// Require specific role
router.post('/admin-only', requireRole('admin'), adminController.create);

// Require specific group
router.get('/group-data/:groupId', requireGroup(req.params.groupId), groupController.getData);
```

## Activity Logging

All user actions are automatically logged using the `activityHelper`:

- User login/logout
- CRUD operations on all models
- Custom actions and events

Activity logs include:
- Project ID and Group ID
- Action performed
- Description
- User ID who performed the action (from session or JWT)
- Timestamp

**Note**: The system automatically uses `req.userId` from the session or JWT token for activity logging, ensuring accurate tracking of who performed each action.

## Error Handling

The API uses consistent error handling with:
- HTTP status codes
- Descriptive error messages
- Error logging
- Graceful fallbacks

## Security Features

- Password hashing with SHA-256
- JWT token authentication
- CORS protection
- Input validation
- SQL injection prevention (Sequelize ORM)

## Development

### Project Structure
```
├── controller/          # Business logic controllers
├── models/             # Sequelize models
├── routers/            # Express route definitions
├── middleware/         # Custom middleware
├── helper/             # Utility functions
├── config/             # Configuration files
└── server.js           # Main application file
```

### Adding New Models

1. Create the model in `models/`
2. Create the controller in `controller/`
3. Create the router in `routers/`
4. Add routes to `routers/index-router.js`
5. Update API documentation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support and questions, please contact the development team or create an issue in the repository.

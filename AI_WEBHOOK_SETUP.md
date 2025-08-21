# AI Webhook System Setup Guide

## Prerequisites
- Node.js and npm installed
- Database connection configured
- bcrypt package installed (`npm install bcrypt`)

## Quick Setup

### 1. Install Dependencies
```bash
npm install bcrypt
```

### 2. Environment Configuration
Create or update your `.env` file with:
```env
# AI Agent Configuration
AI_AGENT_AUTH_TOKEN=your_secure_ai_token_here

# Other existing configurations...
```

**Note:** If you don't set `AI_AGENT_AUTH_TOKEN`, a default token will be used.

### 3. Run Setup Script
```bash
node scripts/setup-ai-webhook.js
```

This will:
- Create the AI Agent user in your database
- Create a default group if needed
- Display all configuration information
- Show available endpoints

### 4. Restart Your Server
After setup, restart your Node.js server to load the new routes.

## Manual Setup (Alternative)

If you prefer to set up manually:

### 1. Create AI Agent User
```bash
node scripts/create-ai-agent.js
```

### 2. Add Routes to Main Router
The AI webhook routes are already added to `routers/index-router.js`.

### 3. Verify Configuration
Check that all files are in place:
- `middleware/ai-webhook-auth.js`
- `controller/ai-webhook.js`
- `routers/ai-webhook.js`
- `config/constants.js`

## Testing

### 1. Health Check
```bash
curl -H "X-AI-Token: your_secure_ai_token_here" \
     http://localhost:3000/api/ai-webhook/health
```

### 2. Test Invoice Update
```bash
curl -X POST \
     -H "Content-Type: application/json" \
     -H "X-AI-Token: your_secure_ai_token_here" \
     -d '{"guid":"test-guid","translatedFileContent":"test content"}' \
     http://localhost:3000/api/ai-webhook/invoice/update
```

## Security Considerations

1. **Keep Token Secure**: Don't commit your auth token to version control
2. **Use HTTPS**: In production, always use HTTPS for webhook endpoints
3. **Rate Limiting**: Consider implementing rate limiting for production use
4. **Token Rotation**: Regularly rotate your AI Agent auth token
5. **Access Logs**: Monitor webhook access logs for suspicious activity

## Troubleshooting

### Common Issues

1. **"AI Agent user not found"**
   - Run the setup script again
   - Check database connection

2. **"Invalid AI authentication token"**
   - Verify your token in the .env file
   - Check that the token matches exactly

3. **"Route not found"**
   - Ensure the AI webhook router is added to main router
   - Restart your server after adding routes

4. **Database errors**
   - Check database connection
   - Verify all required tables exist
   - Check database user permissions

### Debug Mode
Enable debug logging by setting:
```env
NODE_ENV=development
DEBUG=ai-webhook:*
```

## Production Deployment

1. **Environment Variables**: Set production values in your deployment environment
2. **Token Security**: Use a strong, randomly generated token
3. **HTTPS**: Ensure all webhook endpoints use HTTPS
4. **Monitoring**: Set up monitoring for webhook endpoints
5. **Backup**: Regular database backups including AI Agent user

## Support

For issues or questions:
1. Check the API documentation in `AI_WEBHOOK_API.md`
2. Review the setup logs
3. Check database connectivity
4. Verify all required files are present

## File Structure

```
├── config/
│   └── constants.js              # AI Agent configuration
├── middleware/
│   └── ai-webhook-auth.js        # Authentication middleware
├── controller/
│   └── ai-webhook.js             # Webhook controllers
├── routers/
│   └── ai-webhook.js             # Webhook routes
├── scripts/
│   ├── create-ai-agent.js        # AI Agent creation script
│   └── setup-ai-webhook.js       # Complete setup script
├── AI_WEBHOOK_API.md             # API documentation
└── AI_WEBHOOK_SETUP.md           # This setup guide
```

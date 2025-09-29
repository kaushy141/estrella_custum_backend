# OpenAI Assistant Manager

This system provides dynamic management of OpenAI Assistant IDs with automatic refresh capabilities and comprehensive API endpoints.

## Features

- **Dynamic Assistant Creation**: Automatically create new OpenAI Assistants
- **Automatic Refresh**: Refresh assistant IDs based on configurable intervals
- **Configuration Management**: Save and load assistant configurations
- **Environment Integration**: Automatically update `.env` files
- **API Endpoints**: RESTful API for managing assistants
- **Cleanup Utilities**: Remove old assistants to manage costs
- **CLI Interface**: Command-line tools for manual operations

## Quick Start

### 1. Setup

Make sure you have your OpenAI API key in your `.env` file:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

### 2. CLI Usage

```bash
# Create a new assistant
node scripts/openai-assistant-manager.js create

# List all assistants
node scripts/openai-assistant-manager.js list

# Get details for a specific assistant
node scripts/openai-assistant-manager.js get asst_abc123

# Refresh assistant ID (create new one)
node scripts/openai-assistant-manager.js refresh

# Get or create assistant ID dynamically
node scripts/openai-assistant-manager.js get-or-create

# Force creation of new assistant
node scripts/openai-assistant-manager.js get-or-create --force

# Cleanup old assistants (keep only 5 latest)
node scripts/openai-assistant-manager.js cleanup 5
```

### 3. API Usage

All API endpoints require authentication. Include your JWT token in the Authorization header:

```
Authorization: Bearer your_jwt_token_here
```

#### Initialize Service

```http
POST /api/openai-assistant/initialize
```

#### Get Current Assistant ID

```http
GET /api/openai-assistant/current
```

#### Refresh Assistant ID

```http
POST /api/openai-assistant/refresh
Content-Type: application/json

{
  "config": {
    "name": "Custom Assistant Name",
    "model": "gpt-4o-mini"
  }
}
```

#### List All Assistants

```http
GET /api/openai-assistant/list
```

#### Get Assistant Details

```http
GET /api/openai-assistant/details/asst_abc123
```

#### Update Assistant

```http
PUT /api/openai-assistant/update/asst_abc123
Content-Type: application/json

{
  "updates": {
    "name": "Updated Assistant Name",
    "instructions": "New instructions"
  }
}
```

#### Delete Assistant

```http
DELETE /api/openai-assistant/delete/asst_abc123
```

#### Cleanup Old Assistants

```http
POST /api/openai-assistant/cleanup
Content-Type: application/json

{
  "keepCount": 3
}
```

#### Get Service Status

```http
GET /api/openai-assistant/status
```

#### Set Refresh Interval

```http
PUT /api/openai-assistant/refresh-interval
Content-Type: application/json

{
  "intervalMs": 86400000
}
```

## Programmatic Usage

### Using the Service

```javascript
const assistantManagerService = require("./services/openai-assistant-manager-service");

// Initialize the service
await assistantManagerService.initialize();

// Get current assistant ID
const assistantId = await assistantManagerService.getCurrentAssistantId();

// Refresh assistant ID
const newAssistantId = await assistantManagerService.refreshAssistantId();

// Get service status
const status = assistantManagerService.getStatus();
```

### Using the Manager Directly

```javascript
const OpenAIAssistantManager = require("./scripts/openai-assistant-manager");
const manager = new OpenAIAssistantManager();

// Create new assistant
const assistant = await manager.createAssistant({
  name: "Custom Assistant",
  model: "gpt-4o-mini",
});

// Save configuration
await manager.saveAssistantConfig(assistant);

// Update environment file
await manager.updateEnvFile(assistant.id);
```

## Configuration

### Assistant Configuration

The system creates assistants with the following default configuration:

```javascript
{
  name: "Invoice Translation Assistant",
  description: "Professional assistant for translating invoices...",
  model: "gpt-4o-mini",
  instructions: "Detailed instructions for invoice translation...",
  tools: [
    { type: "code_interpreter" },
    { type: "file_search" }
  ],
  metadata: {
    created_by: "estrella-backend",
    created_at: "2024-01-01T00:00:00.000Z",
    version: "1.0.0"
  }
}
```

### Refresh Intervals

- **Default**: 24 hours (86400000 ms)
- **Configurable**: Can be set via API or programmatically
- **Automatic**: Service automatically refreshes when interval expires

### File Storage

- **Environment File**: `.env` (updated automatically)
- **Configuration File**: `config/openai-assistant.json` (created automatically)
- **Backup**: Previous configurations are preserved

## Error Handling

The system includes comprehensive error handling:

- **Invalid Assistant IDs**: Automatically creates new ones
- **API Failures**: Graceful fallbacks and retry logic
- **Configuration Errors**: Validation and helpful error messages
- **File System Errors**: Proper error reporting and recovery

## Cost Management

### Cleanup Strategies

1. **Automatic Cleanup**: Remove old assistants after creating new ones
2. **Manual Cleanup**: Use CLI or API to clean up specific assistants
3. **Configurable Limits**: Set how many assistants to keep

### Best Practices

- Use refresh intervals to balance freshness and cost
- Regularly cleanup old assistants
- Monitor assistant usage and adjust intervals accordingly
- Use specific assistant configurations for different use cases

## Integration with Existing Code

The system integrates seamlessly with existing OpenAI service code:

```javascript
// In your existing service
const assistantManagerService = require("./services/openai-assistant-manager-service");

class YourOpenAIService {
  async getAssistantId() {
    // Use the manager service instead of hardcoded IDs
    return await assistantManagerService.getCurrentAssistantId();
  }
}
```

## Troubleshooting

### Common Issues

1. **"Assistant ID not found"**

   - The assistant may have been deleted
   - Run `get-or-create` to create a new one

2. **"API Key not configured"**

   - Check your `.env` file has `OPENAI_API_KEY`

3. **"Permission denied"**

   - Ensure your API key has assistant management permissions

4. **"Rate limit exceeded"**
   - Wait before making more requests
   - Consider increasing refresh intervals

### Debug Mode

Enable debug logging by setting:

```env
NODE_ENV=development
```

This will provide detailed logging of all operations.

## Security Considerations

- **API Keys**: Keep your OpenAI API key secure
- **Authentication**: All API endpoints require valid JWT tokens
- **Assistant Access**: Only authorized users can manage assistants
- **Data Privacy**: Assistant configurations may contain sensitive information

## Monitoring

Use the status endpoint to monitor the service:

```http
GET /api/openai-assistant/status
```

Response includes:

- Current assistant ID
- Last refresh time
- Refresh interval
- Whether refresh is needed

## Support

For issues or questions:

1. Check the error logs for detailed error messages
2. Verify your OpenAI API key and permissions
3. Test with the CLI tools first
4. Check the service status endpoint

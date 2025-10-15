# PZ Document Generator - Setup Guide

## Quick Setup

Follow these steps to set up and use the PZ Document Generator:

### 1. Install Dependencies

```bash
npm install pdfkit
```

Or install all dependencies:

```bash
npm install
```

### 2. Verify Directory Structure

Ensure the `media` directory exists and has proper permissions:

```bash
mkdir -p media/declaration
chmod 755 media/declaration
```

### 3. Test the Installation

Run the test script to verify everything is working:

```bash
npm run test-pz-generator
```

Or directly:

```bash
node test-pz-generator.js
```

**Before running the test:**

- Edit `test-pz-generator.js` and set `TEST_PROJECT_ID` and `TEST_GROUP_ID` to valid values
- Ensure you have at least one invoice for the project
- Ensure you have at least one custom declaration for the project

## API Usage

### 1. Start the Server

```bash
npm start
```

Or for development:

```bash
npm run dev
```

### 2. Get Authentication Token

Login to get your JWT token:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }'
```

Save the token from the response.

### 3. Generate PZ Document

```bash
curl -X POST http://localhost:3000/api/custom-clearance/generate-pz \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "projectId": 1
  }'
```

### 4. Check the Generated File

The response will include the file path. You can find your PDF at:

```
media/declaration/{first-char-of-guid}/PZ-{project-name}-{timestamp}.pdf
```

## Prerequisites Checklist

Before generating a PZ document, ensure:

- [ ] Server is running
- [ ] Database is connected and initialized
- [ ] `pdfkit` package is installed
- [ ] `media/declaration` directory exists and is writable
- [ ] Project exists in database
- [ ] At least one invoice exists for the project
- [ ] At least one custom declaration exists for the project
- [ ] User is authenticated with valid JWT token
- [ ] User has access to the project's group

## File Structure

After setup, your project should have:

```
estrella_custum_backend/
├── services/
│   └── pz-document-generator.service.js    (NEW)
├── controller/
│   └── custom-clearance.js                 (UPDATED)
├── routers/
│   └── custom-clearance.js                 (UPDATED)
├── media/
│   └── declaration/                        (AUTO-CREATED)
│       └── {guid-char}/
│           └── PZ-*.pdf                    (GENERATED)
├── test-pz-generator.js                    (NEW)
├── PZ_DOCUMENT_GENERATOR.md                (NEW)
├── SETUP_PZ_GENERATOR.md                   (THIS FILE)
└── package.json                            (UPDATED)
```

## Common Issues & Solutions

### Issue: "pdfkit module not found"

**Solution:**

```bash
npm install pdfkit
```

### Issue: "ENOENT: no such file or directory, open 'media/declaration/...'"

**Solution:**

```bash
mkdir -p media/declaration
chmod 755 media/declaration
```

### Issue: "Project not found"

**Solution:**

- Verify the project ID exists in your database
- Check that you're using the correct project ID
- Ensure you have access to the project's group

### Issue: "No invoices found for project"

**Solution:**

- Upload at least one invoice for the project
- Verify invoices are associated with the correct project ID and group ID
- Check invoice status is not 'failed'

### Issue: "No custom declaration found for project"

**Solution:**

- Upload a custom declaration document for the project
- Verify it's associated with the correct project ID and group ID
- Ensure the custom declaration has insights populated

### Issue: "Permission denied" when creating file

**Solution:**

```bash
# On Linux/Mac:
chmod -R 755 media/

# On Windows:
# Right-click media folder -> Properties -> Security -> Edit permissions
```

## Testing Workflow

### 1. Unit Test

Test the PZ generator in isolation:

```bash
npm run test-pz-generator
```

### 2. API Test with Postman

1. Import the Estrella API Collection
2. Navigate to Custom Clearance > Generate PZ Document
3. Update the request body with your project ID
4. Send the request
5. Check the response for file path

### 3. Manual Verification

1. Locate the generated PDF file
2. Open it with a PDF reader
3. Verify all sections are present:
   - Header
   - Project information
   - Custom declaration details
   - Invoice summary
   - Invoice details
   - Footer with page numbers

## Development Workflow

### Adding New Features

1. **Modify the service:**
   Edit `services/pz-document-generator.service.js`

2. **Update the controller:**
   Edit `controller/custom-clearance.js` if needed

3. **Test changes:**

   ```bash
   npm run test-pz-generator
   ```

4. **Test via API:**
   Use Postman or cURL to test the endpoint

### Customizing PDF Layout

Edit the following methods in `services/pz-document-generator.service.js`:

- `addHeader()` - Modify header section
- `addProjectInfo()` - Change project information display
- `addDeclarationInfo()` - Customize declaration section
- `addInvoiceSummary()` - Alter invoice summary
- `addInvoiceDetails()` - Change invoice details layout
- `addFooter()` - Modify footer

### Adding Translations

The PDF currently supports Polish/English bilingual format. To add more languages:

1. Update text strings in each method
2. Consider adding a language parameter
3. Create language-specific templates

## Production Deployment

### 1. Environment Setup

Ensure production environment has:

```bash
# Install dependencies
npm install --production

# Create media directory
mkdir -p media/declaration
chmod 755 media/declaration

# Verify pdfkit is installed
npm list pdfkit
```

### 2. Security Considerations

- Ensure proper file permissions on `media` directory
- Validate user permissions before generating documents
- Implement rate limiting on the generation endpoint
- Monitor disk space usage
- Consider implementing file size limits

### 3. Monitoring

Monitor:

- PDF generation success/failure rates
- File system usage in `media/declaration`
- API response times
- Error logs

### 4. Backup Strategy

- Regularly backup the `media/declaration` directory
- Keep database backups including CustomClearance records
- Consider cloud storage for generated PDFs

## Support & Resources

- **Documentation:** See `PZ_DOCUMENT_GENERATOR.md` for detailed API documentation
- **Test Script:** Run `npm run test-pz-generator` for testing
- **API Collection:** Use Estrella Postman collection for API testing

## Next Steps

1. ✅ Install dependencies
2. ✅ Create media directory
3. ✅ Test with sample data
4. ✅ Test via API
5. ✅ Integrate into your workflow
6. ✅ Deploy to production

Happy coding! 🚀

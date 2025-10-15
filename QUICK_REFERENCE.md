# PZ Document Generator - Quick Reference Card

## 🚀 Quick Start

```bash
# 1. Install
npm install pdfkit openai

# 2. Configure (.env)
OPENAI_API_KEY=sk-your-key-here

# 3. Create directory
mkdir -p media/declaration

# 4. Test
npm run test-pz-generator
npm run test-download-endpoints
```

---

## 📡 API Endpoints

### Generate PZ Document

```bash
POST /api/custom-clearance/generate-pz
Body: { "projectId": 1 }
Headers: Authorization: Bearer {token}

✅ Generates PDF with AI-extracted data
✅ Creates CustomClearance record
✅ Returns file path and metadata
```

### Download Latest PZ Document

```bash
GET /api/custom-clearance/download/project/:projectId
Headers: Authorization: Bearer {token}

✅ Downloads most recent PZ PDF
✅ Fast and efficient streaming
```

### Get All PZ Documents (List)

```bash
GET /api/custom-clearance/download/project/:projectId?latest=false
Headers: Authorization: Bearer {token}

✅ Returns JSON list with download URLs
✅ Includes metadata for each document
```

### Download Specific Document

```bash
GET /api/custom-clearance/download/:id
Headers: Authorization: Bearer {token}

✅ Downloads by ID or GUID
✅ Secure file streaming
```

---

## 🎯 cURL Examples

```bash
# Generate
curl -X POST http://localhost:3000/api/custom-clearance/generate-pz \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"projectId": 1}'

# Download latest
curl -X GET http://localhost:3000/api/custom-clearance/download/project/1 \
  -H "Authorization: Bearer $TOKEN" \
  -o "latest.pdf"

# Get list
curl -X GET "http://localhost:3000/api/custom-clearance/download/project/1?latest=false" \
  -H "Authorization: Bearer $TOKEN"

# Download by ID
curl -X GET http://localhost:3000/api/custom-clearance/download/1 \
  -H "Authorization: Bearer $TOKEN" \
  -o "document.pdf"
```

---

## 📄 PDF Contains

### Header (Every Page)

- ✅ Recipient (Name, Address, Tax ID)
- ✅ Supplier (Name, Address, Tax ID)
- ✅ PZ Number
- ✅ Issue Date
- ✅ Warehouse

### Items Table

- ✅ Item Name
- ✅ Unit Quantity
- ✅ Net Price
- ✅ Tax Rate
- ✅ Net Value
- ✅ Gross Value

### Footer

- ✅ Page Numbers
- ✅ Generation Timestamp

---

## 🗂️ File Location

```
media/declaration/{guid-char}/PZ-{project}-{timestamp}.pdf
```

Example:

```
media/declaration/5/PZ-Import_Electronics-2025-10-14T12-30-45.pdf
```

---

## 🤖 AI Features

**Uses:** OpenAI GPT-4o

**Extracts:**

- Items from original invoices
- Recipient information
- Supplier information
- All item details

**Supports:**

- PDF files
- XLSX/XLS files
- JPG/PNG images

**Smart:**

- Uses cached data when available ($0)
- Falls back to AI when needed (~$0.01-0.05/invoice)

---

## ⚡ Performance

| Action                     | Time    |
| -------------------------- | ------- |
| Generate (cached)          | < 1 sec |
| Generate (AI, 1 invoice)   | ~5 sec  |
| Generate (AI, 10 invoices) | ~50 sec |
| Download                   | < 1 sec |

---

## 🔧 Test Commands

```bash
# Generate and test
npm run test-pz-generator

# Test downloads
npm run test-download-endpoints

# Check installation
npm list pdfkit openai
```

---

## 📊 Database

**Table:** customClearances

**Key Fields:**

- id, guid
- projectId, groupId
- filePath (PDF location)
- fileContent (metadata JSON)
- insights (combined insights)

---

## 🐛 Quick Troubleshooting

| Issue                    | Solution                        |
| ------------------------ | ------------------------------- |
| "pdfkit not found"       | `npm install pdfkit`            |
| "openai not found"       | `npm install openai`            |
| "OPENAI_API_KEY not set" | Add to .env file                |
| "No invoices found"      | Upload invoices first           |
| "No declaration found"   | Upload declaration first        |
| "File not found"         | Check media/declaration/ exists |
| "AI extraction failed"   | Check API key and quota         |

---

## 📞 Quick Help

**Check logs:**

```bash
tail -f logs/server.log
```

**Verify files:**

```bash
ls -la media/declaration/
```

**Test connectivity:**

```bash
curl http://localhost:3000/health
```

---

## 🎉 That's It!

**Generate:**

```bash
POST /api/custom-clearance/generate-pz
```

**Download:**

```bash
GET /api/custom-clearance/download/project/:projectId
```

**Done!** ✅

---

For complete documentation, see:

- `FINAL_IMPLEMENTATION_SUMMARY.md`
- `DOWNLOAD_ENDPOINTS.md`
- `PZ_GENERATOR_AI_FEATURES.md`

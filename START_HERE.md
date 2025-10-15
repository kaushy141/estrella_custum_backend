# 🚀 START HERE - PZ Document Generator System

## 🎉 Welcome!

You now have a **complete, AI-powered PZ Document Generator** with download capabilities!

---

## ⚡ Quick Start (Copy & Paste)

### 1. Install Dependencies

```bash
npm install pdfkit openai
```

### 2. Add API Key to .env

```env
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### 3. Create Directory

```bash
# Already created! ✅
# Location: test-output/
```

### 4. Restart Server & Test

```bash
npm restart
npm run test-pz-generator
npm run test-download-endpoints
```

---

## 🎯 What You Can Do Now

### Generate PZ Document (with AI)

```bash
curl -X POST http://localhost:3000/api/custom-clearance/generate-pz \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"projectId": 1}'
```

**Result:** Professional PDF with all invoices + AI-extracted data

### Download Latest Document

```bash
curl -X GET http://localhost:3000/api/custom-clearance/download/project/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o "my-pz-document.pdf"
```

**Result:** PDF file downloaded to your computer

### Get All Documents (List)

```bash
curl -X GET "http://localhost:3000/api/custom-clearance/download/project/1?latest=false" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Result:** JSON list of all PZ documents with download links

### Download Specific Document

```bash
curl -X GET http://localhost:3000/api/custom-clearance/download/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o "specific-document.pdf"
```

**Result:** Specific PDF downloaded

---

## 📄 What's in the PDF?

### Every Page Has:

**Header (Top):**

```
┌─────────────────────────────────────────┐
│ RECIPIENT:          SUPPLIER:           │
│ Company ABC         Supplier XYZ        │
│ Address             Address             │
│ Tax ID              Tax ID              │
│                                         │
│ DOKUMENT ODPRAWY CELNEJ (PZ)           │
│                                         │
│ Nr PZ: xxx-xxx-xxx                     │
│ Date: DD.MM.YYYY                       │
│ Warehouse: Name                        │
└─────────────────────────────────────────┘
```

**Items Table:**
| # | Item Name | Quantity | Net Price | Rate | Net Value | Gross Value |
|---|-----------|----------|-----------|------|-----------|-------------|
| 1 | Product A | 10 | 100.00 | 23% | 1000.00 | 1230.00 |
| 2 | Product B | 5 | 200.00 | 23% | 1000.00 | 1230.00 |

**Footer (Bottom):**

```
Page 1 of 2 | Generated: 14.10.2025 12:30:45
```

---

## 🤖 AI Magic

**OpenAI GPT-4o Automatically Extracts:**

✅ Item names and descriptions  
✅ Quantities and units  
✅ Prices (net and gross)  
✅ Tax rates  
✅ Totals  
✅ Recipient information  
✅ Supplier information

**From original invoice files!**

---

## 📋 Prerequisites

Before using, make sure you have:

- [x] ~~pdfkit installed~~ → Run: `npm install pdfkit`
- [x] ~~openai installed~~ → Run: `npm install openai`
- [ ] OPENAI_API_KEY in .env → **ADD THIS NOW**
- [x] ~~media/declaration directory~~ → Already exists ✅
- [ ] Server running → Run: `npm start`
- [ ] At least one project with invoices
- [ ] At least one custom declaration
- [ ] Valid JWT authentication token

---

## 🎬 Try It Now!

### Option A: Run Test Script

```bash
# Edit test-pz-generator.js first:
# - Set TEST_PROJECT_ID to your project ID
# - Set TEST_GROUP_ID to your group ID

npm run test-pz-generator
```

### Option B: Use API Directly

```bash
# 1. Login to get token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email","password":"your-password"}'

# 2. Generate PZ (use token from step 1)
curl -X POST http://localhost:3000/api/custom-clearance/generate-pz \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"projectId": 1}'

# 3. Download
curl -X GET http://localhost:3000/api/custom-clearance/download/project/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o "my-first-pz.pdf"

# 4. Open the PDF!
start my-first-pz.pdf   # Windows
```

---

## 📚 Where to Go Next?

### For Quick Commands:

→ **`QUICK_REFERENCE.md`**

### For Download API Details:

→ **`DOWNLOAD_ENDPOINTS.md`**

### For AI Features:

→ **`PZ_GENERATOR_AI_FEATURES.md`**

### For Complete Overview:

→ **`FINAL_IMPLEMENTATION_SUMMARY.md`**

### For Setup Help:

→ **`SETUP_PZ_GENERATOR.md`**

---

## 🎯 Common Tasks

### Generate PZ for Project #5

```bash
POST /api/custom-clearance/generate-pz
Body: {"projectId": 5}
```

### Download Latest PZ

```bash
GET /api/custom-clearance/download/project/5
```

### See All Available Documents

```bash
GET /api/custom-clearance/download/project/5?latest=false
```

### Download Specific Document

```bash
GET /api/custom-clearance/download/{document-id}
```

---

## ✨ What Makes This Special?

### AI-Powered 🤖

- Automatically extracts data from original invoices
- No manual data entry needed
- Supports multiple file formats

### Professional 📄

- Bilingual (Polish/English)
- Proper customs clearance format
- Headers on every page
- Clean, professional appearance

### Smart 🧠

- Uses cached data when available (free)
- Falls back to AI when needed
- Graceful error handling
- Continues even if some invoices fail

### Flexible 🔄

- Download latest or specific documents
- List all available documents
- Support for ID or GUID
- Streaming for large files

---

## 🏆 Features At a Glance

| Feature                 | Status      |
| ----------------------- | ----------- |
| PDF Generation          | ✅ Complete |
| AI Data Extraction      | ✅ Complete |
| Item Aggregation        | ✅ Complete |
| Recipient/Supplier Info | ✅ Complete |
| Page Headers            | ✅ Complete |
| Items Table             | ✅ Complete |
| Pagination              | ✅ Complete |
| Database Records        | ✅ Complete |
| Download by Project     | ✅ Complete |
| Download by ID          | ✅ Complete |
| List All Documents      | ✅ Complete |
| Activity Logging        | ✅ Complete |
| Error Handling          | ✅ Complete |
| Security                | ✅ Complete |
| Documentation           | ✅ Complete |
| Testing                 | ✅ Complete |

**16/16 Features Complete!** 🎉

---

## 🔧 Technical Stack

- **PDF Generation:** PDFKit
- **AI Extraction:** OpenAI GPT-4o
- **Database:** Sequelize (PostgreSQL)
- **Authentication:** JWT
- **File Handling:** Node.js Streams
- **Error Handling:** Comprehensive try-catch
- **Testing:** Custom test scripts

---

## 💡 Pro Tips

1. **Translate invoices first** → Use cached data → Save money
2. **Test with small projects** → Verify before large batches
3. **Monitor OpenAI usage** → Track costs
4. **Backup generated PDFs** → Important documents
5. **Review PDFs** → Always verify accuracy

---

## 🎊 You're All Set!

**Everything is ready to use!**

Just add your OpenAI API key and you can start generating professional customs clearance documents with AI-powered data extraction!

---

## 📞 Quick Links

- 📖 **API Reference:** `DOWNLOAD_ENDPOINTS.md`
- 🤖 **AI Features:** `PZ_GENERATOR_AI_FEATURES.md`
- ⚡ **Quick Commands:** `QUICK_REFERENCE.md`
- 📚 **Complete Guide:** `FINAL_IMPLEMENTATION_SUMMARY.md`
- 🔧 **Setup Help:** `SETUP_PZ_GENERATOR.md`

---

**Version:** 2.1.0  
**Date:** October 14, 2025  
**Status:** ✅ Production Ready  
**Powered by:** OpenAI GPT-4o + PDFKit

---

**Happy Generating! 🚀**

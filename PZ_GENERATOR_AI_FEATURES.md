# PZ Document Generator - AI-Powered Features

## Overview

The enhanced PZ Document Generator now uses OpenAI GPT-4o to extract detailed information from original invoice files, creating comprehensive customs clearance documents with complete item listings.

## 🆕 New Features

### 1. AI-Powered Invoice Data Extraction

The system now processes **original invoice files** using OpenAI to extract:

- **Item Details:**

  - Item Name/Description
  - Unit Quantity
  - Net Price (price per unit)
  - Rate/Tax Rate
  - Net Value (total before tax)
  - Gross Value (total after tax)

- **Recipient Information:**

  - Name
  - Full Address (street, city, postal code, country)
  - Tax ID/VAT Number

- **Supplier Information:**
  - Name
  - Full Address (street, city, postal code, country)
  - Tax ID/VAT Number

### 2. Aggregated Items List

All items from all invoices are combined into a single comprehensive list for the PZ document.

### 3. Enhanced PDF Format

The PDF now features:

**Page Header (on every page):**

- Recipient information (left side)
- Supplier information (right side)
- PZ Number
- Date of Issue
- Warehouse Information

**Items Table:**
| Lp. | Nazwa towaru | Ilość | Cena netto | Stawka | Wart. netto | Wart. brutto |
|-----|--------------|-------|------------|--------|-------------|--------------|
| No. | Item Name | Qty | Net Price | Rate | Net Value | Gross Value |

---

## How It Works

### Step 1: Extract from Translated Content (if available)

If invoices have already been translated and contain structured data, the system uses that first:

```javascript
{
  "buyer": { "name": "...", "address": "..." },
  "seller": { "name": "...", "address": "..." },
  "items": [
    {
      "itemName": "...",
      "unitQuantity": "...",
      "netPrice": "...",
      "rate": "...",
      "netValue": "...",
      "grossValue": "..."
    }
  ]
}
```

### Step 2: AI Extraction from Original Files

If translated content is not available, the system:

1. Reads the original invoice file (`originalFilePath`)
2. Sends it to OpenAI GPT-4o for analysis
3. Extracts all required information
4. Structures it into JSON format

**Supported File Types:**

- ✅ PDF files
- ✅ XLSX/XLS files
- ✅ Image files (JPG, PNG)

### Step 3: Aggregate All Data

The system combines data from all invoices:

```javascript
{
  "allItems": [
    {
      "itemName": "Product A",
      "unitQuantity": "10",
      "netPrice": "100.00",
      "rate": "23%",
      "netValue": "1000.00",
      "grossValue": "1230.00",
      "invoiceId": 1,
      "invoiceFileName": "invoice-001.pdf",
      "invoiceNumber": 1
    },
    // ... more items from all invoices
  ],
  "recipient": { "name": "...", "address": "...", "taxId": "..." },
  "supplier": { "name": "...", "address": "...", "taxId": "..." }
}
```

### Step 4: Generate Enhanced PDF

The PDF is generated with:

- Header on each page showing recipient, supplier, PZ number, date, warehouse
- Comprehensive items table with all items from all invoices
- Proper pagination (header repeats on each new page)
- Footer with page numbers

---

## API Usage

### Generate PZ Document with AI Extraction

**Endpoint:** `POST /api/custom-clearance/generate-pz`

**Request:**

```json
{
  "projectId": 1
}
```

**Process:**

1. System fetches all invoices for the project
2. For each invoice, extracts detailed data using AI (if not already available)
3. Aggregates all items
4. Extracts recipient and supplier information
5. Generates PDF with enhanced format
6. Creates CustomClearance database record

**Response:**

```json
{
  "status": "success",
  "message": "PZ document generated successfully",
  "data": {
    "customClearance": {
      "id": 1,
      "filePath": "media/declaration/5/PZ-Project_Name-2025-10-14T12-30-45.pdf",
      "insights": {
        "declarationInsights": {...},
        "invoiceSummary": {
          "totalInvoices": 3,
          "invoices": [...]
        }
      }
    },
    "fileName": "PZ-Project_Name-2025-10-14T12-30-45.pdf"
  }
}
```

---

## Configuration

### Environment Variables

Ensure your `.env` file contains:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

### OpenAI Model

The system uses **GPT-4o** for optimal document understanding:

- Supports vision (images, documents)
- Structured JSON output
- High accuracy for invoice data extraction

---

## Data Flow

```
1. User uploads invoices → Database (originalFilePath stored)

2. User uploads custom declaration → Database

3. User calls generate-pz API

4. System fetches invoices

5. For each invoice:
   - Check if translatedFileContent exists
   - If yes → use existing data
   - If no → Read originalFilePath → Send to OpenAI → Extract data

6. Aggregate all items from all invoices

7. Extract recipient/supplier from first available invoice

8. Generate PDF:
   - Header with recipient/supplier/PZ info (on each page)
   - Items table with all items
   - Page footers

9. Save PDF to media/declaration/

10. Create CustomClearance record

11. Return file path and metadata
```

---

## PDF Format Example

```
═══════════════════════════════════════════════════════════
ODBIORCA / RECIPIENT:              DOSTAWCA / SUPPLIER:
Company XYZ                        Supplier ABC
ul. Test 123                       ul. Provider 456
00-000 Warsaw, Poland              11-111 Berlin, Germany
NIP/VAT: PL1234567890              NIP/VAT: DE9876543210

              DOKUMENT ODPRAWY CELNEJ (PZ)

Nr PZ / PZ Number: 550e8400-e29b-41d4-a716-446655440000
Data wystawienia / Issue Date: 14.10.2025
Magazyn / Warehouse: Main Warehouse
───────────────────────────────────────────────────────────

Lp. | Nazwa towaru     | Ilość | Cena netto | Stawka | Wart. netto | Wart. brutto
────┼─────────────────┼───────┼────────────┼────────┼─────────────┼──────────────
1   | Product A        | 10    | 100.00 EUR | 23%    | 1000.00 EUR | 1230.00 EUR
2   | Product B        | 5     | 200.00 EUR | 23%    | 1000.00 EUR | 1230.00 EUR
... | ...              | ...   | ...        | ...    | ...         | ...

                                            Strona 1 z 1 | Wygenerowano: 14.10.2025 12:30:45
═══════════════════════════════════════════════════════════
```

---

## Error Handling

### If AI Extraction Fails

The system gracefully handles errors:

```javascript
{
  "invoiceId": 123,
  "fileName": "invoice-123.pdf",
  "recipient": {},
  "supplier": {},
  "items": [],
  "total": null,
  "currency": null,
  "error": "Error message here"
}
```

The PDF will still be generated with available data.

### Common Issues

**1. Missing originalFilePath**

```
Warning: No original file path for invoice 123
```

**Solution:** Ensure invoices are uploaded with files

**2. File Not Found**

```
Error: ENOENT: no such file or directory
```

**Solution:** Verify file paths are correct

**3. OpenAI API Error**

```
Error processing invoice 123: OpenAI API error
```

**Solution:** Check API key and quota

---

## Performance Considerations

### Processing Time

- **With translated content:** Instant (uses cached data)
- **With AI extraction:** ~5-10 seconds per invoice
- **Total time:** Depends on number of invoices

### Cost Optimization

1. **Reuse translated content** when available
2. **Batch processing** - all invoices processed in sequence
3. **File cleanup** - temporary uploaded files are deleted

### Recommendations

- For projects with many invoices (10+): Process during off-peak hours
- Use translated content when available to avoid AI processing
- Monitor OpenAI API usage and costs

---

## Advanced Features

### Custom Extraction Prompt

The AI extraction uses a detailed prompt to ensure accurate data extraction. You can modify the prompt in the service if needed for specific invoice formats.

### Fallback to Manual Data

If AI extraction fails, the system falls back to:

1. Existing `translatedFileContent`
2. Basic `insights` data
3. Empty placeholders (to allow PDF generation to continue)

### Multi-Currency Support

The system automatically detects and displays currency for each item/invoice.

---

## Testing

### Test with Sample Data

```bash
npm run test-pz-generator
```

The test script will:

1. Validate prerequisites
2. Process invoices with AI
3. Generate PDF
4. Display results

### Manual Testing

1. Upload invoices with original files
2. Upload custom declaration
3. Call `/api/custom-clearance/generate-pz`
4. Check generated PDF for:
   - Correct recipient/supplier info
   - All items from all invoices
   - Proper formatting
   - Pagination

---

## Troubleshooting

### AI Extraction Not Working

**Check:**

1. `OPENAI_API_KEY` is set in `.env`
2. Original file paths exist and are accessible
3. OpenAI API quota is available
4. File formats are supported

### Missing Items in PDF

**Check:**

1. AI successfully extracted items (check logs)
2. Items array is not empty
3. Items have required fields (itemName, etc.)

### Incorrect Recipient/Supplier

**Check:**

1. Invoice contains clear recipient/supplier information
2. AI extraction prompt matches invoice format
3. First invoice in list has complete information

---

## Future Enhancements

Planned improvements:

- [ ] Caching of AI-extracted data
- [ ] Batch AI processing for better performance
- [ ] Custom extraction prompts per group
- [ ] Support for more file formats
- [ ] Multi-language invoice support
- [ ] OCR for scanned documents

---

## Summary

The enhanced PZ Document Generator now provides:

✅ **AI-Powered Data Extraction** - Automatic extraction from original invoices  
✅ **Comprehensive Item Lists** - All items from all invoices in one document  
✅ **Professional Formatting** - Headers on each page with key information  
✅ **Smart Fallbacks** - Uses cached data when available  
✅ **Error Resilience** - Graceful handling of extraction failures  
✅ **Cost Efficient** - Reuses existing translated content

**Perfect for customs clearance documentation with complete accuracy and professional presentation!**

---

**Version:** 2.0.0  
**Last Updated:** October 14, 2025  
**Status:** ✅ Production Ready with AI Features

const PDFDocument = require('pdfkit');
const fs = require('fs').promises;
const path = require('path');
const { Invoice } = require('../models/invoice-model');
const { CustomDeclaration } = require('../models/custom-declaration-model');
const { Project } = require('../models/project-model');
const { Group } = require('../models/group-model');
const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

/**
 * PZ Document Generator Service
 * Generates custom clearance PDF documents based on invoices and custom declaration
 */
class PZDocumentGeneratorService {

    /**
     * Generate PZ Document PDF for a project
     * @param {number} projectId - Project ID
     * @param {number} groupId - Group ID
     * @returns {Promise<Object>} - Generated file information
     */
    async generatePZDocument(projectId, groupId) {
        try {
            console.log(`Generating PZ document for project ${projectId}, group ${groupId}`);

            // Fetch project details
            const project = await Project.findByPk(projectId);
            if (!project) {
                throw new Error(`Project with ID ${projectId} not found`);
            }

            // Fetch group details
            const group = await Group.findByPk(groupId);
            if (!group) {
                throw new Error(`Group with ID ${groupId} not found`);
            }

            // Fetch all invoices for the project
            const invoices = await Invoice.findAll({
                where: { projectId, groupId },
                order: [['createdAt', 'DESC']],
                raw: true
            });

            if (!invoices || invoices.length === 0) {
                throw new Error(`No invoices found for project ${projectId}`);
            }

            // Fetch latest custom declaration for the project
            const customDeclaration = await CustomDeclaration.findOne({
                where: { projectId, groupId },
                order: [['createdAt', 'DESC']],
                raw: true
            });

            if (!customDeclaration) {
                throw new Error(`No custom declaration found for project ${projectId}`);
            }

            // Parse insights
            let declarationOriginalFileContent = {};
            try {
                declarationOriginalFileContent = JSON.parse(customDeclaration.originalFileContent || '{}');
            } catch (e) {
                console.warn('Failed to parse custom declaration original file content:', e);
            }

            const taxRate = 23;
            const allItems = invoices.map(invoice => JSON.parse(invoice.translatedFileContent).items).flat().map(item => ({
                itemName: item.description + " " + item.category,
                uom: item.UOM,
                unitQuantity: item.quantity,
                netPrice: item.unitPrice.toFixed(2),
                taxRate: taxRate + "%",
                netTotal: item.total.toFixed(2),
                grossTotal: (item.total * (1 + taxRate / 100)).toFixed(2)
            })).flat();
            const recipientInfo = JSON.parse(invoices[0].originalFileContent).consignee;
            const supplierInfo = JSON.parse(invoices[0].originalFileContent).merchantExporter;

            // Prepare output directory (similar to invoice translation pattern)
            const outputDir = path.join('media', 'declaration', customDeclaration.guid.substring(0, 1));
            await fs.mkdir(outputDir, { recursive: true });

            // Generate filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const fileName = `PZ-${project.title.replace(/[^a-zA-Z0-9]/g, '_')}-${timestamp}.pdf`;
            const outputPath = path.join(outputDir, fileName);

            // Generate PDF with enhanced data
            await this.createPDF(outputPath, {
                project,
                group,
                customDeclaration,
                declarationOriginalFileContent,
                invoices: invoices,
                allItems: allItems,
                recipient: recipientInfo,
                supplier: supplierInfo,
                issueDate: new Date().toLocaleDateString('pl-PL'),
                warehouse: group.name || 'Default Warehouse'
            });

            console.log(`✅ PZ document generated: ${outputPath}`);

            // Prepare file content summary
            const fileContent = JSON.stringify({
                projectId,
                groupId,
                projectTitle: project.title,
                groupName: group.name,
                declarationId: customDeclaration.id,
                invoiceCount: invoices.length,
                invoiceIds: invoices.map(i => i.id),
                generatedAt: new Date().toISOString()
            });

            // Prepare insights summary
            const insights = JSON.stringify({
                declarationOriginalFileContent,
                invoiceSummary: {
                    totalInvoices: invoices.length,
                    invoices: invoices.map(inv => ({
                        id: inv.id,
                        fileName: inv.originalFileName,
                        translatedFileName: inv.translatedFileName
                    }))
                }
            });

            return {
                filePath: outputPath,
                fileName: fileName,
                fileContent,
                insights,
                projectId,
                groupId
            };

        } catch (error) {
            console.error('Error generating PZ document:', error);
            throw error;
        }
    }


    /**
     * Create PDF document with proper formatting
     * @param {string} outputPath - Output file path
     * @param {Object} data - Document data
     */
    async createPDF(outputPath, data) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    size: 'A4',
                    margin: 50,
                    bufferPages: true
                });

                const stream = require('fs').createWriteStream(outputPath);
                doc.pipe(stream);

                // Add page header with recipient, supplier, PZ info (will be on each page)
                this.addPageHeader(doc, data);

                // Add items table
                this.addItemsTable(doc, data);

                // Add footer on all pages
                this.addFooter(doc);

                // Finalize PDF
                doc.end();

                stream.on('finish', () => {
                    console.log('PDF generation completed');
                    resolve();
                });

                stream.on('error', (err) => {
                    console.error('PDF generation error:', err);
                    reject(err);
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Add page header with recipient, supplier, and PZ information
     * This will be added to each page
     */
    addPageHeader(doc, data) {
        const { recipient, supplier, pzNumber, issueDate, warehouse } = data;

        // Save this function to be called on each new page
        this.headerData = data;

        this.drawPageHeader(doc, recipient, supplier, pzNumber, issueDate, warehouse);
    }

    /**
     * Draw header on current page
     */
    drawPageHeader(doc, recipient, supplier, pzNumber, issueDate, warehouse) {
        const startY = 50;
        const leftMargin = 50;
        const rightMargin = 300;

        doc.fontSize(8).font('Helvetica');

        // Recipient (Left side)
        doc.text('ODBIORCA / RECIPIENT:', leftMargin, startY, { continued: false });
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text(recipient || 'N/A', leftMargin, doc.y);
        doc.fontSize(8).font('Helvetica');
        //doc.text(recipient.address || 'N/A', leftMargin, doc.y, { width: 200 });
        //if (recipient.taxId) {
        //    doc.text(`NIP/VAT: ${recipient.taxId}`, leftMargin, doc.y);
        //}

        // Supplier (Right side)
        const supplierY = startY;
        doc.text('DOSTAWCA / SUPPLIER:', rightMargin, supplierY, { continued: false });
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text(supplier || 'N/A', rightMargin, doc.y);
        doc.fontSize(8).font('Helvetica');
        //doc.text(supplier.address || 'N/A', rightMargin, doc.y, { width: 200 });
        //if (supplier.taxId) {
        //    doc.text(`NIP/VAT: ${supplier.taxId}`, rightMargin, doc.y);
        //}

        // Move to max Y of both columns
        const maxY = Math.max(doc.y, supplierY + 60);
        doc.y = maxY + 10;

        // PZ Document Information (Centered)
        doc.fontSize(14).font('Helvetica-Bold');
        doc.text('DOKUMENT ODPRAWY CELNEJ (PZ)', leftMargin, doc.y, {
            align: 'center',
            width: 500
        });
        doc.moveDown(0.3);

        // PZ Details
        doc.fontSize(9).font('Helvetica');
        const detailsY = doc.y;

        doc.text(`Nr PZ / PZ Number: ${pzNumber || 'N/A'}`, leftMargin, detailsY);
        doc.text(`Data wystawienia / Issue Date: ${issueDate || 'N/A'}`, leftMargin, doc.y);
        doc.text(`Magazyn / Warehouse: ${warehouse || 'N/A'}`, leftMargin, doc.y);

        // Draw line separator
        doc.moveDown(0.5);
        doc.moveTo(leftMargin, doc.y)
            .lineTo(550, doc.y)
            .stroke();
        doc.moveDown(0.5);
    }

    /**
     * Draw a table cell with border, padding, and multiline text support
     * @param {Object} doc - PDFKit document
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Cell width
     * @param {number} height - Cell height
     * @param {string} text - Cell text (supports multiline)
     * @param {Object} options - Cell options (align, fontSize, font, padding, borderColor, drawBorders)
     * @returns {number} - Actual height used by the cell
     */
    drawTableCell(doc, x, y, width, height, text, options = {}) {
        const {
            align = 'left',
            fontSize = 7,
            font = 'Helvetica',
            padding = 4,
            borderColor = '#000000',
            borderWidth = 1,
            drawBorders = { top: true, right: true, bottom: true, left: true }
        } = options;

        // Set font before calculating text dimensions
        doc.font(font).fontSize(fontSize);

        // Calculate text area (width minus padding on both sides)
        // Ensure textWidth is at least 1 to avoid errors
        const textWidth = Math.max(1, width - (padding * 2));
        const textX = x + padding;
        const textY = y + padding;

        // Draw cell borders (1px) - draw each border separately for better control
        doc.lineWidth(borderWidth).strokeColor(borderColor);

        if (drawBorders.top) {
            doc.moveTo(x, y).lineTo(x + width, y).stroke();
        }
        if (drawBorders.right) {
            doc.moveTo(x + width, y).lineTo(x + width, y + height).stroke();
        }
        if (drawBorders.bottom) {
            doc.moveTo(x, y + height).lineTo(x + width, y + height).stroke();
        }
        if (drawBorders.left) {
            doc.moveTo(x, y).lineTo(x, y + height).stroke();
        }

        // Convert text to string and ensure it's not empty
        const textString = String(text || '').trim();

        if (textString) {
            // Calculate text height with proper wrapping - this ensures text fits within cell width
            const textHeight = doc.heightOfString(textString, {
                width: textWidth,
                align: align
            });

            // Draw text content with strict width constraint to enforce wrapping
            // PDFKit will automatically wrap text when width is specified
            doc.text(textString, textX, textY, {
                width: textWidth,  // This enforces text wrapping within cell boundaries
                align: align,
                lineGap: 1
            });

            // Return actual height used (considering text wrapping)
            return Math.max(height, textHeight + (padding * 2));
        } else {
            // Empty cell, return minimum height
            return Math.max(height, fontSize + (padding * 2));
        }
    }

    /**
     * Draw a complete table row
     * @param {Object} doc - PDFKit document
     * @param {number} startX - Starting X position
     * @param {number} startY - Starting Y position
     * @param {Array} columns - Array of column definitions {width, text, align}
     * @param {Object} rowOptions - Row options (fontSize, font, padding, isHeader)
     * @returns {number} - Height of the row
     */
    drawTableRow(doc, startX, startY, columns, rowOptions = {}) {
        const {
            fontSize = 7,
            font = 'Helvetica',
            padding = 4,
            isHeader = false
        } = rowOptions;

        // Calculate row height based on content
        let maxHeight = 0;
        const cellOptions = {
            fontSize: isHeader ? 8 : fontSize,
            font: isHeader ? 'Helvetica-Bold' : font,
            padding: padding
        };

        // First pass: calculate max height needed for all cells
        columns.forEach((col, index) => {
            const cellAlign = col.align || (index === 0 ? 'center' : index >= columns.length - 3 ? 'right' : 'left');
            doc.font(cellOptions.font).fontSize(cellOptions.fontSize);

            // Convert text to string for consistent calculation
            const textString = String(col.text || '').trim();
            const textWidth = Math.max(1, col.width - (cellOptions.padding * 2));

            const textHeight = doc.heightOfString(textString, {
                width: textWidth
            });
            const cellHeight = textHeight + (cellOptions.padding * 2);
            maxHeight = Math.max(maxHeight, cellHeight);
        });

        // Ensure minimum row height for professional appearance
        maxHeight = Math.max(maxHeight, isHeader ? 22 : 20);

        // Second pass: draw all cells with all borders (overlap creates clean 1px lines)
        let currentX = startX;
        columns.forEach((col, index) => {
            const cellAlign = col.align || (index === 0 ? 'center' : index >= columns.length - 3 ? 'right' : 'left');

            const cellOptionsWithAlign = {
                ...cellOptions,
                align: cellAlign
            };

            this.drawTableCell(doc, currentX, startY, col.width, maxHeight, col.text || '', cellOptionsWithAlign);
            currentX += col.width;
        });

        return maxHeight;
    }

    /**
     * Add items table with all items from all invoices
     */
    addItemsTable(doc, data) {
        const { allItems } = data;
        const taxRate = 23;
        console.log("allItems", allItems);

        if (!allItems || allItems.length === 0) {
            doc.fontSize(11).font('Helvetica');
            doc.text('Brak pozycji do wyświetlenia / No items to display', { align: 'center' });
            return;
        }

        const leftMargin = 50;
        const rightMargin = 50;
        const tableStartY = doc.y;

        // A4 page width is 595 points, with margins: 595 - 50 - 50 = 495 points available
        const availableWidth = 595 - leftMargin - rightMargin;

        // Column widths - adjusted to fit within available width (495 points)
        // Total: 25 + 140 + 45 + 45 + 55 + 35 + 65 + 65 = 475 points (leaves 20 points buffer)
        const colWidths = {
            no: 25,
            itemName: 140,
            uom: 45,
            unitQuantity: 45,
            netPrice: 55,
            taxRate: 35,
            netTotal: 65,
            grossTotal: 65
        };

        // Verify total width doesn't exceed available width
        const totalWidth = Object.values(colWidths).reduce((sum, width) => sum + width, 0);
        if (totalWidth > availableWidth) {
            console.warn(`Table width (${totalWidth}) exceeds available width (${availableWidth}). Adjusting columns...`);
            // Scale down proportionally if needed
            const scaleFactor = availableWidth / totalWidth;
            Object.keys(colWidths).forEach(key => {
                colWidths[key] = Math.floor(colWidths[key] * scaleFactor);
            });
        }

        // Helper function to draw table header
        const drawTableHeader = (yPos) => {
            const headerColumns = [
                { width: colWidths.no, text: 'Lp.', align: 'center' },
                { width: colWidths.itemName, text: 'Nazwa', align: 'left' },
                { width: colWidths.uom, text: 'Jedn', align: 'center' },
                { width: colWidths.unitQuantity, text: 'Ilość', align: 'right' },
                { width: colWidths.netPrice, text: 'Cena netto', align: 'right' },
                { width: colWidths.taxRate, text: 'Stawka', align: 'center' },
                { width: colWidths.netTotal, text: 'Wartość netto', align: 'right' },
                { width: colWidths.grossTotal, text: 'Wartość brutto', align: 'right' }
            ];

            return this.drawTableRow(doc, leftMargin, yPos, headerColumns, {
                fontSize: 8,
                font: 'Helvetica-Bold',
                padding: 5,
                isHeader: true
            });
        };

        // Draw initial table header
        let currentY = tableStartY;
        let headerHeight = drawTableHeader(currentY);
        currentY += headerHeight;

        // Draw table rows
        allItems.forEach((item, index) => {
            // Check if we need a new page (leave space for at least one row)
            if (currentY > 700) {
                doc.addPage();
                // Re-draw header on new page
                this.drawPageHeader(doc, data.recipient, data.supplier, data.pzNumber, data.issueDate, data.warehouse);
                // Re-draw table header
                currentY = doc.y;
                headerHeight = drawTableHeader(currentY);
                currentY += headerHeight;
            }

            // Prepare row data
            const rowColumns = [
                { width: colWidths.no, text: (index + 1).toString(), align: 'center' },
                { width: colWidths.itemName, text: item.itemName || item.description || 'N/A', align: 'left' },
                { width: colWidths.uom, text: item.uom || item.UOM || '-', align: 'center' },
                { width: colWidths.unitQuantity, text: String(item.unitQuantity || item.quantity || '-'), align: 'right' },
                { width: colWidths.netPrice, text: item.netPrice || (item.unitPrice ? item.unitPrice.toFixed(2) : '-'), align: 'right' },
                { width: colWidths.taxRate, text: item.taxRate || `${taxRate}%`, align: 'center' },
                { width: colWidths.netTotal, text: item.netTotal || (item.total ? item.total.toFixed(2) : '-'), align: 'right' },
                { width: colWidths.grossTotal, text: item.grossTotal || (item.total ? (item.total * (1 + taxRate / 100)).toFixed(2) : '-'), align: 'right' }
            ];

            // Draw row
            const rowHeight = this.drawTableRow(doc, leftMargin, currentY, rowColumns, {
                fontSize: 7,
                font: 'Helvetica',
                padding: 4,
                isHeader: false
            });

            currentY += rowHeight;
        });

        // Update document Y position
        doc.y = currentY + 10;
    }

    /**
     * Add project information (kept for reference, now using new format)
     */
    addProjectInfo_OLD(doc, data) {
        const { project, group } = data;

        doc
            .fontSize(14)
            .font('Helvetica-Bold')
            .text('Informacje o Projekcie / Project Information', { underline: true })
            .moveDown(0.5);

        doc
            .fontSize(11)
            .font('Helvetica');

        this.addInfoRow(doc, 'Projekt / Project:', project.title);
        this.addInfoRow(doc, 'Status:', project.status);
        this.addInfoRow(doc, 'Grupa / Group:', group.name);

        if (project.description) {
            doc
                .font('Helvetica-Bold')
                .text('Opis / Description:', { continued: false })
                .font('Helvetica')
                .text(project.description, { indent: 20 });
        }

        doc.moveDown(1);
    }

    /**
     * Add custom declaration information (kept for reference)
     */
    addDeclarationInfo_OLD(doc, data) {
        const { customDeclaration, declarationInsights } = data;

        doc
            .fontSize(14)
            .font('Helvetica-Bold')
            .text('Deklaracja Celna / Custom Declaration', { underline: true })
            .moveDown(0.5);

        doc
            .fontSize(11)
            .font('Helvetica');

        this.addInfoRow(doc, 'Numer Dokumentu / Document Number:', customDeclaration.guid);
        this.addInfoRow(doc, 'Nazwa Pliku / File Name:', customDeclaration.fileName || 'N/A');
        this.addInfoRow(doc, 'Data Utworzenia / Created:', new Date(customDeclaration.createdAt).toLocaleDateString('pl-PL'));

        // Add declaration insights if available
        if (declarationInsights && Object.keys(declarationInsights).length > 0) {
            doc
                .moveDown(0.5)
                .font('Helvetica-Bold')
                .text('Szczegóły / Details:', { underline: true })
                .moveDown(0.3)
                .font('Helvetica');

            // Display key insights
            Object.keys(declarationInsights).forEach((key) => {
                if (typeof declarationInsights[key] === 'object') {
                    doc.text(`${key}:`, { indent: 20, continued: false });
                    doc.text(JSON.stringify(declarationInsights[key], null, 2), { indent: 40 });
                } else {
                    this.addInfoRow(doc, `${key}:`, String(declarationInsights[key]), 20);
                }
            });
        }

        doc.moveDown(1);
    }

    /**
     * Add invoice summary (kept for reference)
     */
    addInvoiceSummary_OLD(doc, data) {
        const { invoices } = data;

        doc
            .fontSize(14)
            .font('Helvetica-Bold')
            .text('Podsumowanie Faktur / Invoice Summary', { underline: true })
            .moveDown(0.5);

        doc
            .fontSize(11)
            .font('Helvetica');

        this.addInfoRow(doc, 'Całkowita Liczba Faktur / Total Invoices:', invoices.length.toString());

        // Calculate totals if available
        let totalAmount = 0;
        let currency = '';

        invoices.forEach(invoice => {
            if (invoice.translatedContent && invoice.translatedContent.total) {
                totalAmount += parseFloat(invoice.translatedContent.total || 0);
            }
            if (invoice.translatedContent && invoice.translatedContent.currency && !currency) {
                currency = invoice.translatedContent.currency;
            }
        });

        if (totalAmount > 0) {
            this.addInfoRow(doc, 'Łączna Wartość / Total Value:', `${totalAmount.toFixed(2)} ${currency}`);
        }

        doc.moveDown(1);
    }

    /**
     * Add detailed invoice information (kept for reference)
     */
    addInvoiceDetails_OLD(doc, data) {
        const { invoices } = data;

        doc
            .fontSize(14)
            .font('Helvetica-Bold')
            .text('Szczegóły Faktur / Invoice Details', { underline: true })
            .moveDown(0.5);

        invoices.forEach((invoice, index) => {
            // Check if we need a new page
            if (doc.y > 700) {
                doc.addPage();
            }

            doc
                .fontSize(12)
                .font('Helvetica-Bold')
                .text(`Faktura ${index + 1} / Invoice ${index + 1}`, { underline: true })
                .moveDown(0.3);

            doc
                .fontSize(10)
                .font('Helvetica');

            this.addInfoRow(doc, 'Plik Oryginalny / Original File:', invoice.originalFileName || 'N/A', 10);
            this.addInfoRow(doc, 'Plik Tłumaczony / Translated File:', invoice.translatedFileName || 'N/A', 10);
            this.addInfoRow(doc, 'Data / Date:', new Date(invoice.createdAt).toLocaleDateString('pl-PL'), 10);

            // Add translated content details
            if (invoice.translatedContent) {
                const content = invoice.translatedContent;

                if (content.invoiceNumber) {
                    this.addInfoRow(doc, 'Numer / Number:', content.invoiceNumber, 10);
                }
                if (content.date) {
                    this.addInfoRow(doc, 'Data Faktury / Invoice Date:', content.date, 10);
                }
                if (content.seller) {
                    this.addInfoRow(doc, 'Sprzedawca / Seller:', content.seller, 10);
                }
                if (content.buyer) {
                    this.addInfoRow(doc, 'Kupujący / Buyer:', content.buyer, 10);
                }
                if (content.total && content.currency) {
                    this.addInfoRow(doc, 'Suma / Total:', `${content.total} ${content.currency}`, 10);
                }

                // Add items if available
                if (content.items && Array.isArray(content.items) && content.items.length > 0) {
                    doc
                        .moveDown(0.3)
                        .fontSize(10)
                        .font('Helvetica-Bold')
                        .text('Pozycje / Items:', { indent: 10 })
                        .font('Helvetica');

                    content.items.forEach((item, itemIndex) => {
                        doc.text(`${itemIndex + 1}. ${item.description || item.name || 'N/A'} - ${item.quantity || ''} x ${item.price || ''} = ${item.total || ''}`, { indent: 20 });
                    });
                }
            }

            doc.moveDown(0.8);
        });
    }

    /**
     * Add footer
     */
    addFooter(doc) {
        const pageCount = doc.bufferedPageRange().count;

        for (let i = 0; i < pageCount; i++) {
            doc.switchToPage(i);

            doc
                .fontSize(8)
                .font('Helvetica')
                .text(
                    `Strona ${i + 1} z ${pageCount} | Wygenerowano / Generated: ${new Date().toLocaleString('pl-PL')}`,
                    50,
                    doc.page.height - 50,
                    { align: 'center' }
                );
        }
    }

    /**
     * Helper method to add information rows
     */
    addInfoRow(doc, label, value, indent = 0) {
        doc
            .font('Helvetica-Bold')
            .text(label, { indent, continued: true })
            .font('Helvetica')
            .text(` ${value}`, { continued: false });
    }
}

module.exports = new PZDocumentGeneratorService();


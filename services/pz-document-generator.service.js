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
     * Add items table with all items from all invoices
     */
    addItemsTable(doc, data) {
        const { allItems } = data;
        console.log("allItems", allItems);

        if (!allItems || allItems.length === 0) {
            doc.fontSize(11).font('Helvetica');
            doc.text('Brak pozycji do wyświetlenia / No items to display', { align: 'center' });
            return;
        }

        // Table header
        doc.fontSize(8).font('Helvetica-Bold');
        const tableTop = doc.y;
        const leftMargin = 50;


        // itemName: item.description + " " + item.category,
        //         uom: item.UOM,
        //         unitQuantity: item.quantity,
        //         netPrice: item.unitPrice.toFixed(2),
        //         taxRate: taxRate + "%",
        //         netTotal: item.total.toFixed(2),
        //     grossTotal: 

        // Column widths
        const col = {
            no: 30,
            itemName: 180,
            uom: 50,
            unitQuantity: 50,
            netPrice: 60,
            taxRate: 40,
            netTotal: 70,
            grossTotal: 70
        };

        // Header row
        doc.text('Lp.', leftMargin, tableTop, { width: col.no, continued: false });
        doc.text('Nazwa', leftMargin + col.no, tableTop, { width: col.itemName, continued: false });
        doc.text('Jedn', leftMargin + col.no + col.itemName, tableTop, { width: col.uom, continued: false });
        doc.text('Ilość', leftMargin + col.no + col.itemName + col.unitQuantity, tableTop, { width: col.unitQuantity, continued: false });
        doc.text('Cena netto', leftMargin + col.no + col.itemName + col.unitQuantity + col.netPrice, tableTop, { width: col.netPrice, continued: false });
        doc.text('Stawka', leftMargin + col.no + col.itemName + col.unitQuantity + col.netPrice + col.taxRate, tableTop, { width: col.taxRate, continued: false });
        doc.text('Wartość netto', leftMargin + col.no + col.itemName + col.unitQuantity + col.netPrice + col.taxRate + col.netTotal, tableTop, { width: col.netTotal, continued: false });
        doc.text('Wartość brutto', leftMargin + col.no + col.itemName + col.unitQuantity + col.netPrice + col.taxRate + col.netTotal + col.grossTotal, tableTop, { width: col.grossTotal, continued: false });

        // Draw line under header
        doc.moveDown(0.3);
        const lineY = doc.y;
        doc.moveTo(leftMargin, lineY)
            .lineTo(550, lineY)
            .stroke();

        doc.moveDown(0.3);
        doc.font('Helvetica').fontSize(7);

        // Table rows
        allItems.forEach((item, index) => {
            // Check if we need a new page
            if (doc.y > 700) {
                doc.addPage();
                // Re-draw header on new page
                this.drawPageHeader(doc, data.recipient, data.supplier, data.pzNumber, data.issueDate, data.warehouse);

                // Re-draw table header
                // doc.fontSize(10).font('Helvetica-Bold');
                // const newTableTop = doc.y;
                // doc.text('Lp.', leftMargin, newTableTop, { width: col.no, continued: false });
                // doc.text('Nazwa towaru / Item Name', leftMargin + col.no, newTableTop, { width: col.itemName, continued: false });
                // doc.text('Ilość / Qty', leftMargin + col.no + col.itemName, newTableTop, { width: col.quantity, continued: false });
                // doc.text('Cena netto / Net Price', leftMargin + col.no + col.itemName + col.quantity, newTableTop, { width: col.netPrice, continued: false });
                // doc.text('Stawka / Rate', leftMargin + col.no + col.itemName + col.quantity + col.netPrice, newTableTop, { width: col.rate, continued: false });
                // doc.text('Wart. netto / Net Value', leftMargin + col.no + col.itemName + col.quantity + col.netPrice + col.rate, newTableTop, { width: col.netValue, continued: false });
                // doc.text('Wart. brutto / Gross Value', leftMargin + col.no + col.itemName + col.quantity + col.netPrice + col.rate + col.netValue, newTableTop, { width: col.grossValue, continued: false });

                doc.fontSize(10).font('Helvetica-Bold');
                const newTableTop = doc.y;
                doc.text('Lp.', leftMargin, newTableTop, { width: col.no, continued: false });
                doc.text('Nazwa', leftMargin + col.no, newTableTop, { width: col.itemName, continued: false });
                doc.text('Jedn', leftMargin + col.no + col.itemName, newTableTop, { width: col.uom, continued: false });
                doc.text('Ilość', leftMargin + col.no + col.itemName + col.unitQuantity, newTableTop, { width: col.unitQuantity, continued: false });
                doc.text('Cena netto', leftMargin + col.no + col.itemName + col.unitQuantity + col.netPrice, newTableTop, { width: col.netPrice, continued: false });
                doc.text('Stawka', leftMargin + col.no + col.itemName + col.unitQuantity + col.netPrice + col.taxRate, newTableTop, { width: col.taxRate, continued: false });
                doc.text('Wartość netto', leftMargin + col.no + col.itemName + col.unitQuantity + col.netPrice + col.taxRate + col.netTotal, newTableTop, { width: col.netTotal, continued: false });
                doc.text('Wartość brutto', leftMargin + col.no + col.itemName + col.unitQuantity + col.netPrice + col.taxRate + col.netTotal + col.grossTotal, newTableTop, { width: col.grossTotal, continued: false });

                doc.moveDown(0.6);
                const newLineY = doc.y;
                doc.moveTo(leftMargin, newLineY)
                    .lineTo(550, newLineY)
                    .stroke();
                doc.moveDown(0.6);
                doc.font('Helvetica').fontSize(7);
            }

            const rowY = doc.y;

            doc.text((index + 1).toString(), leftMargin, rowY, { width: col.no, continued: false });
            doc.text(item.itemName || item.description || 'N/A', leftMargin + col.no, rowY, { width: col.itemName, continued: false });
            doc.text(item.uom || item.UOM || '-', leftMargin + col.no + col.itemName, rowY, { width: col.uom, continued: false });
            doc.text(item.unitQuantity || item.quantity || '-', leftMargin + col.no + col.itemName + col.uom, rowY, { width: col.unitQuantity, continued: false });
            doc.text(item.netPrice || item.unitPrice || '-', leftMargin + col.no + col.itemName + col.unitQuantity, rowY, { width: col.netPrice, continued: false });
            doc.text(item.taxRate || taxRate + '%' || '-', leftMargin + col.no + col.itemName + col.unitQuantity + col.netPrice + col.taxRate, rowY, { width: col.taxRate, continued: false });
            doc.text(item.netTotal || item.total || '-', leftMargin + col.no + col.itemName + col.unitQuantity + col.netPrice + col.taxRate, rowY, { width: col.netTotal, continued: false });
            doc.text(item.grossTotal || item.total * (1 + taxRate / 100) || '-', leftMargin + col.no + col.itemName + col.unitQuantity + col.netPrice + col.taxRate + col.netTotal, rowY, { width: col.grossTotal, continued: false });

            doc.moveDown(0.6);
        });

        doc.moveDown(1);
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


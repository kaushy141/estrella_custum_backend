const fs = require('fs');
const path = require('path');
const PdfPrinter = require('pdfmake');

const defaultFonts = {
    Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
    }
};
/**
 * Generate a PZ document PDF using pdfmake/react-pdfmake compatible definition.
 * @param {Object} params
 * @param {Object} params.info - Document meta information (everything except the items table).
 * @param {Array} params.items - Item rows for the table.
 * @param {string} params.outputPath - Output file path.
 * @returns {Promise<string>} Returns the output path when file is written.
 */
async function generatePZDocumentPdfmake({ info = {}, items = [], outputPath }) {
    if (!outputPath) {
        throw new Error('Missing outputPath for PDF generation');
    }

    const {
        logo,
        logoPath,
        documentTitle,
        documentNumber,
        issueDate,
        warehouse,
        recipient = {},
        supplier = {},
        currency = 'PLN',
        notes,
        notesLabel = 'Uwagi',
        totals = {},
        summaryRows = [],
        footerText,
        signatures = {}
    } = info;

    const fonts = info.fonts || defaultFonts;
    const printerInstance = new PdfPrinter(fonts);

    const recipientText = buildPartyBlock(recipient);
    const supplierText = buildPartyBlock(supplier);
    const resolvedLogo = resolveLogoSource(logo, logoPath);

    const computedTotals = calculateTotals(items, totals, currency);

    const tableColumnWidths = [20, 172, 38, 23, 62, 34, 55, 60]; // total 464pt to respect margins

    const headerRow = [
        { text: 'Lp.', style: 'tableHeader', alignment: 'center' },
        { text: 'Nazwa', style: 'tableHeader' },
        { text: 'Jedn', style: 'tableHeader', alignment: 'center' },
        { text: 'Ilość', style: 'tableHeader', alignment: 'right' },
        { text: 'Cena netto', style: 'tableHeader', alignment: 'right' },
        { text: 'Stawka', style: 'tableHeader', alignment: 'center' },
        { text: 'Wartość netto', style: 'tableHeader', alignment: 'right' },
        { text: 'Wartość brutto', style: 'tableHeader', alignment: 'right' }
    ];

    const itemsBody = [
        headerRow,
        ...items.map((item, index) => [
            { text: String(index + 1), alignment: 'center', fontSize: 8, margin: [0, 2, 0, 2] },
            {
                text: item.name || item.description || '',
                alignment: 'left',
                fontSize: 8,
                margin: [0, 2, 0, 2]
            },
            { text: item.unit || item.uom || '', alignment: 'center', fontSize: 8, margin: [0, 2, 0, 2] },
            { text: formatNumber(item.quantity), alignment: 'right', fontSize: 8, margin: [0, 2, 0, 2] },
            { text: formatCurrency(item.unitPrice, currency), alignment: 'right', fontSize: 8, margin: [0, 2, 0, 2] },
            { text: item.taxRate ? `${item.taxRate}` : '23%', alignment: 'center', fontSize: 8, margin: [0, 2, 0, 2] },
            { text: formatCurrency(item.netAmount ?? item.netTotal ?? item.net, currency), alignment: 'right', fontSize: 8, margin: [0, 2, 0, 2] },
            { text: formatCurrency(item.grossAmount ?? item.grossTotal ?? item.gross, currency), alignment: 'right', fontSize: 8, margin: [0, 2, 0, 2] }
        ])
    ];

    const content = [];

    if (resolvedLogo) {
        content.push({
            image: resolvedLogo,
            width: 140,
            alignment: 'left',
            margin: [0, 0, 0, 10]
        });
    }

    content.push({
        columns: [
            {
                width: '*',
                stack: [
                    { text: 'Odbiorca', style: 'label' },
                    { text: recipientText || 'Brak danych', style: 'field' }
                ]
            },
            {
                width: '*',
                stack: [
                    { text: 'Dostawca', style: 'label' },
                    { text: supplierText || 'Brak danych', style: 'field' }
                ]
            },
            {
                width: 'auto',
                table: {
                    widths: ['*'],
                    body: [
                        [
                            {
                                text: documentTitle || documentNumber || 'PZ',
                                style: 'docInfoTitle',
                                alignment: 'center',
                                margin: [0, 3, 0, 6]
                            }
                        ],
                        [{ text: `Data wystawienia: ${issueDate || '-'}`, style: 'docInfoRow' }],
                        [{ text: `Magazyn: ${warehouse || '-'}`, style: 'docInfoRow' }],
                        ...(documentNumber
                            ? [[{ text: `Numer dokumentu: ${documentNumber}`, style: 'docInfoRow' }]]
                            : [])
                    ]
                },
                layout: {
                    hLineWidth: () => 0.5,
                    vLineWidth: () => 0.5,
                    paddingLeft: () => 8,
                    paddingRight: () => 8,
                    paddingTop: () => 3,
                    paddingBottom: () => 3
                }
            }
        ],
        columnGap: 16,
        margin: [0, 0, 0, 20]
    });

    content.push({
        text: documentTitle || documentNumber || 'PZ',
        style: 'title',
        alignment: 'center',
        margin: [0, 0, 0, 14]
    });

    if (Array.isArray(summaryRows) && summaryRows.length > 0) {
        content.push({
            style: 'infoTable',
            table: {
                widths: ['*', '*'],
                body: summaryRows.map(row => [
                    row.label || '',
                    { text: formatCurrency(row.value, currency) || '', alignment: 'right' }
                ])
            },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 15]
        });
    }

    content.push({
        table: {
            widths: tableColumnWidths,
            body: itemsBody
        },
        layout: {
            hLineWidth: () => 0.7,
            vLineWidth: () => 0.7,
            paddingLeft: (rowIndex) => (rowIndex === 0 ? 4 : 3),
            paddingRight: (rowIndex) => (rowIndex === 0 ? 4 : 3),
            paddingTop: (rowIndex) => (rowIndex === 0 ? 4 : 5),
            paddingBottom: () => 4
        },
        margin: [0, 0, 0, 15]
    });

    if (computedTotals.net != null || computedTotals.gross != null) {
        content.push({
            columns: [
                { width: '*', text: '' },
                {
                    width: 'auto',
                    table: {
                        widths: ['auto', 'auto'],
                        body: [
                            ...(computedTotals.net != null ? [['Razem netto', formatCurrency(computedTotals.net, currency)]] : []),
                            ...(computedTotals.gross != null ? [['Razem brutto', formatCurrency(computedTotals.gross, currency)]] : [])
                        ]
                    },
                    layout: {
                        hLineWidth: () => 0.7,
                        vLineWidth: () => 0.7,
                        paddingLeft: () => 6,
                        paddingRight: () => 6,
                        paddingTop: () => 4,
                        paddingBottom: () => 4
                    },
                    style: 'summaryTable'
                }
            ],
            columnGap: 12,
            margin: [0, 8, 0, 0]
        });
    }

    if (notes) {
        content.push({ text: notesLabel, style: 'label', margin: [0, 12, 0, 4] });

        if (Array.isArray(notes)) {
            content.push({
                ul: notes.map(note => (typeof note === 'string' ? note : String(note))),
                style: 'notesList'
            });
        } else {
            content.push({
                text: notes,
                style: 'notes',
                margin: [0, 0, 0, 0]
            });
        }
    }

    content.push({
        columns: [
            buildSignatureColumn('Wydał', signatures.issuedBy),
            buildSignatureColumn('Odebrał', signatures.receivedBy)
        ],
        columnGap: 40,
        margin: [0, 25, 0, 0]
    });

    if (footerText) {
        content.push({
            text: footerText,
            style: 'footerNote',
            alignment: 'center',
            margin: [0, 20, 0, 0]
        });
    }

    const docDefinition = {
        content,
        styles: {
            title: {
                fontSize: 16,
                bold: true
            },
            label: {
                fontSize: 9,
                bold: true,
                margin: [0, 0, 0, 5]
            },
            field: {
                fontSize: 9,
                lineHeight: 1.2
            },
            tableHeader: {
                bold: true,
                fillColor: '#f2f2f2'
            },
            docInfoTitle: {
                fontSize: 11,
                bold: true
            },
            docInfoRow: {
                fontSize: 9,
                margin: [0, 0, 0, 2]
            },
            summaryTable: {
                margin: [0, 10, 0, 0]
            },
            notes: {
                fontSize: 8,
                italics: true
            },
            notesList: {
                fontSize: 8,
                lineHeight: 1.3
            },
            signatureLabel: {
                fontSize: 9,
                bold: true,
                margin: [0, 0, 0, 4]
            },
            signatureLine: {
                margin: [0, 30, 0, 6]
            },
            signatureHint: {
                fontSize: 8,
                italics: true
            },
            footerNote: {
                fontSize: 8,
                italics: true
            },
            infoTable: {
                fontSize: 9
            }
        },
        defaultStyle: {
            font: 'Roboto',
            fontSize: 9
        },
        footer: (currentPage, pageCount) => ({
            text: `Strona ${currentPage} z ${pageCount}`,
            alignment: 'center',
            margin: [0, 10, 0, 0],
            fontSize: 8
        }),
        pageMargins: [40, 40, 40, 60]
    };

    await ensureDirectoryExists(path.dirname(outputPath));

    await new Promise((resolve, reject) => {
        const pdfDoc = printerInstance.createPdfKitDocument(docDefinition);
        const stream = fs.createWriteStream(outputPath);

        pdfDoc.pipe(stream);
        pdfDoc.end();

        stream.on('finish', resolve);
        stream.on('error', reject);
        pdfDoc.on('error', reject);
    });

    return outputPath;
}

function buildPartyBlock(party) {
    if (!party || typeof party !== 'object') {
        return '';
    }

    return [
        party.name,
        party.address,
        party.city,
        party.postalCode,
        party.country,
        party.taxId ? `NIP: ${party.taxId}` : null,
        party.extra ? []
            .concat(party.extra)
            .filter(Boolean)
            .join('\n')
            : null
    ]
        .flat()
        .filter(Boolean)
        .join('\n');
}

function resolveLogoSource(logo, logoPath) {
    if (typeof logo === 'string' && logo.trim()) {
        return logo;
    }

    if (typeof logoPath === 'string' && logoPath.trim()) {
        const absolutePath = path.isAbsolute(logoPath)
            ? logoPath
            : path.join(process.cwd(), logoPath);

        if (fs.existsSync(absolutePath)) {
            return absolutePath;
        }
    }

    return null;
}

function buildSignatureColumn(label, value) {
    return {
        width: '*',
        stack: [
            { text: label, style: 'signatureLabel' },
            { text: '______________________________', style: 'signatureLine' },
            {
                text: value || 'Podpis osoby upoważnionej',
                style: 'signatureHint',
                alignment: 'center'
            }
        ]
    };
}

function calculateTotals(items, totals, currency) {
    const aggregated = {
        net: parseNumber(totals?.net),
        gross: parseNumber(totals?.gross)
    };

    if (aggregated.net != null && aggregated.gross != null) {
        return aggregated;
    }

    let computedNet = 0;
    let computedGross = 0;
    let hasNet = false;
    let hasGross = false;

    items.forEach(item => {
        const netAmount = parseNumber(item.netAmount ?? item.netTotal ?? item.net);
        const grossAmount = parseNumber(item.grossAmount ?? item.grossTotal ?? item.gross);

        if (netAmount != null) {
            computedNet += netAmount;
            hasNet = true;
        }

        if (grossAmount != null) {
            computedGross += grossAmount;
            hasGross = true;
        }
    });

    return {
        net: aggregated.net != null ? aggregated.net : hasNet ? computedNet : null,
        gross: aggregated.gross != null ? aggregated.gross : hasGross ? computedGross : (hasNet ? computeGrossFromNet(computedNet, totals?.taxRate || items?.[0]?.taxRate) : null)
    };
}

function computeGrossFromNet(netValue, taxRate) {
    const netNumber = parseNumber(netValue);
    if (netNumber == null) {
        return null;
    }

    const rateNumber = parseNumber(
        typeof taxRate === 'string'
            ? taxRate.replace('%', '')
            : taxRate
    );

    if (rateNumber == null) {
        return null;
    }

    return netNumber * (1 + rateNumber / 100);
}

function formatNumber(value) {
    if (value == null || value === '') {
        return '';
    }

    if (typeof value === 'string' && value.trim()) {
        const parsed = parseNumber(value);
        if (parsed == null) {
            return value;
        }
        return parsed.toLocaleString('pl-PL');
    }

    const number = Number(value);
    return Number.isFinite(number) ? number.toLocaleString('pl-PL') : '';
}

function formatCurrency(value, currency) {
    if (value == null || value === '') {
        return '';
    }

    if (typeof value === 'string' && value.trim()) {
        const parsed = parseNumber(value);
        if (parsed == null) {
            return value;
        }
        return `${parsed.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
    }

    const number = Number(value);
    if (!Number.isFinite(number)) {
        return '';
    }
    return `${number.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function parseNumber(value) {
    if (value == null || value === '') {
        return null;
    }

    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }

    if (typeof value === 'string') {
        const normalized = value
            .replace(/\s/g, '')
            .replace(',', '.')
            .replace(/[^\d.-]/g, '');
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
}

async function ensureDirectoryExists(dirPath) {
    await fs.promises.mkdir(dirPath, { recursive: true });
}

module.exports = {
    generatePZDocumentPdfmake
};


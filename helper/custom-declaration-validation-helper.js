/**
 * validateCrossCheck.js
 *
 * Single-method validator that cross-checks one-or-more invoices against a parsed customs declaration.
 * - No external dependencies (pure JS).
 * - Returns an object matching the requested schema:
 *   {
 *     ValidationSummary: { Overall_Match_Score, Overall_Status, Overall_Risk_Level, Remarks },
 *     Sections: { Identification_Check, Importer_Exporter_Details, Goods_and_HSCode_Validation, Valuation_and_Currency_Conversion_Check, Legal_and_Compliance_Check, Tax_and_Duty_Validation, Translation_and_Description_Check, Fraud_and_Risk_Assessment },
 *     Legal_Check_Summary: { EU_Customs_Code_Compliance, Polish_Customs_Act_Compliance, VAT_Act_Compliance }
 *   }
 *
 * Usage:
 *   const report = validateCrossCheck(invoicesArray, declarationObject);
 *
 * Notes:
 *  - invoicesArray: array of invoice objects (as you provided).
 *  - declarationObject: single extracted declaration JSON (as you provided).
 *  - Currency conversion tolerance: 0.5% (configurable inside function).
 */

function validateCrossCheck(invoices = [], declaration = {}) {
    // --- helpers ---
    const safeNum = v => {
        if (v === null || v === undefined || v === '') return NaN;
        if (typeof v === 'number') return v;
        // remove commas and non-numeric chars except dot and minus
        const s = String(v).replace(/[ ,]+/g, '').replace(/[^\d.\-]/g, '');
        const n = Number(s);
        return Number.isFinite(n) ? n : NaN;
    };

    const round = (v, dp = 4) => {
        if (!Number.isFinite(v)) return null;
        const m = Math.pow(10, dp);
        return Math.round(v * m) / m;
    };

    const pct = (num, den) => {
        if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
        return (num / den) * 100;
    };

    // weights used to compute overall score (same as previously agreed)
    const WEIGHTS = {
        Identification: 10,
        ImporterExporter: 10,
        GoodsHS: 15,
        ValuationCurrency: 20,
        LegalCompliance: 15,
        TaxDuty: 10,
        Translation: 10,
        FraudRisk: 10
    };

    // --- pre-normalize input ---
    const invoicesList = Array.isArray(invoices) ? invoices : [invoices];
    const firstInvoice = invoicesList[0] || {};

    // aggregate invoice totals (USD assumed)
    let invoiceTotalUSD_fromInvoices = 0;
    let invoiceTotalItemsDetected = false;
    for (const inv of invoicesList) {
        // prefer explicit numeric totalValue; else sum item totals
        const t = safeNum((inv.totalValue ?? inv.total) || inv.totalInvoice || inv.invoiceTotal);
        if (Number.isFinite(t) && t !== 0) {
            invoiceTotalUSD_fromInvoices += t;
            invoiceTotalItemsDetected = true;
            continue;
        }
        // sum item totals if present
        if (Array.isArray(inv.items) && inv.items.length > 0) {
            const sumItems = inv.items.reduce((s, it) => s + (safeNum(it.total) || 0), 0);
            invoiceTotalUSD_fromInvoices += sumItems;
            if (sumItems > 0) invoiceTotalItemsDetected = true;
        }
    }

    // fallback: if none found, try declaration Delivery_Receipt_Part_III.Invoice_value (may be USD)
    const delivery = declaration.Delivery_Receipt_Part_III || {};
    const declInvoiceValueRaw = delivery.Invoice_value ?? delivery.InvoiceValue ?? null;
    const declInvoiceCurrency = (delivery.Invoice_currency || delivery.Invoice_currency || 'USD') || 'USD';
    const declInvoiceValueNum = safeNum(declInvoiceValueRaw);

    // choose authoritative invoice USD value: prefer declaration invoice_value if currency is USD and numeric, else invoices aggregate
    let invoiceTotalUSD = NaN;
    if (Number.isFinite(declInvoiceValueNum) && (String(declInvoiceCurrency).toUpperCase() === 'USD')) {
        invoiceTotalUSD = declInvoiceValueNum;
    } else if (invoiceTotalItemsDetected) {
        invoiceTotalUSD = invoiceTotalUSD_fromInvoices;
    } else {
        invoiceTotalUSD = Number.NaN;
    }

    // declared conversion rate: invoice.conversionRate (first invoice) or Registration_Declaration_Part_II.Currency_Exchange_Rate
    const conversionDeclared =
        safeNum(firstInvoice.conversionRate ?? firstInvoice.conversion_rate ?? declaration.Registration_Declaration_Part_II?.Currency_Exchange_Rate ?? declaration.Registration_Declaration_Part_II?.Currency_Exchange_Rate);

    // declared PLN/statistical value in declaration: try common fields
    const otherV = declaration.Other_Information_Part_V || {};
    const declaredPLN_candidates = [
        // Delivery_Receipt may have a PLN value if Invoice_currency not USD
        safeNum(declaration.Delivery_Receipt_Part_III?.Invoice_value && String(declaration.Delivery_Receipt_Part_III?.Invoice_currency).toUpperCase() === 'PLN' ? declaration.Delivery_Receipt_Part_III.Invoice_value : NaN),
        // tax base(s)
        ...(Array.isArray(otherV.Tax) ? otherV.Tax.map(t => safeNum(t.Base)) : []),
        // Statistical value
        safeNum(otherV.Statistical_Value ?? otherV.Stat_Value ?? otherV.Stat_Value_Pln)
    ].filter(v => Number.isFinite(v));

    const declaredPLN = declaredPLN_candidates.length > 0 ? declaredPLN_candidates[0] : null;

    // --- Section validators (single-method implementation) ---
    // 1) Identification
    (function identificationSection() { }); // placeholder, we'll compute below

    // Utility for status from score
    function statusFromScore(score, thresholds = { pass: 100, attention: 70 }) {
        if (score >= thresholds.pass) return 'PASS';
        if (score >= thresholds.attention) return 'REQUIRES_ATTENTION';
        return 'FAIL';
    }

    // SECTION: Identification_Check
    const identificationIssues = [];
    let identificationScore = 100;
    const certPartI = declaration.Certified_Customs_Declaration_Part_I || {};
    const mrn = certPartI.Number_MRN || certPartI.MRN || '';
    const lrn = certPartI.Number_LRN || certPartI.LRN || '';
    const invoiceNumbers = invoicesList.map(i => (i.invoiceNumber || i.invoice_no || i.number || '').toString().trim()).filter(Boolean);

    if (!mrn) {
        identificationIssues.push('MRN missing in declaration');
        identificationScore -= 50;
    }
    if (!lrn) {
        // not always required; small penalty
        identificationIssues.push('LRN missing or not provided');
        identificationScore -= 10;
    }
    if (invoiceNumbers.length === 0) {
        identificationIssues.push('No invoice numbers found in invoices');
        identificationScore -= 40;
    }
    // date checks (basic)
    const creationDate = certPartI.Creation_Date || certPartI.CreationDate || declaration.Creation_Date;
    if (!creationDate) {
        identificationIssues.push('Declaration creation date missing');
        identificationScore -= 10;
    }

    identificationScore = Math.max(0, identificationScore);
    const Identification_Check = {
        Match_Score: round(identificationScore, 2),
        Status: statusFromScore(identificationScore, { pass: 100, attention: 70 }),
        Issues: identificationIssues,
        Comments: 'Identification checked (MRN, LRN, invoice numbers, dates).'
    };

    // SECTION: Importer_Exporter_Details
    let importerExporterScore = 100;
    const importerIssues = [];
    const declImporter = declaration.Registration_Declaration_Part_II?.Importer || {};
    const importerNIP = declImporter.NIP || declImporter.nip || '';
    const invoiceImporterText = (firstInvoice.consignee || firstInvoice.buyer || firstInvoice.consignee_name || '').toString().trim();
    const declCompany = certPartI.Company_Name || declaration.Company_Name || '';

    if (!importerNIP) {
        importerIssues.push('Importer NIP missing in declaration');
        importerExporterScore -= 40;
    }
    // basic name fuzzy-contained check (simple, case-insensitive)
    const normalize = s => (s || '').toString().toLowerCase().replace(/\s+/g, ' ').trim();
    if (declCompany && invoiceImporterText) {
        const dn = normalize(declCompany);
        const iname = normalize(invoiceImporterText);
        if (!dn.includes(iname) && !iname.includes(dn)) {
            importerIssues.push('Importer/Consignee name differs between declaration and invoice(s)');
            importerExporterScore -= 20;
        }
    }

    importerExporterScore = Math.max(0, importerExporterScore);
    const Importer_Exporter_Details = {
        Match_Score: round(importerExporterScore, 2),
        Status: statusFromScore(importerExporterScore, { pass: 100, attention: 70 }),
        Issues: importerIssues,
        Comments: 'Importer and exporter identity checks performed (NIP, names).'
    };

    // SECTION: Goods_and_HSCode_Validation
    let goodsScore = 100;
    const goodsIssues = [];
    const declGoods = declaration.Goods_Part_IV || {};
    const declCN = declGoods.CN_Code || declGoods.Taric || declGoods.CN || null;
    const invoiceItems = (invoicesList[0] && invoicesList[0].items) || [];

    if (!declCN) {
        goodsIssues.push('Declaration CN code missing');
        goodsScore -= 30;
    }

    if (declCN && invoiceItems.length > 0) {
        const declCNStr = String(declCN).replace(/\D/g, '').slice(0, 6); // first 4-6 digits relevant
        const mismatches = [];
        invoiceItems.forEach((it, idx) => {
            const itHS = it.HSCode ?? it.HSNCode ?? it.HS;
            const itHSs = itHS !== undefined && itHS !== null ? String(itHS).replace(/\D/g, '') : '';
            if (!itHSs) {
                mismatches.push(`Item ${idx + 1} missing HS code`);
            } else {
                // compare first 4 digits (safer) if possible
                const samePrefix = declCNStr && itHSs.startsWith(declCNStr.slice(0, 4));
                if (!samePrefix) {
                    mismatches.push(`Item ${idx + 1} HS ${itHSs} does not match declaration CN ${declCNStr}`);
                }
            }
        });
        if (mismatches.length > 0) {
            goodsIssues.push(...mismatches);
            goodsScore -= Math.min(50, mismatches.length * 10);
        }
    }

    if (goodsScore < 0) goodsScore = 0;
    const Goods_and_HSCode_Validation = {
        Match_Score: round(goodsScore, 2),
        Status: statusFromScore(goodsScore, { pass: 100, attention: 75 }),
        Issues: goodsIssues,
        Comments: 'HS/CN codes compared (basic prefix check).'
    };

    // SECTION: Valuation_and_Currency_Conversion_Check
    let valuationScore = 100;
    const valuationIssues = [];
    const tolerancePercent = 0.5; // allowed variance percent
    // determine invoice USD total and declared conversion rate
    const declaredRate = Number.isFinite(conversionDeclared) ? conversionDeclared : null;

    if (!Number.isFinite(invoiceTotalUSD)) {
        valuationIssues.push('Unable to determine invoice USD total from provided invoices/declaration.');
        valuationScore -= 40;
    }

    if (!Number.isFinite(declaredRate)) {
        valuationIssues.push('Conversion rate not provided in input.');
        valuationScore -= 50;
    }

    // compute recalculated PLN = invoiceTotalUSD * declaredRate
    let recalculatedPLN = null;
    if (Number.isFinite(invoiceTotalUSD) && Number.isFinite(declaredRate)) {
        recalculatedPLN = invoiceTotalUSD * declaredRate;
        recalculatedPLN = round(recalculatedPLN, 2);
    }

    // compare to declared PLN (if present)
    let conversionVariancePercent = null;
    if (recalculatedPLN !== null && Number.isFinite(declaredPLN)) {
        const diff = Math.abs(recalculatedPLN - declaredPLN);
        conversionVariancePercent = (diff / declaredPLN) * 100;
        conversionVariancePercent = round(conversionVariancePercent, 4);
        if (conversionVariancePercent > tolerancePercent) {
            valuationIssues.push(`Conversion variance ${conversionVariancePercent}% exceeds tolerance ${tolerancePercent}%`);
            valuationScore -= 40;
        }
    } else {
        // if declaredPLN not present, penalize lightly but keep recalculation
        if (recalculatedPLN !== null && declaredPLN === null) {
            valuationIssues.push('Declared PLN total not found in declaration; could not fully verify conversion.');
            valuationScore -= 15;
        }
    }

    // basic freight/insurance sanity check
    const freight = safeNum(firstInvoice.totalFreightAmount ?? firstInvoice.freight ?? firstInvoice.totalFreight);
    const insurance = safeNum(firstInvoice.totalInsuranceAmount ?? firstInvoice.insurance ?? firstInvoice.insuranceAmount);
    if (Number.isFinite(freight) && Number.isFinite(invoiceTotalUSD) && invoiceTotalUSD > 0) {
        if (((freight + (Number.isFinite(insurance) ? insurance : 0)) / invoiceTotalUSD) > 5) {
            // Extremely large freight relative to goods (heuristic)
            valuationIssues.push('Freight/insurance very large relative to invoice value — suspicious.');
            valuationScore -= 10;
        }
    }

    valuationScore = Math.max(0, valuationScore);
    const Valuation_and_Currency_Conversion_Check = {
        Match_Score: round(valuationScore, 2),
        Status: statusFromScore(valuationScore, { pass: 100, attention: 70 }),
        Issues: valuationIssues,
        ConversionRate_Declared: Number.isFinite(declaredRate) ? round(declaredRate, 6) : null,
        ConversionRate_Recalculated: Number.isFinite(declaredRate) && Number.isFinite(invoiceTotalUSD) ? round(declaredRate, 6) : null,
        ConversionVariancePercent: conversionVariancePercent,
        Comments: valuationIssues.length === 0 ? 'Currency conversion validated within tolerance (if declared PLN present).' : valuationIssues.join('; ')
    };

    // SECTION: Legal_and_Compliance_Check
    let legalScore = 100;
    const legalIssues = [];
    const valMethod = declaration.Goods_Part_IV?.Valuation_method || declaration.Goods_Part_IV?.valuation_method;
    if (!valMethod) {
        legalIssues.push('Valuation method missing in declaration.');
        legalScore -= 30;
    }
    const otherInfo = declaration.Other_Information_Part_V || {};
    if (!otherInfo.GRN && !otherInfo.Guaranty && !otherInfo.Guarantee) {
        // GRN not strictly mandatory in all cases, but penalize lightly so it flags
        legalIssues.push('Guarantee/GRN not present in Other Information (check requirement).');
        legalScore -= 10;
    }

    legalScore = Math.max(0, legalScore);
    const Legal_and_Compliance_Check = {
        Match_Score: round(legalScore, 2),
        Status: statusFromScore(legalScore, { pass: 100, attention: 75 }),
        Issues: legalIssues,
        Legal_References: ['EU Customs Code', 'Polish Customs Law', 'Polish VAT Act'],
        Comments: 'Basic legal fields presence verified.',
        EU_Customs_Code_Compliance: legalScore >= 75,
        Polish_Customs_Act_Compliance: legalScore >= 75,
        VAT_Act_Compliance: legalScore >= 75
    };

    // SECTION: Tax_and_Duty_Validation
    let taxScore = 100;
    const taxIssues = [];
    const taxBlock = (otherV && Array.isArray(otherV.Tax) && otherV.Tax.length > 0) ? otherV.Tax : (otherV && otherV.tax && Array.isArray(otherV.tax) ? otherV.tax : null);
    if (!taxBlock || taxBlock.length === 0) {
        taxIssues.push('Tax block missing in declaration.');
        taxScore -= 40;
    } else {
        // verify first tax line VAT base * rate = sum (tolerance 0.5%)
        const firstTax = taxBlock[0];
        const taxBase = safeNum(firstTax.Base ?? firstTax.base ?? firstTax.Baza ?? firstTax.B);
        const taxRateRaw = (firstTax.Rate ?? firstTax.rate ?? firstTax.RatePercent ?? firstTax.R).toString?.() ?? '';
        const taxRateNum = safeNum(taxRateRaw.replace?.('%', '') ?? taxRateRaw) / 100;
        const taxSumDeclared = safeNum(firstTax.Sum ?? firstTax.sum ?? firstTax.Summa ?? firstTax.S);

        if (!Number.isFinite(taxBase) || !Number.isFinite(taxRateNum) || !Number.isFinite(taxSumDeclared)) {
            taxIssues.push('Tax base/rate/sum not numeric or missing.');
            taxScore -= 30;
        } else {
            const computed = taxBase * taxRateNum;
            const diff = Math.abs(computed - taxSumDeclared);
            const relPct = taxBase > 0 ? (diff / taxBase) * 100 : 0;
            if (relPct > 0.5) {
                taxIssues.push(`VAT computation mismatch: computed ${round(computed, 2)} vs declared ${taxSumDeclared} (relative ${round(relPct, 4)}%)`);
                taxScore -= 40;
            }
        }
    }

    taxScore = Math.max(0, taxScore);
    const Tax_and_Duty_Validation = {
        Match_Score: round(taxScore, 2),
        Status: statusFromScore(taxScore, { pass: 100, attention: 70 }),
        Issues: taxIssues,
        Comments: 'Tax block verification performed (basic numeric checks).'
    };

    // SECTION: Translation_and_Description_Check
    let translationScore = 100;
    const translationIssues = [];
    const declDesc = (declaration.Goods_Part_IV?.Goods_description || declaration.Goods_Part_IV?.GoodsDescription || '').toString().trim();
    if (!declDesc) {
        translationIssues.push('Declaration goods description missing.');
        translationScore -= 30;
    } else if (invoiceItems.length === 0) {
        // if no item-level descriptions available, slightly reduce confidence
        translationIssues.push('No item descriptions present in invoices to compare against declaration.');
        translationScore -= 15;
    } else {
        // check that at least some normalized invoice descriptors appear in declaration description
        const declNorm = normalize(declDesc);
        let matchedCount = 0;
        for (const it of invoiceItems) {
            const candidate = normalize(it.description || it.category || it.name || '');
            if (!candidate) continue;
            if (declNorm.includes(candidate) || candidate.includes(declNorm) || declNorm.includes(candidate.split(' ').slice(0, 3).join(' '))) {
                matchedCount++;
            }
        }
        if (matchedCount === 0) {
            translationIssues.push('No invoice item descriptions matched declaration description (possible translation/mapping issue).');
            translationScore -= 25;
        } else if (matchedCount < invoiceItems.length) {
            translationIssues.push('Some invoice item descriptions did not match declaration description.');
            translationScore -= 10;
        }
    }

    translationScore = Math.max(0, translationScore);
    const Translation_and_Description_Check = {
        Match_Score: round(translationScore, 2),
        Status: statusFromScore(translationScore, { pass: 100, attention: 80 }),
        Issues: translationIssues,
        Comments: 'Multilingual description/translation consistency checks (basic substring matching).'
    };

    // SECTION: Fraud_and_Risk_Assessment (heuristic)
    let riskScore = 0; // 0..100 (higher = more risky)
    const fraudAnomalies = [];
    // Missing MRN increases risk
    if (!mrn) {
        riskScore += 30;
        fraudAnomalies.push('Missing MRN');
    }
    // Large freight/insurance relative to invoice
    const invoiceVal = Number.isFinite(invoiceTotalUSD) ? invoiceTotalUSD : 0;
    const freightNum = Number.isFinite(freight) ? freight : 0;
    const insuranceNum = Number.isFinite(insurance) ? insurance : 0;
    if (invoiceVal > 0 && ((freightNum + insuranceNum) / invoiceVal) > 0.5) {
        riskScore += 25;
        fraudAnomalies.push('High freight/insurance relative to invoice value');
    }
    // HS mismatches increase risk
    if (Goods_and_HSCode_Validation.Issues && Goods_and_HSCode_Validation.Issues.length > 0) {
        riskScore += 20;
        fraudAnomalies.push('HS/CN mismatches detected');
    }
    // Conversion variance too large increases risk
    if (Valuation_and_Currency_Conversion_Check.ConversionVariancePercent !== null && Valuation_and_Currency_Conversion_Check.ConversionVariancePercent !== undefined) {
        const cv = Valuation_and_Currency_Conversion_Check.ConversionVariancePercent;
        if (cv > tolerancePercent) {
            riskScore += 30;
            fraudAnomalies.push(`Currency conversion variance ${cv}% > ${tolerancePercent}%`);
        } else if (cv > (tolerancePercent / 2)) {
            riskScore += 10;
            fraudAnomalies.push(`Currency conversion variance moderate ${cv}%`);
        }
    } else {
        // if we couldn't verify conversion, small increase
        riskScore += 5;
        fraudAnomalies.push('Conversion not fully verifiable');
    }

    riskScore = Math.min(100, Math.max(0, Math.round(riskScore)));
    const fraudMatchScore = Math.max(0, 100 - riskScore);
    let riskLevel = 'LOW';
    if (riskScore >= 60) riskLevel = 'HIGH';
    else if (riskScore >= 30) riskLevel = 'MEDIUM';

    const Fraud_and_Risk_Assessment = {
        Match_Score: round(fraudMatchScore, 2),
        Status: riskScore >= 60 ? 'REQUIRES_ATTENTION' : 'PASS',
        Risk_Score: riskScore,
        Risk_Level: riskLevel,
        Anomalies: fraudAnomalies,
        Comments: 'Heuristic fraud scan completed.'
    };

    // --- compute overall weighted score ---
    const sectionScores = {
        Identification: Identification_Check.Match_Score,
        ImporterExporter: Importer_Exporter_Details.Match_Score,
        GoodsHS: Goods_and_HSCode_Validation.Match_Score,
        ValuationCurrency: Valuation_and_Currency_Conversion_Check.Match_Score,
        LegalCompliance: Legal_and_Compliance_Check.Match_Score,
        TaxDuty: Tax_and_Duty_Validation.Match_Score,
        Translation: Translation_and_Description_Check.Match_Score,
        FraudRisk: Fraud_and_Risk_Assessment.Match_Score
    };

    let totalWeight = 0;
    let weightedSum = 0;
    for (const k in WEIGHTS) {
        const w = WEIGHTS[k] || 0;
        totalWeight += w;
        const sc = Number.isFinite(sectionScores[k]) ? sectionScores[k] : 0;
        weightedSum += (sc * w);
    }
    const Overall_Match_Score = round(weightedSum / totalWeight, 2);

    // compute overall status
    const anyFail = [
        Identification_Check.Status,
        Importer_Exporter_Details.Status,
        Goods_and_HSCode_Validation.Status,
        Valuation_and_Currency_Conversion_Check.Status,
        Legal_and_Compliance_Check.Status,
        Tax_and_Duty_Validation.Status,
        Translation_and_Description_Check.Status
    ].some(s => s === 'FAIL');

    const anyAttention = [
        Goods_and_HSCode_Validation.Status,
        Valuation_and_Currency_Conversion_Check.Status,
        Translation_and_Description_Check.Status,
        Importer_Exporter_Details.Status
    ].some(s => s === 'REQUIRES_ATTENTION');

    const Overall_Status = anyFail ? 'FAIL' : (anyAttention ? 'REQUIRES_ATTENTION' : 'PASS');

    // overall risk level from fraud
    const Overall_Risk_Level = Fraud_and_Risk_Assessment.Risk_Level;

    // Remarks: combine a short set of actionable remarks
    const remarksParts = [];
    if (Goods_and_HSCode_Validation.Issues.length) remarksParts.push('HS code mismatches');
    if (Valuation_and_Currency_Conversion_Check.Issues.length) remarksParts.push('Currency conversion issues');
    if (Translation_and_Description_Check.Issues.length) remarksParts.push('Description/translation mismatches');
    if (Fraud_and_Risk_Assessment.Anomalies.length) remarksParts.push('Fraud heuristics flagged');

    const Remarks = remarksParts.length ? remarksParts.join('; ') : 'No major issues detected';

    // Final output object
    const output = {
        ValidationSummary: {
            Overall_Match_Score,
            Overall_Status,
            Overall_Risk_Level,
            Remarks
        },
        Sections: {
            Identification_Check,
            Importer_Exporter_Details,
            Goods_and_HSCode_Validation,
            Valuation_and_Currency_Conversion_Check,
            Legal_and_Compliance_Check,
            Tax_and_Duty_Validation,
            Translation_and_Description_Check,
            Fraud_and_Risk_Assessment
        },
        Legal_Check_Summary: {
            EU_Customs_Code_Compliance: !!Legal_and_Compliance_Check.EU_Customs_Code_Compliance,
            Polish_Customs_Act_Compliance: !!Legal_and_Compliance_Check.Polish_Customs_Act_Compliance,
            VAT_Act_Compliance: !!Legal_and_Compliance_Check.VAT_Act_Compliance
        }
    };

    return output;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = validateCrossCheck;
}

/* -------------------------
 Example quick test (uncomment to run locally)
 --------------------------
 const invoice = {
   invoiceNumber: "EJL/25-26/449",
   date: "2025-07-26",
   items: [{ description: "Ring SL925", HSCode: 71131149, total: 45 }, { description: "Bracelet SL925", HSCode: 71131990, total: 2289 }],
   conversionRate: 3.7137,
   totalValue: 30238, // USD
   totalFreightAmount: 28000,
   totalInsuranceAmount: 15
 };
 const declaration = { 
   Certified_Customs_Declaration_Part_I: { Number_MRN: "25PL44302D003C0UR1", Creation_Date: "2025-07-31", Company_Name: "ESTRELLA JEWELS SP. Z O.O. SP. KOM." },
   Registration_Declaration_Part_II: { Importer: { NIP: "5252812119" }, Currency_Exchange_Rate: 3.7137 },
   Delivery_Receipt_Part_III: { Invoice_value: "30238", Invoice_currency: "USD", Gross_Weight: "1.5 kg" },
   Goods_Part_IV: { Goods_description: "Jewellery", CN_Code: "71131100", Valuation_method: "transaction value" },
   Other_Information_Part_V: { Tax: [{ Type: "VAT", Base: "111502", Rate: "23%", Sum: "25674" }], GRN: "17PL39000ST002200" }
 };
 console.log(JSON.stringify(validateCrossCheck([invoice], declaration), null, 2));
*/

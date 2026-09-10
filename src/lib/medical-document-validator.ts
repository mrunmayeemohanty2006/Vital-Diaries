/**
 * Deterministic Medical Document Validation Engine
 * 
 * 100% Local & Deterministic — Zero AI / Zero LLM / Zero External APIs
 * 
 * Determines whether an uploaded file (from direct PDF text or local Tesseract.js OCR)
 * is a genuine, supported medical laboratory report containing measurable clinical test results
 * BEFORE any encryption, IndexedDB insertion, or event creation occurs.
 * 
 * Distinguishes:
 * - CASE A: Valid supported medical laboratory report (CBC, LFT, Thyroid, Lipid, Novel Biomarkers, etc.)
 * - CASE B: Medical document but not a supported laboratory report (Prescription, Discharge Summary, Medical Certificate, etc.)
 * - CASE C: Clearly non-medical document (Resume, Assignment, Invoice, Receipt, Bank Statement, Random Text, etc.)
 */

import { extractHealthData, ExtractedHealthData, ExtractedMetric } from './health-extractor';

export const CLINICAL_UNIT_REGEX = /\b(g\/dL|gm\/dL|mg\/dL|ug\/dL|µg\/dL|pa\/dL|mcg\/dL|ng\/mL|pg\/mL|uIU\/mL|µIU\/mL|iu\/mL|piu\/mL|mIU\/L|cells\/uL|\/uL|\/mcL|lakh\/uL|lakh\/pL|lacs\/uL|million\/uL|fL|pg|%|mmHg|mmol\/L|umol\/L|U\/L|IU\/L)\b/i;

export interface MedicalDocumentValidation {
  isMedicalDocument: boolean;
  isSupportedLabReport: boolean;
  confidence: number;
  reason: string;
  userMessage: string;
  clinicalEvidenceCount: number;
  measurementCandidateCount: number;
  verdict: 'VALID_LAB_REPORT' | 'NON_LAB_MEDICAL_DOCUMENT' | 'NON_MEDICAL_DOCUMENT';
  evidence: {
    measurementRowsCount: number;
    validExtractedMetricsCount: number;
    clinicalUnitsCount: number;
    referenceRangesCount: number;
    labSectionHeadersCount: number;
    specimenOrLabMetadataCount: number;
    patientOrDoctorMetadataCount: number;
    nonLabMedicalTermsCount: number;
    nonMedicalTermsCount: number;
    details: string[];
  };
}

/**
 * Common laboratory section and panel header patterns (case-insensitive regex)
 */
const LAB_HEADER_PATTERNS = [
  /\b(?:complete\s*blood\s*count|cbc|hematology|haematology|differential\s*leucocyte\s*count|absolute\s*leucocyte\s*count)\b/i,
  /\b(?:biochemistry|serum\s*chemistry|clinical\s*biochemistry|metabolic\s*panel|comprehensive\s*metabolic\s*panel|cmp|bmp)\b/i,
  /\b(?:liver\s*function\s*test|lft|hepatic\s*panel|liver\s*profile)\b/i,
  /\b(?:lipid\s*profile|lipid\s*panel|cardiac\s*markers|cardiac\s*profile)\b/i,
  /\b(?:iron\s*studies|iron\s*profile|serum\s*iron|anemia\s*panel)\b/i,
  /\b(?:thyroid\s*profile|thyroid\s*function\s*test|tft|thyroid\s*panel)\b/i,
  /\b(?:renal\s*function\s*test|rft|kidney\s*function\s*test|kft|renal\s*panel)\b/i,
  /\b(?:vitamins\s*profile|vitamin\s*profile|coagulation\s*profile|electrolyte\s*panel)\b/i,
  /\b(?:test\s*name|test\s*description|investigation|parameter)\s*.*(?:result|observed\s*value|value)\s*.*(?:unit|bio\.?\s*ref\.?\s*interval|reference\s*range|ref\.?\s*interval)/i,
  /\b(?:bio\.?\s*ref\.?\s*interval|biological\s*reference\s*interval|reference\s*range|reference\s*interval|normal\s*range)\b/i,
  /\b(?:observed\s*value|test\s*result|patient\s*result|lab\s*result)\b/i,
];

/**
 * Specimen, Diagnostic Laboratory, and Accreditation metadata patterns
 */
const LAB_SPECIMEN_PATTERNS = [
  /\b(?:sample\s*type|specimen\s*type|specimen|sample\s*id|barcode\s*id|lab\s*visit\s*id|order\s*id|sid|accession\s*no)\b/i,
  /\b(?:edta\s*whole\s*blood|whole\s*blood|serum|plasma|citrated\s*plasma|fluoride\s*plasma|urine\s*sample)\b/i,
  /\b(?:collection\s*date|sample\s*collected|reporting\s*date|reported\s*on|registered\s*on|received\s*on|sample\s*drawn)\b/i,
  /\b(?:nabl|iso\s*15189|cap\s*accredited|pathology\s*laboratory|diagnostic\s*centre|pathologist|md\s*\(pathology\))\b/i,
  /\b(?:tata\s*1mg|dr\s*lal\s*pathlabs|quest\s*diagnostics|labcorp|thyrocare|metropolis|apollo\s*diagnostics|srl\s*diagnostics|suburban\s*diagnostics)\b/i,
];

/**
 * Non-lab medical document patterns (Prescriptions, Discharge Summaries, Certificates, Consult Notes)
 */
const NON_LAB_MEDICAL_PATTERNS = [
  /\b(?:rx\b|prescription|prescribed\s*medications?|tablet\b|tab\.|capsule\b|cap\.|syrup\b|syp\.|ointment\b|inj\.|injection\b)/i,
  /\b(?:1-0-1|0-1-0|1-0-0|0-0-1|1-1-1|once\s*daily|twice\s*daily|thrice\s*daily|od\b|bd\b|bid\b|tid\b|qid\b|sos\b|stat\b|after\s*food|before\s*food|empty\s*stomach)\b/i,
  /\b(?:chief\s*complaint|history\s*of\s*present|past\s*medical|clinical\s*examination|on\s*examination|provisional\s*diagnosis|final\s*diagnosis|diagnosis\s*:|gastroenteritis|hypertension|infection)\b/i,
  /\b(?:discharge\s*summary|date\s*of\s*admission|date\s*of\s*discharge|doa\b|dod\b|course\s*in\s*hospital|condition\s*at\s*discharge|condition\s*on\s*discharge|discharge\s*medications)\b/i,
  /\b(?:medical\s*fitness|fitness\s*certificate|sickness\s*certificate|sick\s*leave|medical\s*certificate|bed\s*rest|unfit\s*(?:for|to)|fit\s*to\s*resume|medical\s*treatment|certify\s*that)\b/i,
  /\b(?:outpatient\s*record|opd\s*card|consultation\s*note|clinical\s*notes|doctor's\s*notes|treatment\s*plan|next\s*follow-?up|review\s*after|dr\.\s+[a-z\s]+|mbbs|md\s*\(medicine\))\b/i,
  /\b(?:vaccination\s*card|immunization\s*record|dose\s*1|dose\s*2|booster\s*dose|batch\s*no\b|vaccine\s*name)\b/i,
];

/**
 * Clearly non-medical document patterns (Resumes, Assignments, Invoices, Bank Statements, Receipts, Code)
 */
const NON_MEDICAL_PATTERNS = [
  // Resumes / CVs
  /\b(?:curriculum\s*vitae|\bresume\s*of\b|\bresume\s*:|\bresume\s*cv\b|\bprofessional\s*resume\b|work\s*experience|employment\s*history|professional\s*experience|skills\s*&?\s*abilities|core\s*competencies|education\s*&?\s*qualifications|academic\s*background)\b/i,
  /\b(?:b\.?tech|m\.?tech|b\.?sc|m\.?sc|b\.?e\b|bca|mca|mba|cgpa|gpa|github\.com|linkedin\.com\/in|portfolio\s*link|software\s*engineer|frontend\s*developer|full\s*stack|backend\s*developer)\b/i,
  
  // Academic / Assignments
  /\b(?:assignment\s*#?\d*|homework\s*#?\d*|course\s*code|course\s*name|professor\s*name|department\s*of\s*computer|semester\s*\d+|submission\s*deadline|submitted\s*to\s*:|submitted\s*by\s*:)\b/i,
  /\b(?:abstract\b.*introduction\b.*methodology|problem\s*statement\b.*proposed\s*system|theorem\s*\d+|lemma\s*\d+|proof\s*:|equation\s*\(\d+\)|bibliography|references\s*\[1\])\b/i,
  
  // Financial Invoices / Bills / Receipts
  /\b(?:tax\s*invoice|commercial\s*invoice|proforma\s*invoice|invoice\s*number|invoice\s*no\.?|invoice\s*date|bill\s*to\s*:|ship\s*to\s*:|gstin\s*:|vat\s*no|pan\s*no)\b/i,
  /\b(?:sub\s*total|subtotal|grand\s*total|total\s*amount\s*due|amount\s*payable|balance\s*due|discount\s*applied|tax\s*rate|cgst|sgst|igst|payment\s*terms)\b/i,
  /\b(?:restaurant|dine\s*in|take\s*out|table\s*no|server\s*:|cashier\s*:|order\s*#?\d+|food\s*bill|item\s*total|gratuity|tip\s*amount)\b/i,
  
  // Banking / Statements
  /\b(?:bank\s*statement|account\s*statement|statement\s*of\s*account|account\s*number|account\s*holder|ifsc\s*code|micr\s*code|branch\s*name|opening\s*balance|closing\s*balance)\b/i,
  /\b(?:debit\s*amount|credit\s*amount|atm\s*withdrawal|cheque\s*no|transaction\s*id|transaction\s*date|upi\s*ref|available\s*balance)\b/i,
];

/**
 * Deterministically checks whether a line contains a structured quantitative lab measurement.
 * Matches: [Parameter / Name] [Numeric Value] [Unit] [Optional Ref Range / Status]
 */
function isMeasurementRow(line: string): boolean {
  if (!line || typeof line !== 'string') return false;
  const clean = line.trim();
  if (clean.length < 4) return false;

  // Reject obvious prescription / narrative / administrative lines
  if (/^(?:rx|tab\.|cap\.|syp\.|inj\.|ointment|dr\.|patient|mr\.|mrs\.|ms\.|order|bill|invoice|date|page|subtotal|total|balance|tax|cgst|sgst|igst|gst|vat|discount|item|qty|price|table|server)/i.test(clean)) {
    return false;
  }
  if (/\b(?:1\s*tab|2\s*tabs?|1-0-1|0-1-0|1-0-0|0-0-1|1-1-1|once\s*daily|twice\s*daily|thrice\s*daily|\s*od\b|\s*bd\b|\s*bid\b|\s*tid\b|\s*qid\b|\s*sos\b|after\s*food|before\s*food|at\s*bedtime|for\s*\d+\s*days|bed\s*rest)\b/i.test(clean)) {
    return false;
  }

  // Has a numeric value
  const hasNumber = /(?:^|\s+)([><≤≥]?\s*(?:\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?))(?:\s+|$)/.test(clean);
  if (!hasNumber) return false;

  // Has a recognized clinical unit
  const hasUnit = CLINICAL_UNIT_REGEX.test(clean);
  if (!hasUnit) return false;

  // Has at least some text before the number representing a parameter name
  const match = clean.match(/^(.*?)(?:[><≤≥]?\s*(?:\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?))/);
  if (!match || match[1].trim().length < 2) return false;

  return true;
}

/**
 * Counts occurrences of regex pattern array matches in text.
 */
function countPatternMatches(text: string, patterns: RegExp[]): { count: number; matches: string[] } {
  let count = 0;
  const matches: string[] = [];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      count++;
      matches.push(match[0]);
    }
  }
  return { count, matches };
}

/**
 * Main Deterministic Medical Document Validator
 * 
 * 100% Local & Rule-Based.
 * Evaluates document structure, clinical measurement candidates, lab metadata,
 * and distinguishes between valid lab reports, non-lab medical documents, and non-medical files.
 */
export function validateMedicalDocument(
  ocrText: string,
  options?: { fileName?: string; source?: 'pdf-text' | 'ocr' }
): MedicalDocumentValidation {
  const source = options?.source || 'ocr';
  const fileName = options?.fileName || '';

  // 1. Guard against empty or minimal content
  if (!ocrText || typeof ocrText !== 'string' || ocrText.trim().length < 15) {
    return {
      isMedicalDocument: false,
      isSupportedLabReport: false,
      confidence: 0,
      reason: 'The uploaded file contains insufficient readable text.',
      userMessage: "This file doesn't appear to be a supported medical laboratory report. Please upload a medical/lab report.",
      clinicalEvidenceCount: 0,
      measurementCandidateCount: 0,
      verdict: 'NON_MEDICAL_DOCUMENT',
      evidence: {
        measurementRowsCount: 0,
        validExtractedMetricsCount: 0,
        clinicalUnitsCount: 0,
        referenceRangesCount: 0,
        labSectionHeadersCount: 0,
        specimenOrLabMetadataCount: 0,
        patientOrDoctorMetadataCount: 0,
        nonLabMedicalTermsCount: 0,
        nonMedicalTermsCount: 0,
        details: ['Insufficient or empty text content.'],
      },
    };
  }

  const lines = ocrText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  // 2. Perform local generalized health data extraction
  const extractedHealth = extractHealthData(ocrText, { source });
  const validExtractedCount = Array.isArray(extractedHealth.metrics) ? extractedHealth.metrics.length : 0;

  // 3. Count measurement rows directly across lines
  let measurementRowCount = 0;
  for (const line of lines) {
    if (isMeasurementRow(line)) {
      measurementRowCount++;
    }
  }

  // 4. Count clinical units in text
  const unitMatches = Array.from(ocrText.matchAll(new RegExp(CLINICAL_UNIT_REGEX.source, 'gi')));
  const clinicalUnitsCount = unitMatches.length;

  // 5. Count reference intervals
  const refRangeRegex = /\b(?:\d+(?:\.\d+)?\s*[-–—]\s*\d+(?:\.\d+)?|[<>≤≥]\s*\d+(?:\.\d+)?|bio\.?\s*ref\.?\s*interval|reference\s*interval)\b/gi;
  const refRangeMatches = Array.from(ocrText.matchAll(refRangeRegex));
  const referenceRangesCount = refRangeMatches.length;

  // 6. Count lab section headers & panel metadata
  const labHeaders = countPatternMatches(ocrText, LAB_HEADER_PATTERNS);
  const labSpecimens = countPatternMatches(ocrText, LAB_SPECIMEN_PATTERNS);

  // 7. Count non-lab medical patterns (Prescriptions, Discharge summaries, Consult notes)
  const nonLabMedical = countPatternMatches(ocrText, NON_LAB_MEDICAL_PATTERNS);

  // 8. Count non-medical patterns (Resumes, Invoices, Bank statements, Assignments)
  const nonMedical = countPatternMatches(ocrText, NON_MEDICAL_PATTERNS);

  // Total clinical evidence count
  const clinicalEvidenceCount = 
    validExtractedCount * 2 + 
    measurementRowCount + 
    labHeaders.count * 2 + 
    labSpecimens.count + 
    Math.min(clinicalUnitsCount, 10) + 
    Math.min(referenceRangesCount, 10);

  const evidenceDetails: string[] = [
    `Detected ${validExtractedCount} structured clinical metric(s)`,
    `Detected ${measurementRowCount} measurement candidate row(s)`,
    `Detected ${clinicalUnitsCount} clinical unit occurrence(s)`,
    `Detected ${referenceRangesCount} reference interval pattern(s)`,
    `Detected ${labHeaders.count} laboratory section header(s)`,
    `Detected ${labSpecimens.count} specimen/diagnostic metadata pattern(s)`,
  ];

  if (nonLabMedical.count > 0) {
    evidenceDetails.push(`Detected ${nonLabMedical.count} non-lab medical keyword(s) (${nonLabMedical.matches.join(', ')})`);
  }
  if (nonMedical.count > 0) {
    evidenceDetails.push(`Detected ${nonMedical.count} non-medical keyword(s) (${nonMedical.matches.join(', ')})`);
  }

  // =========================================================================
  // DETERMINISTIC CLASSIFICATION RULES
  // =========================================================================

  // CASE C — Clearly Non-Medical Document (Resume, Assignment, Invoice, Bank Statement, Receipt, Essay, etc.)
  // If non-medical keywords are present AND there are no recognized lab headers, lab specimens, or canonical lab metrics:
  if (nonMedical.count >= 1 && validExtractedCount === 0 && labHeaders.count === 0 && labSpecimens.count === 0) {
    return {
      isMedicalDocument: false,
      isSupportedLabReport: false,
      confidence: 95,
      reason: `Document contains non-medical content signatures (${nonMedical.matches.slice(0, 3).join(', ')}) and zero clinical test measurements.`,
      userMessage: "This file doesn't appear to be a supported medical laboratory report. Please upload a medical/lab report.",
      clinicalEvidenceCount: 0,
      measurementCandidateCount: 0,
      verdict: 'NON_MEDICAL_DOCUMENT',
      evidence: {
        measurementRowsCount: 0,
        validExtractedMetricsCount: 0,
        clinicalUnitsCount,
        referenceRangesCount,
        labSectionHeadersCount: labHeaders.count,
        specimenOrLabMetadataCount: labSpecimens.count,
        patientOrDoctorMetadataCount: 0,
        nonLabMedicalTermsCount: nonLabMedical.count,
        nonMedicalTermsCount: nonMedical.count,
        details: evidenceDetails,
      },
    };
  }

  // CASE B — Medical document but not a supported laboratory report
  // (e.g. Prescription, Doctor Consultation Note, Hospital Discharge Summary, Medical Certificate)
  // Has medical indicators, but 0 quantitative laboratory measurements with reference intervals
  const hasMedicalIndicators = nonLabMedical.count >= 1 && (
    nonLabMedical.count >= 2 ||
    labSpecimens.count >= 1 ||
    /dr\.|patient|hospital|clinic|certif|prescription|diagnosis|consult/i.test(ocrText)
  );
  if (hasMedicalIndicators && validExtractedCount === 0 && labHeaders.count === 0) {
    return {
      isMedicalDocument: true,
      isSupportedLabReport: false,
      confidence: 90,
      reason: `Detected medical document signatures (${nonLabMedical.matches.slice(0, 3).join(', ')}), but document lacks structured quantitative laboratory measurements or test result rows.`,
      userMessage: 'This appears to be a medical document, but Vital Diaries currently supports laboratory reports with measurable test results.',
      clinicalEvidenceCount,
      measurementCandidateCount: 0,
      verdict: 'NON_LAB_MEDICAL_DOCUMENT',
      evidence: {
        measurementRowsCount: measurementRowCount,
        validExtractedMetricsCount: 0,
        clinicalUnitsCount,
        referenceRangesCount,
        labSectionHeadersCount: labHeaders.count,
        specimenOrLabMetadataCount: labSpecimens.count,
        patientOrDoctorMetadataCount: 1,
        nonLabMedicalTermsCount: nonLabMedical.count,
        nonMedicalTermsCount: nonMedical.count,
        details: evidenceDetails,
      },
    };
  }

  // CASE A — Valid Supported Medical Laboratory Report
  // Must have at least 1 valid extracted clinical metric OR multiple structured measurement rows with clinical units/ranges
  const hasValidLabMeasurements = validExtractedCount >= 1 || (measurementRowCount >= 1 && (clinicalUnitsCount >= 1 || referenceRangesCount >= 1));
  const hasSupportingLabEvidence = labHeaders.count >= 1 || labSpecimens.count >= 1 || clinicalUnitsCount >= 1 || referenceRangesCount >= 1;

  if (hasValidLabMeasurements && hasSupportingLabEvidence) {
    // Calculate deterministic confidence score (50 - 100)
    let score = 50;
    score += Math.min(validExtractedCount * 10, 30);
    if (clinicalUnitsCount >= 1) score += 5;
    if (referenceRangesCount >= 1) score += 5;
    if (labHeaders.count >= 1) score += 5;
    if (labSpecimens.count >= 1) score += 5;
    const confidence = Math.min(score, 100);

    return {
      isMedicalDocument: true,
      isSupportedLabReport: true,
      confidence,
      reason: `Successfully verified medical laboratory report with ${validExtractedCount} extracted metric(s), ${clinicalUnitsCount} clinical unit(s), and valid clinical report structure.`,
      userMessage: `Valid medical laboratory report verified with ${validExtractedCount} clinical measurement(s).`,
      clinicalEvidenceCount,
      measurementCandidateCount: Math.max(validExtractedCount, measurementRowCount),
      verdict: 'VALID_LAB_REPORT',
      evidence: {
        measurementRowsCount: measurementRowCount,
        validExtractedMetricsCount: validExtractedCount,
        clinicalUnitsCount,
        referenceRangesCount,
        labSectionHeadersCount: labHeaders.count,
        specimenOrLabMetadataCount: labSpecimens.count,
        patientOrDoctorMetadataCount: labSpecimens.count,
        nonLabMedicalTermsCount: nonLabMedical.count,
        nonMedicalTermsCount: nonMedical.count,
        details: evidenceDetails,
      },
    };
  }

  // Single valid biomarker special case (e.g. standalone TSH, HbA1c, or single novel lab test)
  if (validExtractedCount >= 1) {
    return {
      isMedicalDocument: true,
      isSupportedLabReport: true,
      confidence: 75,
      reason: `Detected valid clinical laboratory biomarker (${extractedHealth.metrics.map(m => m.name).join(', ')}).`,
      userMessage: `Valid medical laboratory report verified with ${validExtractedCount} clinical measurement(s).`,
      clinicalEvidenceCount,
      measurementCandidateCount: validExtractedCount,
      verdict: 'VALID_LAB_REPORT',
      evidence: {
        measurementRowsCount: measurementRowCount,
        validExtractedMetricsCount: validExtractedCount,
        clinicalUnitsCount,
        referenceRangesCount,
        labSectionHeadersCount: labHeaders.count,
        specimenOrLabMetadataCount: labSpecimens.count,
        patientOrDoctorMetadataCount: 0,
        nonLabMedicalTermsCount: nonLabMedical.count,
        nonMedicalTermsCount: nonMedical.count,
        details: evidenceDetails,
      },
    };
  }

  // Default: Insufficient clinical evidence / Unrelated document (CASE C)
  return {
    isMedicalDocument: false,
    isSupportedLabReport: false,
    confidence: 85,
    reason: 'Document does not contain sufficient deterministic clinical evidence or measurable laboratory test results.',
    userMessage: "This file doesn't appear to be a supported medical laboratory report. Please upload a medical/lab report.",
    clinicalEvidenceCount,
    measurementCandidateCount: 0,
    verdict: 'NON_MEDICAL_DOCUMENT',
    evidence: {
      measurementRowsCount: measurementRowCount,
      validExtractedMetricsCount: 0,
      clinicalUnitsCount,
      referenceRangesCount,
      labSectionHeadersCount: labHeaders.count,
      specimenOrLabMetadataCount: labSpecimens.count,
      patientOrDoctorMetadataCount: 0,
      nonLabMedicalTermsCount: nonLabMedical.count,
      nonMedicalTermsCount: nonMedical.count,
      details: evidenceDetails,
    },
  };
}

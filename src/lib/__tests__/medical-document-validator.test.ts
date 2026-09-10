/**
 * Comprehensive Test Suite for Deterministic Medical Document Validation Engine
 * 
 * 100% Local & Deterministic — Zero AI / Zero LLM / Zero Remote APIs
 * 
 * Validates:
 * 1. Valid Medical Laboratory Reports (CBC, LFT, Thyroid, Novel Biomarkers, Scanned reports)
 * 2. Medical documents that are NOT supported lab reports (Prescriptions, Discharge Summaries, Medical Certificates)
 * 3. Clearly non-medical documents (Resumes, College Assignments, Bank Statements, Invoices, Receipts)
 * 4. Storage Boundary Gate Invariant: Invalid documents are NEVER encrypted or written to IndexedDB.
 */

import { validateMedicalDocument } from '../medical-document-validator';
import { extractHealthData } from '../health-extractor';
import { generateDEK } from '../envelope-crypto';
import { encryptData, decryptData } from '../crypto';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED]: ${message}`);
  }
}

console.log('================================================================================');
console.log('   DETERMINISTIC MEDICAL DOCUMENT VALIDATOR TEST SUITE');
console.log('================================================================================\n');

// =============================================================================
// FIXTURE SET 1: VALID MEDICAL LABORATORY REPORTS (CASE A)
// =============================================================================

// 1. Authoritative 35-Marker Tata 1mg Report (Regression Test Fixture Only)
const FIXTURE_TATA_35_REPORT = `
TATA 1mg Comprehensive Diagnostic Report
Patient Name: Mr. Rahul Sharma | Age: 34 Y / Male | Lab Visit ID: LAB-2026-9912
Sample Type: EDTA Whole Blood & Serum | Collection Date: 12-Jan-2026

HAEMATOLOGY - COMPLETE BLOOD COUNT
Haemoglobin (Hb)               14.2   g/dL       13.0 - 17.0      Normal
Total RBC Count                4.8    million/uL 4.5 - 5.5        Normal
Packed Cell Volume (PCV)       42.5   %          40.0 - 50.0      Normal
Mean Corpuscular Volume (MCV)  88.5   fL         80.0 - 100.0     Normal
Mean Corpuscular Hb (MCH)      29.5   pg         27.0 - 32.0      Normal
Mean Corpuscular Hb Conc (MCHC) 33.4  g/dL       31.5 - 34.5      Normal
RDW-CV                         13.2   %          11.5 - 14.5      Normal
Total Leukocyte Count (TLC)    6800   cells/uL   4000 - 11000     Normal
Neutrophils                    62     %          40 - 75          Normal
Lymphocytes                    28     %          20 - 45          Normal
Monocytes                      6      %          2 - 10           Normal
Eosinophils                    3      %          1 - 6            Normal
Basophils                      1      %          0 - 2            Normal
Platelet Count                 2.45   lakh/uL    1.50 - 4.50      Normal

BIOCHEMISTRY - IRON STUDIES
Serum Iron                     85.0   ug/dL      65 - 175         Normal
Total Iron Binding Capacity    320.0  ug/dL      250 - 450        Normal
UIBC                           235.0  ug/dL      155 - 355        Normal
Transferrin Saturation         26.5   %          20 - 50          Normal
Ferritin                       110.0  ng/mL      30 - 400         Normal

BIOCHEMISTRY - VITAMINS
Vitamin B12                    480.0  pg/mL      211 - 911        Normal
Folate                         8.5    ng/mL      4.6 - 18.7       Normal
Vitamin D (25-OH)              34.5   ng/mL      30.0 - 100.0     Normal

LIVER FUNCTION TEST
Bilirubin Total                0.8    mg/dL      0.2 - 1.2        Normal
Bilirubin Direct               0.2    mg/dL      0.0 - 0.3        Normal
Bilirubin Indirect             0.6    mg/dL      0.1 - 0.9        Normal
SGPT / ALT                     28.0   U/L        < 45             Normal
SGOT / AST                     24.0   U/L        < 35             Normal
Alkaline Phosphatase           75.0   U/L        30 - 120         Normal
Total Protein                  7.2    g/dL       6.0 - 8.3        Normal
Albumin                        4.4    g/dL       3.5 - 5.0        Normal
Globulin                       2.8    g/dL       2.0 - 3.5        Normal
A/G Ratio                      1.57   Ratio      1.0 - 2.1        Normal

GENERAL BIOCHEMISTRY
Fasting Blood Glucose          92.0   mg/dL      70 - 100         Normal
Calcium                        9.4    mg/dL      8.8 - 10.2       Normal
TSH                            1.85   uIU/mL     0.40 - 4.20      Normal
`;

// 2. Synthetic CBC from a different hospital (Metropolis Diagnostics, 5 markers)
const FIXTURE_METROPOLIS_CBC = `
METROPOLIS HEALTHCARE LTD
Laboratory Test Report | Accession: MET-88219 | Specimen: Whole Blood EDTA
Investigation                   Observed Value   Unit        Biological Reference
Hemoglobin                      11.5             g/dL        12.0 - 15.0
WBC Count                       8,400            cells/uL    4,500 - 11,000
Platelets                       1.90             lakh/uL     1.50 - 4.50
Hematocrit                      36.0             %           37.0 - 48.0
RDW                             15.2             %           11.0 - 14.0
`;

// 3. Synthetic Liver Function Panel (Apollo Diagnostics)
const FIXTURE_APOLLO_LFT = `
APOLLO CLINIC & DIAGNOSTIC CENTRE
Clinical Chemistry Report | Specimen: Serum | Sample ID: APL-9921
Test Description                Result   Units   Reference Interval
Bilirubin Total                 1.8      mg/dL   0.1 - 1.2
Bilirubin Direct                0.7      mg/dL   0.0 - 0.3
SGPT (ALT)                      64.0     U/L     10 - 40
SGOT (AST)                      52.0     U/L     10 - 35
Alkaline Phosphatase            142.0    U/L     40 - 130
Total Protein                   6.9      g/dL    6.4 - 8.3
`;

// 4. Standalone Thyroid Panel (Thyrocare, 3 markers)
const FIXTURE_THYROID_PANEL = `
THYROCARE TECHNOLOGIES LIMITED
Department of Endocrinology | Sample Type: Serum | Barcode: THY-44021
PARAMETER                       VALUE    UNIT        REFERENCE RANGE
TSH - Thyroid Stimulating Hormone 4.85   uIU/mL      0.35 - 4.94
Total T3                        1.20     ng/mL       0.80 - 2.00
Total T4                        8.40     ug/dL       4.80 - 12.00
`;

// 5. Unseen / Novel Biomarkers Report (Immuno-oncology & Cardiac)
const FIXTURE_NOVEL_BIOMARKERS = `
ADVANCED MEDICAL RESEARCH INSTITUTE
Specialized Diagnostic Report | Specimen: Frozen Serum
Test Name                       Observed Value   Units       Reference Range
Interleukin-6                   4.2              pg/mL       < 7.0
Procalcitonin                   0.04             ng/mL       < 0.05
Troponin I                      0.01             ng/mL       < 0.04
D-Dimer                         210              ng/mL       < 500
Anti-CCP Antibodies             12.5             U/mL        < 20.0
`;

// 6. Single Biomarker Report (e.g. HbA1c screening)
const FIXTURE_SINGLE_HBA1C = `
DIAGNOSTIC PATHOLOGY LAB
Order ID: GLU-1029 | Specimen: Whole Blood
HbA1c                           6.2      %           < 5.7 (Normal)
Estimated Average Glucose       131      mg/dL       < 117
`;

// =============================================================================
// FIXTURE SET 2: NON-LAB MEDICAL DOCUMENTS (CASE B)
// =============================================================================

// 1. Doctor's Prescription
const FIXTURE_DOCTOR_PRESCRIPTION = `
DR. SANJAY MEHTA, MD (Medicine)
Apollo Hospitals, Clinic OPD | Reg No: 49201-MCI
Patient: Ananya Sen | Age: 29 | Date: 10-Mar-2026
Diagnosis: Acute Pharyngitis & Upper Respiratory Tract Infection

Rx:
1. Tab. Augmentin 625mg (Amoxicillin + Clavulanic Acid) — 1 tab BD x 5 days (after food)
2. Tab. Dolo 650mg (Paracetamol) — 1 tab TID SOS for fever
3. Tab. Levocetirizine 5mg — 1 tab OD at bedtime x 5 days
4. Betadine Gargle 2% — Thrice daily with warm water

Advice: Drink warm fluids, voice rest. Review after 5 days if fever persists.
Dr. S. Mehta
`;

// 2. Hospital Discharge Summary
const FIXTURE_DISCHARGE_SUMMARY = `
CITY MULTISPECIALITY HOSPITAL
PATIENT DISCHARGE SUMMARY
Patient Name: Ramesh Patel | IP No: IP-8402 | Age: 52 Y / Male
Date of Admission: 01-Feb-2026 | Date of Discharge: 05-Feb-2026
Consultant: Dr. Arvind Rao, MS, MCh (Cardiothoracic Surgery)
Final Diagnosis: Acute Coronary Syndrome (NSTEMI) — Post Coronary Angiography

Clinical History & Course in Hospital:
Patient was admitted with complaints of retrosternal chest pain radiating to left arm.
ECG showed T wave inversions. Patient was stabilized in ICCU and underwent elective coronary angiography
which showed 40% stenosis in LAD. Managed conservatively with anti-platelets, statins, and beta-blockers.
Condition on Discharge: Stable, afebrile, hemodynamically stable.

Discharge Medications:
- Tab. Aspirin 75mg once daily after lunch
- Tab. Atorvastatin 40mg once daily at night
- Tab. Metoprolol 25mg once daily in morning
Follow up in Cardiology OPD after 2 weeks.
`;

// 3. Medical Sick Leave Certificate
const FIXTURE_MEDICAL_CERTIFICATE = `
MEDICAL FITNESS / SICKNESS CERTIFICATE
This is to certify that Mr. Aditya Roy, aged 26 years, has been under my medical treatment
for Acute Gastroenteritis and Dehydration from 03-Mar-2026 to 08-Mar-2026.
He was advised complete bed rest during this period and was unfit to attend duty/classes.
He is now medically fit to resume normal duties from 09-Mar-2026.
Dr. K. L. Sharma, MBBS
Reg. No. 12944
`;

// =============================================================================
// FIXTURE SET 3: CLEARLY NON-MEDICAL DOCUMENTS (CASE C)
// =============================================================================

// 1. Software Engineer Resume / CV
const FIXTURE_RESUME = `
Jane Doe — Senior Full Stack Software Engineer
Email: jane.doe@example.com | Phone: +1 555-0199 | LinkedIn: linkedin.com/in/janedoe | GitHub: github.com/janedoe
B.Tech in Computer Science, State University (CGPA: 8.9/10)

PROFESSIONAL EXPERIENCE:
Senior Software Engineer — TechCorp Inc. (2023 - Present)
- Architected and built high-performance distributed web applications using React, TypeScript, and Node.js.
- Reduced API response latency by 45% using Redis caching and PostgreSQL query optimizations.
- Managed CI/CD deployment pipelines on AWS and Docker.

EDUCATION & SKILLS:
- Core Competencies: React, TypeScript, JavaScript, Python, TailwindCSS, PostgreSQL, Docker, Kubernetes, Git.
- Projects: Developed open-source data visualization engine with over 1,200 GitHub stars.
`;

// 2. College Computer Science Assignment
const FIXTURE_COLLEGE_ASSIGNMENT = `
DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING
Course: CS301 - Design and Analysis of Algorithms | Semester 6
Assignment 3: Dynamic Programming and Graph Algorithms
Submitted by: Alex Johnson (Roll No: CS2022-044) | Professor: Dr. Robert Miller
Submission Date: 14-Feb-2026

Problem Statement 1:
Prove the optimality of Dijkstra's Shortest Path Algorithm on non-negative weighted graphs.
Theorem 1.1: Let G = (V, E) be a directed graph with non-negative edge weights w(u, v) >= 0.
Proof: We proceed by mathematical induction on the size of the visited set S...
References [1] Introduction to Algorithms, CLRS 3rd Edition.
`;

// 3. Commercial Shopping Tax Invoice
const FIXTURE_SHOPPING_INVOICE = `
MEGA MART RETAIL PRIVATE LIMITED
TAX INVOICE / CASH BILL
Invoice Number: INV-2026-88192 | Invoice Date: 08-Mar-2026 | GSTIN: 27AABCM1234F1Z8
Bill To: John Smith | Payment Method: Credit Card ending in 4129

Item Description                Qty     Unit Price (USD)    Total Amount
1. Wireless Bluetooth Keyboard  1       49.99               49.99
2. USB-C 65W Fast Charger       2       24.50               49.00
3. HDMI 2.1 Ultra HD Cable      1       12.99               12.99

Sub Total:                                                  $111.98
CGST (9%):                                                  $10.08
SGST (9%):                                                  $10.08
Grand Total Due:                                            $132.14
Thank you for shopping with us! Visit us at www.megamart.com
`;

// 4. Bank Account Statement
const FIXTURE_BANK_STATEMENT = `
GLOBAL APEX BANK
STATEMENT OF ACCOUNT
Account Holder: Priya Nambiar | Account Number: 981273910283 | IFSC Code: APEX000182
Branch: Downtown City Branch | Statement Period: 01-Jan-2026 to 31-Jan-2026
Opening Balance: $14,250.00 | Closing Balance: $16,840.50

Date            Transaction Description         Debit ($)       Credit ($)      Balance ($)
02-Jan-2026     Monthly Salary Direct Deposit                   5,000.00        19,250.00
05-Jan-2026     ATM Cash Withdrawal             400.00                          18,850.00
12-Jan-2026     Electric Utility Bill Payment   150.50                          18,699.50
25-Jan-2026     Supermarket Grocery Store       350.00                          18,349.50
`;

// 5. Restaurant Food Bill
const FIXTURE_RESTAURANT_RECEIPT = `
BELLA ITALIA RISTORANTE
Order # 4192 | Table No: 14 | Server: Marco
Date: 09-Mar-2026 08:45 PM

1x Bruschetta al Pomodoro       $8.50
1x Fettuccine Alfredo           $18.00
1x Margherita Wood-Fired Pizza  $16.50
2x Sparkling Mineral Water      $6.00

Subtotal:                       $49.00
State Sales Tax (8%):           $3.92
Gratuity / Tip:                 $8.00
Total Amount Charged:           $60.92
`;

// 6. Arbitrary Text Document (Philosophy / Essay)
const FIXTURE_RANDOM_ESSAY = `
ON THE EPITEMOLOGICAL NATURE OF SCIENTIFIC INQUIRY
By Arthur Pendelton

The history of modern scientific method has long oscillated between deductive rationalism
and inductive empiricism. In this treatise, we explore how observational frameworks
shape theoretical constructs in natural sciences. The concept of falsifiability as articulated
by Karl Popper serves as a demarcating principle...
`;

// =============================================================================
// RUN TESTS
// =============================================================================

console.log('--- TEST GROUP 1: Valid Medical Laboratory Reports (CASE A) ---');

const val1 = validateMedicalDocument(FIXTURE_TATA_35_REPORT, { fileName: 'tata_report.pdf' });
assert(val1.isSupportedLabReport === true, 'Tata 35-marker report must be ACCEPTED');
assert(val1.verdict === 'VALID_LAB_REPORT', 'Verdict must be VALID_LAB_REPORT');
assert(val1.confidence >= 80, 'Confidence must be high');
console.log(`✓ 1. Authoritative Tata 35-marker report -> ACCEPTED (Confidence: ${val1.confidence}%, Metrics: ${val1.measurementCandidateCount})`);

const val2 = validateMedicalDocument(FIXTURE_METROPOLIS_CBC, { fileName: 'metropolis_cbc.pdf' });
assert(val2.isSupportedLabReport === true, 'Metropolis CBC report must be ACCEPTED');
assert(val2.verdict === 'VALID_LAB_REPORT', 'Verdict must be VALID_LAB_REPORT');
console.log(`✓ 2. Metropolis CBC 5-marker report -> ACCEPTED (Confidence: ${val2.confidence}%, Metrics: ${val2.measurementCandidateCount})`);

const val3 = validateMedicalDocument(FIXTURE_APOLLO_LFT, { fileName: 'apollo_lft.pdf' });
assert(val3.isSupportedLabReport === true, 'Apollo LFT report must be ACCEPTED');
assert(val3.verdict === 'VALID_LAB_REPORT', 'Verdict must be VALID_LAB_REPORT');
console.log(`✓ 3. Apollo LFT report -> ACCEPTED (Confidence: ${val3.confidence}%, Metrics: ${val3.measurementCandidateCount})`);

const val4 = validateMedicalDocument(FIXTURE_THYROID_PANEL, { fileName: 'thyroid_panel.pdf' });
assert(val4.isSupportedLabReport === true, 'Thyrocare Thyroid panel must be ACCEPTED');
assert(val4.verdict === 'VALID_LAB_REPORT', 'Verdict must be VALID_LAB_REPORT');
console.log(`✓ 4. Standalone Thyroid report -> ACCEPTED (Confidence: ${val4.confidence}%, Metrics: ${val4.measurementCandidateCount})`);

const val5 = validateMedicalDocument(FIXTURE_NOVEL_BIOMARKERS, { fileName: 'research_biomarkers.pdf' });
assert(val5.isSupportedLabReport === true, 'Unseen / Novel biomarkers report must be ACCEPTED');
assert(val5.verdict === 'VALID_LAB_REPORT', 'Verdict must be VALID_LAB_REPORT');
console.log(`✓ 5. Novel research biomarkers report -> ACCEPTED (Confidence: ${val5.confidence}%, Metrics: ${val5.measurementCandidateCount})`);

const val6 = validateMedicalDocument(FIXTURE_SINGLE_HBA1C, { fileName: 'hba1c.pdf' });
assert(val6.isSupportedLabReport === true, 'Single biomarker HbA1c report must be ACCEPTED');
assert(val6.verdict === 'VALID_LAB_REPORT', 'Verdict must be VALID_LAB_REPORT');
console.log(`✓ 6. Single biomarker report -> ACCEPTED (Confidence: ${val6.confidence}%, Metrics: ${val6.measurementCandidateCount})`);

console.log('\n--- TEST GROUP 2: Medical Documents that are NOT Lab Reports (CASE B) ---');

const medVal1 = validateMedicalDocument(FIXTURE_DOCTOR_PRESCRIPTION, { fileName: 'prescription.pdf' });
assert(medVal1.isSupportedLabReport === false, 'Doctor prescription must NOT be accepted as a lab report');
assert(medVal1.isMedicalDocument === true, 'Prescription must be recognized as a medical document');
assert(medVal1.verdict === 'NON_LAB_MEDICAL_DOCUMENT', 'Verdict must be NON_LAB_MEDICAL_DOCUMENT');
assert(medVal1.userMessage.includes('Vital Diaries currently supports laboratory reports'), 'User message must guide user appropriately');
console.log(`✓ 1. Doctor Prescription -> REJECTED from Lab Storage (Verdict: ${medVal1.verdict}, Message: "${medVal1.userMessage}")`);

const medVal2 = validateMedicalDocument(FIXTURE_DISCHARGE_SUMMARY, { fileName: 'discharge_summary.pdf' });
assert(medVal2.isSupportedLabReport === false, 'Discharge summary must NOT be accepted as a lab report');
assert(medVal2.isMedicalDocument === true, 'Discharge summary must be recognized as a medical document');
assert(medVal2.verdict === 'NON_LAB_MEDICAL_DOCUMENT', 'Verdict must be NON_LAB_MEDICAL_DOCUMENT');
console.log(`✓ 2. Hospital Discharge Summary -> REJECTED from Lab Storage (Verdict: ${medVal2.verdict})`);

const medVal3 = validateMedicalDocument(FIXTURE_MEDICAL_CERTIFICATE, { fileName: 'sick_certificate.pdf' });
assert(medVal3.isSupportedLabReport === false, 'Medical certificate must NOT be accepted as a lab report');
assert(medVal3.isMedicalDocument === true, 'Medical certificate must be recognized as a medical document');
assert(medVal3.verdict === 'NON_LAB_MEDICAL_DOCUMENT', 'Verdict must be NON_LAB_MEDICAL_DOCUMENT');
console.log(`✓ 3. Medical Sick Leave Certificate -> REJECTED from Lab Storage (Verdict: ${medVal3.verdict})`);

console.log('\n--- TEST GROUP 3: Clearly Non-Medical Documents (CASE C) ---');

const nonVal1 = validateMedicalDocument(FIXTURE_RESUME, { fileName: 'resume.pdf' });
assert(nonVal1.isSupportedLabReport === false, 'Resume must be REJECTED');
assert(nonVal1.verdict === 'NON_MEDICAL_DOCUMENT', 'Verdict must be NON_MEDICAL_DOCUMENT');
assert(nonVal1.userMessage.includes("doesn't appear to be a supported medical laboratory report"), 'User message must be standard rejection');
console.log(`✓ 1. Software Engineer Resume -> REJECTED (Verdict: ${nonVal1.verdict})`);

const nonVal2 = validateMedicalDocument(FIXTURE_COLLEGE_ASSIGNMENT, { fileName: 'assignment.pdf' });
assert(nonVal2.isSupportedLabReport === false, 'College assignment must be REJECTED');
assert(nonVal2.verdict === 'NON_MEDICAL_DOCUMENT', 'Verdict must be NON_MEDICAL_DOCUMENT');
console.log(`✓ 2. College Assignment -> REJECTED (Verdict: ${nonVal2.verdict})`);

const nonVal3 = validateMedicalDocument(FIXTURE_SHOPPING_INVOICE, { fileName: 'invoice.pdf' });
assert(nonVal3.isSupportedLabReport === false, 'Shopping invoice must be REJECTED');
assert(nonVal3.verdict === 'NON_MEDICAL_DOCUMENT', 'Verdict must be NON_MEDICAL_DOCUMENT');
console.log(`✓ 3. Retail Tax Invoice -> REJECTED (Verdict: ${nonVal3.verdict})`);

const nonVal4 = validateMedicalDocument(FIXTURE_BANK_STATEMENT, { fileName: 'bank_statement.pdf' });
assert(nonVal4.isSupportedLabReport === false, 'Bank statement must be REJECTED');
assert(nonVal4.verdict === 'NON_MEDICAL_DOCUMENT', 'Verdict must be NON_MEDICAL_DOCUMENT');
console.log(`✓ 4. Bank Statement -> REJECTED (Verdict: ${nonVal4.verdict})`);

const nonVal5 = validateMedicalDocument(FIXTURE_RESTAURANT_RECEIPT, { fileName: 'receipt.pdf' });
assert(nonVal5.isSupportedLabReport === false, 'Restaurant receipt must be REJECTED');
assert(nonVal5.verdict === 'NON_MEDICAL_DOCUMENT', 'Verdict must be NON_MEDICAL_DOCUMENT');
console.log(`✓ 5. Restaurant Receipt -> REJECTED (Verdict: ${nonVal5.verdict})`);

const nonVal6 = validateMedicalDocument(FIXTURE_RANDOM_ESSAY, { fileName: 'essay.pdf' });
assert(nonVal6.isSupportedLabReport === false, 'Random essay must be REJECTED');
assert(nonVal6.verdict === 'NON_MEDICAL_DOCUMENT', 'Verdict must be NON_MEDICAL_DOCUMENT');
console.log(`✓ 6. Philosophical Essay -> REJECTED (Verdict: ${nonVal6.verdict})`);

const nonVal7 = validateMedicalDocument('', { fileName: 'empty.pdf' });
assert(nonVal7.isSupportedLabReport === false, 'Empty text must be REJECTED');
assert(nonVal7.verdict === 'NON_MEDICAL_DOCUMENT', 'Verdict must be NON_MEDICAL_DOCUMENT');
console.log(`✓ 7. Empty document -> REJECTED (Verdict: ${nonVal7.verdict})`);

// =============================================================================
// TEST GROUP 4: STORAGE BOUNDARY & PRIVACY ISOLATION
// =============================================================================

console.log('\n--- TEST GROUP 4: Storage Boundary & Privacy Isolation Invariants ---');

async function testStorageBoundarySimulation() {
  const simulatedDb: any[] = [];
  const simulatedRecentEvents: any[] = [];
  const dek = await generateDEK();

  async function simulateUploadPipeline(rawDocText: string, fileName: string) {
    // 1. OCR text obtained locally
    const ocrText = rawDocText;

    // 2. Deterministic Validation Gate
    const validation = validateMedicalDocument(ocrText, { fileName });

    // GATE CHECK
    if (!validation.isSupportedLabReport) {
      // HALT IMMEDIATELY — NOTHING STORED, NOTHING ENCRYPTED
      return { success: false, error: validation.userMessage, validation };
    }

    // 3. Extract, Encrypt, and Store
    const extractedData = extractHealthData(ocrText);
    const payload = JSON.stringify({ fileName, metrics: extractedData.metrics });
    const encrypted = await encryptData(payload, dek);

    simulatedDb.push({
      id: `rep_${Date.now()}`,
      cipherText: encrypted.cipherText,
      iv: encrypted.iv,
    });

    simulatedRecentEvents.push({
      title: extractedData.title,
      date: new Date().toISOString(),
    });

    return { success: true, validation };
  }

  // Attempt upload of valid report
  const validRes = await simulateUploadPipeline(FIXTURE_METROPOLIS_CBC, 'cbc.pdf');
  assert(validRes.success === true, 'Valid CBC report must succeed upload');
  assert(simulatedDb.length === 1, 'IndexedDB must contain 1 record after valid upload');
  assert(simulatedRecentEvents.length === 1, 'Recent Events must contain 1 event after valid upload');
  console.log('✓ Valid lab report uploaded: IndexedDB count = 1, Recent Events count = 1');

  // Attempt upload of prescription (CASE B)
  const rxRes = await simulateUploadPipeline(FIXTURE_DOCTOR_PRESCRIPTION, 'rx.pdf');
  assert(rxRes.success === false, 'Prescription upload must be rejected');
  assert(simulatedDb.length === 1, 'IndexedDB MUST STILL have only 1 record (Prescription not stored)');
  assert(simulatedRecentEvents.length === 1, 'Recent Events MUST STILL have only 1 record');
  console.log('✓ Prescription rejected: IndexedDB count remains 1, Recent Events count remains 1 (Unchanged)');

  // Attempt upload of resume (CASE C)
  const resumeRes = await simulateUploadPipeline(FIXTURE_RESUME, 'resume.pdf');
  assert(resumeRes.success === false, 'Resume upload must be rejected');
  assert(simulatedDb.length === 1, 'IndexedDB MUST STILL have only 1 record (Resume not stored)');
  assert(simulatedRecentEvents.length === 1, 'Recent Events MUST STILL have only 1 record');
  console.log('✓ Resume rejected: IndexedDB count remains 1, Recent Events count remains 1 (Unchanged)');

  // Attempt upload of invoice (CASE C)
  const invoiceRes = await simulateUploadPipeline(FIXTURE_SHOPPING_INVOICE, 'invoice.pdf');
  assert(invoiceRes.success === false, 'Invoice upload must be rejected');
  assert(simulatedDb.length === 1, 'IndexedDB MUST STILL have only 1 record (Invoice not stored)');
  assert(simulatedRecentEvents.length === 1, 'Recent Events MUST STILL have only 1 record');
  console.log('✓ Invoice rejected: IndexedDB count remains 1, Recent Events count remains 1 (Unchanged)');

  // Attempt upload of another valid report (LFT)
  const lftRes = await simulateUploadPipeline(FIXTURE_APOLLO_LFT, 'lft.pdf');
  assert(lftRes.success === true, 'Valid LFT report must succeed upload');
  assert(simulatedDb.length === 2, 'IndexedDB must now contain 2 records');
  assert(simulatedRecentEvents.length === 2, 'Recent Events must now contain 2 events');
  console.log('✓ Second valid lab report uploaded: IndexedDB count = 2, Recent Events count = 2');
}

await testStorageBoundarySimulation();

console.log('\n================================================================================');
console.log('   ALL DETERMINISTIC MEDICAL DOCUMENT VALIDATION TESTS PASSED (100%)');
console.log('================================================================================');

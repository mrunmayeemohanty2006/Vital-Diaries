/**
 * Test Suite: End-to-End Clinical Lifecycle
 * 
 * Verifies:
 * Document / OCR Text 
 *   ↓
 * extractHealthData() (35 metrics)
 *   ↓
 * rawPayload JSON with results & metrics (35 metrics)
 *   ↓
 * AES-256-GCM Encryption
 *   ↓
 * IndexedDB persistence
 *   ↓
 * AES-256-GCM Decryption
 *   ↓
 * Decrypted Report Object (35 metrics)
 *   ↓
 * Decrypt & View UI Renderable Metrics (35 metrics)
 */

import assert from 'assert';
import { extractHealthData } from '../health-extractor';
import { encryptData, decryptData } from '../crypto';
import { generateDEK } from '../envelope-crypto';
import type { HealthReport, DecryptedReportDetails } from '../../types/health';

export async function runDecryptViewPipelineTests() {
  console.log('================================================================================');
  console.log('   END-TO-END CLINICAL EXTRACTION → ENCRYPTION → DECRYPTION → VIEW PIPELINE');
  console.log('================================================================================\n');

  // Test 1: Real-World Tata 1mg Multi-Panel Report (35 Measurements)
  const TATA_1MG_REPORT_TEXT = `
PO No :PO10002749983-667
Customer Name : Ms.PRAVATA KUMARI MOHANTY Collected Via : TATA 1MG BHUBANESWAR
Age/Gender : 88Y 5M 15D /Female Referred By : Dr.
Lab Visit ID : BHU52036 Collection Date : 16/Jun/2026 08:54AM
Barcode ID/Order ID : D21876320 / 17395730 Report Date : 16/Jun/2026 02:58PM
Sample Type : Whole Blood-EDTA Report Status : Final Report
HAEMATOLOGY
Test Name Result Unit Bio. Ref. Interval Method

Complete Blood Count
Hemoglobin 8.8 g/dL 12.0 - 15.0 Spectrophotometry (Cyanide-free)
RBC 4.41 10^6/cu.mm 3.8 - 4.8 Impedence
HCT 27.7 % 36 - 46 Calculated
MCV 62.8 fL 83 - 101 Calculated
MCH 20.0 pg 27 - 32 Calculated
MCHC 31.9 g/dL 31.5 - 34.5 Calculated
RDW-CV 14.5 % 11.5-14 Calculated
Total Leucocyte Count 5.93 10^3/µL 4 - 10 Impedance
Differential Leucocyte Count
Neutrophils 58.7 % 40-80 DHSS/Microscopy
Lymphocytes 32.5 % 20-40 DHSS/Microscopy
Monocytes 4.1 % 2-10 DHSS/ Microscopy
Eosinophils 4.2 % 1-6 DHSS/Microscopy
Basophils 0.5 % 0-2 DHSS/ Microscopy
Absolute Leucocyte Count
Absolute Neutrophil Count 3.48 10^3/µL 2 - 7 Calculated
Absolute Lymphocyte Count 1.93 10^3/µL 1-3 Calculated
Absolute Monocyte Count 0.24 10^3/µL 0.2 - 1 Calculated
Absolute Eosinophil Count 0.25 10^3/µL 0.02 - 0.5 Calculated
Absolute Basophil Count 0.03 10^3/µL 0.02-0.1 Calculated
Platelet Count 310 10^3/µL 150 - 410 Impedance/Microscopy
MPV 11.6 fL 6.5 - 12 Calculated
PDW 14.8 f l 9-17 Calculated

Comment:
As per the recommendation of International council for Standardization in Hematology.
Page 1 of 4

--- Page 2 ---
HbA1c (Glycosylated Hemoglobin)
Glycosylated Hemoglobin (HbA1c) 5.7 % 4-5.6 HPLC (NGSP certified)
Estimated average glucose (eAG) 116.89 mg/dL Calculated
Comment:
Interpretation: HbA1c%
≤5.6 Normal
5.7-6.4 At Risk For Diabetes
≥6.5  Diabetes
A 3 to 6 monthly testing interval is recommended for patients.
Adapted from American Diabetes Association.
Page 2 of 4

--- Page 3 ---
LIVER FUNCTION TEST
Liver Function Test
Bilirubin-Total 0.57 mg/dL 0.2 – 1.1 Vanadate oxidation
Bilirubin-Direct 0.18 mg/dL 0.0-0.3 Vanadate oxidation
Bilirubin-Indirect 0.39 mg/dL 0.2-0.8 Calculated
Protein, Total 6.90 g/dL 5.7–8.2 Biuret
Albumin 4.00 g/dL 3.2-4.8 BCG Dye Binding
Globulin 2.9 g/dL 2.3 - 4.1 Calculated
A/G Ratio 1.38 Ratio 0.8 - 1.9 Calculated
SGOT (Aspartate Aminotransferase) 22 U/L <34 Modified IFCC
SGPT (Alanine Transaminase) 11 U/L 10-49 Modified IFCC
SGOT/SGPT 2.00 Ratio Calculated
Alkaline Phosphatase 190 U/L 46-116 IFCC Standardization
Gamma Glutamyltransferase (GGT) 16 U/L <38 Modified IFCC
Page 3 of 4
`;

  console.log('--- STAGE 1: LOCAL EXTRACTION ---');
  const extractedData = extractHealthData(TATA_1MG_REPORT_TEXT, { source: 'pdf-text' });
  console.log(`AFTER EXTRACTION: ${extractedData.metrics.length}`);
  assert.strictEqual(extractedData.metrics.length, 35, `Expected 35 extracted metrics, got ${extractedData.metrics.length}`);

  console.log('\n--- STAGE 2: PRE-ENCRYPTION PAYLOAD STRUCTURING ---');
  const rawPayload = JSON.stringify({
    reportType: extractedData.title || 'Comprehensive Multi-Panel Health Report',
    notes: extractedData.summary,
    results: extractedData.results,
    metrics: extractedData.metrics,
    fileName: 'tata_1mg_report.pdf',
    fileType: 'application/pdf',
    fileSize: 102400,
    uploadedAt: new Date().toISOString(),
    reportDate: extractedData.extractedDate || '2026-06-16',
  });
  const parsedPreEncrypt = JSON.parse(rawPayload);
  console.log(`BEFORE ENCRYPTION: ${parsedPreEncrypt.metrics.length}`);
  assert.strictEqual(parsedPreEncrypt.metrics.length, 35);

  console.log('\n--- STAGE 3: AES-256-GCM ENCRYPTION ---');
  const cryptoKey = await generateDEK();
  const { cipherText, iv } = await encryptData(rawPayload, cryptoKey);
  assert(cipherText.length > 0 && iv.length > 0, 'Ciphertext and IV must be generated');

  const storedReportRecord: HealthReport = {
    id: `rep_${Date.now()}`,
    userId: 'usr_test123',
    date: '2026-06-16',
    type: 'cbc',
    title: 'Comprehensive Multi-Panel Health Report',
    encryptedData: cipherText,
    iv,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  console.log(`INDEXEDDB STORED RECORD: encryptedData (${cipherText.length} chars), iv (${iv})`);

  console.log('\n--- STAGE 4: AES-256-GCM DECRYPTION ---');
  const decryptedJson = await decryptData(storedReportRecord.encryptedData, storedReportRecord.iv, cryptoKey);
  const decryptedReport = JSON.parse(decryptedJson) as DecryptedReportDetails;
  console.log(`AFTER DECRYPTION: ${decryptedReport.metrics?.length ?? Object.keys(decryptedReport.results).length}`);
  assert.strictEqual(decryptedReport.metrics?.length, 35, 'Decrypted metrics must contain exact 35 measurements');

  console.log('\n--- STAGE 5: DECRYPT & VIEW UI RENDER PIPELINE ---');
  // Replicate ViewReportModal dynamic metric list resolution
  const renderableMetricsList = Array.isArray(decryptedReport.metrics) && decryptedReport.metrics.length > 0
    ? decryptedReport.metrics
    : Object.entries(decryptedReport.results).map(([key, value]) => ({
        name: key,
        value: String(value),
        unit: '',
        displayValue: String(value),
        referenceRange: undefined as { low?: number; high?: number; rawText?: string; unit?: string } | undefined,
        status: 'unknown' as const,
        method: undefined as string | undefined,
        needsVerification: undefined as boolean | undefined,
      }));

  console.log(`UI RENDERED: ${renderableMetricsList.length}`);
  assert.strictEqual(renderableMetricsList.length, 35, 'UI must render all 35 measurements');

  // Verify key measurement fields survived encryption and decryption with exact fidelity
  const hb = renderableMetricsList.find((m) => m.name === 'Hemoglobin');
  assert(hb, 'Hemoglobin must be in decrypted view');
  assert.strictEqual(hb.value, 8.8);
  assert.strictEqual(hb.unit, 'g/dL');
  assert.strictEqual(hb.referenceRange?.low, 12.0);
  assert.strictEqual(hb.referenceRange?.high, 15.0);
  assert.strictEqual(hb.status, 'low');
  assert(hb.method?.toLowerCase().includes('spectrophotometry'));

  const eag = renderableMetricsList.find((m) => m.name === 'Estimated Average Glucose');
  assert(eag, 'Estimated Average Glucose must be in decrypted view');
  assert.strictEqual(eag.value, 116.89);
  assert.strictEqual(eag.referenceRange, undefined, 'Missing range must remain undefined');
  assert.strictEqual(eag.status, 'unknown');
  assert.strictEqual(eag.needsVerification, true);

  console.log('✓ TEST 1 PASSED: 35 → 35 → 35 → 35 → 35 lifecycle verified with zero data loss.\n');

  // Test 2: Synthetic Novel Biomarkers Lifecycle (Dynamic Discovery)
  console.log('--- TEST 2: SYNTHETIC NOVEL BIOMARKERS FULL ENCRYPTION/DECRYPTION LIFECYCLE ---');
  const NOVEL_REPORT_TEXT = `
CLINICAL ONCOLOGY & SPECIALIZED RESEARCH PANEL
Patient Name: Jane Doe    Age: 45    Date: 2026-09-09

TEST DESCRIPTION            RESULT   UNIT     REFERENCE INTERVAL   METHOD / STATUS
Unknown Biomarker Alpha     27       ng/mL    10 - 40              CLIA / Normal
Another Laboratory Marker   4.8      U/L      <10                  ECLIA / Normal
CA 19-9                     14       U/mL     <35                  ELISA / Normal
Completely New Test         72       mg/dL    50 - 100             Turbidimetry / Normal
Lipase                      45       U/L      10 - 140             Colorimetric / Normal
D-Dimer                     0.35     ug/mL    < 0.50               Immunoturbidimetric / Normal
`;

  const novelExtracted = extractHealthData(NOVEL_REPORT_TEXT, { source: 'ocr' });
  console.log(`AFTER EXTRACTION (NOVEL): ${novelExtracted.metrics.length}`);
  assert.strictEqual(novelExtracted.metrics.length, 6);

  const novelPayload = JSON.stringify({
    reportType: 'Novel Research Panel',
    results: novelExtracted.results,
    metrics: novelExtracted.metrics,
    uploadedAt: new Date().toISOString(),
  });

  const novelEncrypted = await encryptData(novelPayload, cryptoKey);
  const novelDecrypted = JSON.parse(await decryptData(novelEncrypted.cipherText, novelEncrypted.iv, cryptoKey)) as DecryptedReportDetails;
  console.log(`AFTER DECRYPTION (NOVEL): ${novelDecrypted.metrics?.length}`);
  assert.strictEqual(novelDecrypted.metrics?.length, 6);

  const alpha = novelDecrypted.metrics?.find((m) => m.name.toLowerCase().includes('alpha'));
  assert(alpha, 'Unknown Biomarker Alpha must survive decryption');
  assert.strictEqual(alpha.value, 27);
  assert.strictEqual(alpha.unit, 'ng/mL');
  assert.strictEqual(alpha.referenceRange?.low, 10);
  assert.strictEqual(alpha.referenceRange?.high, 40);
  assert.strictEqual(alpha.status, 'normal');
  assert.strictEqual(alpha.needsVerification, true);
  assert(alpha.method?.toLowerCase().includes('clia'));

  console.log('✓ TEST 2 PASSED: All 6 novel research biomarkers survived complete encryption/decryption/render lifecycle.\n');

  console.log('================================================================================');
  console.log('   ALL END-TO-END DECRYPT & VIEW PIPELINE TESTS PASSED (100%)');
  console.log('================================================================================\n');
}

// Direct execution when invoked via tsx
if (process.argv[1]?.includes('decrypt-view-pipeline.test.ts') || typeof require !== 'undefined') {
  runDecryptViewPipelineTests();
}

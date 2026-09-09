import assert from 'assert';
import { extractHealthData } from '../health-extractor';

export function runGeneralizedExtractionTests() {
  console.log('================================================================================');
  console.log('   GENERALIZED DOCUMENT-FIRST CLINICAL EXTRACTION SUITE');
  console.log('================================================================================\n');

  const TATA_1MG_REAL_WORLD_REPORT_TEXT = `
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
DHSS : Double Hydrodynamic Sequential System Flowcytometry
Calculated parameters are either derived from Impedence measure.
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
A 3 to 6 monthly testing interval is recommended for glycemic control.
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

  console.log('--- TEST 1: Real-World Tata 1mg Multi-Panel Report (Exact 35 Measurements) ---');
  const result1 = extractHealthData(TATA_1MG_REAL_WORLD_REPORT_TEXT, { source: 'pdf-text' });
  console.log(`Total Extracted Metrics: ${result1.metrics.length} (Expected exactly 35)`);
  assert.strictEqual(result1.metrics.length, 35, `Expected exactly 35 clinical measurements, got ${result1.metrics.length}`);

  const names = result1.metrics.map((m) => m.name);

  // CBC & Indices
  const expectedCbc = ['Hemoglobin', 'Total RBC', 'Hematocrit', 'MCV', 'MCH', 'MCHC', 'RDW', 'WBC', 'Platelets', 'MPV', 'PDW'];
  for (const exp of expectedCbc) {
    assert(names.includes(exp), `Expected CBC metric ${exp} in extracted result`);
  }

  // Differentials & Absolute Counts
  const expectedDiff = [
    'Neutrophils', 'Lymphocytes', 'Monocytes', 'Eosinophils', 'Basophils',
    'Absolute Neutrophil Count', 'Absolute Lymphocyte Count', 'Absolute Monocyte Count', 'Absolute Eosinophil Count', 'Absolute Basophil Count'
  ];
  for (const exp of expectedDiff) {
    assert(names.includes(exp), `Expected Differential metric ${exp} in extracted result`);
  }

  // HbA1c & Hepatic
  const expectedHepatic = [
    'HbA1c', 'Estimated Average Glucose',
    'Bilirubin Total', 'Bilirubin Direct', 'Bilirubin Indirect', 'Total Protein', 'Albumin', 'Globulin',
    'A/G Ratio', 'SGOT / AST', 'SGPT / ALT', 'SGOT/SGPT Ratio', 'Alkaline Phosphatase', 'GGT'
  ];
  for (const exp of expectedHepatic) {
    assert(names.includes(exp), `Expected Hepatic/Glycemic metric ${exp} in extracted result`);
  }

  // Value, Reference Range, and Method Validation
  const hb = result1.metrics.find((m) => m.name === 'Hemoglobin');
  assert.strictEqual(hb?.value, 8.8);
  assert.strictEqual(hb?.unit, 'g/dL');
  assert.strictEqual(hb?.referenceRange?.low, 12.0);
  assert.strictEqual(hb?.referenceRange?.high, 15.0);
  assert.strictEqual(hb?.status, 'low');
  assert(hb?.method?.toLowerCase().includes('spectrophotometry'));

  const hba1c = result1.metrics.find((m) => m.name === 'HbA1c');
  assert.strictEqual(hba1c?.value, 5.7);
  assert.strictEqual(hba1c?.unit, '%');
  assert.strictEqual(hba1c?.referenceRange?.low, 4);
  assert.strictEqual(hba1c?.referenceRange?.high, 5.6);
  assert(hba1c?.method?.toLowerCase().includes('hplc'));

  // Test Measurements Without Reference Ranges (DO NOT INVENT RANGES)
  const eag = result1.metrics.find((m) => m.name === 'Estimated Average Glucose');
  assert(eag, 'eAG must be extracted');
  assert.strictEqual(eag.value, 116.89);
  assert.strictEqual(eag.unit, 'mg/dL');
  assert.strictEqual(eag.referenceRange, undefined, 'eAG must not have invented reference range');
  assert.strictEqual(eag.status, 'unknown', 'eAG status must be unknown when no range in document');
  assert.strictEqual(eag.needsVerification, true);

  const ratio = result1.metrics.find((m) => m.name === 'SGOT/SGPT Ratio');
  assert(ratio, 'SGOT/SGPT Ratio must be extracted');
  assert.strictEqual(ratio.value, 2.0);
  assert.strictEqual(ratio.unit, 'Ratio');
  assert.strictEqual(ratio.referenceRange, undefined, 'SGOT/SGPT Ratio must not have invented reference range');
  assert.strictEqual(ratio.status, 'unknown');
  assert.strictEqual(ratio.needsVerification, true);

  const sgot = result1.metrics.find((m) => m.name === 'SGOT / AST');
  assert.strictEqual(sgot?.value, 22);
  assert.strictEqual(sgot?.unit, 'U/L');
  assert.strictEqual(sgot?.referenceRange?.high, 34);
  assert.strictEqual(sgot?.status, 'normal');
  assert(sgot?.method?.toLowerCase().includes('ifcc'));

  // Ensure no non-clinical sentences (e.g. "A 3 to 6 monthly") were extracted
  assert(!names.some((n) => n.toLowerCase().includes('monthly')), 'Sentences with monthly must not become biomarkers');
  assert(!names.some((n) => n.toLowerCase().includes('recommendation')), 'Recommendation lines must not become biomarkers');

  console.log('✓ TEST 1 PASSED: All 35 clinical measurements discovered with exact methods, missing ranges preserved un-fabricated.\n');

  console.log('--- TEST 2: Dynamic Discovery of Completely Unseen Novel Biomarkers ---');
  const UNSEEN_BIOMARKERS_DOC = `
CLINICAL ONCOLOGY & NOVEL RESEARCH BIOMARKER PANEL
Patient Name: Jane Doe    Age: 45    Date: 2026-09-09

TEST DESCRIPTION            RESULT   UNIT     REFERENCE INTERVAL   METHOD / STATUS
Unknown Biomarker Alpha     27       ng/mL    10 - 40              CLIA / Normal
Another Laboratory Marker   4.8      U/L      <10                  ECLIA / Normal
CA 19-9                     14       U/mL     <35                  ELISA / Normal
Completely New Test         72       mg/dL    50 - 100             Turbidimetry / Normal
Lipase                      45       U/L      10 - 140             Colorimetric / Normal
D-Dimer                     0.35     ug/mL    < 0.50               Immunoturbidimetric / Normal
`;

  const result2 = extractHealthData(UNSEEN_BIOMARKERS_DOC, { source: 'ocr' });
  console.log(`Total Extracted Metrics: ${result2.metrics.length} (Expected 6)`);
  assert.strictEqual(result2.metrics.length, 6, `Expected 6 unseen biomarkers, got ${result2.metrics.length}`);

  const alpha = result2.metrics.find((m) => m.name.toLowerCase().includes('biomarker alpha'));
  assert(alpha, 'Unknown Biomarker Alpha must be preserved');
  assert.strictEqual(alpha.value, 27);
  assert.strictEqual(alpha.unit, 'ng/mL');
  assert.strictEqual(alpha.referenceRange?.low, 10);
  assert.strictEqual(alpha.referenceRange?.high, 40);
  assert.strictEqual(alpha.status, 'normal');
  assert.strictEqual(alpha.needsVerification, true);
  assert(alpha.method?.toLowerCase().includes('clia'));

  const another = result2.metrics.find((m) => m.name.toLowerCase().includes('another laboratory marker'));
  assert(another, 'Another Laboratory Marker must be preserved');
  assert.strictEqual(another.value, 4.8);
  assert.strictEqual(another.unit, 'U/L');
  assert.strictEqual(another.referenceRange?.high, 10);
  assert.strictEqual(another.status, 'normal');
  assert.strictEqual(another.needsVerification, true);

  const ca19 = result2.metrics.find((m) => m.name.toLowerCase().includes('ca 19-9'));
  assert(ca19, 'CA 19-9 must be preserved');
  assert.strictEqual(ca19.value, 14);
  assert.strictEqual(ca19.unit, 'U/mL');
  assert.strictEqual(ca19.referenceRange?.high, 35);
  assert.strictEqual(ca19.status, 'normal');

  const completelyNew = result2.metrics.find((m) => m.name.toLowerCase().includes('completely new test'));
  assert(completelyNew, 'Completely New Test must be preserved');
  assert.strictEqual(completelyNew.value, 72);
  assert.strictEqual(completelyNew.unit, 'mg/dL');
  assert.strictEqual(completelyNew.referenceRange?.low, 50);
  assert.strictEqual(completelyNew.referenceRange?.high, 100);
  assert.strictEqual(completelyNew.status, 'normal');
  assert.strictEqual(completelyNew.needsVerification, true);

  console.log('✓ TEST 2 PASSED: All unseen novel biomarkers discovered, methods extracted, and preserved with document truth.\n');

  console.log('--- TEST 3: Administrative Metadata Filtering ---');
  const metadataDoc = `
Customer Name : Ms. PRAVATA KUMARI MOHANTY
Lab Visit ID : BHU52036
Sample Type : Whole Blood-EDTA
Barcode ID/Order ID : D21876320 / 17395730
Page 1 of 4
Report Status : Final Report
DHSS : Double Hydrodynamic Sequential System Flowcytometry
A 3 to 6 monthly testing interval is recommended for patients.
As per the recommendation of International council for Standardization.
`;
  const result3 = extractHealthData(metadataDoc, { source: 'pdf-text' });
  assert.strictEqual(result3.metrics.length, 0, 'Administrative lines must not be parsed as biomarkers');
  console.log('✓ TEST 3 PASSED: Administrative metadata correctly excluded.\n');

  console.log('================================================================================');
  console.log('   ALL GENERALIZED DOCUMENT-FIRST EXTRACTION TESTS PASSED (100%)');
  console.log('================================================================================\n');
}

// Direct execution when invoked via tsx
if (process.argv[1]?.includes('generalized-document-extraction.test.ts') || typeof require !== 'undefined') {
  runGeneralizedExtractionTests();
}

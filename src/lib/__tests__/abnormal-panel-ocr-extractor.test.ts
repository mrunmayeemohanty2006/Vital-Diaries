/**
 * Test Suite: Abnormal Health Panel Table Extraction & Numeric Sanity Verification
 * 
 * Verifies:
 * 1. Extraction of the ground truth abnormal panel report with 25 biomarkers.
 * 2. Row-Aware and Section-Aware Table Extraction (CBC, Iron, Vitamins, Biochemistry).
 * 3. Degraded OCR failure pattern handling:
 *    - Preserves raw values verbatim (no silent mathematical mutation).
 *    - Flags suspicious/decimal-dropped values with `needsVerification: true` and status `'unknown'`.
 *    - Rejects corrupted reference ranges (e.g. 0-15, 30-170, 86-102, 0.40-450).
 *    - Evaluates clean values accurately (Serum Iron: LOW, UIBC: HIGH, Transferrin Sat: LOW, TIBC: NORMAL, Ferritin: NORMAL).
 */

import { extractHealthData } from '../health-extractor';

export function runAbnormalPanelTests() {
  console.log('=====================================================');
  console.log('  ABNORMAL HEALTH PANEL OCR EXTRACTION & VERIFICATION');
  console.log('=====================================================\n');

  // 1. Full Abnormal Laboratory Panel Ground Truth Report
  const groundTruthReport = `
  METROPOLIS HEALTHCARE LABS
  PATIENT HEALTH REPORT - COMPREHENSIVE HEMATOLOGY & METABOLIC PANEL
  Date: 14-Aug-2026

  TEST | RESULT | UNIT | REFERENCE RANGE | STATUS

  COMPLETE BLOOD COUNT (CBC):
  Hemoglobin (Hb) 11.2 g/dL 12.0 - 15.0 Low
  Total RBC Count 4.20 million/uL 3.80 - 5.20 Normal
  Hematocrit (PCV) 35.5 % 36.0 - 46.0 Low
  MCV 84.5 fL 80.0 - 96.0 Normal
  MCH 26.7 pg 26.0 - 32.0 Normal
  MCHC 31.5 g/dL 31.0 - 36.0 Normal
  RDW-CV 14.8 % 11.5 - 14.5 High
  Total WBC Count 6,200 cells/uL 4,000 - 11,000 Normal
  Neutrophils 58 % 40 - 70 Normal
  Lymphocytes 32 % 20 - 40 Normal
  Monocytes 6 % 2 - 10 Normal
  Eosinophils 3 % 1 - 6 Normal
  Basophils 1 % 0 - 1 Normal
  Platelet Count 2.45 lakh/uL 1.5 - 4.5 Normal

  IRON STUDIES:
  Serum Iron 38 ug/dL 60 - 170 Low
  TIBC 410 ug/dL 250 - 450 Normal
  UIBC 372 ug/dL 150 - 350 High
  Transferrin Saturation 9.3 % 20 - 50 Low
  Ferritin 15 ng/mL 15 - 150 Normal

  VITAMINS:
  Vitamin B12 412 pg/mL 200 - 900 Normal
  Folate (Serum) 6.1 ng/mL 3.0 - 17.0 Normal
  Vitamin D (25-OH) 18.5 ng/mL 30 - 100 Low

  OTHER BIOCHEMISTRY:
  Fasting Blood Sugar 89 mg/dL 70 - 100 Normal
  Serum Calcium 9.2 mg/dL 8.6 - 10.2 Normal
  TSH 2.34 uIU/mL 0.40 - 4.50 Normal
  `;

  console.log('--- TEST 1: Extracting Ground Truth Abnormal Report ---');
  const extracted = extractHealthData(groundTruthReport, { source: 'pdf-text' });
  console.log(`Total Extracted Metrics: ${extracted.metrics.length}`);

  const metricMap = new Map(extracted.metrics.map((m) => [m.name, m]));

  const expectedValues: Record<string, { value: number; unit: string; status: string; needsVerification: boolean }> = {
    Hemoglobin: { value: 11.2, unit: 'g/dL', status: 'low', needsVerification: false },
    'Total RBC': { value: 4.2, unit: 'million/uL', status: 'normal', needsVerification: false },
    Hematocrit: { value: 35.5, unit: '%', status: 'low', needsVerification: false },
    MCV: { value: 84.5, unit: 'fL', status: 'normal', needsVerification: false },
    MCH: { value: 26.7, unit: 'pg', status: 'normal', needsVerification: false },
    MCHC: { value: 31.5, unit: 'g/dL', status: 'normal', needsVerification: false },
    RDW: { value: 14.8, unit: '%', status: 'high', needsVerification: false },
    WBC: { value: 6200, unit: 'cells/uL', status: 'normal', needsVerification: false },
    Neutrophils: { value: 58, unit: '%', status: 'normal', needsVerification: false },
    Lymphocytes: { value: 32, unit: '%', status: 'normal', needsVerification: false },
    Monocytes: { value: 6, unit: '%', status: 'normal', needsVerification: false },
    Eosinophils: { value: 3, unit: '%', status: 'normal', needsVerification: false },
    Basophils: { value: 1, unit: '%', status: 'normal', needsVerification: false },
    Platelets: { value: 2.45, unit: 'lakh/uL', status: 'normal', needsVerification: false },
    'Serum Iron': { value: 38, unit: 'ug/dL', status: 'low', needsVerification: false },
    TIBC: { value: 410, unit: 'ug/dL', status: 'normal', needsVerification: false },
    UIBC: { value: 372, unit: 'ug/dL', status: 'high', needsVerification: false },
    'Transferrin Saturation': { value: 9.3, unit: '%', status: 'low', needsVerification: false },
    Ferritin: { value: 15, unit: 'ng/mL', status: 'normal', needsVerification: false },
    'Vitamin B12': { value: 412, unit: 'pg/mL', status: 'normal', needsVerification: false },
    Folate: { value: 6.1, unit: 'ng/mL', status: 'normal', needsVerification: false },
    'Vitamin D': { value: 18.5, unit: 'ng/mL', status: 'low', needsVerification: false },
    'Fasting Glucose': { value: 89, unit: 'mg/dL', status: 'normal', needsVerification: false },
    Calcium: { value: 9.2, unit: 'mg/dL', status: 'normal', needsVerification: false },
    TSH: { value: 2.34, unit: 'uIU/mL', status: 'normal', needsVerification: false },
  };

  for (const [param, exp] of Object.entries(expectedValues)) {
    const found = metricMap.get(param);
    if (!found) {
      throw new Error(`FAIL: Missing metric "${param}" in extracted results`);
    }
    if (Math.abs(Number(found.value) - exp.value) > 0.001) {
      throw new Error(`FAIL: "${param}" expected value ${exp.value}, got ${found.value}`);
    }
    if (found.unit.toLowerCase() !== exp.unit.toLowerCase()) {
      throw new Error(`FAIL: "${param}" expected unit ${exp.unit}, got ${found.unit}`);
    }
    if (found.status !== exp.status) {
      throw new Error(`FAIL: "${param}" expected status ${exp.status}, got ${found.status}`);
    }
    if (found.needsVerification !== exp.needsVerification) {
      throw new Error(`FAIL: "${param}" expected needsVerification=${exp.needsVerification}, got ${found.needsVerification}`);
    }
    console.log(`✓ ${param.padEnd(24)}: ${String(found.value).padEnd(6)} ${found.unit.padEnd(12)} -> Status: ${found.status.toUpperCase()}`);
  }

  console.log('\n--- TEST 2: OCR Typo & Unit Normalization ---');
  const typoOCR = `
  Serum Iron 38 pa/dL 60 - 170 Low
  TSH 2.34 iu/mL 0.40 - 4.50 Normal
  Total RBC Count 4.20 million/pL 3.8 - 5.2 Normal
  `;
  const typoExtracted = extractHealthData(typoOCR);
  const typoIron = typoExtracted.metrics.find((m) => m.name === 'Serum Iron');
  const typoTSH = typoExtracted.metrics.find((m) => m.name === 'TSH');
  const typoRBC = typoExtracted.metrics.find((m) => m.name === 'Total RBC');

  if (typoIron?.unit !== 'ug/dL') throw new Error(`Expected pa/dL -> ug/dL, got ${typoIron?.unit}`);
  if (typoTSH?.unit !== 'uIU/mL') throw new Error(`Expected iu/mL -> uIU/mL, got ${typoTSH?.unit}`);
  if (typoRBC?.unit !== 'million/uL') throw new Error(`Expected million/pL -> million/uL, got ${typoRBC?.unit}`);
  console.log('✓ pa/dL normalized accurately to ug/dL');
  console.log('✓ iu/mL normalized accurately to uIU/mL');
  console.log('✓ million/pL normalized accurately to million/uL');

  console.log('\n--- TEST 3: User Actual Corrupted OCR Output Verification ---');
  const userProblemOCR = `
  COMPLETE BLOOD COUNT (CBC):
  Hemoglobin (Hb)        1.2     g/dL        0 - 15        Low
  Total RBC Count        4.20    million/pL  3.8 - 5.2    Normal
  Hematocrit (PCV)       355     %           36 - 46       Low
  MCV                    84.5    fL          80 - 96       Normal
  MCH                    26.7    pg          26 - 32       Normal
  MCHC                   31.5    g/dL        31 - 36       Normal
  RDW-CV                 14.8    %           11.5 - 14.5   High
  Total WBC Count        6200    cells/uL    4000 - 11000  Normal
  Neutrophils            58      %           40 - 70       Normal
  Lymphocytes            32      %           20 - 40       Normal
  Monocytes              6       %           2 - 10        Normal
  Eosinophils            3       %           1 - 6         Normal
  Basophils              1       %           0 - 1         Normal
  Platelet Count         245     lakh/uL     15 - 45       Normal

  IRON STUDIES:
  Serum Iron             38      ug/dL       60 - 170      Low
  TIBC                   410     ug/dL       250 - 450     Normal
  UIBC                   372     ug/dL       150 - 350     High
  Transferrin Saturation 9.3     %           20 - 50       Low
  Ferritin               15      ng/mL       15 - 150      Low-Normal

  VITAMINS:
  Vitamin B12            412     pg/mL       200 - 900     Normal
  Folate (Serum)         61      ng/mL       30 - 170      Normal
  Vitamin D (25-OH)      185     ng/mL       30 - 100      Low

  OTHER BIOCHEMISTRY:
  Fasting Blood Sugar    89      mg/dL       70 - 100      Normal
  Serum Calcium          92      mg/dL       86 - 102      Normal
  TSH                    2.34    iu/mL       0.40 - 450    Normal
  `;

  const userRes = extractHealthData(userProblemOCR, { source: 'ocr' });
  const userMap = new Map(userRes.metrics.map((m) => [m.name, m]));

  // 1. Hemoglobin (value 1.2 preserved verbatim, ref 0-15 rejected as corrupted, status=unknown)
  const hb = userMap.get('Hemoglobin');
  if (!hb || hb.value !== 1.2 || !hb.needsVerification || hb.status !== 'unknown') {
    throw new Error(`FAIL Hemoglobin: expected val=1.2, needsVerification=true, status=unknown; got ${JSON.stringify(hb)}`);
  }

  // 2. Hematocrit (value 355 preserved verbatim, status=unknown)
  const hct = userMap.get('Hematocrit');
  if (!hct || hct.value !== 355 || !hct.needsVerification || hct.status !== 'unknown') {
    throw new Error(`FAIL Hematocrit: expected val=355, needsVerification=true, status=unknown; got ${JSON.stringify(hct)}`);
  }

  // 3. Platelets (value 245 preserved verbatim, ref 15-45 rejected, status=unknown)
  const plt = userMap.get('Platelets');
  if (!plt || plt.value !== 245 || plt.unit !== 'lakh/uL' || !plt.needsVerification || plt.status !== 'unknown') {
    throw new Error(`FAIL Platelets: expected val=245, unit=lakh/uL, needsVerification=true, status=unknown; got ${JSON.stringify(plt)}`);
  }

  // 4. Serum Iron (clean: 38 ug/dL, ref 60-170 -> LOW)
  const iron = userMap.get('Serum Iron');
  if (!iron || iron.value !== 38 || iron.unit !== 'ug/dL' || iron.status !== 'low' || iron.needsVerification) {
    throw new Error(`FAIL Serum Iron: expected val=38, unit=ug/dL, status=low; got ${JSON.stringify(iron)}`);
  }

  // 5. TIBC (clean: 410 ug/dL, ref 250-450 -> NORMAL)
  const tibc = userMap.get('TIBC');
  if (!tibc || tibc.value !== 410 || tibc.unit !== 'ug/dL' || tibc.status !== 'normal') {
    throw new Error(`FAIL TIBC: expected val=410, unit=ug/dL, status=normal; got ${JSON.stringify(tibc)}`);
  }

  // 6. UIBC (clean: 372 ug/dL, ref 150-350 -> HIGH)
  const uibc = userMap.get('UIBC');
  if (!uibc || uibc.value !== 372 || uibc.unit !== 'ug/dL' || uibc.status !== 'high') {
    throw new Error(`FAIL UIBC: expected val=372, unit=ug/dL, status=high; got ${JSON.stringify(uibc)}`);
  }

  // 7. Transferrin Saturation (clean: 9.3 %, ref 20-50 -> LOW)
  const trans = userMap.get('Transferrin Saturation');
  if (!trans || trans.value !== 9.3 || trans.unit !== '%' || trans.status !== 'low') {
    throw new Error(`FAIL Transferrin Saturation: expected val=9.3, unit=%, status=low; got ${JSON.stringify(trans)}`);
  }

  // 8. Ferritin (clean: 15 ng/mL, ref 15-150 -> LOW-NORMAL / NORMAL)
  const fer = userMap.get('Ferritin');
  if (!fer || fer.value !== 15 || fer.unit !== 'ng/mL' || (fer.status !== 'normal' && fer.status !== 'low-normal')) {
    throw new Error(`FAIL Ferritin: expected val=15, unit=ng/mL, status=normal|low-normal; got ${JSON.stringify(fer)}`);
  }

  // 9. Folate (value 61 preserved verbatim, ref 30-170 rejected, status=unknown)
  const fol = userMap.get('Folate');
  if (!fol || fol.value !== 61 || fol.unit !== 'ng/mL' || !fol.needsVerification || fol.status !== 'unknown') {
    throw new Error(`FAIL Folate: expected val=61, needsVerification=true, status=unknown; got ${JSON.stringify(fol)}`);
  }

  // 10. Vitamin D (value 185 preserved verbatim, status=unknown)
  const vitD = userMap.get('Vitamin D');
  if (!vitD || vitD.value !== 185 || vitD.unit !== 'ng/mL' || !vitD.needsVerification || vitD.status !== 'unknown') {
    throw new Error(`FAIL Vitamin D: expected val=185, needsVerification=true, status=unknown; got ${JSON.stringify(vitD)}`);
  }

  // 11. Serum Calcium (value 92 preserved verbatim, ref 86-102 rejected, status=unknown)
  const ca = userMap.get('Calcium');
  if (!ca || ca.value !== 92 || ca.unit !== 'mg/dL' || !ca.needsVerification || ca.status !== 'unknown') {
    throw new Error(`FAIL Calcium: expected val=92, needsVerification=true, status=unknown; got ${JSON.stringify(ca)}`);
  }

  // 12. TSH (value 2.34 preserved, unit=uIU/mL, ref 0.40-450 rejected, status=unknown)
  const tsh = userMap.get('TSH');
  if (!tsh || tsh.value !== 2.34 || tsh.unit !== 'uIU/mL' || !tsh.needsVerification || tsh.status !== 'unknown') {
    throw new Error(`FAIL TSH: expected val=2.34, unit=uIU/mL, needsVerification=true, status=unknown; got ${JSON.stringify(tsh)}`);
  }

  console.log('✓ TEST 3 PASSED: Actual corrupted OCR text verified against ground truth, safety invariants, and section isolation.');

  console.log('\n=====================================================');
  console.log('  ALL ABNORMAL HEALTH PANEL TESTS PASSED (100%)');
  console.log('=====================================================\n');
}

if (process.argv[1] && process.argv[1].includes('abnormal-panel-ocr-extractor.test.ts')) {
  runAbnormalPanelTests();
}

/**
 * Test Suite: Comprehensive Health Panel OCR & Extractor Validation
 * Tests the real raw OCR text from the user's uploaded report against the improved extractor.
 */

import { extractHealthData } from '../health-extractor';

export function runHealthPanelExtractionTests() {
  console.log('=====================================================');
  console.log('  COMPREHENSIVE HEALTH PANEL OCR EXTRACTION TESTS');
  console.log('=====================================================\n');

  const rawOcrReport = `
    CITY PATHOLOGY LABORATORIES
    Date: 2026-09-02
    Patient: Adult Female
    
    COMPLETE BLOOD COUNT (CBC):
    Hemoglobin (Hb) 13.6 g/dL 12.0 - 15.0 Normal
    Total RBC Count 4.85 million/uL 3.80 - 5.20 Normal
    Hematocrit (PCV) 41.2 % 36 - 46 Normal
    MCV 85.0 fL 80 - 96 Normal
    MCH 28.0 Pg 26-32 Normal
    MCHC 32.9 g/dL 31-36 Normal
    RDW-CV 13.2 % 11.5 - 14.5 Normal
    Total WBC Count 7,800 cells/uL 4,000 - 11,000 Normal
    Neutrophils 62 % 40-70 Normal
    Lymphocytes 28 % 20 - 40 Normal
    Monocytes 6 % 2-10 Normal
    Eosinophils 3 % 1-6 Normal
    Basophils 1 % 0-1 Normal
    Platelet Count 3.05 lakh/pL 1.5 - 4.5 Normal
    
    IRON PROFILE:
    Serum Iron 105 Hg/dL 60 - 170 Normal
    TBC 330 Hg/dL 250 - 450 Normal
    UIBC 225 Hg/dL 150 - 350 Normal
    Transferrin Saturation 32.0 % 20 - 50 Normal
    
    VITAMINS & BIOCHEMISTRY:
    Vitamin B12 650 pg/mL 200 - 900 Normal
    Folate (Serum) 12.4 ng/mL. 3.0-17.0 Normal
    Vitamin D (25-OH) 42.7 ng/mL. 30 - 100 Normal
    Fasting Blood Sugar 922 mg/dL 70 - 100 Normal
    Serum Calcium 9.6 mg/dL. 8.6 - 10.2 Normal
    TSH 1.82 piu/mL 0.40 - 4.50 Normal
  `;

  const extracted = extractHealthData(rawOcrReport);

  console.log(`Total Extracted Metrics: ${extracted.metrics.length} / 24`);

  // 1. Hemoglobin Check
  const hb = extracted.metrics.find((m) => m.name === 'Hemoglobin');
  if (!hb) throw new Error('FAIL: Hemoglobin not extracted');
  console.log('1. Hemoglobin:', { value: hb.value, unit: hb.unit, ref: hb.referenceRange, status: hb.status });
  if (hb.value !== 13.6) throw new Error(`Expected 13.6, got ${hb.value}`);
  if (hb.unit !== 'g/dL') throw new Error(`Expected g/dL, got ${hb.unit}`);
  if (hb.referenceRange?.low !== 12.0 || hb.referenceRange?.high !== 15.0) {
    throw new Error(`Expected ref 12.0 - 15.0, got ${JSON.stringify(hb.referenceRange)}`);
  }
  if (hb.status !== 'normal') throw new Error(`Expected normal status, got ${hb.status}`);

  // 2. Total RBC Check
  const rbc = extracted.metrics.find((m) => m.name === 'Total RBC');
  if (!rbc || rbc.value !== 4.85 || rbc.unit !== 'million/uL') throw new Error('FAIL: Total RBC');
  console.log('2. Total RBC:', { value: rbc.value, unit: rbc.unit, ref: rbc.referenceRange });

  // 3. Hematocrit Check
  const hct = extracted.metrics.find((m) => m.name === 'Hematocrit');
  if (!hct || hct.value !== 41.2 || hct.unit !== '%') throw new Error('FAIL: Hematocrit');

  // 4. MCV Check
  const mcv = extracted.metrics.find((m) => m.name === 'MCV');
  if (!mcv || mcv.value !== 85.0 || mcv.unit !== 'fL') throw new Error('FAIL: MCV');

  // 5. MCH Check (Pg -> pg unit normalization)
  const mch = extracted.metrics.find((m) => m.name === 'MCH');
  if (!mch || mch.value !== 28.0 || mch.unit !== 'pg') throw new Error('FAIL: MCH');

  // 6. MCHC Check
  const mchc = extracted.metrics.find((m) => m.name === 'MCHC');
  if (!mchc || mchc.value !== 32.9) throw new Error('FAIL: MCHC');

  // 7. RDW Check (Regression test for 11.5 - 14.5 %)
  const rdw = extracted.metrics.find((m) => m.name === 'RDW');
  if (!rdw || rdw.value !== 13.2 || rdw.unit !== '%') throw new Error('FAIL: RDW value/unit');
  console.log('7. RDW:', { value: rdw.value, unit: rdw.unit, ref: rdw.referenceRange, status: rdw.status });
  if (rdw.referenceRange?.low !== 11.5 || rdw.referenceRange?.high !== 14.5) {
    throw new Error(`Expected RDW ref 11.5 - 14.5, got ${JSON.stringify(rdw.referenceRange)}`);
  }
  if (rdw.status !== 'normal') throw new Error(`Expected RDW status normal, got ${rdw.status}`);

  // 8. WBC Check (Comma in 7,800 -> 7800)
  const wbc = extracted.metrics.find((m) => m.name === 'WBC');
  if (!wbc || wbc.value !== 7800 || wbc.unit !== 'cells/uL') throw new Error('FAIL: WBC');
  console.log('8. WBC:', { value: wbc.value, unit: wbc.unit, ref: wbc.referenceRange });

  // 9-13. Differentials
  const neut = extracted.metrics.find((m) => m.name === 'Neutrophils');
  const lymph = extracted.metrics.find((m) => m.name === 'Lymphocytes');
  const mono = extracted.metrics.find((m) => m.name === 'Monocytes');
  const eos = extracted.metrics.find((m) => m.name === 'Eosinophils');
  const baso = extracted.metrics.find((m) => m.name === 'Basophils');
  if (!neut || neut.value !== 62) throw new Error('FAIL: Neutrophils');
  if (!lymph || lymph.value !== 28) throw new Error('FAIL: Lymphocytes');
  if (!mono || mono.value !== 6) throw new Error('FAIL: Monocytes');
  if (!eos || eos.value !== 3) throw new Error('FAIL: Eosinophils');
  if (!baso || baso.value !== 1) throw new Error('FAIL: Basophils');

  // 14. Platelets Check (Regression test for 1.5 - 4.5 lakh/uL -> Normal)
  const plt = extracted.metrics.find((m) => m.name === 'Platelets');
  if (!plt || plt.value !== 3.05 || plt.unit !== 'lakh/uL') throw new Error('FAIL: Platelets value/unit');
  console.log('14. Platelets:', { value: plt.value, unit: plt.unit, ref: plt.referenceRange, status: plt.status });
  if (plt.referenceRange?.low !== 1.5 || plt.referenceRange?.high !== 4.5) {
    throw new Error(`Expected Platelets ref 1.5 - 4.5, got ${JSON.stringify(plt.referenceRange)}`);
  }
  if (plt.status !== 'normal') throw new Error(`Expected Platelets status normal, got ${plt.status}`);

  // 15-18. Iron Profile (Hg/dL -> ug/dL)
  const iron = extracted.metrics.find((m) => m.name === 'Serum Iron');
  const tibc = extracted.metrics.find((m) => m.name === 'TIBC');
  const uibc = extracted.metrics.find((m) => m.name === 'UIBC');
  const trans = extracted.metrics.find((m) => m.name === 'Transferrin Saturation');
  if (!iron || iron.value !== 105 || iron.unit !== 'ug/dL') throw new Error('FAIL: Serum Iron');
  if (!tibc || tibc.value !== 330 || tibc.unit !== 'ug/dL') throw new Error('FAIL: TIBC');
  if (!uibc || uibc.value !== 225 || uibc.unit !== 'ug/dL') throw new Error('FAIL: UIBC');
  if (!trans || trans.value !== 32.0 || trans.unit !== '%') throw new Error('FAIL: Transferrin Saturation');

  // 19-21. Vitamins
  const b12 = extracted.metrics.find((m) => m.name === 'Vitamin B12');
  const folate = extracted.metrics.find((m) => m.name === 'Folate');
  const vitd = extracted.metrics.find((m) => m.name === 'Vitamin D');
  if (!b12 || b12.value !== 650 || b12.unit !== 'pg/mL') throw new Error('FAIL: Vitamin B12');
  if (!folate || folate.value !== 12.4 || folate.unit !== 'ng/mL') throw new Error('FAIL: Folate');
  if (!vitd || vitd.value !== 42.7 || vitd.unit !== 'ng/mL') throw new Error('FAIL: Vitamin D');

  // 22. Fasting Blood Sugar Validation Check (Needs Verification preserved, not silently changed)
  const fbs = extracted.metrics.find((m) => m.name === 'Fasting Glucose');
  if (!fbs || fbs.value !== 922) throw new Error('FAIL: Fasting Blood Sugar');
  console.log('22. Fasting Blood Sugar:', { value: fbs.value, needsVerification: fbs.needsVerification, reason: fbs.verificationReason });
  if (!fbs.needsVerification) throw new Error('Expected Fasting Glucose 922 to be flagged as needsVerification');

  // 23. Serum Calcium (8.6 - 10.2 -> Normal)
  const ca = extracted.metrics.find((m) => m.name === 'Calcium');
  if (!ca || ca.value !== 9.6 || ca.unit !== 'mg/dL') throw new Error('FAIL: Calcium');
  console.log('23. Calcium:', { value: ca.value, unit: ca.unit, ref: ca.referenceRange, status: ca.status });
  if (ca.referenceRange?.low !== 8.6 || ca.referenceRange?.high !== 10.2) {
    throw new Error(`Expected Calcium ref 8.6 - 10.2, got ${JSON.stringify(ca.referenceRange)}`);
  }
  if (ca.status !== 'normal') throw new Error(`Expected Calcium status normal, got ${ca.status}`);

  // 24. TSH (0.40 - 4.50 -> Normal)
  const tsh = extracted.metrics.find((m) => m.name === 'TSH');
  if (!tsh || tsh.value !== 1.82 || tsh.unit !== 'uIU/mL') throw new Error('FAIL: TSH');
  console.log('24. TSH:', { value: tsh.value, unit: tsh.unit, ref: tsh.referenceRange, status: tsh.status });
  if (tsh.referenceRange?.low !== 0.40 || tsh.referenceRange?.high !== 4.50) {
    throw new Error(`Expected TSH ref 0.40 - 4.50, got ${JSON.stringify(tsh.referenceRange)}`);
  }
  if (tsh.status !== 'normal') throw new Error(`Expected TSH status normal, got ${tsh.status}`);

  console.log('\n=====================================================');
  console.log('  ALL 24 HEALTH PANEL METRICS VALIDATED SUCCESSFULLY!');
  console.log('=====================================================\n');
}

if (process.argv[1] && process.argv[1].includes('health-panel-ocr-extractor.test.ts')) {
  runHealthPanelExtractionTests();
}

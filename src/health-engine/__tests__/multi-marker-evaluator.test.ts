/**
 * Test Suite: Multi-Marker Local Health Intelligence Evaluation
 * 
 * Verifies all 28 priority health markers across 6 clinical panels:
 * 1. CBC: Hemoglobin, RBC, Hematocrit, MCV, MCH, MCHC, RDW, WBC, Neutrophils, Lymphocytes, Monocytes, Eosinophils, Basophils, Platelets
 * 2. Iron: Serum Iron, Ferritin, TIBC, UIBC, Transferrin Saturation
 * 3. Vitamins: Vitamin B12, Folate, Vitamin D
 * 4. Metabolic: Fasting Glucose, HbA1c, Calcium
 * 5. Thyroid: TSH
 * 6. Kidney: Creatinine, Urea
 */

import { evaluateHealthMarker, evaluateAllHealthMarkers } from '../evaluator/evaluate-marker';
import { getHealthKnowledgeEntry, BUNDLED_KNOWLEDGE_ENTRIES } from '../knowledge';

export function runMultiMarkerEvaluatorTests() {
  console.log('=====================================================');
  console.log('  MULTI-MARKER LOCAL HEALTH INTELLIGENCE TESTS');
  console.log('=====================================================\n');

  const supportedMarkers = [
    // CBC (14)
    { name: 'Hemoglobin', value: 13.6, unit: 'g/dL', ref: { low: 12.0, high: 15.0 }, expectedStatus: 'normal' },
    { name: 'Total RBC', value: 4.85, unit: 'million/uL', ref: { low: 3.80, high: 5.20 }, expectedStatus: 'normal' },
    { name: 'Hematocrit', value: 41.2, unit: '%', ref: { low: 36.0, high: 46.0 }, expectedStatus: 'normal' },
    { name: 'MCV', value: 85.0, unit: 'fL', ref: { low: 80.0, high: 96.0 }, expectedStatus: 'normal' },
    { name: 'MCH', value: 28.0, unit: 'pg', ref: { low: 26.0, high: 32.0 }, expectedStatus: 'normal' },
    { name: 'MCHC', value: 32.9, unit: 'g/dL', ref: { low: 31.0, high: 36.0 }, expectedStatus: 'normal' },
    { name: 'RDW', value: 13.2, unit: '%', ref: { low: 11.5, high: 14.5 }, expectedStatus: 'normal' },
    { name: 'WBC', value: 7800, unit: 'cells/uL', ref: { low: 4000, high: 11000 }, expectedStatus: 'normal' },
    { name: 'Neutrophils', value: 62, unit: '%', ref: { low: 40, high: 70 }, expectedStatus: 'normal' },
    { name: 'Lymphocytes', value: 28, unit: '%', ref: { low: 20, high: 40 }, expectedStatus: 'normal' },
    { name: 'Monocytes', value: 6, unit: '%', ref: { low: 2, high: 10 }, expectedStatus: 'normal' },
    { name: 'Eosinophils', value: 3, unit: '%', ref: { low: 1, high: 6 }, expectedStatus: 'normal' },
    { name: 'Basophils', value: 1, unit: '%', ref: { low: 0, high: 1 }, expectedStatus: 'normal' },
    { name: 'Platelets', value: 3.05, unit: 'lakh/uL', ref: { low: 1.5, high: 4.5 }, expectedStatus: 'normal' },

    // Iron (5)
    { name: 'Serum Iron', value: 105, unit: 'ug/dL', ref: { low: 60, high: 170 }, expectedStatus: 'normal' },
    { name: 'Ferritin', value: 18, unit: 'ng/mL', ref: { low: 30, high: 200 }, expectedStatus: 'low' },
    { name: 'TIBC', value: 330, unit: 'ug/dL', ref: { low: 250, high: 450 }, expectedStatus: 'normal' },
    { name: 'UIBC', value: 225, unit: 'ug/dL', ref: { low: 150, high: 350 }, expectedStatus: 'normal' },
    { name: 'Transferrin Saturation', value: 32.0, unit: '%', ref: { low: 20, high: 50 }, expectedStatus: 'normal' },

    // Vitamins (3)
    { name: 'Vitamin B12', value: 650, unit: 'pg/mL', ref: { low: 200, high: 900 }, expectedStatus: 'normal' },
    { name: 'Folate', value: 12.4, unit: 'ng/mL', ref: { low: 3.0, high: 17.0 }, expectedStatus: 'normal' },
    { name: 'Vitamin D', value: 42.7, unit: 'ng/mL', ref: { low: 30, high: 100 }, expectedStatus: 'normal' },

    // Metabolic (3)
    { name: 'Fasting Glucose', value: 108, unit: 'mg/dL', ref: { low: 70, high: 99 }, expectedStatus: 'high' },
    { name: 'HbA1c', value: 5.4, unit: '%', ref: { low: 4.0, high: 5.6 }, expectedStatus: 'normal' },
    { name: 'Calcium', value: 9.6, unit: 'mg/dL', ref: { low: 8.6, high: 10.2 }, expectedStatus: 'normal' },

    // Thyroid (1)
    { name: 'TSH', value: 1.82, unit: 'uIU/mL', ref: { low: 0.40, high: 4.50 }, expectedStatus: 'normal' },

    // Kidney (2)
    { name: 'Creatinine', value: 0.9, unit: 'mg/dL', ref: { low: 0.6, high: 1.2 }, expectedStatus: 'normal' },
    { name: 'Urea', value: 14, unit: 'mg/dL', ref: { low: 7, high: 20 }, expectedStatus: 'normal' },
  ];

  console.log(`Registered Knowledge Entries Count: ${Object.keys(BUNDLED_KNOWLEDGE_ENTRIES).length}`);
  console.log(`Total Markers Under Test: ${supportedMarkers.length}\n`);

  for (const m of supportedMarkers) {
    const entry = getHealthKnowledgeEntry(m.name);
    if (!entry) {
      throw new Error(`FAIL: Knowledge entry not found for "${m.name}"`);
    }

    const evaluated = evaluateHealthMarker({
      name: m.name,
      value: m.value,
      unit: m.unit,
      referenceRange: m.ref,
    });

    if (!evaluated) {
      throw new Error(`FAIL: Evaluation returned null for "${m.name}"`);
    }

    if (evaluated.status !== m.expectedStatus) {
      throw new Error(`FAIL: "${m.name}" expected status ${m.expectedStatus}, got ${evaluated.status}`);
    }

    if (!evaluated.interpretation?.meaning) {
      throw new Error(`FAIL: Missing interpretation meaning for "${m.name}"`);
    }

    if (!evaluated.isDeterministic) {
      throw new Error(`FAIL: isDeterministic should be true for "${m.name}"`);
    }

    console.log(`✓ ${m.name.padEnd(24)} -> ${evaluated.status.toUpperCase().padEnd(8)} [Key: ${evaluated.knowledgeKey}]`);
  }

  // Batch Multi-Marker Evaluation Test
  console.log('\nTesting evaluateAllHealthMarkers batch processing:');
  const batchEvaluated = evaluateAllHealthMarkers(
    supportedMarkers.map((m) => ({
      name: m.name,
      value: m.value,
      unit: m.unit,
      referenceRange: m.ref,
    }))
  );

  if (batchEvaluated.length !== supportedMarkers.length) {
    throw new Error(`Expected ${supportedMarkers.length} evaluated insights, got ${batchEvaluated.length}`);
  }

  console.log(`✓ Batch evaluated ${batchEvaluated.length}/${supportedMarkers.length} biomarkers successfully.\n`);

  console.log('=====================================================');
  console.log('  ALL MULTI-MARKER TESTS PASSED SUCCESSFULLY!');
  console.log('=====================================================\n');
}

if (process.argv[1] && process.argv[1].includes('multi-marker-evaluator.test.ts')) {
  runMultiMarkerEvaluatorTests();
}

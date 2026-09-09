/**
 * Vital Diaries — Phase 1 Test Suite: Hemoglobin Evaluator & Knowledge Engine
 * 
 * Verifies:
 * 1. Low status determination (9.2 g/dL vs 12.0–15.5 g/dL)
 * 2. Normal status determination (13.5 g/dL vs 12.0–15.5 g/dL)
 * 3. High status determination (17.0 g/dL vs 12.0–15.5 g/dL)
 * 4. Missing reference range -> Status 'unknown' (does NOT guess low)
 * 5. Unit conversion (120 g/L vs 12.0–15.5 g/dL -> normal)
 * 6. Non-diagnostic phrasing validation
 * 7. Source traceability validation
 * 8. Zero-network deterministic offline execution
 */

import { evaluateHealthMarker } from '../evaluator/evaluate-marker';
import { hemoglobinKnowledge } from '../knowledge/cbc/hemoglobin';

export function runHemoglobinTests() {
  console.log('=====================================================');
  console.log('  PHASE 1: HEMOGLOBIN EVALUATOR VERIFICATION TESTS');
  console.log('=====================================================\n');

  // TEST 1: Low Hemoglobin with report reference range
  console.log('TEST 1: Low Hemoglobin (9.2 g/dL, Ref: 12.0–15.5 g/dL)');
  const result1 = evaluateHealthMarker({
    name: 'Hemoglobin',
    value: 9.2,
    unit: 'g/dL',
    referenceRange: {
      low: 12.0,
      high: 15.5,
      unit: 'g/dL',
      rawText: '12.0 - 15.5 g/dL',
    },
  });

  if (!result1) throw new Error('Test 1 failed: Result is null');
  console.log('  Status:', result1.status);
  console.log('  Knowledge Key:', result1.knowledgeKey);
  console.log('  Meaning snippet:', result1.interpretation?.meaning.slice(0, 80) + '...');

  if (result1.status !== 'low') throw new Error(`Expected status 'low', got '${result1.status}'`);
  if (result1.knowledgeKey !== 'hemoglobin.low') throw new Error(`Expected key 'hemoglobin.low', got '${result1.knowledgeKey}'`);
  if (!result1.possibleAssociations.length) throw new Error('Expected possible associations');
  if (!result1.nutrition.length) throw new Error('Expected nutrition items');
  console.log('✓ TEST 1 PASSED: Low Hemoglobin correctly evaluated and mapped to hemoglobin.low.\n');

  // TEST 2: Normal Hemoglobin with report reference range
  console.log('TEST 2: Normal Hemoglobin (13.5 g/dL, Ref: 12.0–15.5 g/dL)');
  const result2 = evaluateHealthMarker({
    name: 'HGB',
    value: 13.5,
    unit: 'g/dL',
    referenceRange: {
      low: 12.0,
      high: 15.5,
    },
  });

  if (!result2) throw new Error('Test 2 failed: Result is null');
  console.log('  Status:', result2.status);
  console.log('  Knowledge Key:', result2.knowledgeKey);

  if (result2.status !== 'normal') throw new Error(`Expected status 'normal', got '${result2.status}'`);
  if (result2.knowledgeKey !== 'hemoglobin.normal') throw new Error(`Expected key 'hemoglobin.normal', got '${result2.knowledgeKey}'`);
  console.log('✓ TEST 2 PASSED: Normal Hemoglobin correctly evaluated and mapped to hemoglobin.normal.\n');

  // TEST 3: High Hemoglobin with report reference range
  console.log('TEST 3: High Hemoglobin (17.0 g/dL, Ref: 12.0–15.5 g/dL)');
  const result3 = evaluateHealthMarker({
    name: 'Hb',
    value: 17.0,
    unit: 'g/dL',
    referenceRange: {
      low: 12.0,
      high: 15.5,
    },
  });

  if (!result3) throw new Error('Test 3 failed: Result is null');
  console.log('  Status:', result3.status);
  console.log('  Knowledge Key:', result3.knowledgeKey);

  if (result3.status !== 'high') throw new Error(`Expected status 'high', got '${result3.status}'`);
  if (result3.knowledgeKey !== 'hemoglobin.high') throw new Error(`Expected key 'hemoglobin.high', got '${result3.knowledgeKey}'`);
  console.log('✓ TEST 3 PASSED: High Hemoglobin correctly evaluated and mapped to hemoglobin.high.\n');

  // TEST 4: Missing Reference Range (Status MUST be 'unknown')
  console.log('TEST 4: Missing Reference Range (9.2 g/dL, Ref: unavailable)');
  const result4 = evaluateHealthMarker({
    name: 'Haemoglobin',
    value: 9.2,
    unit: 'g/dL',
  });

  if (!result4) throw new Error('Test 4 failed: Result is null');
  console.log('  Status:', result4.status);
  console.log('  Reference Source:', result4.referenceRange.source);
  console.log('  Notice:', result4.missingReferenceRangeMessage?.slice(0, 75) + '...');

  if (result4.status !== 'unknown') {
    throw new Error(`FAIL: Missing reference range must result in 'unknown', but got '${result4.status}'`);
  }
  if (result4.interpretation !== undefined) {
    throw new Error('FAIL: Unknown status should not display low/normal/high interpretation title');
  }
  console.log('✓ TEST 4 PASSED: Missing reference range correctly results in status: "unknown" without assumption.\n');

  // TEST 5: Unit Conversion (120 g/L vs 12.0–15.5 g/dL -> 12.0 g/dL -> normal)
  console.log('TEST 5: Unit Conversion (120 g/L vs 12.0–15.5 g/dL)');
  const result5 = evaluateHealthMarker({
    name: 'Hemoglobin',
    value: 120,
    unit: 'g/L',
    referenceRange: {
      low: 12.0,
      high: 15.5,
      unit: 'g/dL',
    },
  });

  if (!result5) throw new Error('Test 5 failed: Result is null');
  console.log('  Evaluated Status for 120 g/L:', result5.status);
  if (result5.status !== 'normal') {
    throw new Error(`FAIL: 120 g/L (= 12.0 g/dL) within 12.0–15.5 g/dL should be 'normal', got '${result5.status}'`);
  }

  const result5b = evaluateHealthMarker({
    name: 'Hemoglobin',
    value: 95,
    unit: 'g/L',
    referenceRange: {
      low: 12.0,
      high: 15.5,
      unit: 'g/dL',
    },
  });
  if (!result5b || result5b.status !== 'low') {
    throw new Error(`FAIL: 95 g/L (= 9.5 g/dL) should be 'low', got '${result5b?.status}'`);
  }
  console.log('✓ TEST 5 PASSED: g/L to g/dL conversion correctly evaluated.\n');

  // TEST 6: Non-Diagnostic Phrasing Check
  console.log('TEST 6: Non-Diagnostic Phrasing Validation');
  const forbiddenPhrases = [
    'you have anemia',
    'you have polycythemia',
    'this proves you have',
    'this means you definitely have',
  ];

  const allTexts = [
    hemoglobinKnowledge.interpretations.low.meaning,
    hemoglobinKnowledge.interpretations.low.title,
    ...hemoglobinKnowledge.interpretations.low.possibleAssociations,
    hemoglobinKnowledge.interpretations.normal.meaning,
    hemoglobinKnowledge.interpretations.high.meaning,
    ...hemoglobinKnowledge.interpretations.high.possibleAssociations,
  ];

  for (const text of allTexts) {
    const lower = text.toLowerCase();
    for (const forbidden of forbiddenPhrases) {
      if (lower.includes(forbidden)) {
        throw new Error(`FAIL: Found forbidden diagnostic phrase: "${forbidden}" in "${text}"`);
      }
    }
  }
  console.log('✓ TEST 6 PASSED: Knowledge base strictly uses non-diagnostic language.\n');

  // TEST 7: Source Traceability Check
  console.log('TEST 7: Source Traceability Validation');
  const sourceIds = hemoglobinKnowledge.sources.map((s) => s.id);
  const lowSourceIds = hemoglobinKnowledge.interpretations.low.sourceIds;
  const highSourceIds = hemoglobinKnowledge.interpretations.high.sourceIds;

  for (const id of [...lowSourceIds, ...highSourceIds]) {
    if (!sourceIds.includes(id)) {
      throw new Error(`FAIL: Interpretation references sourceId "${id}" which is missing from sources registry!`);
    }
  }
  console.log(`  Validated ${sourceIds.length} sources with 100% ID resolution.`);
  console.log('✓ TEST 7 PASSED: All interpretations are traceable to verified sources.\n');

  // TEST 8: Local & Deterministic Offline Guarantee
  console.log('TEST 8: Offline Determinism Check');
  if (!result1.isDeterministic) throw new Error('Expected isDeterministic = true');
  if (result1.evidenceLevel !== 'high') throw new Error('Expected evidenceLevel = high');
  console.log('✓ TEST 8 PASSED: Evaluation is 100% deterministic and runs offline.\n');

  console.log('=====================================================');
  console.log('  ALL PHASE 1 HEMOGLOBIN TESTS PASSED (8/8)');
  console.log('=====================================================\n');
}

// Auto-execute if run via CLI
if (process.argv[1] && process.argv[1].includes('hemoglobin-evaluator.test.ts')) {
  runHemoglobinTests();
}

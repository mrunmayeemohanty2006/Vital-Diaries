/**
 * Vital Diaries — Dynamic Abnormal-Marker Research & Lab Insights Test Suite
 * 
 * Verifies that Get Lab Insights operates as a universal, dynamic laboratory abnormal-result
 * research engine supporting arbitrary medical reports and biomarkers:
 * - Fixture A: Hemoglobin LOW
 * - Fixture B: ALT HIGH
 * - Fixture C: Vitamin B12 LOW
 * - Fixture D: TSH HIGH
 * - Fixture E: Completely Unknown Novel Biomarker LOW
 * - Fixture F: Multi-Panel Report with mixed normal, low, high, and unknown reference ranges
 * - PDF Generation: 100% local PDF export of dynamic abnormal insights
 */

import assert from 'assert';
import {
  evaluateHealthMarker,
  evaluateAllHealthMarkers,
} from '../../health-engine/evaluator/evaluate-marker';
import {
  generateHealthInsightsPDF,
  filterAbnormalInsights,
} from '../../health-engine/pdf/export-health-insight';
import type { HealthInsight } from '../../health-engine/types';

export function runDynamicLabInsightsTests() {
  console.log('================================================================================');
  console.log('   DYNAMIC ABNORMAL-MARKER RESEARCH & LAB INSIGHTS SUITE');
  console.log('================================================================================\n');

  // TEST FIXTURE A: Hemoglobin LOW
  console.log('--- TEST FIXTURE A: Hemoglobin LOW ---');
  const inputA = {
    name: 'Hemoglobin',
    value: 8.8,
    unit: 'g/dL',
    referenceRange: {
      low: 12.0,
      high: 15.0,
      unit: 'g/dL',
      rawText: '12.0 - 15.0',
    },
  };

  const insightA = evaluateHealthMarker(inputA);
  assert(insightA !== null, 'Expected insight for Hemoglobin');
  assert.strictEqual(insightA?.status, 'low');
  assert.strictEqual(insightA?.value, 8.8);
  assert.strictEqual(insightA?.referenceRange.low, 12.0);
  assert.strictEqual(insightA?.referenceRange.high, 15.0);
  assert(insightA?.interpretation?.meaning !== undefined, 'Expected meaning');
  assert(insightA?.possibleAssociations.length > 0, 'Expected associations');
  assert(insightA?.nutrition.length > 0, 'Expected dietary guidance');
  assert(insightA?.sources.length > 0, 'Expected sources');
  assert(
    insightA?.sources.some((s) => s.domain.includes('who.int') || s.domain.includes('nih.gov') || s.domain.includes('medlineplus.gov')),
    'Expected Tier 1 medical source'
  );
  console.log('✓ FIXTURE A PASSED: Hemoglobin LOW evaluated with evidence-backed sources and dietary guidance.\n');

  // TEST FIXTURE B: ALT HIGH
  console.log('--- TEST FIXTURE B: ALT / SGPT HIGH ---');
  const inputB = {
    name: 'ALT (SGPT)',
    value: 190,
    unit: 'U/L',
    referenceRange: {
      low: 0,
      high: 45,
      unit: 'U/L',
      rawText: '< 45',
    },
  };

  const insightB = evaluateHealthMarker(inputB);
  assert(insightB !== null, 'Expected insight for ALT');
  assert.strictEqual(insightB?.status, 'high');
  assert.strictEqual(insightB?.value, 190);
  assert.strictEqual(insightB?.referenceRange.high, 45);
  assert(
    insightB?.possibleAssociations.some((a) => a.toLowerCase().includes('possible reasons include')),
    'Expected non-diagnostic phrasing'
  );
  assert(insightB?.questionsForDoctor && insightB.questionsForDoctor.length > 0, 'Expected doctor questions');
  assert(insightB?.foodRestrictions && insightB.foodRestrictions.length > 0, 'Expected food restrictions');
  assert(
    insightB?.sources.some((s) => s.domain.includes('medlineplus.gov') || s.domain.includes('nih.gov')),
    'Expected MedlinePlus/NIH sources'
  );
  console.log('✓ FIXTURE B PASSED: ALT HIGH evaluated with MedlinePlus/NIH sources and clinical cautions.\n');

  // TEST FIXTURE C: Vitamin B12 LOW
  console.log('--- TEST FIXTURE C: Vitamin B12 LOW ---');
  const inputC = {
    name: 'Vitamin B12',
    value: 110,
    unit: 'pg/mL',
    referenceRange: {
      low: 200,
      high: 900,
      unit: 'pg/mL',
      rawText: '200 - 900',
    },
  };

  const insightC = evaluateHealthMarker(inputC);
  assert(insightC !== null, 'Expected insight for Vitamin B12');
  assert.strictEqual(insightC?.status, 'low');
  assert.strictEqual(insightC?.value, 110);
  assert(insightC?.nutrition.length > 0, 'Expected nutrition');
  assert(insightC?.questionsForDoctor && insightC.questionsForDoctor.length > 0, 'Expected doctor questions');
  console.log('✓ FIXTURE C PASSED: Vitamin B12 LOW evaluated with dietary recommendations.\n');

  // TEST FIXTURE D: TSH HIGH
  console.log('--- TEST FIXTURE D: TSH HIGH ---');
  const inputD = {
    name: 'TSH',
    value: 8.5,
    unit: 'uIU/mL',
    referenceRange: {
      low: 0.4,
      high: 4.5,
      unit: 'uIU/mL',
      rawText: '0.4 - 4.5',
    },
  };

  const insightD = evaluateHealthMarker(inputD);
  assert(insightD !== null, 'Expected insight for TSH');
  assert.strictEqual(insightD?.status, 'high');
  assert.strictEqual(insightD?.value, 8.5);
  assert(insightD?.sources.length > 0, 'Expected sources');
  console.log('✓ FIXTURE D PASSED: TSH HIGH evaluated with thyroid research references.\n');

  // TEST FIXTURE E: Completely Unknown Novel Biomarker LOW
  console.log('--- TEST FIXTURE E: Completely Unknown Novel Biomarker LOW ---');
  const inputE = {
    name: 'Novel Oncology Marker Alpha-7',
    value: 3.2,
    unit: 'ng/mL',
    referenceRange: {
      low: 10.0,
      high: 35.0,
      unit: 'ng/mL',
      rawText: '10.0 - 35.0',
    },
    needsVerification: true,
  };

  const insightE = evaluateHealthMarker(inputE);
  assert(insightE !== null, 'Expected insight for novel biomarker');
  assert.strictEqual(insightE?.metric, 'Novel Oncology Marker Alpha-7');
  assert.strictEqual(insightE?.status, 'low');
  assert.strictEqual(insightE?.value, 3.2);
  assert.strictEqual(insightE?.researchProvenance?.isDynamicResearch, true);
  assert(insightE?.interpretation?.meaning.includes('Novel Oncology Marker Alpha-7'));
  assert(insightE?.questionsForDoctor && insightE.questionsForDoctor.length > 0);
  assert(insightE?.sources.some((s) => s.domain.includes('medlineplus.gov') || s.domain.includes('nih.gov')));
  console.log('✓ FIXTURE E PASSED: Completely novel biomarker survived evaluation with dynamic research synthesis.\n');

  // TEST FIXTURE F: Multi-Panel Report Dynamic Processing
  console.log('--- TEST FIXTURE F: Multi-Panel Report ---');
  const rawReportMetrics = [
    { name: 'Hemoglobin', value: 8.8, unit: 'g/dL', referenceRange: { low: 12.0, high: 15.0 } },
    { name: 'RBC', value: 4.41, unit: '10^6/cu.mm', referenceRange: { low: 3.8, high: 4.8 } },
    { name: 'MCV', value: 62.8, unit: 'fL', referenceRange: { low: 83, high: 101 } },
    { name: 'Platelets', value: 3.42, unit: '10^5/cu.mm', referenceRange: { low: 1.5, high: 4.5 } },
    { name: 'ALT', value: 190, unit: 'U/L', referenceRange: { high: 45, rawText: '< 45' } },
    { name: 'AST', value: 112, unit: 'U/L', referenceRange: { high: 35, rawText: '< 35' } },
    { name: 'Alkaline Phosphatase', value: 185, unit: 'U/L', referenceRange: { low: 44, high: 147 } },
    { name: 'Total Bilirubin', value: 0.7, unit: 'mg/dL', referenceRange: { low: 0.2, high: 1.2 } },
    { name: 'Fasting Blood Sugar', value: 92, unit: 'mg/dL', referenceRange: { low: 70, high: 100 } },
    { name: 'Serum Creatinine', value: 0.9, unit: 'mg/dL', referenceRange: { low: 0.6, high: 1.2 } },
    { name: 'CA 19-9', value: 58, unit: 'U/mL', referenceRange: { high: 37, rawText: '< 37' } },
    { name: 'Novel Research Assay', value: 12, unit: 'ng/mL' }, // Missing reference range
  ];

  const allInsights = evaluateAllHealthMarkers(rawReportMetrics);
  assert.strictEqual(allInsights.length, 12, 'Expected 12 evaluated metrics');

  const normalList = allInsights.filter((i) => i.status === 'normal');
  const lowList = allInsights.filter((i) => i.status === 'low');
  const highList = allInsights.filter((i) => i.status === 'high');
  const unknownList = allInsights.filter((i) => i.status === 'unknown');

  assert.strictEqual(normalList.length, 5, 'Expected 5 normal metrics');
  assert.strictEqual(lowList.length, 2, 'Expected 2 low metrics');
  assert.strictEqual(highList.length, 4, 'Expected 4 high metrics');
  assert.strictEqual(unknownList.length, 1, 'Expected 1 unknown metric');

  const abnormalInsights = filterAbnormalInsights(allInsights);
  assert.strictEqual(abnormalInsights.length, 6, 'Expected 6 abnormal metrics');
  console.log(`✓ FIXTURE F PASSED: 12 metrics evaluated -> 5 Normal, 2 Low, 4 High, 1 Unknown.\n`);

  // TEST 7: 100% Client-Side PDF Generation
  console.log('--- TEST 7: Local PDF Export ---');
  const mockInsights: HealthInsight[] = [
    evaluateHealthMarker({
      name: 'Hemoglobin',
      value: 8.8,
      unit: 'g/dL',
      referenceRange: { low: 12.0, high: 15.0 },
    })!,
    evaluateHealthMarker({
      name: 'ALT (SGPT)',
      value: 190,
      unit: 'U/L',
      referenceRange: { high: 45, rawText: '< 45' },
    })!,
    evaluateHealthMarker({
      name: 'Total RBC',
      value: 4.5,
      unit: 'million/uL',
      referenceRange: { low: 3.8, high: 5.2 },
    })!,
  ];

  const doc = generateHealthInsightsPDF({
    patientName: 'Test Patient',
    reportTitle: 'Complete Metabolic & Blood Panel',
    reportDate: '2026-09-09',
    insights: mockInsights,
  });

  assert(doc !== undefined, 'Expected PDF doc');
  const pdfBlob = doc.output('blob');
  assert(pdfBlob.size > 1000, 'Expected PDF size > 1000 bytes');
  console.log(`✓ TEST 7 PASSED: Local PDF generated successfully (${pdfBlob.size} bytes).\n`);

  console.log('================================================================================');
  console.log('   ALL DYNAMIC LAB INSIGHTS TESTS PASSED (100%)');
  console.log('================================================================================\n');
}

// Auto-run when executed directly via tsx
runDynamicLabInsightsTests();

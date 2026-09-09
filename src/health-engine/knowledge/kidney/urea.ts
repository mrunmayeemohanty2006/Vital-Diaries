import type { HealthKnowledgeEntry } from '../../types';

export const ureaKnowledge: HealthKnowledgeEntry = {
  id: 'urea',
  name: 'Urea',
  aliases: ['Urea', 'Blood Urea Nitrogen', 'BUN', 'Serum Urea', 'Urea Nitrogen'],
  category: 'renal',

  about: {
    description:
      'Blood Urea Nitrogen (BUN) or Urea is a waste product produced in the liver from dietary and endogenous protein breakdown, filtered and excreted by the kidneys.',
    whatItMeasures:
      'The concentration of nitrogen in blood that comes from urea (typically measured in mg/dL or mmol/L).',
    whyItIsTested:
      'Evaluates kidney filtration, hydration state, protein catabolism, and gastrointestinal bleeding.',
  },

  units: ['mg/dL', 'mmol/L', 'mg/l'],
  primaryUnit: 'mg/dL',

  interpretations: {
    low: {
      title: 'Urea / BUN Below Laboratory Reference Interval (< 6–7 mg/dL)',
      meaning:
        'A lower-than-reference urea level indicates decreased protein breakdown, advanced liver disease, or overhydration.',
      possibleAssociations: [
        'Very low dietary protein intake or malnutrition',
        'Overhydration (excess fluid intake diluting plasma solutes)',
        'Severe liver disease (impaired hepatic urea cycle synthesis)',
        'Normal pregnancy',
      ],
      nutrition: [
        'Ensure adequate dietary protein distribution matching personal health targets.',
      ],
      lifestyle: [
        'Maintain balanced daily hydration without excessive water loading.',
      ],
      cautions: [
        'Isolated low BUN is usually non-harmful.',
      ],
      monitoring: [
        'Routine periodic wellness checkups.',
      ],
      sourceIds: ['medlineplus-bun', 'niddk-kidney-tests'],
    },

    normal: {
      title: 'Urea / BUN Within Laboratory Reference Interval (7–20 mg/dL)',
      meaning:
        'Urea is within the expected physiological range (typically 7–20 mg/dL for BUN), reflecting balanced protein metabolism and renal excretion.',
      possibleAssociations: [
        'Normal renal clearance and protein intake',
      ],
      nutrition: [
        'Maintain balanced daily hydration and nutrition.',
      ],
      lifestyle: [
        'Continue regular healthy habits.',
      ],
      cautions: [
        'Always evaluate alongside serum creatinine to calculate the BUN/Creatinine ratio.',
      ],
      monitoring: [
        'Routine periodic metabolic screening.',
      ],
      sourceIds: ['medlineplus-bun', 'niddk-kidney-tests'],
    },

    high: {
      title: 'Urea / BUN Above Laboratory Reference Interval (> 20–25 mg/dL)',
      meaning:
        'An elevated urea level (azotemia) can result from reduced renal blood flow/dehydration (prerenal azotemia), intrinsic kidney disease, high protein loading, or upper GI bleeding.',
      possibleAssociations: [
        'Dehydration or hypovolemia (elevated BUN with disproportionately normal creatinine; BUN/Cr ratio > 20:1)',
        'Acute kidney injury or chronic renal insufficiency',
        'Upper gastrointestinal bleeding (digestion and absorption of blood proteins)',
        'Very high dietary protein intake or catabolic tissue breakdown (fever, corticosteroids)',
        'Urinary outflow obstruction',
      ],
      nutrition: [
        'Ensure adequate daily fluid intake with plain water unless restricted.',
        'Moderate excessive dietary protein intake.',
      ],
      lifestyle: [
        'Avoid strenuous unaccustomed exercise in hot conditions without adequate hydration.',
      ],
      cautions: [
        'Review medications with your physician (e.g., diuretics, NSAIDs).',
      ],
      monitoring: [
        'Serum Creatinine, eGFR, Electrolytes (Sodium, Potassium), and repeat BUN after hydration.',
      ],
      whenToSeekPromptCare: [
        'Marked decrease in urination, swelling in ankles/legs, confusion, nausea, or black tarry stools',
      ],
      sourceIds: ['medlineplus-bun', 'niddk-kidney-tests'],
    },
  },

  relatedMetrics: ['Creatinine', 'eGFR', 'Calcium', 'Fasting Glucose', 'Blood Pressure'],
  sources: [
    {
      id: 'medlineplus-bun',
      organization: 'MedlinePlus / National Library of Medicine',
      title: 'BUN (Blood Urea Nitrogen) Test Information',
      url: 'https://medlineplus.gov/lab-tests/bun-blood-urea-nitrogen-test/',
      domain: 'medlineplus.gov',
      sourceType: 'government',
      accessedAt: '2026-09-02',
    },
    {
      id: 'niddk-kidney-tests',
      organization: 'National Institute of Diabetes and Digestive and Kidney Diseases (NIDDK)',
      title: 'Kidney Disease Tests & Diagnosis',
      url: 'https://www.niddk.nih.gov/health-information/kidney-disease/diagnostic-tests',
      domain: 'niddk.nih.gov',
      sourceType: 'government',
      accessedAt: '2026-09-02',
    },
  ],
  evidenceLevel: 'high',
  knowledgeVersion: '1.0.0',
  lastReviewedAt: '2026-09-02',
};

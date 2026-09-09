import type { HealthKnowledgeEntry } from '../../types';

export const creatinineKnowledge: HealthKnowledgeEntry = {
  id: 'creatinine',
  name: 'Creatinine',
  aliases: ['Creatinine', 'Serum Creatinine', 'Creat', 'Creatinine, Serum'],
  category: 'renal',

  about: {
    description:
      'Creatinine is a normal chemical waste byproduct of muscle phosphocreatine breakdown, filtered out of the blood continuously by the kidneys and excreted in urine.',
    whatItMeasures:
      'The concentration of creatinine in blood serum (typically measured in mg/dL or umol/L), used to calculate estimated Glomerular Filtration Rate (eGFR).',
    whyItIsTested:
      'The primary laboratory biomarker for assessing renal filtration efficiency, screening for chronic kidney disease (CKD), and monitoring nephrotoxic medications.',
  },

  units: ['mg/dL', 'umol/L', 'mg/l'],
  primaryUnit: 'mg/dL',

  interpretations: {
    low: {
      title: 'Creatinine Below Laboratory Reference Interval (< 0.5–0.6 mg/dL)',
      meaning:
        'A lower-than-reference serum creatinine reflects reduced baseline muscle mass or increased glomerular hyperfiltration.',
      possibleAssociations: [
        'Reduced muscle mass (sarcopenia, advanced age, prolonged bed rest, small body frame)',
        'Severe liver disease (impaired hepatic creatine synthesis)',
        'Pregnancy (normal physiological hyperfiltration)',
        'Low dietary protein intake',
      ],
      nutrition: [
        'Ensure adequate dietary protein intake to meet nutritional requirements.',
      ],
      lifestyle: [
        'Engage in regular resistance training and muscle-strengthening exercise.',
      ],
      cautions: [
        'Low creatinine is generally non-harmful but reflects low muscle mass.',
      ],
      monitoring: [
        'Routine periodic wellness testing.',
      ],
      sourceIds: ['medlineplus-creatinine', 'niddk-kidney-tests'],
    },

    normal: {
      title: 'Creatinine Within Laboratory Reference Interval (0.6–1.2 mg/dL)',
      meaning:
        'Serum creatinine is within the expected physiological range (typically 0.6–1.2 mg/dL depending on age, sex, and muscle mass), indicating standard renal clearance.',
      possibleAssociations: [
        'Healthy glomerular filtration and muscle metabolism',
      ],
      nutrition: [
        'Maintain balanced daily hydration and whole-food nutrition.',
      ],
      lifestyle: [
        'Stay active and hydrated throughout workouts.',
      ],
      cautions: [
        'Always evaluate alongside calculated eGFR.',
      ],
      monitoring: [
        'Routine periodic renal function screening.',
      ],
      sourceIds: ['medlineplus-creatinine', 'niddk-kidney-tests'],
    },

    high: {
      title: 'Creatinine Above Laboratory Reference Interval (> 1.2–1.3 mg/dL)',
      meaning:
        'An elevated serum creatinine indicates reduced renal filtration capacity or temporary acute dehydration/hemodynamic changes.',
      possibleAssociations: [
        'Reduced renal glomerular filtration (acute kidney injury or chronic kidney disease)',
        'Dehydration or reduced renal perfusion',
        'High dietary cooked meat intake or creatine monohydrate supplementation',
        'Medications affecting tubular creatinine secretion (e.g., trimethoprim, cimetidine) without altering true GFR',
        'Urinary tract obstruction (e.g., kidney stones, prostatic enlargement)',
      ],
      nutrition: [
        'Ensure consistent daily fluid intake with plain water unless on fluid restriction.',
        'Avoid excessive protein loading and discontinue creatine supplements prior to re-testing.',
      ],
      lifestyle: [
        'Avoid strenuous unaccustomed exertion in hot weather.',
      ],
      cautions: [
        'Avoid non-steroidal anti-inflammatory drugs (NSAIDs like ibuprofen/naproxen) which reduce renal blood flow.',
      ],
      monitoring: [
        'Estimated Glomerular Filtration Rate (eGFR), Blood Urea Nitrogen (BUN), and Urine Albumin-to-Creatinine Ratio (uACR).',
      ],
      whenToSeekPromptCare: [
        'Significant decrease in urine output, swelling in lower legs/face, severe flank pain, or shortness of breath',
      ],
      sourceIds: ['medlineplus-creatinine', 'niddk-kidney-tests'],
    },
  },

  relatedMetrics: ['Urea', 'eGFR', 'Calcium', 'Potassium', 'Blood Pressure'],
  sources: [
    {
      id: 'medlineplus-creatinine',
      organization: 'MedlinePlus / National Library of Medicine',
      title: 'Creatinine Blood Test Information',
      url: 'https://medlineplus.gov/lab-tests/creatinine-test/',
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

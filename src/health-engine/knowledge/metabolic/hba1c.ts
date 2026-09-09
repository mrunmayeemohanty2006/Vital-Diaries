import type { HealthKnowledgeEntry } from '../../types';

export const hba1cKnowledge: HealthKnowledgeEntry = {
  id: 'hba1c',
  name: 'HbA1c',
  aliases: ['HbA1c', 'Hb A1c', 'Glycated Hemoglobin', 'Glycohemoglobin', 'A1c'],
  category: 'metabolic',

  about: {
    description:
      'Hemoglobin A1c (HbA1c) measures the percentage of hemoglobin molecules in red blood cells that have glucose attached to them, reflecting average blood glucose levels over the prior 2–3 months.',
    whatItMeasures:
      'Average glycemic control across the ~120-day lifespan of circulating erythrocytes.',
    whyItIsTested:
      'The primary standard test for diagnosing prediabetes/diabetes and monitoring long-term glycemic therapy efficacy.',
  },

  units: ['%', 'mmol/mol'],
  primaryUnit: '%',

  interpretations: {
    low: {
      title: 'HbA1c Result Below Standard Target (< 4.5–5.0%)',
      meaning:
        'A lower-than-expected HbA1c is commonly seen in states of shortened red blood cell survival or frequent hypoglycemia.',
      possibleAssociations: [
        'Hemolytic anemia (rapid red blood cell turnover means less time for glucose glycation)',
        'Recent blood loss or frequent blood transfusions',
        'Frequent clinical hypoglycemia (especially in treated diabetic patients)',
        'Second or third trimester of pregnancy',
      ],
      nutrition: [
        'Ensure steady, complex carbohydrate and protein distribution if experiencing low blood sugar episodes.',
      ],
      lifestyle: [
        'Review diabetes medication regimens with your physician if experiencing frequent lows.',
      ],
      cautions: [
        'Low HbA1c in non-diabetic individuals often warrants Complete Blood Count (CBC) and reticulocyte evaluation to rule out hemolysis.',
      ],
      monitoring: [
        'Complete Blood Count and blood glucose tracking.',
      ],
      sourceIds: ['medlineplus-hba1c', 'ada-standards-care'],
    },

    normal: {
      title: 'HbA1c Result Within Normal Non-Diabetic Range (< 5.7%)',
      meaning:
        'An HbA1c below 5.7% indicates healthy baseline 3-month average blood glucose regulation.',
      possibleAssociations: [
        'Normal long-term glucose homeostasis and insulin sensitivity',
      ],
      nutrition: [
        'Maintain a balanced, whole-food diet low in refined carbohydrates.',
      ],
      lifestyle: [
        'Engage in regular aerobic and strength-building physical activities.',
      ],
      cautions: [
        'Periodic annual wellness retesting is standard.',
      ],
      monitoring: [
        'Routine periodic wellness checkups.',
      ],
      sourceIds: ['medlineplus-hba1c', 'ada-standards-care'],
    },

    high: {
      title: 'HbA1c Result Elevated (5.7–6.4% Prediabetes, ≥ 6.5% Diabetes)',
      meaning:
        'An elevated HbA1c indicates sustained elevation in average blood glucose over the past 8–12 weeks. Clinical criteria categorize 5.7–6.4% as prediabetes and ≥ 6.5% as diabetes mellitus.',
      possibleAssociations: [
        'Prediabetes (5.7–6.4%) or Type 2 Diabetes Mellitus (≥ 6.5%)',
        'Persistent insulin resistance and metabolic syndrome',
        'Iron deficiency anemia (can occasionally cause slight artifactual HbA1c elevation due to prolonged red cell survival)',
      ],
      nutrition: [
        'Emphasize high-fiber, low-glycemic Mediterranean or whole-food plant-predominant dietary patterns.',
        'Eliminate sugar-sweetened beverages and reduce refined grain products.',
        'Pair complex carbohydrates with protein and healthy fats.',
      ],
      lifestyle: [
        'Strive for at least 150 minutes of weekly moderate cardiovascular exercise plus 2 resistance training sessions.',
        'Prioritize 7–8 hours of restorative sleep to reduce cortisol-driven insulin resistance.',
      ],
      cautions: [
        'Discuss formal diagnosis and individualized glycemic targets with your healthcare provider.',
      ],
      monitoring: [
        'Repeat HbA1c in 3 months.',
        'Fasting Lipid Panel, Kidney Function (eGFR, Urine Albumin-to-Creatinine Ratio), and Blood Pressure.',
      ],
      whenToSeekPromptCare: [
        'Blurred vision, non-healing wounds, extreme fatigue, or frequent unquenchable thirst/urination',
      ],
      sourceIds: ['medlineplus-hba1c', 'ada-standards-care'],
    },
  },

  relatedMetrics: ['Fasting Glucose', 'Blood Glucose', 'Triglycerides', 'HDL', 'Blood Pressure'],
  sources: [
    {
      id: 'medlineplus-hba1c',
      organization: 'MedlinePlus / National Library of Medicine',
      title: 'Hemoglobin A1c (HbA1c) Test Information',
      url: 'https://medlineplus.gov/lab-tests/hemoglobin-a1c-hba1c-test/',
      domain: 'medlineplus.gov',
      sourceType: 'government',
      accessedAt: '2026-09-02',
    },
    {
      id: 'ada-standards-care',
      organization: 'American Diabetes Association (ADA)',
      title: 'Classification and Diagnosis of Diabetes',
      url: 'https://diabetesjournals.org/care/issue',
      domain: 'diabetesjournals.org',
      sourceType: 'clinical_reference',
      accessedAt: '2026-09-02',
    },
  ],
  evidenceLevel: 'high',
  knowledgeVersion: '1.0.0',
  lastReviewedAt: '2026-09-02',
};

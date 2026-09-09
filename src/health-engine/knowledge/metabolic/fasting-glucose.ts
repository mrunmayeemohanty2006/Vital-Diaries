import type { HealthKnowledgeEntry } from '../../types';

export const fastingGlucoseKnowledge: HealthKnowledgeEntry = {
  id: 'fasting-glucose',
  name: 'Fasting Glucose',
  aliases: [
    'Fasting Glucose',
    'Fasting Blood Sugar',
    'FBS',
    'Fasting Blood Glucose',
    'Glucose, Fasting',
  ],
  category: 'metabolic',

  about: {
    description:
      'Fasting Blood Glucose measures the concentration of glucose in the blood plasma following an overnight fast of at least 8 hours.',
    whatItMeasures:
      'Basal circulating glucose levels regulated primarily by hepatic gluconeogenesis and baseline pancreatic insulin secretion.',
    whyItIsTested:
      'A primary screening and diagnostic tool for prediabetes, diabetes mellitus, metabolic health, and hypoglycemia.',
  },

  units: ['mg/dL', 'mmol/L'],
  primaryUnit: 'mg/dL',

  interpretations: {
    low: {
      title: 'Fasting Glucose Below Laboratory Reference Interval (Hypoglycemia)',
      meaning:
        'A fasting glucose level below 70 mg/dL indicates lower-than-normal circulating blood sugar, which may cause adrenergic and neuroglycopenic symptoms.',
      possibleAssociations: [
        'Excessive insulin or glucose-lowering medication relative to food intake',
        'Prolonged fasting or strenuous exercise without adequate carbohydrate replenishment',
        'High alcohol intake on an empty stomach (inhibits hepatic gluconeogenesis)',
        'Adrenal insufficiency or reactive hypoglycemia',
      ],
      nutrition: [
        'Consume balanced complex carbohydrates paired with protein and fiber to stabilize glycemic curves.',
        'Carry fast-acting carbohydrates (glucose tablets, fruit juice) if prone to symptomatic lows.',
      ],
      lifestyle: [
        'Avoid skipping meals and avoid consuming alcohol without food.',
      ],
      cautions: [
        'If taking diabetic medications (insulin, sulfonylureas), consult your physician for medication adjustment.',
      ],
      monitoring: [
        'Continuous or fingerstick blood glucose monitoring as advised.',
      ],
      whenToSeekPromptCare: [
        'Severe trembling, confusion, profuse sweating, slurred speech, or loss of consciousness',
      ],
      sourceIds: ['medlineplus-glucose', 'ada-standards-care'],
    },

    normal: {
      title: 'Fasting Glucose Within Laboratory Reference Interval (70–99 mg/dL)',
      meaning:
        'Fasting blood glucose is within the normal reference range (typically 70–99 mg/dL), indicating healthy baseline insulin sensitivity and glucose regulation.',
      possibleAssociations: [
        'Healthy hepatic glucose regulation and insulin sensitivity',
      ],
      nutrition: [
        'Maintain a nutrient-dense whole-food diet low in ultra-processed sugars and refined starches.',
      ],
      lifestyle: [
        'Engage in regular aerobic and resistance exercise to sustain insulin sensitivity.',
      ],
      cautions: [
        'Evaluate alongside HbA1c to assess long-term 3-month glycemic trends.',
      ],
      monitoring: [
        'Routine periodic wellness checkups.',
      ],
      sourceIds: ['medlineplus-glucose', 'ada-standards-care'],
    },

    high: {
      title: 'Fasting Glucose Above Laboratory Reference Interval (Hyperglycemia)',
      meaning:
        'A fasting glucose level of 100–125 mg/dL indicates impaired fasting glucose (prediabetes range), while ≥ 126 mg/dL on repeat testing indicates diabetes mellitus.',
      possibleAssociations: [
        'Insulin resistance and metabolic syndrome',
        'Prediabetes (100–125 mg/dL) or Diabetes Mellitus (≥ 126 mg/dL)',
        'Acute physiological stress, infection, or corticosteroid medication therapy',
        'Recent non-fasting state prior to the blood draw',
      ],
      nutrition: [
        'Focus on high-fiber whole foods: non-starchy vegetables, legumes, whole grains, nuts, and lean proteins.',
        'Minimize refined sugars, sweetened beverages, and simple carbohydrates.',
        'Incorporate healthy fats (extra virgin olive oil, avocado) to slow carbohydrate gastric emptying.',
      ],
      lifestyle: [
        'Engage in at least 150 minutes of moderate-intensity physical activity per week.',
        'A brisk 10–15 minute walk after meals significantly assists postprandial glucose uptake.',
      ],
      cautions: [
        'A single elevated reading requires repeat testing and HbA1c evaluation before establishing clinical conclusions.',
      ],
      monitoring: [
        'HbA1c test, fasting lipid panel, and blood pressure monitoring.',
      ],
      whenToSeekPromptCare: [
        'Extreme unquenchable thirst, frequent urination, fruity breath odor, rapid deep breathing, or severe lethargy',
      ],
      sourceIds: ['medlineplus-glucose', 'ada-standards-care'],
    },
  },

  relatedMetrics: ['HbA1c', 'Total Cholesterol', 'Triglycerides', 'Blood Pressure'],
  sources: [
    {
      id: 'medlineplus-glucose',
      organization: 'MedlinePlus / National Library of Medicine',
      title: 'Blood Glucose Test Information',
      url: 'https://medlineplus.gov/lab-tests/blood-glucose-test/',
      domain: 'medlineplus.gov',
      sourceType: 'government',
      accessedAt: '2026-09-02',
    },
    {
      id: 'ada-standards-care',
      organization: 'American Diabetes Association (ADA)',
      title: 'Standards of Care in Diabetes - Glycemic Targets',
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

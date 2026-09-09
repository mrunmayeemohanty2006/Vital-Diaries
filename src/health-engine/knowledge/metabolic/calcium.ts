import type { HealthKnowledgeEntry } from '../../types';

export const calciumKnowledge: HealthKnowledgeEntry = {
  id: 'calcium',
  name: 'Calcium',
  aliases: ['Calcium', 'Serum Calcium', 'Total Calcium', 'Calcium, Serum', 'Ca'],
  category: 'metabolic',

  about: {
    description:
      'Total Serum Calcium measures the combined amount of free (ionized) calcium and protein-bound calcium in the bloodstream.',
    whatItMeasures:
      'Circulating total calcium levels essential for neuromuscular transmission, myocardial contraction, blood coagulation, and skeletal bone mineralization.',
    whyItIsTested:
      'Evaluates parathyroid function, bone health, kidney disorders, vitamin D status, and neuromuscular symptoms.',
  },

  units: ['mg/dL', 'mmol/L'],
  primaryUnit: 'mg/dL',

  interpretations: {
    low: {
      title: 'Serum Calcium Below Laboratory Reference Interval (< 8.6 mg/dL)',
      meaning:
        'A lower-than-reference total serum calcium (hypocalcemia) can cause neuromuscular irritability. Because roughly 40–50% of calcium is bound to albumin, low serum albumin can artifactually lower total calcium (corrected calcium = total calcium + 0.8 × [4.0 − albumin]).',
      possibleAssociations: [
        'Hypoalbuminemia (pseudohypocalcemia from low circulating protein)',
        'Severe Vitamin D deficiency (impaired intestinal calcium absorption)',
        'Hypoparathyroidism (deficient PTH secretion)',
        'Chronic kidney disease (impaired 1,25-dihydroxyvitamin D synthesis and phosphate retention)',
        'Hypomagnesemia (low magnesium impairs PTH release)',
      ],
      nutrition: [
        'Include dietary calcium sources: dairy products, fortified plant milks, tofu set with calcium, canned sardines with bones, and dark leafy greens (collards, kale).',
        'Ensure concurrent adequate Vitamin D and magnesium intake.',
      ],
      lifestyle: [
        'Engage in weight-bearing physical activity to support bone mineralization.',
      ],
      cautions: [
        'Do not take standalone high-dose calcium supplements without checking serum albumin and consulting your doctor.',
      ],
      monitoring: [
        'Ionized Calcium (or Albumin-corrected calcium), Vitamin D [25(OH)D], Magnesium, and Parathyroid Hormone (PTH).',
      ],
      whenToSeekPromptCare: [
        'Numbness or tingling around the mouth, fingers, or toes, muscle spasms/cramps, or cardiac rhythm irregularities',
      ],
      sourceIds: ['medlineplus-calcium', 'nih-ods-calcium'],
    },

    normal: {
      title: 'Serum Calcium Within Laboratory Reference Interval (8.6–10.2 mg/dL)',
      meaning:
        'Total serum calcium is within the expected physiological range (typically 8.6–10.2 mg/dL), reflecting healthy parathyroid and vitamin D regulatory balance.',
      possibleAssociations: [
        'Normal neuromuscular and bone calcium homeostasis',
      ],
      nutrition: [
        'Maintain balanced daily dietary calcium intake (~1000–1200 mg/day primarily from dietary sources).',
      ],
      lifestyle: [
        'Engage in regular weight-bearing exercise.',
      ],
      cautions: [
        'Maintain baseline vitamin D sufficiency to support calcium absorption.',
      ],
      monitoring: [
        'Routine periodic wellness screening.',
      ],
      sourceIds: ['medlineplus-calcium', 'nih-ods-calcium'],
    },

    high: {
      title: 'Serum Calcium Above Laboratory Reference Interval (> 10.2–10.5 mg/dL)',
      meaning:
        'An elevated serum calcium (hypercalcemia) indicates altered mineral regulation requiring medical investigation, as sustained hypercalcemia can affect kidneys, heart, and bone density.',
      possibleAssociations: [
        'Primary hyperparathyroidism (autonomous overproduction of PTH by parathyroid adenoma; most common outpatient cause)',
        'Excessive Vitamin D or Calcium supplementation (milk-alkali syndrome)',
        'Malignancy-associated hypercalcemia (PTHrP secretion or osteolytic bone activity; most common inpatient cause)',
        'Thiazide diuretic medication therapy',
        'Granulomatous disorders (sarcoidosis, tuberculosis)',
      ],
      nutrition: [
        'Discontinue standalone calcium and vitamin D supplements until evaluated by a physician.',
        'Drink plenty of water to maintain hydration and promote renal calcium clearance.',
      ],
      lifestyle: [
        'Stay active and avoid prolonged bed rest, which can accelerate bone resorption.',
      ],
      cautions: [
        'Do not ignore persistent mild hypercalcemia; parathyroid evaluation is standard.',
      ],
      monitoring: [
        'Intact Parathyroid Hormone (PTH), Ionized Calcium, 25(OH)D, and Creatinine.',
      ],
      whenToSeekPromptCare: [
        'Severe nausea/vomiting, extreme thirst, confusion, severe abdominal pain, or cardiac arrhythmias',
      ],
      sourceIds: ['medlineplus-calcium', 'nih-ods-calcium'],
    },
  },

  relatedMetrics: ['Vitamin D', 'Creatinine', 'Phosphorus', 'Parathyroid Hormone'],
  sources: [
    {
      id: 'medlineplus-calcium',
      organization: 'MedlinePlus / National Library of Medicine',
      title: 'Calcium Blood Test Information',
      url: 'https://medlineplus.gov/lab-tests/calcium-blood-test/',
      domain: 'medlineplus.gov',
      sourceType: 'government',
      accessedAt: '2026-09-02',
    },
    {
      id: 'nih-ods-calcium',
      organization: 'National Institutes of Health (NIH) - Office of Dietary Supplements',
      title: 'Calcium Health Professional Fact Sheet',
      url: 'https://ods.od.nih.gov/factsheets/Calcium-HealthProfessional/',
      domain: 'ods.od.nih.gov',
      sourceType: 'government',
      accessedAt: '2026-09-02',
    },
  ],
  evidenceLevel: 'high',
  knowledgeVersion: '1.0.0',
  lastReviewedAt: '2026-09-02',
};

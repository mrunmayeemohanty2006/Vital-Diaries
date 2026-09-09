import type { HealthKnowledgeEntry } from '../../types';

export const mchKnowledge: HealthKnowledgeEntry = {
  id: 'mch',
  name: 'MCH',
  aliases: ['Mean Corpuscular Hemoglobin', 'MCH', 'Mean Cell Hemoglobin'],
  category: 'cbc',

  about: {
    description:
      'Mean Corpuscular Hemoglobin (MCH) calculates the average mass of hemoglobin contained inside each individual red blood cell.',
    whatItMeasures:
      'The average weight of hemoglobin per red blood cell, measured in picograms (pg).',
    whyItIsTested:
      'Evaluates whether red blood cells are hypochromic (pale with lower hemoglobin content) or normochromic, providing key context alongside MCV for classification of anemias.',
  },

  units: ['pg', 'Pg', 'picograms'],
  primaryUnit: 'pg',

  interpretations: {
    low: {
      title: 'MCH Result Below Laboratory Reference Interval (Hypochromia)',
      meaning:
        'A lower MCH indicates that red blood cells carry less hemoglobin by weight than standard reference expectations, often giving them a paler microscopic appearance (hypochromia).',
      possibleAssociations: [
        'Iron deficiency anemia (decreased heme synthesis reducing cellular hemoglobin)',
        'Thalassemia syndromes or hemoglobinopathies',
        'Lead exposure interfering with porphyrin synthesis',
      ],
      nutrition: [
        'If iron deficiency is confirmed by ferritin testing, prioritize dietary iron sources paired with vitamin C.',
      ],
      lifestyle: [
        'Ensure steady rest and adequate recovery between workouts.',
      ],
      cautions: [
        'Avoid self-prescribing iron supplements until ferritin and iron studies are completed.',
      ],
      monitoring: [
        'Serum Ferritin, Iron Saturation, and MCV / Hemoglobin.',
      ],
      sourceIds: ['medlineplus-mch', 'nhlbi-anemia-overview'],
    },

    normal: {
      title: 'MCH Result Within Laboratory Reference Interval',
      meaning:
        'MCH is within the reference range, indicating typical hemoglobin content per red cell.',
      possibleAssociations: [
        'Normal cellular hemoglobin concentration',
      ],
      nutrition: [
        'Maintain balanced daily nutrient intake.',
      ],
      lifestyle: [
        'Maintain active healthy lifestyle habits.',
      ],
      cautions: [
        'Interpret alongside MCV and RDW.',
      ],
      monitoring: [
        'Routine periodic Complete Blood Count checks.',
      ],
      sourceIds: ['medlineplus-mch', 'nhlbi-anemia-overview'],
    },

    high: {
      title: 'MCH Result Above Laboratory Reference Interval',
      meaning:
        'A higher MCH means individual red blood cells carry more hemoglobin by mass, which frequently accompanies larger cell sizes (macrocytosis).',
      possibleAssociations: [
        'Macrocytic conditions (Vitamin B12 or Folate deficiency where larger cells hold more total mass)',
        'Hemolytic conditions with spherocytes',
      ],
      nutrition: [
        'Ensure sufficient intake of Vitamin B12 and Folate.',
      ],
      lifestyle: [
        'Maintain balanced lifestyle habits.',
      ],
      cautions: [
        'Evaluate in combination with MCV to differentiate true hyperchromia from cell size artifacts.',
      ],
      monitoring: [
        'Serum Vitamin B12 and Folate testing.',
      ],
      sourceIds: ['medlineplus-mch', 'nhlbi-anemia-overview'],
    },
  },

  relatedMetrics: ['Hemoglobin', 'MCV', 'MCHC', 'RDW', 'Serum Iron', 'Ferritin'],
  sources: [
    {
      id: 'medlineplus-mch',
      organization: 'MedlinePlus / National Library of Medicine',
      title: 'RBC Indices (MCV, MCH, MCHC, RDW)',
      url: 'https://medlineplus.gov/lab-tests/red-blood-cell-rbc-indices/',
      domain: 'medlineplus.gov',
      sourceType: 'government',
      accessedAt: '2026-09-02',
    },
    {
      id: 'nhlbi-anemia-overview',
      organization: 'National Heart, Lung, and Blood Institute (NHLBI)',
      title: 'Anemia Types and Clinical Evaluation',
      url: 'https://www.nhlbi.nih.gov/health/anemia',
      domain: 'nhlbi.nih.gov',
      sourceType: 'government',
      accessedAt: '2026-09-02',
    },
  ],
  evidenceLevel: 'high',
  knowledgeVersion: '1.0.0',
  lastReviewedAt: '2026-09-02',
};

import type { HealthKnowledgeEntry } from '../../types';

export const basophilsKnowledge: HealthKnowledgeEntry = {
  id: 'basophils',
  name: 'Basophils',
  aliases: ['Basophils', 'Basophil %', 'Basos', 'Absolute Basophil Count', 'ABC'],
  category: 'cbc',

  about: {
    description:
      'Basophils are the least common type of granulocyte, containing histamine and heparin granules that mediate immediate hypersensitivity and inflammatory responses.',
    whatItMeasures:
      'The percentage (%) or absolute count of basophils in blood (typically 0–1% of leukocytes).',
    whyItIsTested:
      'Evaluates severe allergic reactions, chronic inflammatory states, and myeloproliferative disorders.',
  },

  units: ['%', 'cells/uL', '/mcL'],
  primaryUnit: '%',

  interpretations: {
    low: {
      title: 'Basophils Below Laboratory Reference Interval (Basopenia)',
      meaning:
        'A basophil level of 0% is frequently observed in healthy individuals and is generally considered a normal finding.',
      possibleAssociations: [
        'Normal physiological baseline (0% is common)',
        'Acute allergic degranulation',
        'Corticosteroid therapy or acute stress response',
      ],
      nutrition: [
        'Maintain balanced daily dietary intake.',
      ],
      lifestyle: [
        'Continue standard healthy lifestyle routines.',
      ],
      cautions: [
        'Isolated low basophils have no stand-alone diagnostic implications.',
      ],
      monitoring: [
        'Routine periodic wellness checkups.',
      ],
      sourceIds: ['medlineplus-wbc-diff'],
    },

    normal: {
      title: 'Basophils Within Laboratory Reference Interval',
      meaning:
        'Basophils are within the expected physiological range (typically 0–1%).',
      possibleAssociations: [
        'Normal basophil granule reserves',
      ],
      nutrition: [
        'Maintain a balanced whole-food diet.',
      ],
      lifestyle: [
        'Continue regular healthy habits.',
      ],
      cautions: [
        'Interpret as part of the overall leukocyte differential.',
      ],
      monitoring: [
        'Periodic wellness screening.',
      ],
      sourceIds: ['medlineplus-wbc-diff'],
    },

    high: {
      title: 'Basophils Above Laboratory Reference Interval (Basophilia)',
      meaning:
        'An elevated basophil count reflects histamine signaling, chronic allergic inflammation, or marrow stimulation.',
      possibleAssociations: [
        'Allergic conditions (chronic rhinitis, food allergies, urticaria)',
        'Chronic inflammatory disorders (e.g., ulcerative colitis, rheumatoid arthritis)',
        'Hypothyroidism (mild basophil increase)',
        'Myeloproliferative conditions (e.g., chronic myeloid leukemia, polycythemia vera)',
      ],
      nutrition: [
        'Emphasize fresh whole foods and minimize processed foods with artificial additives.',
      ],
      lifestyle: [
        'Track and avoid known personal allergen exposures.',
      ],
      cautions: [
        'Persistent basophilia above 2% warrants comprehensive medical evaluation.',
      ],
      monitoring: [
        'Repeat CBC with differential and evaluation of thyroid function (TSH).',
      ],
      whenToSeekPromptCare: [
        'Acute anaphylactic symptoms (throat tightness, wheezing, diffuse hives)',
      ],
      sourceIds: ['medlineplus-wbc-diff'],
    },
  },

  relatedMetrics: ['Eosinophils', 'WBC', 'Platelets'],
  sources: [
    {
      id: 'medlineplus-wbc-diff',
      organization: 'MedlinePlus / National Library of Medicine',
      title: 'White Blood Cell Differential',
      url: 'https://medlineplus.gov/lab-tests/white-blood-cell-differential/',
      domain: 'medlineplus.gov',
      sourceType: 'government',
      accessedAt: '2026-09-02',
    },
  ],
  evidenceLevel: 'high',
  knowledgeVersion: '1.0.0',
  lastReviewedAt: '2026-09-02',
};

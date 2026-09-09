import type { HealthKnowledgeEntry } from '../../types';

export const neutrophilsKnowledge: HealthKnowledgeEntry = {
  id: 'neutrophils',
  name: 'Neutrophils',
  aliases: ['Neutrophils', 'Neutrophil %', 'Polymorphs', 'Segs', 'Absolute Neutrophil Count', 'ANC'],
  category: 'cbc',

  about: {
    description:
      'Neutrophils are the most abundant type of white blood cell, serving as the first responders to bacterial infections, acute tissue injury, and acute inflammation.',
    whatItMeasures:
      'The percentage (%) or absolute count of neutrophils among circulating leukocytes.',
    whyItIsTested:
      'Assesses the acute antibacterial immune response and evaluates causes of leukocytosis or neutropenia.',
  },

  units: ['%', 'cells/uL', '/mcL'],
  primaryUnit: '%',

  interpretations: {
    low: {
      title: 'Neutrophils Below Laboratory Reference Interval (Neutropenia)',
      meaning:
        'A lower neutrophil percentage or count indicates reduced first-line bacterial defense reserves.',
      possibleAssociations: [
        'Recent viral illness (e.g., viral suppression of marrow output)',
        'Medication-induced neutropenia (e.g., certain antibiotics, psychotropics, immunosuppressants)',
        'Autoimmune destruction of neutrophils',
        'Severe B12 or folate deficiency',
      ],
      nutrition: [
        'Practice stringent food hygiene (wash raw produce, cook eggs/meats thoroughly).',
      ],
      lifestyle: [
        'Practice meticulous hand hygiene and avoid crowded enclosed spaces during active neutropenia.',
      ],
      cautions: [
        'Fever in the setting of neutropenia is a clinical emergency requiring immediate medical evaluation.',
      ],
      monitoring: [
        'Follow-up Complete Blood Count with differential to track recovery.',
      ],
      whenToSeekPromptCare: [
        'Any fever (≥ 38°C / 100.4°F), shaking chills, or new infection signs',
      ],
      sourceIds: ['medlineplus-wbc-diff'],
    },

    normal: {
      title: 'Neutrophils Within Laboratory Reference Interval',
      meaning:
        'Neutrophil levels are within expected reference proportions (typically 40–70% of total WBCs).',
      possibleAssociations: [
        'Balanced primary immune response',
      ],
      nutrition: [
        'Maintain balanced daily whole-food nutrition.',
      ],
      lifestyle: [
        'Maintain regular sleep and stress management routines.',
      ],
      cautions: [
        'Interpret alongside total WBC count.',
      ],
      monitoring: [
        'Periodic wellness screening.',
      ],
      sourceIds: ['medlineplus-wbc-diff'],
    },

    high: {
      title: 'Neutrophils Above Laboratory Reference Interval (Neutrophilia)',
      meaning:
        'An elevated neutrophil count reflects active recruitment of first-responder immune cells.',
      possibleAssociations: [
        'Bacterial infections',
        'Acute tissue inflammation or injury (e.g., surgery, trauma, burns)',
        'Physical or emotional stress, intense exercise',
        'Corticosteroid medication therapy',
        'Smoking',
      ],
      nutrition: [
        'Hydrate well and consume antioxidant-rich foods.',
      ],
      lifestyle: [
        'Ensure recovery time following acute physical strain.',
      ],
      cautions: [
        'Transient neutrophilia often normalizes once acute stress or infection resolves.',
      ],
      monitoring: [
        'Follow-up CBC after completing treatment for acute symptoms.',
      ],
      whenToSeekPromptCare: [
        'High persistent fever, localized abscess, or worsening pain',
      ],
      sourceIds: ['medlineplus-wbc-diff'],
    },
  },

  relatedMetrics: ['WBC', 'Lymphocytes', 'Monocytes', 'Platelets'],
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

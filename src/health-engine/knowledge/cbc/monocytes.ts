import type { HealthKnowledgeEntry } from '../../types';

export const monocytesKnowledge: HealthKnowledgeEntry = {
  id: 'monocytes',
  name: 'Monocytes',
  aliases: ['Monocytes', 'Monocyte %', 'Monos', 'Absolute Monocyte Count', 'AMC'],
  category: 'cbc',

  about: {
    description:
      'Monocytes are large white blood cells that migrate into body tissues to become macrophages and dendritic cells, clearing cellular debris and presenting antigens to lymphocytes.',
    whatItMeasures:
      'The percentage (%) or absolute count of monocytes in blood (typically 2–10% of leukocytes).',
    whyItIsTested:
      'Evaluates recovery from acute infections, chronic inflammatory states, and tissue repair processes.',
  },

  units: ['%', 'cells/uL', '/mcL'],
  primaryUnit: '%',

  interpretations: {
    low: {
      title: 'Monocytes Below Laboratory Reference Interval (Monocytopenia)',
      meaning:
        'A lower monocyte count reflects reduced circulating precursor phagocytes.',
      possibleAssociations: [
        'Acute endotoxemia or systemic stress reaction',
        'Corticosteroid therapy',
        'Bone marrow production variations',
      ],
      nutrition: [
        'Maintain balanced daily nutrition.',
      ],
      lifestyle: [
        'Maintain regular sleep and stress reduction practices.',
      ],
      cautions: [
        'Isolated low monocyte levels are often transient and non-specific.',
      ],
      monitoring: [
        'Repeat CBC with differential.',
      ],
      sourceIds: ['medlineplus-wbc-diff'],
    },

    normal: {
      title: 'Monocytes Within Laboratory Reference Interval',
      meaning:
        'Monocyte levels are within the reference interval, indicating balanced cellular cleanup and antigen presentation capacity.',
      possibleAssociations: [
        'Normal tissue repair and immune surveillance',
      ],
      nutrition: [
        'Maintain a balanced whole-food diet.',
      ],
      lifestyle: [
        'Continue regular exercise and lifestyle habits.',
      ],
      cautions: [
        'Evaluate as part of the complete leukocyte differential.',
      ],
      monitoring: [
        'Routine periodic wellness checks.',
      ],
      sourceIds: ['medlineplus-wbc-diff'],
    },

    high: {
      title: 'Monocytes Above Laboratory Reference Interval (Monocytosis)',
      meaning:
        'Elevated monocytes indicate active phagocytosis, tissue recovery, or chronic inflammatory signaling.',
      possibleAssociations: [
        'Chronic or subacute infections (e.g., tuberculosis, endocarditis, Epstein-Barr, fungal infections)',
        'Chronic inflammatory and autoimmune conditions (e.g., inflammatory bowel disease, sarcoidosis, lupus)',
        'Recovery phase following acute bacterial infection',
        'Hematologic variations',
      ],
      nutrition: [
        'Incorporate anti-inflammatory foods (olive oil, berries, leafy vegetables, fatty fish).',
      ],
      lifestyle: [
        'Allow adequate rest to support ongoing tissue recovery.',
      ],
      cautions: [
        'Persistent monocytosis without clear infection warrants medical evaluation.',
      ],
      monitoring: [
        'Follow-up CBC with differential and evaluation of inflammatory markers if symptoms persist.',
      ],
      whenToSeekPromptCare: [
        'Unexplained persistent fevers, chronic weight loss, or night sweats',
      ],
      sourceIds: ['medlineplus-wbc-diff'],
    },
  },

  relatedMetrics: ['WBC', 'Neutrophils', 'Lymphocytes'],
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

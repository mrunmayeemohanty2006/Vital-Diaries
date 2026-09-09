import type { HealthKnowledgeEntry } from '../../types';

export const lymphocytesKnowledge: HealthKnowledgeEntry = {
  id: 'lymphocytes',
  name: 'Lymphocytes',
  aliases: ['Lymphocytes', 'Lymphocyte %', 'Lymphs', 'Absolute Lymphocyte Count', 'ALC'],
  category: 'cbc',

  about: {
    description:
      'Lymphocytes (including T-cells, B-cells, and Natural Killer cells) manage targeted adaptive immunity, producing antibodies and eliminating virus-infected cells.',
    whatItMeasures:
      'The percentage (%) or absolute count of lymphocytes in blood.',
    whyItIsTested:
      'Evaluates adaptive immune function, response to viral infections, and chronic immune activity.',
  },

  units: ['%', 'cells/uL', '/mcL'],
  primaryUnit: '%',

  interpretations: {
    low: {
      title: 'Lymphocytes Below Laboratory Reference Interval (Lymphopenia)',
      meaning:
        'A reduced lymphocyte count reflects lower circulating adaptive immune cells.',
      possibleAssociations: [
        'Acute viral recovery phase or overwhelming bacterial infection',
        'Immunosuppressive or corticosteroid medications',
        'Nutritional deficiencies or chronic severe stress',
        'Autoimmune conditions (e.g., lupus)',
      ],
      nutrition: [
        'Ensure adequate protein intake and micronutrients including zinc and B vitamins.',
      ],
      lifestyle: [
        'Support immune recovery through regular sleep and stress reduction.',
      ],
      cautions: [
        'Avoid self-treating with high-dose supplements without clinical input.',
      ],
      monitoring: [
        'Repeat CBC with differential.',
      ],
      sourceIds: ['medlineplus-wbc-diff'],
    },

    normal: {
      title: 'Lymphocytes Within Laboratory Reference Interval',
      meaning:
        'Lymphocytes are within standard reference proportions (typically 20–40% of leukocytes).',
      possibleAssociations: [
        'Healthy adaptive immune balance and antibody production',
      ],
      nutrition: [
        'Maintain balanced daily nutrient intake.',
      ],
      lifestyle: [
        'Continue regular exercise and sleep hygiene.',
      ],
      cautions: [
        'Interpret alongside neutrophil count and absolute counts.',
      ],
      monitoring: [
        'Routine periodic Complete Blood Count checks.',
      ],
      sourceIds: ['medlineplus-wbc-diff'],
    },

    high: {
      title: 'Lymphocytes Above Laboratory Reference Interval (Lymphocytosis)',
      meaning:
        'An elevated lymphocyte proportion indicates active adaptive immune recruitment, most frequently during or following viral infections.',
      possibleAssociations: [
        'Acute or recent viral infections (e.g., mononucleosis, influenza, viral gastroenteritis, cytomegalovirus)',
        'Chronic infections (e.g., pertussis, tuberculosis, hepatitis)',
        'Post-splenectomy adaptive shifts',
        'Clonal lymphocyte proliferation (evaluated if persistently high in older adults)',
      ],
      nutrition: [
        'Hydrate well and consume nutrient-dense whole foods to support immune recovery.',
      ],
      lifestyle: [
        'Allow appropriate rest during recovery from recent viral illness.',
      ],
      cautions: [
        'Transient viral lymphocytosis typically returns to baseline over 4–8 weeks.',
      ],
      monitoring: [
        'Repeat CBC with differential in 4–6 weeks to confirm resolution.',
      ],
      whenToSeekPromptCare: [
        'Enlarged painless lymph nodes, persistent night sweats, or unexplained weight loss',
      ],
      sourceIds: ['medlineplus-wbc-diff'],
    },
  },

  relatedMetrics: ['WBC', 'Neutrophils', 'Monocytes'],
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

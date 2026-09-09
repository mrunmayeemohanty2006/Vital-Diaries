import type { HealthKnowledgeEntry } from '../../types';

export const tibcKnowledge: HealthKnowledgeEntry = {
  id: 'tibc',
  name: 'TIBC',
  aliases: ['TIBC', 'Total Iron Binding Capacity', 'TBC'],
  category: 'general',

  about: {
    description:
      'Total Iron Binding Capacity (TIBC) measures the maximum amount of iron that transferrin proteins in blood plasma can carry.',
    whatItMeasures:
      'The total iron-binding potential of circulating transferrin in ug/dL.',
    whyItIsTested:
      'Provides a direct measurement of circulating transferrin levels, helping distinguish iron deficiency (where TIBC rises as the liver produces more transferrin to scavenge scarce iron) from inflammation/chronic disease (where TIBC decreases).',
  },

  units: ['ug/dL', 'mcg/dL', 'µg/dL', 'umol/L'],
  primaryUnit: 'ug/dL',

  interpretations: {
    low: {
      title: 'TIBC Below Laboratory Reference Interval',
      meaning:
        'A lower TIBC indicates reduced circulating transferrin protein capacity, commonly seen in inflammatory or liver conditions.',
      possibleAssociations: [
        'Anemia of chronic disease / chronic inflammation (liver decreases transferrin synthesis)',
        'Malnutrition or severe protein deficiency',
        'Liver disease (impaired protein synthesis)',
        'Hemochromatosis (high iron saturates binding proteins)',
      ],
      nutrition: [
        'Ensure adequate high-quality dietary protein and nutrient-dense whole foods.',
      ],
      lifestyle: [
        'Maintain balanced daily wellness routines.',
      ],
      cautions: [
        'A low TIBC alongside low serum iron points towards chronic inflammation rather than primary iron deficiency.',
      ],
      monitoring: [
        'Serum Ferritin and inflammatory markers (CRP/ESR).',
      ],
      sourceIds: ['medlineplus-iron-tests'],
    },

    normal: {
      title: 'TIBC Within Laboratory Reference Interval',
      meaning:
        'TIBC is within the reference range (typically 250–450 ug/dL), indicating standard circulating transferrin carrying capacity.',
      possibleAssociations: [
        'Normal hepatic transferrin production',
      ],
      nutrition: [
        'Maintain a balanced daily whole-food diet.',
      ],
      lifestyle: [
        'Continue regular healthy habits.',
      ],
      cautions: [
        'Evaluate in combination with serum iron and ferritin.',
      ],
      monitoring: [
        'Routine periodic wellness testing.',
      ],
      sourceIds: ['medlineplus-iron-tests'],
    },

    high: {
      title: 'TIBC Above Laboratory Reference Interval',
      meaning:
        'An elevated TIBC indicates that the liver has ramped up transferrin production in response to low iron availability, creating many empty iron-binding sites.',
      possibleAssociations: [
        'Iron deficiency anemia (hallmark compensatory response)',
        'Pregnancy or oral estrogen / contraceptive use',
        'Acute blood loss',
      ],
      nutrition: [
        'If iron deficiency is confirmed, focus on dietary iron sources (beans, lentils, dark greens, meats) paired with vitamin C.',
      ],
      lifestyle: [
        'Allow appropriate rest if experiencing fatigue.',
      ],
      cautions: [
        'High TIBC coupled with low serum iron is classic for iron deficiency.',
      ],
      monitoring: [
        'Serum Ferritin, Transferrin Saturation, and CBC.',
      ],
      sourceIds: ['medlineplus-iron-tests', 'nhlbi-iron-deficiency'],
    },
  },

  relatedMetrics: ['Serum Iron', 'Ferritin', 'UIBC', 'Transferrin Saturation', 'Hemoglobin'],
  sources: [
    {
      id: 'medlineplus-iron-tests',
      organization: 'MedlinePlus / National Library of Medicine',
      title: 'Iron Tests (Serum Iron, Ferritin, TIBC)',
      url: 'https://medlineplus.gov/lab-tests/iron-tests/',
      domain: 'medlineplus.gov',
      sourceType: 'government',
      accessedAt: '2026-09-02',
    },
    {
      id: 'nhlbi-iron-deficiency',
      organization: 'National Heart, Lung, and Blood Institute (NHLBI)',
      title: 'Iron-Deficiency Anemia Clinical Overview',
      url: 'https://www.nhlbi.nih.gov/health/anemia/iron-deficiency-anemia',
      domain: 'nhlbi.nih.gov',
      sourceType: 'government',
      accessedAt: '2026-09-02',
    },
  ],
  evidenceLevel: 'high',
  knowledgeVersion: '1.0.0',
  lastReviewedAt: '2026-09-02',
};

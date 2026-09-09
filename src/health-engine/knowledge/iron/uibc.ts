import type { HealthKnowledgeEntry } from '../../types';

export const uibcKnowledge: HealthKnowledgeEntry = {
  id: 'uibc',
  name: 'UIBC',
  aliases: ['UIBC', 'Unsaturated Iron Binding Capacity'],
  category: 'general',

  about: {
    description:
      'Unsaturated Iron Binding Capacity (UIBC) measures the portion of transferrin in the blood that is currently not carrying iron (i.e. the reserve binding capacity).',
    whatItMeasures:
      'The unoccupied iron-binding capacity of transferrin in ug/dL (UIBC = TIBC − Serum Iron).',
    whyItIsTested:
      'Evaluated as part of comprehensive iron profiling to calculate total iron binding capacity and saturation fractions.',
  },

  units: ['ug/dL', 'mcg/dL', 'µg/dL', 'umol/L'],
  primaryUnit: 'ug/dL',

  interpretations: {
    low: {
      title: 'UIBC Below Laboratory Reference Interval',
      meaning:
        'A lower UIBC indicates that most transferrin binding sites are already occupied with iron, leaving little unoccupied reserve capacity.',
      possibleAssociations: [
        'High iron stores or hemochromatosis',
        'Recent iron supplementation or iron therapy',
        'Hemolytic conditions releasing excess iron into circulation',
      ],
      nutrition: [
        'Avoid iron-fortified supplements and excessive vitamin C megadoses.',
      ],
      lifestyle: [
        'Review current supplements with your clinician.',
      ],
      cautions: [
        'Low UIBC mirrors high transferrin saturation and warrants evaluation for iron overload.',
      ],
      monitoring: [
        'Ferritin and Transferrin Saturation.',
      ],
      sourceIds: ['medlineplus-iron-tests', 'nhlbi-hemochromatosis'],
    },

    normal: {
      title: 'UIBC Within Laboratory Reference Interval',
      meaning:
        'UIBC is within the expected physiological range (typically 150–350 ug/dL), indicating balanced transferrin iron occupancy.',
      possibleAssociations: [
        'Balanced iron transport and reserve binding capacity',
      ],
      nutrition: [
        'Maintain a balanced whole-food diet.',
      ],
      lifestyle: [
        'Continue regular healthy habits.',
      ],
      cautions: [
        'Evaluate alongside serum iron and ferritin.',
      ],
      monitoring: [
        'Routine periodic wellness testing.',
      ],
      sourceIds: ['medlineplus-iron-tests'],
    },

    high: {
      title: 'UIBC Above Laboratory Reference Interval',
      meaning:
        'A high UIBC means that a large majority of transferrin binding sites are empty, reflecting scarce circulating iron.',
      possibleAssociations: [
        'Iron deficiency anemia',
        'Pregnancy or elevated estrogen levels',
        'Recent blood loss',
      ],
      nutrition: [
        'Include iron-rich foods (beans, lentils, spinach, lean meats) paired with vitamin C sources.',
      ],
      lifestyle: [
        'Allow appropriate rest when fatigued.',
      ],
      cautions: [
        'Elevated UIBC reflects the same physiological state as elevated TIBC and low iron saturation.',
      ],
      monitoring: [
        'Serum Ferritin, Hemoglobin, and MCV.',
      ],
      sourceIds: ['medlineplus-iron-tests', 'nhlbi-iron-deficiency'],
    },
  },

  relatedMetrics: ['Serum Iron', 'Ferritin', 'TIBC', 'Transferrin Saturation', 'Hemoglobin'],
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

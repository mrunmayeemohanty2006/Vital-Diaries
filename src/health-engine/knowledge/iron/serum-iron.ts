import type { HealthKnowledgeEntry } from '../../types';

export const serumIronKnowledge: HealthKnowledgeEntry = {
  id: 'serum-iron',
  name: 'Serum Iron',
  aliases: ['Serum Iron', 'Iron, Serum', 'Iron Total', 'Total Iron', 'Iron'],
  category: 'general',

  about: {
    description:
      'Serum Iron measures the amount of circulating ferric iron bound to transferrin protein in liquid blood plasma.',
    whatItMeasures:
      'The concentration of circulating iron available for immediate red blood cell production and metabolic enzymes.',
    whyItIsTested:
      'Evaluated alongside Ferritin and TIBC to assess iron status, investigate anemia, detect iron overload, or monitor response to dietary iron.',
  },

  units: ['ug/dL', 'mcg/dL', 'µg/dL', 'umol/L'],
  primaryUnit: 'ug/dL',

  interpretations: {
    low: {
      title: 'Serum Iron Below Laboratory Reference Interval',
      meaning:
        'A lower-than-reference serum iron level indicates decreased circulating iron. Because serum iron fluctuates significantly through diurnal cycles and recent meals, it is always interpreted in conjunction with Ferritin and TIBC.',
      possibleAssociations: [
        'Iron deficiency from inadequate dietary intake or poor gastrointestinal absorption',
        'Acute or chronic blood loss (e.g., heavy menstruation, occult GI bleeding)',
        'Increased iron demand (pregnancy, rapid growth phases)',
        'Anemia of chronic disease (inflammatory trapping of iron inside reticuloendothelial stores)',
      ],
      nutrition: [
        'Incorporate iron-rich foods: beans, lentils, chickpeas, spinach, fortified whole grains, and lean meats.',
        'Pair non-heme iron with vitamin C sources (oranges, bell peppers, tomatoes) to enhance bioavailability.',
        'Avoid consuming calcium supplements, coffee, or black tea within two hours of iron-rich meals.',
      ],
      lifestyle: [
        'Pace activities if feeling fatigue or weakness.',
      ],
      cautions: [
        'Do not take high-dose iron supplements without medical guidance and ferritin verification.',
      ],
      monitoring: [
        'Serum Ferritin, TIBC, and Transferrin Saturation.',
        'Complete Blood Count (CBC) with Hemoglobin and MCV.',
      ],
      whenToSeekPromptCare: [
        'Severe lightheadedness upon standing, chest palpitations, or signs of acute bleeding',
      ],
      sourceIds: ['medlineplus-iron-tests', 'nhlbi-iron-deficiency'],
    },

    normal: {
      title: 'Serum Iron Within Laboratory Reference Interval',
      meaning:
        'Serum iron is within the reference range, indicating adequate circulating iron availability at the time of testing.',
      possibleAssociations: [
        'Adequate immediate circulating iron for erythropoiesis',
      ],
      nutrition: [
        'Maintain a balanced diet with diverse whole foods and micronutrients.',
      ],
      lifestyle: [
        'Continue regular healthy habits.',
      ],
      cautions: [
        'Serum iron fluctuates throughout the day; Ferritin remains the primary marker for long-term total body iron stores.',
      ],
      monitoring: [
        'Routine periodic wellness testing.',
      ],
      sourceIds: ['medlineplus-iron-tests'],
    },

    high: {
      title: 'Serum Iron Above Laboratory Reference Interval',
      meaning:
        'An elevated serum iron level indicates high circulating iron saturation, which can result from excessive supplementation, multiple transfusions, or genetic iron handling variations.',
      possibleAssociations: [
        'Recent high-dose iron supplementation or therapeutic injections',
        'Hemochromatosis (genetic condition causing excessive intestinal iron absorption)',
        'Hemolytic conditions with rapid red cell turnover releasing iron into circulation',
        'Acute liver injury (damaged hepatocytes releasing stored iron)',
      ],
      nutrition: [
        'Avoid iron-fortified supplements, multivitamins containing iron, and excessive vitamin C megadoses unless prescribed.',
        'Limit alcohol intake to protect liver health.',
      ],
      lifestyle: [
        'Review all daily supplements and over-the-counter vitamins with your clinician.',
      ],
      cautions: [
        'Unmanaged excess iron accumulates in liver, heart, and pancreas tissues.',
      ],
      monitoring: [
        'Serum Ferritin and Transferrin Saturation percentage.',
        'Liver function tests (ALT/AST) and genetic testing if hemochromatosis is suspected.',
      ],
      sourceIds: ['medlineplus-iron-tests', 'nhlbi-hemochromatosis'],
    },
  },

  relatedMetrics: ['Ferritin', 'TIBC', 'UIBC', 'Transferrin Saturation', 'Hemoglobin', 'MCV'],
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
    {
      id: 'nhlbi-hemochromatosis',
      organization: 'National Heart, Lung, and Blood Institute (NHLBI)',
      title: 'Hemochromatosis and Iron Overload',
      url: 'https://www.nhlbi.nih.gov/health/hemochromatosis',
      domain: 'nhlbi.nih.gov',
      sourceType: 'government',
      accessedAt: '2026-09-02',
    },
  ],
  evidenceLevel: 'high',
  knowledgeVersion: '1.0.0',
  lastReviewedAt: '2026-09-02',
};

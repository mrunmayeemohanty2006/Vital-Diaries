import type { HealthKnowledgeEntry } from '../../types';

export const ferritinKnowledge: HealthKnowledgeEntry = {
  id: 'ferritin',
  name: 'Ferritin',
  aliases: ['Ferritin', 'Serum Ferritin'],
  category: 'general',

  about: {
    description:
      'Ferritin is an intracellular protein that stores iron in a non-toxic form and releases it in a controlled fashion to meet physiological demand.',
    whatItMeasures:
      'The concentration of ferritin in blood serum, which correlates directly with total body iron storage reserves.',
    whyItIsTested:
      'The gold standard laboratory test for identifying true iron depletion before overt anemia develops, and for evaluating iron overload or systemic inflammation.',
  },

  units: ['ng/mL', 'ug/L', 'mcg/L', 'pmol/L'],
  primaryUnit: 'ng/mL',

  interpretations: {
    low: {
      title: 'Ferritin Below Laboratory Reference Interval (Iron Store Depletion)',
      meaning:
        'A ferritin level below the reference interval (especially < 30 ng/mL) is the most specific indicator of depleted total body iron reserves, even if hemoglobin is currently normal.',
      possibleAssociations: [
        'Depleted bone marrow iron reserves (latent iron deficiency)',
        'Chronic subtle blood loss (gastrointestinal, heavy menses, frequent blood donation)',
        'Inadequate dietary iron intake over an extended period',
        'Intestinal malabsorption (e.g., celiac disease, bariatric surgery, gastritis)',
      ],
      nutrition: [
        'Prioritize dietary iron: lentils, beans, dark leafy greens, pumpkin seeds, and lean meats.',
        'Pair plant iron with vitamin C rich produce.',
        'Avoid drinking coffee or tea within 1–2 hours of meals.',
      ],
      lifestyle: [
        'Pace strenuous workouts and track energy levels.',
      ],
      cautions: [
        'Discuss targeted iron replacement with a physician to determine dosage and duration.',
      ],
      monitoring: [
        'Follow-up Serum Ferritin in 8–12 weeks after initiating dietary or clinical management.',
        'Complete Blood Count (CBC).',
      ],
      sourceIds: ['medlineplus-ferritin', 'nhlbi-iron-deficiency'],
    },

    normal: {
      title: 'Ferritin Within Laboratory Reference Interval',
      meaning:
        'Ferritin is within the standard reference range, reflecting adequate iron storage reserves in the absence of acute inflammation.',
      possibleAssociations: [
        'Adequate total body iron stores',
      ],
      nutrition: [
        'Maintain a balanced diet supporting ongoing micronutrient health.',
      ],
      lifestyle: [
        'Continue regular healthy habits.',
      ],
      cautions: [
        'Ferritin is an acute-phase reactant; active infection or inflammatory illness can artificially elevate ferritin into the normal range even when iron stores are borderline.',
      ],
      monitoring: [
        'Routine periodic wellness testing.',
      ],
      sourceIds: ['medlineplus-ferritin'],
    },

    high: {
      title: 'Ferritin Above Laboratory Reference Interval (Hyperferritinemia)',
      meaning:
        'An elevated ferritin level can indicate expanded total body iron stores (iron overload) or acute/chronic inflammatory and tissue stress signaling (acute-phase reaction).',
      possibleAssociations: [
        'Systemic inflammation, acute infection, or autoimmune activity (acute-phase response)',
        'Hereditary hemochromatosis or genetic iron overload',
        'Frequent blood transfusions or excessive iron supplementation',
        'Liver inflammation, metabolic syndrome, or non-alcoholic fatty liver disease (NAFLD)',
        'Chronic high alcohol intake',
      ],
      nutrition: [
        'Avoid iron supplements and iron-fortified multivitamins.',
        'Limit alcohol consumption and support liver health through whole foods.',
      ],
      lifestyle: [
        'Maintain regular physical activity to support metabolic health.',
      ],
      cautions: [
        'Transferrin saturation helps differentiate true iron overload from inflammatory hyperferritinemia.',
      ],
      monitoring: [
        'Transferrin Saturation and TIBC.',
        'Liver function tests (ALT, AST) and inflammatory markers (CRP).',
      ],
      sourceIds: ['medlineplus-ferritin', 'nhlbi-hemochromatosis'],
    },
  },

  relatedMetrics: ['Serum Iron', 'TIBC', 'Transferrin Saturation', 'Hemoglobin', 'MCV', 'RDW'],
  sources: [
    {
      id: 'medlineplus-ferritin',
      organization: 'MedlinePlus / National Library of Medicine',
      title: 'Ferritin Blood Test Information',
      url: 'https://medlineplus.gov/lab-tests/ferritin-blood-test/',
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

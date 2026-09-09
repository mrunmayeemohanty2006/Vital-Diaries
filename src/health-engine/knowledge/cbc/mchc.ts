import type { HealthKnowledgeEntry } from '../../types';

export const mchcKnowledge: HealthKnowledgeEntry = {
  id: 'mchc',
  name: 'MCHC',
  aliases: ['Mean Corpuscular Hemoglobin Concentration', 'MCHC', 'Mean Cell Hemoglobin Concentration'],
  category: 'cbc',

  about: {
    description:
      'Mean Corpuscular Hemoglobin Concentration (MCHC) measures the average concentration of hemoglobin in a given volume of packed red blood cells.',
    whatItMeasures:
      'The proportion of red cell volume that is occupied by hemoglobin (expressed in g/dL).',
    whyItIsTested:
      'Helps evaluate the degree of cellular hemoglobin saturation, differentiating hypochromic anemias from normochromic conditions or spherocytosis.',
  },

  units: ['g/dL', 'g/L', '%'],
  primaryUnit: 'g/dL',

  interpretations: {
    low: {
      title: 'MCHC Result Below Laboratory Reference Interval (Hypochromia)',
      meaning:
        'A lower MCHC indicates that the concentration of hemoglobin inside red cells is reduced relative to cell volume.',
      possibleAssociations: [
        'Iron deficiency anemia',
        'Thalassemia syndromes',
        'Sideroblastic anemia',
      ],
      nutrition: [
        'Focus on nutrient-dense meals with adequate dietary iron and co-factors if iron deficiency is clinically verified.',
      ],
      lifestyle: [
        'Ensure steady rest and adequate sleep.',
      ],
      cautions: [
        'Evaluate together with MCV, MCH, and ferritin.',
      ],
      monitoring: [
        'Complete Blood Count and iron panel.',
      ],
      sourceIds: ['medlineplus-mchc', 'nhlbi-anemia-overview'],
    },

    normal: {
      title: 'MCHC Result Within Laboratory Reference Interval',
      meaning:
        'MCHC is within the reference range, indicating standard hemoglobin concentration within red blood cells.',
      possibleAssociations: [
        'Normal intracellular hemoglobin packing',
      ],
      nutrition: [
        'Maintain balanced nutritional intake.',
      ],
      lifestyle: [
        'Continue regular healthy lifestyle habits.',
      ],
      cautions: [
        'A normal MCHC can still occur in normocytic/normochromic anemias.',
      ],
      monitoring: [
        'Routine periodic Complete Blood Count checks.',
      ],
      sourceIds: ['medlineplus-mchc', 'nhlbi-anemia-overview'],
    },

    high: {
      title: 'MCHC Result Above Laboratory Reference Interval',
      meaning:
        'An elevated MCHC indicates increased hemoglobin concentration inside red cells or laboratory cold agglutinin/hemolysis artifacts.',
      possibleAssociations: [
        'Hereditary spherocytosis (spherical, dense red blood cells)',
        'Cold agglutinin disease or red cell clumping artifact',
        'Severe cellular dehydration',
      ],
      nutrition: [
        'Maintain consistent daily hydration.',
      ],
      lifestyle: [
        'Avoid extreme cold exposure if cold agglutinin antibodies are suspected.',
      ],
      cautions: [
        'True hyperchromia is rare; elevated MCHC often warrants laboratory slide review to check for agglutination.',
      ],
      monitoring: [
        'Peripheral blood smear review and reticulocyte count.',
      ],
      sourceIds: ['medlineplus-mchc', 'nhlbi-anemia-overview'],
    },
  },

  relatedMetrics: ['Hemoglobin', 'MCV', 'MCH', 'RDW', 'Total RBC'],
  sources: [
    {
      id: 'medlineplus-mchc',
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

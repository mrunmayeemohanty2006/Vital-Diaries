import type { HealthKnowledgeEntry } from '../../types';

export const rdwKnowledge: HealthKnowledgeEntry = {
  id: 'rdw',
  name: 'RDW',
  aliases: ['RDW', 'RDW-CV', 'RDW-SD', 'Red Cell Distribution Width', 'Red Blood Cell Distribution Width'],
  category: 'cbc',

  about: {
    description:
      'Red Cell Distribution Width (RDW) measures the degree of variation in red blood cell volume and size (anisocytosis).',
    whatItMeasures:
      'The coefficient of variation (RDW-CV, %) or standard deviation (RDW-SD, fL) of red blood cell sizes.',
    whyItIsTested:
      'Provides critical discriminatory power between early nutrient deficiency anemias (high RDW due to mixed populations of new abnormal cells and old normal cells) versus homogenous conditions like uncomplicated thalassemia trait (often normal RDW).',
  },

  units: ['%', 'fL'],
  primaryUnit: '%',

  interpretations: {
    low: {
      title: 'RDW Result Below Laboratory Reference Interval',
      meaning:
        'A lower RDW indicates that red blood cells are exceptionally uniform in size. This is generally considered a normal physiological finding with minimal clinical significance on its own.',
      possibleAssociations: [
        'High uniformity in red cell size populations',
      ],
      nutrition: [
        'Maintain balanced daily dietary habits.',
      ],
      lifestyle: [
        'Continue regular healthy habits.',
      ],
      cautions: [
        'Isolated low RDW in the absence of other CBC abnormalities is typically benign.',
      ],
      monitoring: [
        'Routine periodic wellness checkups.',
      ],
      sourceIds: ['medlineplus-rdw', 'nhlbi-anemia-overview'],
    },

    normal: {
      title: 'RDW Result Within Laboratory Reference Interval',
      meaning:
        'RDW is within the reference range (typically ~11.5–14.5%), showing standard expected variation in red blood cell sizes.',
      possibleAssociations: [
        'Homogenous red blood cell size population',
        'Normal erythropoiesis',
      ],
      nutrition: [
        'Maintain balanced nutritional intake.',
      ],
      lifestyle: [
        'Maintain active lifestyle routines.',
      ],
      cautions: [
        'Anemia with normal RDW can occur in uncomplicated thalassemia trait or chronic kidney/inflammatory disease.',
      ],
      monitoring: [
        'Periodic Complete Blood Count checks.',
      ],
      sourceIds: ['medlineplus-rdw', 'nhlbi-anemia-overview'],
    },

    high: {
      title: 'RDW Result Above Laboratory Reference Interval (Anisocytosis)',
      meaning:
        'An elevated RDW indicates significant variation in red cell sizes (anisocytosis), indicating that newly produced red cells differ in size from older circulating cells.',
      possibleAssociations: [
        'Early or evolving iron deficiency anemia (mix of new microcytic and older normocytic cells)',
        'Early or evolving Vitamin B12 or Folate deficiency (mix of macrocytic and normocytic cells)',
        'Mixed nutritional deficiency (e.g. combined iron and B12 deficiency where MCV appears normal but RDW is high)',
        'Recent blood transfusion (mix of donor and recipient red cells)',
        'Hemolytic anemia with reticulocyte release',
      ],
      nutrition: [
        'Have your clinician check ferritin, B12, and folate before initiating targeted nutritional adjustments.',
      ],
      lifestyle: [
        'Allow adequate rest if experiencing associated fatigue.',
      ],
      cautions: [
        'High RDW is an early indicator of evolving red cell disorders and warrants comprehensive nutritional testing.',
      ],
      monitoring: [
        'Ferritin, Serum Iron, Vitamin B12, Serum Folate, and Reticulocyte count.',
      ],
      whenToSeekPromptCare: [
        'Sudden severe fatigue, lightheadedness, or shortness of breath',
      ],
      sourceIds: ['medlineplus-rdw', 'nhlbi-anemia-overview'],
    },
  },

  relatedMetrics: ['Hemoglobin', 'MCV', 'MCH', 'Serum Iron', 'Ferritin', 'Vitamin B12', 'Folate'],
  sources: [
    {
      id: 'medlineplus-rdw',
      organization: 'MedlinePlus / National Library of Medicine',
      title: 'RDW Blood Test Information',
      url: 'https://medlineplus.gov/lab-tests/rdw-red-cell-distribution-width/',
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

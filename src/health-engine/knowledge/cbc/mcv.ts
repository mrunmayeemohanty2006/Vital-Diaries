import type { HealthKnowledgeEntry } from '../../types';

export const mcvKnowledge: HealthKnowledgeEntry = {
  id: 'mcv',
  name: 'MCV',
  aliases: ['Mean Corpuscular Volume', 'MCV', 'Mean Cell Volume'],
  category: 'cbc',

  about: {
    description:
      'Mean Corpuscular Volume (MCV) measures the average physical size and volume of individual red blood cells in circulation.',
    whatItMeasures:
      'The average volume of a single red blood cell in femtoliters (fL).',
    whyItIsTested:
      'Crucial for categorizing anemias into microcytic (small cells), normocytic (normal-sized cells), or macrocytic (large cells), pointing to underlying causal pathways.',
  },

  units: ['fL', 'fl', 'cubic microns'],
  primaryUnit: 'fL',

  interpretations: {
    low: {
      title: 'MCV Result Below Laboratory Reference Interval (Microcytosis)',
      meaning:
        'A lower-than-reference MCV indicates that red blood cells are smaller than average (microcytic). This commonly occurs when hemoglobin production inside maturing red cells is constrained.',
      possibleAssociations: [
        'Iron deficiency (most common cause of microcytic cells due to impaired heme synthesis)',
        'Thalassemia trait (genetic variations in globin chain synthesis)',
        'Anemia of chronic disease (long-standing inflammatory state)',
        'Lead exposure or sideroblastic processes (less common)',
      ],
      nutrition: [
        'If iron deficiency is confirmed by ferritin testing, focus on dietary iron (legumes, dark greens, lean meats) paired with vitamin C.',
      ],
      lifestyle: [
        'Pace strenuous physical exertion if accompanied by fatigue.',
      ],
      cautions: [
        'Do not take empirical iron supplements if microcytosis is due to thalassemia trait, as iron overload could result.',
      ],
      monitoring: [
        'Serum Ferritin, Iron Saturation, TIBC, and Hemoglobin Electrophoresis if indicated.',
      ],
      whenToSeekPromptCare: [
        'Severe shortness of breath or rapid irregular heart rhythm',
      ],
      sourceIds: ['medlineplus-mcv', 'nhlbi-anemia-overview'],
    },

    normal: {
      title: 'MCV Result Within Laboratory Reference Interval (Normocytosis)',
      meaning:
        'MCV is within the reference range, indicating that circulating red blood cells have expected average cell volume (normocytic).',
      possibleAssociations: [
        'Normal red blood cell maturation and size',
        'If anemia is present with normal MCV, causes include acute blood loss, hemolysis, or chronic kidney/inflammatory conditions (normocytic anemia)',
      ],
      nutrition: [
        'Maintain balanced daily micronutrient nutrition.',
      ],
      lifestyle: [
        'Continue regular healthy lifestyle routines.',
      ],
      cautions: [
        'A normal MCV does not rule out mixed nutritional deficiencies (e.g. combined iron and B12 deficiency where small and large cells cancel out to produce an average normal MCV; RDW will often be elevated in such cases).',
      ],
      monitoring: [
        'Evaluate alongside RDW and Hemoglobin.',
      ],
      sourceIds: ['medlineplus-mcv', 'nhlbi-anemia-overview'],
    },

    high: {
      title: 'MCV Result Above Laboratory Reference Interval (Macrocytosis)',
      meaning:
        'An elevated MCV indicates that red blood cells are larger than average (macrocytic). This often points to impaired DNA replication during erythrocyte cell division in the bone marrow.',
      possibleAssociations: [
        'Vitamin B12 deficiency (pernicious anemia, dietary insufficiency, or malabsorption)',
        'Folate (Vitamin B9) deficiency',
        'Alcohol use or medications interfering with folate/DNA metabolism',
        'Thyroid hypofunction (hypothyroidism)',
        'Reticulocytosis (high young red blood cell release) or liver disease',
      ],
      nutrition: [
        'Ensure dietary sources of Vitamin B12 (eggs, dairy, fortified cereals, meat) and Folate (asparagus, legumes, dark leafy greens).',
        'Avoid excessive alcohol consumption which impairs folate absorption.',
      ],
      lifestyle: [
        'Minimize alcohol intake and discuss medications with your doctor.',
      ],
      cautions: [
        'Do not treat high MCV with folate alone before checking B12 levels, as folate can mask B12-deficiency neurological complications.',
      ],
      monitoring: [
        'Serum Vitamin B12, Serum Folate, and Thyroid Panel (TSH).',
      ],
      whenToSeekPromptCare: [
        'Neurological symptoms such as numbness, tingling in hands/feet, or balance difficulty',
      ],
      sourceIds: ['medlineplus-mcv', 'nhlbi-anemia-overview'],
    },
  },

  relatedMetrics: ['Hemoglobin', 'MCH', 'MCHC', 'RDW', 'Vitamin B12', 'Folate', 'Serum Iron'],
  sources: [
    {
      id: 'medlineplus-mcv',
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

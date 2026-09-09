import type { HealthKnowledgeEntry } from '../../types';

export const hematocritKnowledge: HealthKnowledgeEntry = {
  id: 'hematocrit',
  name: 'Hematocrit',
  aliases: ['HCT', 'Hematocrit (PCV)', 'PCV', 'Packed Cell Volume'],
  category: 'cbc',

  about: {
    description:
      'Hematocrit (also known as Packed Cell Volume or PCV) represents the proportion of total blood volume that consists of red blood cells.',
    whatItMeasures:
      'The percentage of whole blood composed of red blood cells.',
    whyItIsTested:
      'Used alongside hemoglobin to assess total red cell mass, evaluate anemia, check hydration status, or monitor blood volume dynamics.',
  },

  units: ['%', 'fraction'],
  primaryUnit: '%',

  interpretations: {
    low: {
      title: 'Hematocrit Result Below Laboratory Reference Interval',
      meaning:
        'A lower-than-reference hematocrit indicates that red blood cells occupy a smaller percentage of circulating blood volume than expected for that reference population. Typically follows hemoglobin levels closely (often approximately 3x hemoglobin value in standard units).',
      possibleAssociations: [
        'Anemia from nutrient deficiencies (iron, B12, folate)',
        'Acute or chronic blood loss',
        'Fluid overload / hemodilution (e.g., intravenous hydration, third trimester of pregnancy)',
        'Chronic kidney or inflammatory conditions',
      ],
      nutrition: [
        'Ensure steady dietary intake of iron-rich whole foods, leafy greens, and B-vitamin sources.',
      ],
      lifestyle: [
        'Rest appropriately when fatigue occurs and avoid overexertion during initial evaluation.',
      ],
      cautions: [
        'Do not start high-dose supplements without clinical recommendation.',
      ],
      monitoring: [
        'Follow-up Complete Blood Count (CBC) including Hemoglobin and RBC indices.',
      ],
      whenToSeekPromptCare: [
        'Acute chest discomfort, severe dizziness, or heavy unexplained bleeding',
      ],
      sourceIds: ['medlineplus-hematocrit', 'nhlbi-blood-tests'],
    },

    normal: {
      title: 'Hematocrit Result Within Laboratory Reference Interval',
      meaning:
        'Hematocrit is within the reference interval, indicating balanced red blood cell volume relative to total plasma volume.',
      possibleAssociations: [
        'Normal red blood cell volume and plasma balance',
        'Adequate hydration and bone marrow output',
      ],
      nutrition: [
        'Continue a balanced, varied whole-food diet.',
      ],
      lifestyle: [
        'Maintain regular physical activity and baseline hydration.',
      ],
      cautions: [
        'Evaluate in context with hemoglobin and red cell indices.',
      ],
      monitoring: [
        'Routine periodic Complete Blood Count checks.',
      ],
      sourceIds: ['medlineplus-hematocrit', 'nhlbi-blood-tests'],
    },

    high: {
      title: 'Hematocrit Result Above Laboratory Reference Interval',
      meaning:
        'An elevated hematocrit means red blood cells comprise a larger fraction of blood volume, which may reflect reduced plasma volume (dehydration) or increased total red cell production.',
      possibleAssociations: [
        'Dehydration or reduced fluid intake causing hemoconcentration',
        'High-altitude acclimatization or vigorous training',
        'Smoking or chronic pulmonary conditions with compensatory erythrocytosis',
        'Primary myeloproliferative disorders',
      ],
      nutrition: [
        'Ensure consistent daily hydration with water and electrolyte-balanced fluids.',
      ],
      lifestyle: [
        'Avoid smoking and reduce exposure to carbon monoxide or secondhand smoke.',
      ],
      cautions: [
        'Severe elevation can increase blood viscosity and warrants prompt medical consultation.',
      ],
      monitoring: [
        'Repeat CBC after verifying hydration status.',
      ],
      whenToSeekPromptCare: [
        'Visual disturbances, sudden severe headache, or numbness in extremities',
      ],
      sourceIds: ['medlineplus-hematocrit', 'nhlbi-blood-tests'],
    },
  },

  relatedMetrics: ['Hemoglobin', 'Total RBC', 'MCV', 'MCH', 'RDW'],
  sources: [
    {
      id: 'medlineplus-hematocrit',
      organization: 'MedlinePlus / National Library of Medicine',
      title: 'Hematocrit Test Information',
      url: 'https://medlineplus.gov/lab-tests/hematocrit-test/',
      domain: 'medlineplus.gov',
      sourceType: 'government',
      accessedAt: '2026-09-02',
    },
    {
      id: 'nhlbi-blood-tests',
      organization: 'National Heart, Lung, and Blood Institute (NHLBI)',
      title: 'Blood Tests Reference Guidelines',
      url: 'https://www.nhlbi.nih.gov/health/blood-tests',
      domain: 'nhlbi.nih.gov',
      sourceType: 'government',
      accessedAt: '2026-09-02',
    },
  ],
  evidenceLevel: 'high',
  knowledgeVersion: '1.0.0',
  lastReviewedAt: '2026-09-02',
};

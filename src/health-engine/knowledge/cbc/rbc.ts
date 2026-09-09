import type { HealthKnowledgeEntry } from '../../types';

export const rbcKnowledge: HealthKnowledgeEntry = {
  id: 'rbc',
  name: 'Total RBC',
  aliases: ['RBC', 'Red Blood Cells', 'Red Blood Cell Count', 'Total RBC Count', 'Erythrocytes'],
  category: 'cbc',

  about: {
    description:
      'Red Blood Cells (erythrocytes) are the most common type of blood cell, containing hemoglobin to transport oxygen from the lungs to body tissues and bring carbon dioxide back.',
    whatItMeasures:
      'The total number of red blood cells per unit volume of whole blood.',
    whyItIsTested:
      'Evaluated as a primary component of a Complete Blood Count (CBC) to screen for anemia, polycythemia, or other hematological variations.',
  },

  units: ['million/uL', 'M/uL', '10^6/uL', 'x10^12/L'],
  primaryUnit: 'million/uL',

  interpretations: {
    low: {
      title: 'Red Blood Cell Count Below Laboratory Reference Interval',
      meaning:
        'A total RBC count below the reporting laboratory reference range indicates a lower circulating number of red blood cells. It is evaluated alongside hemoglobin, hematocrit, and RBC indices (MCV, MCH, RDW).',
      possibleAssociations: [
        'Anemia due to decreased bone marrow production (e.g., iron, B12, folate deficiency)',
        'Recent blood loss or ongoing microvascular bleeding',
        'Increased red cell destruction (hemolysis)',
        'Chronic inflammatory or renal conditions affecting erythropoietin',
      ],
      nutrition: [
        'Incorporate foods supporting healthy erythropoiesis: iron sources (lentils, spinach, lean meats), vitamin B12, and folate (dark leafy vegetables, legumes).',
        'Include vitamin C rich foods with plant-based iron to optimize absorption.',
      ],
      lifestyle: [
        'Allow for adequate rest and pacing during strenuous physical activities if feeling fatigued.',
        'Stay well hydrated to maintain physiological blood volume.',
      ],
      cautions: [
        'Do not take standalone iron or high-dose supplements without clinical confirmation of specific deficiency.',
      ],
      monitoring: [
        'Follow-up Complete Blood Count (CBC) and red cell indices (MCV, MCH, RDW).',
        'Iron panel (Serum Iron, Ferritin, TIBC) and Vitamin B12/Folate if advised by your clinician.',
      ],
      whenToSeekPromptCare: [
        'Sudden shortness of breath, unexplained fainting, or acute dizziness',
        'Signs of active bleeding or black stools',
      ],
      sourceIds: ['medlineplus-rbc-count', 'nhlbi-blood-tests'],
    },

    normal: {
      title: 'Red Blood Cell Count Within Laboratory Reference Interval',
      meaning:
        'A red blood cell count within the reference range indicates expected red cell density in circulation for that reference population.',
      possibleAssociations: [
        'Healthy bone marrow erythropoiesis',
        'Adequate oxygen-carrying cell reserves',
      ],
      nutrition: [
        'Maintain a well-rounded diet with diverse whole grains, proteins, and micronutrients.',
      ],
      lifestyle: [
        'Engage in regular aerobic exercise and maintain consistent hydration.',
      ],
      cautions: [
        'Normal RBC count should still be viewed in conjunction with hemoglobin and hematocrit.',
      ],
      monitoring: [
        'Routine periodic wellness screening.',
      ],
      sourceIds: ['medlineplus-rbc-count', 'nhlbi-blood-tests'],
    },

    high: {
      title: 'Red Blood Cell Count Above Laboratory Reference Interval',
      meaning:
        'An elevated RBC count (erythrocytosis) indicates a higher concentration of red cells in circulation, which can occur from physiological adaptation or primary marrow processes.',
      possibleAssociations: [
        'Physiological adaptation to high altitude residence or intense athletic training',
        'Dehydration causing temporary hemoconcentration',
        'Chronic low blood oxygen levels (e.g., sleep apnea, smoking, chronic pulmonary conditions)',
        'Primary myeloproliferative processes (e.g., polycythemia vera)',
      ],
      nutrition: [
        'Maintain optimal fluid intake throughout the day unless restricted for medical reasons.',
      ],
      lifestyle: [
        'Avoid tobacco smoke and minimize exposure to secondhand smoke.',
        'Discuss sleep quality or snoring patterns with your clinician if chronic hypoxia is a consideration.',
      ],
      cautions: [
        'Avoid self-treating with blood-thinning products or supplements without physician guidance.',
      ],
      monitoring: [
        'Repeat CBC with hematocrit evaluation.',
        'Oxygen saturation monitoring and clinical evaluation for sleep or pulmonary factors.',
      ],
      whenToSeekPromptCare: [
        'Severe headaches, visual disturbances, or sudden weakness',
        'Chest pain or signs of vascular thrombosis',
      ],
      sourceIds: ['medlineplus-rbc-count', 'nhlbi-blood-tests'],
    },
  },

  relatedMetrics: ['Hemoglobin', 'Hematocrit', 'MCV', 'MCH', 'RDW'],
  sources: [
    {
      id: 'medlineplus-rbc-count',
      organization: 'MedlinePlus / National Library of Medicine',
      title: 'RBC Count - Medical Test Information',
      url: 'https://medlineplus.gov/lab-tests/red-blood-cell-rbc-count/',
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

import type { HealthKnowledgeEntry } from '../../types';

export const wbcKnowledge: HealthKnowledgeEntry = {
  id: 'wbc',
  name: 'WBC',
  aliases: ['WBC', 'Total WBC', 'White Blood Cells', 'White Blood Cell Count', 'Total Leukocyte Count', 'TLC', 'Leukocytes'],
  category: 'cbc',

  about: {
    description:
      'White Blood Cells (leukocytes) are the cellular frontline of the immune system, defending the body against infections, inflammation, and foreign pathogens.',
    whatItMeasures:
      'The total number of circulating white blood cells per unit volume of blood.',
    whyItIsTested:
      'A core component of the Complete Blood Count (CBC) used to identify infections, inflammatory states, immune suppression, allergic reactions, or hematologic conditions.',
  },

  units: ['cells/uL', '/mcL', '/uL', '10^3/uL', 'k/uL', 'x10^9/L'],
  primaryUnit: 'cells/uL',

  interpretations: {
    low: {
      title: 'WBC Result Below Laboratory Reference Interval (Leukopenia)',
      meaning:
        'A white blood cell count below the reference range indicates fewer circulating immune cells, which can transiently reduce defense capacity against microbial pathogens.',
      possibleAssociations: [
        'Recent or active viral infections (e.g., influenza, Epstein-Barr, COVID-19)',
        'Medication side effects (e.g., immunosuppressants, chemotherapy, certain antibiotics)',
        'Autoimmune disorders targeting leukocytes',
        'Bone marrow production variations or severe nutritional deficiencies (B12, Folate, Copper)',
      ],
      nutrition: [
        'Emphasize food safety and hygiene: thoroughly wash fresh produce and cook meats fully.',
        'Support general immune function with balanced dietary zinc, selenium, and vitamins A, C, and D.',
      ],
      lifestyle: [
        'Practice diligent hand hygiene and avoid close contact with actively ill individuals while counts are low.',
      ],
      cautions: [
        'Avoid self-treating with high-dose immune supplements without doctor evaluation.',
      ],
      monitoring: [
        'Repeat CBC with Differential (neutrophil and lymphocyte sub-counts).',
      ],
      whenToSeekPromptCare: [
        'Fever (≥ 38°C / 100.4°F), chills, sore throat, or signs of localized infection',
      ],
      sourceIds: ['medlineplus-wbc-count', 'cdc-infection-prevention'],
    },

    normal: {
      title: 'WBC Result Within Laboratory Reference Interval',
      meaning:
        'Total white blood cell count is within the expected range for the reference population, reflecting baseline immune cell circulation.',
      possibleAssociations: [
        'Standard immune system surveillance',
        'Absence of acute systemic inflammatory surge',
      ],
      nutrition: [
        'Maintain a balanced, nutrient-dense whole-food diet.',
      ],
      lifestyle: [
        'Engage in regular physical activity and maintain adequate sleep.',
      ],
      cautions: [
        'Normal total WBC can still have minor shifts in differential proportions (e.g. mild viral lymphocyte elevation).',
      ],
      monitoring: [
        'Routine periodic Complete Blood Count checks.',
      ],
      sourceIds: ['medlineplus-wbc-count'],
    },

    high: {
      title: 'WBC Result Above Laboratory Reference Interval (Leukocytosis)',
      meaning:
        'An elevated white blood cell count indicates an active immune response, physiological stress response, or increased bone marrow release of leukocytes.',
      possibleAssociations: [
        'Bacterial, viral, or fungal infections',
        'Acute or chronic inflammatory conditions (e.g., arthritis, bowel inflammation)',
        'Physical stress, vigorous unaccustomed exercise, trauma, or recent surgery',
        'Smoking or medications such as systemic corticosteroids',
        'Bone marrow proliferative conditions',
      ],
      nutrition: [
        'Stay well hydrated with water and clear fluids.',
        'Incorporate anti-inflammatory whole foods like berries, leafy greens, and omega-3 rich sources.',
      ],
      lifestyle: [
        'Allow adequate rest to support physiological immune recovery.',
        'Avoid tobacco smoke.',
      ],
      cautions: [
        'Transient elevations from exercise or acute stress often normalize upon rest.',
      ],
      monitoring: [
        'CBC with 5-part Differential to identify which white cell lineage (neutrophils, lymphocytes, eosinophils) is elevated.',
        'Follow-up after resolution of suspected acute infection.',
      ],
      whenToSeekPromptCare: [
        'High persistent fever, stiff neck, severe localized pain, or confusion',
      ],
      sourceIds: ['medlineplus-wbc-count', 'cdc-infection-prevention'],
    },
  },

  relatedMetrics: ['Neutrophils', 'Lymphocytes', 'Monocytes', 'Eosinophils', 'Basophils', 'Platelets'],
  sources: [
    {
      id: 'medlineplus-wbc-count',
      organization: 'MedlinePlus / National Library of Medicine',
      title: 'WBC (White Blood Cell) Count Information',
      url: 'https://medlineplus.gov/lab-tests/white-blood-cell-count/',
      domain: 'medlineplus.gov',
      sourceType: 'government',
      accessedAt: '2026-09-02',
    },
    {
      id: 'cdc-infection-prevention',
      organization: 'Centers for Disease Control and Prevention (CDC)',
      title: 'Immune System and Infection Surveillance',
      url: 'https://www.cdc.gov/infection-control/',
      domain: 'cdc.gov',
      sourceType: 'government',
      accessedAt: '2026-09-02',
    },
  ],
  evidenceLevel: 'high',
  knowledgeVersion: '1.0.0',
  lastReviewedAt: '2026-09-02',
};

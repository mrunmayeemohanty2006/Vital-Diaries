import type { HealthKnowledgeEntry } from '../../types';

export const plateletsKnowledge: HealthKnowledgeEntry = {
  id: 'platelets',
  name: 'Platelets',
  aliases: ['Platelets', 'Platelet Count', 'PLT', 'Thrombocytes'],
  category: 'cbc',

  about: {
    description:
      'Platelets (thrombocytes) are specialized, disc-shaped cellular fragments produced in bone marrow that aggregate at injury sites to form blood clots and prevent hemorrhage.',
    whatItMeasures:
      'The number of circulating platelets per unit volume of blood (typically 150,000–450,000 /mcL or 1.5–4.5 lakh/uL).',
    whyItIsTested:
      'Evaluates clotting ability, assesses unexplained bruising or bleeding, monitors bone marrow function, and screens for thrombotic risks.',
  },

  units: ['lakh/uL', '/mcL', '/uL', '10^3/uL', 'k/uL', 'x10^9/L'],
  primaryUnit: 'lakh/uL',

  interpretations: {
    low: {
      title: 'Platelet Count Below Laboratory Reference Interval (Thrombocytopenia)',
      meaning:
        'A platelet count below the reporting laboratory’s reference interval indicates reduced circulating clotting fragments, which can prolong bleeding time if low enough.',
      possibleAssociations: [
        'Viral infections causing transient platelet suppression (e.g., Dengue, viral fevers, Epstein-Barr)',
        'Medication-induced platelet reduction (e.g., heparin, certain antibiotics, NSAIDs)',
        'Autoimmune platelet destruction (immune thrombocytopenic purpura - ITP)',
        'Splenic sequestration (enlarged spleen trapping platelets)',
        'Nutritional deficiencies involving Vitamin B12 or Folate',
        'Bone marrow production variations',
      ],
      nutrition: [
        'Ensure adequate dietary intake of Vitamin B12 and Folate.',
        'Avoid excessive alcohol intake, which can suppress thrombopoiesis.',
      ],
      lifestyle: [
        'Avoid high-impact collision sports or activities with high risk of trauma while counts are reduced.',
        'Use a soft-bristled toothbrush and take care when handling sharp implements.',
      ],
      cautions: [
        'Avoid taking over-the-counter NSAIDs (like aspirin or ibuprofen) without doctor approval as they impair remaining platelet function.',
      ],
      monitoring: [
        'Repeat CBC with platelet count to monitor trend.',
        'Peripheral smear examination to rule out platelet clumping (pseudothrombocytopenia).',
      ],
      whenToSeekPromptCare: [
        'Spontaneous bleeding from gums or nose that does not stop promptly',
        'Tiny red or purple pinprick spots under the skin (petechiae) or unexplained extensive bruising',
        'Blood in urine or black tarry stools',
      ],
      sourceIds: ['medlineplus-platelets', 'nhlbi-thrombocytopenia'],
    },

    normal: {
      title: 'Platelet Count Within Laboratory Reference Interval',
      meaning:
        'Platelet count is within the reference range (typically 1.5–4.5 lakh/uL or 150,000–450,000 /mcL), indicating standard hemostatic clotting capacity.',
      possibleAssociations: [
        'Adequate bone marrow thrombopoiesis and normal clotting reserves',
      ],
      nutrition: [
        'Maintain a balanced whole-food diet.',
      ],
      lifestyle: [
        'Maintain regular physical activity and baseline hydration.',
      ],
      cautions: [
        'Platelet function can occasionally be altered by medications even with a normal numerical count.',
      ],
      monitoring: [
        'Routine periodic Complete Blood Count checks.',
      ],
      sourceIds: ['medlineplus-platelets'],
    },

    high: {
      title: 'Platelet Count Above Laboratory Reference Interval (Thrombocytosis)',
      meaning:
        'An elevated platelet count can occur as a reactive response to inflammation or tissue recovery (secondary thrombocytosis) or from primary marrow proliferation.',
      possibleAssociations: [
        'Reactive response to acute or chronic inflammation, infection, or recent surgery',
        'Iron deficiency anemia (frequently causes compensatory reactive thrombocytosis)',
        'Post-splenectomy status (absence of splenic platelet clearance)',
        'Primary myeloproliferative disorders (essential thrombocythemia)',
      ],
      nutrition: [
        'Maintain optimal daily hydration to support healthy blood flow.',
        'Address verified iron deficiency with appropriate dietary/clinical sources.',
      ],
      lifestyle: [
        'Stay active and avoid prolonged uninterrupted sitting.',
      ],
      cautions: [
        'Secondary reactive elevations typically normalize once the underlying inflammation or iron deficiency is resolved.',
      ],
      monitoring: [
        'Follow-up CBC, Ferritin, and inflammatory markers (CRP/ESR).',
      ],
      whenToSeekPromptCare: [
        'Signs of acute blood clotting (painful swelling in one leg, sudden chest pain, or focal weakness)',
      ],
      sourceIds: ['medlineplus-platelets', 'nhlbi-thrombocytopenia'],
    },
  },

  relatedMetrics: ['WBC', 'Hemoglobin', 'Neutrophils', 'Serum Iron', 'Ferritin'],
  sources: [
    {
      id: 'medlineplus-platelets',
      organization: 'MedlinePlus / National Library of Medicine',
      title: 'Platelet Tests Information',
      url: 'https://medlineplus.gov/lab-tests/platelet-tests/',
      domain: 'medlineplus.gov',
      sourceType: 'government',
      accessedAt: '2026-09-02',
    },
    {
      id: 'nhlbi-thrombocytopenia',
      organization: 'National Heart, Lung, and Blood Institute (NHLBI)',
      title: 'Thrombocytopenia Clinical Guidance',
      url: 'https://www.nhlbi.nih.gov/health/thrombocytopenia',
      domain: 'nhlbi.nih.gov',
      sourceType: 'government',
      accessedAt: '2026-09-02',
    },
  ],
  evidenceLevel: 'high',
  knowledgeVersion: '1.0.0',
  lastReviewedAt: '2026-09-02',
};

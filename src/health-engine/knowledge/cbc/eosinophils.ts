import type { HealthKnowledgeEntry } from '../../types';

export const eosinophilsKnowledge: HealthKnowledgeEntry = {
  id: 'eosinophils',
  name: 'Eosinophils',
  aliases: ['Eosinophils', 'Eosinophil %', 'Eos', 'Absolute Eosinophil Count', 'AEC'],
  category: 'cbc',

  about: {
    description:
      'Eosinophils are specialized granulocytes involved in allergic responses, mucosal immunity, and defense against multicellular parasites.',
    whatItMeasures:
      'The percentage (%) or absolute count of eosinophils in blood (typically 1–6% of leukocytes).',
    whyItIsTested:
      'Evaluates allergic conditions, asthma activity, drug reactions, parasitic infections, or eosinophilic gastrointestinal disorders.',
  },

  units: ['%', 'cells/uL', '/mcL'],
  primaryUnit: '%',

  interpretations: {
    low: {
      title: 'Eosinophils Below Laboratory Reference Interval (Eosinopenia)',
      meaning:
        'A lower eosinophil count (often 0–1%) is a common physiological finding and rarely indicates illness on its own.',
      possibleAssociations: [
        'Acute physiological stress response',
        'Corticosteroid administration',
        'Acute bacterial sepsis (temporary marrow suppression)',
      ],
      nutrition: [
        'Maintain standard balanced nutrition.',
      ],
      lifestyle: [
        'Maintain regular healthy habits.',
      ],
      cautions: [
        'Isolated low eosinophil percentage has very limited diagnostic significance.',
      ],
      monitoring: [
        'Routine periodic wellness checkups.',
      ],
      sourceIds: ['medlineplus-wbc-diff'],
    },

    normal: {
      title: 'Eosinophils Within Laboratory Reference Interval',
      meaning:
        'Eosinophil levels are within standard expected proportions (typically 1–6%).',
      possibleAssociations: [
        'Standard baseline mucosal and immune surveillance',
      ],
      nutrition: [
        'Maintain a balanced whole-food diet.',
      ],
      lifestyle: [
        'Continue regular healthy habits.',
      ],
      cautions: [
        'Interpret in context with clinical allergy or asthma symptoms.',
      ],
      monitoring: [
        'Periodic wellness screening.',
      ],
      sourceIds: ['medlineplus-wbc-diff'],
    },

    high: {
      title: 'Eosinophils Above Laboratory Reference Interval (Eosinophilia)',
      meaning:
        'Elevated eosinophils indicate heightened allergic sensitization, mucosal inflammation, or response to parasites/medications.',
      possibleAssociations: [
        'Allergic disorders (e.g., allergic rhinitis, asthma, atopic dermatitis, eczema)',
        'Drug hypersensitivity reactions (e.g., to antibiotics, NSAIDs, anticonvulsants)',
        'Parasitic or helminthic infections (especially following international travel)',
        'Eosinophilic esophagitis or gastroenteritis',
        'Autoimmune or hypereosinophilic conditions',
      ],
      nutrition: [
        'If food allergies or eosinophilic esophagitis are suspected, work with an allergist before eliminating food groups.',
      ],
      lifestyle: [
        'Identify and minimize exposure to known environmental allergens (pollen, dust mites, pet dander).',
      ],
      cautions: [
        'Review recent new medications or herbal supplements with your physician.',
      ],
      monitoring: [
        'Repeat CBC with differential and absolute eosinophil count (AEC).',
        'Allergy evaluation or stool ova & parasite testing if clinically indicated.',
      ],
      whenToSeekPromptCare: [
        'Severe allergic swelling (lips, tongue), wheezing, or widespread blistering skin rash',
      ],
      sourceIds: ['medlineplus-wbc-diff', 'aaaai-eosinophilia'],
    },
  },

  relatedMetrics: ['Basophils', 'WBC', 'Neutrophils'],
  sources: [
    {
      id: 'medlineplus-wbc-diff',
      organization: 'MedlinePlus / National Library of Medicine',
      title: 'White Blood Cell Differential',
      url: 'https://medlineplus.gov/lab-tests/white-blood-cell-differential/',
      domain: 'medlineplus.gov',
      sourceType: 'government',
      accessedAt: '2026-09-02',
    },
    {
      id: 'aaaai-eosinophilia',
      organization: 'American Academy of Allergy, Asthma & Immunology',
      title: 'Eosinophils and Eosinophilic Disorders',
      url: 'https://www.aaaai.org/conditions-treatments/related-conditions/eosinophilic-disorders',
      domain: 'aaaai.org',
      sourceType: 'medical_organization',
      accessedAt: '2026-09-02',
    },
  ],
  evidenceLevel: 'high',
  knowledgeVersion: '1.0.0',
  lastReviewedAt: '2026-09-02',
};

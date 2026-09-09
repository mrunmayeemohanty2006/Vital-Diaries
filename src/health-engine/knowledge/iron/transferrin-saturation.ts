import type { HealthKnowledgeEntry } from '../../types';

export const transferrinSaturationKnowledge: HealthKnowledgeEntry = {
  id: 'transferrin-saturation',
  name: 'Transferrin Saturation',
  aliases: ['Transferrin Saturation', 'Transferrin Sat', 'Iron Saturation', 'TSAT', 'Transferrin Saturation Index'],
  category: 'general',

  about: {
    description:
      'Transferrin Saturation (TSAT) represents the percentage of transferrin iron-binding sites that are occupied by iron.',
    whatItMeasures:
      'The ratio of Serum Iron to TIBC expressed as a percentage ([Serum Iron ÷ TIBC] × 100).',
    whyItIsTested:
      'The single most sensitive functional indicator for iron availability for erythropoiesis; TSAT < 20% indicates insufficient iron delivery to bone marrow, while TSAT > 45–50% indicates potential iron overload.',
  },

  units: ['%'],
  primaryUnit: '%',

  interpretations: {
    low: {
      title: 'Transferrin Saturation Below Laboratory Reference Interval (< 20%)',
      meaning:
        'A transferrin saturation below 20% indicates that circulating iron is inadequate to satisfy bone marrow demands for hemoglobin production.',
      possibleAssociations: [
        'Iron deficiency anemia (both absolute iron deficiency and functional iron deficiency)',
        'Anemia of chronic disease / inflammatory iron sequestration',
        'Acute or chronic blood loss',
        'Increased iron requirements (pregnancy, adolescence)',
      ],
      nutrition: [
        'Prioritize bioavailable dietary iron sources (lentils, beans, spinach, lean meats) paired with vitamin C.',
        'Avoid consuming tannins (tea, coffee) or calcium with iron meals.',
      ],
      lifestyle: [
        'Allow appropriate rest and recovery if feeling low energy.',
      ],
      cautions: [
        'Discuss targeted iron therapy with a physician based on combined Ferritin and TSAT values.',
      ],
      monitoring: [
        'Serum Ferritin, CBC (Hemoglobin, MCV), and follow-up iron studies.',
      ],
      sourceIds: ['medlineplus-iron-tests', 'nhlbi-iron-deficiency'],
    },

    normal: {
      title: 'Transferrin Saturation Within Laboratory Reference Interval (20–50%)',
      meaning:
        'Transferrin saturation is within the reference range (typically 20–50%), indicating balanced iron transport and delivery.',
      possibleAssociations: [
        'Adequate iron availability for ongoing red cell production',
      ],
      nutrition: [
        'Maintain a balanced whole-food diet.',
      ],
      lifestyle: [
        'Continue regular healthy habits.',
      ],
      cautions: [
        'Verify in combination with Ferritin for complete iron reserve evaluation.',
      ],
      monitoring: [
        'Routine periodic wellness testing.',
      ],
      sourceIds: ['medlineplus-iron-tests'],
    },

    high: {
      title: 'Transferrin Saturation Above Laboratory Reference Interval (> 50%)',
      meaning:
        'A high transferrin saturation indicates that transferrin proteins are heavily saturated with iron, increasing the risk of non-transferrin bound iron and tissue deposition.',
      possibleAssociations: [
        'Hereditary hemochromatosis (classic early screening indicator, often TSAT > 45–55%)',
        'Excessive iron supplementation or recent intravenous iron',
        'Multiple blood transfusions',
        'Hemolytic anemias with rapid iron release',
        'Acute hepatic necrosis',
      ],
      nutrition: [
        'Strictly avoid iron supplements, iron-fortified cereals/bars, and high-dose vitamin C.',
        'Limit alcohol intake to protect liver tissue.',
      ],
      lifestyle: [
        'Review all current supplements and medications with your clinician.',
      ],
      cautions: [
        'Persistent TSAT > 50% warrants evaluation for hemochromatosis before organ iron deposition occurs.',
      ],
      monitoring: [
        'Serum Ferritin, HFE gene testing (for hemochromatosis), and liver function tests.',
      ],
      sourceIds: ['medlineplus-iron-tests', 'nhlbi-hemochromatosis'],
    },
  },

  relatedMetrics: ['Serum Iron', 'Ferritin', 'TIBC', 'UIBC', 'Hemoglobin', 'MCV'],
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

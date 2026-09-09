import type { HealthKnowledgeEntry } from '../../types';

export const folateKnowledge: HealthKnowledgeEntry = {
  id: 'folate',
  name: 'Folate',
  aliases: ['Folate', 'Folate (Serum)', 'Serum Folate', 'Folic Acid', 'Vitamin B9'],
  category: 'general',

  about: {
    description:
      'Folate (Vitamin B9) is a water-soluble B vitamin essential for nucleic acid synthesis, red blood cell production, amino acid metabolism, and fetal neural tube development.',
    whatItMeasures:
      'The concentration of circulating folate in blood serum (typically measured in ng/mL or nmol/L).',
    whyItIsTested:
      'Evaluates macrocytic anemia (high MCV), malnutrition, gastrointestinal malabsorption, or prenatal nutritional status.',
  },

  units: ['ng/mL', 'nmol/L', 'ug/L'],
  primaryUnit: 'ng/mL',

  interpretations: {
    low: {
      title: 'Folate Below Laboratory Reference Interval (< 3.0–4.0 ng/mL)',
      meaning:
        'A lower-than-reference serum folate indicates reduced circulating folate, which can cause macrocytic (megaloblastic) anemia and elevated homocysteine.',
      possibleAssociations: [
        'Inadequate dietary intake of fresh leafy vegetables, legumes, and fortified grains',
        'Intestinal malabsorption (celiac disease, inflammatory bowel disease)',
        'Excessive alcohol consumption interfering with folate metabolism and storage',
        'Increased physiological demand (pregnancy, lactation, hemolytic anemia)',
        'Medications interfering with folate (e.g., methotrexate, sulfasalazine, anticonvulsants)',
      ],
      nutrition: [
        'Prioritize natural folate-rich foods: dark leafy greens (spinach, kale), asparagus, broccoli, lentils, chickpeas, beans, citrus fruits, and avocados.',
        'Cook vegetables gently (steaming rather than prolonged boiling) to preserve heat-sensitive folate.',
      ],
      lifestyle: [
        'Limit alcohol intake, which directly impairs folate absorption and hepatic retention.',
      ],
      cautions: [
        'Always check Vitamin B12 before taking high-dose folic acid supplements, as folate can mask B12-deficiency anemia while allowing neurological injury to advance.',
      ],
      monitoring: [
        'Serum Vitamin B12, Complete Blood Count (CBC) with MCV, and Red Blood Cell (RBC) Folate.',
      ],
      sourceIds: ['medlineplus-folate', 'nih-ods-folate'],
    },

    normal: {
      title: 'Folate Within Laboratory Reference Interval',
      meaning:
        'Folate is within the reference range (typically 3.0–17.0 ng/mL), indicating adequate recent dietary folate intake.',
      possibleAssociations: [
        'Adequate dietary intake and normal intestinal absorption',
        'Healthy erythropoiesis and DNA synthesis',
      ],
      nutrition: [
        'Maintain a balanced diet rich in varied whole plant foods and legumes.',
      ],
      lifestyle: [
        'Continue regular healthy lifestyle habits.',
      ],
      cautions: [
        'Serum folate reflects recent dietary intake; RBC folate reflects long-term 3-month cellular stores.',
      ],
      monitoring: [
        'Routine periodic wellness checkups.',
      ],
      sourceIds: ['medlineplus-folate', 'nih-ods-folate'],
    },

    high: {
      title: 'Folate Above Laboratory Reference Interval',
      meaning:
        'An elevated folate level is most commonly seen following recent fortified food consumption or dietary multivitamin supplementation.',
      possibleAssociations: [
        'Recent dietary folic acid supplementation or fortified food intake',
        'High dietary intake of leafy vegetables',
        'Altered gut microbiome synthesis',
      ],
      nutrition: [
        'Review current multivitamins and fortified foods with your clinician.',
      ],
      lifestyle: [
        'Maintain balanced lifestyle habits.',
      ],
      cautions: [
        'Excessive unmetabolized folic acid supplementation in the setting of borderline low B12 warrants medical evaluation.',
      ],
      monitoring: [
        'Serum Vitamin B12 levels.',
      ],
      sourceIds: ['medlineplus-folate', 'nih-ods-folate'],
    },
  },

  relatedMetrics: ['Vitamin B12', 'MCV', 'Hemoglobin', 'Total RBC', 'RDW'],
  sources: [
    {
      id: 'medlineplus-folate',
      organization: 'MedlinePlus / National Library of Medicine',
      title: 'Folic Acid Blood Test Information',
      url: 'https://medlineplus.gov/lab-tests/folic-acid-test/',
      domain: 'medlineplus.gov',
      sourceType: 'government',
      accessedAt: '2026-09-02',
    },
    {
      id: 'nih-ods-folate',
      organization: 'National Institutes of Health (NIH) - Office of Dietary Supplements',
      title: 'Folate Health Professional Fact Sheet',
      url: 'https://ods.od.nih.gov/factsheets/Folate-HealthProfessional/',
      domain: 'ods.od.nih.gov',
      sourceType: 'government',
      accessedAt: '2026-09-02',
    },
  ],
  evidenceLevel: 'high',
  knowledgeVersion: '1.0.0',
  lastReviewedAt: '2026-09-02',
};

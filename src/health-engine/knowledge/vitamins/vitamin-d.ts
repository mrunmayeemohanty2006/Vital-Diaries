import type { HealthKnowledgeEntry } from '../../types';

export const vitaminDKnowledge: HealthKnowledgeEntry = {
  id: 'vitamin-d',
  name: 'Vitamin D',
  aliases: [
    'Vitamin D',
    'Vit D',
    'Vitamin D (25-OH)',
    '25-OH Vitamin D',
    '25-Hydroxyvitamin D',
    'Vitamin D3',
    'Calcidiol',
  ],
  category: 'general',

  about: {
    description:
      'Vitamin D (measured as 25-hydroxyvitamin D) is a fat-soluble secosteroid hormone precursor essential for intestinal calcium and phosphorus absorption, bone mineralization, and immune modulation.',
    whatItMeasures:
      'The total concentration of circulating 25-hydroxyvitamin D [25(OH)D] in ng/mL or nmol/L, representing overall body vitamin D reserves from synthesis and diet.',
    whyItIsTested:
      'Screens for vitamin D insufficiency/deficiency, investigates bone density loss (osteopenia/osteoporosis), evaluates unexplained muscle/bone aches, or monitors supplementation.',
  },

  units: ['ng/mL', 'nmol/L', 'ug/L'],
  primaryUnit: 'ng/mL',

  interpretations: {
    low: {
      title: 'Vitamin D Below Laboratory Reference Interval (< 20–30 ng/mL)',
      meaning:
        'A lower-than-reference 25(OH)D level indicates insufficient vitamin D stores, which can impair calcium absorption and trigger compensatory parathyroid hormone (PTH) elevation.',
      possibleAssociations: [
        'Insufficient cutaneous synthesis from limited sunlight exposure (higher latitude, indoor lifestyle, sunscreen use)',
        'Low dietary intake of fatty fish, fortified dairy, or egg yolks',
        'Impaired intestinal fat absorption (celiac, Crohn’s, pancreatic insufficiency)',
        'Obesity (vitamin D sequestration in adipose tissue)',
        'Liver or kidney variations affecting hydroxylation',
      ],
      nutrition: [
        'Incorporate dietary sources: wild fatty fish (salmon, sardines, mackerel), egg yolks, fortified dairy or plant milks, and UV-exposed mushrooms.',
        'Pair vitamin D supplements with healthy dietary fats (olive oil, nuts, avocado) for optimal absorption.',
      ],
      lifestyle: [
        'Engage in sensible brief outdoor sun exposure when UV index permits, avoiding sunburn.',
        'Engage in weight-bearing physical exercise (walking, resistance training) to support bone strength.',
      ],
      cautions: [
        'Discuss appropriate supplemental cholecalciferol (D3) dosage with your healthcare provider; recheck levels after 8–12 weeks.',
      ],
      monitoring: [
        'Serum Calcium, Phosphorus, and Parathyroid Hormone (PTH) if severely low.',
        'Follow-up 25(OH)D testing in 3 months.',
      ],
      sourceIds: ['medlineplus-vit-d', 'nih-ods-vit-d'],
    },

    normal: {
      title: 'Vitamin D Within Laboratory Reference Interval (30–100 ng/mL)',
      meaning:
        '25-hydroxyvitamin D is within the sufficient physiological range (typically 30–100 ng/mL), supporting healthy calcium homeostasis and bone remodeling.',
      possibleAssociations: [
        'Adequate sunlight synthesis and dietary intake',
        'Normal bone mineralization and immune cellular signaling',
      ],
      nutrition: [
        'Maintain balanced nutrition with calcium and vitamin D sources.',
      ],
      lifestyle: [
        'Maintain regular physical activity and sensible sun exposure.',
      ],
      cautions: [
        'Ensure concurrent adequate dietary calcium intake.',
      ],
      monitoring: [
        'Periodic annual wellness screening.',
      ],
      sourceIds: ['medlineplus-vit-d', 'nih-ods-vit-d'],
    },

    high: {
      title: 'Vitamin D Above Laboratory Reference Interval (> 100 ng/mL)',
      meaning:
        'An elevated Vitamin D level (> 100 ng/mL) is almost exclusively caused by excessive high-dose supplementation and can lead to hypercalcemia and soft tissue calcification.',
      possibleAssociations: [
        'High-dose or prolonged unmonitored Vitamin D supplementation',
        'Excessive combination of multivitamin and single-nutrient supplements',
        'Granulomatous disorders (e.g., sarcoidosis) with extrarenal 1-alpha-hydroxylase activity',
      ],
      nutrition: [
        'Discontinue standalone Vitamin D supplements and high-calcium supplements until reviewed by a physician.',
        'Drink plenty of water to support renal calcium excretion.',
      ],
      lifestyle: [
        'Review all supplement dosages with your doctor immediately.',
      ],
      cautions: [
        'Vitamin D toxicity causes elevated blood calcium (hypercalcemia), which can damage kidneys and cardiovascular tissue.',
      ],
      monitoring: [
        'Serum Calcium, Serum Phosphorus, Creatinine, and 25(OH)D.',
      ],
      whenToSeekPromptCare: [
        'Persistent nausea, vomiting, severe constipation, excessive thirst/urination, or confusion',
      ],
      sourceIds: ['medlineplus-vit-d', 'nih-ods-vit-d'],
    },
  },

  relatedMetrics: ['Calcium', 'Parathyroid Hormone', 'Phosphorus', 'Creatinine'],
  sources: [
    {
      id: 'medlineplus-vit-d',
      organization: 'MedlinePlus / National Library of Medicine',
      title: 'Vitamin D Test Information',
      url: 'https://medlineplus.gov/lab-tests/vitamin-d-test/',
      domain: 'medlineplus.gov',
      sourceType: 'government',
      accessedAt: '2026-09-02',
    },
    {
      id: 'nih-ods-vit-d',
      organization: 'National Institutes of Health (NIH) - Office of Dietary Supplements',
      title: 'Vitamin D Health Professional Fact Sheet',
      url: 'https://ods.od.nih.gov/factsheets/VitaminD-HealthProfessional/',
      domain: 'ods.od.nih.gov',
      sourceType: 'government',
      accessedAt: '2026-09-02',
    },
  ],
  evidenceLevel: 'high',
  knowledgeVersion: '1.0.0',
  lastReviewedAt: '2026-09-02',
};

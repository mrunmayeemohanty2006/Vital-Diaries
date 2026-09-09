import type { HealthKnowledgeEntry } from '../../types';

export const vitaminB12Knowledge: HealthKnowledgeEntry = {
  id: 'vitamin-b12',
  name: 'Vitamin B12',
  aliases: ['Vitamin B12', 'Vit B12', 'Vitamin B-12', 'Vit B-12', 'Cobalamin', 'Cyanocobalamin', 'Serum B12'],
  category: 'general',

  about: {
    description:
      'Vitamin B12 (cobalamin) is an essential water-soluble micronutrient required for red blood cell DNA synthesis, neurological myelination, and cellular energy metabolism.',
    whatItMeasures:
      'The concentration of Vitamin B12 in blood serum (typically measured in pg/mL or pmol/L).',
    whyItIsTested:
      'Evaluates causes of macrocytic anemia (high MCV), peripheral neuropathy, fatigue, cognitive changes, or nutritional adequacy in plant-based diets.',
  },

  units: ['pg/mL', 'pmol/L', 'ng/L'],
  primaryUnit: 'pg/mL',

  interpretations: {
    low: {
      title: 'Vitamin B12 Below Laboratory Reference Interval (< 200–300 pg/mL)',
      meaning:
        'A lower-than-reference Vitamin B12 level indicates insufficient circulating cobalamin, which can impair red cell maturation (macrocytic anemia) and compromise nervous system myelin maintenance.',
      possibleAssociations: [
        'Pernicious anemia (autoimmune destruction of gastric parietal cells / intrinsic factor deficiency)',
        'Dietary insufficiency (strict vegan or vegetarian diet without adequate supplementation)',
        'Gastrointestinal malabsorption (celiac disease, Crohn’s disease, atrophic gastritis, bariatric surgery)',
        'Long-term medication use (metformin, proton pump inhibitors, H2 blockers reducing B12 absorption)',
        'Age-related reduction in gastric acid production',
      ],
      nutrition: [
        'Include dietary B12 sources: eggs, dairy products, fish, lean meats, and B12-fortified plant milks / nutritional yeasts.',
        'Individuals following plant-based diets should discuss appropriate oral cyanocobalamin or methylcobalamin supplementation with their healthcare provider.',
      ],
      lifestyle: [
        'Ensure steady rest and pace physical exertion if experiencing fatigue or weakness.',
      ],
      cautions: [
        'Do not treat low B12 with folate alone, as folate can correct anemia while allowing neurological damage to progress unnoticed.',
      ],
      monitoring: [
        'Serum Methylmalonic Acid (MMA) and Homocysteine (sensitive functional markers for cellular B12 status).',
        'Complete Blood Count (CBC) with MCV.',
      ],
      whenToSeekPromptCare: [
        'Numbness, tingling, or "pins and needles" in hands or feet, difficulty walking, balance issues, or acute confusion',
      ],
      sourceIds: ['medlineplus-b12', 'nih-ods-b12'],
    },

    normal: {
      title: 'Vitamin B12 Within Laboratory Reference Interval',
      meaning:
        'Vitamin B12 is within the reference range (typically 200–900 pg/mL), indicating adequate circulating cobalamin.',
      possibleAssociations: [
        'Adequate dietary intake and gastrointestinal absorption',
        'Healthy red cell maturation and neurological maintenance',
      ],
      nutrition: [
        'Maintain a balanced diet with consistent B12 sources.',
      ],
      lifestyle: [
        'Continue regular healthy habits.',
      ],
      cautions: [
        'Borderline levels (200–350 pg/mL) in the presence of symptoms can sometimes represent early tissue deficiency; MMA testing can provide clarity.',
      ],
      monitoring: [
        'Routine periodic wellness checkups.',
      ],
      sourceIds: ['medlineplus-b12', 'nih-ods-b12'],
    },

    high: {
      title: 'Vitamin B12 Above Laboratory Reference Interval',
      meaning:
        'An elevated Vitamin B12 level is commonly caused by recent high-dose B12 supplementation, but persistent unsupplemented elevation can reflect altered hepatic or hematologic clearance.',
      possibleAssociations: [
        'Recent high-dose oral or injectable Vitamin B12 supplementation / multivitamins',
        'Liver dysfunction or hepatitis (release of stored cobalamin into circulation)',
        'Kidney dysfunction (decreased renal clearance)',
        'Myeloproliferative disorders (excess transcobalamin binding proteins)',
      ],
      nutrition: [
        'Review current multivitamins, energy drinks, and supplements with your clinician to assess B12 dosages.',
      ],
      lifestyle: [
        'Maintain balanced daily lifestyle routines.',
      ],
      cautions: [
        'Water-soluble B12 is generally non-toxic, but unsupplemented high levels warrant medical evaluation of liver and kidney function.',
      ],
      monitoring: [
        'Liver and kidney function panels (ALT, AST, Creatinine) if high without supplementation.',
      ],
      sourceIds: ['medlineplus-b12', 'nih-ods-b12'],
    },
  },

  relatedMetrics: ['Folate', 'MCV', 'Hemoglobin', 'Total RBC', 'RDW'],
  sources: [
    {
      id: 'medlineplus-b12',
      organization: 'MedlinePlus / National Library of Medicine',
      title: 'Vitamin B12 Blood Test Information',
      url: 'https://medlineplus.gov/lab-tests/vitamin-b12-test/',
      domain: 'medlineplus.gov',
      sourceType: 'government',
      accessedAt: '2026-09-02',
    },
    {
      id: 'nih-ods-b12',
      organization: 'National Institutes of Health (NIH) - Office of Dietary Supplements',
      title: 'Vitamin B12 Health Professional Fact Sheet',
      url: 'https://ods.od.nih.gov/factsheets/VitaminB12-HealthProfessional/',
      domain: 'ods.od.nih.gov',
      sourceType: 'government',
      accessedAt: '2026-09-02',
    },
  ],
  evidenceLevel: 'high',
  knowledgeVersion: '1.0.0',
  lastReviewedAt: '2026-09-02',
};

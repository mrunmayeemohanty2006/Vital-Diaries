import type { HealthKnowledgeEntry } from '../../types';

export const tshKnowledge: HealthKnowledgeEntry = {
  id: 'tsh',
  name: 'TSH',
  aliases: [
    'TSH',
    'Thyroid Stimulating Hormone',
    'Serum TSH',
    'TSH Level',
    'Thyrotropin',
    'S. TSH',
  ],
  category: 'thyroid',

  about: {
    description:
      'Thyroid-Stimulating Hormone (TSH or thyrotropin) is produced by the anterior pituitary gland to regulate thyroid gland synthesis and release of thyroxine (T4) and triiodothyronine (T3).',
    whatItMeasures:
      'The concentration of pituitary TSH in blood serum (typically measured in uIU/mL or mIU/L).',
    whyItIsTested:
      'The primary frontline screening test for thyroid dysfunction, evaluating for primary hypothyroidism (high TSH) or hyperthyroidism (suppressed TSH).',
  },

  units: ['uIU/mL', 'mIU/L', 'uU/mL', 'mcIU/mL', 'piu/mL'],
  primaryUnit: 'uIU/mL',

  interpretations: {
    low: {
      title: 'TSH Result Below Laboratory Reference Interval (< 0.40–0.45 uIU/mL)',
      meaning:
        'A suppressed or low TSH indicates that the pituitary gland is reducing its stimulation of the thyroid gland, typically because circulating thyroid hormone (T4/T3) levels are elevated (hyperthyroidism) or from thyroid hormone over-replacement.',
      possibleAssociations: [
        'Primary hyperthyroidism (e.g., Graves’ disease, toxic multinodular goiter, toxic adenoma)',
        'Thyroid hormone over-replacement (excess levothyroxine dosage)',
        'Subacute thyroiditis (early inflammatory release phase)',
        'Subclinical hyperthyroidism (low TSH with normal free T4/T3)',
        'First trimester of pregnancy (hCG-driven mild TSH suppression)',
      ],
      nutrition: [
        'Avoid excessive iodine intake (kelp, seaweed, iodine-rich supplements) unless specifically advised by an endocrinologist.',
        'Ensure balanced caloric intake to support higher metabolic rate.',
      ],
      lifestyle: [
        'Practice stress-reduction techniques and pacing during physical exercise.',
      ],
      cautions: [
        'If taking thyroid medication (e.g., levothyroxine), consult your prescribing doctor for dose titration.',
      ],
      monitoring: [
        'Free T4 and Free T3 testing to assess thyroid hormone degree.',
        'TSH receptor antibodies (TRAb) if Graves’ disease is evaluated.',
      ],
      whenToSeekPromptCare: [
        'Rapid irregular heart rate (atrial fibrillation), severe palpitations, unexplained chest pain, high fever, or severe agitation',
      ],
      sourceIds: ['medlineplus-tsh', 'ata-thyroid-guidelines'],
    },

    normal: {
      title: 'TSH Result Within Laboratory Reference Interval (0.40–4.50 uIU/mL)',
      meaning:
        'TSH is within the reference range (typically 0.40–4.50 uIU/mL), reflecting healthy pituitary-thyroid negative feedback equilibrium.',
      possibleAssociations: [
        'Normal euthyroid endocrine regulation',
      ],
      nutrition: [
        'Maintain balanced dietary iodine intake (iodized salt, seafood, dairy).',
      ],
      lifestyle: [
        'Continue regular healthy physical and sleep routines.',
      ],
      cautions: [
        'Periodic screening is recommended, especially with a personal or family history of autoimmune thyroid disease.',
      ],
      monitoring: [
        'Routine periodic wellness checkups.',
      ],
      sourceIds: ['medlineplus-tsh', 'ata-thyroid-guidelines'],
    },

    high: {
      title: 'TSH Result Above Laboratory Reference Interval (> 4.50 uIU/mL)',
      meaning:
        'An elevated TSH indicates that the pituitary gland is producing excess thyrotropin to compensate for insufficient thyroid hormone production by the thyroid gland (primary hypothyroidism).',
      possibleAssociations: [
        'Primary hypothyroidism (most commonly Hashimoto’s autoimmune thyroiditis)',
        'Subclinical hypothyroidism (elevated TSH with normal Free T4)',
        'Inadequate thyroid hormone replacement dosing',
        'Postpartum thyroiditis recovery phase',
        'Severe systemic illness recovery phase',
        'Iodine deficiency (globally) or excess iodine exposure',
      ],
      nutrition: [
        'Ensure adequate dietary selenium (Brazil nuts, sunflower seeds, fish) and zinc to support thyroid enzyme deiodinases.',
        'Ensure appropriate dietary iodine without taking excessive concentrated kelp/seaweed supplements.',
      ],
      lifestyle: [
        'Allow for adequate sleep and paced physical activity if experiencing fatigue or cold intolerance.',
      ],
      cautions: [
        'Do not take standalone thyroid glandular extracts without medical supervision.',
      ],
      monitoring: [
        'Free T4 and Thyroid Peroxidase Antibodies (Anti-TPO) to check for autoimmune Hashimoto’s thyroiditis.',
        'Repeat TSH in 6–8 weeks to confirm persistence.',
      ],
      whenToSeekPromptCare: [
        'Severe swelling, extreme lethargy, hypothermia, or marked mental status changes',
      ],
      sourceIds: ['medlineplus-tsh', 'ata-thyroid-guidelines'],
    },
  },

  relatedMetrics: ['Free T4', 'Free T3', 'Total Cholesterol', 'LDL', 'Creatinine'],
  sources: [
    {
      id: 'medlineplus-tsh',
      organization: 'MedlinePlus / National Library of Medicine',
      title: 'TSH (Thyroid Stimulating Hormone) Test Information',
      url: 'https://medlineplus.gov/lab-tests/tsh-thyroid-stimulating-hormone-test/',
      domain: 'medlineplus.gov',
      sourceType: 'government',
      accessedAt: '2026-09-02',
    },
    {
      id: 'ata-thyroid-guidelines',
      organization: 'American Thyroid Association (ATA)',
      title: 'Thyroid Function Tests Clinical Guide',
      url: 'https://www.thyroid.org/thyroid-function-tests/',
      domain: 'thyroid.org',
      sourceType: 'clinical_reference',
      accessedAt: '2026-09-02',
    },
  ],
  evidenceLevel: 'high',
  knowledgeVersion: '1.0.0',
  lastReviewedAt: '2026-09-02',
};

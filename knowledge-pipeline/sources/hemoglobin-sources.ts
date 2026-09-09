/**
 * Approved Medical Source Registry for Hemoglobin
 * 
 * Strict Domain Allowlist & Curated Source Endpoints
 */

export interface KnowledgeSource {
  id: string;
  organization: string;
  title: string;
  url: string;
  domain: string;
  sourceType: 'government' | 'medical_organization' | 'clinical_reference';
  accessedAt: string;
  lastReviewedAt?: string;
  description?: string;
}

/**
 * Strict allowlist of authoritative medical domains.
 * Any URL outside this list is immediately rejected by the development crawler.
 */
export const ALLOWED_DOMAINS: readonly string[] = [
  'medlineplus.gov',
  'nhlbi.nih.gov',
  'nih.gov',
  'niddk.nih.gov',
  'ncbi.nlm.nih.gov',
  'cdc.gov',
  'who.int',
] as const;

/**
 * Validates whether a given URL belongs to the approved domain allowlist.
 */
export function isAllowedDomain(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    return ALLOWED_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

/**
 * Curated source registry for Hemoglobin research.
 */
export const HEMOGLOBIN_SOURCES: KnowledgeSource[] = [
  {
    id: 'medlineplus-hemoglobin-test',
    organization: 'MedlinePlus / National Library of Medicine',
    title: 'Hemoglobin Test: MedlinePlus Medical Test',
    url: 'https://medlineplus.gov/lab-tests/hemoglobin-test/',
    domain: 'medlineplus.gov',
    sourceType: 'government',
    accessedAt: '2026-09-02',
    lastReviewedAt: '2026-09-02',
    description: 'Clinical overview of hemoglobin blood tests, reference ranges, and low/high associations.',
  },
  {
    id: 'nhlbi-anemia-overview',
    organization: 'National Heart, Lung, and Blood Institute (NHLBI) / NIH',
    title: 'Anemia - Causes and Risk Factors | NHLBI, NIH',
    url: 'https://www.nhlbi.nih.gov/health/anemia/causes',
    domain: 'nhlbi.nih.gov',
    sourceType: 'government',
    accessedAt: '2026-09-02',
    lastReviewedAt: '2026-09-02',
    description: 'Physiological mechanisms, nutritional factors (iron, B12, folate), and systemic causes of low hemoglobin.',
  },
  {
    id: 'medlineplus-anemia',
    organization: 'MedlinePlus / National Library of Medicine',
    title: 'Anemia | MedlinePlus',
    url: 'https://medlineplus.gov/anemia.html',
    domain: 'medlineplus.gov',
    sourceType: 'government',
    accessedAt: '2026-09-02',
    lastReviewedAt: '2026-09-02',
    description: 'Health information on symptoms, monitoring, and lifestyle guidance related to low hemoglobin.',
  },
  {
    id: 'nhlbi-blood-tests',
    organization: 'National Heart, Lung, and Blood Institute (NHLBI) / NIH',
    title: 'Blood Tests - Complete Blood Count | NHLBI, NIH',
    url: 'https://www.nhlbi.nih.gov/health/blood-tests',
    domain: 'nhlbi.nih.gov',
    sourceType: 'government',
    accessedAt: '2026-09-02',
    lastReviewedAt: '2026-09-02',
    description: 'Comprehensive guide to Complete Blood Count (CBC) testing and component evaluation.',
  },
];

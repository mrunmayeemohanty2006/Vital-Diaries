/**
 * Research Normalization Utility for Development Crawler
 * 
 * Groups and tags extracted text into research categories for human review:
 * - Description / Function
 * - Reference Ranges
 * - Low Hemoglobin Causes / Associations
 * - High Hemoglobin Causes / Associations
 * - Nutrition & Lifestyle
 * - Monitoring & Care
 */

import type { ExtractedPageContent } from './extract';

export interface NormalizedResearchSection {
  category: 'description' | 'reference_ranges' | 'low_associations' | 'high_associations' | 'nutrition_lifestyle' | 'monitoring' | 'general';
  snippets: string[];
}

export interface NormalizedResearchDocument {
  sourceId: string;
  organization: string;
  title: string;
  url: string;
  accessedAt: string;
  sections: NormalizedResearchSection[];
}

/**
 * Categorizes extracted page content paragraphs into structured research categories.
 */
export function normalizePageContent(
  sourceId: string,
  organization: string,
  url: string,
  accessedAt: string,
  content: ExtractedPageContent
): NormalizedResearchDocument {
  const sectionsMap: Record<NormalizedResearchSection['category'], string[]> = {
    description: [],
    reference_ranges: [],
    low_associations: [],
    high_associations: [],
    nutrition_lifestyle: [],
    monitoring: [],
    general: [],
  };

  const paragraphs = content.paragraphs;

  for (const para of paragraphs) {
    const lower = para.toLowerCase();

    if (
      lower.includes('what is a hemoglobin') ||
      lower.includes('what it is used for') ||
      lower.includes('hemoglobin is a protein') ||
      lower.includes('why do i need a hemoglobin')
    ) {
      sectionsMap.description.push(para);
    } else if (
      lower.includes('normal range') ||
      lower.includes('reference range') ||
      lower.includes('grams per deciliter') ||
      lower.includes('g/dl') ||
      lower.includes('g/l')
    ) {
      sectionsMap.reference_ranges.push(para);
    } else if (
      lower.includes('low hemoglobin') ||
      lower.includes('anemia') ||
      lower.includes('lower than normal') ||
      lower.includes('blood loss') ||
      lower.includes('iron deficiency')
    ) {
      sectionsMap.low_associations.push(para);
    } else if (
      lower.includes('high hemoglobin') ||
      lower.includes('polycythemia') ||
      lower.includes('higher than normal') ||
      lower.includes('dehydration') ||
      lower.includes('smoking') ||
      lower.includes('high altitude')
    ) {
      sectionsMap.high_associations.push(para);
    } else if (
      lower.includes('iron-rich') ||
      lower.includes('diet') ||
      lower.includes('nutrition') ||
      lower.includes('vitamin b12') ||
      lower.includes('folate') ||
      lower.includes('foods') ||
      lower.includes('lifestyle')
    ) {
      sectionsMap.nutrition_lifestyle.push(para);
    } else if (
      lower.includes('doctor') ||
      lower.includes('healthcare provider') ||
      lower.includes('symptoms') ||
      lower.includes('fatigue') ||
      lower.includes('dizziness') ||
      lower.includes('seek care')
    ) {
      sectionsMap.monitoring.push(para);
    } else {
      if (sectionsMap.general.length < 5) {
        sectionsMap.general.push(para);
      }
    }
  }

  const sections: NormalizedResearchSection[] = (
    Object.entries(sectionsMap) as [NormalizedResearchSection['category'], string[]][]
  )
    .filter(([_, snippets]) => snippets.length > 0)
    .map(([category, snippets]) => ({ category, snippets }));

  return {
    sourceId,
    organization,
    title: content.title || 'Medical Reference Document',
    url,
    accessedAt,
    sections,
  };
}

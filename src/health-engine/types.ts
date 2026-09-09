/**
 * Vital Diaries — Local Health Knowledge Engine Type Definitions
 * 
 * Reusable strongly-typed schemas for deterministic health markers,
 * clinical interpretations, reference range evaluations, and traceable medical sources.
 */

export type EvaluatedMetricStatus = 'low' | 'normal' | 'high' | 'unknown' | 'low-normal' | 'high-normal';

export type EvidenceLevel = 'high' | 'moderate' | 'limited';

export interface KnowledgeSource {
  id: string;
  organization: string;
  title: string;
  url: string;
  domain: string;
  sourceType: 'government' | 'medical_organization' | 'clinical_reference' | 'peer_reviewed_literature';
  accessedAt: string;
  lastReviewedAt?: string;
  description?: string;
}

export interface HealthInterpretation {
  title: string;
  meaning: string;
  possibleAssociations: string[];
  nutrition: string[];
  foodRestrictions?: string[];
  lifestyle: string[];
  cautions: string[];
  monitoring: string[];
  questionsForDoctor?: string[];
  whenToSeekPromptCare?: string[];
  sourceIds: string[];
}

export interface HealthKnowledgeEntry {
  id: string;
  name: string;
  aliases: string[];
  category: 'cbc' | 'metabolic' | 'lipid' | 'cardiology' | 'renal' | 'thyroid' | 'liver' | 'general' | 'research';
  
  about: {
    description: string;
    whatItMeasures: string;
    whyItIsTested: string;
  };

  units: string[];
  primaryUnit: string;

  interpretations: {
    low: HealthInterpretation;
    normal: HealthInterpretation;
    high: HealthInterpretation;
  };

  relatedMetrics: string[];
  sources: KnowledgeSource[];
  evidenceLevel: EvidenceLevel;
  knowledgeVersion: string;
  lastReviewedAt: string;
}

export interface MetricReferenceRange {
  low?: number;
  high?: number;
  source: 'uploaded_report' | 'unavailable';
  unit?: string;
  rawText?: string;
}

export interface HealthInsight {
  metric: string;
  canonicalId: string;
  value: number;
  rawDisplayValue: string;
  unit: string;
  status: EvaluatedMetricStatus;
  knowledgeKey?: string; // e.g. "hemoglobin.low", "hemoglobin.normal", "hemoglobin.high"

  referenceRange: MetricReferenceRange;

  interpretation?: {
    title: string;
    meaning: string;
  };

  possibleAssociations: string[];
  nutrition: string[];
  foodRestrictions?: string[];
  lifestyle: string[];
  cautions: string[];
  monitoring: string[];
  questionsForDoctor?: string[];
  whenToSeekPromptCare?: string[];

  relatedMetrics: string[];
  sources: KnowledgeSource[];
  
  knowledgeVersion: string;
  lastReviewedAt: string;
  evidenceLevel: EvidenceLevel;
  
  evaluatedAt: string;
  isDeterministic: boolean;
  needsVerification?: boolean;
  verificationReason?: string;
  missingReferenceRangeMessage?: string;
  researchProvenance?: {
    searchQuery?: string;
    tier?: 1 | 2 | 3;
    isDynamicResearch?: boolean;
  };
}


/**
 * Deterministic Health Marker Evaluator & Dynamic Insight Bridge
 * 
 * 100% Client-Side, Deterministic, AI-Free, and Local.
 * Evaluates ANY extracted clinical biomarker against the report's laboratory reference intervals.
 * Automatically engages the Dynamic Medical Researcher for known and novel biomarkers.
 */

import { getHealthKnowledgeEntry } from '../knowledge';
import { generateDynamicAbnormalInsight } from '../research/dynamic-researcher';
import type {
  HealthInsight,
  EvaluatedMetricStatus,
  MetricReferenceRange,
} from '../types';

export interface MarkerInputData {
  name: string;
  value: number | string;
  unit?: string;
  referenceRange?: {
    low?: number;
    high?: number;
    rawText?: string;
    unit?: string;
  };
  needsVerification?: boolean;
  verificationReason?: string;
}

/**
 * Normalizes units and values for safe, deterministic comparison.
 * Hemoglobin standard unit: g/dL. (1 g/dL = 10 g/L)
 */
function normalizeMarkerValue(
  metricId: string,
  value: number,
  unit?: string,
  targetUnit: string = ''
): { normalizedValue: number; normalizedUnit: string } {
  if (!unit || !targetUnit) return { normalizedValue: value, normalizedUnit: unit || targetUnit };

  const cleanUnit = unit.toLowerCase().trim();
  const cleanTarget = targetUnit.toLowerCase().trim();

  // Hemoglobin: g/L <-> g/dL
  if (metricId === 'hemoglobin') {
    if ((cleanUnit === 'g/l' || cleanUnit === 'g/litre') && cleanTarget === 'g/dl') {
      return {
        normalizedValue: Math.round((value / 10) * 100) / 100,
        normalizedUnit: 'g/dL',
      };
    }
    if (cleanUnit === 'g/dl' && (cleanTarget === 'g/l' || cleanTarget === 'g/litre')) {
      return {
        normalizedValue: Math.round(value * 10 * 100) / 100,
        normalizedUnit: 'g/L',
      };
    }
  }

  // Platelets: lakh/uL <-> cells/uL
  if (metricId === 'platelets') {
    if ((cleanUnit === 'lakh/ul' || cleanUnit === 'lacs/ul') && (cleanTarget === '/mcl' || cleanTarget === 'cells/ul' || cleanTarget === '/ul')) {
      return {
        normalizedValue: value * 100000,
        normalizedUnit: '/uL',
      };
    }
  }

  return { normalizedValue: value, normalizedUnit: unit };
}

/**
 * Evaluates the clinical status of a biomarker based on the report's reference intervals.
 * Handles interval ranges (low - high) as well as unilateral bounds (< X, > Y).
 */
export function determineMetricStatusFromReport(
  value: number,
  ref?: { low?: number; high?: number; rawText?: string }
): { status: EvaluatedMetricStatus; refRange: MetricReferenceRange } {
  if (!ref) {
    return {
      status: 'unknown',
      refRange: { source: 'unavailable' },
    };
  }

  const rawText = (ref.rawText || '').trim();
  const hasLow = typeof ref.low === 'number' && !isNaN(ref.low);
  const hasHigh = typeof ref.high === 'number' && !isNaN(ref.high);

  // Check unilateral upper bound (e.g., "< 38", "<= 35", "up to 40")
  if ((!hasLow || ref.low === 0) && hasHigh && /^(?:<|<=|less than|up to)/i.test(rawText)) {
    const status: EvaluatedMetricStatus = value > ref.high! ? 'high' : 'normal';
    return {
      status,
      refRange: {
        high: ref.high,
        source: 'uploaded_report',
        rawText,
      },
    };
  }

  // Check unilateral lower bound (e.g., "> 10", ">= 10")
  if (hasLow && !hasHigh && /^(?:>|>=|greater than|more than)/i.test(rawText)) {
    const status: EvaluatedMetricStatus = value < ref.low! ? 'low' : 'normal';
    return {
      status,
      refRange: {
        low: ref.low,
        source: 'uploaded_report',
        rawText,
      },
    };
  }

  // Standard dual-bound interval (low - high)
  if (hasLow && hasHigh && ref.low! < ref.high!) {
    let status: EvaluatedMetricStatus = 'normal';
    if (value < ref.low!) {
      status = 'low';
    } else if (value > ref.high!) {
      status = 'high';
    } else {
      status = 'normal';
    }

    return {
      status,
      refRange: {
        low: ref.low,
        high: ref.high,
        source: 'uploaded_report',
        rawText,
      },
    };
  }

  // No valid interval structure found in report
  return {
    status: 'unknown',
    refRange: {
      low: ref.low,
      high: ref.high,
      source: 'unavailable',
      rawText,
    },
  };
}

/**
 * Evaluates a single health biomarker deterministically
 * using the laboratory reference range from the uploaded report.
 * Works dynamically with static bundled knowledge and dynamic Tier 1/2/3 research.
 */
export function evaluateHealthMarker(input: MarkerInputData): HealthInsight | null {
  if (!input || !input.name) return null;

  // 1. Parse numeric value
  let numericVal: number;
  if (typeof input.value === 'number') {
    numericVal = input.value;
  } else {
    const parsed = parseFloat(String(input.value).replace(/,/g, ''));
    if (isNaN(parsed)) return null;
    numericVal = parsed;
  }

  const rawUnit = input.unit || '';

  // 2. Evaluate laboratory reference range strictly from document
  const { status, refRange } = determineMetricStatusFromReport(numericVal, input.referenceRange);
  refRange.unit = input.referenceRange?.unit || rawUnit;

  // 3. Look up bundled static knowledge
  const knowledge = getHealthKnowledgeEntry(input.name);

  if (knowledge) {
    const primaryUnit = rawUnit || knowledge.primaryUnit;
    const rawDisplayValue = `${numericVal} ${primaryUnit}`.trim();

    let compVal = numericVal;
    if (refRange.low !== undefined && refRange.high !== undefined && refRange.unit && primaryUnit.toLowerCase() !== refRange.unit.toLowerCase()) {
      const normalized = normalizeMarkerValue(knowledge.id, numericVal, primaryUnit, refRange.unit);
      compVal = normalized.normalizedValue;
    }

    // Deterministic rule evaluation against report range
    let finalStatus = status;
    if (refRange.low !== undefined && refRange.high !== undefined && refRange.low < refRange.high) {
      if (compVal < refRange.low) finalStatus = 'low';
      else if (compVal > refRange.high) finalStatus = 'high';
      else finalStatus = 'normal';
    }

    let interpretation: { title: string; meaning: string } | undefined;
    let possibleAssociations: string[] = [];
    let nutrition: string[] = [];
    let foodRestrictions: string[] | undefined;
    let lifestyle: string[] = [];
    let cautions: string[] = [];
    let monitoring: string[] = [];
    let questionsForDoctor: string[] | undefined;
    let whenToSeekPromptCare: string[] | undefined;
    let knowledgeKey: string | undefined;

    if (finalStatus === 'low' || finalStatus === 'normal' || finalStatus === 'high') {
      knowledgeKey = `${knowledge.id}.${finalStatus}`;
      const interp = knowledge.interpretations[finalStatus];
      interpretation = {
        title: interp.title,
        meaning: interp.meaning,
      };
      possibleAssociations = interp.possibleAssociations;
      nutrition = interp.nutrition;
      foodRestrictions = interp.foodRestrictions;
      lifestyle = interp.lifestyle;
      cautions = interp.cautions;
      monitoring = interp.monitoring;
      questionsForDoctor = interp.questionsForDoctor || [
        `What could be contributing to this ${input.name} result (${rawDisplayValue})?`,
        `Are any follow-up tests or lifestyle adjustments recommended?`,
      ];
      whenToSeekPromptCare = interp.whenToSeekPromptCare;
    }

    return {
      metric: knowledge.name,
      canonicalId: knowledge.id,
      value: numericVal,
      rawDisplayValue,
      unit: primaryUnit,
      status: finalStatus,
      knowledgeKey,

      referenceRange: refRange,

      interpretation,
      possibleAssociations,
      nutrition,
      foodRestrictions,
      lifestyle,
      cautions,
      monitoring,
      questionsForDoctor,
      whenToSeekPromptCare,

      relatedMetrics: knowledge.relatedMetrics,
      sources: knowledge.sources,

      evidenceLevel: knowledge.evidenceLevel,
      knowledgeVersion: knowledge.knowledgeVersion,
      lastReviewedAt: knowledge.lastReviewedAt,

      evaluatedAt: new Date().toISOString(),
      isDeterministic: true,
      needsVerification: input.needsVerification || false,
      verificationReason: input.verificationReason,
      missingReferenceRangeMessage:
        finalStatus === 'unknown'
          ? 'A laboratory reference interval was not detected in the uploaded report. Reference ranges vary across individual laboratories, testing instruments, and demographic profiles. Your physician will interpret this value in context.'
          : undefined,
      researchProvenance: {
        tier: 1,
        isDynamicResearch: false,
      },
    };
  }

  // 4. If not in bundled knowledge, execute Dynamic Researcher (Tier 1/2/3)
  return generateDynamicAbnormalInsight({
    markerName: input.name,
    value: numericVal,
    unit: rawUnit,
    status,
    referenceRange: input.referenceRange,
    needsVerification: input.needsVerification,
    verificationReason: input.verificationReason,
  });
}

/**
 * Evaluates all health markers present in an array of extracted metrics.
 * Preserves ALL valid metrics without discarding unknown biomarkers.
 */
export function evaluateAllHealthMarkers(inputs: MarkerInputData[]): HealthInsight[] {
  if (!inputs || !Array.isArray(inputs)) return [];
  const results: HealthInsight[] = [];

  for (const input of inputs) {
    const insight = evaluateHealthMarker(input);
    if (insight) {
      results.push(insight);
    }
  }

  return results;
}

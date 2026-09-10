/**
 * Deterministic Clinical Extraction Engine
 * 
 * Extracts laboratory biomarkers, vital signs, reference intervals, and clinical metadata
 * from OCR text or native PDF text streams using deterministic dictionaries, spatial table
 * segmentation, and row-local column association.
 * 
 * Principles:
 * - 100% Local & Deterministic
 * - Zero AI / Zero LLM / Zero Network
 * - Row-Aware & Column-Aware: Reference intervals & status strictly extracted from the SAME ROW.
 * - Multi-Table Segmentation: Isolates CBC, Iron, Vitamins, and Biochemistry regions.
 * - Strict verification guarding (needsVerification: true) for OCR decimal/digit drop artifacts.
 * - Never mathematically guess or silently mutate raw OCR numbers.
 */

import {
  CANONICAL_MEDICAL_VOCABULARY,
  CANONICAL_UNIT_MAP,
  matchCanonicalParameter,
  normalizeUnit,
} from './ocr-medical-vocab';

export interface OCRToken {
  text: string;
  confidence: number;
  bbox?: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

export interface ExtractedMetric {
  name: string;
  rawName?: string;
  value: number | string;
  unit: string;
  displayValue: string;
  referenceRange?: {
    low?: number;
    high?: number;
    rawText?: string;
    unit?: string;
    source?: 'ocr' | 'normalized_ocr' | 'fallback' | 'missing';
  };
  referenceRangeSource?: 'ocr' | 'normalized_ocr' | 'fallback' | 'missing';
  status?: 'low' | 'normal' | 'high' | 'unknown' | 'low-normal' | 'high-normal';
  ocrStatus?: 'low' | 'normal' | 'high' | 'low-normal' | 'high-normal';
  method?: string;
  needsVerification?: boolean;
  verificationReason?: string;
  source?: 'pdf-text' | 'ocr';
  systolic?: number;
  diastolic?: number;
}

export interface ExtractedHealthData {
  title?: string;
  reportType?: 'cbc' | 'imaging' | 'cardiology' | 'general' | 'vaccine' | 'genomics' | 'other';
  metrics: ExtractedMetric[];
  results: Record<string, string>;
  summary: string;
  extractedDate?: string;
  flags?: string[];
  source?: 'pdf-text' | 'ocr';
}

interface MetricDefinition {
  canonicalName: string;
  aliases: string[];
  defaultUnit: string;
  category: 'cbc' | 'imaging' | 'cardiology' | 'general';
  expectedRange?: { min: number; max: number };
  customParser?: (text: string) => ExtractedMetric | null;
}

/**
 * Recognized measurement units and OCR typo normalizations.
 * Normalizes ONLY the unit string, never the numerical value.
 */
const UNIT_NORMALIZATION_MAP: Record<string, string> = {
  // Platelets / Volumes / Counts / Scientific
  'lakh/pl': 'lakh/uL',
  'lakh/pL': 'lakh/uL',
  'lakh/ul': 'lakh/uL',
  'lakh/µl': 'lakh/uL',
  'lakhs/ul': 'lakh/uL',
  'lacs/ul': 'lakh/uL',
  'lakh/cumm': 'lakh/uL',
  'lakhs/mcl': 'lakh/uL',
  'lac/cumm': 'lakh/uL',
  '/ul': '/uL',
  'ul': 'uL',
  'cells/ul': 'cells/uL',
  'cells/pl': 'cells/uL',
  'cells/pll': 'cells/uL',
  'cells/µl': 'cells/uL',
  'million/ul': 'million/uL',
  'million/pl': 'million/uL',
  'million/µl': 'million/uL',
  'm/ul': 'million/uL',
  '10^6/cu.mm': '10^6/cu.mm',
  '10^6/cumm': '10^6/cu.mm',
  '10^6/ul': '10^6/cu.mm',
  '10^6/µl': '10^6/cu.mm',
  '10^3/ul': '10^3/µL',
  '10^3/µl': '10^3/µL',
  '10^3/cumm': '10^3/µL',
  '10^3/cu.mm': '10^3/µL',
  '/mcl': '/mcL',
  'mcl': '/mcL',
  'k/ul': 'k/uL',
  'fl': 'fL',
  'f l': 'fL',

  // Enzymes / Ratios
  'u/l': 'U/L',
  'iu/l': 'U/L',
  'u/ml': 'U/mL',
  'ratio': 'Ratio',

  // Iron / Trace Minerals (Hg/dL, pa/dL are common OCR corruptions of µg/dL or ug/dL)
  'pa/dl': 'ug/dL',
  'pa/dl.': 'ug/dL',
  'ug/dl': 'ug/dL',
  'µg/dl': 'ug/dL',
  'mcg/dl': 'ug/dL',
  'hg/dl': 'ug/dL',

  // Thyroid / Hormones (iu/mL, piu/mL are common OCR corruptions of µIU/mL or uIU/mL)
  'iu/ml': 'uIU/mL',
  'piu/ml': 'uIU/mL',
  'uiu/ml': 'uIU/mL',
  'uu/ml': 'uIU/mL',
  'mciu/ml': 'uIU/mL',
  'miu/l': 'uIU/mL',
  'µiu/ml': 'uIU/mL',

  // Standard mass / volume
  'a/dl': 'g/dL',
  'a/dl.': 'g/dL',
  'g/di': 'g/dL',
  'pg/ml': 'pg/mL',
  'pg': 'pg',
  'ng/ml': 'ng/mL',
  'ng/ml.': 'ng/mL',
  'mg/dl': 'mg/dL',
  'mg/dl.': 'mg/dL',
  'g/dl': 'g/dL',
  'gm/dl': 'g/dL',
  '%': '%',
  'mmhg': 'mmHg',
  'mmol/l': 'mmol/L',
  'umol/l': 'umol/L',
};

/**
 * Metric Dictionary covering CBC, Iron, Vitamins, Metabolic, Thyroid, and Kidney panels.
 */
export const METRIC_DICTIONARY: MetricDefinition[] = [
  // 1. Blood Pressure
  {
    canonicalName: 'Blood Pressure',
    aliases: ['blood pressure', 'bp', 'b.p.'],
    defaultUnit: 'mmHg',
    category: 'general',
    customParser: parseBloodPressureLine,
  },

  // 2. Hemoglobin
  {
    canonicalName: 'Hemoglobin',
    aliases: [
      'hemoglobin (hb)',
      'hemoglobin, blood',
      'haemoglobin (hb)',
      'haemoglobin',
      'hemoglobin',
      'hgb',
      'hb',
    ],
    defaultUnit: 'g/dL',
    category: 'cbc',
    expectedRange: { min: 4.0, max: 25.0 },
  },

  // 3. Total RBC
  {
    canonicalName: 'Total RBC',
    aliases: ['total rbc count', 'rbc count', 'red blood cell count', 'total rbc', 'rbc'],
    defaultUnit: 'million/uL',
    category: 'cbc',
    expectedRange: { min: 2.0, max: 8.0 },
  },

  // 4. Hematocrit (PCV)
  {
    canonicalName: 'Hematocrit',
    aliases: ['hematocrit (pcv)', 'packed cell volume (pcv)', 'hematocrit', 'pcv', 'hct'],
    defaultUnit: '%',
    category: 'cbc',
    expectedRange: { min: 15.0, max: 65.0 },
  },

  // 5. MCV
  {
    canonicalName: 'MCV',
    aliases: ['mean corpuscular volume (mcv)', 'mean corpuscular volume', 'mcv'],
    defaultUnit: 'fL',
    category: 'cbc',
    expectedRange: { min: 50.0, max: 130.0 },
  },

  // 6. MCH
  {
    canonicalName: 'MCH',
    aliases: ['mean corpuscular hemoglobin (mch)', 'mean corpuscular hemoglobin', 'mch'],
    defaultUnit: 'pg',
    category: 'cbc',
    expectedRange: { min: 15.0, max: 45.0 },
  },

  // 7. MCHC
  {
    canonicalName: 'MCHC',
    aliases: ['mean corpuscular hemoglobin concentration (mchc)', 'mean corpuscular hemoglobin concentration', 'mchc'],
    defaultUnit: 'g/dL',
    category: 'cbc',
    expectedRange: { min: 20.0, max: 45.0 },
  },

  // 8. RDW-CV
  {
    canonicalName: 'RDW',
    aliases: ['rdw-cv', 'red cell distribution width (rdw)', 'red cell distribution width', 'rdw'],
    defaultUnit: '%',
    category: 'cbc',
    expectedRange: { min: 8.0, max: 30.0 },
  },

  // 9. Total WBC
  {
    canonicalName: 'WBC',
    aliases: ['total wbc count', 'total leucocyte count (tlc)', 'total leukocyte count', 'wbc count', 'total wbc', 'wbc', 'tlc'],
    defaultUnit: 'cells/uL',
    category: 'cbc',
    expectedRange: { min: 1000, max: 50000 },
  },

  // 10. Neutrophils
  {
    canonicalName: 'Neutrophils',
    aliases: ['neutrophils', 'neutrophil', 'polymorphs', 'segs'],
    defaultUnit: '%',
    category: 'cbc',
    expectedRange: { min: 10.0, max: 90.0 },
  },

  // 11. Lymphocytes
  {
    canonicalName: 'Lymphocytes',
    aliases: ['lymphocytes', 'lymphocyte', 'lymphs'],
    defaultUnit: '%',
    category: 'cbc',
    expectedRange: { min: 5.0, max: 80.0 },
  },

  // 12. Monocytes
  {
    canonicalName: 'Monocytes',
    aliases: ['monocytes', 'monocyte'],
    defaultUnit: '%',
    category: 'cbc',
    expectedRange: { min: 0.0, max: 25.0 },
  },

  // 13. Eosinophils
  {
    canonicalName: 'Eosinophils',
    aliases: ['eosinophils', 'eosinophil', 'eos'],
    defaultUnit: '%',
    category: 'cbc',
    expectedRange: { min: 0.0, max: 25.0 },
  },

  // 14. Basophils
  {
    canonicalName: 'Basophils',
    aliases: ['basophils', 'basophil', 'baso'],
    defaultUnit: '%',
    category: 'cbc',
    expectedRange: { min: 0.0, max: 10.0 },
  },

  // 15. Platelet Count
  {
    canonicalName: 'Platelets',
    aliases: ['platelet count', 'total platelet count', 'platelets', 'plt'],
    defaultUnit: 'lakh/uL',
    category: 'cbc',
    expectedRange: { min: 0.2, max: 15.0 },
  },

  // 16. Serum Iron
  {
    canonicalName: 'Serum Iron',
    aliases: ['serum iron', 'iron, serum', 'total iron', 'iron'],
    defaultUnit: 'ug/dL',
    category: 'general',
    expectedRange: { min: 10.0, max: 350.0 },
  },

  // 17. TIBC
  {
    canonicalName: 'TIBC',
    aliases: ['total iron binding capacity (tibc)', 'total iron binding capacity', 'tibc', 'tbc'],
    defaultUnit: 'ug/dL',
    category: 'general',
    expectedRange: { min: 100.0, max: 600.0 },
  },

  // 18. UIBC
  {
    canonicalName: 'UIBC',
    aliases: ['unsaturated iron binding capacity (uibc)', 'unsaturated iron binding capacity', 'uibc'],
    defaultUnit: 'ug/dL',
    category: 'general',
    expectedRange: { min: 50.0, max: 500.0 },
  },

  // 19. Transferrin Saturation
  {
    canonicalName: 'Transferrin Saturation',
    aliases: ['transferrin saturation', 'transferrin sat', 'transferrin'],
    defaultUnit: '%',
    category: 'general',
    expectedRange: { min: 3.0, max: 80.0 },
  },

  // 20. Ferritin
  {
    canonicalName: 'Ferritin',
    aliases: ['serum ferritin', 'ferritin, serum', 'ferritin'],
    defaultUnit: 'ng/mL',
    category: 'general',
    expectedRange: { min: 2.0, max: 1500.0 },
  },

  // 21. Vitamin B12
  {
    canonicalName: 'Vitamin B12',
    aliases: ['vitamin b12', 'vitamin b-12', 'b12', 'cyanocobalamin'],
    defaultUnit: 'pg/mL',
    category: 'general',
    expectedRange: { min: 50.0, max: 2500.0 },
  },

  // 22. Folate (Vitamin B9)
  {
    canonicalName: 'Folate',
    aliases: ['folate (serum)', 'serum folate', 'folic acid', 'folate'],
    defaultUnit: 'ng/mL',
    category: 'general',
    expectedRange: { min: 1.0, max: 30.0 },
  },

  // 23. Vitamin D
  {
    canonicalName: 'Vitamin D',
    aliases: ['vitamin d (25-oh)', '25-hydroxy vitamin d', 'vitamin d, 25-hydroxy', 'vitamin d', '25-oh vitamin d'],
    defaultUnit: 'ng/mL',
    category: 'general',
    expectedRange: { min: 3.0, max: 150.0 },
  },

  // 24. Fasting Blood Glucose
  {
    canonicalName: 'Fasting Glucose',
    aliases: ['fasting blood sugar (fbs)', 'fasting blood sugar', 'fasting blood glucose', 'blood sugar (fasting)', 'fbs'],
    defaultUnit: 'mg/dL',
    category: 'general',
    expectedRange: { min: 30.0, max: 500.0 },
  },

  // 25. General Blood Glucose
  {
    canonicalName: 'Blood Glucose',
    aliases: ['blood glucose', 'blood sugar', 'random blood sugar', 'glucose', 'rbs'],
    defaultUnit: 'mg/dL',
    category: 'general',
    expectedRange: { min: 30.0, max: 600.0 },
  },

  // 26. Serum Calcium
  {
    canonicalName: 'Calcium',
    aliases: ['serum calcium', 'calcium, serum', 'calcium, total', 'calcium'],
    defaultUnit: 'mg/dL',
    category: 'general',
    expectedRange: { min: 4.0, max: 16.0 },
  },

  // 27. TSH
  {
    canonicalName: 'TSH',
    aliases: ['thyroid stimulating hormone (tsh)', 'thyroid stimulating hormone', 'tsh, ultrasensitive', 'tsh'],
    defaultUnit: 'uIU/mL',
    category: 'general',
    expectedRange: { min: 0.01, max: 50.0 },
  },

  // 28. HbA1c
  {
    canonicalName: 'HbA1c',
    aliases: ['glycated hemoglobin (hba1c)', 'glycated hemoglobin', 'glycosylated hemoglobin', 'hba1c'],
    defaultUnit: '%',
    category: 'general',
    expectedRange: { min: 3.5, max: 20.0 },
  },

  // 29. Total Cholesterol
  {
    canonicalName: 'Total Cholesterol',
    aliases: ['total cholesterol', 'cholesterol, total', 'cholesterol'],
    defaultUnit: 'mg/dL',
    category: 'cardiology',
  },

  // 30. HDL Cholesterol
  {
    canonicalName: 'HDL',
    aliases: ['hdl cholesterol', 'hdl - cholesterol', 'hdl'],
    defaultUnit: 'mg/dL',
    category: 'cardiology',
  },

  // 31. LDL Cholesterol
  {
    canonicalName: 'LDL',
    aliases: ['ldl cholesterol', 'ldl - cholesterol', 'ldl'],
    defaultUnit: 'mg/dL',
    category: 'cardiology',
  },

  // 32. Triglycerides
  {
    canonicalName: 'Triglycerides',
    aliases: ['triglycerides', 'triglyceride'],
    defaultUnit: 'mg/dL',
    category: 'cardiology',
  },

  // 33. Serum Creatinine
  {
    canonicalName: 'Creatinine',
    aliases: ['serum creatinine', 'creatinine, serum', 'creatinine'],
    defaultUnit: 'mg/dL',
    category: 'general',
    expectedRange: { min: 0.2, max: 15.0 },
  },

  // 34. Urea / BUN
  {
    canonicalName: 'Urea',
    aliases: ['blood urea nitrogen', 'serum urea', 'bun', 'urea'],
    defaultUnit: 'mg/dL',
    category: 'general',
    expectedRange: { min: 3.0, max: 200.0 },
  },

  // 35. Total T3
  {
    canonicalName: 'Total T3',
    aliases: ['total triiodothyronine (t3)', 'triiodothyronine', 'total t3', 't3 total', 't3'],
    defaultUnit: 'ng/mL',
    category: 'general',
    expectedRange: { min: 0.1, max: 10.0 },
  },

  // 36. Total T4
  {
    canonicalName: 'Total T4',
    aliases: ['total thyroxine (t4)', 'thyroxine', 'total t4', 't4 total', 't4'],
    defaultUnit: 'ug/dL',
    category: 'general',
    expectedRange: { min: 0.5, max: 30.0 },
  },

  // 37. Bilirubin Total
  {
    canonicalName: 'Bilirubin Total',
    aliases: ['serum bilirubin total', 'bilirubin total', 'total bilirubin', 't. bilirubin', 'bilirubin'],
    defaultUnit: 'mg/dL',
    category: 'general',
    expectedRange: { min: 0.1, max: 25.0 },
  },

  // 38. SGPT / ALT
  {
    canonicalName: 'SGPT / ALT',
    aliases: ['sgpt / alt', 'sgpt (alt)', 'sgpt', 'alt', 'alanine aminotransferase'],
    defaultUnit: 'U/L',
    category: 'general',
    expectedRange: { min: 1.0, max: 500.0 },
  },

  // 39. SGOT / AST
  {
    canonicalName: 'SGOT / AST',
    aliases: ['sgot / ast', 'sgot (ast)', 'sgot', 'ast', 'aspartate aminotransferase'],
    defaultUnit: 'U/L',
    category: 'general',
    expectedRange: { min: 1.0, max: 500.0 },
  },
];

/**
 * Normalizes an extracted unit string, correcting common OCR typos without altering numeric values.
 */
export function normalizeUnitString(rawUnit?: string, fallbackUnit: string = '', canonicalName: string = ''): string {
  if (!rawUnit) return fallbackUnit;
  const clean = rawUnit.trim().toLowerCase().replace(/[.,;:]+$/, '');

  // Guard: If canonical metric is TIBC or UIBC or Serum Iron and unit was OCR'd as g/dl, normalize to ug/dL
  if (['TIBC', 'UIBC', 'Serum Iron'].includes(canonicalName) && clean === 'g/dl') {
    return 'ug/dL';
  }

  return UNIT_NORMALIZATION_MAP[clean] || rawUnit.trim();
}

/**
 * Extracts a laboratory reference range from the text of a single row.
 */
export function extractReferenceRangeFromLine(
  line: string,
  metricValue?: number
): { low: number; high: number; rawText?: string; unit?: string } | undefined {
  if (!line || typeof line !== 'string') return undefined;

  // 1. Bounded Interval (e.g., '12.0 - 15.0', '11.5-14', '0.02 - 0.5', '0.0-0.3', '46-116', '5.7–8.2', '4,000 - 11,000')
  const boundedRegex = /(?:reference|ref|normal|biological ref\.? range|desired|interval)?\s*[:=\(]?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\s*([a-zA-Z%\/^][a-zA-Z%\/^0-9\s]*)?\)?/gi;
  const boundedMatches = Array.from(line.matchAll(boundedRegex));
  for (const match of boundedMatches) {
    if (match[1] && match[2]) {
      const rawLowStr = match[1].replace(/,/g, '');
      const rawHighStr = match[2].replace(/,/g, '');
      const low = parseFloat(rawLowStr);
      const high = parseFloat(rawHighStr);

      if (!isNaN(low) && !isNaN(high) && low <= high) {
        if (metricValue !== undefined && Math.abs(low - metricValue) < 0.0001 && boundedMatches.length > 1) {
          continue;
        }

        return {
          low: Math.round(low * 100) / 100,
          high: Math.round(high * 100) / 100,
          rawText: match[0].trim(),
          unit: match[3]?.trim(),
        };
      }
    }
  }

  // 2. Unilateral Upper Limit (e.g., '< 34', '<= 35', '<38', '<34')
  const upperRegex = /(?:<|<=|less than)\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\s*([a-zA-Z%\/^][a-zA-Z%\/^0-9\s]*)?/gi;
  const upperMatch = upperRegex.exec(line);
  if (upperMatch && upperMatch[1]) {
    const high = parseFloat(upperMatch[1].replace(/,/g, ''));
    if (!isNaN(high)) {
      return {
        low: 0,
        high: Math.round(high * 100) / 100,
        rawText: upperMatch[0].trim(),
        unit: upperMatch[2]?.trim(),
      };
    }
  }

  // 3. Unilateral Lower Limit (e.g., '> 100', '>= 50')
  const lowerRegex = /(?:>|>=|greater than)\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\s*([a-zA-Z%\/^][a-zA-Z%\/^0-9\s]*)?/gi;
  const lowerMatch = lowerRegex.exec(line);
  if (lowerMatch && lowerMatch[1]) {
    const low = parseFloat(lowerMatch[1].replace(/,/g, ''));
    if (!isNaN(low)) {
      return {
        low: Math.round(low * 100) / 100,
        high: Infinity,
        rawText: lowerMatch[0].trim(),
        unit: lowerMatch[2]?.trim(),
      };
    }
  }

  return undefined;
}

/**
 * Checks if an extracted reference range is corrupted or missing decimals due to OCR artifacts.
 */
export function isCorruptedReferenceRange(
  canonicalName: string,
  refRange: { low: number; high: number; rawText?: string },
  unit: string
): boolean {
  if (!refRange) return false;

  // Hemoglobin in g/dL: standard is 12-17; OCR 0-15 or 120-150 is corrupted
  if (canonicalName === 'Hemoglobin' && (refRange.low === 0 || refRange.high > 30 || refRange.low > 25)) return true;

  // Folate in ng/mL: standard is 3.0-17.0; OCR 30-170 is corrupted
  if (canonicalName === 'Folate' && (refRange.high > 40 || refRange.low > 15)) return true;

  // Calcium in mg/dL: standard is 8.6-10.2; OCR 86-102 is corrupted
  if (canonicalName === 'Calcium' && (refRange.high > 25 || refRange.low > 20)) return true;

  // Platelets in lakh/uL: standard is 1.5-4.5; OCR 15-45 is corrupted
  if (canonicalName === 'Platelets' && (unit === 'lakh/uL' || unit === 'lacs/uL') && (refRange.high > 10 || refRange.low > 8)) return true;

  // TSH in uIU/mL: standard is 0.40-4.50; OCR 0.40-450 is corrupted
  if (canonicalName === 'TSH' && refRange.high > 50) return true;

  // Hematocrit in %: standard is 36-52; OCR 360-460 is corrupted
  if (canonicalName === 'Hematocrit' && refRange.high > 100) return true;

  // RDW in %: standard is 11.5-14.5; OCR 115-145 is corrupted
  if (canonicalName === 'RDW' && refRange.high > 50) return true;

  return false;
}

/**
 * Validates whether an extracted metric value is physiologically plausible or represents a likely OCR digit/decimal failure.
 */
export function validateMetricSanity(
  canonicalName: string,
  numericVal: number,
  unit: string,
  refRange?: { low: number; high: number },
  expectedRange?: { min: number; max: number },
  ocrStatus?: 'low' | 'normal' | 'high'
): { needsVerification: boolean; verificationReason?: string } {
  const genericReason = 'OCR result appears inconsistent with the expected physiological/reference-range pattern; verify against the original report.';

  // 1. Critical Disagreement: Value contradicts both reference range and OCR status
  if (refRange && typeof refRange.low === 'number' && typeof refRange.high === 'number') {
    if (numericVal >= refRange.low && numericVal <= refRange.high && ocrStatus && ocrStatus !== 'normal') {
      return {
        needsVerification: true,
        verificationReason: `Measured value ${numericVal} falls within reference range [${refRange.low} - ${refRange.high}], but OCR indicates ${ocrStatus}.`,
      };
    }
  }

  // 2. Hemoglobin decimal drop check (e.g. 1.2 g/dL instead of 11.2 or 120 g/dL instead of 12.0)
  if (canonicalName === 'Hemoglobin' && (numericVal < 3.0 || numericVal > 30)) {
    return {
      needsVerification: true,
      verificationReason: genericReason,
    };
  }

  // 3. Platelet count magnitude checks
  if (canonicalName === 'Platelets') {
    if ((unit === 'lakh/uL' || unit === 'lacs/uL') && (numericVal > 20 || numericVal < 0.1)) {
      return {
        needsVerification: true,
        verificationReason: genericReason,
      };
    }
    if ((unit === '10^3/µL' || unit === '10^3/uL' || unit === 'k/uL') && (numericVal > 1500 || numericVal < 10)) {
      return {
        needsVerification: true,
        verificationReason: genericReason,
      };
    }
  }

  // 4. WBC count magnitude checks
  if (canonicalName === 'WBC') {
    if ((unit === '10^3/µL' || unit === '10^3/uL' || unit === 'k/uL') && (numericVal > 100 || numericVal < 0.5)) {
      return {
        needsVerification: true,
        verificationReason: genericReason,
      };
    }
    if (unit === 'cells/uL' && (numericVal < 500 || numericVal > 100000)) {
      return {
        needsVerification: true,
        verificationReason: genericReason,
      };
    }
  }

  // 5. Fasting / Random Blood Sugar magnitude checks (e.g. 890 mg/dL or 8.9 mg/dL)
  if (['Fasting Glucose', 'Blood Glucose'].includes(canonicalName) && (numericVal < 20 || numericVal > 800)) {
    return {
      needsVerification: true,
      verificationReason: genericReason,
    };
  }

  // 6. Serum Calcium extreme multiplier check (e.g. 92 mg/dL vs 8.6-10.2 mg/dL)
  if (canonicalName === 'Calcium' && (numericVal > 20 || numericVal < 3.0)) {
    return {
      needsVerification: true,
      verificationReason: genericReason,
    };
  }

  // 7. Folate extreme multiplier check (e.g. 61 ng/mL vs 3.0-17.0 ng/mL)
  if (canonicalName === 'Folate' && numericVal > 30) {
    return {
      needsVerification: true,
      verificationReason: genericReason,
    };
  }

  // 8. Vitamin D extreme multiplier or contradiction check (e.g. 185 ng/mL while OCR says Low or > 150)
  if (canonicalName === 'Vitamin D' && (numericVal > 150 || (numericVal > 100 && ocrStatus === 'low'))) {
    return {
      needsVerification: true,
      verificationReason: genericReason,
    };
  }

  // 9. General expected physiological range boundary check
  if (expectedRange && !['WBC', 'Platelets'].includes(canonicalName)) {
    if (numericVal < expectedRange.min * 0.5 || numericVal > expectedRange.max * 1.5) {
      return {
        needsVerification: true,
        verificationReason: genericReason,
      };
    }
  }

  return { needsVerification: false };
}

/**
 * Determines whether a line contains administrative metadata rather than clinical measurement data.
 */
export function isAdministrativeOrMetadataLine(line: string): boolean {
  if (!line || typeof line !== 'string') return true;
  const clean = line.trim();
  if (clean.length < 2) return true;

  const adminPatterns = [
    /^(?:po\s*no\b|customer\s*name\b|patient\s*name\b|patient\s*id\b|lab\s*visit\s*id\b|barcode\s*id\b|order\s*id\b|sample\s*type\b|report\s*status\b|referred\s*by\b|collected\s*via\b)/i,
    /^(?:collection\s*date\b|sample\s*date\b|report\s*date\b|age\s*\/\s*gender\b|age\b|gender\b|dob\b|date\s*of\s*birth\b)/i,
    /^(?:page\s*\d+\s*of\s*\d+|test\s*(?:name|description)\b.*|bio\.\s*ref\.\s*interval.*|reference\s*interval\b.*|haematology|biochemistry|liver\s*function\s*test|complete\s*blood\s*count|differential\s*leucocyte\s*count|absolute\s*leucocyte\s*count)$/i,
    /^(?:tata\s*1mg|dr\s*lal|quest\s*diagnostics|labcorp|thyrocare|metropolis|apollo|srl\s*diagnostics|diagnostic\s*centre|laboratory)/i,
    /^(?:plot\s*no|vill\.|town\b|sahidnagar|dist\.|odisha|bhubaneswar|pin\s*code|delhi|gurgaon|mumbai|chennai|kolkata)/i,
    /^(?:dr\.\s+[a-z\s]+|mbbs|md\s*\(pathology\)|consultant\s*pathologist|reg\s*num\b|reg\s*no\b)/i,
    /^(?:registered\s*office|cin\s*:|iso\s*\d+|nabl\s*certificate|most\s*trusted\s*brand|satisfied\s*customers|labs\s*booked)/i,
    /^(?:disclaimer|end\s*of\s*report|as\s*per\s*the\s*recommendation|dhss\s*:|calculated\s*parameters\s*are\s*either|this\s*test\s*has\s*been\s*performed)/i,
    /^(?:comment:|comments:|note:|factors\s*that\s*interfere|adapted\s*from|interpretation:|please\s*note)/i,
    /^(?:rx\b|rx\s*:|tab\.?|cap\.?|syp\.?|inj\.?|ointment\b|gargle\b|drops\b|dosage\b|signature\b|advice\b|instructions\b|treatment\b)/i,
    /^(?:diagnosis\b|provisional\s*diagnosis|final\s*diagnosis|chief\s*complaints?|history\s*of\s*present|past\s*medical|clinical\s*history|course\s*in\s*hospital|condition\s*on\s*discharge|discharge\s*medications?|medical\s*fitness|sick\s*leave)/i,
    /\b(?:1\s*tab|2\s*tabs?|1-0-1|0-1-0|1-0-0|0-0-1|1-1-1|once\s*daily|twice\s*daily|thrice\s*daily|\s*od\b|\s*bd\b|\s*bid\b|\s*tid\b|\s*qid\b|\s*sos\b|after\s*food|before\s*food|at\s*bedtime|for\s*\d+\s*days|warm\s*fluids|voice\s*rest|bed\s*rest|resume\s*duties)\b/i,
    /^(?:tax\s*invoice|invoice\b|subtotal|sub\s*total|grand\s*total|total\s*amount|balance\s*due|amount\s*payable|gstin|cgst|sgst|igst|discount|item\s*description|unit\s*price|qty\b|quantity|payment\s*method|bill\s*to|ship\s*to)/i,
    /^(?:bank\s*statement|statement\s*of\s*account|account\s*number|ifsc\s*code|opening\s*balance|closing\s*balance|atm\s*withdrawal|cheque\s*no|deposit|transaction\s*id|restaurant|gratuity|table\s*no|server\s*:)/i,
    /^(?:[≤<>≥]\s*\d+(?:\.\d+)?|\d+(?:\.\d+)?\s*[-–—]\s*\d+(?:\.\d+)?)\s*(?:normal|at risk|diabetes|prediabetes|desirable|optimal|borderline|high|critical|acceptable|elevated)\b/i,
    /^(?:following\s*a\s*3-step|ensuring\s*accuracy|have\s*concerns|reach\s*out|care@|1800-)/i,
    /^(?:---+\s*page\s*\d+\s*---+)/i,
  ];

  return adminPatterns.some((pattern) => pattern.test(clean));
}

/**
 * Helper to extract laboratory testing method from tail text without polluting values, units, or reference ranges.
 */
export function extractMethodFromTail(tailStr: string): { method?: string; cleanTail: string } {
  if (!tailStr || typeof tailStr !== 'string') return { cleanTail: '' };

  const methodPatterns = [
    /\b(spectrophotometry\s*\([^)]*\)|spectrophotometry)\b/i,
    /\b(impedance\s*\/\s*microscopy|impedance|impedence)\b/i,
    /\b(dhss\s*\/\s*microscopy|dhss)\b/i,
    /\b(hplc\s*\([^)]*\)|hplc)\b/i,
    /\b(vanadate\s*oxidation)\b/i,
    /\b(biuret)\b/i,
    /\b(bcg\s*dye\s*binding|bcg)\b/i,
    /\b(modified\s*ifcc|ifcc\s*standardization|ifcc)\b/i,
    /\b(eclia|clia|elisa|turbidimetry|flow\s*cytometry)\b/i,
    /\b(calculated)\b/i,
    /\b(microscopy)\b/i,
  ];

  for (const pat of methodPatterns) {
    const match = tailStr.match(pat);
    if (match) {
      const method = match[0].trim();
      const cleanTail = tailStr.replace(match[0], '').trim();
      return { method, cleanTail };
    }
  }

  return { cleanTail: tailStr };
}

/**
 * Generic Clinical Row Parser (Document-First Discovery)
 * Parses [Parameter Name] [Numeric Value] [Unit?] [Reference Range?] [Status/Method?]
 * Preserves unknown biomarkers with document truth while canonicalizing recognized markers.
 */
export function parseGenericClinicalRow(
  line: string,
  tableName: string = 'general',
  nextLines?: string[]
): ExtractedMetric | null {
  if (!line || typeof line !== 'string') return null;
  const clean = line.trim();
  if (clean.length < 3 || isAdministrativeOrMetadataLine(clean)) return null;

  // First, test Blood Pressure custom parser
  if (/(?:blood\s*pressure|bp|b\.p\.)\s*[:=\-]?\s*\d{2,3}\s*[\/|\\]\s*\d{2,3}/i.test(clean)) {
    return parseBloodPressureLine(clean);
  }

  const tryParseCandidate = (rowText: string): ExtractedMetric | null => {
    // Find all candidate numeric values that could represent the test result
    const numberRegex = /(?:^|\s+)([><≤≥]?\s*(?:\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?))(?:\s+|$)/g;
    const matches = Array.from(rowText.matchAll(numberRegex));
    if (matches.length === 0) return null;

    interface ScoredCandidate {
      metric: ExtractedMetric;
      score: number;
    }
    const scoredCandidates: ScoredCandidate[] = [];

    for (const match of matches) {
      if (match.index === undefined) continue;
      const numMatchStr = match[1];
      const offset = match[0].indexOf(numMatchStr);
      const valStartIndex = match.index + offset;
      const valEndIndex = valStartIndex + numMatchStr.length;

      let paramNameCandidate = rowText.slice(0, valStartIndex).trim();
      const remainder = rowText.slice(valEndIndex).trim();

      // Clean raw parameter name (strip bullets, leading digits, trailing colons)
      paramNameCandidate = paramNameCandidate.replace(/^[\d\.\-\*\•\s]+/, '').replace(/[:=\-—]+$/, '').trim();

      // Guard: Parameter name must be valid and not truncated inside hyphenated/slashed terms
      if (paramNameCandidate.length < 2) continue;
      if (/[-/]$/.test(paramNameCandidate)) continue;
      if (isAdministrativeOrMetadataLine(paramNameCandidate)) continue;
      if (/^(?:page|date|sample|result|method|unit|status|interval|range|comment|interpretation|dr|mr|mrs|ms|po|barcode)$/i.test(paramNameCandidate)) {
        continue;
      }

      // Check against Canonical Medical Vocabulary & Dictionary
      const canonicalMatch = matchCanonicalParameter(paramNameCandidate);
      const defMatch = METRIC_DICTIONARY.find(d => 
        d.aliases.some(a => a.toLowerCase() === paramNameCandidate.toLowerCase()) ||
        (canonicalMatch && d.canonicalName === canonicalMatch.canonicalName)
      );

      // Sentence & Conversational Preposition / Verb Guard for non-canonical candidates
      if (!canonicalMatch && !defMatch) {
        if (/^(?:a|an|the|every|within|approx|approximately|about|between|following|recommended|suggested|adapted|note|dhss|comment|comments|interpretation|which|who|that|patient|was|showed|revealed|had|underwent|with|managed)\b/i.test(paramNameCandidate)) {
          continue;
        }
        if (/\b(?:to|of|for|in|at|by|with|from|and|or|the|a|an|is|are|was|were|be|been|have|has|had|every|per|monthly|daily|weekly|yearly|hours|days|months|years|interval|testing|guideline|recommendation|system|measure|measurement)\b$/i.test(paramNameCandidate)) {
          continue;
        }
        if (/\b(?:recommended|suggested|interval|testing|guideline|adapted|according|standardization|sequential|performed|concern|reach|contact|flowcytometry|flowcytometric|showed|revealed|underwent|managed|admitted|complaints|history|stenosis|artery|infarction|diagnosed|treatment|prescribed|advised)\b/i.test(paramNameCandidate)) {
          continue;
        }
        // Lab parameter names are noun phrases, typically under 5 words without full sentence structure
        if (paramNameCandidate.split(/\s+/).length > 5 || /[.;?!]/.test(paramNameCandidate)) {
          continue;
        }
      }

      // Parse numeric value
      const cleanValStr = numMatchStr.replace(/,/g, '').replace(/[><≤≥\s]/g, '');
      const numericVal = parseFloat(cleanValStr);
      if (isNaN(numericVal)) continue;

      // Extract unit from remainder
      const unitRegex = /^((?:10\^|10\*)[0-9a-zA-Zµ\.\/]+|f\s*l|[a-zA-Z%µ\/][a-zA-Z0-9%µ\/\^.\-]*)\b/i;
      const unitMatch = remainder.match(unitRegex);
      const rawUnitStr = unitMatch ? unitMatch[1].trim() : '';

      // Guard against invalid conversational units
      if (/^(?:to|of|for|in|monthly|daily|weekly|yearly|hours|days|months|years|times|interval|testing|calculated|impedance|spectrophotometry)$/i.test(rawUnitStr)) {
        continue;
      }

      const tailStr = unitMatch ? remainder.slice(unitMatch[0].length).trim() : remainder;

      // Extract testing method from tail
      const { method, cleanTail } = extractMethodFromTail(tailStr);

      // Extract reference range from remainder
      const refRange = extractReferenceRangeFromLine(remainder, numericVal);

      // Extract status token from tail
      let ocrStatus: 'low' | 'normal' | 'high' | 'low-normal' | 'high-normal' | undefined = undefined;
      if (/\blow[- ]normal\b/i.test(cleanTail)) ocrStatus = 'low-normal';
      else if (/\bhigh[- ]normal\b/i.test(cleanTail)) ocrStatus = 'high-normal';
      else if (/\bnormal\b/i.test(cleanTail)) ocrStatus = 'normal';
      else if (/\bhigh\b/i.test(cleanTail)) ocrStatus = 'high';
      else if (/\blow\b/i.test(cleanTail)) ocrStatus = 'low';

      let score = 0;
      if (canonicalMatch || defMatch) {
        score += 100;
      }
      if (rawUnitStr && (UNIT_NORMALIZATION_MAP[rawUnitStr.toLowerCase()] || normalizeUnit(rawUnitStr))) {
        score += 30;
      }
      if (refRange) {
        score += 40;
      }
      if (ocrStatus) {
        score += 20;
      }
      if (method) {
        score += 15;
      }

      if (canonicalMatch || defMatch) {
        const canonicalName = defMatch ? defMatch.canonicalName : canonicalMatch!.canonicalName;
        const defaultUnit = defMatch ? defMatch.defaultUnit : canonicalMatch!.defaultUnit;
        const expectedRange = defMatch ? defMatch.expectedRange : { min: canonicalMatch!.expectedMin, max: canonicalMatch!.expectedMax };

        const normalizedUnit = normalizeUnitString(rawUnitStr, defaultUnit, canonicalName);

        let refRangeCorrupted = false;
        let finalRefRange = refRange;
        if (finalRefRange && isCorruptedReferenceRange(canonicalName, finalRefRange, normalizedUnit)) {
          refRangeCorrupted = true;
          finalRefRange = undefined;
        }

        const sanity = validateMetricSanity(
          canonicalName,
          numericVal,
          normalizedUnit,
          finalRefRange,
          expectedRange,
          ocrStatus === 'low-normal' || ocrStatus === 'high-normal' ? 'normal' : ocrStatus
        );

        let verificationReason = sanity.verificationReason;
        if (refRangeCorrupted && !verificationReason) {
          verificationReason = 'OCR result appears inconsistent with the expected physiological/reference-range pattern; verify against the original report.';
        }

        const hasDocumentRange = finalRefRange && typeof finalRefRange.low === 'number' && typeof finalRefRange.high === 'number';

        let calculatedStatus: 'low' | 'normal' | 'high' | 'unknown' | 'low-normal' | 'high-normal' = 'unknown';
        if (sanity.needsVerification || refRangeCorrupted) {
          calculatedStatus = 'unknown';
        } else if (hasDocumentRange) {
          if (numericVal < finalRefRange.low!) calculatedStatus = 'low';
          else if (numericVal > finalRefRange.high!) calculatedStatus = 'high';
          else if (numericVal === finalRefRange.low && (ocrStatus === 'low-normal' || /\blow[- ]normal\b/i.test(cleanTail))) calculatedStatus = 'low-normal';
          else if (numericVal === finalRefRange.high && (ocrStatus === 'high-normal' || /\bhigh[- ]normal\b/i.test(cleanTail))) calculatedStatus = 'high-normal';
          else calculatedStatus = ocrStatus === 'low-normal' ? 'low-normal' : (ocrStatus === 'high-normal' ? 'high-normal' : 'normal');
        } else if (ocrStatus) {
          calculatedStatus = ocrStatus;
        } else {
          calculatedStatus = 'unknown';
        }

        const needsVerification = sanity.needsVerification || refRangeCorrupted || (!hasDocumentRange && !ocrStatus);
        if (!hasDocumentRange && !ocrStatus && !verificationReason) {
          verificationReason = 'No reference interval provided in document - verify against original report.';
        }

        scoredCandidates.push({
          score,
          metric: {
            name: canonicalName,
            rawName: paramNameCandidate,
            value: numericVal,
            unit: normalizedUnit,
            displayValue: `${numericVal} ${normalizedUnit}`,
            referenceRange: finalRefRange ? { ...finalRefRange, source: finalRefRange.rawText ? 'ocr' : 'normalized_ocr' } : undefined,
            referenceRangeSource: finalRefRange ? (finalRefRange.rawText ? 'ocr' : 'normalized_ocr') : 'missing',
            status: calculatedStatus,
            ocrStatus,
            method,
            needsVerification,
            verificationReason,
          },
        });
      } else {
        // UNRECOGNIZED BIOMARKER — 100% PRESERVE DOCUMENT TRUTH FOR USER VERIFICATION
        const cleanUnit = rawUnitStr ? rawUnitStr.trim().toLowerCase().replace(/^[(\[]|[)\]]$/g, '') : '';
        const normalizedUnit = CANONICAL_UNIT_MAP[cleanUnit] || UNIT_NORMALIZATION_MAP[cleanUnit];
        
        // Non-canonical biomarker candidates MUST have a valid recognized clinical unit OR an explicit reference range OR an explicit clinical status
        if (!normalizedUnit && !refRange && !ocrStatus) continue;

        let calculatedStatus: 'low' | 'normal' | 'high' | 'unknown' | 'low-normal' | 'high-normal' = 'unknown';
        if (refRange && typeof refRange.low === 'number' && typeof refRange.high === 'number') {
          if (numericVal < refRange.low) calculatedStatus = 'low';
          else if (numericVal > refRange.high) calculatedStatus = 'high';
          else calculatedStatus = ocrStatus || 'normal';
        } else if (ocrStatus) {
          calculatedStatus = ocrStatus;
        }

        const finalUnit = normalizedUnit || rawUnitStr || '';

        scoredCandidates.push({
          score,
          metric: {
            name: paramNameCandidate,
            rawName: paramNameCandidate,
            value: numericVal,
            unit: finalUnit,
            displayValue: finalUnit ? `${numericVal} ${finalUnit}` : `${numericVal}`,
            referenceRange: refRange ? { ...refRange, source: 'ocr' } : undefined,
            referenceRangeSource: refRange ? 'ocr' : 'missing',
            status: calculatedStatus,
            ocrStatus,
            method,
            needsVerification: true,
            verificationReason: 'Unrecognized biomarker - please verify parameter name and value against your report.',
          },
        });
      }
    }

    if (scoredCandidates.length === 0) return null;
    scoredCandidates.sort((a, b) => b.score - a.score);
    return scoredCandidates[0].metric;
  };

  // Try single line
  const singleParsed = tryParseCandidate(clean);
  if (singleParsed) return singleParsed;

  // Try combined with next line
  if (nextLines && nextLines.length > 0) {
    const nextLine = nextLines[0].trim();
    if (!isAdministrativeOrMetadataLine(nextLine)) {
      const combined = `${clean} ${nextLine}`;
      return tryParseCandidate(combined);
    }
  }

  return null;
}

/**
 * Parses a single lab report row following the structured clinical model:
 * PARAMETER -> RESULT -> UNIT -> REFERENCE RANGE -> STATUS
 */
export function parseLabReportLine(
  line: string,
  def: MetricDefinition,
  tableName: string = 'general'
): ExtractedMetric | null {
  if (!line || typeof line !== 'string') return null;

  // 1. Check custom parser if defined (e.g. Blood Pressure)
  if (def.customParser) {
    return def.customParser(line);
  }

  // 2. Find best alias match in the line
  let matchedAlias: string | null = null;
  let aliasEndIndex = -1;

  for (const alias of def.aliases) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const aliasRegex = new RegExp(`(?:^|[\\s_(\\[,.-])${escaped}(?:[\\s_:=—–\\].,-]|$|(?=\\d))`, 'i');
    const match = line.match(aliasRegex);
    if (match && match.index !== undefined) {
      matchedAlias = alias;
      aliasEndIndex = match.index + match[0].length;
      break;
    }
  }

  if (!matchedAlias || aliasEndIndex < 0) return null;

  // Guard against generic Blood Glucose matching Fasting lines
  if (def.canonicalName === 'Blood Glucose' && /\bfasting\b/i.test(line)) {
    return null;
  }

  // Guard against generic Hemoglobin matching Glycated / Glycosylated Hemoglobin (HbA1c) lines
  if (def.canonicalName === 'Hemoglobin' && /\b(glycated|glycosylated|hba1c|a1c)\b/i.test(line)) {
    return null;
  }

  // Guard against generic Hemoglobin matching Mean Corpuscular Hemoglobin (MCH / MCHC) lines
  if (def.canonicalName === 'Hemoglobin' && /\b(mean\s+corpuscular|mch|mchc)\b/i.test(line)) {
    return null;
  }

  // Guard against MCH matching MCHC lines
  if (def.canonicalName === 'MCH' && /\bmchc\b/i.test(line)) {
    return null;
  }

  // 3. Text section following the parameter name on the SAME visual row
  let lineRemainder = line.slice(aliasEndIndex).trim();
  if (!lineRemainder) return null;

  // Strip leading parenthetical test description or method, e.g. "(Glucose)", "(Cyanocobalamin)", "(Calculated)", "(BUN)", "(25-OH Total)"
  lineRemainder = lineRemainder.replace(/^\s*\([^)]*\)\s*/, '');

  // 4. Extract Observed Result & Unit
  const valueUnitRegex = /^[:=\-]?\s*([><]?\s*(?:\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?))\s*((?:10\^|10\*)[0-9a-zA-Zµ\.\/]+|[a-zA-Z%\/^][a-zA-Z%\/^\^0-9.]*)?/i;
  const valMatch = lineRemainder.match(valueUnitRegex);

  if (!valMatch || !valMatch[1]) return null;

  const rawNumStr = valMatch[1].replace(/,/g, '').replace(/[><\s]/g, '');
  const numericVal = parseFloat(rawNumStr);
  if (isNaN(numericVal)) return null;

  // 5. Unit Normalization (without altering numeric values)
  const rawUnitCandidate = valMatch[2] ? valMatch[2].trim() : '';
  const normalizedUnit = normalizeUnitString(rawUnitCandidate, def.defaultUnit, def.canonicalName);

  // 6. Extract Reference Range from remainder of the SAME visual row
  let refRange = extractReferenceRangeFromLine(lineRemainder, numericVal);
  let refRangeCorrupted = false;

  if (refRange && isCorruptedReferenceRange(def.canonicalName, refRange, normalizedUnit)) {
    refRangeCorrupted = true;
    refRange = undefined; // Reject corrupted OCR reference range
  }

  // 7. Extract Printed OCR Status from the SAME visual row
  let ocrStatus: 'low' | 'normal' | 'high' | 'low-normal' | 'high-normal' | undefined = undefined;
  if (/\blow[- ]normal\b/i.test(lineRemainder)) {
    ocrStatus = 'low-normal';
  } else if (/\bhigh[- ]normal\b/i.test(lineRemainder)) {
    ocrStatus = 'high-normal';
  } else if (/\bnormal\b/i.test(lineRemainder)) {
    ocrStatus = 'normal';
  } else if (/\bhigh\b/i.test(lineRemainder)) {
    ocrStatus = 'high';
  } else if (/\blow\b/i.test(lineRemainder)) {
    ocrStatus = 'low';
  }

  // 8. Quality & Sanity Validation
  const sanity = validateMetricSanity(
    def.canonicalName,
    numericVal,
    normalizedUnit,
    refRange,
    def.expectedRange,
    ocrStatus === 'low-normal' ? 'normal' : ocrStatus === 'high-normal' ? 'normal' : ocrStatus
  );

  let verificationReason = sanity.verificationReason;
  if (refRangeCorrupted && !verificationReason) {
    verificationReason = 'OCR result appears inconsistent with the expected physiological/reference-range pattern; verify against the original report.';
  }

  const needsVerification = sanity.needsVerification || refRangeCorrupted;

  // 9. Calculated Status Derivation (Do NOT trust OCR status when contradictory or suspicious)
  let calculatedStatus: 'low' | 'normal' | 'high' | 'unknown' | 'low-normal' | 'high-normal' = 'unknown';
  if (needsVerification) {
    calculatedStatus = 'unknown'; // Never label corrupted OCR values as normal/low/high
  } else if (refRange && typeof refRange.low === 'number' && typeof refRange.high === 'number') {
    if (numericVal < refRange.low) {
      calculatedStatus = 'low';
    } else if (numericVal > refRange.high) {
      calculatedStatus = 'high';
    } else if (numericVal === refRange.low && (ocrStatus === 'low-normal' || /\blow[- ]normal\b/i.test(lineRemainder))) {
      calculatedStatus = 'low-normal';
    } else if (numericVal === refRange.high && (ocrStatus === 'high-normal' || /\bhigh[- ]normal\b/i.test(lineRemainder))) {
      calculatedStatus = 'high-normal';
    } else {
      calculatedStatus = ocrStatus === 'low-normal' ? 'low-normal' : (ocrStatus === 'high-normal' ? 'high-normal' : 'normal');
    }
  } else if (ocrStatus) {
    calculatedStatus = ocrStatus;
  }

  // Debug Logging per row as requested
  if (process.env.NODE_ENV !== 'production' || typeof window !== 'undefined') {
    const tokens = line.split(/\s+/).map((tok) => ({
      text: tok,
      confidence: 100,
      x0: 0,
      y0: 0,
      x1: 0,
      y1: 0,
    }));

    console.log(`===== OCR TABLE ROW =====
table: ${tableName}
rowY: N/A
parameter: ${def.canonicalName}
rawRowText: ${line}

WORD TOKENS:
${JSON.stringify(tokens, null, 2)}

RESULT: ${numericVal}
UNIT: ${normalizedUnit}
REFERENCE: ${refRange ? `${refRange.low} - ${refRange.high}` : 'undefined'}
OCR STATUS: ${ocrStatus || 'none'}
==========================`);
  }

  return {
    name: def.canonicalName,
    rawName: matchedAlias,
    value: numericVal,
    unit: normalizedUnit,
    displayValue: `${numericVal} ${normalizedUnit}`,
    referenceRange: refRange ? { ...refRange, source: refRange.rawText ? 'ocr' : 'normalized_ocr' } : undefined,
    referenceRangeSource: refRange ? (refRange.rawText ? 'ocr' : 'normalized_ocr') : 'missing',
    status: calculatedStatus,
    ocrStatus,
    needsVerification,
    verificationReason,
  };
}

/**
 * Parses Blood Pressure string (e.g., "120/80 mmHg", "BP: 130 / 85")
 */
function parseBloodPressureLine(line: string): ExtractedMetric | null {
  const bpRegex = /(?:blood\s*pressure|bp|b\.p\.)\s*[:=\-]?\s*(\d{2,3})\s*[\/|\\]\s*(\d{2,3})\s*(mm\s*hg|mmhg)?/i;
  const match = line.match(bpRegex);
  if (!match) return null;

  const systolic = parseInt(match[1], 10);
  const diastolic = parseInt(match[2], 10);
  if (isNaN(systolic) || isNaN(diastolic)) return null;

  let status: 'low' | 'normal' | 'high' | 'unknown' = 'unknown';
  if (systolic < 90 || diastolic < 60) {
    status = 'low';
  } else if (systolic <= 120 && diastolic <= 80) {
    status = 'normal';
  } else if (systolic > 120 || diastolic > 80) {
    status = 'high';
  }

  return {
    name: 'Blood Pressure',
    rawName: match[0],
    value: `${systolic}/${diastolic}`,
    unit: 'mmHg',
    displayValue: `${systolic}/${diastolic} mmHg`,
    status,
    systolic,
    diastolic,
    referenceRange: {
      low: 90,
      high: 120,
      rawText: '90/60 - 120/80 mmHg',
      unit: 'mmHg',
      source: 'ocr',
    },
    referenceRangeSource: 'ocr',
    needsVerification: false,
  };
}

/**
 * Splits document text into distinct table sections (CBC, Iron, Vitamins, Biochemistry)
 * to prevent side-by-side table interference.
 */
export function segmentDocumentSections(ocrText: string): { name: string; lines: string[] }[] {
  const lines = ocrText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const sections: { name: string; lines: string[] }[] = [];
  let currentSection = { name: 'CBC Table', lines: [] as string[] };

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (lower.includes('iron studies') || lower.includes('iron profile')) {
      if (currentSection.lines.length > 0) sections.push(currentSection);
      currentSection = { name: 'Iron Studies', lines: [] };
      continue;
    } else if (lower.includes('vitamin') && (lower.includes('vitamins') || lower.includes('vitamins &') || lower.includes('profile') || lower.includes('studies'))) {
      if (currentSection.lines.length > 0) sections.push(currentSection);
      currentSection = { name: 'Vitamins', lines: [] };
      continue;
    } else if (lower.includes('biochemistry') || lower.includes('other biochemistry') || lower.includes('metabolic panel') || lower.includes('liver function test')) {
      if (currentSection.lines.length > 0) sections.push(currentSection);
      currentSection = { name: 'Biochemistry / LFT', lines: [] };
      continue;
    } else if (lower.includes('complete blood count') || lower.includes('cbc') || lower.includes('hematology') || lower.includes('haematology')) {
      if (currentSection.lines.length > 0) sections.push(currentSection);
      currentSection = { name: 'CBC Table', lines: [] };
      continue;
    }

    currentSection.lines.push(line);
  }

  if (currentSection.lines.length > 0) {
    sections.push(currentSection);
  }

  return sections.length > 0 ? sections : [{ name: 'CBC Table', lines }];
}

/**
 * Extracts all health data, clinical measurements, and metadata from raw OCR or PDF text
 * using Document-First Discovery and Row-Aware Spatial Extraction.
 * 
 * Extracts whatever valid clinical measurements are actually present in the document.
 */
export function extractHealthData(
  ocrText: string,
  options?: { source?: 'pdf-text' | 'ocr' }
): ExtractedHealthData {
  const source = options?.source || 'ocr';

  if (!ocrText || typeof ocrText !== 'string') {
    return {
      metrics: [],
      results: {},
      summary: 'No readable text content provided.',
      reportType: 'general',
      source,
    };
  }

  const sections = segmentDocumentSections(ocrText);
  const extractedMetrics: ExtractedMetric[] = [];
  const extractedResultsMap: Record<string, string> = {};
  const processedKeys = new Set<string>();

  // Document-First discovery across all document sections and lines
  for (const sec of sections) {
    for (let i = 0; i < sec.lines.length; i++) {
      const line = sec.lines[i];
      if (isAdministrativeOrMetadataLine(line)) continue;

      const nextLines = sec.lines.slice(i + 1, Math.min(sec.lines.length, i + 4));

      // 1. Primary: Document-First Generic Clinical Row Parser
      let parsedMetric: ExtractedMetric | null = parseGenericClinicalRow(line, sec.name, nextLines);

      // 2. Secondary fallback: Dictionary lookahead for legacy wrapped rows
      if (!parsedMetric) {
        for (const def of METRIC_DICTIONARY) {
          if (processedKeys.has(def.canonicalName.toLowerCase())) continue;
          const matched = parseLabReportLine(line, def, sec.name);
          if (matched) {
            parsedMetric = matched;
            break;
          } else if (i + 1 < sec.lines.length) {
            const hasAlias = def.aliases.some((alias) => {
              const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              return new RegExp(`(?:^|[\\s_(\\[,.-])${escaped}(?:[\\s_:=—–\\].,-]|$|(?=\\d))`, 'i').test(line);
            });
            if (hasAlias) {
              const combined = [line];
              for (let j = i + 1; j < Math.min(sec.lines.length, i + 4); j++) {
                combined.push(sec.lines[j]);
                const testCombined = combined.join(' ');
                const multiParsed = parseLabReportLine(testCombined, def, sec.name);
                if (multiParsed) {
                  parsedMetric = multiParsed;
                  break;
                }
              }
            }
            if (parsedMetric) break;
          }
        }
      }

      if (parsedMetric) {
        const dedupeKey = parsedMetric.name.toLowerCase().trim();
        if (!processedKeys.has(dedupeKey)) {
          parsedMetric.source = source;
          extractedMetrics.push(parsedMetric);
          extractedResultsMap[parsedMetric.name] = parsedMetric.displayValue;
          processedKeys.add(dedupeKey);
        }
      }
    }
  }

  // Determine Report Category and Title dynamically from what was discovered
  const hasCbc = extractedMetrics.some((m) =>
    ['Hemoglobin', 'WBC', 'Platelets', 'Total RBC', 'Hematocrit', 'MCV', 'MPV', 'RDW'].includes(m.name)
  );
  const hasLipid = extractedMetrics.some((m) =>
    ['Total Cholesterol', 'HDL', 'LDL', 'Triglycerides'].includes(m.name)
  );
  const hasIron = extractedMetrics.some((m) =>
    ['Serum Iron', 'TIBC', 'UIBC', 'Transferrin Saturation', 'Ferritin'].includes(m.name)
  );
  const hasVitamins = extractedMetrics.some((m) =>
    ['Vitamin D', 'Vitamin B12', 'Folate'].includes(m.name)
  );
  const hasHepatic = extractedMetrics.some((m) =>
    ['Bilirubin Total', 'Bilirubin Direct', 'Bilirubin Indirect', 'SGPT / ALT', 'SGOT / AST', 'Alkaline Phosphatase', 'Total Protein', 'Albumin', 'Globulin', 'GGT'].includes(m.name)
  );
  const hasHbA1c = extractedMetrics.some((m) => m.name === 'HbA1c' || m.name === 'Estimated Average Glucose');

  let reportType: ExtractedHealthData['reportType'] = 'general';
  let title = 'General Health Report';

  if (hasCbc && (hasHepatic || hasIron || hasVitamins || hasLipid || hasHbA1c || extractedMetrics.length >= 6)) {
    reportType = 'cbc';
    title = 'Comprehensive Multi-Panel Health Report';
  } else if (hasCbc) {
    reportType = 'cbc';
    title = 'Complete Blood Count (CBC)';
  } else if (hasHepatic) {
    reportType = 'general';
    title = 'Liver Function Test (LFT)';
  } else if (hasLipid) {
    reportType = 'cardiology';
    title = 'Comprehensive Metabolic & Lipid Panel';
  } else if (hasHbA1c) {
    reportType = 'general';
    title = 'Glycemic Control & HbA1c Report';
  } else if (extractedMetrics.length === 1 && extractedMetrics[0].name === 'TSH') {
    reportType = 'general';
    title = 'Thyroid Function Panel (TSH)';
  }

  // Extract Date if present
  const extractedDate = extractReportDateFromText(ocrText);

  // Build human-readable summary
  const summary = extractedMetrics.length > 0
    ? `Extracted ${extractedMetrics.length} clinical measurement(s) from document: ${extractedMetrics.map((m) => m.displayValue).join(', ')}.`
    : 'No quantitative clinical metrics detected in document.';

  return {
    title,
    reportType,
    metrics: extractedMetrics,
    results: extractedResultsMap,
    summary,
    extractedDate,
    source,
  };
}

/**
 * Extracts a clinical collection or reporting date from OCR text and normalizes to YYYY-MM-DD.
 */
export function extractReportDateFromText(text: string): string | undefined {
  if (!text || typeof text !== 'string') return undefined;

  const patterns = [
    /(?:date\s*of\s*collection|collection\s*date|sample\s*date|reported\s*date|report\s*date|date)[:=\s]*(\d{4})[-/\.](\d{1,2})[-/\.](\d{1,2})/i,
    /(?:date\s*of\s*collection|collection\s*date|sample\s*date|reported\s*date|report\s*date|date)[:=\s]*(\d{1,2})[-/\.]([a-zA-Z]{3}|\d{1,2})[-/\.](\d{2,4})/i,
    /(?:date)[:=\s]*(\d{1,2})[-/\.]([a-zA-Z]{3}|\d{1,2})[-/\.](\d{2,4})/i,
    /\b(\d{4})[-/\.](\d{1,2})[-/\.](\d{1,2})\b/,
    /\b(\d{1,2})[-/\.]([a-zA-Z]{3}|\d{1,2})[-/\.](\d{4})\b/,
  ];

  const monthNames: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };

  for (const regex of patterns) {
    const match = text.match(regex);
    if (!match || match.length < 4) continue;

    let year = '';
    let month = '';
    let day = '';

    if (match[1].length === 4) {
      // YYYY-MM-DD format
      year = match[1];
      month = match[2].toLowerCase();
      day = match[3];
    } else {
      // DD-MM-YYYY format
      day = match[1];
      month = match[2].toLowerCase();
      year = match[3];
    }

    if (year.length === 2) {
      year = `20${year}`;
    }

    if (monthNames[month.slice(0, 3)]) {
      month = monthNames[month.slice(0, 3)];
    } else if (/^\d{1,2}$/.test(month)) {
      month = month.padStart(2, '0');
    } else {
      continue;
    }

    day = day.padStart(2, '0');
    const isoCandidate = `${year}-${month}-${day}`;
    if (!isNaN(Date.parse(isoCandidate))) {
      return isoCandidate;
    }
  }

  return undefined;
}

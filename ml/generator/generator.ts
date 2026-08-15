/**
 * Synthetic Health Report Generator
 * Vital Diaries — Phase 2: Dataset Creation
 *
 * Generates one GroundTruthReport per call.
 * Call from the dataset build script (scripts/generate-dataset.ts).
 *
 * Design decisions:
 *  - Fully deterministic given a seed (reproducible)
 *  - Does NOT import anything from src/ (decoupled from production)
 *  - Does NOT write to IndexedDB
 *  - Does NOT call any API or LLM
 *  - Ground truth is built from clean values BEFORE noise injection
 */

import type {
  GroundTruthReport,
  GroundTruthMetric,
  SyntheticReportMetadata,
  LayoutTemplate,
  NoiseLevel,
} from '../schemas/dataset.types';

import { METRIC_SPECS } from './metric-specs';
import {
  TEMPLATE_REGISTRY,
  ALL_TEMPLATES,
  pickRandomTemplate,
  REPORT_HEADERS,
  REPORT_FOOTERS,
} from '../templates/layout-templates';
import { NOISE_PRESETS, injectNoise } from '../noise/noise-engine';

// ─────────────────────────────────────────────────────────────────────────────
// SEEDED PRNG (Mulberry32) — same implementation as noise-engine.ts
// Re-defined here so generator.ts has no import-cycle risk.
// ─────────────────────────────────────────────────────────────────────────────

function mulberry32(seed: number): () => number {
  let s = seed;
  return function () {
    s |= 0;
    s = s + 0x6d2b79f5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function randInt(rand: () => number, min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function randFloat(rand: () => number, min: number, max: number, precision: number): number {
  const raw = rand() * (max - min) + min;
  return parseFloat(raw.toFixed(precision));
}

function pick<T>(rand: () => number, arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORT TYPE INFERENCE
// Mirrors the logic in health-extractor.ts (extractHealthData).
// ─────────────────────────────────────────────────────────────────────────────

function inferReportType(
  canonicalNames: string[]
): SyntheticReportMetadata['report_type'] {
  const cbcCount = canonicalNames.filter((n) =>
    ['Hemoglobin', 'WBC', 'Platelets'].includes(n)
  ).length;
  const lipidCount = canonicalNames.filter((n) =>
    ['Total Cholesterol', 'HDL', 'LDL', 'Triglycerides'].includes(n)
  ).length;
  const hasCardio = canonicalNames.includes('Blood Pressure');
  const hasTSH = canonicalNames.includes('TSH');
  const hasGlucose = canonicalNames.some((n) =>
    ['Fasting Glucose', 'Blood Glucose', 'HbA1c'].includes(n)
  );

  if (cbcCount >= 2) return 'cbc';
  if (lipidCount >= 2 || (hasCardio && lipidCount >= 1)) return 'cardiology';
  if (hasTSH) return 'general';
  if (hasGlucose) return 'general';
  return 'general';
}

function inferTitle(canonicalNames: string[], reportType: string): string {
  if (reportType === 'cbc') return 'Complete Blood Count (CBC) Panel';
  if (reportType === 'cardiology') {
    if (canonicalNames.includes('Blood Pressure')) return 'Cardiovascular Metrics Report';
    return 'Lipid Profile & Cholesterol Panel';
  }
  if (canonicalNames.includes('TSH')) return 'Thyroid Function Test (TFT)';
  if (canonicalNames.some((n) => ['Fasting Glucose', 'HbA1c'].includes(n))) {
    return 'Blood Glucose & Glycemic Report';
  }
  return 'General Health Report';
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

export interface GeneratorOptions {
  /** How many metrics to include (randomly chosen from the spec list). */
  metrics_count?: { min: number; max: number };
  /** Template to use (or 'mixed'). Defaults to random selection. */
  template?: LayoutTemplate;
  /** Noise level. Defaults to random selection across none/low/medium/high. */
  noise_level?: NoiseLevel;
}

const DEFAULT_OPTIONS: Required<GeneratorOptions> = {
  metrics_count: { min: 3, max: 10 },
  template: 'mixed',
  noise_level: 'low',  // Will be overridden during batch generation
};

/**
 * Generates a single synthetic GroundTruthReport.
 *
 * @param id     - Unique report identifier (e.g. "report_000001")
 * @param seed   - Integer seed for reproducible generation
 * @param opts   - Optional overrides
 */
export function generateReport(
  id: string,
  seed: number,
  opts: GeneratorOptions = {}
): GroundTruthReport {
  const options = { ...DEFAULT_OPTIONS, ...opts };
  const rand = mulberry32(seed);

  // ── 1. Choose layout template ──────────────────────────────────────────────
  let chosenTemplate: LayoutTemplate;
  if (options.template === 'mixed' || !options.template) {
    chosenTemplate = pick<LayoutTemplate>(rand, [...ALL_TEMPLATES, 'mixed']);
  } else {
    chosenTemplate = options.template;
  }

  // ── 2. Choose noise level ──────────────────────────────────────────────────
  const noiseLevels: NoiseLevel[] = ['none', 'none', 'low', 'low', 'medium', 'high'];
  // Bias toward clean/low (60% clean or low noise)
  const noiseLevel: NoiseLevel = options.noise_level ?? pick(rand, noiseLevels);
  const noiseConfig = NOISE_PRESETS[noiseLevel];

  // ── 3. Select metrics ─────────────────────────────────────────────────────
  const metricsCount = randInt(
    rand,
    options.metrics_count.min,
    options.metrics_count.max
  );

  // Shuffle metric specs and pick `metricsCount` of them
  const shuffled = [...METRIC_SPECS].sort(() => rand() - 0.5);
  const selectedSpecs = shuffled.slice(0, Math.min(metricsCount, METRIC_SPECS.length));

  // ── 4. Build ground truth & clean text lines ───────────────────────────────
  const groundTruthMetrics: Record<string, GroundTruthMetric> = {};
  const groundTruthResults: Record<string, string> = {};
  const cleanLines: string[] = [];

  for (let i = 0; i < selectedSpecs.length; i++) {
    const spec = selectedSpecs[i];
    const alias = pick(rand, spec.aliases);

    let valueStr: string;
    let numericValue: number | string;
    let gt: GroundTruthMetric;

    if (spec.is_composite) {
      // Blood Pressure
      const vr = spec.value_range as {
        systolic: { min: number; max: number };
        diastolic: { min: number; max: number };
      };
      const sys = randInt(rand, vr.systolic.min, vr.systolic.max);
      const dia = randInt(rand, vr.diastolic.min, vr.diastolic.max);
      numericValue = `${sys}/${dia}`;
      const unit = pick(rand, spec.units);
      valueStr = numericValue;
      gt = {
        canonical_name: spec.canonical_name,
        raw_name: alias,
        value: numericValue,
        unit,
        display_value: `${numericValue} ${unit}`,
        systolic: sys,
        diastolic: dia,
      };
    } else {
      const vr = spec.value_range as { min: number; max: number };
      const num = randFloat(rand, vr.min, vr.max, spec.precision);
      numericValue = num;
      const unit = pick(rand, spec.units);
      valueStr = num.toFixed(spec.precision);
      gt = {
        canonical_name: spec.canonical_name,
        raw_name: alias,
        value: num,
        unit,
        display_value: `${valueStr} ${unit}`,
      };
    }

    groundTruthMetrics[spec.canonical_name] = gt;
    groundTruthResults[spec.canonical_name] = gt.display_value;

    // Render clean line using the selected template
    let renderFn =
      chosenTemplate === 'mixed'
        ? pickRandomTemplate(seed, i)
        : TEMPLATE_REGISTRY[chosenTemplate as Exclude<LayoutTemplate, 'mixed'>];

    if (!renderFn) renderFn = TEMPLATE_REGISTRY['line_colon'];

    const line = renderFn({
      raw_name: alias,
      value_str: valueStr,
      unit: gt.unit,
      is_last: i === selectedSpecs.length - 1,
    });

    cleanLines.push(line);
  }

  // ── 5. Add realistic header & footer ─────────────────────────────────────
  const header = pick(rand, REPORT_HEADERS)
    .replace('{date}', new Date().toISOString().slice(0, 10))
    .replace('{id}', id);
  const footer = pick(rand, REPORT_FOOTERS);

  const cleanText = `${header}${cleanLines.join('\n')}${footer}`.trim();

  // ── 6. Inject OCR noise to produce ocr_text ───────────────────────────────
  const ocrText =
    noiseLevel === 'none'
      ? cleanText
      : injectNoise(cleanText, noiseConfig, seed + 1); // offset seed to differ from selection seed

  // ── 7. Infer report type & title ──────────────────────────────────────────
  const canonicalNames = selectedSpecs.map((s) => s.canonical_name);
  const reportType = inferReportType(canonicalNames);
  const title = inferTitle(canonicalNames, reportType);

  // ── 8. Assemble metadata ──────────────────────────────────────────────────
  const metadata: SyntheticReportMetadata = {
    template: chosenTemplate,
    noise: noiseConfig,
    present_metrics: canonicalNames,
    metrics_count: selectedSpecs.length,
    report_type: reportType,
    generated_at: new Date().toISOString(),
    seed,
  };

  return {
    id,
    ocr_text: ocrText,
    clean_text: cleanText,
    title,
    ground_truth: {
      metrics: groundTruthMetrics,
      results: groundTruthResults,
    },
    metadata,
  };
}

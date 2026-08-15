/**
 * Machine Learning Synthetic Dataset Schema Definitions
 * Vital Diaries — Phase 2: Dataset Creation
 *
 * Compatible with:
 *   - src/types/health.ts   → HealthReport, DecryptedReportDetails
 *   - src/lib/health-extractor.ts → ExtractedMetric, ExtractedHealthData
 *
 * The dataset schema distinguishes canonical metric names from raw aliases
 * found in real OCR text.  This distinction is essential for training and
 * evaluating an extraction model.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. GROUND-TRUTH METRIC VALUE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ground-truth representation of a single extracted metric.
 * Mirrors `ExtractedMetric` from health-extractor.ts, flattened for ML use.
 */
export interface GroundTruthMetric {
  /** Standardised/canonical name (e.g. "Hemoglobin", "Blood Pressure"). */
  canonical_name: string;
  /**
   * Exact alias as it appears in the OCR text for this record.
   * May differ between records (e.g. "HGB", "Hb", "Haemoglobin").
   */
  raw_name: string;
  /**
   * Numeric value, OR composite string for Blood Pressure ("120/80").
   * Mirrors ExtractedMetric.value.
   */
  value: number | string;
  /** Recognised unit string (e.g. "g/dL", "/uL", "mmHg"). */
  unit: string;
  /** Formatted display string (e.g. "12.4 g/dL"). */
  display_value: string;
  /** Blood Pressure only. */
  systolic?: number;
  /** Blood Pressure only. */
  diastolic?: number;
  /**
   * Character offset of the start of the metric's raw text in `ocr_text`.
   * Used for token-classification / NER tasks.
   */
  start_char?: number;
  /** Character offset of the end of the metric's raw text in `ocr_text`. */
  end_char?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. REPORT LAYOUT VARIANT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Identifies which layout template produced the report's OCR text.
 * Controls how metric lines are formatted so we get structural diversity.
 */
export type LayoutTemplate =
  | 'line_colon'          // "Hemoglobin: 12.4 g/dL"
  | 'line_equals'         // "HGB = 12.4 g/dL"
  | 'line_dash'           // "Hemoglobin - 12.4 g/dL"
  | 'line_space'          // "Hemoglobin  12.4  g/dL"
  | 'tabular_grid'        // two/three column table with spaces/tabs
  | 'key_value_dotted'    // "Hemoglobin ...... 12.4 g/dL"
  | 'paragraph_embedded'  // Values mentioned inside free-text sentences
  | 'mixed';              // Combination of the above in the same report

// ─────────────────────────────────────────────────────────────────────────────
// 3. NOISE CONFIG
// ─────────────────────────────────────────────────────────────────────────────

export type NoiseLevel = 'none' | 'low' | 'medium' | 'high';

/** Per-report noise configuration stamped into metadata. */
export interface NoiseConfig {
  level: NoiseLevel;
  /** Probability (0–1) of injecting a character substitution in a word. */
  char_substitution_prob: number;
  /** Probability (0–1) of inserting an extra space between characters. */
  extra_space_prob: number;
  /** Probability (0–1) of removing a space. */
  missing_space_prob: number;
  /** Probability (0–1) of inserting a pipe "|" character. */
  pipe_injection_prob: number;
  /** Probability (0–1) of randomly dropping a character. */
  char_deletion_prob: number;
  /** Probability (0–1) of duplicating a character. */
  char_duplication_prob: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SYNTHETIC REPORT METADATA
// ─────────────────────────────────────────────────────────────────────────────

export interface SyntheticReportMetadata {
  /** Template used to render the OCR text. */
  template: LayoutTemplate;
  /** Noise configuration used for this record. */
  noise: NoiseConfig;
  /** List of canonical metric names present in this report. */
  present_metrics: string[];
  /** How many metrics are in this report (convenience count). */
  metrics_count: number;
  /**
   * Report category, matching HealthReport.type from health.ts.
   * ('cbc' | 'imaging' | 'cardiology' | 'general' | 'vaccine' | 'genomics' | 'other')
   */
  report_type: 'cbc' | 'imaging' | 'cardiology' | 'general' | 'vaccine' | 'genomics' | 'other';
  /** ISO-8601 timestamp when this synthetic record was generated. */
  generated_at: string;
  /** Sequential index used to seed reproducible generation. */
  seed: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. CORE RECORD — GroundTruthReport
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single training/evaluation example.
 *
 * Pipeline:
 *   ocr_text  →  ML model  →  should match  ground_truth
 *
 * Also stores `clean_text` (text before noise injection) to allow:
 *  - training on clean text
 *  - training on noisy text
 *  - evaluation of noise robustness
 */
export interface GroundTruthReport {
  /** Unique identifier, e.g. "report_000001". */
  id: string;

  /** Simulated OCR text — the input to the ML model (may include noise). */
  ocr_text: string;

  /**
   * The same text before noise was injected.
   * Equals `ocr_text` when noise_level is "none".
   * Useful for debugging and clean-only training runs.
   */
  clean_text: string;

  /** Human-readable report title, e.g. "Complete Blood Count (CBC) Panel". */
  title: string;

  /**
   * Ground truth: the expected structured extraction output.
   *
   * `metrics` — full typed objects for training/evaluation.
   * `results` — flat key→display_value map compatible with
   *             DecryptedReportDetails.results from health.ts.
   */
  ground_truth: {
    /**
     * Keyed by canonical metric name.
     * Example key: "Hemoglobin", "Blood Pressure", "WBC"
     */
    metrics: Record<string, GroundTruthMetric>;
    /**
     * Flat display string map — mirrors DecryptedReportDetails.results.
     * Example: { "Hemoglobin": "12.4 g/dL", "WBC": "7200 /uL" }
     */
    results: Record<string, string>;
  };

  /** Generation metadata for diagnostics and dataset analytics. */
  metadata: SyntheticReportMetadata;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. METRIC DEFINITION (for the generator, not the ML model)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Defines a single canonical metric and all the realistic aliases and
 * value ranges used by the dataset generator.
 */
export interface MetricSpec {
  /** Canonical name (matches health-extractor.ts METRIC_DICTIONARY). */
  canonical_name: string;
  /**
   * All realistic OCR aliases the generator can pick from.
   * The chosen alias becomes ground_truth[x].raw_name.
   */
  aliases: string[];
  /** Unit strings the generator can select from for this metric. */
  units: string[];
  /**
   * Realistic numeric range for value generation.
   * For Blood Pressure, provides separate systolic/diastolic ranges.
   */
  value_range: { min: number; max: number } | {
    systolic: { min: number; max: number };
    diastolic: { min: number; max: number };
  };
  /** Decimal precision to use when formatting the value in text. */
  precision: number;
  /** Report category (mirrors MetricDefinition.category in extractor). */
  category: 'cbc' | 'cardiology' | 'general' | 'other';
  /** True when value is a "X/Y" composite (Blood Pressure). */
  is_composite?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. DATASET MANIFEST / SPLIT SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Written to data/manifest.json after full dataset generation.
 * Describes distribution statistics for validation.
 */
export interface DatasetManifest {
  version: string;
  total_reports: number;
  noise_distribution: Record<NoiseLevel, number>;
  template_distribution: Record<LayoutTemplate, number>;
  report_type_distribution: Record<string, number>;
  /** How many reports include each canonical metric. */
  canonical_metric_distribution: Record<string, number>;
  generated_at: string;
  generator_version: string;
}

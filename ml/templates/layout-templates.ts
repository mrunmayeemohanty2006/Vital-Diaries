/**
 * OCR Layout Templates for Synthetic Report Generation
 * Vital Diaries — Phase 2: Dataset Creation
 *
 * Each template function accepts a metric name, value, and unit string
 * and returns a formatted line (or lines) of OCR-simulated text.
 *
 * Templates are intentionally diverse to ensure the ML model learns to
 * handle real-world OCR formatting variation.
 */

import type { LayoutTemplate } from '../schemas/dataset.types';

/** Context passed to each template function per metric line. */
export interface TemplateRenderContext {
  raw_name: string;     // The alias to use in this specific record
  value_str: string;    // Formatted value string (e.g. "12.4" or "120/80")
  unit: string;         // Unit string (e.g. "g/dL")
  is_last: boolean;     // Whether this is the last line (for list-style templates)
}

/** A template function renders one metric entry into a text fragment. */
export type TemplateFunction = (ctx: TemplateRenderContext) => string;

// ─────────────────────────────────────────────────────────────────────────────
// INDIVIDUAL TEMPLATE RENDERERS
// ─────────────────────────────────────────────────────────────────────────────

/** "Hemoglobin: 12.4 g/dL" */
export const renderLineColon: TemplateFunction = ({ raw_name, value_str, unit }) =>
  `${raw_name}: ${value_str} ${unit}`;

/** "HGB = 12.4 g/dL" */
export const renderLineEquals: TemplateFunction = ({ raw_name, value_str, unit }) =>
  `${raw_name} = ${value_str} ${unit}`;

/** "Hemoglobin - 12.4 g/dL" */
export const renderLineDash: TemplateFunction = ({ raw_name, value_str, unit }) =>
  `${raw_name} - ${value_str} ${unit}`;

/** "Hemoglobin  12.4  g/dL"  (double-space, common in PDF-to-text) */
export const renderLineSpace: TemplateFunction = ({ raw_name, value_str, unit }) =>
  `${raw_name}  ${value_str}  ${unit}`;

/**
 * Tabular grid style (fixed-column layout with spaces):
 * "Hemoglobin           12.4          g/dL"
 */
export const renderTabularGrid: TemplateFunction = ({ raw_name, value_str, unit }) => {
  const nameCol = raw_name.padEnd(28, ' ');
  const valCol = value_str.padEnd(14, ' ');
  return `${nameCol}${valCol}${unit}`;
};

/**
 * Dotted leader style:
 * "Hemoglobin ............... 12.4 g/dL"
 */
export const renderKeyValueDotted: TemplateFunction = ({ raw_name, value_str, unit }) => {
  const dots = '.'.repeat(Math.max(4, 30 - raw_name.length));
  return `${raw_name} ${dots} ${value_str} ${unit}`;
};

/**
 * Paragraph-embedded style (free-text sentence):
 * "The patient's Hemoglobin level was found to be 12.4 g/dL."
 */
export const renderParagraphEmbedded: TemplateFunction = ({ raw_name, value_str, unit }) => {
  const phrases = [
    `The patient's ${raw_name} level was found to be ${value_str} ${unit}.`,
    `${raw_name} measured at ${value_str} ${unit} during the current visit.`,
    `Result: ${raw_name} — ${value_str} ${unit}`,
    `${raw_name} (${value_str} ${unit}) was noted in the report.`,
  ];
  // Deterministic selection based on string length (seeded at generation time)
  return phrases[raw_name.length % phrases.length];
};

// ─────────────────────────────────────────────────────────────────────────────
// REPORT HEADER / FOOTER FRAGMENTS
// ─────────────────────────────────────────────────────────────────────────────

/** Realistic lab report header fragments. */
export const REPORT_HEADERS: string[] = [
  `VITAL DIAGNOSTICS LABORATORY\nPatient Lab Report\n`,
  `HEALTH SCAN CENTER\nBlood Test Results\nDate: {date}\n`,
  `COMPREHENSIVE PATHOLOGY SERVICES\nTest Report\nRef No: {id}\n`,
  `METRO CLINICAL LABS\nLaboratory Investigation Report\n`,
  `CITY HOSPITAL PATHOLOGY UNIT\nInvestigation Results\n`,
  ``,  // Some reports have no header (bare results)
];

export const REPORT_FOOTERS: string[] = [
  `\nReport verified by Lab Technician.\n`,
  `\nResults reviewed. Please consult your physician.\n`,
  `\nValues within ( ) indicate reference range.\n`,
  ``,  // Some reports have no footer
];

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

export const TEMPLATE_REGISTRY: Record<Exclude<LayoutTemplate, 'mixed'>, TemplateFunction> = {
  line_colon:         renderLineColon,
  line_equals:        renderLineEquals,
  line_dash:          renderLineDash,
  line_space:         renderLineSpace,
  tabular_grid:       renderTabularGrid,
  key_value_dotted:   renderKeyValueDotted,
  paragraph_embedded: renderParagraphEmbedded,
};

/** All deterministic layout template names (excluding 'mixed'). */
export const ALL_TEMPLATES = Object.keys(TEMPLATE_REGISTRY) as Exclude<LayoutTemplate, 'mixed'>[];

/**
 * For 'mixed' layout: pick a random template per metric line.
 * Generator calls this when template === 'mixed'.
 */
export function pickRandomTemplate(seed: number, index: number): TemplateFunction {
  const keys = ALL_TEMPLATES;
  return TEMPLATE_REGISTRY[keys[(seed + index) % keys.length]];
}

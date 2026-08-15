/**
 * Dataset Build Script — Vital Diaries Phase 2
 *
 * Generates approximately 2,000 synthetic GroundTruthReport records and
 * writes them to ml/data/synthetic_reports.jsonl (one JSON object per line).
 *
 * Also writes ml/data/manifest.json with distribution statistics.
 *
 * Usage:
 *   npx ts-node ml/scripts/generate-dataset.ts
 *   # OR (if ts-node is not available):
 *   npx tsx ml/scripts/generate-dataset.ts
 *
 * DO NOT run this yet — review the setup stage first.
 * DO NOT import from src/ — this script is intentionally decoupled.
 */

import * as fs from 'fs';
import * as path from 'path';

import { generateReport } from '../generator/generator';
import { NOISE_PRESETS } from '../noise/noise-engine';
import { ALL_TEMPLATES } from '../templates/layout-templates';
import type {
  DatasetManifest,
  LayoutTemplate,
  NoiseLevel,
} from '../schemas/dataset.types';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const TOTAL_REPORTS = 2000;
const BASE_SEED     = 42;         // Change to re-generate a different dataset
const OUTPUT_DIR    = path.resolve(__dirname, '../data');
const JSONL_FILE    = path.join(OUTPUT_DIR, 'synthetic_reports.jsonl');
const MANIFEST_FILE = path.join(OUTPUT_DIR, 'manifest.json');
const GENERATOR_VERSION = '1.0.0';

/** Noise level distribution across the 2,000 reports. */
const NOISE_DISTRIBUTION: Record<NoiseLevel, number> = {
  none:   600,   // 30% clean
  low:    700,   // 35% low noise
  medium: 500,   // 25% medium noise
  high:   200,   // 10% high noise
};

/** Layout template distribution (will be split evenly among non-mixed). */
const TEMPLATE_WEIGHTS: Partial<Record<LayoutTemplate, number>> = {
  line_colon:         400,
  line_equals:        250,
  line_dash:          200,
  line_space:         200,
  tabular_grid:       300,
  key_value_dotted:   250,
  paragraph_embedded: 200,
  mixed:              200,
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function padId(n: number): string {
  return `report_${String(n).padStart(6, '0')}`;
}

/**
 * Expands a weight map into an ordered list of [value, count] pairs,
 * shuffled to avoid pattern runs in the output file.
 */
function expandDistribution<T extends string>(
  dist: Partial<Record<T, number>>
): T[] {
  const result: T[] = [];
  for (const [key, count] of Object.entries(dist) as [T, number][]) {
    for (let i = 0; i < (count ?? 0); i++) result.push(key);
  }
  // Fisher-Yates shuffle with fixed seed so output order is reproducible
  let seed = BASE_SEED;
  for (let i = result.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(seed) % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const noiseSequence   = expandDistribution(NOISE_DISTRIBUTION);
  const templateSequence = expandDistribution(TEMPLATE_WEIGHTS as Record<LayoutTemplate, number>);

  // Trim or pad to exactly TOTAL_REPORTS
  while (noiseSequence.length < TOTAL_REPORTS)    noiseSequence.push('low');
  while (templateSequence.length < TOTAL_REPORTS) templateSequence.push('line_colon');

  // Manifest counters
  const noiseDist:    Record<string, number> = {};
  const templateDist: Record<string, number> = {};
  const reportTypeDist: Record<string, number> = {};
  const metricDist:   Record<string, number> = {};
  let cleanCount = 0;
  let noisyCount = 0;

  const outStream = fs.createWriteStream(JSONL_FILE, { encoding: 'utf8' });

  console.log(`Generating ${TOTAL_REPORTS} synthetic reports…`);
  const startTime = Date.now();

  for (let i = 0; i < TOTAL_REPORTS; i++) {
    const id      = padId(i + 1);
    const seed    = BASE_SEED + i;
    const noise   = noiseSequence[i] as NoiseLevel;
    const template = templateSequence[i] as LayoutTemplate;

    const report = generateReport(id, seed, {
      noise_level: noise,
      template,
      metrics_count: { min: 2, max: 12 },
    });

    outStream.write(JSON.stringify(report) + '\n');

    // Update counters
    noiseDist[noise]    = (noiseDist[noise] ?? 0) + 1;
    templateDist[template] = (templateDist[template] ?? 0) + 1;
    reportTypeDist[report.metadata.report_type] =
      (reportTypeDist[report.metadata.report_type] ?? 0) + 1;

    if (noise === 'none') cleanCount++;
    else noisyCount++;

    for (const name of report.metadata.present_metrics) {
      metricDist[name] = (metricDist[name] ?? 0) + 1;
    }

    if ((i + 1) % 100 === 0) {
      process.stdout.write(`  Generated ${i + 1} / ${TOTAL_REPORTS}\r`);
    }
  }

  outStream.end();
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\nDone in ${elapsed}s → ${JSONL_FILE}`);

  // Write manifest
  const manifest: DatasetManifest = {
    version: '1.0.0',
    total_reports: TOTAL_REPORTS,
    noise_distribution:    noiseDist as Record<NoiseLevel, number>,
    template_distribution: templateDist as Record<LayoutTemplate, number>,
    report_type_distribution: reportTypeDist,
    canonical_metric_distribution: metricDist,
    generated_at: new Date().toISOString(),
    generator_version: GENERATOR_VERSION,
  };

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
  console.log(`Manifest → ${MANIFEST_FILE}`);
  console.log('\nNoise distribution:',    noiseDist);
  console.log('Template distribution:', templateDist);
  console.log('Report-type distribution:', reportTypeDist);
}

main();

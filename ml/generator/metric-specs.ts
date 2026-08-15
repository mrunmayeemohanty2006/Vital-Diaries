/**
 * Metric Specifications for Synthetic Dataset Generation
 * Vital Diaries — Phase 2: Dataset Creation
 *
 * This file defines all 16 supported canonical metrics, their realistic
 * aliases, value ranges, units, and category.
 *
 * The alias lists here MUST stay in sync with METRIC_DICTIONARY in:
 *   src/lib/health-extractor.ts
 *
 * DO NOT import from src/lib/health-extractor.ts directly —
 * the ml/ directory is intentionally decoupled from the production app.
 */

import type { MetricSpec } from '../schemas/dataset.types';

export const METRIC_SPECS: MetricSpec[] = [

  // ── CBC PANEL ────────────────────────────────────────────────────────────

  {
    canonical_name: 'Hemoglobin',
    aliases: [
      'Hemoglobin', 'Haemoglobin', 'Hgb', 'HGB', 'Hb',
      'Hb (hemoglobin)', 'Hemoglobin Level', 'HAEMOGLOBIN',
    ],
    units: ['g/dL', 'g/dl', 'g%', 'gm/dL'],
    value_range: { min: 7.0, max: 18.0 },
    precision: 1,
    category: 'cbc',
  },

  {
    canonical_name: 'WBC',
    aliases: [
      'WBC', 'White Blood Cell', 'White Blood Cells', 'White Blood Count',
      'Leukocytes', 'TLC', 'Total Leukocyte Count', 'WBC Count',
      'Total WBC', 'W.B.C',
    ],
    units: ['/uL', '/mcL', 'x10^3/uL', '10^3/uL', 'k/uL', 'cells/mcL'],
    value_range: { min: 2000, max: 15000 },
    precision: 0,
    category: 'cbc',
  },

  {
    canonical_name: 'Platelets',
    aliases: [
      'Platelets', 'Platelet Count', 'PLT', 'Platelet',
      'Thrombocytes', 'Plt Count', 'Platelet (Thrombocytes)',
      'PLATELET COUNT',
    ],
    units: ['/uL', '/mcL', 'x10^3/uL', 'k/uL', 'lakhs/cu mm'],
    value_range: { min: 50000, max: 450000 },
    precision: 0,
    category: 'cbc',
  },

  // ── GLUCOSE & GLYCAEMIC ───────────────────────────────────────────────────

  {
    canonical_name: 'Fasting Glucose',
    aliases: [
      'Fasting Blood Glucose', 'Fasting Glucose', 'Fasting Blood Sugar',
      'FBS', 'Fasting Sugar', 'F. Blood Sugar', 'Blood Glucose (Fasting)',
      'Fasting Plasma Glucose', 'FPG',
    ],
    units: ['mg/dL', 'mg/dl', 'mmol/L'],
    value_range: { min: 60, max: 200 },
    precision: 0,
    category: 'general',
  },

  {
    canonical_name: 'Blood Glucose',
    aliases: [
      'Blood Glucose', 'Blood Sugar', 'Random Blood Sugar', 'RBS',
      'Glucose', 'Sugar', 'Blood Glucose (Random)', 'Random Plasma Glucose',
      'Glucose (Random)',
    ],
    units: ['mg/dL', 'mg/dl', 'mmol/L'],
    value_range: { min: 70, max: 300 },
    precision: 0,
    category: 'general',
  },

  {
    canonical_name: 'HbA1c',
    aliases: [
      'HbA1c', 'Hb A1c', 'HbA1C', 'A1C', 'Glycated Hemoglobin',
      'Glycohemoglobin', 'GHb', 'HBA1C', 'HbAlc',  // HbAlc is a common OCR error
    ],
    units: ['%', 'mmol/mol'],
    value_range: { min: 4.0, max: 12.0 },
    precision: 1,
    category: 'general',
  },

  // ── VITAMINS ──────────────────────────────────────────────────────────────

  {
    canonical_name: 'Vitamin D',
    aliases: [
      'Vitamin D', 'Vit D', '25-Hydroxy Vitamin D', '25-OH Vitamin D',
      '25-OH Vit D', 'Vitamin D3', '25-Hydroxycholecalciferol',
      'Calcidiol', '25(OH)D', 'Vitamin D (25-OH)',
    ],
    units: ['ng/mL', 'nmol/L', 'ng/ml'],
    value_range: { min: 5, max: 100 },
    precision: 1,
    category: 'general',
  },

  {
    canonical_name: 'Vitamin B12',
    aliases: [
      'Vitamin B12', 'Vit B12', 'Vitamin B-12', 'Vit B-12', 'Cobalamin',
      'Cyanocobalamin', 'B12', 'Serum B12', 'Vitamin B 12',
    ],
    units: ['pg/mL', 'pmol/L', 'pg/ml'],
    value_range: { min: 100, max: 1200 },
    precision: 0,
    category: 'general',
  },

  // ── THYROID ───────────────────────────────────────────────────────────────

  {
    canonical_name: 'TSH',
    aliases: [
      'TSH', 'Thyroid Stimulating Hormone', 'Thyrotropin',
      'T.S.H', 'TSH (Thyroid Stimulating Hormone)', 'Serum TSH',
    ],
    units: ['uIU/mL', 'mIU/L', 'uU/mL', 'mcIU/mL'],
    value_range: { min: 0.1, max: 10.0 },
    precision: 2,
    category: 'general',
  },

  // ── KIDNEY FUNCTION ───────────────────────────────────────────────────────

  {
    canonical_name: 'Creatinine',
    aliases: [
      'Creatinine', 'Serum Creatinine', 'Creat', 'S. Creatinine',
      'Creatinine (Serum)', 'CREATININE',
    ],
    units: ['mg/dL', 'umol/L'],
    value_range: { min: 0.4, max: 3.5 },
    precision: 2,
    category: 'general',
  },

  {
    canonical_name: 'Urea',
    aliases: [
      'Urea', 'Blood Urea Nitrogen', 'BUN', 'Serum Urea',
      'Blood Urea', 'Urea Nitrogen', 'BUN / Urea',
    ],
    units: ['mg/dL', 'mmol/L'],
    value_range: { min: 7, max: 80 },
    precision: 0,
    category: 'general',
  },

  // ── LIPID PANEL ───────────────────────────────────────────────────────────

  {
    canonical_name: 'Total Cholesterol',
    aliases: [
      'Total Cholesterol', 'Cholesterol Total', 'Serum Cholesterol',
      'Cholesterol', 'T. Cholesterol', 'TC', 'Total Chol',
    ],
    units: ['mg/dL', 'mmol/L'],
    value_range: { min: 100, max: 350 },
    precision: 0,
    category: 'cardiology',
  },

  {
    canonical_name: 'HDL',
    aliases: [
      'HDL Cholesterol', 'HDL-C', 'HDL', 'High Density Lipoprotein',
      'HDL (Good Cholesterol)', 'HDL Chol', 'H.D.L',
    ],
    units: ['mg/dL', 'mmol/L'],
    value_range: { min: 20, max: 100 },
    precision: 0,
    category: 'cardiology',
  },

  {
    canonical_name: 'LDL',
    aliases: [
      'LDL Cholesterol', 'LDL-C', 'LDL', 'Low Density Lipoprotein',
      'LDL (Bad Cholesterol)', 'LDL Chol', 'L.D.L',
    ],
    units: ['mg/dL', 'mmol/L'],
    value_range: { min: 30, max: 250 },
    precision: 0,
    category: 'cardiology',
  },

  {
    canonical_name: 'Triglycerides',
    aliases: [
      'Triglycerides', 'Triglyceride', 'TG', 'Serum Triglycerides',
      'TG (Triglycerides)', 'Trig', 'VLDL-TG',
    ],
    units: ['mg/dL', 'mmol/L'],
    value_range: { min: 40, max: 600 },
    precision: 0,
    category: 'cardiology',
  },

  // ── CARDIOVASCULAR ────────────────────────────────────────────────────────

  {
    canonical_name: 'Blood Pressure',
    aliases: [
      'Blood Pressure', 'BP', 'B.P.', 'B.P', 'Blood Pressure (Systolic/Diastolic)',
    ],
    units: ['mmHg'],
    // Composite metric: { systolic: ..., diastolic: ... }
    value_range: {
      systolic: { min: 90, max: 180 },
      diastolic: { min: 50, max: 110 },
    },
    precision: 0,
    category: 'cardiology',
    is_composite: true,
  },

];

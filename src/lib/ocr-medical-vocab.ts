/**
 * Canonical Medical Vocabulary & Deterministic Disambiguation Engine (Phase 2 Enhanced)
 * 
 * 100% Deterministic & Local:
 * 1. Canonical Biomarker Aliases & Controlled Levenshtein Fuzzy Matching
 * 2. Canonical Unit Dictionary & OCR Typo Normalization
 * 3. Context-Guarded Multi-Candidate Numeric Disambiguation
 * 4. Structured Reference Interval Syntax Parser
 * 5. Strict Status Marker Classifier
 */

export interface CanonicalParameter {
  canonicalName: string;
  aliases: string[];
  category: 'cbc' | 'iron' | 'thyroid' | 'metabolic' | 'vitamins' | 'renal' | 'hepatic' | 'general';
  defaultUnit: string;
  expectedMin: number;
  expectedMax: number;
  allowDecimals: boolean;
}

export interface ParsedReferenceRange {
  rawText: string;
  low?: number;
  high?: number;
  operator?: '<' | '<=' | '>' | '>=';
  threshold?: number;
  unit?: string;
  isStratified?: boolean;
}

export const CANONICAL_MEDICAL_VOCABULARY: CanonicalParameter[] = [
  // CBC
  {
    canonicalName: 'Hemoglobin',
    aliases: ['hemoglobin', 'haemoglobin', 'hb', 'hgb', 'hemoglobin (hb)', 'haemoglobin (hb)', 'hemoglohin', 'hernoglobin', 'hemoglobln'],
    category: 'cbc',
    defaultUnit: 'g/dL',
    expectedMin: 5.0,
    expectedMax: 22.0,
    allowDecimals: true,
  },
  {
    canonicalName: 'Total RBC',
    aliases: ['total rbc count', 'rbc count', 'rbc', 'red blood cell count', 'erythrocyte count', 'total rbc'],
    category: 'cbc',
    defaultUnit: 'million/uL',
    expectedMin: 2.0,
    expectedMax: 8.0,
    allowDecimals: true,
  },
  {
    canonicalName: 'Hematocrit',
    aliases: ['hematocrit', 'haematocrit', 'pcv', 'packed cell volume', 'hct', 'hematocrit (pcv)'],
    category: 'cbc',
    defaultUnit: '%',
    expectedMin: 15.0,
    expectedMax: 65.0,
    allowDecimals: true,
  },
  {
    canonicalName: 'MCV',
    aliases: ['mcv', 'mean corpuscular volume', 'mean corpuscular volume (mcv)'],
    category: 'cbc',
    defaultUnit: 'fL',
    expectedMin: 50.0,
    expectedMax: 130.0,
    allowDecimals: true,
  },
  {
    canonicalName: 'MCH',
    aliases: ['mch', 'mean corpuscular hemoglobin', 'mean corpuscular hemoglobin (mch)'],
    category: 'cbc',
    defaultUnit: 'pg',
    expectedMin: 15.0,
    expectedMax: 45.0,
    allowDecimals: true,
  },
  {
    canonicalName: 'MCHC',
    aliases: ['mchc', 'mean corpuscular hemoglobin concentration', 'mean corpuscular hemoglobin concentration (mchc)'],
    category: 'cbc',
    defaultUnit: 'g/dL',
    expectedMin: 25.0,
    expectedMax: 40.0,
    allowDecimals: true,
  },
  {
    canonicalName: 'RDW',
    aliases: ['rdw', 'rdw-cv', 'rdw cv', 'red cell distribution width', 'rdw-sd'],
    category: 'cbc',
    defaultUnit: '%',
    expectedMin: 9.0,
    expectedMax: 25.0,
    allowDecimals: true,
  },
  {
    canonicalName: 'WBC',
    aliases: ['total wbc count', 'total leukocyte count', 'tlc', 'wbc count', 'wbc', 'total wbc', 'total leucocyte count', 'total leucocyte count (tlc)'],
    category: 'cbc',
    defaultUnit: 'cells/uL',
    expectedMin: 1000,
    expectedMax: 50000,
    allowDecimals: false,
  },
  {
    canonicalName: 'Neutrophils',
    aliases: ['neutrophils', 'neutrophil', 'polymorphs', 'segs', 'neutrophils %'],
    category: 'cbc',
    defaultUnit: '%',
    expectedMin: 10.0,
    expectedMax: 90.0,
    allowDecimals: true,
  },
  {
    canonicalName: 'Lymphocytes',
    aliases: ['lymphocytes', 'lymphocyte', 'lymphs', 'lymphocytes %'],
    category: 'cbc',
    defaultUnit: '%',
    expectedMin: 5.0,
    expectedMax: 80.0,
    allowDecimals: true,
  },
  {
    canonicalName: 'Monocytes',
    aliases: ['monocytes', 'monocyte', 'monocytes %'],
    category: 'cbc',
    defaultUnit: '%',
    expectedMin: 0.0,
    expectedMax: 25.0,
    allowDecimals: true,
  },
  {
    canonicalName: 'Eosinophils',
    aliases: ['eosinophils', 'eosinophil', 'eos', 'eosinophils %'],
    category: 'cbc',
    defaultUnit: '%',
    expectedMin: 0.0,
    expectedMax: 25.0,
    allowDecimals: true,
  },
  {
    canonicalName: 'Basophils',
    aliases: ['basophils', 'basophil', 'baso', 'basophils %'],
    category: 'cbc',
    defaultUnit: '%',
    expectedMin: 0.0,
    expectedMax: 10.0,
    allowDecimals: true,
  },
  {
    canonicalName: 'Platelets',
    aliases: ['platelet count', 'platelets', 'plt count', 'plt', 'thrombocyte count', 'total platelet count'],
    category: 'cbc',
    defaultUnit: 'lakh/uL',
    expectedMin: 0.2,
    expectedMax: 10.0,
    allowDecimals: true,
  },

  // Iron Studies
  {
    canonicalName: 'Serum Iron',
    aliases: ['serum iron', 'iron', 'fe', 'iron, serum', 'total iron'],
    category: 'iron',
    defaultUnit: 'ug/dL',
    expectedMin: 10.0,
    expectedMax: 300.0,
    allowDecimals: false,
  },
  {
    canonicalName: 'TIBC',
    aliases: ['tibc', 'total iron binding capacity', 'tbc', 'total iron binding capacity (tibc)'],
    category: 'iron',
    defaultUnit: 'ug/dL',
    expectedMin: 100.0,
    expectedMax: 600.0,
    allowDecimals: false,
  },
  {
    canonicalName: 'UIBC',
    aliases: ['uibc', 'unsaturated iron binding capacity', 'unsaturated iron binding capacity (uibc)'],
    category: 'iron',
    defaultUnit: 'ug/dL',
    expectedMin: 50.0,
    expectedMax: 500.0,
    allowDecimals: false,
  },
  {
    canonicalName: 'Transferrin Saturation',
    aliases: ['transferrin saturation', 'transferrin sat', '% transferrin saturation', 'transferrin'],
    category: 'iron',
    defaultUnit: '%',
    expectedMin: 2.0,
    expectedMax: 90.0,
    allowDecimals: true,
  },
  {
    canonicalName: 'Ferritin',
    aliases: ['ferritin', 'serum ferritin', 's.ferritin'],
    category: 'iron',
    defaultUnit: 'ng/mL',
    expectedMin: 2.0,
    expectedMax: 1500.0,
    allowDecimals: false,
  },

  // Thyroid
  {
    canonicalName: 'TSH',
    aliases: ['tsh', 'thyroid stimulating hormone', 'thyrotropin', 's.tsh', 'serum tsh', 'thyroid stimulating hormone (tsh)'],
    category: 'thyroid',
    defaultUnit: 'uIU/mL',
    expectedMin: 0.01,
    expectedMax: 100.0,
    allowDecimals: true,
  },
  {
    canonicalName: 'Total T3',
    aliases: ['total t3', 'triiodothyronine', 't3 total', 't3', 'total triiodothyronine (t3)'],
    category: 'thyroid',
    defaultUnit: 'ng/mL',
    expectedMin: 0.1,
    expectedMax: 10.0,
    allowDecimals: true,
  },
  {
    canonicalName: 'Total T4',
    aliases: ['total t4', 'thyroxine', 't4 total', 't4', 'total thyroxine (t4)'],
    category: 'thyroid',
    defaultUnit: 'ug/dL',
    expectedMin: 0.5,
    expectedMax: 30.0,
    allowDecimals: true,
  },

  // Metabolic & Lipids
  {
    canonicalName: 'Fasting Blood Sugar',
    aliases: ['fasting blood sugar', 'fasting glucose', 'glucose fasting', 'fbs', 'blood glucose (f)', 'fasting blood sugar (fbs)', 'fasting blood sugar (glucose)'],
    category: 'metabolic',
    defaultUnit: 'mg/dL',
    expectedMin: 40.0,
    expectedMax: 600.0,
    allowDecimals: false,
  },
  {
    canonicalName: 'HbA1c',
    aliases: ['hba1c', 'glycated hemoglobin', 'glycosylated hemoglobin', 'a1c', 'glycated hemoglobin (hba1c)'],
    category: 'metabolic',
    defaultUnit: '%',
    expectedMin: 3.5,
    expectedMax: 18.0,
    allowDecimals: true,
  },
  {
    canonicalName: 'Total Cholesterol',
    aliases: ['total cholesterol', 'serum cholesterol', 'cholesterol total', 'cholesterol'],
    category: 'metabolic',
    defaultUnit: 'mg/dL',
    expectedMin: 50.0,
    expectedMax: 500.0,
    allowDecimals: false,
  },
  {
    canonicalName: 'Triglycerides',
    aliases: ['triglycerides', 'serum triglycerides', 'tg', 'triglyceride'],
    category: 'metabolic',
    defaultUnit: 'mg/dL',
    expectedMin: 20.0,
    expectedMax: 1200.0,
    allowDecimals: false,
  },
  {
    canonicalName: 'HDL Cholesterol',
    aliases: ['hdl cholesterol', 'hdl-c', 'hdl direct', 'hdl', 'hdl - cholesterol'],
    category: 'metabolic',
    defaultUnit: 'mg/dL',
    expectedMin: 10.0,
    expectedMax: 120.0,
    allowDecimals: false,
  },
  {
    canonicalName: 'LDL Cholesterol',
    aliases: ['ldl cholesterol', 'ldl-c', 'ldl direct', 'ldl calculated', 'ldl', 'ldl - cholesterol', 'ldl cholesterol (calculated)'],
    category: 'metabolic',
    defaultUnit: 'mg/dL',
    expectedMin: 20.0,
    expectedMax: 350.0,
    allowDecimals: false,
  },

  // Vitamins
  {
    canonicalName: 'Vitamin B12',
    aliases: ['vitamin b12', 'vit b12', 'b12', 'cyanocobalamin', 'serum b12', 'vitamin b12 (cyanocobalamin)'],
    category: 'vitamins',
    defaultUnit: 'pg/mL',
    expectedMin: 50.0,
    expectedMax: 2500.0,
    allowDecimals: false,
  },
  {
    canonicalName: 'Folate',
    aliases: ['folate', 'folic acid', 'serum folate', 'vit b9', 'folate (serum)'],
    category: 'vitamins',
    defaultUnit: 'ng/mL',
    expectedMin: 0.5,
    expectedMax: 50.0,
    allowDecimals: true,
  },
  {
    canonicalName: 'Vitamin D',
    aliases: ['vitamin d', 'vit d', '25-oh vitamin d', '25-hydroxy vitamin d', 'vitamin d (25-oh)', 'vitamin d (25-oh total)'],
    category: 'vitamins',
    defaultUnit: 'ng/mL',
    expectedMin: 2.0,
    expectedMax: 200.0,
    allowDecimals: true,
  },
  {
    canonicalName: 'Serum Calcium',
    aliases: ['calcium', 'serum calcium', 'ca', 'total calcium', 'calcium, serum'],
    category: 'vitamins',
    defaultUnit: 'mg/dL',
    expectedMin: 4.0,
    expectedMax: 16.0,
    allowDecimals: true,
  },

  // Renal & Hepatic
  {
    canonicalName: 'Serum Creatinine',
    aliases: ['serum creatinine', 'creatinine', 's.creatinine', 'creatinine, serum'],
    category: 'renal',
    defaultUnit: 'mg/dL',
    expectedMin: 0.2,
    expectedMax: 15.0,
    allowDecimals: true,
  },
  {
    canonicalName: 'BUN',
    aliases: ['bun', 'blood urea nitrogen', 'urea nitrogen', 'blood urea nitrogen (bun)', 'urea'],
    category: 'renal',
    defaultUnit: 'mg/dL',
    expectedMin: 2.0,
    expectedMax: 120.0,
    allowDecimals: true,
  },
  {
    canonicalName: 'Bilirubin Total',
    aliases: ['bilirubin total', 'total bilirubin', 'serum bilirubin total', 't. bilirubin', 'bilirubin'],
    category: 'hepatic',
    defaultUnit: 'mg/dL',
    expectedMin: 0.1,
    expectedMax: 25.0,
    allowDecimals: true,
  },
  {
    canonicalName: 'Bilirubin Direct',
    aliases: ['bilirubin direct', 'direct bilirubin', 'bilirubin-direct', 'conjugated bilirubin', 'd. bilirubin'],
    category: 'hepatic',
    defaultUnit: 'mg/dL',
    expectedMin: 0.0,
    expectedMax: 10.0,
    allowDecimals: true,
  },
  {
    canonicalName: 'Bilirubin Indirect',
    aliases: ['bilirubin indirect', 'indirect bilirubin', 'bilirubin-indirect', 'unconjugated bilirubin'],
    category: 'hepatic',
    defaultUnit: 'mg/dL',
    expectedMin: 0.0,
    expectedMax: 15.0,
    allowDecimals: true,
  },
  {
    canonicalName: 'Total Protein',
    aliases: ['total protein', 'protein, total', 'serum protein total', 'serum total protein', 'protein total'],
    category: 'hepatic',
    defaultUnit: 'g/dL',
    expectedMin: 3.0,
    expectedMax: 12.0,
    allowDecimals: true,
  },
  {
    canonicalName: 'Albumin',
    aliases: ['albumin', 'serum albumin', 's. albumin'],
    category: 'hepatic',
    defaultUnit: 'g/dL',
    expectedMin: 1.5,
    expectedMax: 7.0,
    allowDecimals: true,
  },
  {
    canonicalName: 'Globulin',
    aliases: ['globulin', 'serum globulin', 's. globulin'],
    category: 'hepatic',
    defaultUnit: 'g/dL',
    expectedMin: 1.0,
    expectedMax: 7.0,
    allowDecimals: true,
  },
  {
    canonicalName: 'A/G Ratio',
    aliases: ['a/g ratio', 'albumin globulin ratio', 'albumin/globulin ratio', 'ag ratio'],
    category: 'hepatic',
    defaultUnit: 'Ratio',
    expectedMin: 0.4,
    expectedMax: 3.5,
    allowDecimals: true,
  },
  {
    canonicalName: 'Alkaline Phosphatase',
    aliases: ['alkaline phosphatase', 'alp', 'serum alkaline phosphatase', 'alk phos'],
    category: 'hepatic',
    defaultUnit: 'U/L',
    expectedMin: 20.0,
    expectedMax: 800.0,
    allowDecimals: false,
  },
  {
    canonicalName: 'GGT',
    aliases: ['gamma glutamyltransferase', 'ggt', 'gamma-glutamyl transferase', 'gamma glutamyl transferase (ggt)', 'gamma glutamyltransferase (ggt)'],
    category: 'hepatic',
    defaultUnit: 'U/L',
    expectedMin: 3.0,
    expectedMax: 400.0,
    allowDecimals: false,
  },
  {
    canonicalName: 'SGOT / AST',
    aliases: ['sgot', 'ast', 'aspartate aminotransferase', 'sgot / ast', 'sgot (ast)', 'sgot (aspartate aminotransferase)'],
    category: 'hepatic',
    defaultUnit: 'U/L',
    expectedMin: 1.0,
    expectedMax: 500.0,
    allowDecimals: false,
  },
  {
    canonicalName: 'SGPT / ALT',
    aliases: ['sgpt', 'alt', 'alanine aminotransferase', 'sgpt / alt', 'sgpt (alt)', 'sgpt (alanine transaminase)'],
    category: 'hepatic',
    defaultUnit: 'U/L',
    expectedMin: 1.0,
    expectedMax: 500.0,
    allowDecimals: false,
  },
  {
    canonicalName: 'SGOT/SGPT Ratio',
    aliases: ['sgot/sgpt', 'sgot/sgpt ratio', 'ast/alt ratio', 'ast/alt'],
    category: 'hepatic',
    defaultUnit: 'Ratio',
    expectedMin: 0.2,
    expectedMax: 5.0,
    allowDecimals: true,
  },

  // Absolute Leucocyte Counts
  {
    canonicalName: 'Absolute Neutrophil Count',
    aliases: ['absolute neutrophil count', 'anc', 'absolute neutrophils'],
    category: 'cbc',
    defaultUnit: '10^3/µL',
    expectedMin: 0.5,
    expectedMax: 20.0,
    allowDecimals: true,
  },
  {
    canonicalName: 'Absolute Lymphocyte Count',
    aliases: ['absolute lymphocyte count', 'alc', 'absolute lymphocytes'],
    category: 'cbc',
    defaultUnit: '10^3/µL',
    expectedMin: 0.2,
    expectedMax: 10.0,
    allowDecimals: true,
  },
  {
    canonicalName: 'Absolute Monocyte Count',
    aliases: ['absolute monocyte count', 'amc', 'absolute monocytes'],
    category: 'cbc',
    defaultUnit: '10^3/µL',
    expectedMin: 0.05,
    expectedMax: 3.0,
    allowDecimals: true,
  },
  {
    canonicalName: 'Absolute Eosinophil Count',
    aliases: ['absolute eosinophil count', 'aec', 'absolute eosinophils'],
    category: 'cbc',
    defaultUnit: '10^3/µL',
    expectedMin: 0.01,
    expectedMax: 2.0,
    allowDecimals: true,
  },
  {
    canonicalName: 'Absolute Basophil Count',
    aliases: ['absolute basophil count', 'abc', 'absolute basophils'],
    category: 'cbc',
    defaultUnit: '10^3/µL',
    expectedMin: 0.005,
    expectedMax: 1.0,
    allowDecimals: true,
  },

  // Platelet Indices
  {
    canonicalName: 'MPV',
    aliases: ['mean platelet volume', 'mpv', 'mean platelet volume (mpv)'],
    category: 'cbc',
    defaultUnit: 'fL',
    expectedMin: 4.0,
    expectedMax: 20.0,
    allowDecimals: true,
  },
  {
    canonicalName: 'PDW',
    aliases: ['platelet distribution width', 'pdw', 'platelet distribution width (pdw)'],
    category: 'cbc',
    defaultUnit: 'fL',
    expectedMin: 5.0,
    expectedMax: 30.0,
    allowDecimals: true,
  },

  // Glycemic Control
  {
    canonicalName: 'Estimated Average Glucose',
    aliases: ['estimated average glucose (eag)', 'estimated average glucose', 'eag'],
    category: 'metabolic',
    defaultUnit: 'mg/dL',
    expectedMin: 40.0,
    expectedMax: 400.0,
    allowDecimals: true,
  },
];

/**
 * Normalizes recognized measurement unit strings to canonical form.
 */
export const CANONICAL_UNIT_MAP: Record<string, string> = {
  // Concentrations
  'g/dl': 'g/dL',
  'a/dl': 'g/dL',
  'g/di': 'g/dL',
  'gm/dl': 'g/dL',
  'mg/dl': 'mg/dL',
  'mg/dl.': 'mg/dL',
  'ug/dl': 'ug/dL',
  'µg/dl': 'ug/dL',
  'mcg/dl': 'ug/dL',
  'pa/dl': 'ug/dL',
  'hg/dl': 'ug/dL',
  'ng/ml': 'ng/mL',
  'ng/ml.': 'ng/mL',
  'pg/ml': 'pg/mL',
  'pg': 'pg',
  'fl': 'fL',
  'f l': 'fL',
  '%': '%',
  'u/l': 'U/L',
  'iu/l': 'U/L',
  'u/ml': 'U/mL',
  'ratio': 'Ratio',
  'mmol/l': 'mmol/L',
  'umol/l': 'umol/L',
  'mmhg': 'mmHg',

  // Counts / Volumes / Scientific notation
  'cells/ul': 'cells/uL',
  '/ul': 'cells/uL',
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
  'lakh/ul': 'lakh/uL',
  'lakh/pl': 'lakh/uL',
  'lakh/µl': 'lakh/uL',
  'lakhs/ul': 'lakh/uL',
  'lacs/ul': 'lakh/uL',
  '/mcl': '/mcL',
  'k/ul': 'k/uL',

  // Hormones
  'uiu/ml': 'uIU/mL',
  'µiu/ml': 'uIU/mL',
  'iu/ml': 'uIU/mL',
  'piu/ml': 'uIU/mL',
  'miu/l': 'uIU/mL',
  'uu/ml': 'uIU/mL',
};

/**
 * Normalizes a unit string to canonical format.
 */
export function normalizeUnit(rawUnit: string): string {
  if (!rawUnit) return '';
  const clean = rawUnit.trim().toLowerCase().replace(/^[(\[]|[)\]]$/g, '');
  return CANONICAL_UNIT_MAP[clean] || rawUnit.trim();
}

/**
 * Levenshtein distance between two strings.
 */
export function computeLevenshtein(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[m][n];
}

/**
 * Controlled Fuzzy / Exact Match of raw parameter text to Canonical Medical Vocabulary.
 * Uses strict length-proportional edit distance thresholds to prevent false positives.
 */
export function matchCanonicalParameter(rawText: string): CanonicalParameter | null {
  if (!rawText || rawText.trim().length === 0) return null;
  const normalized = rawText.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

  // Guard against generic substrings
  const isGlycated = /\b(glycated|glycosylated|hba1c|a1c)\b/i.test(rawText);
  const isFasting = /\bfasting\b/i.test(rawText);
  const isAbsolute = /\b(absolute|anc|alc|aec|amc|abc)\b/i.test(rawText);
  const isDirect = /\b(direct|conjugated)\b/i.test(rawText);
  const isIndirect = /\b(indirect|unconjugated)\b/i.test(rawText);
  const isRatio = /\b(ratio|\/)\b/i.test(rawText);
  const isTumorMarker = /\b(ca\s*(?:19-9|125|15-3|27\.29|50|72-4|242)|psa|cea|afp)\b/i.test(rawText);

  // 1. Exact Match Priority
  for (const item of CANONICAL_MEDICAL_VOCABULARY) {
    if (item.canonicalName === 'Hemoglobin' && (isGlycated || /\b(mean\s+corpuscular|mch|mchc)\b/i.test(rawText))) continue;
    if (item.canonicalName === 'Blood Glucose' && isFasting) continue;
    if (item.canonicalName === 'MCH' && /\bmchc\b/i.test(rawText)) continue;
    if (isAbsolute && ['Neutrophils', 'Lymphocytes', 'Monocytes', 'Eosinophils', 'Basophils'].includes(item.canonicalName)) continue;
    if (!isAbsolute && item.canonicalName.startsWith('Absolute ')) continue;
    if (isDirect && item.canonicalName === 'Bilirubin Total') continue;
    if (isIndirect && item.canonicalName === 'Bilirubin Total') continue;
    if (isRatio && ['SGOT / AST', 'SGPT / ALT'].includes(item.canonicalName)) continue;
    if (isTumorMarker && item.canonicalName === 'Serum Calcium') continue;

    for (const alias of item.aliases) {
      const aliasNorm = alias.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
      if (normalized === aliasNorm) {
        return item;
      }
    }
  }

  // 2. Longest-Alias Substring Match Priority
  interface CandidateMatch {
    item: CanonicalParameter;
    aliasLength: number;
  }
  const candidateMatches: CandidateMatch[] = [];

  for (const item of CANONICAL_MEDICAL_VOCABULARY) {
    if (item.canonicalName === 'Hemoglobin' && (isGlycated || /\b(mean\s+corpuscular|mch|mchc)\b/i.test(rawText))) continue;
    if (item.canonicalName === 'Blood Glucose' && isFasting) continue;
    if (item.canonicalName === 'MCH' && /\bmchc\b/i.test(rawText)) continue;
    if (isAbsolute && ['Neutrophils', 'Lymphocytes', 'Monocytes', 'Eosinophils', 'Basophils'].includes(item.canonicalName)) continue;
    if (!isAbsolute && item.canonicalName.startsWith('Absolute ')) continue;
    if (isDirect && item.canonicalName === 'Bilirubin Total') continue;
    if (isIndirect && item.canonicalName === 'Bilirubin Total') continue;
    if (isRatio && ['SGOT / AST', 'SGPT / ALT'].includes(item.canonicalName)) continue;
    if (isTumorMarker && item.canonicalName === 'Serum Calcium') continue;

    for (const alias of item.aliases) {
      const aliasNorm = alias.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
      if (aliasNorm.length <= 2 && normalized !== aliasNorm) continue; // Short 1-2 char acronyms require exact match

      const regex = new RegExp(`\\b${aliasNorm.replace(/\s+/g, '\\s+')}\\b`, 'i');
      if (regex.test(normalized)) {
        candidateMatches.push({ item, aliasLength: aliasNorm.length });
      }
    }
  }

  if (candidateMatches.length > 0) {
    candidateMatches.sort((a, b) => b.aliasLength - a.aliasLength);
    return candidateMatches[0].item;
  }

  // 3. Controlled Fuzzy Search (Safeguarded)
  const words = normalized.split(' ');
  for (const item of CANONICAL_MEDICAL_VOCABULARY) {
    if (item.canonicalName === 'Hemoglobin' && isGlycated) continue;
    if (item.canonicalName === 'Blood Glucose' && isFasting) continue;
    if (item.canonicalName === 'MCH' && /\bmchc\b/i.test(rawText)) continue;
    if (isAbsolute && ['Neutrophils', 'Lymphocytes', 'Monocytes', 'Eosinophils', 'Basophils'].includes(item.canonicalName)) continue;
    if (!isAbsolute && item.canonicalName.startsWith('Absolute ')) continue;
    if (isDirect && item.canonicalName === 'Bilirubin Total') continue;
    if (isIndirect && item.canonicalName === 'Bilirubin Total') continue;
    if (isRatio && ['SGOT / AST', 'SGPT / ALT'].includes(item.canonicalName)) continue;
    if (isTumorMarker && item.canonicalName === 'Serum Calcium') continue;

    for (const alias of item.aliases) {
      const aliasNorm = alias.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
      if (aliasNorm.length < 4) continue; // No fuzzy matching on short acronyms (Hb, T3, T4, Ca)

      // Test against each word or 2-word n-gram
      for (let i = 0; i < words.length; i++) {
        const candidate1 = words[i];
        const candidate2 = i < words.length - 1 ? `${words[i]} ${words[i + 1]}` : '';

        const maxAllowedDist = aliasNorm.length >= 8 ? 2 : 1;

        if (Math.abs(candidate1.length - aliasNorm.length) <= maxAllowedDist) {
          const dist = computeLevenshtein(candidate1, aliasNorm);
          if (dist <= maxAllowedDist) return item;
        }

        if (candidate2 && Math.abs(candidate2.length - aliasNorm.length) <= maxAllowedDist) {
          const dist = computeLevenshtein(candidate2, aliasNorm);
          if (dist <= maxAllowedDist) return item;
        }
      }
    }
  }

  return null;
}

/**
 * Context-Guarded Numeric Disambiguation with Deterministic Multi-Candidate Generation.
 */
export function disambiguateNumericString(
  rawVal: string,
  paramDef?: CanonicalParameter
): { value: number | null; rawString: string; corrected: boolean; confidenceScore: number; candidates?: number[] } {
  if (!rawVal || typeof rawVal !== 'string') {
    return { value: null, rawString: rawVal, corrected: false, confidenceScore: 0 };
  }

  let text = rawVal.trim();
  let wasCorrected = false;

  // 1. Direct valid number or standard decimal/thousands comma check
  if (/^\d+,\d{1,2}$/.test(text)) {
    // European decimal comma (e.g. '11,2' -> 11.2)
    const num = parseFloat(text.replace(/,/, '.'));
    return { value: isNaN(num) ? null : num, rawString: rawVal, corrected: true, confidenceScore: 0.95 };
  }

  const cleanDirect = text.replace(/,/g, '');
  if (/^-?\d+(?:\.\d+)?$/.test(cleanDirect) && !/[lIoOsSzZbB]/.test(text)) {
    const num = parseFloat(cleanDirect);
    return { value: isNaN(num) ? null : num, rawString: rawVal, corrected: cleanDirect !== text, confidenceScore: 1.0 };
  }

  // 2. Candidate Generation via Contextual Glyph Disambiguation
  // '1l.2' -> 11.2, 'll.2' -> 11.2, 'I1.2' -> 11.2, '11,2' -> 11.2, '4.2O' -> 4.20, 'O.85' -> 0.85
  const candidateTransforms: string[] = [];

  // Transform A: Global letter-to-digit conversion for numeric-like strings
  const fullSub = text
    .replace(/[lI|]/g, '1')
    .replace(/[oO]/g, '0')
    .replace(/(?<=\d)[sS](?=\d)/g, '5')
    .replace(/(?<=\d)[zZ](?=\d)/g, '2')
    .replace(/(?<=\d)[bB](?=\d)/g, '8')
    .replace(/,/g, '');
  candidateTransforms.push(fullSub);

  // Transform B: Targeted letter-digit substitutions
  const subCandidate = text
    .replace(/^[oO]+(?=\d|\.)/g, (m) => '0'.repeat(m.length))
    .replace(/^[lI|]+(?=\d|\.)/g, (m) => '1'.repeat(m.length))
    .replace(/(?<=\d)[oO]+(?=\d|$)/g, (m) => '0'.repeat(m.length))
    .replace(/(?<=\d)[lI|]+(?=\d|\.|$)/g, (m) => '1'.repeat(m.length))
    .replace(/,/g, '');
  candidateTransforms.push(subCandidate);

  const validCandidates: number[] = [];

  for (const candStr of candidateTransforms) {
    const match = candStr.match(/-?\d+(?:\.\d+)?/);
    if (match) {
      const parsed = parseFloat(match[0]);
      if (!isNaN(parsed) && !validCandidates.includes(parsed)) {
        validCandidates.push(parsed);
      }
    }
  }

  if (validCandidates.length > 0) {
    // Select best candidate with physiological range support
    let bestNum = validCandidates[0];
    let conf = 0.88;

    if (paramDef) {
      // Find candidate in physiological range
      const inRangeCand = validCandidates.find((c) => c >= paramDef.expectedMin && c <= paramDef.expectedMax);
      if (inRangeCand !== undefined) {
        bestNum = inRangeCand;
        conf = 0.95;
      } else {
        conf = 0.45; // Outlier -> requires user verification
      }
    }

    wasCorrected = bestNum.toString() !== text;
    return {
      value: bestNum,
      rawString: rawVal,
      corrected: wasCorrected,
      confidenceScore: conf,
      candidates: validCandidates,
    };
  }

  return { value: null, rawString: rawVal, corrected: false, confidenceScore: 0.0 };
}

/**
 * Structured Reference Interval Syntax Parser.
 * Parses intervals: '12.0 - 15.0', '12 to 16', '< 5', '> 100', '0.40 – 4.50'.
 */
export function parseReferenceInterval(rawText: string): ParsedReferenceRange | null {
  if (!rawText || typeof rawText !== 'string') return null;
  const clean = rawText.trim();

  // Pattern 1: Range Interval '12.0 - 15.0' or '12 to 16'
  const rangeMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:[-–—]|to)\s*(\d+(?:\.\d+)?)/i);
  if (rangeMatch && rangeMatch[1] && rangeMatch[2]) {
    const low = parseFloat(rangeMatch[1]);
    const high = parseFloat(rangeMatch[2]);
    if (!isNaN(low) && !isNaN(high) && low <= high) {
      return {
        rawText: clean,
        low,
        high,
      };
    }
  }

  // Pattern 2: Threshold Operator '< 100', '<= 50', '> 20'
  const threshMatch = clean.match(/^([<>]=?)\s*(\d+(?:\.\d+)?)/);
  if (threshMatch && threshMatch[1] && threshMatch[2]) {
    const operator = threshMatch[1] as '<' | '<=' | '>' | '>=';
    const threshold = parseFloat(threshMatch[2]);
    if (!isNaN(threshold)) {
      return {
        rawText: clean,
        operator,
        threshold,
      };
    }
  }

  // Pattern 3: Gender / Age stratified (e.g. '[M: 13-17, F: 12-15]')
  if (/\[.*[MF]:.*\]/i.test(clean) || /\b(male|female|adult|pediatric)\b/i.test(clean)) {
    return {
      rawText: clean,
      isStratified: true,
    };
  }

  return null;
}

/**
 * Parses and categorizes status tokens (High / Low / Normal / Critical).
 */
export function parseStatusToken(text: string): 'high' | 'low' | 'normal' | 'unknown' {
  if (!text) return 'unknown';
  const clean = text.trim().toLowerCase();
  if (/^(high|h|critical|abnormal|\+)\b/i.test(clean)) return 'high';
  if (/^(low|l|-)\b/i.test(clean)) return 'low';
  if (/^(normal|n|borderline|desirable|acceptable)\b/i.test(clean)) return 'normal';
  return 'unknown';
}

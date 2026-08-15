/**
 * Reusable Local Health-Data Extraction Service
 * 
 * Deterministically parses OCR text locally using regex patterns, metric dictionaries,
 * and unit recognition.
 * 
 * - 100% On-Device / Local execution
 * - No Gemini, external APIs, or LLMs
 * - No IndexedDB operations
 */

export interface ExtractedMetric {
  name: string;             // Standardized canonical metric name (e.g., "Hemoglobin")
  rawName: string;          // Matched text name from OCR (e.g., "HGB")
  value: number | string;   // Extracted value (numeric or string like "120/80")
  unit: string;             // Recognized unit (e.g., "g/dL", "mg/dL", "mmHg", "/uL")
  displayValue: string;     // Full display string (e.g., "12.4 g/dL")
  systolic?: number;        // For Blood Pressure
  diastolic?: number;       // For Blood Pressure
}

export interface ExtractedHealthData {
  title: string;
  reportType: 'cbc' | 'imaging' | 'cardiology' | 'general' | 'vaccine' | 'genomics' | 'other';
  metrics: ExtractedMetric[];
  results: Record<string, string>; // Compatible with DecryptedReportDetails.results & HealthReport creation
  summary: string;
}

interface MetricDefinition {
  canonicalName: string;
  aliases: string[];
  defaultUnit: string;
  category: 'cbc' | 'cardiology' | 'general' | 'other';
  // Custom parsing handler if standard numeric match isn't sufficient
  customParser?: (text: string) => ExtractedMetric | null;
}

/**
 * Metric Dictionary containing the 16 core health metrics, alias lists, and default units.
 * Ordered intentionally so specific metrics (e.g., "Fasting Glucose") take precedence over general ones ("Glucose").
 */
const METRIC_DICTIONARY: MetricDefinition[] = [
  // 1. Blood Pressure (Special composite metric)
  {
    canonicalName: 'Blood Pressure',
    aliases: ['blood pressure', 'bp', 'b.p.', 'systolic/diastolic', 'pressures'],
    defaultUnit: 'mmHg',
    category: 'cardiology',
    customParser: (text: string): ExtractedMetric | null => {
      // Matches formats like: "BP: 120/80 mmHg", "Blood Pressure 120/80", "120/80 mmHg"
      const bpRegex = /(?:b(?:lood)?\s*p(?:ressure)?|bp|b\.p\.)?\s*[:=\-]?\s*(\d{2,3})\s*[\/\\]\s*(\d{2,3})\s*(mmHg)?/i;
      const match = text.match(bpRegex);
      if (match) {
        const sys = parseInt(match[1], 10);
        const dia = parseInt(match[2], 10);
        if (sys >= 60 && sys <= 250 && dia >= 40 && dia <= 150) {
          const unit = match[3] || 'mmHg';
          return {
            name: 'Blood Pressure',
            rawName: match[0].trim(),
            value: `${sys}/${dia}`,
            unit,
            displayValue: `${sys}/${dia} ${unit}`,
            systolic: sys,
            diastolic: dia,
          };
        }
      }
      return null;
    },
  },

  // 2. Fasting Glucose (Takes precedence over generic Glucose)
  {
    canonicalName: 'Fasting Glucose',
    aliases: ['fasting blood glucose', 'fasting glucose', 'fasting blood sugar', 'fbs', 'fasting sugar'],
    defaultUnit: 'mg/dL',
    category: 'general',
  },

  // 3. Blood Glucose (General / Random)
  {
    canonicalName: 'Blood Glucose',
    aliases: ['blood glucose', 'blood sugar', 'random blood sugar', 'rbs', 'glucose', 'sugar'],
    defaultUnit: 'mg/dL',
    category: 'general',
  },

  // 4. HbA1c
  {
    canonicalName: 'HbA1c',
    aliases: ['hba1c', 'hb a1c', 'glycated hemoglobin', 'glycohemoglobin', 'a1c'],
    defaultUnit: '%',
    category: 'general',
  },

  // 5. Hemoglobin
  {
    canonicalName: 'Hemoglobin',
    aliases: ['hemoglobin', 'haemoglobin', 'hgb', 'hb'],
    defaultUnit: 'g/dL',
    category: 'cbc',
  },

  // 6. WBC (White Blood Cell)
  {
    canonicalName: 'WBC',
    aliases: ['wbc', 'white blood cell', 'white blood cells', 'white blood count', 'leukocytes', 'tlc', 'total leukocyte count'],
    defaultUnit: '/mcL',
    category: 'cbc',
  },

  // 7. Platelets
  {
    canonicalName: 'Platelets',
    aliases: ['platelets', 'platelet count', 'plt', 'platelet'],
    defaultUnit: '/mcL',
    category: 'cbc',
  },

  // 8. Vitamin D
  {
    canonicalName: 'Vitamin D',
    aliases: ['vitamin d', 'vit d', '25-hydroxy vitamin d', '25-oh vitamin d', '25-oh vit d', 'vitamin d3', '25-hydroxycholecalciferol'],
    defaultUnit: 'ng/mL',
    category: 'general',
  },

  // 9. Vitamin B12
  {
    canonicalName: 'Vitamin B12',
    aliases: ['vitamin b12', 'vit b12', 'vitamin b-12', 'vit b-12', 'cobalamin', 'cyanocobalamin'],
    defaultUnit: 'pg/mL',
    category: 'general',
  },

  // 10. Total Cholesterol
  {
    canonicalName: 'Total Cholesterol',
    aliases: ['total cholesterol', 'cholesterol total', 'serum cholesterol'],
    defaultUnit: 'mg/dL',
    category: 'cardiology',
  },

  // 11. HDL Cholesterol
  {
    canonicalName: 'HDL',
    aliases: ['hdl cholesterol', 'hdl-c', 'hdl', 'high density lipoprotein'],
    defaultUnit: 'mg/dL',
    category: 'cardiology',
  },

  // 12. LDL Cholesterol
  {
    canonicalName: 'LDL',
    aliases: ['ldl cholesterol', 'ldl-c', 'ldl', 'low density lipoprotein'],
    defaultUnit: 'mg/dL',
    category: 'cardiology',
  },

  // 13. Triglycerides
  {
    canonicalName: 'Triglycerides',
    aliases: ['triglycerides', 'triglyceride', 'tg', 'serum triglycerides'],
    defaultUnit: 'mg/dL',
    category: 'cardiology',
  },

  // 14. TSH
  {
    canonicalName: 'TSH',
    aliases: ['tsh', 'thyroid stimulating hormone', 'thyrotropin'],
    defaultUnit: 'uIU/mL',
    category: 'general',
  },

  // 15. Creatinine
  {
    canonicalName: 'Creatinine',
    aliases: ['creatinine', 'serum creatinine', 'creat'],
    defaultUnit: 'mg/dL',
    category: 'general',
  },

  // 16. Urea / BUN
  {
    canonicalName: 'Urea',
    aliases: ['blood urea nitrogen', 'bun', 'urea', 'serum urea'],
    defaultUnit: 'mg/dL',
    category: 'general',
  },
];

/**
 * Recognized measurement units map including /uL and uL
 */
const KNOWN_UNITS = [
  '/uL', 'uL', '/ul', 'ul',
  'g/dL', 'g/l', 'gm/dL', 'g%',
  'mg/dL', 'mg/l', 'mg%',
  '/mcL', 'x10^3/uL', '10^3/uL', '/cu mm', 'k/uL', 'x10e3/uL', 'cells/mcL', 'lakhs/cu mm',
  'ng/mL', 'nmol/L', 'pg/mL', 'pmol/L', 'ng/L',
  'uIU/mL', 'mIU/L', 'uU/mL', 'mcIU/mL',
  'mmHg', '%', 'mmol/L', 'mmol/mol', 'umol/L'
];

/**
 * Extracts structured health metrics from raw OCR text using deterministic parsing.
 * 
 * @param ocrText - Plain text string extracted via OCR (from image or PDF)
 * @returns ExtractedHealthData containing structured metrics, compatible results dictionary, and report title/summary.
 */
export function extractHealthData(ocrText: string): ExtractedHealthData {
  if (!ocrText || typeof ocrText !== 'string') {
    return {
      title: 'General Health Record',
      reportType: 'general',
      metrics: [],
      results: {},
      summary: 'No text available for health data extraction.',
    };
  }

  const extractedMetrics: ExtractedMetric[] = [];
  const extractedResultsMap: Record<string, string> = {};
  const processedCanonicalNames = new Set<string>();
  const processedLineIndices = new Set<number>();

  // Normalize text lines
  const lines = ocrText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  // 1. Process custom parsers first (e.g. Blood Pressure)
  const bpDef = METRIC_DICTIONARY.find((m) => m.canonicalName === 'Blood Pressure');
  if (bpDef && bpDef.customParser) {
    const bpResult = bpDef.customParser(ocrText);
    if (bpResult) {
      extractedMetrics.push(bpResult);
      extractedResultsMap[bpResult.name] = bpResult.displayValue;
      processedCanonicalNames.add(bpResult.name);
    }
  }

  // 2. Process each metric definition against the OCR text
  for (const def of METRIC_DICTIONARY) {
    if (processedCanonicalNames.has(def.canonicalName)) continue;
    if (def.customParser) continue; // Already processed above

    // Search through lines or full text for aliases
    for (const alias of def.aliases) {
      if (processedCanonicalNames.has(def.canonicalName)) break;

      // Escape special regex chars in alias
      const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Group 1: Matches complete numbers including multi-digit integers or decimals (e.g. 7200, 250000, 12.4, 6,200)
      // Group 2: Candidate unit matching non-numeric unit characters starting with letter/symbol
      const metricRegex = new RegExp(
        `(?:^|\\b|\\s)${escapedAlias}\\s*[:=\\-]?\\s*(\\d+(?:[.,]\\d+)?)\\s*([a-zA-Z%\\/^][a-zA-Z%\\/^0-9\\s]*)?(?:$|\\s|\\||,)`,
        'i'
      );

      // Search line by line first for highest accuracy
      for (let i = 0; i < lines.length; i++) {
        if (processedLineIndices.has(i)) continue; // Skip lines already claimed by higher precedence metric

        const line = lines[i];

        // Guard against generic Blood Glucose matching lines containing Fasting Glucose
        if (def.canonicalName === 'Blood Glucose' && (processedCanonicalNames.has('Fasting Glucose') || /\bfasting\b/i.test(line))) {
          continue;
        }

        const match = line.match(metricRegex);
        if (match) {
          const rawNum = match[1].replace(',', '.');
          const valNum = parseFloat(rawNum);

          if (!isNaN(valNum)) {
            // Extract or infer unit
            let detectedUnit = def.defaultUnit;
            if (match[2]) {
              const candidateUnit = match[2].trim();
              const matchedKnownUnit = KNOWN_UNITS.find(
                (u) => u.toLowerCase() === candidateUnit.toLowerCase() || candidateUnit.toLowerCase().startsWith(u.toLowerCase())
              );
              if (matchedKnownUnit) {
                detectedUnit = matchedKnownUnit;
              }
            }

            const metric: ExtractedMetric = {
              name: def.canonicalName,
              rawName: alias,
              value: valNum,
              unit: detectedUnit,
              displayValue: `${valNum} ${detectedUnit}`,
            };

            extractedMetrics.push(metric);
            extractedResultsMap[def.canonicalName] = metric.displayValue;
            processedCanonicalNames.add(def.canonicalName);
            processedLineIndices.add(i);
            break;
          }
        }
      }

      // If not matched line-by-line, attempt full text regex match
      if (!processedCanonicalNames.has(def.canonicalName)) {
        // Skip generic Blood Glucose fallback if Fasting Glucose was already found or if full text match includes "fasting"
        if (def.canonicalName === 'Blood Glucose' && (processedCanonicalNames.has('Fasting Glucose') || /\bfasting\b/i.test(ocrText))) {
          continue;
        }

        const fullMatch = ocrText.match(metricRegex);
        if (fullMatch) {
          const rawNum = fullMatch[1].replace(',', '.');
          const valNum = parseFloat(rawNum);

          if (!isNaN(valNum)) {
            let detectedUnit = def.defaultUnit;
            if (fullMatch[2]) {
              const candidateUnit = fullMatch[2].trim();
              const matchedKnownUnit = KNOWN_UNITS.find(
                (u) => u.toLowerCase() === candidateUnit.toLowerCase() || candidateUnit.toLowerCase().startsWith(u.toLowerCase())
              );
              if (matchedKnownUnit) {
                detectedUnit = matchedKnownUnit;
              }
            }

            const metric: ExtractedMetric = {
              name: def.canonicalName,
              rawName: alias,
              value: valNum,
              unit: detectedUnit,
              displayValue: `${valNum} ${detectedUnit}`,
            };

            extractedMetrics.push(metric);
            extractedResultsMap[def.canonicalName] = metric.displayValue;
            processedCanonicalNames.add(def.canonicalName);
            break;
          }
        }
      }
    }
  }

  // 3. Determine Report Category & Title
  let reportType: ExtractedHealthData['reportType'] = 'general';
  let title = 'Extracted Health Record';

  const cbcCount = extractedMetrics.filter((m) =>
    ['Hemoglobin', 'WBC', 'Platelets'].includes(m.name)
  ).length;

  const lipidCount = extractedMetrics.filter((m) =>
    ['Total Cholesterol', 'HDL', 'LDL', 'Triglycerides'].includes(m.name)
  ).length;

  const cardioCount = extractedMetrics.filter((m) =>
    ['Blood Pressure'].includes(m.name)
  ).length;

  if (cbcCount >= 2 || (cbcCount >= 1 && extractedMetrics.length <= 3)) {
    reportType = 'cbc';
    title = 'Complete Blood Count (CBC) Panel';
  } else if (lipidCount >= 2) {
    reportType = 'cardiology';
    title = 'Lipid Profile & Cholesterol Panel';
  } else if (cardioCount >= 1 && lipidCount >= 1) {
    reportType = 'cardiology';
    title = 'Cardiovascular Metrics Record';
  } else if (extractedMetrics.some((m) => m.name === 'TSH')) {
    reportType = 'general';
    title = 'Thyroid Panel (TSH)';
  } else if (extractedMetrics.some((m) => m.name.includes('Glucose') || m.name === 'HbA1c')) {
    reportType = 'general';
    title = 'Blood Glucose & Glycemic Report';
  }

  // 4. Generate Summary Text
  const summary = extractedMetrics.length > 0
    ? `Extracted ${extractedMetrics.length} health metric(s): ${extractedMetrics.map((m) => `${m.name}: ${m.displayValue}`).join(', ')}.`
    : 'No health metrics could be parsed from the provided text.';

  return {
    title,
    reportType,
    metrics: extractedMetrics,
    results: extractedResultsMap,
    summary,
  };
}

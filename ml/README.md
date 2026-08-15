# Vital Diaries — ML Dataset Generation Pipeline
# Phase 2: Synthetic Dataset for Health Metric Extraction

## Overview

This directory contains everything needed to create and manage the synthetic
training dataset for the Vital Diaries local ML extraction model.

**This directory is completely decoupled from the production application.**
It does not import from `src/`, call any external API, write to IndexedDB,
or affect the existing OCR/extraction pipeline.

---

## Directory Structure

```
ml/
├── schemas/
│   └── dataset.types.ts       # TypeScript types for all dataset structures
│
├── generator/
│   ├── metric-specs.ts        # 16 canonical metrics, aliases, value ranges, units
│   └── generator.ts           # Core: generateReport(id, seed, opts)
│
├── templates/
│   └── layout-templates.ts    # 7 OCR text layout renderers + header/footer fragments
│
├── noise/
│   └── noise-engine.ts        # Seeded OCR noise injection (char subs, deletions, etc.)
│
├── data/                      # Generated output (gitignored — large files)
│   ├── synthetic_reports.jsonl   ← 2,000 records (one JSON per line)
│   └── manifest.json             ← Distribution statistics
│
├── scripts/
│   └── generate-dataset.ts    # Entry point — run to generate the dataset
│
└── README.md                  # This file
```

---

## Dataset Record Schema

Each record in `data/synthetic_reports.jsonl` has this structure:

```json
{
  "id": "report_000001",
  "ocr_text": "Hemoglobin: 12.4 g/dL\nWBC: 7200 /uL",
  "clean_text": "Hemoglobin: 12.4 g/dL\nWBC: 7200 /uL",
  "title": "Complete Blood Count (CBC) Panel",
  "ground_truth": {
    "metrics": {
      "Hemoglobin": {
        "canonical_name": "Hemoglobin",
        "raw_name": "HGB",
        "value": 12.4,
        "unit": "g/dL",
        "display_value": "12.4 g/dL"
      }
    },
    "results": {
      "Hemoglobin": "12.4 g/dL"
    }
  },
  "metadata": {
    "template": "line_colon",
    "noise": { "level": "low", ... },
    "present_metrics": ["Hemoglobin", "WBC"],
    "metrics_count": 2,
    "report_type": "cbc",
    "generated_at": "2026-08-15T12:00:00.000Z",
    "seed": 42
  }
}
```

Key distinction: `raw_name` is the alias as it appears in `ocr_text` (e.g. "HGB"),
while `canonical_name` is the standardised name (e.g. "Hemoglobin").

---

## Noise Distribution (planned)

| Level  | Count | % of Dataset |
|--------|-------|--------------|
| none   | 600   | 30%          |
| low    | 700   | 35%          |
| medium | 500   | 25%          |
| high   | 200   | 10%          |

---

## Layout Templates

| Template           | Example                                            |
|--------------------|----------------------------------------------------|
| `line_colon`       | `Hemoglobin: 12.4 g/dL`                           |
| `line_equals`      | `HGB = 12.4 g/dL`                                 |
| `line_dash`        | `Hemoglobin - 12.4 g/dL`                          |
| `line_space`       | `Hemoglobin  12.4  g/dL`                          |
| `tabular_grid`     | `Hemoglobin           12.4          g/dL`         |
| `key_value_dotted` | `Hemoglobin ............... 12.4 g/dL`            |
| `paragraph_embedded` | `The patient's Hemoglobin level was 12.4 g/dL.` |
| `mixed`            | Different template per metric in the same report  |

---

## How to Generate the Dataset

> **Do NOT run this yet** — await review and approval first.

```bash
# Option A: tsx (fastest, no compile step)
npx tsx ml/scripts/generate-dataset.ts

# Option B: ts-node
npx ts-node ml/scripts/generate-dataset.ts
```

Output is written to `ml/data/synthetic_reports.jsonl` (~2,000 lines).

---

## Compatibility

- `GroundTruthMetric` ↔ `ExtractedMetric` (src/lib/health-extractor.ts)
- `ground_truth.results` ↔ `DecryptedReportDetails.results` (src/types/health.ts)
- `metadata.report_type` ↔ `HealthReport.type` (src/types/health.ts)

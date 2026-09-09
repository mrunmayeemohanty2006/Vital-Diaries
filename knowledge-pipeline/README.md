# Vital Diaries — Development Knowledge Research & Crawler Pipeline

> **IMPORTANT ARCHITECTURAL NOTICE**:
> This directory is a **DEVELOPMENT-ONLY** pipeline. It is **NEVER** bundled into user runtime and **NEVER** processes user health data, medical files, or personal information.

---

## Architecture Overview

```
                 DEVELOPMENT / MAINTENANCE (Offline)
                 ───────────────────────────────────
                        Trusted Medical Sources
                                   ↓
                       Development Web Crawler
                                   ↓
                          Research Extraction
                                   ↓
                         Local Research JSON
                                   ↓
                       Developer/Medical Review
                                   ↓
                      Curated Knowledge TypeScript
                                   ↓
                     Bundled into Vital Diaries Core
```

## Security & Privacy Constraints

1. **Domain Allowlist**: The crawler strictly rejects any URL not listed in `ALLOWED_DOMAINS`.
2. **Deterministic & AI-Free**: No Gemini, OpenAI, or LLMs are connected to the crawling or parsing chain.
3. **Isolation**: This pipeline is completely separate from user health records, encryption keys, OCR, and IndexedDB.
4. **Offline User Runtime**: The client application uses only the reviewed and bundled static knowledge files in `src/health-engine/knowledge/`.

## Running the Crawler

To execute the development crawler:

```bash
npm run knowledge:crawl
```

Output is saved to `knowledge-pipeline/output/hemoglobin-research.json`.

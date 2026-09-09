/**
 * Spatial Geometry & Medical Table Reconstructor (Phase 2 Enhanced)
 * 
 * Reconstructs tabular medical reports from 2D OCR word bounding boxes (x0, y0, x1, y1)
 * with robust Column-Shift Protection and Multi-Line grouping.
 * 
 * 2D Column Classification:
 * [ Parameter Name ] -> [ Result Value ] -> [ Unit ] -> [ Reference Range ] -> [ Status ]
 */

import { OCRToken } from './ocr';
import {
  matchCanonicalParameter,
  normalizeUnit,
  disambiguateNumericString,
  parseReferenceInterval,
  parseStatusToken,
  CanonicalParameter,
  ParsedReferenceRange,
} from './ocr-medical-vocab';

export interface SpatialTableCell {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

export interface ReconstructedTableRow {
  rowIndex: number;
  yCenter: number;
  rawText: string;
  parameterCell?: SpatialTableCell;
  resultCell?: SpatialTableCell;
  unitCell?: SpatialTableCell;
  referenceCell?: SpatialTableCell;
  statusCell?: SpatialTableCell;
  canonicalParameter?: CanonicalParameter;
  parsedValue?: number | null;
  normalizedUnit?: string;
  parsedReferenceRange?: string;
  structuredReferenceRange?: ParsedReferenceRange;
  parsedStatus?: 'low' | 'normal' | 'high' | 'unknown';
  rowAssociationConfidence: number;
  needsVerification?: boolean;
}

export interface TableReconstructionResult {
  rows: ReconstructedTableRow[];
  headers?: string[];
  pageWidth: number;
  pageHeight: number;
  columnBounds?: {
    paramMaxX: number;
    resultMaxX: number;
    unitMaxX: number;
    refMaxX: number;
  };
}

/**
 * Groups word tokens into physical horizontal lines based on vertical overlap and Y-proximity.
 */
export function clusterTokensIntoRows(
  tokens: OCRToken[],
  yTolerance: number = 8
): { yCenter: number; tokens: OCRToken[] }[] {
  if (!tokens || tokens.length === 0) return [];

  const sortedTokens = [...tokens].sort((a, b) => {
    const dy = a.bbox.y0 - b.bbox.y0;
    if (Math.abs(dy) > yTolerance) return dy;
    return a.bbox.x0 - b.bbox.x0;
  });

  const rowClusters: { yCenter: number; y0: number; y1: number; tokens: OCRToken[] }[] = [];

  for (const token of sortedTokens) {
    const tokenYCenter = (token.bbox.y0 + token.bbox.y1) / 2;
    const tokenHeight = token.bbox.y1 - token.bbox.y0;
    const adaptiveTolerance = Math.max(yTolerance, tokenHeight * 0.45);

    let bestCluster: (typeof rowClusters)[0] | null = null;
    let minDiff = Infinity;

    for (const cluster of rowClusters) {
      const diff = Math.abs(cluster.yCenter - tokenYCenter);
      const overlap = Math.min(cluster.y1, token.bbox.y1) - Math.max(cluster.y0, token.bbox.y0);
      if (diff <= adaptiveTolerance || overlap > 0.4 * tokenHeight) {
        if (diff < minDiff) {
          minDiff = diff;
          bestCluster = cluster;
        }
      }
    }

    if (bestCluster) {
      bestCluster.tokens.push(token);
      bestCluster.y0 = Math.min(bestCluster.y0, token.bbox.y0);
      bestCluster.y1 = Math.max(bestCluster.y1, token.bbox.y1);
      bestCluster.yCenter = (bestCluster.y0 + bestCluster.y1) / 2;
    } else {
      rowClusters.push({
        yCenter: tokenYCenter,
        y0: token.bbox.y0,
        y1: token.bbox.y1,
        tokens: [token],
      });
    }
  }

  rowClusters.sort((a, b) => a.yCenter - b.yCenter);
  for (const cluster of rowClusters) {
    cluster.tokens.sort((a, b) => a.bbox.x0 - b.bbox.x0);
  }

  return rowClusters.map((c) => ({ yCenter: c.yCenter, tokens: c.tokens }));
}

/**
 * Reconstructs tabular rows with strict Column-Shift Prevention and Spatial Association.
 */
export function reconstructMedicalTable(
  tokens: OCRToken[],
  pageWidth: number = 800,
  pageHeight: number = 1000
): TableReconstructionResult {
  const clusteredRows = clusterTokensIntoRows(tokens);
  const reconstructedRows: ReconstructedTableRow[] = [];

  let rowIndex = 0;

  for (let rIdx = 0; rIdx < clusteredRows.length; rIdx++) {
    const cluster = clusteredRows[rIdx];
    const rowTokens = cluster.tokens;
    if (rowTokens.length === 0) continue;

    const rowText = rowTokens.map((t) => t.text).join(' ');

    // 1. Identify parameter match in row tokens
    let paramMatch: CanonicalParameter | null = null;
    let paramTokenEndIdx = -1;

    for (let len = Math.min(rowTokens.length, 7); len >= 1; len--) {
      const candidateStr = rowTokens.slice(0, len).map((t) => t.text).join(' ');
      const match = matchCanonicalParameter(candidateStr);
      if (match) {
        paramMatch = match;
        paramTokenEndIdx = len;
        break;
      }
    }

    if (!paramMatch) {
      paramMatch = matchCanonicalParameter(rowText);
    }

    // 2. If this row contains a clinical parameter
    if (paramMatch) {
      rowIndex++;

      const remainingTokens = paramTokenEndIdx > 0 ? rowTokens.slice(paramTokenEndIdx) : rowTokens;

      let resultToken: OCRToken | null = null;
      let unitToken: OCRToken | null = null;
      const refRangeTokens: OCRToken[] = [];
      let statusToken: OCRToken | null = null;

      for (let i = 0; i < remainingTokens.length; i++) {
        const token = remainingTokens[i];
        const text = token.text;

        // A. Strict Status Check (High / Low / Normal / Critical)
        const parsedStat = parseStatusToken(text);
        if (parsedStat !== 'unknown' && !statusToken) {
          statusToken = token;
          continue;
        }

        // B. Strict Reference Range Check (Never assign range strings to Result)
        // Check for range patterns: '12.0 - 15.0', '12-16', '< 100', '> 20'
        if (
          /\d+(?:\.\d+)?\s*[-–—]\s*\d+(?:\.\d+)?/.test(text) ||
          /^[<>]=?\s*\d+(?:\.\d+)?$/.test(text)
        ) {
          refRangeTokens.push(token);
          continue;
        }

        // Check if next token is a range separator ('-', 'to')
        const nextToken = remainingTokens[i + 1]?.text || '';
        if (nextToken === '-' || nextToken === '–' || nextToken === '—' || nextToken === 'to') {
          refRangeTokens.push(token);
          if (remainingTokens[i + 1]) refRangeTokens.push(remainingTokens[i + 1]);
          if (remainingTokens[i + 2]) {
            refRangeTokens.push(remainingTokens[i + 2]);
            i += 2;
          } else {
            i += 1;
          }
          continue;
        }

        // C. Unit Normalization
        const normUnit = normalizeUnit(text);
        if (normUnit !== text || /^(g\/dL|mg\/dL|ug\/dL|ng\/mL|pg\/mL|uIU\/mL|cells\/uL|lakh\/uL|%|fL|pg|U\/L|mmHg|mmol\/L)$/i.test(text)) {
          if (!unitToken) {
            unitToken = token;
            continue;
          }
        }

        // D. Result Value Candidate (Guarded against Reference Range column shift)
        const disambiguated = disambiguateNumericString(text, paramMatch);
        if (disambiguated.value !== null && !resultToken) {
          // Verify that this token is not located in the far right reference-range column
          // If token X is > 75% of page width, it's likely a reference range or status
          if (token.bbox.x0 > pageWidth * 0.75 && remainingTokens.length > 2) {
            refRangeTokens.push(token);
            continue;
          }

          resultToken = token;
          continue;
        }

        // Secondary / wrapped reference interval tokens
        if (resultToken && (/\d/.test(text) || /[-–—<>]/.test(text))) {
          refRangeTokens.push(token);
        }
      }

      // Check next row for wrapped reference range tokens if current row had none
      if (refRangeTokens.length === 0 && rIdx < clusteredRows.length - 1) {
        const nextRow = clusteredRows[rIdx + 1];
        const nextRowText = nextRow.tokens.map((t) => t.text).join(' ');
        // If next row does not contain a new parameter and starts indented
        if (!matchCanonicalParameter(nextRowText) && nextRow.tokens[0]?.bbox?.x0 > pageWidth * 0.3) {
          const parsedRange = parseReferenceInterval(nextRowText);
          if (parsedRange) {
            refRangeTokens.push(...nextRow.tokens);
          }
        }
      }

      // Disambiguate numeric result
      const disambiguation = resultToken ? disambiguateNumericString(resultToken.text, paramMatch) : null;
      const parsedNum = disambiguation ? disambiguation.value : null;
      const parsedUnit = unitToken ? normalizeUnit(unitToken.text) : paramMatch.defaultUnit;
      const refRangeStr = refRangeTokens.map((t) => t.text).join(' ');
      const structuredRef = refRangeStr ? parseReferenceInterval(refRangeStr) || undefined : undefined;

      let parsedStatus: 'low' | 'normal' | 'high' | 'unknown' = 'unknown';
      if (statusToken) {
        parsedStatus = parseStatusToken(statusToken.text);
      } else if (parsedNum !== null && structuredRef) {
        if (structuredRef.low !== undefined && parsedNum < structuredRef.low) parsedStatus = 'low';
        else if (structuredRef.high !== undefined && parsedNum > structuredRef.high) parsedStatus = 'high';
        else if (structuredRef.low !== undefined && structuredRef.high !== undefined) parsedStatus = 'normal';
      }

      // Row Association Confidence
      let rowConf = 0.95;
      let needsVerification = false;

      if (resultToken && unitToken) {
        rowConf = 0.99;
      } else if (!resultToken) {
        rowConf = 0.40;
        needsVerification = true;
      } else if (disambiguation && disambiguation.confidenceScore < 0.80) {
        rowConf = 0.65;
        needsVerification = true;
      }

      reconstructedRows.push({
        rowIndex,
        yCenter: cluster.yCenter,
        rawText: rowText,
        canonicalParameter: paramMatch,
        parsedValue: parsedNum,
        normalizedUnit: parsedUnit,
        parsedReferenceRange: refRangeStr || undefined,
        structuredReferenceRange: structuredRef,
        parsedStatus,
        rowAssociationConfidence: rowConf,
        needsVerification,
      });
    }
  }

  return {
    rows: reconstructedRows,
    pageWidth,
    pageHeight,
  };
}

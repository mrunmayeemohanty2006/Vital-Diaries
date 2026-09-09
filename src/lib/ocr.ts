import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import { preprocessCanvas, DEFAULT_PREPROCESSING_CONFIG, PreprocessingConfig } from './ocr-preprocessor';
import { analyzeCanvasImageQuality, getAdaptivePreprocessingConfig, ImageQualityMetrics } from './ocr-image-analyzer';
import { reconstructMedicalTable, ReconstructedTableRow, TableReconstructionResult } from './ocr-table-reconstructor';

// Configure PDF.js worker URL for browser rendering
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.0.379'}/build/pdf.worker.min.mjs`;
}

export interface OCRToken {
  text: string;
  confidence: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

export interface OCRResult {
  text: string;
  confidence: number;
  source: 'pdf-text' | 'ocr';
  qualityMetrics?: ImageQualityMetrics;
  tokens?: OCRToken[];
  reconstructedTable?: TableReconstructionResult;
  reconstructedRows?: ReconstructedTableRow[];
  consensusSummary?: {
    totalPasses: number;
    agreementCount: number;
    conflictCount: number;
  };
  pageResults?: {
    pageNum: number;
    text: string;
    confidence: number;
    source?: 'pdf-text' | 'ocr';
    tokens?: OCRToken[];
    reconstructedTable?: TableReconstructionResult;
  }[];
}

/**
 * Supported image MIME types for local OCR.
 */
export const SUPPORTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
];

/**
 * Supported image file extensions.
 */
export const SUPPORTED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

export function isSupportedImageFile(file: File): boolean {
  if (!file) return false;
  const fileType = file.type ? file.type.toLowerCase() : '';
  if (fileType && SUPPORTED_IMAGE_TYPES.includes(fileType)) {
    return true;
  }
  const fileName = file.name ? file.name.toLowerCase() : '';
  return SUPPORTED_IMAGE_EXTENSIONS.some((ext) => fileName.endsWith(ext));
}

export function isPDFFile(file: File): boolean {
  if (!file) return false;
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

export function isSupportedFile(file: File): boolean {
  return isSupportedImageFile(file) || isPDFFile(file);
}

/**
 * Known clinical parameter keywords for PDF text layer usability validation.
 */
export const CLINICAL_PARAMETER_KEYWORDS = [
  'hemoglobin',
  'haemoglobin',
  'hgb',
  'hb',
  'rbc',
  'wbc',
  'platelet',
  'platelets',
  'plt',
  'hematocrit',
  'pcv',
  'mcv',
  'mch',
  'mchc',
  'rdw',
  'neutrophil',
  'neutrophils',
  'lymphocyte',
  'lymphocytes',
  'monocyte',
  'monocytes',
  'eosinophil',
  'eosinophils',
  'basophil',
  'basophils',
  'glucose',
  'fbs',
  'sugar',
  'cholesterol',
  'triglyceride',
  'triglycerides',
  'hdl',
  'ldl',
  'calcium',
  'iron',
  'ferritin',
  'tibc',
  'uibc',
  'transferrin',
  'tsh',
  'thyrotropin',
  'creatinine',
  'urea',
  'bun',
  'vitamin',
  'folate',
  'hba1c',
  'blood pressure',
  'bilirubin',
  'sgpt',
  'sgot',
  'alt',
  'ast',
];

export const CLINICAL_UNIT_REGEX = /\b(g\/dL|gm\/dL|mg\/dL|ug\/dL|µg\/dL|pa\/dL|mcg\/dL|ng\/mL|pg\/mL|uIU\/mL|µIU\/mL|iu\/mL|piu\/mL|mIU\/L|cells\/uL|\/uL|\/mcL|lakh\/uL|lakh\/pL|lacs\/uL|million\/uL|fL|pg|%|mmHg|mmol\/L|umol\/L|U\/L)\b/i;

export function evaluatePdfTextUsability(text: string): {
  isUsable: boolean;
  keywordCount: number;
  measurementRowCount: number;
  textLength: number;
} {
  if (!text || typeof text !== 'string') {
    return { isUsable: false, keywordCount: 0, measurementRowCount: 0, textLength: 0 };
  }
  const lower = text.toLowerCase();

  let keywordMatches = 0;
  for (const kw of CLINICAL_PARAMETER_KEYWORDS) {
    if (new RegExp(`(?:^|[\\s_(\\[,.-])${kw}(?:[\\s_:=—–\\].,-]|$|(?=\\d))`, 'i').test(lower)) {
      keywordMatches++;
    }
  }

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  let measurementRowCount = 0;

  for (const line of lines) {
    const hasNumber = /\d+(?:\.\d+)?/.test(line);
    const hasUnit = CLINICAL_UNIT_REGEX.test(line);
    if (hasNumber && hasUnit) {
      measurementRowCount++;
    }
  }

  const isUsable = keywordMatches >= 2 && measurementRowCount >= 2;
  return {
    isUsable,
    keywordCount: keywordMatches,
    measurementRowCount,
    textLength: text.length,
  };
}

export function isUsablePdfText(text: string): boolean {
  return evaluatePdfTextUsability(text).isUsable;
}

export function reconstructTextLinesFromPDFTextContent(textContent: any): string[] {
  const items = (textContent?.items || []) as Array<{ str?: string; transform?: number[] }>;
  if (!items || items.length === 0) return [];

  const lineBuckets: { y: number; items: { x: number; str: string }[] }[] = [];

  for (const item of items) {
    const str = item.str ? item.str.trim() : '';
    if (!str) continue;

    const transform = item.transform || [1, 0, 0, 1, 0, 0];
    const x = Math.round(transform[4] || 0);
    const y = Math.round(transform[5] || 0);

    let bucket = lineBuckets.find((b) => Math.abs(b.y - y) <= 3);
    if (!bucket) {
      bucket = { y, items: [] };
      lineBuckets.push(bucket);
    }
    bucket.items.push({ x, str });
  }

  lineBuckets.sort((a, b) => b.y - a.y);

  return lineBuckets.map((bucket) => {
    bucket.items.sort((a, b) => a.x - b.x);
    return bucket.items.map((i) => i.str).join('   ');
  });
}

export async function extractDirectPDFText(
  pdfDoc: any
): Promise<{ text: string; pageResults: { pageNum: number; text: string; confidence: number; source: 'pdf-text' }[] }> {
  const totalPages = pdfDoc.numPages;
  const pageResults: { pageNum: number; text: string; confidence: number; source: 'pdf-text' }[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const lines = reconstructTextLinesFromPDFTextContent(textContent);
    const pageText = lines.join('\n');

    pageResults.push({
      pageNum,
      text: pageText,
      confidence: 100,
      source: 'pdf-text',
    });
  }

  const combinedText = pageResults
    .map((p) => `--- Page ${p.pageNum} ---\n\n${p.text}`)
    .join('\n\n');

  return {
    text: combinedText,
    pageResults,
  };
}

export async function canvasToFile(canvas: HTMLCanvasElement, filename: string): Promise<File> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error(`Failed to convert canvas to Blob for ${filename}.`));
    }, 'image/png');
  });
  return new File([blob], filename, { type: 'image/png' });
}

/**
 * Clones a Canvas element.
 */
export function cloneCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const clone = document.createElement('canvas');
  clone.width = source.width;
  clone.height = source.height;
  const ctx = clone.getContext('2d');
  if (ctx) ctx.drawImage(source, 0, 0);
  return clone;
}

/**
 * Multi-Pass Targeted OCR with Quality-Driven Consensus Engine on a single Canvas:
 * 1. Analyzes image quality metrics (noise, contrast, skew).
 * 2. Pass 1: Adaptive Preprocessing + Tesseract OCR recognition.
 * 3. Pass 2: Alternate Thresholding / High-Contrast fallback.
 * 4. Multi-Pass Consensus Engine: Reconciles values and flags conflicts.
 */
export async function performTargetedMultiPassOCR(
  canvas: HTMLCanvasElement,
  language: string = 'eng',
  onProgress?: (status: string) => void
): Promise<OCRResult> {
  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;

  try {
    // 1. Analyze image quality
    const qualityMetrics = analyzeCanvasImageQuality(canvas);
    const adaptiveConfig = getAdaptivePreprocessingConfig(qualityMetrics);

    // Create canvas clone for Pass 1
    const pass1Canvas = cloneCanvas(canvas);
    onProgress?.('Applying adaptive local image preprocessing...');
    preprocessCanvas(pass1Canvas, adaptiveConfig);

    onProgress?.('Initializing Tesseract OCR worker...');
    worker = await createWorker(language);
    await worker.setParameters({
      preserve_interword_spaces: '1',
      tessedit_pageseg_mode: '6' as any,
    });

    onProgress?.('Executing primary OCR recognition pass...');
    const pass1File = await canvasToFile(pass1Canvas, 'pass1_processed.png');
    const result1 = await worker.recognize(pass1File);

    const rawText1 = result1?.data?.text || '';
    const rawConf1 = result1?.data?.confidence || 0;
    const words1 = (result1?.data as any)?.words || [];

    const ocrTokens: OCRToken[] = words1.map((w: any) => ({
      text: w.text ? w.text.trim() : '',
      confidence: Math.round((w.confidence || 0) * 100) / 100,
      bbox: {
        x0: w.bbox?.x0 ?? 0,
        y0: w.bbox?.y0 ?? 0,
        x1: w.bbox?.x1 ?? 0,
        y1: w.bbox?.y1 ?? 0,
      },
    })).filter((t: OCRToken) => t.text.length > 0);

    // 2. Spatial Table Reconstruction
    const tableResult = reconstructMedicalTable(ocrTokens, canvas.width, canvas.height);

    // 3. Optional Second-Pass Consensus on borderline confidence rows
    let agreementCount = tableResult.rows.length;
    let conflictCount = 0;

    const hasLowConfRows = tableResult.rows.some((r) => r.needsVerification || r.rowAssociationConfidence < 0.85);

    if (hasLowConfRows && qualityMetrics.recommendedPipeline !== 'low-contrast') {
      onProgress?.('Executing secondary verification OCR pass...');
      const pass2Canvas = cloneCanvas(canvas);
      preprocessCanvas(pass2Canvas, {
        scaleFactor: 3.5,
        grayscale: true,
        contrastEnhancement: true,
        sharpen: true,
        binarization: 'adaptive',
        deskew: true,
      });

      const pass2File = await canvasToFile(pass2Canvas, 'pass2_adaptive.png');
      const result2 = await worker.recognize(pass2File);
      const words2 = (result2?.data as any)?.words || [];

      const tokens2: OCRToken[] = words2.map((w: any) => ({
        text: w.text ? w.text.trim() : '',
        confidence: Math.round((w.confidence || 0) * 100) / 100,
        bbox: {
          x0: w.bbox?.x0 ?? 0,
          y0: w.bbox?.y0 ?? 0,
          x1: w.bbox?.x1 ?? 0,
          y1: w.bbox?.y1 ?? 0,
        },
      })).filter((t: OCRToken) => t.text.length > 0);

      const tableResult2 = reconstructMedicalTable(tokens2, canvas.width, canvas.height);

      // Reconcile rows between Pass 1 and Pass 2
      for (const r1 of tableResult.rows) {
        const r2 = tableResult2.rows.find((r) => r.canonicalParameter?.canonicalName === r1.canonicalParameter?.canonicalName);
        if (r2) {
          if (r1.parsedValue !== null && r2.parsedValue !== null) {
            if (r1.parsedValue === r2.parsedValue) {
              r1.rowAssociationConfidence = 0.99;
              r1.needsVerification = false;
            } else {
              // Disagreement between passes
              conflictCount++;
              agreementCount--;
              r1.needsVerification = true;
              r1.rowAssociationConfidence = 0.50;
            }
          }
        }
      }
    }

    return {
      text: rawText1,
      confidence: Math.round(rawConf1 * 100) / 100,
      source: 'ocr',
      qualityMetrics,
      tokens: ocrTokens,
      reconstructedTable: tableResult,
      reconstructedRows: tableResult.rows,
      consensusSummary: {
        totalPasses: hasLowConfRows ? 2 : 1,
        agreementCount,
        conflictCount,
      },
    };
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch (err) {
        console.warn('Warning: Failed to terminate OCR worker:', err);
      }
    }
  }
}

export async function performLocalImageOCR(
  imageFile: File,
  language: string = 'eng',
  onProgress?: (status: string) => void
): Promise<OCRResult> {
  if (!imageFile) throw new Error('No image file provided for OCR.');
  if (!isSupportedImageFile(imageFile)) {
    throw new Error(`Unsupported file format: "${imageFile.type || imageFile.name}".`);
  }

  if (typeof document !== 'undefined') {
    const img = new Image();
    const objectUrl = URL.createObjectURL(imageFile);

    try {
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (e) => reject(new Error(`Failed to decode image file: ${e}`));
        img.src = objectUrl;
      });

      const canvas = document.createElement('canvas');
      const scale = img.naturalWidth < 1200 ? 3.0 : 2.0;
      canvas.width = Math.round((img.naturalWidth || img.width) * scale);
      canvas.height = Math.round((img.naturalHeight || img.height) * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to create canvas 2D context.');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      return await performTargetedMultiPassOCR(canvas, language, onProgress);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  // Node.js fallback
  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
  try {
    worker = await createWorker(language);
    await worker.setParameters({
      preserve_interword_spaces: '1',
      tessedit_pageseg_mode: '6' as any,
    });
    const result = await worker.recognize(imageFile);
    return {
      text: result?.data?.text ? result.data.text.trim() : '',
      confidence: result?.data?.confidence || 0,
      source: 'ocr',
    };
  } finally {
    if (worker) await worker.terminate();
  }
}

export async function performLocalPDFOCR(
  pdfFile: File,
  language: string = 'eng',
  onProgress?: (status: string, currentPage?: number, totalPages?: number) => void
): Promise<OCRResult> {
  if (!pdfFile) throw new Error('No PDF file provided for OCR.');
  if (!isPDFFile(pdfFile)) throw new Error(`File "${pdfFile.name}" is not a valid PDF file.`);

  try {
    onProgress?.('Loading PDF document in browser...');
    const arrayBuffer = await pdfFile.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;
    const totalPages = pdfDoc.numPages;

    if (totalPages === 0) throw new Error('PDF file has 0 pages.');

    const pageResults: {
      pageNum: number;
      text: string;
      confidence: number;
      textLength: number;
      source: 'ocr';
      tokens?: OCRToken[];
      reconstructedTable?: TableReconstructionResult;
    }[] = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      onProgress?.(`Processing page ${pageNum} of ${totalPages}...`, pageNum, totalPages);

      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 3.0 });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) throw new Error(`Failed to create 2D context for PDF page ${pageNum}.`);

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      }).promise;

      const pageOcr = await performTargetedMultiPassOCR(canvas, language, (st) => onProgress?.(st, pageNum, totalPages));

      pageResults.push({
        pageNum,
        text: pageOcr.text,
        confidence: pageOcr.confidence,
        textLength: pageOcr.text.length,
        tokens: pageOcr.tokens,
        reconstructedTable: pageOcr.reconstructedTable,
        source: 'ocr',
      });
    }

    const combinedText = pageResults
      .map((p) => `--- Page ${p.pageNum} ---\n\n${p.text}`)
      .join('\n\n');

    const totalLength = pageResults.reduce((sum, p) => sum + p.textLength, 0);
    const sumWeighted = pageResults.reduce((sum, p) => sum + p.confidence * p.textLength, 0);
    const weightedConfidence = totalLength > 0 ? Math.round((sumWeighted / totalLength) * 100) / 100 : 0;

    return {
      text: combinedText,
      confidence: weightedConfidence,
      source: 'ocr',
      pageResults,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Local PDF OCR failed: ${message}`);
  }
}

export async function performLocalPDFExtraction(
  pdfFile: File,
  language: string = 'eng',
  onProgress?: (status: string, currentPage?: number, totalPages?: number) => void
): Promise<OCRResult> {
  if (!pdfFile) throw new Error('No PDF file provided for extraction.');
  if (!isPDFFile(pdfFile)) throw new Error(`File "${pdfFile.name}" is not a valid PDF file.`);

  try {
    onProgress?.('Checking native PDF text stream...');
    const arrayBuffer = await pdfFile.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;

    if (pdfDoc.numPages === 0) throw new Error('PDF file has 0 pages.');

    const directTextResult = await extractDirectPDFText(pdfDoc);
    const evalRes = evaluatePdfTextUsability(directTextResult.text);

    if (evalRes.isUsable) {
      onProgress?.('Extracted text directly from PDF text layer.');
      return {
        text: directTextResult.text,
        confidence: 100,
        source: 'pdf-text',
        pageResults: directTextResult.pageResults,
      };
    }
  } catch (directTextError) {
    console.warn('[PDF Ingestion] Direct PDF text extraction error, falling back to OCR:', directTextError);
  }

  return performLocalPDFOCR(pdfFile, language, onProgress);
}

export async function performLocalOCR(
  file: File,
  language: string = 'eng',
  onProgress?: (status: string, currentPage?: number, totalPages?: number) => void
): Promise<OCRResult> {
  if (isPDFFile(file)) {
    return performLocalPDFExtraction(file, language, onProgress);
  } else if (isSupportedImageFile(file)) {
    return performLocalImageOCR(file, language, (status) => onProgress?.(status));
  } else {
    throw new Error(`Unsupported file type: "${file.name}".`);
  }
}

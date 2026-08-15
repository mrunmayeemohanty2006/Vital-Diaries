import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker URL for browser rendering
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.0.379'}/build/pdf.worker.min.mjs`;
}

export interface OCRResult {
  text: string;
  confidence: number;
  pageResults?: {
    pageNum: number;
    text: string;
    confidence: number;
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

/**
 * Validates whether an input file is a supported image format.
 */
export function isSupportedImageFile(file: File): boolean {
  if (!file) return false;
  const fileType = file.type ? file.type.toLowerCase() : '';
  if (fileType && SUPPORTED_IMAGE_TYPES.includes(fileType)) {
    return true;
  }
  const fileName = file.name ? file.name.toLowerCase() : '';
  return SUPPORTED_IMAGE_EXTENSIONS.some((ext) => fileName.endsWith(ext));
}

/**
 * Checks if the file is a PDF.
 */
export function isPDFFile(file: File): boolean {
  if (!file) return false;
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

/**
 * Checks if the file format is supported (PNG, JPG, JPEG, WEBP, PDF).
 */
export function isSupportedFile(file: File): boolean {
  return isSupportedImageFile(file) || isPDFFile(file);
}

/**
 * Performs local optical character recognition (OCR) on an image file entirely in the browser using Tesseract.js.
 */
export async function performLocalImageOCR(
  imageFile: File,
  language: string = 'eng',
  onProgress?: (status: string) => void
): Promise<OCRResult> {
  if (!imageFile) {
    throw new Error('No image file provided for OCR.');
  }

  if (!isSupportedImageFile(imageFile)) {
    throw new Error(
      `Unsupported file format: "${imageFile.type || imageFile.name}". Supported formats are PNG, JPG, JPEG, and WEBP.`
    );
  }

  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;

  try {
    onProgress?.('Initializing Tesseract OCR worker...');
    worker = await createWorker(language);

    onProgress?.('Recognizing text in image...');
    const result = await worker.recognize(imageFile);

    const text = result?.data?.text ? result.data.text.trim() : '';
    const rawConfidence = result?.data?.confidence;
    const confidence = typeof rawConfidence === 'number' && !isNaN(rawConfidence)
      ? Math.round(rawConfidence * 100) / 100
      : 0;

    return { text, confidence };
  } catch (error) {
    console.error('Local image OCR execution error:', error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Local OCR failed: ${message}`);
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch (termError) {
        console.warn('Warning: Failed to terminate Tesseract worker:', termError);
      }
    }
  }
}

/**
 * Performs local optical character recognition (OCR) on a multi-page PDF file entirely in the browser.
 * Renders each page to a canvas locally using PDF.js and runs Tesseract.js on every page.
 */
export async function performLocalPDFOCR(
  pdfFile: File,
  language: string = 'eng',
  onProgress?: (status: string, currentPage?: number, totalPages?: number) => void
): Promise<OCRResult> {
  if (!pdfFile) {
    throw new Error('No PDF file provided for OCR.');
  }

  if (!isPDFFile(pdfFile)) {
    throw new Error(`File "${pdfFile.name}" is not a valid PDF file.`);
  }

  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;

  try {
    onProgress?.('Loading PDF document in browser...');
    const arrayBuffer = await pdfFile.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;
    const totalPages = pdfDoc.numPages;

    if (totalPages === 0) {
      throw new Error('PDF file has 0 pages.');
    }

    onProgress?.('Initializing Tesseract OCR worker for PDF pages...', 0, totalPages);
    worker = await createWorker(language);

    const pageResults: { pageNum: number; text: string; confidence: number; textLength: number }[] = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      onProgress?.(`Processing page ${pageNum} of ${totalPages}...`, pageNum, totalPages);

      const page = await pdfDoc.getPage(pageNum);
      // Scale 2.0 provides crisp image resolution for OCR accuracy
      const viewport = page.getViewport({ scale: 2.0 });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error(`Failed to create 2D canvas context for PDF page ${pageNum}.`);
      }

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      }).promise;

      // Convert canvas render to Blob for Tesseract.js
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error(`Failed to convert canvas to Blob for page ${pageNum}.`));
        }, 'image/png');
      });

      const pageFile = new File([blob], `page_${pageNum}.png`, { type: 'image/png' });
      const ocrResult = await worker.recognize(pageFile);

      const pageText = ocrResult?.data?.text ? ocrResult.data.text.trim() : '';
      const rawConf = ocrResult?.data?.confidence;
      const pageConfidence = typeof rawConf === 'number' && !isNaN(rawConf)
        ? Math.round(rawConf * 100) / 100
        : 0;

      pageResults.push({
        pageNum,
        text: pageText,
        confidence: pageConfidence,
        textLength: pageText.length,
      });
    }

    // Format final extracted text preserving page boundaries:
    // --- Page 1 ---
    // [OCR text from page 1]
    // --- Page 2 ---
    // [OCR text from page 2]
    const combinedText = pageResults
      .map((p) => `--- Page ${p.pageNum} ---\n\n${p.text}`)
      .join('\n\n');

    // Calculate weighted average confidence based on amount of recognized text per page
    const totalLength = pageResults.reduce((sum, p) => sum + p.textLength, 0);
    let weightedConfidence = 0;

    if (totalLength > 0) {
      const sumWeighted = pageResults.reduce((sum, p) => sum + p.confidence * p.textLength, 0);
      weightedConfidence = Math.round((sumWeighted / totalLength) * 100) / 100;
    } else {
      const sumConf = pageResults.reduce((sum, p) => sum + p.confidence, 0);
      weightedConfidence = Math.round((sumConf / pageResults.length) * 100) / 100;
    }

    return {
      text: combinedText,
      confidence: weightedConfidence,
      pageResults: pageResults.map(({ pageNum, text, confidence }) => ({ pageNum, text, confidence })),
    };
  } catch (error) {
    console.error('Local PDF OCR execution error:', error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Local PDF OCR failed: ${message}`);
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch (termErr) {
        console.warn('Warning: Failed to terminate Tesseract worker:', termErr);
      }
    }
  }
}

/**
 * Main entry point for performing local OCR on images or multi-page PDFs entirely in the browser.
 */
export async function performLocalOCR(
  file: File,
  language: string = 'eng',
  onProgress?: (status: string, currentPage?: number, totalPages?: number) => void
): Promise<OCRResult> {
  if (isPDFFile(file)) {
    return performLocalPDFOCR(file, language, onProgress);
  } else if (isSupportedImageFile(file)) {
    return performLocalImageOCR(file, language, (status) => onProgress?.(status));
  } else {
    throw new Error(
      `Unsupported file type: "${file.name}". Supported formats are PNG, JPG, JPEG, WEBP, and PDF.`
    );
  }
}

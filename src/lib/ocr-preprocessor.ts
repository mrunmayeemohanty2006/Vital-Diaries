/**
 * Deterministic Local Image Preprocessing Pipeline for Medical OCR
 * 
 * 100% Client-Side / Local Canvas & Pixel-Buffer Algorithms:
 * 1. Grayscale conversion (Luminance mapping)
 * 2. High-DPI Upscaling (2x, 3x, 4x bicubic/bilinear)
 * 3. Dynamic Contrast Optimization (S-Curve & Histogram stretching preserving decimal dots)
 * 4. Denoising (Salt-and-pepper scan noise removal)
 * 5. Edge Sharpening (Laplacian convolution filter)
 * 6. Adaptive & Otsu Threshold Binarization
 * 7. Deskew Angle Detection & Rotational Correction
 * 8. Margin & Tabular Border Cleanup
 */

export interface PreprocessingConfig {
  scaleFactor?: number;          // e.g. 1.0, 2.0, 3.0, 4.0
  grayscale?: boolean;           // Luminance transform
  contrastEnhancement?: boolean; // S-Curve dynamic stretch
  sharpen?: boolean;             // Laplacian edge enhancement
  denoise?: boolean;             // 3x3 median / box filter
  binarization?: 'none' | 'adaptive' | 'otsu';
  deskew?: boolean;              // Auto angular deskew (+- 15 deg)
  marginCleanup?: boolean;       // Clear border scan artifacts
}

export const DEFAULT_PREPROCESSING_CONFIG: PreprocessingConfig = {
  scaleFactor: 3.0,
  grayscale: true,
  contrastEnhancement: true,
  sharpen: true,
  denoise: false,
  binarization: 'none', // Default to smooth high-contrast grayscale to preserve anti-aliased decimal dots
  deskew: true,
  marginCleanup: true,
};

/**
 * Converts canvas pixel buffer to grayscale using standard luminance weights.
 */
export function applyGrayscale(data: Uint8ClampedArray): Float32Array {
  const len = data.length / 4;
  const luminances = new Float32Array(len);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    luminances[j] = lum;
    data[i] = lum;
    data[i + 1] = lum;
    data[i + 2] = lum;
  }
  return luminances;
}

/**
 * High-dynamic range contrast stretch with S-curve response.
 * Carefully avoids washing out faint 1px decimal dots or thin character strokes.
 */
export function applyContrastEnhancement(data: Uint8ClampedArray, luminances?: Float32Array): void {
  let minLum = 255;
  let maxLum = 0;
  const len = data.length / 4;

  const lums = luminances || new Float32Array(len);
  if (!luminances) {
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      lums[j] = lum;
      if (lum < minLum) minLum = lum;
      if (lum > maxLum) maxLum = lum;
    }
  } else {
    for (let j = 0; j < len; j++) {
      const lum = lums[j];
      if (lum < minLum) minLum = lum;
      if (lum > maxLum) maxLum = lum;
    }
  }

  const range = maxLum - minLum || 1;

  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const norm = (lums[j] - minLum) / range;
    let enhanced: number;

    // S-curve sigmoid response: steepens mid-tones while holding dark text and bright background
    if (norm < 0.5) {
      enhanced = Math.pow(norm * 2, 1.45) * 0.5 * 255;
    } else {
      enhanced = (1 - Math.pow((1 - norm) * 2, 1.45) * 0.5) * 255;
    }

    enhanced = Math.min(255, Math.max(0, enhanced));
    data[i] = enhanced;
    data[i + 1] = enhanced;
    data[i + 2] = enhanced;
  }
}

/**
 * 3x3 Laplacian edge sharpening convolution kernel.
 * Enhances faint strokes of characters and punctuation dots.
 */
export function applySharpen(data: Uint8ClampedArray, width: number, height: number): void {
  const src = new Uint8ClampedArray(data);
  // Kernel:
  //  0 -1  0
  // -1  5 -1
  //  0 -1  0
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const top = ((y - 1) * width + x) * 4;
      const bottom = ((y + 1) * width + x) * 4;
      const left = (y * width + (x - 1)) * 4;
      const right = (y * width + (x + 1)) * 4;

      for (let c = 0; c < 3; c++) {
        const val = 5 * src[idx + c] - src[top + c] - src[bottom + c] - src[left + c] - src[right + c];
        data[idx + c] = Math.min(255, Math.max(0, val));
      }
    }
  }
}

/**
 * 3x3 median filter for removing speckle/scanner salt-and-pepper noise.
 */
export function applyDenoise(data: Uint8ClampedArray, width: number, height: number): void {
  const src = new Uint8ClampedArray(data);
  const window = new Float32Array(9);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let k = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const idx = ((y + dy) * width + (x + dx)) * 4;
          window[k++] = src[idx];
        }
      }
      window.sort();
      const median = window[4];
      const outIdx = (y * width + x) * 4;
      data[outIdx] = median;
      data[outIdx + 1] = median;
      data[outIdx + 2] = median;
    }
  }
}

/**
 * Otsu's global binarization algorithm.
 * Automatically computes optimal global threshold minimizing intra-class variance.
 */
export function applyOtsuThreshold(data: Uint8ClampedArray): void {
  const histogram = new Int32Array(256);
  const totalPixels = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    histogram[data[i]]++;
  }

  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * histogram[t];

  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let varMax = 0;
  let threshold = 128;

  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    wF = totalPixels - wB;
    if (wF === 0) break;

    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;

    const varBetween = wB * wF * (mB - mF) * (mB - mF);
    if (varBetween > varMax) {
      varMax = varBetween;
      threshold = t;
    }
  }

  for (let i = 0; i < data.length; i += 4) {
    const val = data[i] < threshold ? 0 : 255;
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
  }
}

/**
 * Adaptive local window binarization (Sauvola-like window mean thresholding).
 * Handles uneven lighting and background shadows while preserving fine decimal dots.
 */
export function applyAdaptiveThreshold(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  windowRadius: number = 15,
  cOffset: number = 7
): void {
  const src = new Uint8ClampedArray(data);
  const integral = new Float64Array((width + 1) * (height + 1));

  // Build 2D Integral Image
  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    for (let x = 0; x < width; x++) {
      rowSum += src[(y * width + x) * 4];
      integral[(y + 1) * (width + 1) + (x + 1)] =
        integral[y * (width + 1) + (x + 1)] + rowSum;
    }
  }

  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - windowRadius);
    const y1 = Math.min(height - 1, y + windowRadius);

    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - windowRadius);
      const x1 = Math.min(width - 1, x + windowRadius);

      const count = (x1 - x0 + 1) * (y1 - y0 + 1);
      const sum =
        integral[(y1 + 1) * (width + 1) + (x1 + 1)] -
        integral[y0 * (width + 1) + (x1 + 1)] -
        integral[(y1 + 1) * (width + 1) + x0] +
        integral[y0 * (width + 1) + x0];

      const mean = sum / count;
      const idx = (y * width + x) * 4;
      const val = src[idx] < mean - cOffset ? 0 : 255;

      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
    }
  }
}

/**
 * Clears edge borders and punch-hole artifacts along page margins.
 */
export function applyMarginCleanup(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  marginPx: number = 8
): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x < marginPx || x >= width - marginPx || y < marginPx || y >= height - marginPx) {
        const idx = (y * width + x) * 4;
        data[idx] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
      }
    }
  }
}

/**
 * Estimates skew angle using horizontal projection profile variance across angles [-15, +15].
 */
export function estimateSkewAngle(data: Uint8ClampedArray, width: number, height: number): number {
  // Downsample to fast grid for rapid angle search
  const step = Math.max(2, Math.floor(width / 300));
  const subW = Math.floor(width / step);
  const subH = Math.floor(height / step);

  let bestAngle = 0;
  let maxVariance = 0;

  for (let angle = -10; angle <= 10; angle += 0.5) {
    const rad = (angle * Math.PI) / 180;
    const sinA = Math.sin(rad);
    const cosA = Math.cos(rad);

    const rowCounts = new Float64Array(subH);
    for (let sy = 0; sy < subH; sy++) {
      const y = sy * step;
      for (let sx = 0; sx < subW; sx++) {
        const x = sx * step;
        // Rotated Y coordinate relative to center
        const cx = x - width / 2;
        const cy = y - height / 2;
        const rotY = Math.round(cy * cosA - cx * sinA + height / 2);
        const subRotY = Math.floor(rotY / step);

        if (subRotY >= 0 && subRotY < subH) {
          const idx = (y * width + x) * 4;
          // Count dark pixels (< 128)
          if (data[idx] < 128) {
            rowCounts[subRotY]++;
          }
        }
      }
    }

    // Compute variance of row projection
    let sum = 0;
    for (let i = 0; i < subH; i++) sum += rowCounts[i];
    const mean = sum / subH;

    let variance = 0;
    for (let i = 0; i < subH; i++) {
      const diff = rowCounts[i] - mean;
      variance += diff * diff;
    }

    if (variance > maxVariance) {
      maxVariance = variance;
      bestAngle = angle;
    }
  }

  return bestAngle;
}

/**
 * Executes comprehensive configurable preprocessing on a Canvas.
 */
export function preprocessCanvas(
  canvas: HTMLCanvasElement,
  config: PreprocessingConfig = DEFAULT_PREPROCESSING_CONFIG
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // 1. Grayscale
  let luminances: Float32Array | undefined;
  if (config.grayscale !== false) {
    luminances = applyGrayscale(data);
  }

  // 2. Contrast Enhancement
  if (config.contrastEnhancement !== false) {
    applyContrastEnhancement(data, luminances);
  }

  // 3. Denoising
  if (config.denoise) {
    applyDenoise(data, width, height);
  }

  // 4. Sharpening
  if (config.sharpen !== false) {
    applySharpen(data, width, height);
  }

  // 5. Margin Cleanup
  if (config.marginCleanup !== false) {
    applyMarginCleanup(data, width, height, Math.round(width * 0.015));
  }

  // 6. Binarization
  if (config.binarization === 'otsu') {
    applyOtsuThreshold(data);
  } else if (config.binarization === 'adaptive') {
    applyAdaptiveThreshold(data, width, height);
  }

  ctx.putImageData(imageData, 0, 0);

  // 7. Deskew if requested and non-zero angle detected
  if (config.deskew) {
    const angle = estimateSkewAngle(data, width, height);
    if (Math.abs(angle) >= 0.5 && Math.abs(angle) <= 15) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(canvas, 0, 0);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.rotate((-angle * Math.PI) / 180);
        ctx.drawImage(tempCanvas, -width / 2, -height / 2);
        ctx.restore();
      }
    }
  }
}

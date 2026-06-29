export interface ImageQualityReport {
  isValid: boolean;
  width: number;
  height: number;
  sharpnessScore: number;
  contrastScore: number;
  issues: string[];
}

const MIN_WIDTH = 1024;
const MIN_HEIGHT = 768;
const MIN_SHARPNESS_SCORE = 12;
const MIN_CONTRAST_SCORE = 28;

function computeContrast(lumaValues: Uint8ClampedArray): number {
  const length = lumaValues.length;
  if (length === 0) {
    return 0;
  }

  let sum = 0;
  for (let i = 0; i < length; i += 1) {
    sum += lumaValues[i] as number;
  }

  const mean = sum / length;
  let variance = 0;

  for (let i = 0; i < length; i += 1) {
    const diff = (lumaValues[i] as number) - mean;
    variance += diff * diff;
  }

  return Math.sqrt(variance / length);
}

function computeSharpness(
  lumaValues: Uint8ClampedArray,
  width: number,
  height: number
): number {
  if (width < 3 || height < 3) {
    return 0;
  }

  // Lightweight Laplacian-style estimator over luma values.
  let totalResponse = 0;
  let sampleCount = 0;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const idx = y * width + x;
      const center = lumaValues[idx] as number;
      const top = lumaValues[idx - width] as number;
      const right = lumaValues[idx + 1] as number;
      const bottom = lumaValues[idx + width] as number;
      const left = lumaValues[idx - 1] as number;

      const laplacian = Math.abs(4 * center - top - right - bottom - left);
      totalResponse += laplacian;
      sampleCount += 1;
    }
  }

  if (sampleCount === 0) {
    return 0;
  }

  return totalResponse / sampleCount;
}

export async function validateReceiptImageQuality(file: File): Promise<ImageQualityReport> {
  const imageBitmap = await createImageBitmap(file);

  const width = imageBitmap.width;
  const height = imageBitmap.height;

  const downscaleRatio = Math.max(width / 1200, height / 1200, 1);
  const sampleWidth = Math.max(1, Math.round(width / downscaleRatio));
  const sampleHeight = Math.max(1, Math.round(height / downscaleRatio));

  const canvas = document.createElement('canvas');
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;

  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    imageBitmap.close();
    return {
      isValid: false,
      width,
      height,
      sharpnessScore: 0,
      contrastScore: 0,
      issues: ['Image analysis is unavailable in this browser session.'],
    };
  }

  context.drawImage(imageBitmap, 0, 0, sampleWidth, sampleHeight);
  imageBitmap.close();

  const { data } = context.getImageData(0, 0, sampleWidth, sampleHeight);
  const lumaValues = new Uint8ClampedArray(sampleWidth * sampleHeight);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] as number;
    const g = data[i + 1] as number;
    const b = data[i + 2] as number;
    lumaValues[i / 4] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  const sharpnessScore = computeSharpness(lumaValues, sampleWidth, sampleHeight);
  const contrastScore = computeContrast(lumaValues);

  const issues: string[] = [];

  if (width < MIN_WIDTH || height < MIN_HEIGHT) {
    issues.push(
      `Image resolution is too low (${width}x${height}). Minimum is ${MIN_WIDTH}x${MIN_HEIGHT}.`
    );
  }

  if (sharpnessScore < MIN_SHARPNESS_SCORE) {
    issues.push('Image appears blurry. Please retake with steadier focus and lighting.');
  }

  if (contrastScore < MIN_CONTRAST_SCORE) {
    issues.push('Image contrast is too low. Improve lighting and avoid glare on the receipt.');
  }

  return {
    isValid: issues.length === 0,
    width,
    height,
    sharpnessScore,
    contrastScore,
    issues,
  };
}

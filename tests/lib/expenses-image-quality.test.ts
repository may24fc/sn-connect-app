import { validateReceiptImageQuality } from '@/lib/expenses/image-quality';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function buildImageData(
  width: number,
  height: number,
  mode: 'flat' | 'checkerboard' | 'gradient'
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4;
      const value =
        mode === 'flat'
          ? 128
          : mode === 'gradient'
            ? Math.round((x / Math.max(1, width - 1)) * 255)
            : (x + y) % 2 === 0
              ? 0
              : 255;

      data[idx] = value;
      data[idx + 1] = value;
      data[idx + 2] = value;
      data[idx + 3] = 255;
    }
  }

  return data;
}

describe('validateReceiptImageQuality', () => {
  const originalCreateElement = document.createElement.bind(document);

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects low-resolution images', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({
        width: 700,
        height: 500,
        close: vi.fn(),
      }))
    );

    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName !== 'canvas') {
        return originalCreateElement(tagName as keyof HTMLElementTagNameMap);
      }

      return {
        width: 0,
        height: 0,
        getContext: vi.fn(() => ({
          drawImage: vi.fn(),
          getImageData: vi.fn(() => ({ data: buildImageData(700, 500, 'checkerboard') })),
        })),
      } as unknown as HTMLCanvasElement;
    }) as typeof document.createElement);

    const report = await validateReceiptImageQuality(
      new File(['img'], 'receipt.jpg', { type: 'image/jpeg' })
    );

    expect(report.isValid).toBe(false);
    expect(report.issues.some((issue) => issue.includes('resolution is too low'))).toBe(true);
  });

  it('rejects blurry and low-contrast images', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({
        width: 1400,
        height: 1000,
        close: vi.fn(),
      }))
    );

    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName !== 'canvas') {
        return originalCreateElement(tagName as keyof HTMLElementTagNameMap);
      }

      return {
        width: 0,
        height: 0,
        getContext: vi.fn(() => ({
          drawImage: vi.fn(),
          getImageData: vi.fn(() => ({ data: buildImageData(1200, 857, 'flat') })),
        })),
      } as unknown as HTMLCanvasElement;
    }) as typeof document.createElement);

    const report = await validateReceiptImageQuality(
      new File(['img'], 'receipt.jpg', { type: 'image/jpeg' })
    );

    expect(report.isValid).toBe(false);
    expect(report.issues.some((issue) => issue.includes('blurry'))).toBe(true);
    expect(report.issues.some((issue) => issue.includes('contrast'))).toBe(true);
  });

  it('accepts high-quality images', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({
        width: 1400,
        height: 1000,
        close: vi.fn(),
      }))
    );

    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName !== 'canvas') {
        return originalCreateElement(tagName as keyof HTMLElementTagNameMap);
      }

      return {
        width: 0,
        height: 0,
        getContext: vi.fn(() => ({
          drawImage: vi.fn(),
          getImageData: vi.fn(() => ({ data: buildImageData(1200, 857, 'checkerboard') })),
        })),
      } as unknown as HTMLCanvasElement;
    }) as typeof document.createElement);

    const report = await validateReceiptImageQuality(
      new File(['img'], 'receipt.jpg', { type: 'image/jpeg' })
    );

    expect(report.isValid).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it('accepts a clear portrait phone receipt with a 600px short side', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 600, height: 1100, close: vi.fn() }))
    );
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName !== 'canvas') return originalCreateElement(tagName as keyof HTMLElementTagNameMap);
      return {
        width: 0,
        height: 0,
        getContext: vi.fn(() => ({
          drawImage: vi.fn(),
          getImageData: vi.fn(() => ({ data: buildImageData(600, 1100, 'checkerboard') })),
        })),
      } as unknown as HTMLCanvasElement;
    }) as typeof document.createElement);

    const report = await validateReceiptImageQuality(
      new File(['img'], 'portrait-receipt.jpg', { type: 'image/jpeg' })
    );
    expect(report.isValid).toBe(true);
  });

  function mockImage(width: number, height: number, mode: 'flat' | 'checkerboard' | 'gradient') {
    const ratio = Math.max(width / 1200, height / 1200, 1);
    const sampleWidth = Math.round(width / ratio);
    const sampleHeight = Math.round(height / ratio);
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width, height, close: vi.fn() })));
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName !== 'canvas') return originalCreateElement(tagName as keyof HTMLElementTagNameMap);
      return {
        width: 0,
        height: 0,
        getContext: vi.fn(() => ({
          drawImage: vi.fn(),
          getImageData: vi.fn(() => ({ data: buildImageData(sampleWidth, sampleHeight, mode) })),
        })),
      } as unknown as HTMLCanvasElement;
    }) as typeof document.createElement);
  }

  it('accepts the 600x820 phone scan from Finance testing', async () => {
    mockImage(600, 820, 'checkerboard');
    const report = await validateReceiptImageQuality(
      new File(['img'], 'phone-scan.jpg', { type: 'image/jpeg' })
    );
    expect(report.isValid).toBe(true);
  });

  it('does not reject a clean high-resolution digital receipt as blurry', async () => {
    mockImage(1240, 1754, 'gradient');
    const report = await validateReceiptImageQuality(
      new File(['img'], 'digital-receipt.png', { type: 'image/png' })
    );
    expect(report.sharpnessScore).toBeLessThan(6);
    expect(report.isValid).toBe(true);
  });

  it('still rejects a soft phone-resolution photo as blurry', async () => {
    mockImage(1100, 800, 'gradient');
    const report = await validateReceiptImageQuality(
      new File(['img'], 'soft-photo.jpg', { type: 'image/jpeg' })
    );
    expect(report.issues.some((issue) => issue.includes('blurry'))).toBe(true);
  });
});

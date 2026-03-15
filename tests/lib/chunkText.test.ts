import { describe, expect, it } from 'vitest';
import { chunkText } from '../../packages/ai/src/drive-chunking';

describe('chunkText', () => {
  it('returns an empty array for empty string', () => {
    expect(chunkText('')).toEqual([]);
  });

  it('returns an empty array for whitespace-only string', () => {
    expect(chunkText('   \n\t  ')).toEqual([]);
  });

  it('returns a single chunk for text shorter than chunkSize', () => {
    const result = chunkText('Hello world', { chunkSize: 1000, overlap: 200 });
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Hello world');
    expect(result[0].index).toBe(0);
    expect(result[0].startOffset).toBe(0);
    expect(result[0].endOffset).toBe(11);
  });

  it('returns a single chunk when text equals chunkSize', () => {
    const text = 'a'.repeat(1000);
    const result = chunkText(text, { chunkSize: 1000, overlap: 200 });
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe(text);
  });

  it('chunks long text with correct overlap', () => {
    const text = 'a'.repeat(2000);
    const result = chunkText(text, { chunkSize: 1000, overlap: 200 });

    expect(result).toHaveLength(3);

    expect(result[0].startOffset).toBe(0);
    expect(result[0].endOffset).toBe(1000);
    expect(result[0].text.length).toBe(1000);

    expect(result[1].startOffset).toBe(800);
    expect(result[1].endOffset).toBe(1800);
    expect(result[1].text.length).toBe(1000);

    expect(result[2].startOffset).toBe(1600);
    expect(result[2].endOffset).toBe(2000);
    expect(result[2].text.length).toBe(400);
  });

  it('handles overlap of zero', () => {
    const text = 'a'.repeat(2500);
    const result = chunkText(text, { chunkSize: 1000, overlap: 0 });
    expect(result).toHaveLength(3);
    expect(result[0].startOffset).toBe(0);
    expect(result[1].startOffset).toBe(1000);
    expect(result[2].startOffset).toBe(2000);
    expect(result[2].endOffset).toBe(2500);
  });

  it('preserves sequential index values', () => {
    const text = 'x'.repeat(5000);
    const result = chunkText(text);
    for (let i = 0; i < result.length; i++) {
      expect(result[i].index).toBe(i);
    }
  });

  it('uses default options (1000 chars, 200 overlap)', () => {
    const text = 'b'.repeat(1500);
    const result = chunkText(text);
    expect(result).toHaveLength(2);
    expect(result[0].text.length).toBe(1000);
    expect(result[1].startOffset).toBe(800);
  });

  it('handles very short text correctly', () => {
    const result = chunkText('Short');
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Short');
  });

  it('handles very long strings without stack overflow', () => {
    const text = 'c'.repeat(1_000_000);
    const result = chunkText(text, { chunkSize: 1000, overlap: 200 });
    expect(result.length).toBeGreaterThan(1000);
    expect(result[result.length - 1].endOffset).toBe(1_000_000);
  });

  it('throws on non-positive chunkSize', () => {
    expect(() => chunkText('test', { chunkSize: 0 })).toThrow(
      'chunkSize must be a positive number',
    );
    expect(() => chunkText('test', { chunkSize: -1 })).toThrow(
      'chunkSize must be a positive number',
    );
  });

  it('throws on negative overlap', () => {
    expect(() => chunkText('test', { overlap: -1 })).toThrow(
      'overlap must be non-negative',
    );
  });

  it('throws when overlap >= chunkSize', () => {
    expect(() =>
      chunkText('test', { chunkSize: 100, overlap: 100 }),
    ).toThrow('overlap must be less than chunkSize');
    expect(() =>
      chunkText('test', { chunkSize: 100, overlap: 150 }),
    ).toThrow('overlap must be less than chunkSize');
  });

  it('consecutive chunks share overlapping text', () => {
    const text = 'The quick brown fox jumps over the lazy dog. '.repeat(50);
    const result = chunkText(text, { chunkSize: 200, overlap: 50 });

    for (let i = 1; i < result.length; i++) {
      const prevEnd = result[i - 1].text.slice(-50);
      const currStart = result[i].text.slice(0, 50);
      expect(currStart).toBe(prevEnd);
    }
  });
});

/**
 * Options for the character-based sliding-window text chunker.
 */
export interface ChunkTextOptions {
  /** Maximum characters per chunk. Defaults to 1000. */
  chunkSize?: number;
  /** Overlapping characters between consecutive chunks. Defaults to 200. */
  overlap?: number;
}

/**
 * A single chunk produced by the sliding-window algorithm.
 */
export interface TextChunk {
  /** The text content of this chunk. */
  text: string;
  /** Zero-based index of this chunk in the sequence. */
  index: number;
  /** Character start offset in the original text. */
  startOffset: number;
  /** Character end offset (exclusive) in the original text. */
  endOffset: number;
}

/**
 * Splits text into overlapping chunks using a sliding window.
 *
 * The algorithm advances by `chunkSize - overlap` characters per step,
 * producing chunks of at most `chunkSize` characters with `overlap`
 * characters shared between consecutive chunks to preserve semantic
 * context across boundaries.
 *
 * @param text - The full text to chunk.
 * @param options - Optional chunking parameters.
 * @returns An array of TextChunk objects.
 */
export function chunkText(text: string, options?: ChunkTextOptions): TextChunk[] {
  const chunkSize = options?.chunkSize ?? 1000;
  const overlap = options?.overlap ?? 200;

  if (chunkSize <= 0) {
    throw new Error('chunkSize must be a positive number');
  }
  if (overlap < 0) {
    throw new Error('overlap must be non-negative');
  }
  if (overlap >= chunkSize) {
    throw new Error('overlap must be less than chunkSize');
  }

  if (!text || text.trim().length === 0) {
    return [];
  }

  const step = chunkSize - overlap;
  const chunks: TextChunk[] = [];
  let index = 0;

  for (let start = 0; start < text.length; start += step) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push({
      text: text.slice(start, end),
      index,
      startOffset: start,
      endOffset: end,
    });
    index++;

    if (end === text.length) break;
  }

  return chunks;
}

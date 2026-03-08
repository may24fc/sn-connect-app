/**
 * Supported document source types for chunking.
 */
export type DocumentSourceType = 'pdf' | 'docx' | 'url' | 'manual';

/**
 * Configuration for the document chunking algorithm.
 */
export interface ChunkingConfig {
  /** Maximum number of tokens per chunk. Defaults to 800. */
  maxChunkTokens?: number;
  /** Minimum number of tokens per chunk. Defaults to 100. */
  minChunkTokens?: number;
  /** Number of overlapping tokens between consecutive chunks. Defaults to 50. */
  overlapTokens?: number;
  /** Whether to preserve paragraph boundaries. Defaults to true. */
  preserveParagraphs?: boolean;
  /** Whether to preserve sentence boundaries. Defaults to true. */
  preserveSentences?: boolean;
}

/**
 * Metadata extracted from a document chunk.
 */
export interface ChunkMetadata {
  /** The source type of the document. */
  sourceType: DocumentSourceType;
  /** Original document title, if available. */
  title?: string | undefined;
  /** Section or heading the chunk belongs to, if detectable. */
  section?: string | undefined;
  /** Page number in the original document, if applicable. */
  pageNumber?: number | undefined;
  /** Zero-based index of this chunk within the document. */
  chunkIndex: number;
  /** Total number of chunks produced from the document. */
  totalChunks: number;
  /** Character offset of this chunk in the original text. */
  startOffset: number;
  /** Character end offset of this chunk in the original text. */
  endOffset: number;
}

/**
 * A single chunk produced by the chunking algorithm.
 */
export interface DocumentChunk {
  /** The unique identifier for this chunk (document_id + chunk_index). */
  id: string;
  /** The text content of this chunk. */
  content: string;
  /** Approximate token count of this chunk. */
  tokenCount: number;
  /** Metadata about the chunk's position and source. */
  metadata: ChunkMetadata;
}

/**
 * Input document to be chunked.
 */
export interface DocumentInput {
  /** Unique identifier for the document. */
  id: string;
  /** The full text content of the document. */
  content: string;
  /** The source type of the document. */
  sourceType: DocumentSourceType;
  /** Optional document title. */
  title?: string;
}

/**
 * Result of chunking a document.
 */
export interface ChunkingResult {
  /** The original document identifier. */
  documentId: string;
  /** The produced chunks. */
  chunks: DocumentChunk[];
  /** Total number of chunks produced. */
  totalChunks: number;
  /** Total approximate token count across all chunks. */
  totalTokens: number;
}

const DEFAULT_CHUNKING_CONFIG: Required<ChunkingConfig> = {
  maxChunkTokens: 800,
  minChunkTokens: 100,
  overlapTokens: 50,
  preserveParagraphs: true,
  preserveSentences: true,
};

/**
 * Estimates token count for a text string.
 * Uses a rough heuristic of ~4 characters per token for English text.
 *
 * @param text - The text to estimate tokens for
 * @returns Approximate token count
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Estimates character count for a given number of tokens.
 *
 * @param tokens - Number of tokens
 * @returns Approximate character count
 */
function tokensToChars(tokens: number): number {
  return tokens * 4;
}

/**
 * Splits text into paragraphs by detecting double newlines.
 *
 * @param text - The text to split into paragraphs
 * @returns Array of paragraph strings (non-empty)
 */
function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * Splits text into sentences using common sentence boundary heuristics.
 * Handles abbreviations, decimal numbers, and common edge cases.
 *
 * @param text - The text to split into sentences
 * @returns Array of sentence strings
 */
function splitIntoSentences(text: string): string[] {
  const sentences: string[] = [];
  // Split on sentence-ending punctuation followed by whitespace and a capital letter,
  // or at newlines
  const parts = text.split(/(?<=[.!?])\s+(?=[A-Z])|(?:\r?\n)/);

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.length > 0) {
      sentences.push(trimmed);
    }
  }

  return sentences;
}

/**
 * Detects the section heading for a given position in the text.
 * Looks for Markdown-style headings (# Heading) or uppercase lines.
 *
 * @param text - The full document text
 * @param offset - Character offset to find the section for
 * @returns The detected section heading, or undefined
 */
function detectSection(text: string, offset: number): string | undefined {
  const textBefore = text.substring(0, offset);
  const lines = textBefore.split('\n');

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]?.trim();
    if (!line) {
      continue;
    }

    // Markdown heading
    const markdownMatch = /^#{1,6}\s+(.+)$/.exec(line);
    if (markdownMatch?.[1]) {
      return markdownMatch[1];
    }

    // All-caps heading (at least 3 chars, no lowercase)
    if (line.length >= 3 && line === line.toUpperCase() && /[A-Z]/.test(line)) {
      return line;
    }
  }

  return undefined;
}

/**
 * Chunks a document into semantically meaningful segments.
 *
 * The algorithm works as follows:
 * 1. Split the document into paragraphs (if preserveParagraphs is true)
 * 2. For each paragraph, split into sentences (if preserveSentences is true)
 * 3. Accumulate sentences into chunks until maxChunkTokens is reached
 * 4. Apply overlap by including trailing sentences from the previous chunk
 * 5. Merge chunks that are below minChunkTokens with adjacent chunks
 *
 * @param document - The document to chunk
 * @param config - Optional chunking configuration
 * @returns The chunking result with all produced chunks
 *
 * @example
 * ```typescript
 * const result = chunkDocument({
 *   id: "policy-001",
 *   content: longPolicyText,
 *   sourceType: "manual",
 *   title: "Leave Policy",
 * });
 * console.log(result.totalChunks); // e.g., 12
 * ```
 */
export function chunkDocument(document: DocumentInput, config?: ChunkingConfig): ChunkingResult {
  const mergedConfig: Required<ChunkingConfig> = {
    ...DEFAULT_CHUNKING_CONFIG,
    ...config,
  };

  const { content, id, sourceType, title } = document;

  if (content.trim().length === 0) {
    return {
      documentId: id,
      chunks: [],
      totalChunks: 0,
      totalTokens: 0,
    };
  }

  const maxChars = tokensToChars(mergedConfig.maxChunkTokens);
  const overlapChars = tokensToChars(mergedConfig.overlapTokens);
  const minChars = tokensToChars(mergedConfig.minChunkTokens);

  // Step 1: Break text into atomic units
  let units: string[];
  if (mergedConfig.preserveParagraphs) {
    const paragraphs = splitIntoParagraphs(content);
    if (mergedConfig.preserveSentences) {
      units = [];
      for (const paragraph of paragraphs) {
        const sentences = splitIntoSentences(paragraph);
        units.push(...sentences);
        // Add a paragraph separator marker
        units.push('');
      }
      // Remove trailing separator
      if (units.length > 0 && units[units.length - 1] === '') {
        units.pop();
      }
    } else {
      units = paragraphs;
    }
  } else if (mergedConfig.preserveSentences) {
    units = splitIntoSentences(content);
  } else {
    // Fall back to character-level chunking
    units = [content];
  }

  // Step 2: Accumulate units into chunks
  const rawChunks: Array<{ text: string; startOffset: number; endOffset: number }> = [];
  let currentChunkParts: string[] = [];
  let currentChunkLength = 0;
  let currentStartOffset = 0;
  let searchFromOffset = 0;

  for (const unit of units) {
    // Skip empty paragraph separators for length calculation but keep for context
    if (unit === '') {
      if (currentChunkParts.length > 0) {
        currentChunkParts.push('');
      }
      continue;
    }

    const unitLength = unit.length;

    // If adding this unit would exceed max, finalize current chunk
    if (currentChunkLength > 0 && currentChunkLength + unitLength + 1 > maxChars) {
      const chunkText = currentChunkParts.filter((p) => p.length > 0).join('\n\n');
      const endOffset = searchFromOffset;

      rawChunks.push({
        text: chunkText,
        startOffset: currentStartOffset,
        endOffset,
      });

      // Apply overlap: carry forward some text from the end of the current chunk
      const overlapParts: string[] = [];
      let overlapLength = 0;
      for (let i = currentChunkParts.length - 1; i >= 0; i--) {
        const part = currentChunkParts[i];
        if (part === undefined || part === '') {
          continue;
        }
        if (overlapLength + part.length > overlapChars) {
          break;
        }
        overlapParts.unshift(part);
        overlapLength += part.length;
      }

      currentChunkParts = [...overlapParts];
      currentChunkLength = overlapLength;
      currentStartOffset = endOffset - overlapLength;
    }

    if (currentChunkParts.length === 0) {
      currentStartOffset = content.indexOf(unit, searchFromOffset);
      if (currentStartOffset === -1) {
        currentStartOffset = searchFromOffset;
      }
    }

    currentChunkParts.push(unit);
    currentChunkLength += unitLength;
    const foundAt = content.indexOf(unit, searchFromOffset);
    searchFromOffset = foundAt !== -1 ? foundAt + unitLength : searchFromOffset + unitLength;
  }

  // Finalize last chunk
  if (currentChunkParts.length > 0) {
    const chunkText = currentChunkParts.filter((p) => p.length > 0).join('\n\n');
    if (chunkText.length > 0) {
      rawChunks.push({
        text: chunkText,
        startOffset: currentStartOffset,
        endOffset: content.length,
      });
    }
  }

  // Step 3: Merge small trailing chunks
  const mergedChunks: typeof rawChunks = [];
  for (const chunk of rawChunks) {
    if (mergedChunks.length > 0 && chunk.text.length < minChars) {
      const prev = mergedChunks[mergedChunks.length - 1];
      if (prev) {
        prev.text = `${prev.text}\n\n${chunk.text}`;
        prev.endOffset = chunk.endOffset;
      }
    } else {
      mergedChunks.push({ ...chunk });
    }
  }

  // Step 4: Build final chunk objects
  const totalChunks = mergedChunks.length;
  let totalTokens = 0;
  const chunks: DocumentChunk[] = mergedChunks.map((chunk, index) => {
    const tokenCount = estimateTokens(chunk.text);
    totalTokens += tokenCount;

    const section = detectSection(content, chunk.startOffset);

    return {
      id: `${id}_chunk_${index}`,
      content: chunk.text,
      tokenCount,
      metadata: {
        sourceType,
        title,
        section,
        chunkIndex: index,
        totalChunks,
        startOffset: chunk.startOffset,
        endOffset: chunk.endOffset,
      },
    };
  });

  return {
    documentId: id,
    chunks,
    totalChunks,
    totalTokens,
  };
}

/**
 * Chunks multiple documents in batch.
 *
 * @param documents - Array of documents to chunk
 * @param config - Optional chunking configuration applied to all documents
 * @returns Array of chunking results, one per document
 *
 * @example
 * ```typescript
 * const results = chunkDocuments([
 *   { id: "doc-1", content: text1, sourceType: "manual" },
 *   { id: "doc-2", content: text2, sourceType: "pdf" },
 * ]);
 * const allChunks = results.flatMap((r) => r.chunks);
 * ```
 */
export function chunkDocuments(
  documents: DocumentInput[],
  config?: ChunkingConfig
): ChunkingResult[] {
  return documents.map((doc) => chunkDocument(doc, config));
}

/**
 * Extracts plain text content from raw document bytes based on source type.
 *
 * Currently supports:
 * - "manual": Returns content as-is (assumes plain text)
 * - "url": Returns content as-is (assumes pre-fetched text)
 * - "pdf": Basic text extraction (strips common PDF artifacts)
 * - "docx": Basic text extraction (strips XML tags)
 *
 * For production use with PDF and DOCX, integrate a dedicated parsing library
 * (e.g., pdf-parse, mammoth) and replace this function.
 *
 * @param content - Raw text content of the document
 * @param sourceType - The type of document source
 * @returns Cleaned plain text suitable for chunking
 */
export function extractText(content: string, sourceType: DocumentSourceType): string {
  switch (sourceType) {
    case 'manual':
    case 'url':
      return content.trim();

    case 'pdf': {
      // Basic cleanup for PDF text extraction artifacts
      let cleaned = content;
      // Remove page break markers
      cleaned = cleaned.replace(/\f/g, '\n\n');
      // Collapse excessive whitespace
      cleaned = cleaned.replace(/[ \t]+/g, ' ');
      // Normalize line endings
      cleaned = cleaned.replace(/\r\n/g, '\n');
      // Remove lines that are just page numbers
      cleaned = cleaned.replace(/^\s*\d+\s*$/gm, '');
      return cleaned.trim();
    }

    case 'docx': {
      // Basic XML tag stripping for DOCX content
      let cleaned = content;
      // Remove XML tags
      cleaned = cleaned.replace(/<[^>]+>/g, '');
      // Decode common HTML entities
      cleaned = cleaned.replace(/&amp;/g, '&');
      cleaned = cleaned.replace(/&lt;/g, '<');
      cleaned = cleaned.replace(/&gt;/g, '>');
      cleaned = cleaned.replace(/&quot;/g, '"');
      cleaned = cleaned.replace(/&#39;/g, "'");
      cleaned = cleaned.replace(/&nbsp;/g, ' ');
      // Normalize whitespace
      cleaned = cleaned.replace(/\s+/g, ' ');
      return cleaned.trim();
    }
  }
}

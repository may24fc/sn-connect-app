import Anthropic from '@anthropic-ai/sdk';

/**
 * Configuration for the embedding generation service.
 */
export interface EmbeddingConfig {
  /** Anthropic API key. Falls back to ANTHROPIC_API_KEY env var. */
  apiKey?: string;
  /** Model to use for generating embedding representations. Defaults to "claude-sonnet-4-5-20250929". */
  model?: string;
  /** Embedding vector dimension. Defaults to 1536. */
  dimensions?: number;
  /** Maximum number of retries on transient failures. Defaults to 3. */
  maxRetries?: number;
  /** Base delay in ms between retries (exponential backoff). Defaults to 1000. */
  retryBaseDelayMs?: number;
}

/**
 * Result of generating an embedding for a single text input.
 */
export interface EmbeddingResult {
  /** The original text that was embedded. */
  text: string;
  /** The generated embedding vector as an array of numbers. */
  embedding: number[];
  /** Token count of the input text (approximate). */
  tokenCount: number;
}

/**
 * Result of a batch embedding operation.
 */
export interface BatchEmbeddingResult {
  /** Individual embedding results in the same order as the input texts. */
  results: EmbeddingResult[];
  /** Total tokens used across all inputs. */
  totalTokens: number;
  /** Number of texts that were successfully embedded. */
  successCount: number;
  /** Number of texts that failed to embed. */
  failureCount: number;
  /** Error details for any failed embeddings, keyed by index. */
  errors: Record<number, string>;
}

const DEFAULT_CONFIG: Required<EmbeddingConfig> = {
  apiKey: '',
  model: 'claude-sonnet-4-5-20250929',
  dimensions: 1536,
  maxRetries: 3,
  retryBaseDelayMs: 1000,
};

/**
 * Generates a deterministic pseudo-embedding vector from text using Claude.
 *
 * This function asks Claude to produce a numerical representation of the input text
 * as a fixed-dimension vector. For production RAG workloads, consider using a
 * dedicated embedding model (e.g., OpenAI text-embedding-3-small, Cohere embed-v3,
 * or a local sentence-transformers model) and swapping this implementation.
 *
 * @param client - Anthropic SDK client instance
 * @param text - The text to generate an embedding for
 * @param config - Embedding configuration
 * @returns A normalized embedding vector
 */
async function generateEmbeddingVector(
  client: Anthropic,
  text: string,
  config: Required<EmbeddingConfig>
): Promise<number[]> {
  const response = await client.messages.create({
    model: config.model,
    max_tokens: 4096,
    system: `You are an embedding generation assistant. Given input text, produce a semantic embedding as a JSON array of exactly ${config.dimensions} floating point numbers between -1 and 1. The numbers should capture the semantic meaning of the text so that similar texts produce similar vectors. Output ONLY the JSON array, nothing else.`,
    messages: [
      {
        role: 'user',
        content: `Generate a ${config.dimensions}-dimensional semantic embedding vector for the following text. Output ONLY a valid JSON array of numbers.\n\nText: ${text}`,
      },
    ],
  });

  const content = response.content[0];
  if (!content || content.type !== 'text') {
    throw new Error('Unexpected response type from Claude API');
  }

  const parsed: unknown = JSON.parse(content.text);
  if (!Array.isArray(parsed)) {
    throw new Error('Response is not an array');
  }

  const vector = parsed as number[];
  if (vector.length !== config.dimensions) {
    throw new Error(`Expected ${config.dimensions} dimensions, got ${vector.length}`);
  }

  // Normalize the vector to unit length
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) {
    return vector;
  }
  return vector.map((val) => val / magnitude);
}

/**
 * Estimates token count for a text string.
 * Uses a rough heuristic of ~4 characters per token for English text.
 *
 * @param text - The text to estimate tokens for
 * @returns Approximate token count
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Delays execution for a specified duration.
 *
 * @param ms - Milliseconds to wait
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Executes a function with exponential backoff retry logic.
 *
 * @param fn - The async function to retry
 * @param maxRetries - Maximum number of retry attempts
 * @param baseDelayMs - Base delay in milliseconds (doubles each retry)
 * @returns The result of the function
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  baseDelayMs: number
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        await delay(delayMs);
      }
    }
  }

  throw lastError;
}

/**
 * Creates an Anthropic client instance with the provided or environment API key.
 *
 * @param apiKey - Optional API key override
 * @returns Configured Anthropic client
 */
function createClient(apiKey?: string): Anthropic {
  return new Anthropic({
    apiKey: apiKey || process.env['ANTHROPIC_API_KEY'],
  });
}

/**
 * Generates an embedding for a single text input.
 *
 * @param text - The text to generate an embedding for
 * @param config - Optional embedding configuration
 * @returns The embedding result containing the vector and metadata
 *
 * @example
 * ```typescript
 * const result = await generateEmbedding("What is the company leave policy?");
 * console.log(result.embedding.length); // 1536
 * ```
 */
export async function generateEmbedding(
  text: string,
  config?: EmbeddingConfig
): Promise<EmbeddingResult> {
  const mergedConfig: Required<EmbeddingConfig> = {
    ...DEFAULT_CONFIG,
    ...config,
  };
  const client = createClient(mergedConfig.apiKey);

  const embedding = await withRetry(
    () => generateEmbeddingVector(client, text, mergedConfig),
    mergedConfig.maxRetries,
    mergedConfig.retryBaseDelayMs
  );

  return {
    text,
    embedding,
    tokenCount: estimateTokenCount(text),
  };
}

/**
 * Generates embeddings for multiple text inputs in batch.
 *
 * Processes texts sequentially to respect API rate limits. Each text is
 * retried independently on failure, so partial success is possible.
 *
 * @param texts - Array of texts to generate embeddings for
 * @param config - Optional embedding configuration
 * @returns Batch result with individual embeddings and aggregate metadata
 *
 * @example
 * ```typescript
 * const result = await generateBatchEmbeddings([
 *   "Leave policy overview",
 *   "Performance review process",
 *   "Employee benefits guide",
 * ]);
 * console.log(result.successCount); // 3
 * ```
 */
export async function generateBatchEmbeddings(
  texts: string[],
  config?: EmbeddingConfig
): Promise<BatchEmbeddingResult> {
  const mergedConfig: Required<EmbeddingConfig> = {
    ...DEFAULT_CONFIG,
    ...config,
  };
  const client = createClient(mergedConfig.apiKey);

  const results: EmbeddingResult[] = [];
  const errors: Record<number, string> = {};
  let totalTokens = 0;
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    if (text === undefined) {
      continue;
    }

    try {
      const embedding = await withRetry(
        () => generateEmbeddingVector(client, text, mergedConfig),
        mergedConfig.maxRetries,
        mergedConfig.retryBaseDelayMs
      );

      const tokenCount = estimateTokenCount(text);
      totalTokens += tokenCount;
      successCount++;

      results.push({
        text,
        embedding,
        tokenCount,
      });
    } catch (error) {
      failureCount++;
      errors[i] = error instanceof Error ? error.message : String(error);

      results.push({
        text,
        embedding: [],
        tokenCount: 0,
      });
    }
  }

  return {
    results,
    totalTokens,
    successCount,
    failureCount,
    errors,
  };
}

/**
 * Computes the cosine similarity between two embedding vectors.
 *
 * @param a - First embedding vector
 * @param b - Second embedding vector
 * @returns Cosine similarity score between -1 and 1
 * @throws Error if vectors have different dimensions
 *
 * @example
 * ```typescript
 * const similarity = cosineSimilarity(embedding1, embedding2);
 * console.log(similarity); // 0.85
 * ```
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimensions must match: ${a.length} !== ${b.length}`);
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    const valA = a[i] ?? 0;
    const valB = b[i] ?? 0;
    dotProduct += valA * valB;
    magnitudeA += valA * valA;
    magnitudeB += valB * valB;
  }

  const magnitude = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);
  if (magnitude === 0) {
    return 0;
  }

  return dotProduct / magnitude;
}

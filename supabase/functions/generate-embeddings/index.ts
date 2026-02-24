import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SourceType = 'pdf' | 'docx' | 'url' | 'manual';

interface KnowledgeSource {
  id: string;
  title: string;
  source_type: SourceType;
  content: string | null;
  file_path: string | null;
  url: string | null;
  metadata: Record<string, unknown> | null;
}

interface EmbeddingChunk {
  knowledge_source_id: string;
  chunk_index: number;
  content: string;
  embedding: number[];
  token_count: number;
  metadata: Record<string, unknown>;
}

interface WebhookPayload {
  type: 'INSERT';
  table: string;
  record: KnowledgeSource;
  schema: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;
const EMBEDDING_BATCH_SIZE = 20;
const MAX_CONTENT_LENGTH = 100_000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ---------------------------------------------------------------------------
// Supabase client (service role - bypasses RLS)
// ---------------------------------------------------------------------------

function getSupabaseAdmin() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ---------------------------------------------------------------------------
// Text chunking
// ---------------------------------------------------------------------------

function chunkText(text: string, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  if (!text || text.trim().length === 0) return [];

  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= chunkSize) return [cleaned];

  const chunks: string[] = [];
  let start = 0;

  while (start < cleaned.length) {
    let end = start + chunkSize;

    if (end < cleaned.length) {
      // Try to break at sentence boundary
      const segment = cleaned.slice(start, end);
      const lastPeriod = segment.lastIndexOf('. ');
      const lastNewline = segment.lastIndexOf('\n');
      const breakPoint = Math.max(lastPeriod, lastNewline);

      if (breakPoint > chunkSize * 0.5) {
        end = start + breakPoint + 1;
      }
    } else {
      end = cleaned.length;
    }

    const chunk = cleaned.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    start = end - overlap;
    if (start >= cleaned.length) break;
  }

  return chunks;
}

function estimateTokenCount(text: string): number {
  // Rough estimate: ~4 chars per token for English text
  return Math.ceil(text.length / 4);
}

// ---------------------------------------------------------------------------
// Content extraction
// ---------------------------------------------------------------------------

async function extractContent(
  source: KnowledgeSource,
  supabase: ReturnType<typeof getSupabaseAdmin>
): Promise<string> {
  switch (source.source_type) {
    case 'manual':
      return source.content ?? '';

    case 'url':
      return await extractFromUrl(source.url);

    case 'pdf':
      return await extractFromFile(source, supabase);

    case 'docx':
      return await extractFromFile(source, supabase);

    default:
      throw new Error(`Unsupported source type: ${source.source_type}`);
  }
}

async function extractFromUrl(url: string | null): Promise<string> {
  if (!url) throw new Error('URL source missing url field');

  const response = await fetch(url, {
    headers: { 'User-Agent': 'SN-Connect-HR-Portal/1.0' },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL (${response.status}): ${url}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  const body = await response.text();

  if (contentType.includes('text/html')) {
    return stripHtml(body);
  }

  return body;
}

function stripHtml(html: string): string {
  // Remove script and style blocks
  let text = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  // Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

async function extractFromFile(
  source: KnowledgeSource,
  supabase: ReturnType<typeof getSupabaseAdmin>
): Promise<string> {
  if (!source.file_path) {
    throw new Error(`${source.source_type.toUpperCase()} source missing file_path`);
  }

  // Download file from Supabase Storage
  const { data, error } = await supabase.storage
    .from('knowledge-documents')
    .download(source.file_path);

  if (error || !data) {
    throw new Error(`Failed to download file: ${error?.message ?? 'unknown'}`);
  }

  if (source.source_type === 'pdf') {
    // For PDFs, extract raw text content.
    // Deno Edge Functions have limited PDF parsing support,
    // so we extract text by reading the binary as UTF-8 and
    // pulling out readable strings. For production, consider
    // pre-processing PDFs via an n8n workflow before insertion.
    const bytes = new Uint8Array(await data.arrayBuffer());
    return extractTextFromPdfBytes(bytes);
  }

  if (source.source_type === 'docx') {
    // DOCX files are ZIP archives with XML content.
    // Basic extraction: read as text and strip XML tags.
    // For production, consider pre-processing via n8n workflow.
    const text = await data.text();
    return text
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return await data.text();
}

function extractTextFromPdfBytes(bytes: Uint8Array): string {
  // Basic PDF text extraction: find text between BT/ET markers
  // and parentheses-delimited strings. This handles simple PDFs.
  // Complex PDFs with encoded fonts need external libraries.
  const text: string[] = [];
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const content = decoder.decode(bytes);

  // Extract text from parenthesized strings in PDF streams
  const parenthesizedPattern = /\(([^)]*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = parenthesizedPattern.exec(content)) !== null) {
    const segment = match[1];
    // Filter out binary/control sequences
    if (segment.length > 1 && /[a-zA-Z]/.test(segment)) {
      text.push(segment);
    }
  }

  const result = text.join(' ').replace(/\s+/g, ' ').trim();

  if (result.length < 50) {
    // Fallback: the PDF may be image-based or use encoded fonts.
    // Return a note so the caller knows extraction was limited.
    return `[PDF text extraction limited - extracted ${result.length} characters. Consider re-uploading as plain text or using the manual source type.]`;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Embedding generation via Anthropic Voyage (via Supabase AI)
// ---------------------------------------------------------------------------

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  // Use Supabase's built-in embedding generation via pg_net or
  // call an external embedding API. We use a simple approach:
  // call the Anthropic-compatible embedding endpoint.
  //
  // Note: Anthropic Claude does not natively provide embeddings.
  // In production, use OpenAI, Voyage AI, or Supabase's built-in
  // embedding support. Here we use a configurable endpoint.

  const embeddingApiUrl = Deno.env.get('EMBEDDING_API_URL');
  const embeddingApiKey = Deno.env.get('EMBEDDING_API_KEY') ?? Deno.env.get('OPENAI_API_KEY');
  const embeddingModel = Deno.env.get('EMBEDDING_MODEL') ?? 'text-embedding-3-small';

  if (!embeddingApiUrl && !embeddingApiKey) {
    // Fallback: generate simple hash-based vectors for development.
    // These are NOT real embeddings and should not be used in production.
    console.warn('No embedding API configured. Generating placeholder vectors for development.');
    return texts.map((text) => generatePlaceholderEmbedding(text));
  }

  const url = embeddingApiUrl ?? 'https://api.openai.com/v1/embeddings';
  const results: number[][] = [];

  // Process in batches
  for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${embeddingApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: embeddingModel,
        input: batch,
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Embedding API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const embeddings = data.data
      .sort((a: { index: number }, b: { index: number }) => a.index - b.index)
      .map((item: { embedding: number[] }) => item.embedding);

    results.push(...embeddings);
  }

  return results;
}

function generatePlaceholderEmbedding(text: string): number[] {
  // Simple deterministic hash-based vector for dev/testing only.
  // Produces a 1536-dimension vector (matching text-embedding-3-small).
  const dimensions = 1536;
  const vector: number[] = new Array(dimensions);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  for (let i = 0; i < dimensions; i++) {
    hash = (hash * 1103515245 + 12345) | 0;
    vector[i] = ((hash >>> 16) & 0x7fff) / 0x7fff - 0.5;
  }
  // Normalize
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return vector.map((v) => v / magnitude);
}

// ---------------------------------------------------------------------------
// Main processing pipeline
// ---------------------------------------------------------------------------

async function processKnowledgeSource(sourceId: string): Promise<{
  chunks_created: number;
  status: string;
}> {
  const supabase = getSupabaseAdmin();

  // 1. Fetch the knowledge source record
  const { data: source, error: fetchError } = await supabase
    .from('knowledge_sources')
    .select('*')
    .eq('id', sourceId)
    .single();

  if (fetchError || !source) {
    throw new Error(`Knowledge source not found: ${fetchError?.message ?? sourceId}`);
  }

  // 2. Update status to processing
  await supabase
    .from('knowledge_sources')
    .update({
      metadata: {
        ...((source.metadata as Record<string, unknown>) ?? {}),
        embedding_status: 'processing',
        embedding_started_at: new Date().toISOString(),
      },
    })
    .eq('id', sourceId);

  try {
    // 3. Extract content from the source
    let content = await extractContent(source as KnowledgeSource, supabase);

    // Truncate if too long
    if (content.length > MAX_CONTENT_LENGTH) {
      console.warn(`Content truncated from ${content.length} to ${MAX_CONTENT_LENGTH} chars`);
      content = content.slice(0, MAX_CONTENT_LENGTH);
    }

    if (!content || content.trim().length === 0) {
      throw new Error('No content could be extracted from source');
    }

    // 4. Chunk the content
    const chunks = chunkText(content);
    if (chunks.length === 0) {
      throw new Error('Content produced no valid chunks');
    }

    console.log(`Source ${sourceId}: extracted ${content.length} chars, ${chunks.length} chunks`);

    // 5. Generate embeddings in batches
    const embeddings = await generateEmbeddings(chunks);

    // 6. Delete any existing embeddings for this source (idempotent re-processing)
    await supabase.from('knowledge_embeddings').delete().eq('knowledge_source_id', sourceId);

    // 7. Insert chunks with embeddings
    const embeddingRecords: Omit<EmbeddingChunk, 'embedding'> & { embedding: string }[] =
      chunks.map((chunk, index) => ({
        knowledge_source_id: sourceId,
        chunk_index: index,
        content: chunk,
        // Store as pgvector-compatible string format
        embedding: `[${embeddings[index].join(',')}]`,
        token_count: estimateTokenCount(chunk),
        metadata: {
          source_title: source.title,
          source_type: source.source_type,
          chunk_size: chunk.length,
        },
      }));

    // Insert in batches to avoid payload size limits
    const insertBatchSize = 50;
    for (let i = 0; i < embeddingRecords.length; i += insertBatchSize) {
      const batch = embeddingRecords.slice(i, i + insertBatchSize);
      const { error: insertError } = await supabase.from('knowledge_embeddings').insert(batch);

      if (insertError) {
        throw new Error(`Failed to insert embeddings batch ${i}: ${insertError.message}`);
      }
    }

    // 8. Update source metadata with success status
    await supabase
      .from('knowledge_sources')
      .update({
        metadata: {
          ...((source.metadata as Record<string, unknown>) ?? {}),
          embedding_status: 'completed',
          embedding_completed_at: new Date().toISOString(),
          chunk_count: chunks.length,
          total_tokens: chunks.reduce((sum, c) => sum + estimateTokenCount(c), 0),
          content_length: content.length,
        },
      })
      .eq('id', sourceId);

    // 9. Log to audit_logs
    await supabase.from('audit_logs').insert({
      action: 'generate_embeddings',
      table_name: 'knowledge_sources',
      record_id: sourceId,
      changes: {
        chunks_created: chunks.length,
        source_type: source.source_type,
        content_length: content.length,
      },
    });

    return { chunks_created: chunks.length, status: 'completed' };
  } catch (error) {
    // Update source with error status
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await supabase
      .from('knowledge_sources')
      .update({
        metadata: {
          ...((source.metadata as Record<string, unknown>) ?? {}),
          embedding_status: 'error',
          embedding_error: errorMessage,
          embedding_failed_at: new Date().toISOString(),
        },
      })
      .eq('id', sourceId);

    // Log failure to audit_logs (no PII)
    await supabase.from('audit_logs').insert({
      action: 'generate_embeddings_failed',
      table_name: 'knowledge_sources',
      record_id: sourceId,
      changes: {
        error: errorMessage,
        source_type: source.source_type,
      },
    });

    throw error;
  }
}

// ---------------------------------------------------------------------------
// HTTP handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();

    // Support both webhook payload and direct invocation
    let sourceId: string;

    if (body.type === 'INSERT' && body.record?.id) {
      // Database webhook trigger
      sourceId = body.record.id;
    } else if (body.source_id) {
      // Direct invocation
      sourceId = body.source_id;
    } else {
      return new Response(
        JSON.stringify({
          error: 'Invalid payload. Provide webhook payload or { source_id }',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing knowledge source: ${sourceId}`);

    const result = await processKnowledgeSource(sourceId);

    console.log(`Completed: ${result.chunks_created} chunks for source ${sourceId}`);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Edge function error: ${message}`);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

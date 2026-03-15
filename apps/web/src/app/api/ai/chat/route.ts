import { chatMessageSchema } from '@/lib/schemas/ai.schema';
import OpenAI from 'openai';
import { type NextRequest, NextResponse } from 'next/server';
import { getAdminClient, getAuthedSupabase } from '../_lib';

// ─── Config ──────────────────────────────────────────────────────────────────
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? '';
const CACHE_SIMILARITY_THRESHOLD = 0.95;
const EMBEDDING_MATCH_THRESHOLD = 0.25;
const EMBEDDING_MATCH_COUNT = 8;
const FAST_MODEL = 'gpt-4o-mini'; // Cheap: routing + low-complexity generation
const STRONG_MODEL = 'gpt-4o';     // Expensive: high-complexity analysis

// ─── System Prompts ──────────────────────────────────────────────────────────
const GUARDRAIL_SYSTEM_PROMPT = `You are SN Connect, an internal AI HR assistant for the company. You must follow these rules STRICTLY:

1. ANSWER SOURCE CONSTRAINT: You must answer strictly using the provided context blocks. If the user asks a question whose answer is NOT in the context, you must reply: "I cannot find the answer to this in the uploaded documents. Please contact HR directly for further assistance."
2. DO NOT HALLUCINATE: Never invent policies, dates, figures, or procedures not explicitly stated in the context.
3. ANALYSIS RULE: If the user asks for analysis, you may perform logical deductions ONLY if the foundational facts exist in the context.
4. PRIVACY GUARDRAIL – CRITICAL: You must NEVER disclose Personally Identifiable Information (PII), salary, performance reviews, or HR records belonging to anyone other than the user asking the question. If a user asks for information about another named individual, colleague, or employee, you must instantly refuse: "For privacy and security reasons, I am only authorized to discuss company-wide policies or your own personal HR data."
5. Be professional, friendly, and concise.
6. Format responses with clear paragraphs and bullet points where appropriate.
7. CITATION FORMAT – CRITICAL: When you reference information from the context blocks, you MUST add an inline citation marker immediately after the relevant fact using square brackets with the context block number (e.g., [1], [2], [3]). Each context block is numbered starting from 1. Example: "Employees are entitled to 15 days of annual leave [1], and sick leave can be taken without prior approval [2]."`;

const ROUTER_SYSTEM_PROMPT = `You are a query complexity classifier. Given a user question about HR policies, classify it.
Output ONLY a valid JSON object with exactly these fields:
{ "complexity": "low" | "high", "requires_analysis": boolean }

Rules:
- "low": Direct fact retrieval (e.g. "What are the core hours?", "How many vacation days do I get?")
- "high": Comparative analysis, synthesis across topics, multi-step reasoning, or "explain the difference between X and Y"
- "requires_analysis": true if the question asks to compare, analyze, summarize multiple policies, or draw conclusions

Output ONLY the JSON. No extra text.`;

// ─── Types ───────────────────────────────────────────────────────────────────
interface EmbeddingMatch {
  id: string;
  content: string;
  similarity: number;
  metadata: {
    source_id: string;
    source_title: string;
    chunk_index: number;
  };
}

interface ComplexityResult {
  complexity: 'low' | 'high';
  requires_analysis: boolean;
}

// ─── PII Detection ──────────────────────────────────────────────────────────
const PII_PATTERNS = [
  /(?:tell me|show me|what is|give me|find|look up|get).{0,30}(?:salary|compensation|pay|wage)/i,
  /(?:tell me|show me|what is|give me|find|look up|get).{0,30}(?:performance|review|rating)\s+(?:of|for|about)\s+/i,
  /(?:tell me|show me|what is|give me|find|look up|get).{0,30}(?:about|for|of)\s+(?:[A-Z][a-z]+\s+[A-Z][a-z]+)/,
  /(?:ssn|social security|government id|tax id)\s*(?:of|for|about)/i,
  /(?:address|phone|email|contact)\s+(?:of|for|about)\s+(?:[A-Z][a-z]+)/,
];

function detectsPIIRequest(query: string): boolean {
  return PII_PATTERNS.some((pattern) => pattern.test(query));
}

const PII_REFUSAL = 'For privacy and security reasons, I am only authorized to discuss company-wide policies or your own personal HR data. I cannot provide information about other employees. Please contact HR directly if you need assistance.';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getOpenAIClient(): OpenAI {
  return new OpenAI({ apiKey: OPENAI_API_KEY });
}

async function generateQueryEmbedding(openai: OpenAI, text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0]?.embedding ?? [];
}

// Stage 1: Semantic Cache Lookup
async function lookupCache(
  adminClient: ReturnType<typeof getAdminClient>,
  queryEmbedding: number[]
): Promise<{ response_text: string; source_citations: unknown; id: string } | null> {
  const { data, error } = await adminClient.rpc('match_query_cache', {
    query_embedding: queryEmbedding,
    similarity_threshold: CACHE_SIMILARITY_THRESHOLD,
    max_results: 1,
  });

  if (error || !data || data.length === 0) return null;

  const hit = data[0];

  // Bump hit count asynchronously via raw SQL increment
  adminClient
    .rpc('increment_cache_hit_count' as 'match_query_cache', { cache_id: hit.id } as never)
    .then(() => {});

  return { response_text: hit.response_text, source_citations: hit.source_citations, id: hit.id };
}

// Cache access-level gate — returns false if the cached result used any admin-only
// knowledge sources and the current user does not have admin access.
async function isCacheHitAllowed(
  adminClient: ReturnType<typeof getAdminClient>,
  sourceCitations: unknown,
  isAdminRole: boolean
): Promise<boolean> {
  if (isAdminRole) return true;

  const citations = Array.isArray(sourceCitations)
    ? (sourceCitations as Array<Record<string, unknown>>)
    : [];
  if (citations.length === 0) return true;

  const sourceIds = citations
    .map((c) => c.sourceId as string)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
  if (sourceIds.length === 0) return true;

  const { data } = await adminClient
    .from('knowledge_sources')
    .select('access_level')
    .in('id', sourceIds);

  // If any source is admin-only, this cache hit is not safe for non-admins
  return !(data ?? []).some((s) => (s as { access_level: string }).access_level === 'admin');
}

// Stage 2: Complexity Router
async function classifyComplexity(openai: OpenAI, query: string): Promise<ComplexityResult> {
  try {
    const response = await openai.chat.completions.create({
      model: FAST_MODEL,
      max_tokens: 60,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: ROUTER_SYSTEM_PROMPT },
        { role: 'user', content: query },
      ],
    });

    const text = response.choices[0]?.message?.content ?? '';
    const parsed = JSON.parse(text) as ComplexityResult;
    if (parsed.complexity === 'low' || parsed.complexity === 'high') {
      return parsed;
    }
  } catch {
    // Fall back to low complexity on parse failure
  }
  return { complexity: 'low', requires_analysis: false };
}

// Stage 3: Vector Retrieval
async function retrieveContext(
  adminClient: ReturnType<typeof getAdminClient>,
  queryEmbedding: number[],
  allowedAccessLevels: string[]
): Promise<EmbeddingMatch[]> {
  const { data, error } = await adminClient.rpc('match_knowledge_embeddings', {
    query_embedding: queryEmbedding,
    match_threshold: EMBEDDING_MATCH_THRESHOLD,
    match_count: EMBEDDING_MATCH_COUNT,
    allowed_access_levels: allowedAccessLevels,
  });

  if (error) {
    console.error('Error retrieving context from embeddings:', error);
    return [];
  }

  // Map RPC response to our EmbeddingMatch shape
  return ((data as Array<Record<string, unknown>>) ?? []).map((row) => {
    const meta = (row.metadata ?? {}) as Record<string, unknown>;
    return {
      id: row.id as string,
      content: row.chunk_text as string,
      similarity: row.similarity as number,
      metadata: {
        source_id: (meta.source_id as string) ?? (row.source_id as string),
        source_title: (meta.title as string) ?? (meta.source_title as string) ?? 'Unknown Source',
        chunk_index: row.chunk_index as number,
      },
    };
  });
}

function buildContextPrompt(matches: EmbeddingMatch[]): string {
  if (matches.length === 0) {
    return 'No relevant company documents were found for this query.';
  }

  const contextParts = matches.map(
    (match, index) =>
      `--- Context Block ${index + 1} [Source: ${match.metadata.source_title}] (Relevance: ${(match.similarity * 100).toFixed(0)}%) ---\n${match.content}`
  );

  return `=== KNOWLEDGE BASE CONTEXT ===\n${contextParts.join('\n\n')}\n=== END OF CONTEXT ===`;
}

interface Citation {
  id: number;
  sourceId: string;
  sourceName: string;
  exactQuote: string;
  relevanceScore: number;
}

function extractSourceCitations(matches: EmbeddingMatch[]): Citation[] {
  // Each context block gets a unique citation number (1-indexed)
  return matches.map((match, index) => ({
    id: index + 1,
    sourceId: match.metadata.source_id,
    sourceName: match.metadata.source_title,
    exactQuote: match.content.slice(0, 300),
    relevanceScore: match.similarity,
  }));
}

// Stage 5: Cache the response (async, fire-and-forget)
function cacheResponse(
  adminClient: ReturnType<typeof getAdminClient>,
  queryText: string,
  queryEmbedding: number[],
  responseText: string,
  sourceCitations: unknown
): void {
  adminClient
    .from('query_cache')
    .insert({
      query_text: queryText,
      query_embedding: JSON.stringify(queryEmbedding),
      response_text: responseText,
      source_citations: sourceCitations,
    })
    .then(({ error }) => {
      if (error) console.error('Failed to cache query response:', error);
    });
}

// ─── Main Handler ────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const { user, role, error: authError } = await getAuthedSupabase();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Determine which knowledge source access levels this user may see.
    // admin / super_admin / hr / cos / ceo → all sources
    // employee / intern → only sources marked access_level = 'all'
    const ADMIN_ROLES = ['admin', 'super_admin', 'hr', 'cos', 'ceo'];
    const isAdminRole = ADMIN_ROLES.includes(role ?? '');
    const allowedAccessLevels = isAdminRole ? ['all', 'admin'] : ['all'];

    const body = await request.json();
    const parsed = chatMessageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: 'AI service is not configured' }, { status: 503 });
    }

    // Extract the latest user message
    const { message, messages: historyMessages, conversationId, includeSourceCitations } = parsed.data;
    const latestUserMessage = message ?? historyMessages?.filter((m) => m.role === 'user').pop()?.content ?? '';

    if (!latestUserMessage) {
      return NextResponse.json({ error: 'No user message found' }, { status: 400 });
    }

    // ── Privacy Pre-filter: hard refusal for PII requests ──
    if (detectsPIIRequest(latestUserMessage)) {
      return streamSingleResponse(PII_REFUSAL, [], conversationId);
    }

    const openai = getOpenAIClient();
    const adminClient = getAdminClient();

    // ── Stage 1: Semantic Cache ──
    let queryEmbedding: number[];
    try {
      queryEmbedding = await generateQueryEmbedding(openai, latestUserMessage);
    } catch (embeddingError) {
      console.error('Embedding generation failed:', embeddingError);
      return NextResponse.json({ error: 'Failed to process query' }, { status: 500 });
    }

    try {
      const cacheHit = await lookupCache(adminClient, queryEmbedding);
      if (cacheHit) {
        const cacheAllowed = await isCacheHitAllowed(adminClient, cacheHit.source_citations, isAdminRole);
        if (cacheAllowed) {
          const cachedCitations = Array.isArray(cacheHit.source_citations)
            ? (cacheHit.source_citations as Citation[])
            : [];
          return streamSingleResponse(cacheHit.response_text, cachedCitations, conversationId);
        }
        // Admin-only content in cache — fall through to role-filtered full pipeline
      }
    } catch {
      // Cache miss or error — continue to full pipeline
    }

    // ── Stage 2: Complexity Router ──
    const complexity = await classifyComplexity(openai, latestUserMessage);

    // ── Stage 3: Vector Retrieval ──
    const contextMatches = await retrieveContext(adminClient, queryEmbedding, allowedAccessLevels);
    const contextPrompt = buildContextPrompt(contextMatches);
    // Always extract citations (for the LLM to reference) but only send to client if requested
    const sourceCitations = extractSourceCitations(contextMatches);
    const citationsToSend = includeSourceCitations !== false ? sourceCitations : [];

    // ── Stage 4: Generation with Guardrails ──
    const selectedModel = complexity.complexity === 'high' ? STRONG_MODEL : FAST_MODEL;

    // Build conversation messages for the API
    const conversationMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: `${GUARDRAIL_SYSTEM_PROMPT}\n\n${contextPrompt}` },
    ];

    if (historyMessages && historyMessages.length > 1) {
      // Include up to 10 previous messages for context (excluding the latest which we handle separately)
      const previousMessages = historyMessages.slice(-11, -1);
      for (const m of previousMessages) {
        conversationMessages.push({ role: m.role, content: m.content });
      }
    }

    conversationMessages.push({ role: 'user', content: latestUserMessage });

    // ── Persist user message if conversationId is provided ──
    if (conversationId) {
      adminClient
        .from('ai_messages')
        .insert({
          conversation_id: conversationId,
          role: 'user',
          content: latestUserMessage,
          created_by: user.id,
        })
        .then(({ error: insertError }) => {
          if (insertError) console.error('Failed to persist user message:', insertError);
        });

      // Update conversation title from first user message if still default
      adminClient
        .from('ai_conversations')
        .update({ title: latestUserMessage.slice(0, 60) })
        .eq('id', conversationId)
        .eq('title', 'New conversation')
        .then(() => {});
    }

    // ── Stream the response ──
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // Send source citations first (always send if we have any, unless explicitly disabled)
          if (citationsToSend.length > 0) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'sources', sources: citationsToSend })}\n\n`)
            );
          }

          const stream = await openai.chat.completions.create({
            model: selectedModel,
            max_tokens: complexity.complexity === 'high' ? 2048 : 1024,
            temperature: 0.3,
            stream: true,
            messages: conversationMessages,
          });

          let fullResponse = '';

          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? '';
            if (text) {
              fullResponse += text;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'content', text })}\n\n`)
              );
            }
          }

          // Send done event
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'done', conversationId: conversationId || null })}\n\n`)
          );

          // ── Stage 5: Cache the response (async) ──
          // Only cache if we had real context matches — never cache refusal/fallback responses
          if (fullResponse.length > 0 && contextMatches.length > 0) {
            cacheResponse(adminClient, latestUserMessage, queryEmbedding, fullResponse, sourceCitations);
          }

          // ── Persist assistant message if conversationId is provided ──
          if (conversationId && fullResponse.length > 0) {
            adminClient
              .from('ai_messages')
              .insert({
                conversation_id: conversationId,
                role: 'assistant',
                content: fullResponse,
                citations: sourceCitations.length > 0 ? sourceCitations : null,
                created_by: user.id,
              })
              .then(({ error: insertError }) => {
                if (insertError) console.error('Failed to persist assistant message:', insertError);
              });
          }

          // Audit log (fire and forget)
          adminClient
            .from('audit_logs')
            .insert({
              table_name: 'ai_chat',
              record_id: user.id,
              operation: 'INSERT',
              performed_by: user.id,
              action: 'ai_chat_query',
              metadata: {
                message_length: latestUserMessage.length,
                response_length: fullResponse.length,
                sources_used: sourceCitations.length,
                model_used: selectedModel,
                complexity: complexity.complexity,
                cache_hit: false,
                conversation_id: conversationId || null,
              },
            })
            .then(({ error: auditError }) => {
              if (auditError) console.error('Failed to log AI chat audit:', auditError);
            });

          controller.close();
        } catch (streamError) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Stream processing failed' })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/ai/chat:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Streams a single pre-built response (used for cache hits and PII refusals).
 */
function streamSingleResponse(
  text: string,
  citations: Citation[],
  conversationId?: string
): Response {
  const encoder = new TextEncoder();
  const readableStream = new ReadableStream({
    start(controller) {
      if (citations.length > 0) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'sources', sources: citations })}\n\n`)
        );
      }
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'content', text })}\n\n`)
      );
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'done', conversationId: conversationId || null })}\n\n`)
      );
      controller.close();
    },
  });

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

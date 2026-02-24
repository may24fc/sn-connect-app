import { chatMessageSchema } from '@/lib/schemas/ai.schema';
import Anthropic from '@anthropic-ai/sdk';
import { type NextRequest, NextResponse } from 'next/server';
import { getAdminClient, getAuthedSupabase } from '../_lib';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? '';
const EMBEDDING_MATCH_THRESHOLD = 0.7;
const EMBEDDING_MATCH_COUNT = 5;

const SYSTEM_PROMPT = `You are SN Connect, an AI HR assistant for the company. Your role is to help employees find answers about company policies, procedures, benefits, and other HR-related topics.

Guidelines:
- Answer based on the provided context from company knowledge sources.
- If the context does not contain relevant information, say so honestly and suggest contacting HR directly.
- Be professional, friendly, and concise.
- Never make up policies or information not present in the provided context.
- When citing information, reference the source document title.
- Protect employee privacy - never share personal information about other employees.`;

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

async function generateQueryEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ''}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding generation failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

async function retrieveRelevantContext(
  queryEmbedding: number[],
  adminClient: ReturnType<typeof getAdminClient>
): Promise<EmbeddingMatch[]> {
  const { data, error } = await adminClient.rpc('match_knowledge_embeddings', {
    query_embedding: queryEmbedding,
    match_threshold: EMBEDDING_MATCH_THRESHOLD,
    match_count: EMBEDDING_MATCH_COUNT,
  });

  if (error) {
    console.error('Error retrieving context from embeddings:', error);
    return [];
  }

  return (data as EmbeddingMatch[]) || [];
}

function buildContextPrompt(matches: EmbeddingMatch[]): string {
  if (matches.length === 0) {
    return 'No relevant company documents were found for this query.';
  }

  const contextParts = matches.map(
    (match, index) => `[Source ${index + 1}: ${match.metadata.source_title}]\n${match.content}`
  );

  return `Relevant company documents:\n\n${contextParts.join('\n\n---\n\n')}`;
}

function extractSourceCitations(matches: EmbeddingMatch[]): Array<{
  sourceId: string;
  title: string;
  similarity: number;
}> {
  const seen = new Set<string>();
  const citations: Array<{ sourceId: string; title: string; similarity: number }> = [];

  for (const match of matches) {
    if (!seen.has(match.metadata.source_id)) {
      seen.add(match.metadata.source_id);
      citations.push({
        sourceId: match.metadata.source_id,
        title: match.metadata.source_title,
        similarity: match.similarity,
      });
    }
  }

  return citations;
}

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthedSupabase();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = chatMessageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { message, conversationId, includeSourceCitations } = parsed.data;

    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI service is not configured' }, { status: 503 });
    }

    const adminClient = getAdminClient();

    // Step 1: Generate embedding for the user query
    let contextMatches: EmbeddingMatch[] = [];
    try {
      const queryEmbedding = await generateQueryEmbedding(message);
      contextMatches = await retrieveRelevantContext(queryEmbedding, adminClient);
    } catch (embeddingError) {
      console.error('Error generating query embedding:', embeddingError);
      // Continue without RAG context rather than failing the request
    }

    const contextPrompt = buildContextPrompt(contextMatches);
    const sourceCitations = includeSourceCitations ? extractSourceCitations(contextMatches) : [];

    // Step 2: Call Claude with streaming
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      system: `${SYSTEM_PROMPT}\n\n${contextPrompt}`,
      messages: [{ role: 'user', content: message }],
    });

    // Step 3: Stream the response using Server-Sent Events
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // Send source citations first if requested
          if (includeSourceCitations && sourceCitations.length > 0) {
            const citationEvent = `data: ${JSON.stringify({
              type: 'citations',
              citations: sourceCitations,
            })}\n\n`;
            controller.enqueue(encoder.encode(citationEvent));
          }

          let fullResponse = '';

          stream.on('text', (text) => {
            fullResponse += text;
            const textEvent = `data: ${JSON.stringify({
              type: 'text',
              text,
            })}\n\n`;
            controller.enqueue(encoder.encode(textEvent));
          });

          await stream.finalMessage();

          // Send done event
          const doneEvent = `data: ${JSON.stringify({
            type: 'done',
            conversationId: conversationId || null,
          })}\n\n`;
          controller.enqueue(encoder.encode(doneEvent));

          // Log the query to audit_logs (fire and forget)
          adminClient
            .from('audit_logs')
            .insert({
              user_id: user.id,
              action: 'ai_chat_query',
              resource_type: 'ai_chat',
              details: {
                message_length: message.length,
                response_length: fullResponse.length,
                sources_used: sourceCitations.length,
                conversation_id: conversationId || null,
              },
            })
            .then(({ error: auditError }) => {
              if (auditError) {
                console.error('Failed to log AI chat audit:', auditError);
              }
            });

          controller.close();
        } catch (streamError) {
          const errorEvent = `data: ${JSON.stringify({
            type: 'error',
            error: 'Stream processing failed',
          })}\n\n`;
          controller.enqueue(encoder.encode(errorEvent));
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

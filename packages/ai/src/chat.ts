import OpenAI from 'openai';

/**
 * Role of a participant in a chat conversation.
 */
export type ChatRole = 'user' | 'assistant';

/**
 * A single message in a chat conversation.
 */
export interface ChatMessage {
  /** The role of the message sender. */
  role: ChatRole;
  /** The text content of the message. */
  content: string;
}

/**
 * A context chunk retrieved from the knowledge base for RAG.
 */
export interface RetrievedContext {
  /** The text content of the context chunk. */
  content: string;
  /** Similarity score between 0 and 1. */
  similarityScore: number;
  /** Source document title, if available. */
  sourceTitle?: string;
  /** Source document identifier. */
  sourceId: string;
  /** Section heading within the source document. */
  section?: string;
  /** Chunk index within the source document. */
  chunkIndex?: number;
}

/**
 * Configuration for the RAG chat service.
 */
export interface ChatConfig {
  /** OpenAI API key. Falls back to OPENAI_API_KEY env var. */
  apiKey?: string;
  /** Model to use for chat completions. Defaults to "gpt-4o-mini". */
  model?: string;
  /** Maximum tokens in the response. Defaults to 2048. */
  maxTokens?: number;
  /** Temperature for response generation. Defaults to 0.3 for factual accuracy. */
  temperature?: number;
  /** Maximum number of context chunks to include. Defaults to 5. */
  maxContextChunks?: number;
  /** Minimum similarity score for context inclusion. Defaults to 0.3. */
  minSimilarityScore?: number;
  /** Custom system prompt override. If not provided, uses the default HR assistant prompt. */
  systemPrompt?: string;
}

/**
 * A source citation in the chat response.
 */
export interface SourceCitation {
  /** The source document title. */
  title: string;
  /** The source document identifier. */
  sourceId: string;
  /** The relevant section within the document. */
  section?: string | undefined;
  /** The similarity score of this source. */
  relevanceScore: number;
}

/**
 * Response from a non-streaming chat request.
 */
export interface ChatResponse {
  /** The assistant's response message. */
  message: string;
  /** Source citations used to generate the response. */
  citations: SourceCitation[];
  /** Token usage information. */
  usage: {
    /** Number of input tokens. */
    inputTokens: number;
    /** Number of output tokens. */
    outputTokens: number;
  };
  /** Whether context was available for the query. */
  hasContext: boolean;
}

/**
 * A single event in a streaming chat response.
 */
export type ChatStreamEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'citations'; citations: SourceCitation[] }
  | {
      type: 'done';
      usage: { inputTokens: number; outputTokens: number };
    }
  | { type: 'error'; error: string };

const DEFAULT_CHAT_CONFIG: Required<ChatConfig> = {
  apiKey: '',
  model: 'gpt-5.4-mini',
  maxTokens: 2048,
  temperature: 0.3,
  maxContextChunks: 5,
  minSimilarityScore: 0.3,
  systemPrompt: '',
};

const HR_SYSTEM_PROMPT = `You are Control Hub AI, an intelligent HR policy assistant for the Control Hub HR Portal. Your role is to help employees find accurate answers about company policies, procedures, benefits, and HR-related questions.

Guidelines:
1. Answer questions based ONLY on the provided context from the company knowledge base.
2. If the context does not contain sufficient information to answer the question, clearly state that you don't have enough information and suggest the user contact HR directly.
3. Be professional, concise, and helpful in your responses.
4. When referencing specific policies or documents, mention the source title.
5. Do not make up information or policies that are not in the provided context.
6. For sensitive topics (salary, termination, medical), advise the user to contact HR directly for personalized guidance.
7. Format responses with clear paragraphs and bullet points where appropriate.
8. If the question is not HR-related, politely redirect the user to relevant HR topics you can help with.

IMPORTANT: Never disclose confidential employee information such as SSN, payroll account numbers, salary details, medical records, personal addresses, or emergency contacts. If asked about such information, direct the user to HR or the relevant self-service portal.`;

/**
 * Builds the system prompt with retrieved context for RAG.
 *
 * @param contexts - Retrieved context chunks from the knowledge base
 * @param customSystemPrompt - Optional custom system prompt
 * @returns The complete system prompt with context
 */
function buildSystemPrompt(contexts: RetrievedContext[], customSystemPrompt?: string): string {
  const basePrompt = customSystemPrompt || HR_SYSTEM_PROMPT;

  if (contexts.length === 0) {
    return `${basePrompt}\n\nNote: No relevant context was found in the knowledge base for this query. Inform the user that you don't have specific information available and suggest they contact HR directly.`;
  }

  const contextSection = contexts
    .map((ctx, index) => {
      const source = ctx.sourceTitle
        ? `[Source: ${ctx.sourceTitle}${ctx.section ? ` - ${ctx.section}` : ''}]`
        : `[Source ID: ${ctx.sourceId}]`;
      return `--- Context ${index + 1} ${source} (Relevance: ${(ctx.similarityScore * 100).toFixed(0)}%) ---\n${ctx.content}`;
    })
    .join('\n\n');

  return `${basePrompt}\n\n=== KNOWLEDGE BASE CONTEXT ===\nUse the following context to answer the user's question. Cite sources when referencing specific information.\n\n${contextSection}\n\n=== END OF CONTEXT ===`;
}

/**
 * Filters and sorts context chunks based on configuration.
 *
 * @param contexts - All retrieved context chunks
 * @param config - Chat configuration
 * @returns Filtered and sorted context chunks
 */
function filterContexts(
  contexts: RetrievedContext[],
  config: Required<ChatConfig>
): RetrievedContext[] {
  return contexts
    .filter((ctx) => ctx.similarityScore >= config.minSimilarityScore)
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, config.maxContextChunks);
}

/**
 * Extracts source citations from the retrieved contexts.
 *
 * @param contexts - Retrieved context chunks used in the response
 * @returns Array of source citations
 */
function extractCitations(contexts: RetrievedContext[]): SourceCitation[] {
  const seen = new Set<string>();
  const citations: SourceCitation[] = [];

  for (const ctx of contexts) {
    const key = `${ctx.sourceId}:${ctx.section ?? ''}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    citations.push({
      title: ctx.sourceTitle ?? ctx.sourceId,
      sourceId: ctx.sourceId,
      section: ctx.section,
      relevanceScore: ctx.similarityScore,
    });
  }

  return citations;
}

/**
 * Creates an Anthropic client instance.
 *
 * @param apiKey - Optional API key override
 * @returns Configured OpenAI client
 */
function createClient(apiKey?: string): OpenAI {
  return new OpenAI({
    apiKey: apiKey || process.env['OPENAI_API_KEY'],
  });
}

/**
 * Sends a chat message with RAG context and returns a complete response.
 *
 * This function:
 * 1. Filters and ranks the provided context chunks
 * 2. Builds a system prompt with the relevant context
 * 3. Sends the conversation to Claude
 * 4. Returns the response with source citations
 *
 * @param messages - The conversation history
 * @param contexts - Retrieved context chunks from the knowledge base
 * @param config - Optional chat configuration
 * @returns The assistant's response with citations and usage info
 *
 * @example
 * ```typescript
 * const response = await chat(
 *   [{ role: "user", content: "What is the company leave policy?" }],
 *   retrievedContexts,
 * );
 * console.log(response.message);
 * console.log(response.citations);
 * ```
 */
export async function chat(
  messages: ChatMessage[],
  contexts: RetrievedContext[],
  config?: ChatConfig
): Promise<ChatResponse> {
  const mergedConfig: Required<ChatConfig> = {
    ...DEFAULT_CHAT_CONFIG,
    ...config,
  };
  const client = createClient(mergedConfig.apiKey);

  const filteredContexts = filterContexts(contexts, mergedConfig);
  const systemPrompt = buildSystemPrompt(filteredContexts, mergedConfig.systemPrompt || undefined);
  const citations = extractCitations(filteredContexts);

  const response = await client.chat.completions.create({
    model: mergedConfig.model,
    max_tokens: mergedConfig.maxTokens,
    temperature: mergedConfig.temperature,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  });

  const message = response.choices[0]?.message?.content ?? '';

  return {
    message,
    citations,
    usage: {
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
    },
    hasContext: filteredContexts.length > 0,
  };
}

/**
 * Sends a chat message with RAG context and returns a streaming response.
 *
 * Yields events as they arrive from the API:
 * - `text_delta`: A chunk of the response text
 * - `citations`: Source citations (emitted once at the start)
 * - `done`: Stream complete with usage information
 * - `error`: An error occurred during streaming
 *
 * @param messages - The conversation history
 * @param contexts - Retrieved context chunks from the knowledge base
 * @param config - Optional chat configuration
 * @returns An async generator yielding chat stream events
 *
 * @example
 * ```typescript
 * const stream = chatStream(
 *   [{ role: "user", content: "How do I request PTO?" }],
 *   retrievedContexts,
 * );
 *
 * for await (const event of stream) {
 *   switch (event.type) {
 *     case "text_delta":
 *       process.stdout.write(event.text);
 *       break;
 *     case "citations":
 *       console.log("Sources:", event.citations);
 *       break;
 *     case "done":
 *       console.log("\nTokens used:", event.usage);
 *       break;
 *     case "error":
 *       console.error("Error:", event.error);
 *       break;
 *   }
 * }
 * ```
 */
export async function* chatStream(
  messages: ChatMessage[],
  contexts: RetrievedContext[],
  config?: ChatConfig
): AsyncGenerator<ChatStreamEvent> {
  const mergedConfig: Required<ChatConfig> = {
    ...DEFAULT_CHAT_CONFIG,
    ...config,
  };
  const client = createClient(mergedConfig.apiKey);

  const filteredContexts = filterContexts(contexts, mergedConfig);
  const systemPrompt = buildSystemPrompt(filteredContexts, mergedConfig.systemPrompt || undefined);
  const citations = extractCitations(filteredContexts);

  // Emit citations at the start of the stream
  yield { type: 'citations', citations };

  try {
    const stream = await client.chat.completions.create({
      model: mergedConfig.model,
      max_tokens: mergedConfig.maxTokens,
      temperature: mergedConfig.temperature,
      stream: true,
      stream_options: { include_usage: true },
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    });

    let inputTokens = 0;
    let outputTokens = 0;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        yield { type: 'text_delta', text: delta };
      }
      if (chunk.usage) {
        inputTokens = chunk.usage.prompt_tokens ?? 0;
        outputTokens = chunk.usage.completion_tokens ?? 0;
      }
    }

    yield {
      type: 'done',
      usage: { inputTokens, outputTokens },
    };
  } catch (error) {
    yield {
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Sends a simple chat message without RAG context.
 * Useful for general conversation or follow-up questions
 * where context has already been established.
 *
 * @param messages - The conversation history
 * @param config - Optional chat configuration
 * @returns The assistant's response
 *
 * @example
 * ```typescript
 * const response = await chatWithoutContext([
 *   { role: "user", content: "Can you summarize the key points?" },
 * ]);
 * ```
 */
export async function chatWithoutContext(
  messages: ChatMessage[],
  config?: ChatConfig
): Promise<ChatResponse> {
  return chat(messages, [], config);
}

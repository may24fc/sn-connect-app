import { logActivity } from '@/lib/audit';
import { recordTiming, startTiming } from '@/lib/observability/timing';
import { type ChatMessage, type ChatStreamEvent, streamCompletion } from '@hr-portal/ai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getLangWatchTracer } from 'langwatch/observability';
import { INSIGHT_MAX_OUTPUT_TOKENS, INSIGHT_MAX_STORED_CHARS, INSIGHT_MODEL } from './config';
import {
  type InsightConversation,
  type InsightMessageStatus,
  insertMessage,
  touchConversation,
} from './conversations';
import type { InsightPseudonymizer } from './pseudonymize';
import type { RenderedInsightContext } from './render';

const TIMING_SCOPE = 'insight';
const langWatchTracer = getLangWatchTracer('sn-connect-performance-insights');

type Usage = { inputTokens: number; outputTokens: number };

type GenerateAnswer = (options: {
  systemPrompt: string;
  messages: Array<ChatMessage>;
  model: string;
  maxTokens: number;
  signal: AbortSignal;
}) => AsyncGenerator<ChatStreamEvent>;

export type InsightAnswerStreamParams = {
  supabase: SupabaseClient;
  supabaseAdmin: SupabaseClient;
  userId: string;
  conversation: InsightConversation;
  created: boolean;
  question: string;
  rendered: RenderedInsightContext;
  systemPrompt: string;
  modelMessages: Array<ChatMessage>;
  dataChangedSinceLastAnswer: boolean;
  requestSignal: AbortSignal;
  requestStartedAt: number;
  route: string;
  /** Restores person tokens to display labels before text leaves the server. */
  pseudonymizer: InsightPseudonymizer;
  /** Injected in tests; defaults to the OpenAI streaming helper. */
  generate?: GenerateAnswer;
};

type CollectedAnswer = {
  answer: string;
  usage: Usage;
  upstreamError: string | null;
  ttfbMs: number | null;
  streamMs: number;
};

function sseEvent(payload: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`);
}

async function collectAnswer(
  params: InsightAnswerStreamParams,
  signal: AbortSignal,
  send: (payload: Record<string, unknown>) => void
): Promise<CollectedAnswer> {
  const generate = params.generate ?? streamCompletion;
  const streamStartedAt = startTiming();
  const collected: CollectedAnswer = {
    answer: '',
    usage: { inputTokens: 0, outputTokens: 0 },
    upstreamError: null,
    ttfbMs: null,
    streamMs: 0,
  };
  const restorer = params.pseudonymizer.createStreamRestorer();
  const emit = (text: string) => {
    if (!text) return;
    collected.answer += text;
    send({ type: 'content', text });
  };

  for await (const event of generate({
    systemPrompt: params.systemPrompt,
    messages: params.modelMessages,
    model: INSIGHT_MODEL,
    maxTokens: INSIGHT_MAX_OUTPUT_TOKENS,
    signal,
  })) {
    if (event.type === 'text_delta') {
      collected.ttfbMs ??= recordTiming({
        scope: TIMING_SCOPE,
        layer: 'llm',
        operation: 'ttfb',
        route: params.route,
        startedAt: params.requestStartedAt,
      });
      emit(restorer.push(event.text));
    } else if (event.type === 'done') {
      collected.usage = event.usage;
    } else if (event.type === 'error') {
      collected.upstreamError = event.error;
    }
  }

  emit(restorer.flush());

  collected.streamMs = recordTiming({
    scope: TIMING_SCOPE,
    layer: 'llm',
    operation: 'stream_total',
    route: params.route,
    startedAt: streamStartedAt,
  });

  return collected;
}

async function persistAnswer(
  params: InsightAnswerStreamParams,
  collected: CollectedAnswer,
  outcome: InsightMessageStatus
): Promise<{ messageId: string | null; persistFailed: boolean }> {
  if (!collected.answer && outcome !== 'error') {
    return { messageId: null, persistFailed: false };
  }

  try {
    const messageId = await insertMessage(params.supabase, {
      conversationId: params.conversation.id,
      userId: params.userId,
      role: 'assistant',
      content: collected.answer.slice(0, INSIGHT_MAX_STORED_CHARS),
      status: outcome,
      contextSnapshotHash: params.rendered.snapshotHash,
      contextMeta: params.rendered.meta,
      model: INSIGHT_MODEL,
      inputTokens: collected.usage.inputTokens,
      outputTokens: collected.usage.outputTokens,
    });
    await touchConversation(params.supabase, params.conversation.id);
    return { messageId, persistFailed: false };
  } catch (error) {
    console.error('Failed to persist performance insight answer:', error);
    return { messageId: null, persistFailed: true };
  }
}

function finalEvent(
  collected: CollectedAnswer,
  persisted: { messageId: string | null; persistFailed: boolean }
): Record<string, unknown> {
  if (collected.upstreamError) {
    console.error('Performance insight generation failed:', collected.upstreamError);
    return {
      type: 'error',
      code: 'llm_failed',
      message: 'The AI could not answer right now. Please try again.',
    };
  }
  if (persisted.persistFailed) {
    return {
      type: 'error',
      code: 'persist_failed',
      message: 'The answer could not be saved. Please ask again.',
    };
  }
  return { type: 'done', messageId: persisted.messageId, usage: collected.usage };
}

/** Metadata only: prompts, answers, and reflection text never leave in traces or audit rows. */
function recordQuery(
  params: InsightAnswerStreamParams,
  collected: CollectedAnswer,
  outcome: InsightMessageStatus,
  persistFailed: boolean
): void {
  const { meta } = params.rendered;
  const span = langWatchTracer.startSpan('performance-insights-request');
  span.setType('llm');
  span.setRequestModel(INSIGHT_MODEL);
  span.setAttribute('langwatch.gen_ai.streaming', true);
  span.setAttribute('insights.evaluation_kind', params.conversation.evaluationKind);
  span.setAttribute('insights.period_key', meta.periodKey);
  span.setAttribute('insights.months_back', params.conversation.monthsBack);
  span.setAttribute('insights.submitted_count', meta.submittedCount);
  span.setAttribute('insights.truncation_level', meta.truncationLevel);
  span.setAttribute('insights.prior_mode', meta.priorMode);
  span.setAttribute('insights.context_tokens_estimate', params.rendered.tokenEstimate);
  span.setAttribute('insights.outcome', outcome);
  span.setMetrics({
    promptTokens: collected.usage.inputTokens,
    completionTokens: collected.usage.outputTokens,
  });
  span.end();

  logActivity(params.supabaseAdmin, {
    userId: params.userId,
    action: 'performance_insight_query',
    tableName: 'performance_insight_conversations',
    recordId: params.conversation.id,
    metadata: {
      evaluation_kind: params.conversation.evaluationKind,
      period_key: meta.periodKey,
      months_back: params.conversation.monthsBack,
      conversation_created: params.created,
      question_length: params.question.length,
      answer_length: collected.answer.length,
      input_tokens: collected.usage.inputTokens,
      output_tokens: collected.usage.outputTokens,
      model: INSIGHT_MODEL,
      truncation_level: meta.truncationLevel,
      prior_mode: meta.priorMode,
      ttfb_ms: collected.ttfbMs === null ? null : Math.round(collected.ttfbMs),
      stream_ms: Math.round(collected.streamMs),
      outcome,
      persist_failed: persistFailed,
      pseudonymized_people: params.pseudonymizer.tokenCount,
      pseudonymized_mentions: params.pseudonymizer.mentionCount(),
    },
  });
}

/**
 * Streams `conversation` → `context` → `content`* → `done | error` SSE frames.
 * The answer is persisted (or marked aborted/error) even if the client leaves.
 */
export function createInsightAnswerStream(
  params: InsightAnswerStreamParams
): ReadableStream<Uint8Array> {
  const upstream = new AbortController();
  const abortUpstream = () => upstream.abort();
  params.requestSignal.addEventListener('abort', abortUpstream, { once: true });

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: Record<string, unknown>) => {
        if (upstream.signal.aborted) return;
        try {
          controller.enqueue(sseEvent(payload));
        } catch {
          // The client disconnected; persistence below still runs.
        }
      };
      const { meta } = params.rendered;

      send({
        type: 'conversation',
        conversationId: params.conversation.id,
        title: params.conversation.title,
        created: params.created,
      });
      send({
        type: 'context',
        periodKey: meta.periodKey,
        monthsIncluded: meta.monthsIncluded,
        submittedCount: meta.submittedCount,
        pendingCount: meta.pendingCount,
        truncated: meta.truncationLevel > 0,
        priorMode: meta.priorMode,
        dataChangedSinceLastAnswer: params.dataChangedSinceLastAnswer,
      });

      const collected = await collectAnswer(params, upstream.signal, send);
      const outcome: InsightMessageStatus = upstream.signal.aborted
        ? 'aborted'
        : collected.upstreamError
          ? 'error'
          : 'complete';
      const persisted = await persistAnswer(params, collected, outcome);

      send(finalEvent(collected, persisted));
      recordQuery(params, collected, outcome, persisted.persistFailed);

      params.requestSignal.removeEventListener('abort', abortUpstream);
      try {
        controller.close();
      } catch {
        // Already closed by a client disconnect.
      }
    },
    cancel() {
      upstream.abort();
    },
  });
}

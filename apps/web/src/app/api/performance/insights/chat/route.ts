import { appendServerTiming, recordTiming, startTiming } from '@/lib/observability/timing';
import { createInsightAnswerStream } from '@/lib/performance/insights/answer-stream';
import {
  INSIGHT_HISTORY_MESSAGES,
  INSIGHT_RATE_LIMIT_PER_DAY,
  INSIGHT_RATE_LIMIT_PER_HOUR,
  INSIGHT_TITLE_MAX_CHARS,
} from '@/lib/performance/insights/config';
import {
  type InsightConversation,
  type InsightMessage,
  countRecentQuestions,
  createConversation,
  getConversation,
  insertMessage,
  listRecentMessages,
} from '@/lib/performance/insights/conversations';
import { buildHistoryMessages } from '@/lib/performance/insights/history';
import { buildInsightSystemPrompt } from '@/lib/performance/insights/prompt';
import { createPseudonymizer, pseudonymizeSource } from '@/lib/performance/insights/pseudonymize';
import { buildSnapshotHash, renderInsightContext } from '@/lib/performance/insights/render';
import { loadInsightSource } from '@/lib/performance/insights/source';
import { buildInsightStats } from '@/lib/performance/insights/stats';
import { performanceInsightChatSchema } from '@/lib/schemas/performance.schema';
import type { SupabaseClient } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { requireInsightAdmin } from '../_lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ROUTE = '/api/performance/insights/chat';
const TIMING_SCOPE = 'insight';
const HOUR_MS = 60 * 60 * 1000;

function conversationTitle(message: string): string {
  const singleLine = message.replace(/\s+/g, ' ').trim();
  return singleLine.length > INSIGHT_TITLE_MAX_CHARS
    ? `${singleLine.slice(0, INSIGHT_TITLE_MAX_CHARS - 1).trimEnd()}…`
    : singleLine;
}

/**
 * Counts with the admin client so questions in deleted conversations still
 * count. Called only after the performance-admin check; returns counts only.
 */
async function rateLimitResponse(
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<NextResponse | null> {
  const now = Date.now();
  const [lastHour, lastDay] = await Promise.all([
    countRecentQuestions(supabaseAdmin, userId, new Date(now - HOUR_MS)),
    countRecentQuestions(supabaseAdmin, userId, new Date(now - 24 * HOUR_MS)),
  ]);

  if (lastHour < INSIGHT_RATE_LIMIT_PER_HOUR && lastDay < INSIGHT_RATE_LIMIT_PER_DAY) {
    return null;
  }

  const retryAfterSeconds = lastDay >= INSIGHT_RATE_LIMIT_PER_DAY ? 24 * 60 * 60 : 60 * 60;
  return NextResponse.json(
    { error: 'Question limit reached. Try again later.', details: { retryAfterSeconds } },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
  );
}

function timing(operation: string, layer: string, startedAt: number): number {
  return recordTiming({ scope: TIMING_SCOPE, layer, operation, route: ROUTE, startedAt });
}

export async function POST(request: NextRequest) {
  const requestStartedAt = startTiming();

  try {
    const auth = await requireInsightAdmin();
    if (!auth.ok) return auth.response;
    const authMs = timing('auth', 'api', requestStartedAt);

    const parsed = performanceInsightChatSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid question', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'AI is not configured' }, { status: 503 });
    }

    const { supabase, supabaseAdmin, user } = auth.context;
    const input = parsed.data;

    const limited = await rateLimitResponse(supabaseAdmin, user.id);
    if (limited) return limited;

    // An existing conversation keeps the window it was created with.
    const existing: InsightConversation | null = input.conversationId
      ? await getConversation(supabase, input.conversationId)
      : null;
    if (input.conversationId && !existing) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
    const periodKey = existing?.periodKey ?? input.periodKey;
    const monthsBack = existing?.monthsBack ?? input.monthsBack;

    const contextStartedAt = startTiming();
    const [source, history] = await Promise.all([
      loadInsightSource(supabase, supabaseAdmin, periodKey, monthsBack),
      existing
        ? listRecentMessages(supabase, existing.id, INSIGHT_HISTORY_MESSAGES)
        : Promise.resolve<Array<InsightMessage>>([]),
    ]);

    if (source.reflections.length === 0) {
      return NextResponse.json(
        { error: 'No reflections are available for this month or the months before it.' },
        { status: 422 }
      );
    }

    // Names never reach the model: people become tokens, restored in the answer stream.
    const pseudonymizer = createPseudonymizer(source);
    const safeSource = pseudonymizeSource(source, pseudonymizer);
    const rendered = {
      ...renderInsightContext(safeSource, buildInsightStats(safeSource)),
      // Hash the real data so staleness checks match GET /conversations/[id].
      snapshotHash: buildSnapshotHash(source),
    };
    const systemPrompt = buildInsightSystemPrompt(rendered);
    const contextMs = timing('context', 'lib', contextStartedAt);

    const lastAnswerHash =
      [...history].reverse().find((message) => message.role === 'assistant')?.contextSnapshotHash ??
      null;

    const persistStartedAt = startTiming();
    const conversation =
      existing ??
      (await createConversation(supabase, {
        userId: user.id,
        kind: input.evaluationKind,
        periodKey,
        monthsBack,
        title: conversationTitle(input.message),
      }));
    await insertMessage(supabase, {
      conversationId: conversation.id,
      userId: user.id,
      role: 'user',
      content: input.message,
    });
    const persistMs = timing('persist_question', 'db', persistStartedAt);

    const stream = createInsightAnswerStream({
      supabase,
      supabaseAdmin,
      userId: user.id,
      conversation,
      created: existing === null,
      question: input.message,
      rendered,
      systemPrompt,
      // History comes from the database, never from the client; all of it is pseudonymized.
      modelMessages: [
        ...buildHistoryMessages(history),
        { role: 'user' as const, content: input.message },
      ].map((message) => ({
        ...message,
        content: pseudonymizer.pseudonymizeText(message.content),
      })),
      pseudonymizer,
      dataChangedSinceLastAnswer:
        lastAnswerHash !== null && lastAnswerHash !== rendered.snapshotHash,
      requestSignal: request.signal,
      requestStartedAt,
      route: ROUTE,
    });

    const headers = new Headers({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    appendServerTiming(headers, 'insight_auth', authMs, 'Auth and role');
    appendServerTiming(headers, 'insight_context', contextMs, 'Load and render context');
    appendServerTiming(headers, 'insight_persist', persistMs, 'Save question');

    return new Response(stream, { headers });
  } catch (error) {
    console.error('POST /api/performance/insights/chat error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

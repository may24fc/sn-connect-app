'use client';

import { ApiError, ensureOk, toApiError } from '@/lib/api-error';
import { createOptimisticMutation } from '@/lib/mutation-helpers';
import type {
  InsightConversation,
  InsightEvaluationKind,
  InsightMessage,
} from '@/lib/performance/insights/conversations';
import { queryKeys } from '@/lib/query-keys';
import { readSseStream } from '@/lib/sse/read-sse-stream';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { z } from 'zod';

export type { InsightConversation, InsightMessage };

export type InsightConversationList = {
  conversations: Array<InsightConversation>;
  total: number;
};

export type InsightConversationDetail = {
  conversation: InsightConversation;
  messages: Array<InsightMessage>;
  currentSnapshotHash: string;
  isStale: boolean;
};

const BASE_URL = '/api/performance/insights';

export function useInsightConversations(evaluationKind: InsightEvaluationKind, enabled = true) {
  return useQuery({
    queryKey: queryKeys.performance.insights.conversations(evaluationKind),
    enabled,
    queryFn: async (): Promise<InsightConversationList> => {
      const response = await fetch(
        `${BASE_URL}/conversations?${new URLSearchParams({ evaluationKind })}`,
        { credentials: 'include' }
      );
      await ensureOk(response, 'Failed to load conversations');
      const payload = (await response.json()) as { data: InsightConversationList };
      return payload.data;
    },
  });
}

async function fetchConversation(id: string): Promise<InsightConversationDetail> {
  const response = await fetch(`${BASE_URL}/conversations/${id}`, { credentials: 'include' });
  await ensureOk(response, 'Failed to load conversation');
  const payload = (await response.json()) as { data: InsightConversationDetail };
  return payload.data;
}

export function useInsightConversation(id: string | null) {
  return useQuery({
    queryKey: queryKeys.performance.insights.conversation(id ?? 'none'),
    enabled: Boolean(id),
    queryFn: () => fetchConversation(id as string),
  });
}

function updateList(
  current: unknown,
  update: (conversations: Array<InsightConversation>) => Array<InsightConversation>
): unknown {
  if (!current || typeof current !== 'object' || !('conversations' in current)) return current;
  const list = current as InsightConversationList;
  const conversations = update(list.conversations);
  return { conversations, total: list.total - (list.conversations.length - conversations.length) };
}

/** Optimistic: the title is user-entered and the server only validates it. */
export function useRenameInsightConversation(evaluationKind: InsightEvaluationKind) {
  const queryClient = useQueryClient();

  return useMutation(
    createOptimisticMutation<InsightConversation, { id: string; title: string }>(queryClient, {
      mutationFn: async ({ id, title }) => {
        const response = await fetch(`${BASE_URL}/conversations/${id}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title }),
        });
        await ensureOk(response, 'Failed to rename conversation');
        const payload = (await response.json()) as { data: InsightConversation };
        return payload.data;
      },
      queryKey: queryKeys.performance.insights.conversations(evaluationKind),
      optimisticUpdate: (current, { id, title }) =>
        updateList(current, (conversations) =>
          conversations.map((conversation) =>
            conversation.id === id ? { ...conversation, title } : conversation
          )
        ),
    })
  );
}

/** Optimistic after the caller confirms: removal is reversible by rollback. */
export function useDeleteInsightConversation(evaluationKind: InsightEvaluationKind) {
  const queryClient = useQueryClient();

  return useMutation(
    createOptimisticMutation<void, { id: string }>(queryClient, {
      mutationFn: async ({ id }) => {
        const response = await fetch(`${BASE_URL}/conversations/${id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        await ensureOk(response, 'Failed to delete conversation');
      },
      queryKey: queryKeys.performance.insights.conversations(evaluationKind),
      optimisticUpdate: (current, { id }) =>
        updateList(current, (conversations) =>
          conversations.filter((conversation) => conversation.id !== id)
        ),
    })
  );
}

const insightStreamEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('conversation'),
    conversationId: z.string(),
    title: z.string(),
    created: z.boolean(),
  }),
  z.object({
    type: z.literal('context'),
    periodKey: z.string(),
    monthsIncluded: z.array(z.string()),
    submittedCount: z.number(),
    pendingCount: z.number(),
    truncated: z.boolean(),
    priorMode: z.enum(['P0', 'P1', 'P2']),
    dataChangedSinceLastAnswer: z.boolean(),
  }),
  z.object({ type: z.literal('content'), text: z.string() }),
  z.object({
    type: z.literal('done'),
    messageId: z.string().nullable(),
    usage: z.object({ inputTokens: z.number(), outputTokens: z.number() }),
  }),
  z.object({ type: z.literal('error'), code: z.string(), message: z.string() }),
]);

export type InsightStreamContext = Extract<
  z.infer<typeof insightStreamEventSchema>,
  { type: 'context' }
>;

export type PendingInsightTurn = {
  question: string;
  answer: string;
  context: InsightStreamContext | null;
};

export type SendInsightQuestion = {
  conversationId: string | null;
  evaluationKind: InsightEvaluationKind;
  periodKey: string;
  monthsBack: number;
  message: string;
};

type InsightStreamEvent = z.infer<typeof insightStreamEventSchema>;

/** Applies one frame to the pending turn; returns the conversation id when announced. */
function applyStreamEvent(
  event: InsightStreamEvent,
  updateTurn: (update: (turn: PendingInsightTurn) => PendingInsightTurn) => void
): string | null {
  if (event.type === 'conversation') return event.conversationId;
  if (event.type === 'context') updateTurn((turn) => ({ ...turn, context: event }));
  if (event.type === 'content') {
    updateTurn((turn) => ({ ...turn, answer: turn.answer + event.text }));
  }
  return null;
}

/** Posts the question and applies streamed frames to the local pending turn. */
async function streamInsightAnswer(
  input: SendInsightQuestion,
  signal: AbortSignal,
  updateTurn: (update: (turn: PendingInsightTurn) => PendingInsightTurn) => void
): Promise<{ conversationId: string | null; streamError: Error | null }> {
  let conversationId = input.conversationId;
  let streamError: Error | null = null;

  try {
    const response = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(input.conversationId ? { conversationId: input.conversationId } : {}),
        evaluationKind: input.evaluationKind,
        periodKey: input.periodKey,
        monthsBack: input.monthsBack,
        message: input.message,
      }),
      signal,
    });

    if (!(response.ok && response.body)) {
      throw await toApiError(response, 'The AI could not answer right now.');
    }

    for await (const event of readSseStream(response.body, insightStreamEventSchema)) {
      conversationId = applyStreamEvent(event, updateTurn) ?? conversationId;
      if (event.type === 'error') streamError = new Error(event.message);
    }
  } catch (error) {
    if (!signal.aborted) {
      streamError = error instanceof Error ? error : new Error('The AI could not answer.');
    }
  }

  return { conversationId, streamError };
}

/**
 * Server-confirmed streaming: the question and the streamed answer render
 * locally, but nothing is written to the query cache until the server has
 * persisted both, then the conversation is refetched as the source of truth.
 */
export function useInsightChat(options: {
  onConversationReady: (conversationId: string) => void;
  onError: (question: string, error: ApiError | Error) => void;
}) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<PendingInsightTurn | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { onConversationReady, onError } = options;

  const send = useCallback(
    async (input: SendInsightQuestion) => {
      if (abortRef.current) return;
      const controller = new AbortController();
      abortRef.current = controller;
      setPending({ question: input.message, answer: '', context: null });

      const { conversationId, streamError } = await streamInsightAnswer(
        input,
        controller.signal,
        (update) => setPending((turn) => (turn ? update(turn) : turn))
      );
      abortRef.current = null;

      // Reconcile with the server before clearing the local turn so the
      // persisted messages replace it without a visible gap.
      await queryClient.invalidateQueries({
        queryKey: queryKeys.performance.insights.conversations(input.evaluationKind),
      });
      if (conversationId) {
        await queryClient
          .fetchQuery({
            queryKey: queryKeys.performance.insights.conversation(conversationId),
            queryFn: () => fetchConversation(conversationId as string),
            staleTime: 0,
          })
          .catch(() => undefined);
        onConversationReady(conversationId);
      }

      setPending(null);
      if (streamError) {
        onError(input.message, streamError);
      }
    },
    [onConversationReady, onError, queryClient]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { send, stop, pending, isStreaming: pending !== null };
}

export function getRetryAfterMinutes(error: unknown): number | null {
  if (!(error instanceof ApiError) || error.status !== 429) return null;
  const details = error.details as { retryAfterSeconds?: unknown } | undefined;
  return typeof details?.retryAfterSeconds === 'number'
    ? Math.ceil(details.retryAfterSeconds / 60)
    : null;
}

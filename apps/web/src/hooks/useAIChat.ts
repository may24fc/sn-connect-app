'use client';

import { queryKeys } from '@/lib/query-keys';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SourceCitation {
  sourceId: string;
  title: string;
  chunkText: string;
  relevanceScore: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<SourceCitation>;
  timestamp: Date;
  /** True while the assistant message is still being streamed. */
  isStreaming?: boolean;
}

export interface UseAIChatOptions {
  /** Seed the conversation with existing messages (e.g. a welcome message). */
  initialMessages?: Array<Message>;
  /** Called when a non-recoverable error occurs. */
  onError?: (error: Error) => void;
}

interface UseAIChatReturn {
  messages: Array<Message>;
  sendMessage: (content: string) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
  clearHistory: () => void;
  /** Abort an in-flight streaming response. */
  abort: () => void;
}

// ---------------------------------------------------------------------------
// Stream chunk types (mirrors API contract)
// ---------------------------------------------------------------------------

interface StreamChunkContent {
  type: 'content';
  text: string;
}

interface StreamChunkSources {
  type: 'sources';
  sources: Array<SourceCitation>;
}

interface StreamChunkError {
  type: 'error';
  message: string;
}

interface StreamChunkDone {
  type: 'done';
}

type StreamChunk = StreamChunkContent | StreamChunkSources | StreamChunkError | StreamChunkDone;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Parse a single SSE `data:` line into a StreamChunk.
 * Returns null for keep-alive or unparseable lines.
 */
function parseSSELine(line: string): StreamChunk | null {
  const trimmed = line.trim();
  if (!trimmed || !trimmed.startsWith('data:')) {
    return null;
  }
  const payload = trimmed.slice(5).trim();
  if (payload === '[DONE]') {
    return { type: 'done' };
  }
  try {
    return JSON.parse(payload) as StreamChunk;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAIChat(options?: UseAIChatOptions): UseAIChatReturn {
  const { initialMessages = [], onError } = options ?? {};

  const [messages, setMessages] = useState<Array<Message>>(initialMessages);
  const [error, setError] = useState<Error | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();

  // -----------------------------------------------------------------------
  // Core streaming logic wrapped in useMutation for TanStack Query integration
  // -----------------------------------------------------------------------
  const mutation = useMutation<void, Error, string>({
    mutationFn: async (content: string) => {
      setError(null);

      // Append the user message immediately (optimistic).
      const userMessage: Message = {
        id: generateMessageId(),
        role: 'user',
        content,
        timestamp: new Date(),
      };

      const assistantMessageId = generateMessageId();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);

      // Build the conversation history to send to the API.
      // Use the current messages state + the new user message.
      const historyForApi = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Set up abort controller for cancellation support.
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: historyForApi }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const errorMessage =
          (errorBody as { error?: string } | null)?.error ??
          `Chat request failed (${response.status})`;
        throw new Error(errorMessage);
      }

      const body = response.body;
      if (!body) {
        throw new Error('Response body is empty');
      }

      // Read the stream.
      const reader = body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let collectedSources: Array<SourceCitation> | undefined;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // SSE lines are separated by double newlines, but individual
          // `data:` lines are separated by single newlines.
          const lines = buffer.split('\n');
          // Keep the last (potentially incomplete) line in the buffer.
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const chunk = parseSSELine(line);
            if (!chunk) continue;

            switch (chunk.type) {
              case 'content': {
                // Append streamed text to the assistant message.
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId ? { ...m, content: m.content + chunk.text } : m
                  )
                );
                break;
              }
              case 'sources': {
                collectedSources = chunk.sources;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId ? { ...m, sources: chunk.sources } : m
                  )
                );
                break;
              }
              case 'error': {
                throw new Error(chunk.message);
              }
              case 'done': {
                // Stream finished; mark the message as no longer streaming.
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? {
                          ...m,
                          isStreaming: false,
                          ...(collectedSources ? { sources: collectedSources } : {}),
                        }
                      : m
                  )
                );
                break;
              }
            }
          }
        }

        // Handle any remaining buffer content after stream ends.
        if (buffer.trim()) {
          const chunk = parseSSELine(buffer);
          if (chunk?.type === 'content') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId ? { ...m, content: m.content + chunk.text } : m
              )
            );
          }
        }

        // Ensure the streaming flag is cleared even if no explicit `done` chunk was sent.
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMessageId ? { ...m, isStreaming: false } : m))
        );
      } finally {
        reader.releaseLock();
        abortControllerRef.current = null;
      }
    },

    onError: (err: Error) => {
      // If the request was intentionally aborted, don't surface it as an error.
      if (err.name === 'AbortError') {
        // Mark any streaming message as finished.
        setMessages((prev) => prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m)));
        return;
      }

      setError(err);
      onError?.(err);

      // Remove the empty assistant placeholder on error.
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && last.isStreaming && !last.content) {
          return prev.slice(0, -1);
        }
        // If the assistant had partial content, keep it but mark as not streaming.
        return prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m));
      });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiKnowledge.chat() });
    },
  });

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  const sendMessage = useCallback(
    async (content: string): Promise<void> => {
      const trimmed = content.trim();
      if (!trimmed) return;
      if (mutation.isPending) return;

      await mutation.mutateAsync(trimmed);
    },
    [mutation]
  );

  const clearHistory = useCallback((): void => {
    // Abort any in-flight request.
    abortControllerRef.current?.abort();
    setMessages(initialMessages);
    setError(null);
  }, [initialMessages]);

  const abort = useCallback((): void => {
    abortControllerRef.current?.abort();
  }, []);

  return {
    messages,
    sendMessage,
    isLoading: mutation.isPending,
    error,
    clearHistory,
    abort,
  };
}

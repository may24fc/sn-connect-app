'use client';

import type { InsightMessage, PendingInsightTurn } from '@/hooks/usePerformanceInsights';
import { Badge, Button, MarkdownContent, Skeleton } from '@hr-portal/ui';
import { AlertTriangle, Loader2, Sparkles } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { REFLECTION_STARTER_QUESTIONS } from './starterQuestions';

type InsightThreadProps = {
  messages: Array<InsightMessage>;
  pending: PendingInsightTurn | null;
  isLoading: boolean;
  loadError: string | null;
  onRetryLoad: () => void;
  isStale: boolean;
  isStreaming: boolean;
  windowLabel: string;
  onAskStarter: (question: string) => void;
};

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
        {content}
      </p>
    </div>
  );
}

function AssistantBubble({
  content,
  status,
}: {
  content: string;
  status: InsightMessage['status'] | 'streaming';
}) {
  return (
    <div className="max-w-full space-y-2" data-testid="insight-answer">
      {content ? (
        <MarkdownContent content={content} className="space-y-3 text-sm text-foreground/90" />
      ) : status === 'streaming' ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Reading reflections…
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">The AI could not answer this question.</p>
      )}
      {status === 'aborted' ? <Badge variant="outline">Stopped</Badge> : null}
      {status === 'error' ? <Badge variant="destructive">Answer failed</Badge> : null}
    </div>
  );
}

export function InsightThread({
  messages,
  pending,
  isLoading,
  loadError,
  onRetryLoad,
  isStale,
  isStreaming,
  windowLabel,
  onAskStarter,
}: InsightThreadProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const pendingLength = pending ? pending.question.length + pending.answer.length : 0;

  // biome-ignore lint/correctness/useExhaustiveDependencies: message count and streamed length are re-run triggers for keeping the latest answer in view
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, pendingLength]);

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
        <Skeleton className="ml-auto h-10 w-2/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="ml-auto h-10 w-1/2" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-muted-foreground">{loadError}</p>
        <Button variant="outline" size="sm" onClick={onRetryLoad}>
          Try again
        </Button>
      </div>
    );
  }

  const showStaleNotice = isStale || pending?.context?.dataChangedSinceLastAnswer === true;

  if (messages.length === 0 && !pending) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-xl space-y-5">
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
              Ask anything about {windowLabel}
            </p>
            <p className="text-sm text-muted-foreground">
              Answers use everyone&apos;s submitted 5% reflections plus rank trends from earlier
              months. Names are swapped for anonymous tokens before anything is sent to the AI and
              restored in the answer you see. Averages and counts are calculated first.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {REFLECTION_STARTER_QUESTIONS.map((question) => (
              <Button
                key={question}
                variant="outline"
                className="h-auto justify-start whitespace-normal py-2.5 text-left font-normal"
                onClick={() => onAskStarter(question)}
                disabled={isStreaming}
              >
                {question}
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 overflow-y-auto px-4 py-5 sm:px-6"
      aria-live="polite"
      aria-busy={isStreaming}
    >
      <div className="mx-auto max-w-3xl space-y-5">
        {showStaleNotice ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-100">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              Reflections changed since the last answer. Earlier answers may be out of date; new
              answers use the latest data.
            </span>
          </div>
        ) : null}
        {messages.map((message) =>
          message.role === 'user' ? (
            <UserBubble key={message.id} content={message.content} />
          ) : (
            <AssistantBubble key={message.id} content={message.content} status={message.status} />
          )
        )}
        {pending ? (
          <>
            <UserBubble content={pending.question} />
            <AssistantBubble content={pending.answer} status="streaming" />
            {pending.context?.truncated ? (
              <p className="text-xs text-muted-foreground">
                Some long answers were shortened so the whole month fits.
              </p>
            ) : null}
          </>
        ) : null}
        <div ref={endRef} />
      </div>
    </div>
  );
}

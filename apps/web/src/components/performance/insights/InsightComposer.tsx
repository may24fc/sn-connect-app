'use client';

import { INSIGHT_MAX_QUESTION_CHARS } from '@/lib/performance/insights/config';
import { Button, Textarea } from '@hr-portal/ui';
import { SendHorizontal, Square } from 'lucide-react';
import type { FormEvent, KeyboardEvent } from 'react';

type InsightComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  isStreaming: boolean;
};

export function InsightComposer({
  value,
  onChange,
  onSubmit,
  onStop,
  isStreaming,
}: InsightComposerProps) {
  const canSend = !isStreaming && value.trim().length > 0;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (canSend) onSubmit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (canSend) onSubmit();
    }
  };

  return (
    // Right padding on small screens keeps the counter clear of the floating assistant button.
    <form
      onSubmit={handleSubmit}
      className="border-t border-border bg-background px-4 pt-3 pb-4 pr-16 sm:px-6 sm:pr-20"
    >
      <label htmlFor="insight-question" className="sr-only">
        Ask a question about the reflections
      </label>
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <Textarea
            id="insight-question"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this month's reflections…"
            rows={2}
            maxLength={INSIGHT_MAX_QUESTION_CHARS}
            showCounter={false}
            className="max-h-40 min-h-[2.75rem] resize-none"
          />
        </div>
        {isStreaming ? (
          <Button type="button" variant="outline" onClick={onStop} aria-label="Stop answering">
            <Square className="h-4 w-4" />
            <span className="hidden sm:inline">Stop</span>
          </Button>
        ) : (
          <Button type="submit" disabled={!canSend} aria-label="Send question">
            <SendHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Send</span>
          </Button>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        AI answers can be wrong. Check them against the reflection detail.
        <span className="ml-2 tabular-nums">
          {value.length}/{INSIGHT_MAX_QUESTION_CHARS}
        </span>
      </p>
    </form>
  );
}

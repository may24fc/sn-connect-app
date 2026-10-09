'use client';

import { Label, Textarea, cn } from '@hr-portal/ui';

export const TERMINATION_REASON_MAX_LENGTH = 500;

const REASON_SUGGESTIONS = ['Resigned', 'Terminated', 'AWOL', 'End of internship', 'Contract ended'];

/** A chip fills an empty field; over custom text it is prepended so nothing typed is lost. */
function applySuggestion(current: string, suggestion: string): string {
  const trimmed = current.trim();
  if (!trimmed || REASON_SUGGESTIONS.includes(trimmed)) return suggestion;
  if (trimmed.toLowerCase().startsWith(suggestion.toLowerCase())) return current;
  return `${suggestion} — ${trimmed}`.slice(0, TERMINATION_REASON_MAX_LENGTH);
}

export function TerminationReasonField({
  id,
  value,
  onChange,
  disabled = false,
  label = 'Comment',
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick comments">
        {REASON_SUGGESTIONS.map((suggestion) => {
          const selected = value.trim().toLowerCase().startsWith(suggestion.toLowerCase());
          return (
            <button
              key={suggestion}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => onChange(applySuggestion(value, suggestion))}
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50',
                selected
                  ? 'border-primary/50 bg-primary-muted/40 font-medium text-foreground'
                  : 'border-input text-muted-foreground hover:border-primary/35 hover:text-foreground'
              )}
            >
              {suggestion}
            </button>
          );
        })}
      </div>
      <Textarea
        id={id}
        value={value}
        maxLength={TERMINATION_REASON_MAX_LENGTH}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Add context so the reason is on record (optional)"
        className="min-h-[84px] resize-y"
      />
    </div>
  );
}

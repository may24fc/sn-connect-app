'use client';

import { Button, Input } from '@hr-portal/ui';
import { Check, X } from 'lucide-react';
import { type KeyboardEvent, useState } from 'react';

const ADD_SOURCE = '__add_source__';

/**
 * Source dropdown with an "Add another source…" option that switches to a text field.
 * While adding, the text field carries `name`, so a surrounding form submits the typed
 * source even if "Add" was never pressed.
 */
export function UhpSourceSelect({
  id,
  name,
  value,
  options,
  onChange,
  disabled = false,
}: {
  id?: string;
  name?: string;
  value: string;
  options: ReadonlyArray<string>;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const choices = value && !options.includes(value) ? [...options, value] : options;

  function commit() {
    const source = draft.trim().replace(/\s+/g, ' ');
    if (!source) return;
    const existing = choices.find((option) => option.toLowerCase() === source.toLowerCase());
    onChange(existing ?? source);
    setAdding(false);
    setDraft('');
  }

  function cancel() {
    setAdding(false);
    setDraft('');
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      commit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
    }
  }

  if (adding) {
    return (
      <div className="flex gap-1">
        <Input
          id={id}
          name={name}
          value={draft}
          maxLength={300}
          placeholder="New source"
          autoFocus
          disabled={disabled}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label="Add source"
          disabled={disabled || !draft.trim()}
          onClick={commit}
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" aria-label="Cancel" onClick={cancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <select
        id={id}
        value={value}
        disabled={disabled}
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        onChange={(event) => {
          if (event.target.value === ADD_SOURCE) setAdding(true);
          else onChange(event.target.value);
        }}
      >
        <option value="">Not set</option>
        {choices.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
        <option value={ADD_SOURCE}>+ Add another source…</option>
      </select>
      {name && <input type="hidden" name={name} value={value} />}
    </>
  );
}

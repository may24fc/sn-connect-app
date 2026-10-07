'use client';

import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hr-portal/ui';
import { Check, X } from 'lucide-react';
import { type KeyboardEvent, useState } from 'react';

const ADD_SOURCE = '__add_source__';
const NO_SOURCE = '__no_source__';

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
      <Select
        value={value || NO_SOURCE}
        disabled={disabled}
        onValueChange={(nextValue) => {
          if (nextValue === ADD_SOURCE) setAdding(true);
          else onChange(nextValue === NO_SOURCE ? '' : nextValue);
        }}
      >
        <SelectTrigger id={id} className="h-10">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_SOURCE}>Not set</SelectItem>
          {choices.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
          <SelectItem value={ADD_SOURCE}>+ Add another source…</SelectItem>
        </SelectContent>
      </Select>
      {name && <input type="hidden" name={name} value={value} />}
    </>
  );
}

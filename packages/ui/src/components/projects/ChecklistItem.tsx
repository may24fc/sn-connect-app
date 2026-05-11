'use client';

import { Check, Circle, Trash2 } from 'lucide-react';
import type * as React from 'react';
import { cn } from '../../utils/cn';

export interface ChecklistItemProps {
  id: string;
  title: string;
  status: 'todo' | 'done';
  onToggle: (id: string, next: 'todo' | 'done') => void;
  onDelete?: (id: string) => void;
  disabled?: boolean;
  className?: string;
}

export function ChecklistItem({
  id,
  title,
  status,
  onToggle,
  onDelete,
  disabled = false,
  className,
}: ChecklistItemProps): React.ReactElement {
  const done = status === 'done';
  return (
    <div
      className={cn(
        'group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50',
        className
      )}
    >
      <button
        type="button"
        onClick={() => !disabled && onToggle(id, done ? 'todo' : 'done')}
        disabled={disabled}
        aria-pressed={done}
        aria-label={done ? 'Mark as not done' : 'Mark as done'}
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
          done
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : 'border-zinc-300 bg-white text-transparent hover:border-indigo-500 dark:border-zinc-600 dark:bg-zinc-900',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        {done ? <Check className="h-3 w-3" /> : <Circle className="h-3 w-3 opacity-0" />}
      </button>
      <span
        className={cn(
          'flex-1 text-sm',
          done
            ? 'text-zinc-400 line-through dark:text-zinc-500'
            : 'text-zinc-800 dark:text-zinc-200'
        )}
      >
        {title}
      </span>
      {onDelete && !disabled ? (
        <button
          type="button"
          onClick={() => onDelete(id)}
          aria-label="Delete checklist item"
          className="opacity-0 transition-opacity group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5 text-zinc-400 hover:text-red-500" />
        </button>
      ) : null}
    </div>
  );
}

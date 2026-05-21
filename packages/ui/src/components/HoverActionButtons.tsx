'use client';

import type { ReactNode } from 'react';
import { cn } from '../utils/cn';

type HoverActionTone = 'default' | 'danger' | 'success';

export interface HoverActionItem {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  tone?: HoverActionTone;
  disabled?: boolean;
}

export interface HoverActionButtonsProps {
  actions: HoverActionItem[];
  placement?: 'top-right' | 'bottom-right';
  className?: string;
}

const PLACEMENT_CLASSES: Record<NonNullable<HoverActionButtonsProps['placement']>, string> = {
  'top-right': 'right-2 top-2',
  'bottom-right': 'bottom-3 right-3',
};

const TONE_CLASSES: Record<HoverActionTone, string> = {
  default:
    'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200',
  danger:
    'text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400',
  success:
    'text-zinc-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400',
};

export function HoverActionButtons({
  actions,
  placement = 'top-right',
  className,
}: HoverActionButtonsProps): ReactNode {
  if (actions.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'absolute z-10 flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100',
        PLACEMENT_CLASSES[placement],
        className
      )}
    >
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          aria-label={action.label}
          className={cn(
            'inline-flex h-7 w-7 items-center justify-center rounded-md disabled:cursor-not-allowed disabled:opacity-50',
            TONE_CLASSES[action.tone ?? 'default']
          )}
          disabled={action.disabled}
          onClick={(event) => {
            event.stopPropagation();
            event.preventDefault();
            action.onClick();
          }}
        >
          {action.icon}
        </button>
      ))}
    </div>
  );
}
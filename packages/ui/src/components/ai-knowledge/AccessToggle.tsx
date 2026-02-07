'use client';

import * as React from 'react';
import { Button } from '../../primitives/button';
import { cn } from '../../utils/cn';
import type { AccessLevel } from '../../types/ai-knowledge.types';

export interface AccessToggleProps {
  value: AccessLevel;
  onChange: (value: AccessLevel) => void;
  disabled?: boolean;
  className?: string;
}

export function AccessToggle({
  value,
  onChange,
  disabled = false,
  className,
}: AccessToggleProps): React.ReactNode {
  const handleToggle = (): void => {
    if (!disabled) {
      onChange(value === 'all' ? 'admin' : 'all');
    }
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={handleToggle}
      disabled={disabled}
      className={cn(
        'h-7 px-3 text-xs font-medium transition-all rounded-full',
        value === 'all' && 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20 dark:text-emerald-400',
        value === 'admin' && 'bg-rose-500/10 text-rose-600 border-rose-500/30 hover:bg-rose-500/20 dark:text-rose-400',
        className
      )}
      aria-label={`Access level: ${value}. Click to toggle.`}
    >
      {value === 'all' ? 'All Users' : 'Admin Only'}
    </Button>
  );
}

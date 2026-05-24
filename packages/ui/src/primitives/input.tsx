'use client';

import * as React from 'react';
import { cn } from '../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const PICKER_INPUT_TYPES = new Set(['date', 'datetime-local', 'month', 'time', 'week']);

function isPickerInputType(type: string | undefined): boolean {
  return Boolean(type && PICKER_INPUT_TYPES.has(type));
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, onClick, ...props }, ref) => {
    const handleClick = React.useCallback(
      (event: React.MouseEvent<HTMLInputElement>) => {
        onClick?.(event);

        if (
          event.defaultPrevented ||
          !isPickerInputType(type) ||
          props.disabled ||
          props.readOnly
        ) {
          return;
        }

        try {
          event.currentTarget.focus();
          event.currentTarget.showPicker?.();
        } catch {
          // Some browsers restrict showPicker; falling back to native focus keeps default behavior.
        }
      },
      [onClick, props.disabled, props.readOnly, type]
    );

    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-600/20 focus-visible:border-slate-600 disabled:cursor-not-allowed disabled:opacity-50',
          isPickerInputType(type) && 'ui-date-input',
          error && 'border-rose-600 focus-visible:ring-rose-600/20 focus-visible:border-rose-600',
          className
        )}
        ref={ref}
        onClick={handleClick}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };

'use client';

import * as React from 'react';
import { cn } from '../utils/cn';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  showCounter?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      error,
      showCounter = true,
      maxLength,
      value,
      defaultValue,
      onChange,
      ...props
    },
    ref
  ) => {
    const resolvedMaxLength = typeof maxLength === 'number' ? maxLength : 3000;
    const initialLength =
      typeof value === 'string'
        ? value.length
        : typeof defaultValue === 'string'
          ? defaultValue.length
          : 0;
    const [uncontrolledLength, setUncontrolledLength] = React.useState(initialLength);

    React.useEffect(() => {
      if (typeof value === 'string') {
        setUncontrolledLength(value.length);
        return;
      }

      if (typeof defaultValue === 'string') {
        setUncontrolledLength(defaultValue.length);
      }
    }, [defaultValue, value]);

    const displayLength = typeof value === 'string' ? value.length : uncontrolledLength;

    const handleChange: React.ChangeEventHandler<HTMLTextAreaElement> = (event) => {
      setUncontrolledLength(event.target.value.length);
      onChange?.(event);
    };

    return (
      <div className="space-y-1">
        <textarea
          className={cn(
            'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-error focus-visible:ring-error/20',
            className
          )}
          ref={ref}
          maxLength={resolvedMaxLength}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          {...props}
        />
        {showCounter ? (
          <p className="text-right text-xs text-zinc-500 dark:text-zinc-400">
            {displayLength}/{resolvedMaxLength}
          </p>
        ) : null}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };

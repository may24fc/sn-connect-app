'use client';

import type * as React from 'react';
import { Label } from '../../primitives/label';
import { cn } from '../../utils/cn';

export interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  /** Whether the field is required */
  required?: boolean | undefined;
  /** Whether to show "(optional)" text for non-required fields */
  showOptional?: boolean | undefined;
  /** Whether the field has an error */
  hasError?: boolean | undefined;
  /** Optional icon to display before the label */
  icon?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * A modern form label component with built-in support for
 * required indicators, optional text, icons, and error states.
 */
export const FormLabel: React.FC<FormLabelProps> = ({
  required,
  showOptional = true,
  hasError,
  icon,
  children,
  className,
  ...props
}) => {
  return (
    <Label
      className={cn(
        'flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300',
        hasError && 'text-rose-600 dark:text-rose-400',
        className
      )}
      {...props}
    >
      {icon ? <span className="text-zinc-400 dark:text-zinc-500">{icon}</span> : null}
      {children}
      {required ? (
        <span className="text-rose-500 dark:text-rose-400" aria-label="required">
          *
        </span>
      ) : showOptional ? (
        <span className="text-zinc-400 dark:text-zinc-500 text-xs font-normal ml-1">
          (optional)
        </span>
      ) : null}
    </Label>
  );
};

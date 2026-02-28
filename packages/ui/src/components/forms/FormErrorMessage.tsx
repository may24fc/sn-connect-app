'use client';

import { AlertCircle } from 'lucide-react';
import type * as React from 'react';
import { cn } from '../../utils/cn';

export interface FormErrorMessageProps {
  message?: string | null | undefined;
  className?: string;
}

/**
 * A consistent error message component for all forms.
 * Displays an error with icon, animation, and proper accessibility attributes.
 */
export const FormErrorMessage: React.FC<FormErrorMessageProps> = ({ message, className }) => {
  if (!message) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400',
        'animate-in slide-in-from-top-1 fade-in duration-200',
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
};

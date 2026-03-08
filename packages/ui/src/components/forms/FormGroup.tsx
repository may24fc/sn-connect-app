'use client';

import type * as React from 'react';
import { cn } from '../../utils/cn';
import { FormErrorMessage } from './FormErrorMessage';
import { FormLabel } from './FormLabel';

export interface FormGroupProps {
  /** Field label text */
  label?: string;
  /** HTML for attribute to link label to input */
  htmlFor?: string;
  /** Whether the field is required */
  required?: boolean | undefined;
  /** Whether to show "(optional)" text for non-required fields */
  showOptional?: boolean | undefined;
  /** Error message to display */
  error?: string | null | undefined;
  /** Helper text shown below the input (hidden when error is shown) */
  description?: string | undefined;
  /** Optional icon to display in the label */
  icon?: React.ReactNode;
  /** Additional classes for the wrapper */
  className?: string;
  children: React.ReactNode;
}

/**
 * A complete form group component that combines label, input area,
 * description, and error message with consistent styling.
 *
 * Use this for forms that don't use react-hook-form.
 * For react-hook-form, use FormField instead.
 *
 * @example
 * ```tsx
 * <FormGroup
 *   label="Email Address"
 *   htmlFor="email"
 *   required
 *   error={errors.email}
 *   description="We'll never share your email."
 * >
 *   <Input id="email" type="email" error={!!errors.email} />
 * </FormGroup>
 * ```
 */
export const FormGroup: React.FC<FormGroupProps> = ({
  label,
  htmlFor,
  required,
  showOptional = true,
  error,
  description,
  icon,
  className,
  children,
}) => {
  const hasError = !!error;

  return (
    <div className={cn('space-y-2', className)}>
      {label ? (
        <FormLabel
          htmlFor={htmlFor}
          required={required === true ? true : undefined}
          showOptional={showOptional}
          hasError={hasError}
          icon={icon}
        >
          {label}
        </FormLabel>
      ) : null}
      {children}
      {description && !hasError ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{description}</p>
      ) : null}
      <FormErrorMessage message={error} />
    </div>
  );
};

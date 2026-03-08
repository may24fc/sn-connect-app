'use client';

import { AlertCircle } from 'lucide-react';
import type * as React from 'react';
import {
  Controller,
  type ControllerFieldState,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
  useFormContext,
} from 'react-hook-form';
import { Label } from '../../primitives/label';
import { cn } from '../../utils/cn';

export interface FormFieldRenderProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> {
  field: ControllerRenderProps<TFieldValues, TName> & { id: string };
  fieldState: ControllerFieldState;
  id: string;
}

export interface FormFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> {
  name: TName;
  label?: string | undefined;
  description?: string | undefined;
  required?: boolean | undefined;
  className?: string | undefined;
  id?: string | undefined;
  /** Optional icon to display before the label */
  icon?: React.ReactNode;
  children: (props: FormFieldRenderProps<TFieldValues, TName>) => React.ReactNode;
}

export const FormField = <TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>({
  name,
  label,
  description,
  required,
  className,
  id,
  icon,
  children,
}: FormFieldProps<TFieldValues, TName>) => {
  const { control } = useFormContext<TFieldValues>();
  const fieldId = id ?? `${String(name)}-field`;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const hasError = !!fieldState.error?.message;

        return (
          <div className={cn('space-y-2', className)}>
            {label ? (
              <Label
                htmlFor={fieldId}
                className={cn(
                  'flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300',
                  hasError && 'text-rose-600 dark:text-rose-400'
                )}
              >
                {icon ? <span className="text-zinc-400 dark:text-zinc-500">{icon}</span> : null}
                {label}
                {required ? (
                  <span className="text-rose-500 dark:text-rose-400" aria-label="required">
                    *
                  </span>
                ) : (
                  <span className="text-zinc-400 dark:text-zinc-500 text-xs font-normal ml-1">
                    (optional)
                  </span>
                )}
              </Label>
            ) : null}
            {children({
              field: { ...field, id: fieldId },
              fieldState,
              id: fieldId,
            })}
            {description && !hasError ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                {description}
              </p>
            ) : null}
            {hasError ? (
              <div
                className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 animate-in slide-in-from-top-1 fade-in duration-200"
                role="alert"
                aria-live="polite"
              >
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{fieldState.error?.message}</span>
              </div>
            ) : null}
          </div>
        );
      }}
    />
  );
};

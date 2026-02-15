'use client';

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
  children: (props: FormFieldRenderProps<TFieldValues, TName>) => React.ReactNode;
}

export const FormField = <TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>({
  name,
  label,
  description,
  required,
  className,
  id,
  children,
}: FormFieldProps<TFieldValues, TName>) => {
  const { control } = useFormContext<TFieldValues>();
  const fieldId = id ?? `${String(name)}-field`;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <div className={cn('space-y-1.5', className)}>
          {label ? (
            <Label htmlFor={fieldId}>
              {label}
              {required ? <span className="text-rose-600"> *</span> : null}
            </Label>
          ) : null}
          {children({
            field: { ...field, id: fieldId },
            fieldState,
            id: fieldId,
          })}
          {description ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
          ) : null}
          {fieldState.error?.message ? (
            <p className="text-xs text-rose-600">{fieldState.error.message}</p>
          ) : null}
        </div>
      )}
    />
  );
};

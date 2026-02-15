'use client';
import type { FieldPath, FieldValues } from 'react-hook-form';
import { Textarea, type TextareaProps } from '../../primitives/textarea';
import { FormField } from './FormField';

export interface FormTextareaProps<TFieldValues extends FieldValues>
  extends Omit<TextareaProps, 'name'> {
  name: FieldPath<TFieldValues>;
  label?: string;
  description?: string;
  required?: boolean;
}

export const FormTextarea = <TFieldValues extends FieldValues>({
  name,
  label,
  description,
  required,
  ...props
}: FormTextareaProps<TFieldValues>) => (
  <FormField name={name} label={label} description={description} required={required}>
    {({ field, fieldState }) => (
      <Textarea {...props} {...field} error={Boolean(fieldState.error)} />
    )}
  </FormField>
);

'use client';
import type { FieldPath, FieldValues } from 'react-hook-form';
import { Input, type InputProps } from '../../primitives/input';
import { FormField } from './FormField';

export interface FormInputProps<TFieldValues extends FieldValues> extends Omit<InputProps, 'name'> {
  name: FieldPath<TFieldValues>;
  label?: string;
  description?: string;
  required?: boolean;
}

export const FormInput = <TFieldValues extends FieldValues>({
  name,
  label,
  description,
  required,
  ...props
}: FormInputProps<TFieldValues>) => (
  <FormField name={name} label={label} description={description} required={required}>
    {({ field, fieldState }) => <Input {...props} {...field} error={Boolean(fieldState.error)} />}
  </FormField>
);

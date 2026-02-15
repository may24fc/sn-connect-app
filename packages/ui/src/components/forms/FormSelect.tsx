'use client';
import type { FieldPath, FieldValues } from 'react-hook-form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/select';
import { cn } from '../../utils/cn';
import { FormField } from './FormField';

export interface FormSelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface FormSelectProps<TFieldValues extends FieldValues> {
  name: FieldPath<TFieldValues>;
  label?: string;
  description?: string;
  required?: boolean;
  placeholder?: string;
  options: Array<FormSelectOption>;
  triggerClassName?: string;
}

export const FormSelect = <TFieldValues extends FieldValues>({
  name,
  label,
  description,
  required,
  placeholder = 'Select an option',
  options,
  triggerClassName,
}: FormSelectProps<TFieldValues>) => (
  <FormField name={name} label={label} description={description} required={required}>
    {({ field, fieldState, id }) => (
      <Select value={field.value ?? ''} onValueChange={field.onChange}>
        <SelectTrigger
          id={id}
          className={cn(
            fieldState.error ? 'border-rose-600 focus:ring-rose-600/20' : null,
            triggerClassName
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              {...(option.disabled !== undefined ? { disabled: option.disabled } : {})}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )}
  </FormField>
);

'use client';

import * as React from 'react';
import {
  FormProvider,
  type FieldValues,
  type SubmitHandler,
  type UseFormReturn,
} from 'react-hook-form';
import { cn } from '../../utils/cn';

export interface FormProps<TFieldValues extends FieldValues>
  extends Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  form: UseFormReturn<TFieldValues>;
  onSubmit: SubmitHandler<TFieldValues>;
}

export const Form = <TFieldValues extends FieldValues>({
  form,
  onSubmit,
  className,
  children,
  ...props
}: FormProps<TFieldValues>) => (
  <FormProvider {...form}>
    <form
      className={cn('space-y-6', className)}
      onSubmit={form.handleSubmit(onSubmit)}
      {...props}
    >
      {children}
    </form>
  </FormProvider>
);

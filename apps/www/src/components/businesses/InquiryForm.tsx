'use client';

import { type InquiryFormData, inquirySchema } from '@/lib/schemas/inquiry.schema';
import { InquiryPhoneInput } from '@/components/ui/InquiryPhoneInput';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle, MessageSquare, Send, X } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

interface InquiryFormProps {
  businessUnitId?: string;
  businessName?: string;
}

export function InquiryForm({ businessUnitId, businessName }: InquiryFormProps): ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<InquiryFormData>({
    resolver: zodResolver(inquirySchema),
    defaultValues: {
      business_unit_id: businessUnitId ?? null,
      company_website: '',
      form_started_at: Date.now(),
    },
  });

  async function onSubmit(data: InquiryFormData) {
    setSubmitError('');
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Submission failed' }));
        throw new Error(err.error ?? 'Submission failed');
      }
      setSubmitted(true);
      reset({
        business_unit_id: businessUnitId ?? null,
        company_website: '',
        form_started_at: Date.now(),
      });
    } catch (e) {
      setSubmitError(
        e instanceof Error
          ? e.message
          : 'Unable to submit your inquiry. Please check your connection and try again.'
      );
    }
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setSubmitted(false);
          setValue('form_started_at', Date.now());
          setValue('company_website', '');
        }}
        className={cn(
          'fixed right-6 bottom-6 z-30 flex items-center gap-2 rounded-full px-5 py-3 font-semibold shadow-lg transition-all',
          'bg-slate-900 text-white hover:bg-slate-800 hover:scale-105',
          isOpen && 'hidden'
        )}
      >
        <MessageSquare className="h-5 w-5" />
        Inquire Now
      </button>

      {/* Form Panel */}
      {isOpen && (
        <div className="fixed right-6 bottom-6 z-30 w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-mega">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-zinc-900">
              {businessName ? `Inquire about ${businessName}` : 'Send an Inquiry'}
            </h3>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-50"
              aria-label="Close inquiry form"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {submitted ? (
            <div className="mt-6 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              <p className="mt-3 font-semibold text-zinc-900">Thank you!</p>
              <p className="mt-1 text-sm text-zinc-500">
                We&apos;ve received your inquiry and will get back to you soon.
              </p>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="mt-4 text-sm font-medium text-amber-600 hover:underline"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -left-[10000px] h-px w-px overflow-hidden"
              >
                <label htmlFor="business-inquiry-company-website">Company website</label>
                <input
                  id="business-inquiry-company-website"
                  tabIndex={-1}
                  autoComplete="off"
                  {...register('company_website')}
                />
              </div>
              <input type="hidden" {...register('form_started_at', { valueAsNumber: true })} />
              <div>
                <input
                  {...register('name')}
                  placeholder="Your name"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
              </div>
              <div>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="Email address"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>
              <div>
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <InquiryPhoneInput
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="Enter phone number"
                    />
                  )}
                />
                {errors.phone && (
                  <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>
                )}
              </div>
              <div>
                <input
                  {...register('subject')}
                  placeholder="Subject"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                />
                {errors.subject && (
                  <p className="mt-1 text-xs text-red-500">{errors.subject.message}</p>
                )}
              </div>
              <div>
                <textarea
                  {...register('message')}
                  rows={3}
                  placeholder="Your message"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                />
                {errors.message && (
                  <p className="mt-1 text-xs text-red-500">{errors.message.message}</p>
                )}
              </div>

              {submitError && <p className="text-sm text-red-500">{submitError}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {isSubmitting ? 'Sending...' : 'Send Inquiry'}
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}

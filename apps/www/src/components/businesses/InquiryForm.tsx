'use client';

import { type ReactNode, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MessageSquare, Send, CheckCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { inquirySchema, type InquiryFormData } from '@/lib/schemas/inquiry.schema';

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
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InquiryFormData>({
    resolver: zodResolver(inquirySchema),
    defaultValues: {
      business_unit_id: businessUnitId ?? null,
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
      reset();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Something went wrong');
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
        }}
        className={cn(
          'fixed right-6 bottom-6 z-30 flex items-center gap-2 rounded-full px-5 py-3 font-semibold shadow-lg transition-all',
          'bg-indigo-600 text-white hover:bg-indigo-500 hover:scale-105',
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
                className="mt-4 text-sm font-medium text-indigo-600 hover:underline"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3">
              <div>
                <input
                  {...register('name')}
                  placeholder="Your name"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
                )}
              </div>
              <div>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="Email address"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>
              <div>
                <input
                  {...register('phone')}
                  placeholder="Phone (optional)"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none"
                />
              </div>
              <div>
                <input
                  {...register('subject')}
                  placeholder="Subject"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none"
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
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none"
                />
                {errors.message && (
                  <p className="mt-1 text-xs text-red-500">{errors.message.message}</p>
                )}
              </div>

              {submitError && (
                <p className="text-sm text-red-500">{submitError}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
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

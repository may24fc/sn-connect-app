'use client';

import { type ReactNode, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Send, CheckCircle } from 'lucide-react';
import { inquirySchema, type InquiryFormData } from '@/lib/schemas/inquiry.schema';
import { BUSINESS_UNITS } from '@/data/placeholder';

export function ContactForm(): ReactNode {
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InquiryFormData>({
    resolver: zodResolver(inquirySchema),
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

  if (submitted) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center shadow-card">
        <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
        <h3 className="mt-4 text-2xl font-bold text-zinc-900">Message Sent!</h3>
        <p className="mt-2 text-zinc-600">
          Thank you for reaching out. We&apos;ll get back to you within 1–2 business days.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-6 text-sm font-semibold text-indigo-600 hover:underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-card"
    >
      <h3 className="text-xl font-bold text-zinc-900">Send Us a Message</h3>
      <p className="mt-1 text-sm text-zinc-500">
        Fill out the form and our team will respond promptly.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {/* Name */}
        <div className="sm:col-span-1">
          <label htmlFor="contact-name" className="block text-sm font-medium text-zinc-700">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            id="contact-name"
            {...register('name')}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
          )}
        </div>

        {/* Email */}
        <div className="sm:col-span-1">
          <label htmlFor="contact-email" className="block text-sm font-medium text-zinc-700">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            id="contact-email"
            type="email"
            {...register('email')}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        {/* Phone */}
        <div className="sm:col-span-1">
          <label htmlFor="contact-phone" className="block text-sm font-medium text-zinc-700">
            Phone
          </label>
          <input
            id="contact-phone"
            {...register('phone')}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none"
          />
        </div>

        {/* Business unit selector */}
        <div className="sm:col-span-1">
          <label htmlFor="contact-bu" className="block text-sm font-medium text-zinc-700">
            Regarding
          </label>
          <select
            id="contact-bu"
            {...register('business_unit_id')}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none"
          >
            <option value="">General Inquiry</option>
            {BUSINESS_UNITS.map((u) => (
              <option key={u.slug} value={u.slug}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        {/* Subject */}
        <div className="sm:col-span-2">
          <label htmlFor="contact-subject" className="block text-sm font-medium text-zinc-700">
            Subject <span className="text-red-500">*</span>
          </label>
          <input
            id="contact-subject"
            {...register('subject')}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none"
          />
          {errors.subject && (
            <p className="mt-1 text-xs text-red-500">{errors.subject.message}</p>
          )}
        </div>

        {/* Message */}
        <div className="sm:col-span-2">
          <label htmlFor="contact-message" className="block text-sm font-medium text-zinc-700">
            Message <span className="text-red-500">*</span>
          </label>
          <textarea
            id="contact-message"
            {...register('message')}
            rows={5}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none"
          />
          {errors.message && (
            <p className="mt-1 text-xs text-red-500">{errors.message.message}</p>
          )}
        </div>
      </div>

      {submitError && <p className="mt-4 text-sm text-red-500">{submitError}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
      >
        <Send className="h-4 w-4" />
        {isSubmitting ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  );
}

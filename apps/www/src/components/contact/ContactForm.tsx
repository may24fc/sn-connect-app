'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle, User, Mail, Phone, MessageSquare, Type, Clock } from 'lucide-react';
import { inquirySchema, type InquiryFormData } from '@/lib/schemas/inquiry.schema';
import SplitCTA from '@/components/ui/SplitCTA';

export function ContactForm(): ReactNode {
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const searchParams = useSearchParams();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<InquiryFormData>({
    resolver: zodResolver(inquirySchema),
    defaultValues: {
      business_unit_id: null,
    },
  });

  useEffect(() => {
    const requestedService = searchParams.get('need') ?? searchParams.get('service');

    if (!requestedService) {
      return;
    }

    const normalizedService = requestedService
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!normalizedService) {
      return;
    }

    setValue('subject', `Support needed: ${normalizedService}`);
  }, [searchParams, setValue]);

  async function onSubmit(data: InquiryFormData) {
    setSubmitError('');
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          business_unit_id: null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Submission failed' }));
        throw new Error(err.error ?? 'Submission failed');
      }
      setSubmitted(true);
      reset();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Unable to send your message. Please check your connection and try again.');
    }
  }

  if (submitted) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white p-12 text-center shadow-card">
        <CheckCircle className="h-12 w-12 text-primary-800" />
        <h3 className="mt-4 text-2xl font-bold text-zinc-900">Brief received</h3>
        <p className="mt-2 text-zinc-600">
          Thank you for sharing your support needs. We&apos;ll review the brief and reply with next steps within 1 business day.
        </p>
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-800">
          <Clock className="h-3.5 w-3.5" />
          Estimated response: within 24 hours
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="text-sm font-semibold text-primary-800 hover:underline"
          >
            Submit another brief
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-8 shadow-card"
    >
      {/* <h3 className="text-xl font-semibold text-[#0c1d2e]">Request support</h3>
      <p className="mt-1 text-sm text-zinc-500">
        Give us enough context to scope the right role, working style, and next step.
      </p> */}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 button-mono font-medium uppercase">
        {/* Name */}
        <div className="sm:col-span-1">
          <label htmlFor="contact-name" className="block text-xs">
            Full Name <span className="text-[#3b86d2]">*</span>
          </label>
          <div className="relative mt-1">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              id="contact-name"
              {...register('name')}
              placeholder="Your full name"
              className="w-full rounded-lg border border-zinc-200 py-2.5 pl-10 pr-3 text-xs uppercase focus:border-primary-800 focus:ring-1 focus:ring-primary-800 focus:outline-none"
            />
          </div>
          {errors.name && (
            <p className="mt-1 text-xs uppercase text-red-500">{errors.name.message}</p>
          )}
        </div>

        {/* Email */}
        <div className="sm:col-span-1">
          <label htmlFor="contact-email" className="block text-xs">
            Email <span className="text-[#3b86d2]">*</span>
          </label>
          <div className="relative mt-1">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              id="contact-email"
              type="email"
              {...register('email')}
              placeholder="name@company.com"
              className="w-full rounded-lg border border-zinc-200 py-2.5 pl-10 pr-3 text-xs uppercase focus:border-primary-800 focus:ring-1 focus:ring-primary-800 focus:outline-none"
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        {/* Phone */}
        <div className="sm:col-span-2">
          <label htmlFor="contact-phone" className="block text-xs">
            Phone
          </label>
          <div className="relative mt-1">
            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              id="contact-phone"
              {...register('phone')}
              placeholder="Optional"
              className="w-full rounded-lg border border-zinc-200 py-2.5 pl-10 pr-3 text-xs uppercase focus:border-primary-800 focus:ring-1 focus:ring-primary-800 focus:outline-none"
            />
          </div>
        </div>

        {/* Subject */}
        <div className="sm:col-span-2">
          <label htmlFor="contact-subject" className="block text-xs">
            What support do you need? <span className="text-[#3b86d2]">*</span>
          </label>
          <div className="relative mt-1">
            <Type className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              id="contact-subject"
              {...register('subject')}
              placeholder="Executive assistance for inbox, calendar, etc."
              className="w-full rounded-lg border border-zinc-200 py-2.5 pl-10 pr-3 text-xs uppercase focus:border-primary-800 focus:ring-1 focus:ring-primary-800 focus:outline-none"
            />
          </div>
          {errors.subject && (
            <p className="mt-1 text-xs text-red-500">{errors.subject.message}</p>
          )}
        </div>

        {/* Message */}
        <div className="sm:col-span-2">
          <label htmlFor="contact-message" className="block text-xs">
            Brief details <span className="text-[#3b86d2]">*</span>
          </label>
          <div className="relative mt-1">
            <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
            <textarea
              id="contact-message"
              {...register('message')}
              rows={5}
              placeholder="Tell us about the tasks, hours, timezone, tools, and how quickly you want to start."
              className="w-full rounded-lg border border-zinc-200 py-2.5 pl-10 pr-3 text-xs uppercase focus:border-primary-800 focus:ring-1 focus:ring-primary-800 focus:outline-none"
            />
          </div>
          {errors.message && (
            <p className="mt-1 text-xs text-red-500">{errors.message.message}</p>
          )}
        </div>
      </div>

      {submitError && <p className="mt-4 text-sm text-red-500">{submitError}</p>}

      <div className="mt-auto pt-6 flex flex-col gap-3">
        <div
          className={`flex justify-end${isSubmitting ? ' pointer-events-none opacity-60' : ''}`}
          style={{ '--btn-main-bg': '#0c1d2e', '--btn-arrow-bg': '#3b86d2' } as React.CSSProperties}
        >
          <SplitCTA
            title={isSubmitting ? 'SENDING...' : 'SEND BRIEF'}
            onClick={handleSubmit(onSubmit)}
            ariaLabel={isSubmitting ? 'Sending your brief' : 'Send brief'}
          />
        </div>
      </div>
    </form>
  );
}

'use client';

import { type ReactNode, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Send, CheckCircle, User, Mail, Phone, Building2, MessageSquare, Type, Clock } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hr-portal/ui';
import { inquirySchema, type InquiryFormData } from '@/lib/schemas/inquiry.schema';
import { BUSINESS_UNITS } from '@/data/placeholder';

export function ContactForm(): ReactNode {
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    control,
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
      setSubmitError(e instanceof Error ? e.message : 'Unable to send your message. Please check your connection and try again.');
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center shadow-card">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 animate-[bounceIn_0.5s_ease-out]">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="mt-4 text-2xl font-bold text-zinc-900">Message Sent!</h3>
        <p className="mt-2 text-zinc-600">
          Thank you for reaching out. We&apos;ll get back to you within 1–2 business days.
        </p>
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-600">
          <Clock className="h-3.5 w-3.5" />
          Estimated response: 24–48 hours
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="text-sm font-semibold text-amber-600 hover:underline"
          >
            Send another message
          </button>
        </div>
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
          <div className="relative mt-1">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              id="contact-name"
              {...register('name')}
              className="w-full rounded-lg border border-zinc-200 py-2.5 pl-10 pr-3 text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
            />
          </div>
          {errors.name && (
            <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
          )}
        </div>

        {/* Email */}
        <div className="sm:col-span-1">
          <label htmlFor="contact-email" className="block text-sm font-medium text-zinc-700">
            Email <span className="text-red-500">*</span>
          </label>
          <div className="relative mt-1">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              id="contact-email"
              type="email"
              {...register('email')}
              className="w-full rounded-lg border border-zinc-200 py-2.5 pl-10 pr-3 text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        {/* Phone */}
        <div className="sm:col-span-1">
          <label htmlFor="contact-phone" className="block text-sm font-medium text-zinc-700">
            Phone
          </label>
          <div className="relative mt-1">
            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              id="contact-phone"
              {...register('phone')}
              className="w-full rounded-lg border border-zinc-200 py-2.5 pl-10 pr-3 text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
            />
          </div>
        </div>

        {/* Business unit selector */}
        <div className="sm:col-span-1">
          <label htmlFor="contact-bu" className="block text-sm font-medium text-zinc-700">
            Regarding
          </label>
          <div className="mt-1">
            <Controller
              name="business_unit_id"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-zinc-400" />
                      <SelectValue placeholder="General Inquiry" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Inquiry</SelectItem>
                    {BUSINESS_UNITS.map((u) => (
                      <SelectItem key={u.slug} value={u.slug}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        {/* Subject */}
        <div className="sm:col-span-2">
          <label htmlFor="contact-subject" className="block text-sm font-medium text-zinc-700">
            Subject <span className="text-red-500">*</span>
          </label>
          <div className="relative mt-1">
            <Type className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              id="contact-subject"
              {...register('subject')}
              className="w-full rounded-lg border border-zinc-200 py-2.5 pl-10 pr-3 text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
            />
          </div>
          {errors.subject && (
            <p className="mt-1 text-xs text-red-500">{errors.subject.message}</p>
          )}
        </div>

        {/* Message */}
        <div className="sm:col-span-2">
          <label htmlFor="contact-message" className="block text-sm font-medium text-zinc-700">
            Message <span className="text-red-500">*</span>
          </label>
          <div className="relative mt-1">
            <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
            <textarea
              id="contact-message"
              {...register('message')}
              rows={5}
              className="w-full rounded-lg border border-zinc-200 py-2.5 pl-10 pr-3 text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
            />
          </div>
          {errors.message && (
            <p className="mt-1 text-xs text-red-500">{errors.message.message}</p>
          )}
        </div>
      </div>

      {submitError && <p className="mt-4 text-sm text-red-500">{submitError}</p>}

      <div className="mt-6 flex flex-col gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {isSubmitting ? 'Sending...' : 'Send Message'}
        </button>
        <p className="text-center text-xs text-zinc-400">
          We typically respond within 24 hours during business days.
        </p>
      </div>
    </form>
  );
}

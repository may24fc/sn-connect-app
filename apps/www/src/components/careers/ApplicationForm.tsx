'use client';

import { type ReactNode, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Upload, CheckCircle, Send } from 'lucide-react';
import { applicationSchema, type ApplicationFormData } from '@/lib/schemas/application.schema';

interface ApplicationFormProps {
  preselectedJobId?: string;
}

export function ApplicationForm({ preselectedJobId }: ApplicationFormProps): ReactNode {
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      job_posting_id: preselectedJobId ?? '',
    },
  });

  async function onSubmit(data: ApplicationFormData) {
    setSubmitError('');
    try {
      const formData = new FormData();
      formData.append('full_name', data.full_name);
      formData.append('email', data.email);
      formData.append('job_posting_id', data.job_posting_id);
      if (data.phone) formData.append('phone', data.phone);
      if (data.cover_letter) formData.append('cover_letter', data.cover_letter);
      if (selectedFile) formData.append('resume', selectedFile);

      const res = await fetch('/api/applications', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Submission failed' }));
        throw new Error(err.error ?? 'Submission failed');
      }

      setSubmitted(true);
      reset();
      setSelectedFile(null);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Something went wrong');
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center shadow-card">
        <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
        <h3 className="mt-4 text-2xl font-bold text-zinc-900">Application Submitted!</h3>
        <p className="mt-2 text-zinc-600">
          Thank you for your interest in joining SN International Group. Our team will review your application and get back to you soon.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-6 text-sm font-semibold text-indigo-600 hover:underline"
        >
          Submit another application
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-card"
    >
      <h3 className="text-xl font-bold text-zinc-900">Apply Now</h3>
      <p className="mt-1 text-sm text-zinc-500">
        Fill out the form below and upload your resume to apply.
      </p>

      <div className="mt-6 space-y-4">
        {/* Full name */}
        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-zinc-700">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            id="full_name"
            {...register('full_name')}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none"
          />
          {errors.full_name && (
            <p className="mt-1 text-xs text-red-500">{errors.full_name.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            type="email"
            {...register('email')}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-zinc-700">
            Phone Number
          </label>
          <input
            id="phone"
            {...register('phone')}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none"
          />
        </div>

        {/* Job posting ID (hidden when preselected) */}
        {!preselectedJobId && (
          <div>
            <label htmlFor="job_posting_id" className="block text-sm font-medium text-zinc-700">
              Position <span className="text-red-500">*</span>
            </label>
            <input
              id="job_posting_id"
              {...register('job_posting_id')}
              placeholder="Select a position from the listings above"
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none"
            />
            {errors.job_posting_id && (
              <p className="mt-1 text-xs text-red-500">{errors.job_posting_id.message}</p>
            )}
          </div>
        )}

        {/* Resume upload */}
        <div>
          <label className="block text-sm font-medium text-zinc-700">Resume / CV</label>
          <label
            htmlFor="resume-upload"
            className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-200 px-4 py-6 text-sm text-zinc-500 transition-colors hover:border-indigo-600 hover:bg-indigo-50"
          >
            <Upload className="h-5 w-5" />
            {selectedFile ? selectedFile.name : 'Click to upload (PDF, DOC, DOCX — max 5MB)'}
          </label>
          <input
            id="resume-upload"
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && file.size <= 5 * 1024 * 1024) {
                setSelectedFile(file);
              }
            }}
          />
        </div>

        {/* Cover letter */}
        <div>
          <label htmlFor="cover_letter" className="block text-sm font-medium text-zinc-700">
            Cover Letter (optional)
          </label>
          <textarea
            id="cover_letter"
            {...register('cover_letter')}
            rows={4}
            placeholder="Tell us why you'd be a great fit..."
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none"
          />
        </div>
      </div>

      {submitError && <p className="mt-4 text-sm text-red-500">{submitError}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
      >
        <Send className="h-4 w-4" />
        {isSubmitting ? 'Submitting...' : 'Submit Application'}
      </button>
    </form>
  );
}

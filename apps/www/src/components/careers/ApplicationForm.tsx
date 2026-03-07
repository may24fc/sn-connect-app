'use client';

import { type ReactNode, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Upload, CheckCircle, Send, ChevronRight, ChevronLeft, User, Mail, Phone, FileText, X } from 'lucide-react';
import { applicationSchema, type ApplicationFormData } from '@/lib/schemas/application.schema';
import { PLACEHOLDER_JOBS } from '@/data/placeholder';

interface JobOption {
  id: string;
  title: string;
}

interface ApplicationFormProps {
  preselectedJobId?: string;
}

const STEPS = [
  { label: 'Personal Info', fields: ['full_name', 'email', 'phone'] as const },
  { label: 'Position & Resume', fields: ['job_posting_id'] as const },
  { label: 'Cover Letter', fields: ['cover_letter'] as const },
  { label: 'Review', fields: [] as const },
];

export function ApplicationForm({ preselectedJobId }: ApplicationFormProps): ReactNode {
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobOptions, setJobOptions] = useState<JobOption[]>([]);
  const [step, setStep] = useState(0);

  // Fetch available positions for the dropdown
  useEffect(() => {
    fetch('/api/jobs')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Array<{ id: string; title: string }>) => {
        if (Array.isArray(data) && data.length > 0) {
          setJobOptions(data.map((j) => ({ id: j.id, title: j.title })));
        } else {
          // Fall back to placeholder jobs
          setJobOptions(PLACEHOLDER_JOBS.map((j) => ({ id: j.id, title: j.title })));
        }
      })
      .catch(() => {
        setJobOptions(PLACEHOLDER_JOBS.map((j) => ({ id: j.id, title: j.title })));
      });
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    trigger,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      job_posting_id: preselectedJobId ?? '',
    },
  });

  const watchedValues = watch();

  async function onSubmit(data: ApplicationFormData) {
    // Guard: only submit on the final review step to prevent accidental
    // submission from button-position overlap during step transitions.
    if (step !== STEPS.length - 1) return;
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
      setStep(0);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Something went wrong');
    }
  }

  async function goNext() {
    const currentFields = STEPS[step]?.fields ?? [];
    if (currentFields.length > 0) {
      const valid = await trigger(currentFields as unknown as (keyof ApplicationFormData)[]);
      if (!valid) return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  const selectedJobTitle = jobOptions.find((j) => j.id === watchedValues.job_posting_id)?.title ?? watchedValues.job_posting_id;

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center shadow-card">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
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

      {/* Progress indicator */}
      <div className="mt-6 mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    i < step
                      ? 'bg-indigo-600 text-white'
                      : i === step
                        ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                        : 'bg-zinc-100 text-zinc-400'
                  }`}
                >
                  {i < step ? '✓' : i + 1}
                </div>
                <span
                  className={`mt-1.5 text-[10px] font-medium text-center leading-tight ${
                    i <= step ? 'text-indigo-600' : 'text-zinc-400'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`mx-2 h-0.5 flex-1 rounded transition-colors ${
                    i < step ? 'bg-indigo-600' : 'bg-zinc-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Personal Info */}
      {step === 0 && (
        <div className="space-y-4">
          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-zinc-700">
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                id="full_name"
                {...register('full_name')}
                className="w-full rounded-lg border border-zinc-200 py-2.5 pl-10 pr-3 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none"
              />
            </div>
            {errors.full_name && (
              <p className="mt-1 text-xs text-red-500">{errors.full_name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                id="email"
                type="email"
                {...register('email')}
                className="w-full rounded-lg border border-zinc-200 py-2.5 pl-10 pr-3 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none"
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-zinc-700">
              Phone Number
            </label>
            <div className="relative mt-1">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                id="phone"
                {...register('phone')}
                className="w-full rounded-lg border border-zinc-200 py-2.5 pl-10 pr-3 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Position & Resume */}
      {step === 1 && (
        <div className="space-y-4">
          {preselectedJobId ? (
            <input type="hidden" {...register('job_posting_id')} />
          ) : (
            <div>
              <label htmlFor="job_posting_id" className="block text-sm font-medium text-zinc-700">
                Position <span className="text-red-500">*</span>
              </label>
              <select
                id="job_posting_id"
                {...register('job_posting_id')}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none"
              >
                <option value="">Select a position</option>
                {jobOptions.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                  </option>
                ))}
              </select>
              {errors.job_posting_id && (
                <p className="mt-1 text-xs text-red-500">{errors.job_posting_id.message}</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-700">Resume / CV</label>
            {selectedFile ? (
              <div className="mt-1 flex items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3">
                <FileText className="h-8 w-8 shrink-0 text-indigo-600" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900">{selectedFile.name}</p>
                  <p className="text-xs text-zinc-500">{formatFileSize(selectedFile.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white hover:text-red-500"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="resume-upload"
                className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-200 px-4 py-6 text-sm text-zinc-500 transition-colors hover:border-indigo-600 hover:bg-indigo-50"
              >
                <Upload className="h-5 w-5" />
                Click to upload (PDF, DOC, DOCX — max 5MB)
              </label>
            )}
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
        </div>
      )}

      {/* Step 3: Cover Letter */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label htmlFor="cover_letter" className="block text-sm font-medium text-zinc-700">
              Cover Letter (optional)
            </label>
            <textarea
              id="cover_letter"
              {...register('cover_letter')}
              rows={6}
              placeholder="Tell us why you'd be a great fit..."
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <h4 className="text-sm font-semibold text-zinc-900">Review Your Application</h4>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Name</span>
                <span className="font-medium text-zinc-900">{watchedValues.full_name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Email</span>
                <span className="font-medium text-zinc-900">{watchedValues.email || '—'}</span>
              </div>
              {watchedValues.phone && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Phone</span>
                  <span className="font-medium text-zinc-900">{watchedValues.phone}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-zinc-500">Position</span>
                <span className="font-medium text-zinc-900">{selectedJobTitle || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Resume</span>
                <span className="font-medium text-zinc-900">{selectedFile?.name || 'Not uploaded'}</span>
              </div>
              {watchedValues.cover_letter && (
                <div className="pt-2 border-t border-zinc-200">
                  <span className="text-zinc-500">Cover Letter</span>
                  <p className="mt-1 text-zinc-700 line-clamp-3">{watchedValues.cover_letter}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {submitError && <p className="mt-4 text-sm text-red-500">{submitError}</p>}

      {/* Navigation buttons */}
      <div className="mt-6 flex items-center justify-between">
        {step > 0 ? (
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
        ) : (
          <div />
        )}

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={goNext}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => { void handleSubmit(onSubmit)(); }}
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </button>
        )}
      </div>
    </form>
  );
}

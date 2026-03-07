import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Building2, MapPin, Clock, CheckCircle } from 'lucide-react';
import { PLACEHOLDER_JOBS, BUSINESS_UNITS } from '@/data/placeholder';
import { ApplicationForm } from '@/components/careers/ApplicationForm';
import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { createSupabaseServerClient } from '@/lib/supabase/server';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function fetchJob(id: string) {
  try {
    const supabase = createSupabaseServerClient();
    const { data } = await supabase
      .from('job_postings')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();
    return data;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;

  // Try DB first
  const dbJob = await fetchJob(id);
  if (dbJob) {
    return {
      title: `${dbJob.title} — Careers at SN International Group`,
      description: dbJob.description ?? '',
    };
  }

  // Fall back to placeholders
  const job = PLACEHOLDER_JOBS.find((j) => j.id === id);
  if (!job) return { title: 'Job Not Found' };
  return {
    title: `${job.title} — Careers at SN International Group`,
    description: job.description,
  };
}

export default async function JobDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Try DB first, fall back to placeholders
  const dbJob = await fetchJob(id);
  const placeholderJob = PLACEHOLDER_JOBS.find((j) => j.id === id);

  if (!dbJob && !placeholderJob) notFound();

  // Normalize the job data
  const job = dbJob
    ? {
        id: dbJob.id,
        title: dbJob.title,
        description: dbJob.description || '',
        location: dbJob.location || 'Remote',
        employment_type: dbJob.employment_type
          ? dbJob.employment_type.charAt(0).toUpperCase() + dbJob.employment_type.slice(1).replace('_', '-')
          : 'Full-time',
        business_unit_slug:
          BUSINESS_UNITS.find((u) => u.slug === dbJob.business_unit_id)?.slug || 'all',
        business_unit_name: dbJob.department || 'SN International',
        responsibilities: dbJob.requirements
          ? (dbJob.requirements as string).split('\n').filter(Boolean)
          : undefined,
        qualifications: undefined as string[] | undefined,
      }
    : placeholderJob!;

  const unit = BUSINESS_UNITS.find((u) => u.slug === job.business_unit_slug);
  const Icon = unit?.icon;

  const typeColors: Record<string, string> = {
    'Full-time': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    'Part-time': 'bg-blue-50 text-blue-700 ring-blue-200',
    'Contract': 'bg-amber-50 text-amber-700 ring-amber-200',
    'Internship': 'bg-violet-50 text-violet-700 ring-violet-200',
  };
  const typeColor = typeColors[job.employment_type] ?? 'bg-zinc-100 text-zinc-700 ring-zinc-200';

  return (
    <>
      {/* Header */}
      <section className="bg-white py-20 border-b border-zinc-100">
        <div className="section-max section-padding">
          <Link
            href="/careers"
            className="mb-8 inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-indigo-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Careers
          </Link>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-5">
              {Icon && unit && (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-zinc-100">
                  <Icon className="h-7 w-7 text-zinc-900" />
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
                  {job.title}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-zinc-500">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4" />
                    {job.business_unit_name}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {job.location}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {job.employment_type}
                  </span>
                </div>
              </div>
            </div>

            {/* Employment type badge */}
            <span
              className={`inline-flex shrink-0 items-center self-start rounded-full px-3 py-1 text-sm font-medium ring-1 ${typeColor}`}
            >
              {job.employment_type}
            </span>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="section-max section-padding py-16">
        <div className="flex flex-col gap-12 lg:flex-row lg:gap-16">
          {/* Left — job details */}
          <div className="flex-1 min-w-0">
            <ScrollReveal>
              <div className="prose prose-zinc max-w-none">
                <h2 className="text-xl font-semibold text-zinc-900">About This Role</h2>
                <p className="mt-3 text-zinc-600 leading-relaxed">{job.description}</p>

                {job.responsibilities && job.responsibilities.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-zinc-900">Key Responsibilities</h3>
                    <ul className="mt-4 space-y-2.5">
                      {job.responsibilities.map((r) => (
                        <li key={r} className="flex items-start gap-3">
                          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" />
                          <span className="text-sm leading-relaxed text-zinc-600">{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {job.qualifications && job.qualifications.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-zinc-900">Qualifications</h3>
                    <ul className="mt-4 space-y-2.5">
                      {job.qualifications.map((q) => (
                        <li key={q} className="flex items-start gap-3">
                          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                          <span className="text-sm leading-relaxed text-zinc-600">{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </ScrollReveal>
          </div>

          {/* Right — application form */}
          <div className="lg:w-[480px] shrink-0" id="apply">
            <ScrollReveal>
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-zinc-900">Apply for This Role</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Fill out the form below. We usually respond within 5 business days.
                </p>
              </div>
              <ApplicationForm preselectedJobId={job.id} />
            </ScrollReveal>
          </div>
        </div>
      </section>
    </>
  );
}

'use client';

import { type ReactNode, useState, useMemo, useEffect, useRef } from 'react';
import { MapPin, Clock, Building2, Briefcase, Search, Users, ArrowRight, LinkIcon, Flame, CalendarDays, BadgeDollarSign } from 'lucide-react';
import Link from 'next/link';
import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { BUSINESS_UNITS, PLACEHOLDER_JOBS } from '@/data/placeholder';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const EMPLOYMENT_TYPES = ['All', 'Full-time', 'Part-time', 'Contract', 'Internship'];



function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const posted = new Date(dateStr);
  const diffMs = now.getTime() - posted.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return '1 week ago';
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
}

interface DbJob {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  employment_type: string | null;
  department: string | null;
  business_unit_id: string | null;
  requirements: string | null;
  salary_range: string | null;
  published_at: string | null;
  business_units: { slug: string; name: string } | null;
}

interface NormalizedJob {
  id: string;
  title: string;
  description: string;
  location: string;
  employment_type: string;
  business_unit_slug: string;
  business_unit_name: string;
  responsibilities?: string[];
  qualifications?: string[];
  applicants?: number;
  posted_at?: string;
  salary_range?: string;
}

function normalizeDbJob(j: DbJob): NormalizedJob {
  const empType = j.employment_type
    ? j.employment_type.charAt(0).toUpperCase() + j.employment_type.slice(1).replace('_', '-')
    : 'Full-time';
  return {
    id: j.id,
    title: j.title,
    description: j.description || '',
    location: j.location || 'Remote',
    employment_type: empType,
    business_unit_slug: j.business_units?.slug || 'all',
    business_unit_name: j.business_units?.name || j.department || 'SN International',
    ...(j.requirements ? { qualifications: j.requirements.split('\n').filter(Boolean) } : {}),
    ...(j.salary_range ? { salary_range: j.salary_range } : {}),
    ...(j.published_at ? { posted_at: j.published_at } : {}),
  };
}

export function JobListings(): ReactNode {
  const [search, setSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('All');
  const [dbJobs, setDbJobs] = useState<NormalizedJob[] | null>(null);
  // Real-time applicant counts: { [job_posting_id]: count }
  const [liveCounts, setLiveCounts] = useState<Record<string, number>>({});
  const [countsReady, setCountsReady] = useState(false);
  const channelRef = useRef<ReturnType<NonNullable<ReturnType<typeof createSupabaseBrowserClient>>['channel']> | null>(null);

  // Fetch real jobs from DB
  useEffect(() => {
    fetch('/api/jobs')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: DbJob[] | null) => {
        if (Array.isArray(data) && data.length > 0) {
          setDbJobs(data.map(normalizeDbJob));
        }
      })
      .catch(() => {
        // Fall back to placeholders silently
      });
  }, []);

  useEffect(() => {
    // 1. Fetch initial counts from server
    fetch('/api/applications')
      .then((r) => r.json())
      .then(({ counts }: { counts: Record<string, number> }) => {
        setLiveCounts(counts ?? {});
        setCountsReady(true);
      })
      .catch(() => setCountsReady(true));

    // 2. Subscribe to Realtime INSERT events to increment counts live
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel('public:job_applications:inserts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'job_applications' },
        (payload) => {
          const jobId: string | undefined = (payload.new as { job_posting_id?: string }).job_posting_id;
          if (jobId) {
            setLiveCounts((prev) => ({ ...prev, [jobId]: (prev[jobId] ?? 0) + 1 }));
          }
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Use DB jobs if available, otherwise fall back to placeholders
  const jobs: NormalizedJob[] = dbJobs ?? PLACEHOLDER_JOBS;

  const filtered = useMemo(() => {
    return jobs.filter((job) => {
      const matchesSearch =
        !search ||
        job.title.toLowerCase().includes(search.toLowerCase()) ||
        job.description.toLowerCase().includes(search.toLowerCase());
      const matchesUnit = unitFilter === 'all' || job.business_unit_slug === unitFilter;
      const matchesType =
        typeFilter === 'All' ||
        job.employment_type.toLowerCase() === typeFilter.toLowerCase();
      return matchesSearch && matchesUnit && matchesType;
    });
  }, [search, unitFilter, typeFilter, jobs]);

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search positions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 py-2.5 pl-10 pr-4 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none"
          />
        </div>

        <select
          value={unitFilter}
          onChange={(e) => setUnitFilter(e.target.value)}
          className="rounded-lg border border-zinc-200 px-3 py-2.5 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none"
        >
          <option value="all">All Business Units</option>
          {BUSINESS_UNITS.map((u) => (
            <option key={u.slug} value={u.slug}>
              {u.name}
            </option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-zinc-200 px-3 py-2.5 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none"
        >
          {EMPLOYMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Results */}
      <div className="mt-8 space-y-4">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white py-16 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100">
              <Briefcase className="h-10 w-10 text-zinc-400" />
            </div>
            <p className="mt-4 text-lg font-medium text-zinc-700">No positions found</p>
            <p className="mt-1 text-sm text-zinc-500">Try adjusting your filters or check back later.</p>
            <button
              type="button"
              onClick={() => { setSearch(''); setUnitFilter('all'); setTypeFilter('All'); }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-100"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          filtered.map((job, index) => {
            const buIcon = BUSINESS_UNITS.find((u) => u.slug === job.business_unit_slug);
            const BuIcon = buIcon?.icon;
            const count = countsReady ? (liveCounts[job.id] ?? job.applicants ?? 0) : (job.applicants ?? 0);
            const isHot = count >= 50;

            return (
            <ScrollReveal key={job.id} delay={index * 0.05}>
              <Link
                href={`/careers/${job.id}`}
                className="group block rounded-xl border border-zinc-200 bg-white p-6 shadow-card transition-all hover:shadow-mega hover:border-indigo-200"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-4 flex-1">
                    {/* Department icon badge */}
                    {BuIcon && (
                      <div className="hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100">
                        <BuIcon className="h-5 w-5 text-zinc-900" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-zinc-900 group-hover:text-indigo-600 transition-colors">
                        {job.title}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-3 text-sm text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          {job.business_unit_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {job.employment_type}
                        </span>
                        {job.posted_at && (
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" />
                            Posted {getRelativeTime(job.posted_at)}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {/* Salary badge */}
                        {job.salary_range && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                            <BadgeDollarSign className="h-3 w-3" />
                            {job.salary_range}
                          </span>
                        )}
                        {/* Applicant count with hot badge */}
                        {count > 0 && (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${isHot ? 'bg-orange-50 text-orange-700' : 'bg-indigo-50 text-indigo-600'}`}>
                            {isHot ? <Flame className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                            {count} applied{isHot ? ' · Hot' : ''}
                          </span>
                        )}
                      </div>
                      <p className="mt-3 text-sm text-zinc-600 line-clamp-2">{job.description}</p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2 self-start">
                    {/* Share button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const url = `${window.location.origin}/careers/${job.id}`;
                        navigator.clipboard.writeText(url);
                      }}
                      aria-label={`Copy link for ${job.title}`}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 text-zinc-400 transition-colors hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50"
                    >
                      <LinkIcon className="h-4 w-4" />
                    </button>
                    <div className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors group-hover:bg-indigo-500 flex items-center gap-1.5">
                      Apply Now
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </div>
              </Link>
            </ScrollReveal>
          );
          })
        )}
      </div>

      <p className="mt-6 text-center text-sm text-zinc-500">
        Showing {filtered.length} of {jobs.length} open positions
      </p>
    </div>
  );
}

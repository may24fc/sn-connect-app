'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { ArrowRight, Briefcase, Building2, Clock, MapPin } from 'lucide-react';
import Link from 'next/link';
import { ScrollReveal } from '@/components/shared/ScrollReveal';

interface JobListing {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  employment_type: string | null;
}

export function OpenRolesTeaser(): ReactNode {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/jobs')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: JobListing[]) => {
        setJobs(Array.isArray(data) ? data.slice(0, 6) : []);
      })
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, []);

  const empTypeLabel = (raw: string | null) => {
    if (!raw) return 'Full-time';
    return raw.charAt(0).toUpperCase() + raw.slice(1).replace('_', '-');
  };

  return (
    <div>
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100"
            />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-zinc-200 bg-white py-14 text-center">
          <Briefcase className="h-10 w-10 text-zinc-300" />
          <p className="text-base font-medium text-zinc-600">No open positions right now</p>
          <p className="text-sm text-zinc-400">Check back soon — we're always growing.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job, i) => (
              <ScrollReveal key={job.id} delay={i * 0.05}>
                <Link
                  href={`/careers/${job.id}`}
                  className="group flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-card transition-all hover:border-indigo-200 hover:shadow-mega"
                >
                  <div>
                    <h3 className="font-semibold text-zinc-900 transition-colors group-hover:text-indigo-600">
                      {job.title}
                    </h3>
                    <div className="mt-2.5 flex flex-wrap gap-2.5 text-xs text-zinc-500">
                      {job.department && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {job.department}
                        </span>
                      )}
                      {job.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {job.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {empTypeLabel(job.employment_type)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-indigo-600 opacity-0 transition-opacity group-hover:opacity-100">
                    Apply Now
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/careers"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              View All {jobs.length > 0 ? `${jobs.length} ` : ''}Open Positions
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

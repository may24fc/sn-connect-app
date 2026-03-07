'use client';

import { type ReactNode, useState, useMemo } from 'react';
import { MapPin, Clock, Building2, Briefcase, Search } from 'lucide-react';
import Link from 'next/link';
import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { BUSINESS_UNITS } from '@/data/placeholder';

interface JobPosting {
  id: string;
  title: string;
  business_unit_slug: string;
  business_unit_name: string;
  location: string;
  employment_type: string;
  description: string;
}

// Placeholder jobs — in production these come via API / Supabase
const PLACEHOLDER_JOBS: JobPosting[] = [
  {
    id: '1',
    title: 'Operations Manager',
    business_unit_slug: 'sfo',
    business_unit_name: 'SFO (SN Food Operations)',
    location: 'BGC, Taguig',
    employment_type: 'Full-time',
    description: 'Oversee daily food service operations, manage a team of 50+ staff, and ensure quality and safety compliance across all client sites.',
  },
  {
    id: '2',
    title: 'Sales Executive',
    business_unit_slug: 'uhp',
    business_unit_name: 'UHP (Universal Healthcare Products)',
    location: 'Makati City',
    employment_type: 'Full-time',
    description: 'Drive revenue growth by building relationships with hospitals, clinics, and pharmacies. Manage the full sales cycle from prospecting to close.',
  },
  {
    id: '3',
    title: 'Fitness Trainer',
    business_unit_slug: '24-fit-club',
    business_unit_name: '24 Fit Club',
    location: 'Multiple Locations',
    employment_type: 'Full-time',
    description: 'Design and deliver personal training programs. Conduct group fitness classes and help members achieve their fitness goals.',
  },
  {
    id: '4',
    title: 'Civil Engineer',
    business_unit_slug: 'construction',
    business_unit_name: 'SN Construction & Real Estate',
    location: 'Quezon City',
    employment_type: 'Full-time',
    description: 'Manage structural design and on-site construction activities for commercial and residential projects.',
  },
  {
    id: '5',
    title: 'Marketing Intern',
    business_unit_slug: 'sfo',
    business_unit_name: 'SFO (SN Food Operations)',
    location: 'BGC, Taguig',
    employment_type: 'Internship',
    description: 'Assist the marketing team with social media management, content creation, and campaign execution for SFO brand awareness.',
  },
];

const EMPLOYMENT_TYPES = ['All', 'Full-time', 'Part-time', 'Contract', 'Internship'];

export function JobListings(): ReactNode {
  const [search, setSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('All');

  const filtered = useMemo(() => {
    return PLACEHOLDER_JOBS.filter((job) => {
      const matchesSearch =
        !search ||
        job.title.toLowerCase().includes(search.toLowerCase()) ||
        job.description.toLowerCase().includes(search.toLowerCase());
      const matchesUnit = unitFilter === 'all' || job.business_unit_slug === unitFilter;
      const matchesType = typeFilter === 'All' || job.employment_type === typeFilter;
      return matchesSearch && matchesUnit && matchesType;
    });
  }, [search, unitFilter, typeFilter]);

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
            <Briefcase className="mx-auto h-12 w-12 text-zinc-300" />
            <p className="mt-4 text-lg font-medium text-zinc-700">No positions found</p>
            <p className="mt-1 text-sm text-zinc-500">Try adjusting your filters or check back later.</p>
          </div>
        ) : (
          filtered.map((job, index) => (
            <ScrollReveal key={job.id} delay={index * 0.05}>
              <div className="group rounded-xl border border-zinc-200 bg-white p-6 shadow-card transition-shadow hover:shadow-mega">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
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
                    </div>
                    <p className="mt-3 text-sm text-zinc-600 line-clamp-2">{job.description}</p>
                  </div>

                  <Link
                    href={`/careers?apply=${job.id}`}
                    className="shrink-0 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
                  >
                    Apply Now
                  </Link>
                </div>
              </div>
            </ScrollReveal>
          ))
        )}
      </div>

      <p className="mt-6 text-center text-sm text-zinc-500">
        Showing {filtered.length} of {PLACEHOLDER_JOBS.length} open positions
      </p>
    </div>
  );
}

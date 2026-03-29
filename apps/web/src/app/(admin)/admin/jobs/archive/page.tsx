'use client';

import { useRestoreJobPosting } from '@/hooks/useJobMutations';
import type { JobPostingRecord } from '@/hooks/useJobPostings';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableTableHead } from '@/components/data-display/SortableTableHead';
import { formatDate } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { useQuery } from '@tanstack/react-query';
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useToast,
} from '@hr-portal/ui';
import { AlertCircle, Archive, ArrowLeft, Loader2, RotateCcw, Search } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

function useArchivedJobs(search?: string) {
  return useQuery({
    queryKey: queryKeys.jobs.archived(search),
    queryFn: async (): Promise<{
      data: Array<JobPostingRecord>;
      pagination: { page: number; pageSize: number; total: number; totalPages: number };
    }> => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('page', '1');
      params.set('pageSize', '100');

      const res = await fetch(`/api/jobs/archived?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch archived job postings');
      return res.json();
    },
  });
}

export default function ArchivedJobsPage() {
  const { addToast } = useToast();
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useArchivedJobs(search || undefined);
  const restoreJob = useRestoreJobPosting();

  const jobs = data?.data || [];

  const { sortColumn, sortDirection, handleSort, sortItems } = useTableSort({
    initialColumn: 'deleted_at',
    initialDirection: 'desc',
  });

  const sortedJobs = sortItems(jobs, {
    title: (j) => j.title.toLowerCase(),
    department: (j) => j.department || '',
    employment_type: (j) => j.employment_type,
    deleted_at: (j) => j.deleted_at || '',
    created_at: (j) => j.created_at,
  });

  const sortHeadProps = { sortColumn, sortDirection, onSort: handleSort };

        addToast({
          variant: 'error',
          title: 'Failed to restore posting',
          description: 'Could not restore the job posting. Please try again.',
        }),
    });
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/jobs"
              className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                Archived Job Postings
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                View and restore previously archived job postings
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="bg-card border border-border rounded-lg p-4">
            <CardContent className="p-0">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Archived Postings</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{jobs.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <Input
              placeholder="Search archived postings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <Card className="bg-card border border-border rounded-lg p-8">
            <CardContent className="p-0">
              <EmptyState
                icon={<Loader2 className="h-5 w-5 animate-spin" />}
                title="Loading archived postings"
                description="Retrieving archived job postings and filters."
                size="sm"
              />
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="bg-card border border-border rounded-lg p-8">
            <CardContent className="p-0">
              <EmptyState
                icon={AlertCircle}
                title="Failed to load archived postings"
                description="Archived job postings could not be retrieved. Refresh and try again."
                size="sm"
              />
            </CardContent>
          </Card>
        ) : jobs.length === 0 ? (
          <Card className="bg-card border border-border rounded-lg p-12">
            <CardContent className="p-0">
              <EmptyState
                icon={Archive}
                title="No archived postings"
                description="Job postings that are archived will appear here."
                size="md"
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-zinc-200 dark:border-zinc-800">
                  <SortableTableHead column="title" {...sortHeadProps}>
                    Title
                  </SortableTableHead>
                  <SortableTableHead column="department" {...sortHeadProps}>
                    Department
                  </SortableTableHead>
                  <SortableTableHead column="employment_type" {...sortHeadProps}>
                    Type
                  </SortableTableHead>
                  <SortableTableHead column="deleted_at" {...sortHeadProps}>
                    Archived On
                  </SortableTableHead>
                  <SortableTableHead column="created_at" {...sortHeadProps}>
                    Originally Created
                  </SortableTableHead>
                  <TableHead className="text-sm font-medium text-zinc-600 dark:text-zinc-400 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedJobs.map((job) => (
                  <TableRow
                    key={job.id}
                    className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <TableCell className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {job.title}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
                      {job.department || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
                      <Badge variant="outline">{job.employment_type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
                      {job.deleted_at ? formatDate(job.deleted_at) : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
                      {formatDate(job.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRestore(job.id)}
                        title="Restore"
                        disabled={restoreJob.isPending}
                      >
                        <RotateCcw className="h-4 w-4 text-zinc-500 mr-1.5" />
                        Restore
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}

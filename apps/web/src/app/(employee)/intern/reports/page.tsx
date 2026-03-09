'use client';

import { useInternship, useInternships } from '@/hooks/useInternships';
import {
  type DailyReport,
  type DailyReportId,
  DailyReportList,
  type InternId,
  type InternshipPeriodId,
} from '@hr-portal/ui';
import { FileText, GraduationCap } from 'lucide-react';
import { type ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function InternReportsPage(): ReactNode {
  const router = useRouter();

  const listQuery = useInternships({ page: 1, pageSize: 1, status: 'active' });
  const activeInternshipId = listQuery.data?.data?.[0]?.id || null;
  const detailQuery = useInternship(activeInternshipId, !!activeInternshipId);

  const isLoading = listQuery.isLoading || detailQuery.isLoading;
  const hasNoInternship =
    !listQuery.isLoading && listQuery.data?.data?.length === 0;

  useEffect(() => {
    if (hasNoInternship) {
      router.push('/intern/setup');
    }
  }, [hasNoInternship, router]);

  const profile = detailQuery.data?.data;
  const reports = profile?.recentReports || [];
  const uiReports: Array<DailyReport> = reports.map((report) => ({
    ...report,
    id: report.id as DailyReportId,
    internId: report.internId as InternId,
    internshipPeriodId: report.internshipPeriodId as InternshipPeriodId,
  }));

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <GraduationCap
          className="h-10 w-10 text-indigo-600 dark:text-indigo-400 animate-pulse"
          strokeWidth={1.5}
        />
        <p className="text-sm text-zinc-500">Loading your reports…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950">
          <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">My Reports</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            All your submitted end-of-day reports
          </p>
        </div>
      </div>

      <DailyReportList
        reports={uiReports}
        emptyMessage="No reports submitted yet. Submit your first EOD report from the dashboard."
      />
    </div>
  );
}

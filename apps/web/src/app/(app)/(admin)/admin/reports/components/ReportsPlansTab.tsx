'use client';

import { useInternships } from '@/hooks/useInternships';
import { useReports } from '@/hooks/useReports';
import { formatDateRange } from '@/lib/format';
import { getWeeklyPlanItems, isMarketingWeeklyPlan } from '@/lib/report-utils';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@hr-portal/ui';
import { AlertCircle, FileText } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface ReportsPlansTabProps {
  department: string;
}

interface AggregatedPlanRow {
  employeeId: string;
  name: string;
  position: string;
  items: Array<string>;
}

interface PlanPeriodGroup {
  key: string;
  periodStart: string;
  periodEnd: string;
  staff: Array<AggregatedPlanRow>;
  interns: Array<AggregatedPlanRow>;
}

const INCLUDED_STATUSES = ['submitted', 'approved'] as const;

function isIncludedStatus(status: string): boolean {
  return INCLUDED_STATUSES.includes(status as (typeof INCLUDED_STATUSES)[number]);
}

function mergePlanItems(existingItems: Array<string>, nextItems: Array<string>): Array<string> {
  const seen = new Set(existingItems.map((item) => item.toLowerCase()));
  const merged = [...existingItems];

  for (const item of nextItems) {
    const normalized = item.trim();
    if (!normalized) {
      continue;
    }

    const dedupeKey = normalized.toLowerCase();
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    merged.push(normalized);
  }

  return merged;
}

function PlansSection({ title, rows }: { title: string; rows: Array<AggregatedPlanRow> }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
          {title}
        </Badge>
        <span className="text-xs text-muted-foreground">{rows.length} submission{rows.length === 1 ? '' : 's'}</span>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-6 text-sm text-muted-foreground dark:border-zinc-800">
          No {title.toLowerCase()} weekly plans were submitted for this period.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[220px]">Name</TableHead>
                <TableHead className="w-[220px]">Position</TableHead>
                <TableHead>Weekly Plan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={`${title}-${row.employeeId}`}>
                  <TableCell className="font-medium text-foreground">{row.name}</TableCell>
                  <TableCell className="text-muted-foreground">{row.position}</TableCell>
                  <TableCell>
                    <ul className="space-y-2 text-sm text-foreground">
                      {row.items.map((item, index) => (
                        <li key={`${row.employeeId}-${index}`} className="flex items-start gap-2">
                          <span className="mt-0.5 text-muted-foreground">{index + 1}.</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export function ReportsPlansTab({ department }: ReportsPlansTabProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const { data, isLoading, error, refetch } = useReports({
    ...(department !== 'all' ? { department } : {}),
    reportType: 'marketing',
    pageSize: 500,
    archived: 'exclude',
  });
  const { data: internshipsData } = useInternships({ status: 'active', pageSize: 100 });

  const activeInternEmployeeIds = useMemo(
    () => new Set((internshipsData?.data ?? []).map((internship) => internship.employeeId)),
    [internshipsData?.data]
  );

  const periodGroups = useMemo<Array<PlanPeriodGroup>>(() => {
    const groupedPeriods = new Map<
      string,
      {
        periodStart: string;
        periodEnd: string;
        rowsByEmployee: Map<string, AggregatedPlanRow>;
      }
    >();

    for (const report of data?.data ?? []) {
      if (!isIncludedStatus(report.status) || report.deleted_at || !isMarketingWeeklyPlan(report.marketing_context)) {
        continue;
      }

      const items = getWeeklyPlanItems(report.marketing_context, report.notes);
      if (items.length === 0) {
        continue;
      }

      const periodKey = `${report.period_start}__${report.period_end}`;
      const employeeId = report.employee_id;
      const periodGroup = groupedPeriods.get(periodKey) ?? {
        periodStart: report.period_start,
        periodEnd: report.period_end,
        rowsByEmployee: new Map<string, AggregatedPlanRow>(),
      };

      const existingRow = periodGroup.rowsByEmployee.get(employeeId);
      const name = report.employees
        ? `${report.employees.first_name} ${report.employees.last_name}`.trim()
        : 'Unknown submitter';
      const position = report.employees?.position?.trim() || '—';

      periodGroup.rowsByEmployee.set(employeeId, {
        employeeId,
        name,
        position,
        items: mergePlanItems(existingRow?.items ?? [], items),
      });

      groupedPeriods.set(periodKey, periodGroup);
    }

    return Array.from(groupedPeriods.entries())
      .map(([key, value]) => {
        const rows = Array.from(value.rowsByEmployee.values()).sort((left, right) => left.name.localeCompare(right.name));

        return {
          key,
          periodStart: value.periodStart,
          periodEnd: value.periodEnd,
          staff: rows.filter((row) => !activeInternEmployeeIds.has(row.employeeId)),
          interns: rows.filter((row) => activeInternEmployeeIds.has(row.employeeId)),
        };
      })
      .sort((left, right) => new Date(right.periodStart).getTime() - new Date(left.periodStart).getTime());
  }, [activeInternEmployeeIds, data?.data]);

  const periodOptions = useMemo(
    () =>
      periodGroups.map((group) => ({
        value: group.key,
        label: formatDateRange(group.periodStart, group.periodEnd),
      })),
    [periodGroups]
  );

  const filteredPeriodGroups = useMemo(
    () => (selectedPeriod === 'all' ? periodGroups : periodGroups.filter((group) => group.key === selectedPeriod)),
    [periodGroups, selectedPeriod]
  );

  useEffect(() => {
    if (selectedPeriod === 'all') {
      return;
    }

    if (!periodOptions.some((option) => option.value === selectedPeriod)) {
      setSelectedPeriod('all');
    }
  }, [periodOptions, selectedPeriod]);

  if (isLoading) {
    return (
      <div className="space-y-4 py-2">
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-36 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <EmptyState
            icon={AlertCircle}
            title="Unable to load weekly plans"
            description="There was a problem aggregating weekly plan submissions. Try again."
            action={{ label: 'Retry', onClick: () => refetch() }}
            size="sm"
          />
        </CardContent>
      </Card>
    );
  }

  if (periodGroups.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <EmptyState
            icon={FileText}
            title="No weekly plans yet"
            description="Weekly plan submissions will appear here once marketing staff or interns submit them."
            size="sm"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 py-1">
      <div className="flex justify-end">
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-[260px]">
            <SelectValue placeholder="Plan Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Date Periods</SelectItem>
            {periodOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredPeriodGroups.map((group) => (
        <Card key={group.key}>
          <CardHeader>
            <CardTitle>{formatDateRange(group.periodStart, group.periodEnd)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <PlansSection title="Staff" rows={group.staff} />
            <PlansSection title="Interns" rows={group.interns} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
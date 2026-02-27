'use client';

import {
  usePerformanceCycles,
  usePerformanceKPIs,
  usePerformanceOKRs,
} from '@/hooks/usePerformance';
import { usePerformanceRealtime } from '@/hooks/usePerformanceRealtime';
import {
  Badge,
  Button,
  Card,
  CardContent,
  DepartmentPerformanceChart,
  type DepartmentPerformanceData,
  type PerformanceDashboardStats,
  PerformanceSummaryCards,
} from '@hr-portal/ui';
import { Calendar, ClipboardCheck, Download, Settings, UserSearch } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

interface EmployeePerformanceRow {
  id: string;
  department: string;
  okrProgress: number;
  kpiScore: number;
}

export default function AdminPerformancePage(): ReactNode {
  usePerformanceRealtime();
  const { data: cycles = [] } = usePerformanceCycles();
  const activeCycle = cycles.find((cycle) => cycle.status === 'active') || cycles[0] || null;
  const { data: okrs = [] } = usePerformanceOKRs(activeCycle?.id);
  const { data: kpis = [] } = usePerformanceKPIs(activeCycle?.id);

  const liveStats: PerformanceDashboardStats = {
    totalEmployees: 0,
    okrsCompleted: okrs.filter((okr) => okr.status === 'completed').length,
    okrsInProgress: okrs.filter((okr) => okr.status !== 'completed').length,
    kpisOnTarget: kpis.filter((kpi) => kpi.score >= 100).length,
    kpisBelowTarget: kpis.filter((kpi) => kpi.score < 80).length,
    reviewsPendingSelf: 0,
    reviewsPendingManager: 0,
    reviewsCompleted: 0,
    averageOkrProgress:
      okrs.length > 0
        ? Math.round(okrs.reduce((sum, okr) => sum + okr.progressPercentage, 0) / okrs.length)
        : 0,
    averageKpiScore:
      kpis.length > 0 ? Math.round(kpis.reduce((sum, kpi) => sum + kpi.score, 0) / kpis.length) : 0,
  };

  // Build department performance data from OKRs and KPIs
  const employeeRows: Array<EmployeePerformanceRow> = [];
  const employeeIds = new Set<string>();

  for (const okr of okrs) {
    if (!employeeIds.has(okr.employeeId)) {
      employeeIds.add(okr.employeeId);
      const employeeOkrs = okrs.filter((o) => o.employeeId === okr.employeeId);
      const employeeKpis = kpis.filter((k) => k.employeeId === okr.employeeId);

      const okrProgress =
        employeeOkrs.length > 0
          ? Math.round(
              employeeOkrs.reduce((sum, o) => sum + o.progressPercentage, 0) / employeeOkrs.length
            )
          : 0;

      const kpiScore =
        employeeKpis.length > 0
          ? Math.round(employeeKpis.reduce((sum, k) => sum + k.score, 0) / employeeKpis.length)
          : 0;

      employeeRows.push({
        id: okr.employeeId,
        department: 'General',
        okrProgress,
        kpiScore,
      });
    }
  }

  const departmentData: Array<DepartmentPerformanceData> = Object.values(
    employeeRows.reduce(
      (accumulator, employee) => {
        const key = employee.department;
        if (!accumulator[key]) {
          accumulator[key] = {
            department: key,
            averageOkrProgress: 0,
            averageKpiScore: 0,
            employeeCount: 0,
            okrSum: 0,
            kpiSum: 0,
          };
        }

        accumulator[key].employeeCount += 1;
        accumulator[key].okrSum += employee.okrProgress;
        accumulator[key].kpiSum += employee.kpiScore;
        accumulator[key].averageOkrProgress = Math.round(
          accumulator[key].okrSum / accumulator[key].employeeCount
        );
        accumulator[key].averageKpiScore = Math.round(
          accumulator[key].kpiSum / accumulator[key].employeeCount
        );

        return accumulator;
      },
      {} as Record<string, DepartmentPerformanceData & { okrSum: number; kpiSum: number }>
    )
  ).map(({ okrSum: _okrSum, kpiSum: _kpiSum, ...value }) => value);

  const currentCycleLabel = activeCycle?.name || 'Performance Cycle';
  const currentCycleRange = activeCycle && `${activeCycle.startDate} - ${activeCycle.endDate}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Performance Dashboard</h1>
          <p className="text-muted-foreground">Organization-wide performance metrics</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/directory">
            <Button variant="outline">
              <UserSearch className="mr-2 h-4 w-4" />
              View Individual
            </Button>
          </Link>
          <Link href="/admin/performance/evaluations">
            <Button variant="outline">
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Evaluations
            </Button>
          </Link>
          <Link href="/admin/performance/cycles">
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Manage Cycles
            </Button>
          </Link>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Current Cycle Banner */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">{currentCycleLabel}</h2>
                <p className="text-sm text-muted-foreground">
                  {currentCycleRange || 'No cycle dates'}
                </p>
              </div>
            </div>
            <Badge variant="success">Active Cycle</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <PerformanceSummaryCards stats={liveStats} />

      {/* Department Performance Chart */}
      <DepartmentPerformanceChart data={departmentData} />
    </div>
  );
}

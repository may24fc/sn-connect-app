'use client';

import { Button, Card, CardContent, type KPI, KPIList, KPISummary } from '@hr-portal/ui';
import { usePerformanceCycles, usePerformanceKPIs } from '@/hooks/usePerformance';
import { ArrowLeft, BarChart3, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

// Mock data
const mockKPIs: Array<KPI> = [
  {
    id: 'kpi-1' as KPI['id'],
    employeeId: 'emp-1' as KPI['employeeId'],
    cycleId: 'cycle-2024-q1' as KPI['cycleId'],
    name: 'Project Delivery Rate',
    description: 'Percentage of projects delivered on time and within budget',
    target: 90,
    actual: 85,
    unit: '%',
    weight: 30,
    score: 94,
    createdAt: '2024-01-01',
    updatedAt: '2024-02-15',
  },
  {
    id: 'kpi-2' as KPI['id'],
    employeeId: 'emp-1' as KPI['employeeId'],
    cycleId: 'cycle-2024-q1' as KPI['cycleId'],
    name: 'Code Quality Score',
    description: 'Weighted average of code review scores and test coverage',
    target: 80,
    actual: 88,
    unit: '%',
    weight: 25,
    score: 110,
    createdAt: '2024-01-01',
    updatedAt: '2024-02-15',
  },
  {
    id: 'kpi-3' as KPI['id'],
    employeeId: 'emp-1' as KPI['employeeId'],
    cycleId: 'cycle-2024-q1' as KPI['cycleId'],
    name: 'Customer Response Time',
    description: 'Average time to respond to customer inquiries',
    target: 2,
    actual: 1.8,
    unit: 'hours',
    weight: 20,
    score: 111,
    createdAt: '2024-01-01',
    updatedAt: '2024-02-15',
  },
  {
    id: 'kpi-4' as KPI['id'],
    employeeId: 'emp-1' as KPI['employeeId'],
    cycleId: 'cycle-2024-q1' as KPI['cycleId'],
    name: 'Team Collaboration Index',
    description: 'Score based on peer feedback and cross-team projects',
    target: 85,
    actual: 78,
    unit: '%',
    weight: 15,
    score: 92,
    createdAt: '2024-01-01',
    updatedAt: '2024-02-15',
  },
  {
    id: 'kpi-5' as KPI['id'],
    employeeId: 'emp-1' as KPI['employeeId'],
    cycleId: 'cycle-2024-q1' as KPI['cycleId'],
    name: 'Documentation Coverage',
    description: 'Percentage of features with complete documentation',
    target: 90,
    actual: 72,
    unit: '%',
    weight: 10,
    score: 80,
    createdAt: '2024-01-01',
    updatedAt: '2024-02-15',
  },
];

function getWeightedScore(kpis: Array<KPI>): number {
  const totalWeight = kpis.reduce((sum, kpi) => sum + (kpi.weight || 0), 0);
  if (totalWeight === 0) return 0;

  const weightedSum = kpis.reduce((sum, kpi) => {
    return sum + kpi.score * (kpi.weight || 0);
  }, 0);

  return Math.round(weightedSum / totalWeight);
}

export default function KPIsPage(): ReactNode {
  const { data: cycles = [] } = usePerformanceCycles();
  const activeCycle = cycles.find((cycle) => cycle.status === 'active') || cycles[0] || null;
  const { data: kpis = [] } = usePerformanceKPIs(activeCycle?.id);

  const currentKPIs = kpis.length > 0 ? kpis : mockKPIs;

  const weightedScore = getWeightedScore(currentKPIs);
  const onTargetCount = currentKPIs.filter((kpi) => kpi.score >= 100).length;
  const nearTargetCount = currentKPIs.filter((kpi) => kpi.score >= 80 && kpi.score < 100).length;
  const belowTargetCount = currentKPIs.filter((kpi) => kpi.score < 80).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/performance">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">My KPIs</h1>
          <p className="text-muted-foreground">Track your key performance indicators</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Weighted Score</p>
                <p className="text-2xl font-bold">{weightedScore}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">On Target</p>
                <p className="text-2xl font-bold">{onTargetCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <Minus className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Near Target</p>
                <p className="text-2xl font-bold">{nearTargetCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-error/10">
                <TrendingDown className="h-5 w-5 text-error" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Below Target</p>
                <p className="text-2xl font-bold">{belowTargetCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI Summary Bar */}
      <KPISummary kpis={currentKPIs} />

      {/* KPI List */}
      <KPIList kpis={currentKPIs} />

      {/* Performance Insight */}
      {weightedScore < 80 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <TrendingDown className="h-5 w-5 text-warning" />
              </div>
              <div>
                <h3 className="font-semibold text-warning">Performance Alert</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your weighted KPI score is below the target threshold. Focus on improving the
                  underperforming areas, especially Documentation Coverage which has the lowest
                  score.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {weightedScore >= 100 && (
        <Card className="border-success/50 bg-success/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <h3 className="font-semibold text-success">Excellent Performance!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your weighted KPI score exceeds the target. Keep up the great work! Consider
                  sharing your strategies with the team.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

'use client';

import type * as React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../primitives/card';
import { cn } from '../../../utils/cn';

interface DepartmentPerformanceData {
  label: string;
  costPerOutcome: number;
  spend: number;
  outcomes: number;
}

interface ROIByDepartmentChartProps {
  data: Array<DepartmentPerformanceData>;
  className?: string;
}

export function ROIByDepartmentChart({
  data,
  className,
}: ROIByDepartmentChartProps): React.ReactNode {
  const getBarColor = (costPerOutcome: number, outcomes: number): string => {
    if (outcomes === 0) return 'hsl(215 16% 47%)';
    if (costPerOutcome <= 100) return 'hsl(142 71% 45%)';
    if (costPerOutcome <= 300) return 'hsl(38 92% 50%)';
    return 'hsl(0 84% 60%)';
  };

  const CustomTooltip = ({ active, payload }: any): React.ReactNode => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-2">{data.label}</p>
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Cost / Outcome: </span>
              <span className="font-semibold">
                {data.outcomes > 0
                  ? `PHP ${data.costPerOutcome.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                  : 'N/A'}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Spend: </span>
              PHP {data.spend.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
            <p>
              <span className="text-muted-foreground">Tracked Outcomes: </span>
              {data.outcomes.toLocaleString('en-PH')}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle>Cost per Outcome by Objective</CardTitle>
        <CardDescription>Compare efficiency across the marketing goals being reported</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              type="number"
              tickFormatter={(value) => `PHP ${value}`}
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              dataKey="label"
              type="category"
              width={100}
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="costPerOutcome" name="Cost / Outcome" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getBarColor(entry.costPerOutcome, entry.outcomes)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

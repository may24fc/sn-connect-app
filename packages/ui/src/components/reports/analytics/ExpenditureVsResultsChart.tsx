'use client';

import type * as React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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

interface WeeklyData {
  week: string;
  spend: number;
  outcomes: number;
}

interface ExpenditureVsResultsChartProps {
  data: Array<WeeklyData>;
  className?: string;
}

export function ExpenditureVsResultsChart({
  data,
  className,
}: ExpenditureVsResultsChartProps): React.ReactNode {
  const formatSpend = (value: number): string => {
    return `PHP ${(value / 1000).toFixed(0)}k`;
  };

  const CustomTooltip = ({ active, payload, label }: any): React.ReactNode => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => {
            const formattedValue =
              entry.dataKey === 'spend'
                ? `PHP ${entry.value.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                : entry.value.toLocaleString('en-PH');

            return (
              <p key={index} style={{ color: entry.color }} className="text-sm">
                {entry.name}: {formattedValue}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle>Spend vs Tracked Outcomes</CardTitle>
        <CardDescription>Weekly view of logged spend and primary outcome volume</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="week"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              yAxisId="left"
              tickFormatter={formatSpend}
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="rect" />
            <Bar
              yAxisId="left"
              dataKey="spend"
              name="Spend"
              fill="hsl(24 95% 53%)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              yAxisId="right"
              dataKey="outcomes"
              name="Tracked Outcomes"
              fill="hsl(142 71% 45%)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

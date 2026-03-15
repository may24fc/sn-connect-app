'use client';

import type * as React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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

interface StatusDataPoint {
  status: string;
  count: number;
  color: string;
}

interface StatusBreakdownChartProps {
  data: Array<StatusDataPoint>;
  title?: string;
  description?: string;
  className?: string;
}

function StatusTooltip({ active, payload, label }: any): React.ReactNode {
  if (active && payload && payload.length > 0) {
    return (
      <div className="bg-background border rounded-lg p-3 shadow-lg">
        <p className="font-semibold mb-1">{label}</p>
        <p className="text-sm">Count: {payload[0].value}</p>
      </div>
    );
  }
  return null;
}

export function StatusBreakdownChart({
  data,
  title = 'Status Breakdown',
  description = 'Report count by status',
  className,
}: StatusBreakdownChartProps): React.ReactNode {
  if (data.length === 0) return null;

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="status"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              allowDecimals={false}
            />
            <Tooltip content={<StatusTooltip />} />
            <Legend />
            <Bar dataKey="count" name="Reports" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

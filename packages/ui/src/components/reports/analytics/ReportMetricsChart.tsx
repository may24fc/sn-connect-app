'use client';

import type * as React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
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

interface MetricDataPoint {
  name: string;
  value: number;
  unit?: string | null;
}

interface ReportMetricsChartProps {
  data: Array<MetricDataPoint>;
  chartType?: 'bar' | 'pie';
  title?: string;
  description?: string;
  className?: string;
}

const CHART_COLORS = [
  'hsl(239 84% 67%)', // indigo
  'hsl(142 71% 45%)', // green
  'hsl(24 95% 53%)',  // orange
  'hsl(0 84% 60%)',   // red
  'hsl(199 89% 48%)', // sky blue
  'hsl(280 67% 55%)', // purple
  'hsl(47 96% 53%)',  // yellow
  'hsl(173 80% 40%)', // teal
];

function BarTooltip({ active, payload, label }: any): React.ReactNode {
  if (active && payload && payload.length > 0) {
    return (
      <div className="bg-background border rounded-lg p-3 shadow-lg">
        <p className="font-semibold mb-1">{label}</p>
        <p className="text-sm text-muted-foreground">
          Value: {payload[0].value.toLocaleString()}
          {payload[0].payload.unit ? ` ${payload[0].payload.unit}` : ''}
        </p>
      </div>
    );
  }
  return null;
}

function PieTooltip({ active, payload }: any): React.ReactNode {
  if (active && payload && payload.length > 0) {
    const total = payload[0].payload.total || 1;
    const pct = ((payload[0].value / total) * 100).toFixed(1);
    return (
      <div className="bg-background border rounded-lg p-3 shadow-lg">
        <p className="font-semibold mb-1">{payload[0].name}</p>
        <p className="text-sm text-muted-foreground">
          {payload[0].value.toLocaleString()} ({pct}%)
        </p>
      </div>
    );
  }
  return null;
}

export function ReportMetricsChart({
  data,
  chartType = 'bar',
  title = 'Metrics Breakdown',
  description,
  className,
}: ReportMetricsChartProps): React.ReactNode {
  if (data.length === 0) {
    return null;
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const pieData = data.map((d) => ({ ...d, total }));

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          {chartType === 'pie' ? (
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={120}
                innerRadius={60}
                paddingAngle={2}
                label={({ name, percent }: any) =>
                  `${name} (${(percent * 100).toFixed(0)}%)`
                }
                labelLine={false}
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend />
            </PieChart>
          ) : (
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="name"
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                angle={-30}
                textAnchor="end"
                height={60}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip content={<BarTooltip />} />
              <Bar dataKey="value" name="Value" radius={[4, 4, 0, 0]}>
                {data.map((_, index) => (
                  <Cell
                    key={`bar-${index}`}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

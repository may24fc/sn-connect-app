'use client';

import type * as React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../primitives/card';
import type {
  CompletionTrendData,
  DepartmentPerformanceData,
  PerformanceRating,
  RatingDistributionData,
} from '../../types/performance.types';
import { RATING_CONFIG } from '../../types/performance.types';

// Color palette
const COLORS = {
  primary: '#6366f1',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  muted: '#94a3b8',
};

const RATING_COLORS: Record<PerformanceRating, string> = {
  exceptional: '#059669',
  exceeds: '#10b981',
  meets: '#6366f1',
  needs_improvement: '#f59e0b',
  unsatisfactory: '#ef4444',
};

interface CompletionTrendChartProps {
  data: Array<CompletionTrendData>;
  className?: string;
}

export function CompletionTrendChart({
  data,
  className,
}: CompletionTrendChartProps): React.ReactNode {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Completion Trends</CardTitle>
        <CardDescription>Track OKRs, KPIs, and reviews completed over time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="month"
                className="text-xs fill-muted-foreground"
                tick={{ fill: 'currentColor' }}
              />
              <YAxis className="text-xs fill-muted-foreground" tick={{ fill: 'currentColor' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="okrsCompleted"
                name="OKRs Completed"
                stroke={COLORS.success}
                strokeWidth={2}
                dot={{ fill: COLORS.success }}
              />
              <Line
                type="monotone"
                dataKey="kpisCompleted"
                name="KPIs On Target"
                stroke={COLORS.primary}
                strokeWidth={2}
                dot={{ fill: COLORS.primary }}
              />
              <Line
                type="monotone"
                dataKey="reviewsCompleted"
                name="Reviews Completed"
                stroke={COLORS.warning}
                strokeWidth={2}
                dot={{ fill: COLORS.warning }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

interface DepartmentPerformanceChartProps {
  data: Array<DepartmentPerformanceData>;
  className?: string;
}

export function DepartmentPerformanceChart({
  data,
  className,
}: DepartmentPerformanceChartProps): React.ReactNode {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Department Performance</CardTitle>
        <CardDescription>Compare performance metrics across departments</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="department"
                className="text-xs fill-muted-foreground"
                tick={{ fill: 'currentColor' }}
              />
              <YAxis
                className="text-xs fill-muted-foreground"
                tick={{ fill: 'currentColor' }}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar
                dataKey="averageOkrProgress"
                name="Avg OKR Progress"
                fill={COLORS.primary}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="averageKpiScore"
                name="Avg KPI Score"
                fill={COLORS.success}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

interface RatingDistributionChartProps {
  data: Array<RatingDistributionData>;
  className?: string;
}

export function RatingDistributionChart({
  data,
  className,
}: RatingDistributionChartProps): React.ReactNode {
  const chartData = data.map((item) => ({
    ...item,
    name: RATING_CONFIG[item.rating].label,
    color: RATING_COLORS[item.rating],
  }));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Rating Distribution</CardTitle>
        <CardDescription>
          Distribution of performance ratings across the organization
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="count"
                nameKey="name"
                label={({ name, percentage }) => `${name}: ${percentage.toFixed(0)}%`}
                labelLine
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number, name: string) => [`${value} employees`, name]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

interface ProgressGaugeProps {
  value: number;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ProgressGauge({
  value,
  label,
  size = 'md',
  className,
}: ProgressGaugeProps): React.ReactNode {
  const sizes = {
    sm: { width: 80, strokeWidth: 8, fontSize: 'text-lg' },
    md: { width: 120, strokeWidth: 10, fontSize: 'text-2xl' },
    lg: { width: 160, strokeWidth: 12, fontSize: 'text-3xl' },
  };

  const { width, strokeWidth, fontSize } = sizes[size];
  const radius = (width - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  const color = value >= 80 ? COLORS.success : value >= 50 ? COLORS.warning : COLORS.error;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative" style={{ width, height: width }}>
        <svg width={width} height={width} className="rotate-[-90deg]">
          {/* Background circle */}
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold ${fontSize}`}>{value}%</span>
        </div>
      </div>
      <p className="mt-2 text-sm text-muted-foreground text-center">{label}</p>
    </div>
  );
}

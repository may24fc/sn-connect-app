'use client';

import type * as React from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../primitives/card';
import { cn } from '../../../utils/cn';

interface CategoryData {
  name: string;
  value: number;
  percentage: number;
}

interface SpendByCategoryChartProps {
  data: Array<CategoryData>;
  className?: string;
}

const COLORS = {
  Marketing: 'hsl(217 91% 60%)', // blue-500
  Sales: 'hsl(262 83% 58%)', // violet-500
  Operations: 'hsl(38 92% 50%)', // amber-500
  HR: 'hsl(330 81% 60%)', // pink-500
  Other: 'hsl(215 16% 47%)', // slate-500
};

export function SpendByCategoryChart({
  data,
  className,
}: SpendByCategoryChartProps): React.ReactNode {
  const CustomTooltip = ({ active, payload }: any): React.ReactNode => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-1">{data.name}</p>
          <p className="text-sm">
            PHP {data.value.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-sm text-muted-foreground">{data.percentage.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  const renderLabel = (entry: CategoryData): string => {
    return `${entry.percentage.toFixed(0)}%`;
  };

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle>Spend by Category</CardTitle>
        <CardDescription>Distribution of expenditures across departments</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderLabel}
              outerRadius={100}
              innerRadius={60}
              fill="#8884d8"
              dataKey="value"
              paddingAngle={2}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[entry.name as keyof typeof COLORS] || COLORS.Other}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="bottom" height={36} iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

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

interface DepartmentROIData {
  department: string;
  roi: number;
  expenditure: number;
  results: number;
}

interface ROIByDepartmentChartProps {
  data: Array<DepartmentROIData>;
  className?: string;
}

export function ROIByDepartmentChart({
  data,
  className,
}: ROIByDepartmentChartProps): React.ReactNode {
  const getBarColor = (roi: number): string => {
    if (roi >= 200) return 'hsl(142 71% 45%)'; // green-500
    if (roi >= 100) return 'hsl(38 92% 50%)'; // amber-500
    return 'hsl(0 84% 60%)'; // red-500
  };

  const CustomTooltip = ({ active, payload }: any): React.ReactNode => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-2">{data.department}</p>
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">ROI: </span>
              <span className="font-semibold">{data.roi.toFixed(1)}%</span>
            </p>
            <p>
              <span className="text-muted-foreground">Expenditure: </span>
              PHP {data.expenditure.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
            <p>
              <span className="text-muted-foreground">Results: </span>
              PHP {data.results.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
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
        <CardTitle>ROI by Department</CardTitle>
        <CardDescription>Return on investment across departments</CardDescription>
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
              tickFormatter={(value) => `${value}%`}
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              dataKey="department"
              type="category"
              width={100}
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="roi" name="ROI %" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.roi)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

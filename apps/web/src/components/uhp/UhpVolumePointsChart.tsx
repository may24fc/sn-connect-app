'use client';

import { type VolumePointMonthlyActual, volumePointYearMonths } from '@/lib/uhp-volume-points';
import {
  Card,
  CardContent,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@hr-portal/ui';
import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const formatVp = (value: number) =>
  value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function UhpVolumePointsChart({
  actuals,
  periodYear,
}: {
  actuals: ReadonlyArray<VolumePointMonthlyActual>;
  periodYear: string;
}) {
  const [year, setYear] = useState(periodYear);
  useEffect(() => setYear(periodYear), [periodYear]);
  const currentYear = new Date().getFullYear();
  const years = [
    ...new Set([
      currentYear,
      currentYear - 1,
      Number(periodYear),
      ...actuals.map((row) => Number(row.reportingMonth.slice(0, 4))),
    ]),
  ].sort((left, right) => right - left);
  const months = volumePointYearMonths(Number(year), actuals);
  const data = months.map((row) => ({
    ...row,
    finalVp: row.source === 'final' ? row.volumePoints : null,
    orderVp: row.source === 'orders' ? row.volumePoints : null,
  }));
  const reported = months.filter((row) => row.volumePoints !== null);
  const total = reported.reduce((sum, row) => sum + (row.volumePoints ?? 0), 0);

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-semibold">Monthly volume points</h2>
            <p className="text-sm text-muted-foreground">
              January–December {year}. Final totals replace order sums; other months use tracked
              orders.
            </p>
            <p className="mt-2 text-sm">
              Recorded total: <strong>{formatVp(total)} VP</strong>
              <span className="text-muted-foreground">
                {' '}
                · {reported.length} of 12 months reported
              </span>
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vp-chart-year">Chart year</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger id="vp-chart-year" className="w-full sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-teal-600 dark:bg-teal-400" />
            Final monthly total
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-sky-600 dark:bg-sky-400" />
            Tracked orders
          </span>
        </div>
        {reported.length === 0 && (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            No volume points reported for {year}.
          </p>
        )}
        <section
          className="overflow-x-auto rounded-md focus-visible:outline focus-visible:outline-2"
          aria-label={`Monthly volume points chart for ${year}. Scroll horizontally on smaller screens.`}
        >
          <div className="h-80 min-w-[720px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 28, right: 12, left: 4, bottom: 8 }}
                accessibilityLayer
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="month"
                  interval={0}
                  tick={{ fontSize: 12, fill: 'rgb(var(--muted-foreground))' }}
                />
                <YAxis
                  domain={[0, 'auto']}
                  tick={{ fontSize: 12, fill: 'rgb(var(--muted-foreground))' }}
                  width={60}
                />
                <Tooltip
                  formatter={(value) => [
                    typeof value === 'number' ? `${formatVp(value)} VP` : 'Not reported',
                  ]}
                  contentStyle={{
                    backgroundColor: 'rgb(var(--card))',
                    color: 'rgb(var(--card-foreground))',
                    borderColor: 'rgb(var(--border))',
                    borderRadius: 6,
                  }}
                  cursor={{ fill: 'rgb(var(--muted))' }}
                />
                <Bar
                  dataKey="finalVp"
                  name="Final monthly total"
                  stackId="vp"
                  className="fill-teal-600 dark:fill-teal-400"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={44}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey="finalVp"
                    position="top"
                    className="fill-foreground text-[10px]"
                    formatter={(value: number | null) => (value === null ? '' : formatVp(value))}
                  />
                </Bar>
                <Bar
                  dataKey="orderVp"
                  name="Tracked orders"
                  stackId="vp"
                  className="fill-sky-600 dark:fill-sky-400"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={44}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey="orderVp"
                    position="top"
                    className="fill-foreground text-[10px]"
                    formatter={(value: number | null) => (value === null ? '' : formatVp(value))}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <p className="text-xs text-muted-foreground">
          Months without a final total or tracked orders are not reported, not zero. Tracked-order
          totals can change as orders are added. On mobile, scroll the chart sideways.
        </p>
        <details>
          <summary className="cursor-pointer text-sm font-medium">View monthly values</summary>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Volume points</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {months.map((row) => (
                <TableRow key={row.monthKey}>
                  <TableCell>
                    {row.month} {year}
                  </TableCell>
                  <TableCell>
                    {row.volumePoints === null
                      ? 'Not reported'
                      : `${formatVp(row.volumePoints)} VP`}
                  </TableCell>
                  <TableCell>
                    {row.source === 'final'
                      ? 'Final monthly total'
                      : row.source === 'orders'
                        ? 'Tracked orders'
                        : 'Not reported'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </details>
      </CardContent>
    </Card>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDepartments } from '@/hooks/useDepartments';
import { useExpenseAnalytics } from '@/hooks/useExpenseAnalytics';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hr-portal/ui';
import { ArrowLeft, BarChart3, LineChart as LineChartIcon, Loader2, PieChart as PieChartIcon } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All processing states' },
  { value: 'awaiting_intern_review', label: 'Awaiting intern review' },
  { value: 'leadership_review_required', label: 'Leadership review required' },
  { value: 'auto_approved', label: 'Auto-approved' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
] as const;

const PIE_COLORS = ['#0ea5e9', '#14b8a6', '#6366f1', '#f59e0b', '#ef4444', '#22c55e', '#8b5cf6', '#64748b'];

function formatCurrencyAud(value: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function toTitleCaseFromSnake(value: string): string {
  return value
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function normalizeStatusLabel(status: string): string {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label || toTitleCaseFromSnake(status);
}

function normalizeCategoryLabel(category: string): string {
  if (!category || category === 'other') {
    return 'Other';
  }

  return toTitleCaseFromSnake(category);
}

function renderPieLabel(props: {
  categoryLabel?: string;
  percent?: number;
  payload?: { totalSpendAud?: number };
  x?: number;
  y?: number;
  textAnchor?: 'start' | 'middle' | 'end' | 'inherit';
}) {
  const { categoryLabel, percent, payload, x, y, textAnchor } = props;
  if (typeof x !== 'number' || typeof y !== 'number') {
    return null;
  }

  const amountAud = Number(payload?.totalSpendAud ?? 0);
  const percentage = (Number(percent ?? 0) * 100).toFixed(1);

  return (
    <text x={x} y={y} textAnchor={textAnchor || 'middle'} dominantBaseline="central" fill="currentColor">
      <tspan x={x} dy="-0.45em" fontSize="11" fontWeight="600">
        {String(categoryLabel || '')}
      </tspan>
      <tspan x={x} dy="1.1em" fontSize="10" fill="#64748b">
        {`${formatCurrencyAud(amountAud)} (${percentage}%)`}
      </tspan>
    </text>
  );
}

export default function ExpenseAnalyticsDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [departmentId, setDepartmentId] = useState('all');
  const [processingStatus, setProcessingStatus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: departmentsData } = useDepartments({ page: 1, pageSize: 200 });
  const expensesDeskBasePath =
    user?.role === 'admin' || user?.role === 'super_admin' ? '/admin/expenses' : '/expenses/desk';

  const analyticsFilters = useMemo(() => {
    const filters: {
      period: 'week' | 'month';
      departmentId?: string;
      processingStatus?: string;
      startDate?: string;
      endDate?: string;
    } = { period };

    if (departmentId !== 'all') filters.departmentId = departmentId;
    if (processingStatus !== 'all') filters.processingStatus = processingStatus;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    return filters;
  }, [period, departmentId, processingStatus, startDate, endDate]);

  const { data, isLoading, error } = useExpenseAnalytics(analyticsFilters);

  const statusChartData = useMemo(
    () =>
      (data?.statusBreakdown || []).map((item) => ({
        ...item,
        statusLabel: normalizeStatusLabel(item.status),
      })),
    [data?.statusBreakdown]
  );

  const categoryChartData = useMemo(
    () =>
      (data?.categoryBreakdown || []).map((item) => ({
        ...item,
        categoryLabel: normalizeCategoryLabel(item.category),
      })),
    [data?.categoryBreakdown]
  );

  const monthOverMonth = useMemo(() => {
    if (period !== 'month') return null;

    const trend = data?.trend || [];
    if (trend.length < 2) return null;

    const current = trend[trend.length - 1];
    const previous = trend[trend.length - 2];
    if (!current || !previous) return null;

    const deltaAmount = current.totalSpendAud - previous.totalSpendAud;
    const deltaPercent = previous.totalSpendAud !== 0 ? (deltaAmount / previous.totalSpendAud) * 100 : null;

    return {
      currentLabel: current.label,
      previousLabel: previous.label,
      currentTotal: current.totalSpendAud,
      previousTotal: previous.totalSpendAud,
      deltaAmount,
      deltaPercent,
    };
  }, [data?.trend, period]);

  return (
    <div className="flex-1 space-y-6 p-8 overflow-y-auto max-h-[calc(100vh-4rem)] bg-zinc-50 dark:bg-zinc-950">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Button variant="outline" size="sm" className="mb-3 gap-2" onClick={() => router.push(expensesDeskBasePath)}>
            <ArrowLeft className="h-4 w-4" />
            Back to Executive Expense Desk
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-indigo-500" />
            Executive Expense Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Trend, status, and category spend analysis with week/month scope and operational filtering.
          </p>
        </div>
      </div>

      <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Context Filters</CardTitle>
          <CardDescription>Switch period scope and operational filters to reshape executive reporting instantly.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">Period scope</p>
            <div className="flex gap-2">
              <Button variant={period === 'week' ? 'default' : 'outline'} onClick={() => setPeriod('week')}>
                Week
              </Button>
              <Button variant={period === 'month' ? 'default' : 'outline'} onClick={() => setPeriod('month')}>
                Month
              </Button>
            </div>
          </div>

          <div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">Operational unit</p>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger>
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {(departmentsData?.data || []).map((department) => (
                  <SelectItem key={department.id} value={department.id}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">Processing state</p>
            <Select value={processingStatus} onValueChange={setProcessingStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All states" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">Start date</p>
            <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </div>

          <div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">End date</p>
            <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <CardContent className="p-10 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border border-red-200 dark:border-red-900 bg-red-50/30 dark:bg-red-950/20">
          <CardContent className="p-6 text-sm text-red-700 dark:text-red-300">
            Failed to load analytics. {(error as Error).message}
          </CardContent>
        </Card>
      ) : (
        <>
          {monthOverMonth ? (
            <Card className="border border-indigo-200 dark:border-indigo-900 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <LineChartIcon className="h-4 w-4 text-indigo-500" />
                  Month-over-Month Spend
                </CardTitle>
                <CardDescription>
                  {monthOverMonth.currentLabel} vs {monthOverMonth.previousLabel}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-6">
                <div>
                  <p className="text-xs text-zinc-500">This month</p>
                  <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{formatCurrencyAud(monthOverMonth.currentTotal)}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Last month</p>
                  <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{formatCurrencyAud(monthOverMonth.previousTotal)}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Change</p>
                  <p
                    className={`text-xl font-bold ${
                      monthOverMonth.deltaAmount > 0
                        ? 'text-rose-600'
                        : monthOverMonth.deltaAmount < 0
                          ? 'text-emerald-600'
                          : 'text-zinc-500'
                    }`}
                  >
                    {monthOverMonth.deltaAmount >= 0 ? '+' : ''}
                    {formatCurrencyAud(monthOverMonth.deltaAmount)}
                    {monthOverMonth.deltaPercent !== null ? ` (${monthOverMonth.deltaPercent.toFixed(1)}%)` : ''}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Total spend (AUD)</CardDescription>
                <CardTitle>{formatCurrencyAud(data?.totalSpendAud || 0)}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm pb-4">
              <CardHeader className="pb-2">
                <CardDescription>Total ledger entries</CardDescription>
                <CardTitle>{(data?.totalEntries || 0).toLocaleString()}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Average spend per entry</CardDescription>
                <CardTitle>{formatCurrencyAud(data?.averageSpendAudPerEntry || 0)}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <LineChartIcon className="h-4 w-4 text-indigo-500" />
                  Spend Trend ({period})
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.trend || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value) => [formatCurrencyAud(Number(value)), 'Total Spend (AUD)']}
                      labelFormatter={(label) => `Period: ${String(label)}`}
                    />
                    <Line type="monotone" dataKey="totalSpendAud" stroke="#4f46e5" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-indigo-500" />
                  Processing State Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="statusLabel" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value) => [formatCurrencyAud(Number(value)), 'Total Spend (AUD)']}
                      labelFormatter={(label) => `Status: ${String(label)}`}
                    />
                    <Bar dataKey="totalSpendAud" name="Total Spend (AUD)" fill="#14b8a6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4 text-indigo-500" />
                  Spend by Expense Category
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      formatter={(value) => [formatCurrencyAud(Number(value)), 'Total Spend (AUD)']}
                      labelFormatter={(label) => `Category: ${normalizeCategoryLabel(String(label))}`}
                    />
                    <Pie
                      data={categoryChartData}
                      dataKey="totalSpendAud"
                      nameKey="categoryLabel"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      labelLine={false}
                      label={renderPieLabel}
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`${entry.categoryLabel}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Top Operational Units</CardTitle>
                <CardDescription>Department-level spend ranking for the current scope.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(data?.departmentBreakdown || []).slice(0, 8).map((item) => (
                    <div key={item.departmentId} className="flex items-center justify-between text-sm border-b border-zinc-100 dark:border-zinc-800 pb-2">
                      <span className="text-zinc-700 dark:text-zinc-300">{item.departmentName}</span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formatCurrencyAud(item.totalSpendAud)}</span>
                    </div>
                  ))}
                  {(data?.departmentBreakdown || []).length === 0 && (
                    <p className="text-sm text-zinc-500">No departmental spend records found for this scope.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

'use client';

import { MarketingAdSpendAccessManagerDialog } from '@/components/admin/MarketingAdSpendAccessManagerDialog';
import { useAuth } from '@/contexts/AuthContext';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  PageHeader,
  Progress,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@hr-portal/ui';
import { BarChart3, CalendarRange, FileUp, TrendingUp, UserPlus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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

type PlatformOption = {
  id: string;
  name: string;
  code: string;
};

type AdSpendEntry = {
  id: string;
  platformId: string;
  platformName: string;
  entryDate: string;
  transactionId: string | null;
  paymentMethod: string | null;
  amount: number;
  invoiceReference: string | null;
  invoiceFileName: string | null;
  currency: string;
  notes: string | null;
  createdAt: string;
};

type RevenueActualEntry = {
  year: number;
  month: number;
  actualRevenueAud: number;
};

type RevenueComparisonStatus = 'loading' | 'ready' | 'forbidden' | 'error' | 'not-applicable';

type RevenueComparisonResult = {
  status: RevenueComparisonStatus;
  entries: Array<RevenueActualEntry>;
};

const manualEntryTabs = [
  { value: 'meta', label: 'Meta Ads' },
  { value: 'google', label: 'Google Ads' },
  { value: 'email', label: 'Email Marketing' },
] as const;

const defaultOverview = [
  { platform: 'Meta Ads', total: '$0.00' },
  { platform: 'Google Ads', total: '$0.00' },
  { platform: 'Email Marketing', total: '$0.00' },
  { platform: 'Total', total: '$0.00', isTotal: true },
];

const defaultMonthly = [
  { month: 'January', meta: '$0.00', google: '$0.00', email: '$0.00', total: '$0.00' },
  { month: 'February', meta: '$0.00', google: '$0.00', email: '$0.00', total: '$0.00' },
  { month: 'March', meta: '$0.00', google: '$0.00', email: '$0.00', total: '$0.00' },
  { month: 'April', meta: '$0.00', google: '$0.00', email: '$0.00', total: '$0.00' },
  { month: 'May', meta: '$0.00', google: '$0.00', email: '$0.00', total: '$0.00' },
  { month: 'June', meta: '$0.00', google: '$0.00', email: '$0.00', total: '$0.00' },
  { month: 'July', meta: '$0.00', google: '$0.00', email: '$0.00', total: '$0.00' },
  { month: 'August', meta: '$0.00', google: '$0.00', email: '$0.00', total: '$0.00' },
  { month: 'September', meta: '$0.00', google: '$0.00', email: '$0.00', total: '$0.00' },
  { month: 'October', meta: '$0.00', google: '$0.00', email: '$0.00', total: '$0.00' },
  { month: 'November', meta: '$0.00', google: '$0.00', email: '$0.00', total: '$0.00' },
  { month: 'December', meta: '$0.00', google: '$0.00', email: '$0.00', total: '$0.00' },
];

const monthOptions = [
  { value: 'all', label: 'All months' },
  { value: '0', label: 'January' },
  { value: '1', label: 'February' },
  { value: '2', label: 'March' },
  { value: '3', label: 'April' },
  { value: '4', label: 'May' },
  { value: '5', label: 'June' },
  { value: '6', label: 'July' },
  { value: '7', label: 'August' },
  { value: '8', label: 'September' },
  { value: '9', label: 'October' },
  { value: '10', label: 'November' },
  { value: '11', label: 'December' },
];

const MANUAL_ENTRIES_PAGE_SIZE = 5;

const shortMonthNames = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function normalizePlatformKey(name: string): string {
  const value = name.toLowerCase();

  if (value.includes('meta')) return 'meta';
  if (value.includes('google')) return 'google';
  if (value.includes('email')) return 'email';

  return 'meta';
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

async function fetchRevenueComparison(period: string): Promise<RevenueComparisonResult> {
  if (period === 'all') {
    return { status: 'not-applicable', entries: [] };
  }

  try {
    const response = await fetch(`/api/revenue-forecast/entries?year=${period}`, {
      cache: 'no-store',
    });

    if (response.status === 401 || response.status === 403) {
      return { status: 'forbidden', entries: [] };
    }

    if (!response.ok) {
      return { status: 'error', entries: [] };
    }

    const payload = (await response.json()) as {
      data?: Array<{
        year: number;
        month: number;
        actual_revenue_aud: number;
      }>;
    };

    return {
      status: 'ready',
      entries: (payload.data ?? []).map((entry) => ({
        year: entry.year,
        month: entry.month,
        actualRevenueAud: Number(entry.actual_revenue_aud ?? 0),
      })),
    };
  } catch {
    return { status: 'error', entries: [] };
  }
}

function looksLikeUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function extractLabelFromUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    const namedParam =
      url.searchParams.get('filename') ||
      url.searchParams.get('file') ||
      url.searchParams.get('name');
    if (namedParam) {
      return decodeURIComponent(namedParam);
    }

    const segments = url.pathname
      .split('/')
      .filter(Boolean)
      .map((part) => decodeURIComponent(part));
    const excluded = new Set(['view', 'preview', 'download', 'open', 'file', 'd', 'u', '0']);
    const meaningful = [...segments]
      .reverse()
      .find((segment) => !excluded.has(segment.toLowerCase()));

    if (meaningful) {
      return meaningful;
    }

    if (url.hostname.includes('drive.google.com')) {
      return 'Google Drive file';
    }
  } catch {
    return null;
  }

  return null;
}

function resolveInvoiceLabel(
  invoiceFileName: string | null,
  invoiceReference: string | null
): string {
  const normalizedName = (invoiceFileName ?? '').trim();
  if (normalizedName) {
    if (looksLikeUrl(normalizedName)) {
      return extractLabelFromUrl(normalizedName) ?? 'Open invoice';
    }
    return normalizedName;
  }

  if (!invoiceReference) {
    return 'Open invoice';
  }

  return extractLabelFromUrl(invoiceReference) ?? 'Open invoice';
}

export default function MarketingAdSpendPage() {
  const { user } = useAuth();
  const canManageMarketingAccess = user?.role === 'admin' || user?.role === 'super_admin';
  const currentYear = new Date().getFullYear();
  const periodOptions = [
    { value: 'all', label: 'All Time' },
    ...Array.from({ length: currentYear - 2024 + 1 }, (_, index) => {
      const year = String(currentYear - index);
      return { value: year, label: year };
    }),
  ];

  const [tab, setTab] = useState('sales-comparison');
  const [manualPlatformTab, setManualPlatformTab] =
    useState<(typeof manualEntryTabs)[number]['value']>('meta');
  const [selectedPeriod, setSelectedPeriod] = useState(String(currentYear));
  const [platforms, setPlatforms] = useState<PlatformOption[]>([]);
  const [entries, setEntries] = useState<AdSpendEntry[]>([]);
  const [overviewRows, setOverviewRows] = useState(defaultOverview);
  const [monthlyRows, setMonthlyRows] = useState(defaultMonthly);
  const [revenueActuals, setRevenueActuals] = useState<Array<RevenueActualEntry>>([]);
  const [revenueComparisonStatus, setRevenueComparisonStatus] =
    useState<RevenueComparisonStatus>('loading');
  const [isLoading, setIsLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [showGrantAccess, setShowGrantAccess] = useState(false);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState('all');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [manualEntriesPage, setManualEntriesPage] = useState(1);
  const [fullEntriesPlatform, setFullEntriesPlatform] = useState<
    (typeof manualEntryTabs)[number]['value'] | null
  >(null);

  const [quickAdd, setQuickAdd] = useState({
    date: new Date().toISOString().slice(0, 10),
    transactionId: '',
    paymentMethod: '',
    amount: '',
    invoiceReference: '',
    invoiceFileName: '',
    notes: '',
  });

  const resetQuickAdd = () => {
    setQuickAdd({
      date: new Date().toISOString().slice(0, 10),
      transactionId: '',
      paymentMethod: '',
      amount: '',
      invoiceReference: '',
      invoiceFileName: '',
      notes: '',
    });
  };

  const platformLookup = useMemo(() => {
    const map = new Map<string, string>();
    for (const platform of platforms) {
      map.set(normalizePlatformKey(platform.name), platform.id);
    }
    return map;
  }, [platforms]);

  const refreshPeriodData = async () => {
    setIsLoading(true);
    setErrorText(null);
    setRevenueComparisonStatus(selectedPeriod === 'all' ? 'not-applicable' : 'loading');

    try {
      const revenueComparisonPromise = fetchRevenueComparison(selectedPeriod);
      const response = await fetch(`/api/marketing/ad-spend?period=${selectedPeriod}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        const payload = await response
          .json()
          .catch(() => ({ error: 'Failed to load ad spend data' }));
        throw new Error(payload.error ?? 'Failed to load ad spend data');
      }

      const payload = await response.json();
      const nextOverview = payload.data?.overview?.totalByPlatform ?? defaultOverview;
      const nextMonthly = payload.data?.overview?.monthly ?? defaultMonthly;

      setOverviewRows(nextOverview);
      setMonthlyRows(nextMonthly);
      setEntries(payload.data?.entries ?? []);
      setPlatforms(payload.data?.platforms ?? []);
      const revenueComparison = await revenueComparisonPromise;
      setRevenueActuals(revenueComparison.entries);
      setRevenueComparisonStatus(revenueComparison.status);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'Failed to load ad spend data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshPeriodData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod]);

  useEffect(() => {
    setSelectedMonthFilter('all');
  }, [selectedPeriod]);

  const selectedPlatformId = platformLookup.get(manualPlatformTab) ?? '';

  const quickAddValidationError = useMemo(() => {
    if (!editingEntryId && !selectedPlatformId) {
      return 'No platform is available for the selected ad spend tab yet.';
    }

    if (!quickAdd.date.trim()) return 'Date is required.';
    if (!quickAdd.transactionId.trim()) return 'Transaction ID is required.';
    if (!quickAdd.paymentMethod.trim()) return 'Payment method is required.';

    const parsedAmount = Number(quickAdd.amount);
    if (!quickAdd.amount.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return 'Amount must be greater than zero.';
    }

    const invoiceReference = quickAdd.invoiceReference.trim();
    if (!invoiceReference) return 'Invoice link is required.';
    if (!isValidHttpUrl(invoiceReference)) {
      return 'Invoice link must be a valid URL starting with http:// or https://.';
    }

    if (!quickAdd.invoiceFileName.trim()) return 'Invoice file name is required.';

    return null;
  }, [editingEntryId, quickAdd, selectedPlatformId]);

  const filteredEntries = useMemo(
    () => entries.filter((entry) => normalizePlatformKey(entry.platformName) === manualPlatformTab),
    [entries, manualPlatformTab]
  );
  const manualEntriesTotalPages = Math.max(
    1,
    Math.ceil(filteredEntries.length / MANUAL_ENTRIES_PAGE_SIZE)
  );
  const manualEntryPaginationPages = useMemo(() => {
    if (manualEntriesTotalPages <= 7) {
      return Array.from({ length: manualEntriesTotalPages }, (_, index) => index + 1);
    }

    const pages: Array<number | 'ellipsis-left' | 'ellipsis-right'> = [1];
    const windowStart = Math.max(2, manualEntriesPage - 1);
    const windowEnd = Math.min(manualEntriesTotalPages - 1, manualEntriesPage + 1);

    if (windowStart > 2) {
      pages.push('ellipsis-left');
    }

    for (let pageNumber = windowStart; pageNumber <= windowEnd; pageNumber += 1) {
      pages.push(pageNumber);
    }

    if (windowEnd < manualEntriesTotalPages - 1) {
      pages.push('ellipsis-right');
    }

    pages.push(manualEntriesTotalPages);
    return pages;
  }, [manualEntriesPage, manualEntriesTotalPages]);

  const displayedEntries = useMemo(() => {
    const startIndex = (manualEntriesPage - 1) * MANUAL_ENTRIES_PAGE_SIZE;
    return filteredEntries.slice(startIndex, startIndex + MANUAL_ENTRIES_PAGE_SIZE);
  }, [filteredEntries, manualEntriesPage]);
  const fullEntries = useMemo(
    () =>
      fullEntriesPlatform
        ? entries.filter(
            (entry) => normalizePlatformKey(entry.platformName) === fullEntriesPlatform
          )
        : [],
    [entries, fullEntriesPlatform]
  );

  const filteredOverviewRows = useMemo(() => {
    const monthIndex =
      selectedMonthFilter === 'all' ? null : Number.parseInt(selectedMonthFilter, 10);
    const scopedEntries =
      monthIndex === null
        ? entries
        : entries.filter(
            (entry) => new Date(`${entry.entryDate}T00:00:00Z`).getUTCMonth() === monthIndex
          );

    const overviewPlatforms =
      platforms.length > 0
        ? platforms
        : overviewRows
            .filter((row) => row.platform !== 'Total')
            .map((row) => ({
              id: row.platform,
              name: row.platform,
              code: row.platform.toLowerCase(),
            }));

    const perPlatform = overviewPlatforms.map((platform) => {
      const total = scopedEntries
        .filter((entry) =>
          platforms.length > 0
            ? entry.platformId === platform.id
            : entry.platformName === platform.name
        )
        .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

      return {
        platform: platform.name,
        total: formatCurrency(total),
        isTotal: false,
      };
    });

    const grandTotal = perPlatform.reduce(
      (sum, row) => sum + Number(row.total.replace(/[^0-9.-]+/g, '')),
      0
    );

    return [
      ...perPlatform,
      { platform: 'Total', total: formatCurrency(grandTotal), isTotal: true },
    ];
  }, [entries, overviewRows, platforms, selectedMonthFilter]);

  const revenueByMonth = useMemo(
    () => new Map(revenueActuals.map((entry) => [entry.month, entry.actualRevenueAud])),
    [revenueActuals]
  );

  const comparisonRows = useMemo(() => {
    const spendByMonth = Array.from({ length: 12 }, () => 0);

    for (const entry of entries) {
      const monthIndex = new Date(`${entry.entryDate}T00:00:00Z`).getUTCMonth();
      spendByMonth[monthIndex] = (spendByMonth[monthIndex] ?? 0) + Number(entry.amount || 0);
    }

    return shortMonthNames.map((month, monthIndex) => {
      const adSpend = spendByMonth[monthIndex] ?? 0;
      const actualSales = revenueByMonth.get(monthIndex + 1) ?? null;

      return {
        month,
        adSpend,
        actualSales,
        salesLessAdSpend: actualSales === null ? null : actualSales - adSpend,
      };
    });
  }, [entries, revenueByMonth]);

  const comparisonSummary = useMemo(() => {
    const rowsWithSales = comparisonRows.filter((row) => row.actualSales !== null);
    const totalActualSales = rowsWithSales.reduce((sum, row) => sum + (row.actualSales ?? 0), 0);
    const comparableAdSpend = rowsWithSales.reduce((sum, row) => sum + row.adSpend, 0);
    const firstReportedMonth = rowsWithSales.at(0)?.month ?? null;
    const lastReportedMonth = rowsWithSales.at(-1)?.month ?? null;
    const reportedRangeLabel =
      firstReportedMonth === null
        ? 'No months reported'
        : firstReportedMonth === lastReportedMonth
          ? firstReportedMonth
          : `${firstReportedMonth}-${lastReportedMonth}`;

    return {
      comparableAdSpend,
      totalActualSales,
      salesLessAdSpend: totalActualSales - comparableAdSpend,
      spendSharePercent: totalActualSales > 0 ? (comparableAdSpend / totalActualSales) * 100 : null,
      reportedRangeLabel,
    };
  }, [comparisonRows]);

  const handleAddEntry = async () => {
    if (quickAddValidationError) {
      setErrorText(quickAddValidationError);
      return;
    }

    if (isSavingEntry) {
      return;
    }

    try {
      setIsSavingEntry(true);
      const method = editingEntryId ? 'PATCH' : 'POST';
      const endpoint = editingEntryId
        ? `/api/marketing/ad-spend/${editingEntryId}`
        : '/api/marketing/ad-spend';
      const parsedAmount = Number(quickAdd.amount);
      const trimmedNotes = quickAdd.notes.trim();

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entryDate: quickAdd.date.trim(),
          amount: parsedAmount,
          transactionId: quickAdd.transactionId.trim(),
          paymentMethod: quickAdd.paymentMethod.trim(),
          invoiceReference: quickAdd.invoiceReference.trim(),
          invoiceFileName: quickAdd.invoiceFileName.trim(),
          notes: trimmedNotes.length > 0 ? trimmedNotes : null,
          currency: 'AUD',
          ...(editingEntryId ? {} : { platformId: selectedPlatformId }),
        }),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          json.error ??
            (editingEntryId
              ? 'Failed to update the ad spend entry'
              : 'Failed to save the ad spend entry')
        );
      }

      setEditingEntryId(null);
      resetQuickAdd();
      setErrorText(null);
      await refreshPeriodData();
    } catch (error) {
      setErrorText(
        error instanceof Error
          ? error.message
          : editingEntryId
            ? 'Failed to update ad spend entry'
            : 'Failed to save ad spend entry'
      );
    } finally {
      setIsSavingEntry(false);
    }
  };

  const handleEditEntry = (entry: AdSpendEntry) => {
    setManualPlatformTab(
      normalizePlatformKey(entry.platformName) as (typeof manualEntryTabs)[number]['value']
    );
    setEditingEntryId(entry.id);
    setQuickAdd({
      date: entry.entryDate,
      transactionId: entry.transactionId ?? '',
      paymentMethod: entry.paymentMethod ?? '',
      amount: String(entry.amount),
      invoiceReference: entry.invoiceReference ?? '',
      invoiceFileName: entry.invoiceFileName ?? '',
      notes: entry.notes ?? '',
    });
    setErrorText(null);
  };

  const handleEditEntryFromModal = (entry: AdSpendEntry) => {
    setFullEntriesPlatform(null);
    handleEditEntry(entry);
  };

  const handleCancelEdit = () => {
    setEditingEntryId(null);
    resetQuickAdd();
  };

  const handleDeleteEntry = async (entryId: string) => {
    const confirmed = window.confirm('Delete this ad spend entry?');
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/marketing/ad-spend/${entryId}`, {
        method: 'DELETE',
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to delete ad spend entry');
      }

      if (editingEntryId === entryId) {
        setEditingEntryId(null);
        resetQuickAdd();
      }

      setErrorText(null);
      await refreshPeriodData();
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'Failed to delete ad spend entry');
    }
  };

  useEffect(() => {
    setManualEntriesPage(1);
  }, [manualPlatformTab, selectedPeriod]);

  useEffect(() => {
    if (manualEntriesPage > manualEntriesTotalPages) {
      setManualEntriesPage(manualEntriesTotalPages);
    }
  }, [manualEntriesPage, manualEntriesTotalPages]);

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <PageHeader
        eyebrow="Marketing"
        title="Ad Spend"
        description="Compare sales performance, review platform spend, and maintain invoice-backed entries."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canManageMarketingAccess ? (
              <Button type="button" variant="outline" onClick={() => setShowGrantAccess(true)}>
                <UserPlus className="h-4 w-4" />
                Grant Access
              </Button>
            ) : null}

            <div>
              <Label htmlFor="ad-spend-period" className="sr-only">
                Period
              </Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger
                  id="ad-spend-period"
                  className="w-[132px]"
                  aria-label="Select ad spend period"
                >
                  <span className="!flex min-w-0 items-center gap-2">
                    <CalendarRange className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <SelectValue placeholder="Period" />
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((period) => (
                    <SelectItem key={period.value} value={period.value}>
                      {period.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        }
      />

      {canManageMarketingAccess ? (
        <MarketingAdSpendAccessManagerDialog
          open={showGrantAccess}
          onOpenChange={setShowGrantAccess}
          platforms={platforms}
        />
      ) : null}

      {errorText ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {errorText}
        </div>
      ) : null}

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList className="w-fit max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="sales-comparison">Sales Comparison</TabsTrigger>
          <TabsTrigger value="overview">Spend Overview</TabsTrigger>
          <TabsTrigger value="manual-entry">Manual Entry Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 xl:grid-cols-[1fr_2fr]">
            <Card>
              <CardHeader className="border-b border-border bg-primary-muted/45 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="text-base font-semibold">
                    Overall Spend per Platform
                  </CardTitle>
                  <Select value={selectedMonthFilter} onValueChange={setSelectedMonthFilter}>
                    <SelectTrigger
                      className="h-8 w-[140px] bg-card"
                      aria-label="Filter overall spend by month"
                    >
                      <SelectValue placeholder="Filter month" />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {filteredOverviewRows.map((row) => (
                      <TableRow
                        key={row.platform}
                        className={row.isTotal ? 'bg-primary-muted/60' : ''}
                      >
                        <TableCell
                          className={
                            row.isTotal ? 'font-semibold text-foreground' : ''
                          }
                        >
                          {row.platform}
                        </TableCell>
                        <TableCell
                          className={
                            row.isTotal
                              ? 'text-right font-semibold text-foreground'
                              : 'text-right'
                          }
                        >
                          {row.total}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b border-border bg-primary-muted/45 px-4 py-3">
                <CardTitle className="text-base font-semibold">
                  Monthly Spend per Platform
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[130px]">Month</TableHead>
                        <TableHead>Meta Ads</TableHead>
                        <TableHead>Google Ads</TableHead>
                        <TableHead>Email Mktg</TableHead>
                        <TableHead>Total per month</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyRows.map((row) => (
                        <TableRow key={row.month}>
                          <TableCell>{row.month}</TableCell>
                          <TableCell>{row.meta}</TableCell>
                          <TableCell>{row.google}</TableCell>
                          <TableCell>{row.email}</TableCell>
                          <TableCell className="font-medium">{row.total}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="border-b border-border bg-primary-muted/45 px-4 py-3">
              <CardTitle className="text-base font-semibold">Important Note</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
              <p>
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">Google Ads</span>{' '}
                and{' '}
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                  Email Marketing
                </span>{' '}
                charges are billed monthly based on the applicable monthly spend.
              </p>
              <p>
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">Meta Ads</span>:
                Charges are based on the daily spending limit for Meta and are logged as direct
                ad-spend entries.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales-comparison" className="space-y-6">
          {revenueComparisonStatus === 'ready' ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>
                      Ad Spend {comparisonSummary.reportedRangeLabel}
                    </CardDescription>
                    <CardTitle className="text-2xl text-emerald-500">
                      {formatCurrency(comparisonSummary.comparableAdSpend)}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>
                      Actual Sales {comparisonSummary.reportedRangeLabel}
                    </CardDescription>
                    <CardTitle className="text-2xl text-blue-500">
                      {formatCurrency(comparisonSummary.totalActualSales)}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Sales After Ad Spend</CardDescription>
                    <CardTitle className="text-2xl text-emerald-500">
                      {formatCurrency(comparisonSummary.salesLessAdSpend)}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-6">
                    <CardDescription>Ad Spend Rate</CardDescription>
                    <CardTitle className="text-2xl text-emerald-500">
                      {comparisonSummary.spendSharePercent === null
                        ? '—'
                        : `${comparisonSummary.spendSharePercent.toFixed(1)}%`}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Spend-to-sales comparison</CardTitle>
                  <CardDescription>
                    Track ad expenses against actual sales for matching reported months.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">
                      {formatCurrency(comparisonSummary.comparableAdSpend)} ad spend of{' '}
                      {formatCurrency(comparisonSummary.totalActualSales)} actual sales
                    </span>
                    <span className="font-semibold text-emerald-500">
                      {comparisonSummary.spendSharePercent === null
                        ? '—'
                        : `${comparisonSummary.spendSharePercent.toFixed(1)}%`}
                    </span>
                  </div>
                  <Progress
                    value={Math.min(comparisonSummary.spendSharePercent ?? 0, 100)}
                    className="h-2"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Monthly ad spend vs actual sales
                  </CardTitle>
                  <CardDescription>
                    Blue = ad spend, green = actual sales. Sales come from the existing Revenue
                    Forecast actuals; this comparison does not represent revenue attributed to ads.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={340}>
                    <BarChart
                      data={comparisonRows}
                      margin={{ top: 16, right: 12, left: 8, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-zinc-200 dark:stroke-zinc-800"
                      />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis
                        tickFormatter={(value: number) =>
                          value >= 1000 ? `${Math.round(value / 1000)}K` : String(value)
                        }
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="adSpend" name="Ad spend" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                      <Bar
                        dataKey="actualSales"
                        name="Actual sales"
                        fill="#10b981"
                        radius={[3, 3, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          ) : null}

          {revenueComparisonStatus === 'forbidden' ? (
            <Card>
              <CardContent className="p-4 text-sm text-zinc-600 dark:text-zinc-300">
                Monthly sales comparison is available to users with Revenue Forecast access. Ad
                spend data remains available based on your marketing access.
              </CardContent>
            </Card>
          ) : null}

          {revenueComparisonStatus === 'not-applicable' ? (
            <Card>
              <CardContent className="p-4 text-sm text-zinc-600 dark:text-zinc-300">
                Select a specific year to compare monthly ad spend with actual sales.
              </CardContent>
            </Card>
          ) : null}

          {revenueComparisonStatus === 'error' ? (
            <Card>
              <CardContent className="p-4 text-sm text-amber-700 dark:text-amber-300">
                Ad spend loaded, but actual sales could not be loaded for comparison.
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="manual-entry" className="space-y-6">
          <Tabs
            value={manualPlatformTab}
            onValueChange={(value) => {
              setManualPlatformTab(value as (typeof manualEntryTabs)[number]['value']);
              setManualEntriesPage(1);
              if (editingEntryId) {
                setEditingEntryId(null);
                resetQuickAdd();
              }
            }}
            className="space-y-6"
          >
            <TabsList className="w-fit max-w-full justify-start overflow-x-auto">
              {manualEntryTabs.map((platform) => (
                <TabsTrigger key={platform.value} value={platform.value}>
                  {platform.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {manualEntryTabs.map((platform) => (
              <TabsContent key={platform.value} value={platform.value} className="space-y-6">
                <Card>
                  <CardHeader className="border-b border-border bg-primary-muted/45 px-4 py-3">
                    <div className="flex w-full items-center justify-between gap-3">
                      <CardTitle className="text-base font-semibold">
                        {platform.label} entries
                      </CardTitle>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="ml-auto"
                        onClick={() => setFullEntriesPlatform(platform.value)}
                      >
                        View full
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[120px]">
                              Date
                            </TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Transaction ID</TableHead>
                            <TableHead>Payment Method</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Invoice</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredEntries.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={7}
                                className="px-4 py-6 text-center text-sm text-zinc-500"
                              >
                                No entries logged yet for this platform in{' '}
                                {selectedPeriod === 'all' ? 'All Time' : selectedPeriod}.
                              </TableCell>
                            </TableRow>
                          ) : (
                            displayedEntries.map((row) => (
                              <TableRow
                                key={row.id}
                              >
                                <TableCell>
                                  {new Date(`${row.entryDate}T00:00:00Z`).toLocaleDateString(
                                    'en-AU'
                                  )}
                                </TableCell>
                                <TableCell>{row.platformName}</TableCell>
                                <TableCell>{row.transactionId ?? '—'}</TableCell>
                                <TableCell>{row.paymentMethod ?? '—'}</TableCell>
                                <TableCell className="font-medium">
                                  {formatCurrency(row.amount)}
                                </TableCell>
                                <TableCell>
                                  {row.invoiceReference ? (
                                    <a
                                      href={row.invoiceReference}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1.5 rounded-md bg-primary-muted/60 px-2 py-1 text-xs font-medium text-primary ring-1 ring-primary/15 hover:bg-primary-muted"
                                    >
                                      <FileUp className="h-2.5 w-2.5" />
                                      {resolveInvoiceLabel(
                                        row.invoiceFileName,
                                        row.invoiceReference
                                      )}
                                    </a>
                                  ) : row.invoiceFileName ? (
                                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                                      {row.invoiceFileName}
                                    </span>
                                  ) : (
                                    <span className="text-sm text-zinc-500">No invoice</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      type="button"
                                      onClick={() => handleEditEntry(row)}
                                      variant="outline"
                                      size="xs"
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      type="button"
                                      onClick={() => void handleDeleteEntry(row.id)}
                                      variant="ghost"
                                      size="xs"
                                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    {filteredEntries.length > 0 ? (
                      <div className="flex flex-col items-center justify-center gap-3 border-t border-zinc-200 px-4 py-4 dark:border-zinc-800">
                        <p className="text-xs text-zinc-500">
                          Showing {(manualEntriesPage - 1) * MANUAL_ENTRIES_PAGE_SIZE + 1}-
                          {Math.min(
                            manualEntriesPage * MANUAL_ENTRIES_PAGE_SIZE,
                            filteredEntries.length
                          )}{' '}
                          of {filteredEntries.length}
                        </p>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setManualEntriesPage((current) => Math.max(1, current - 1))
                            }
                            disabled={manualEntriesPage === 1}
                          >
                            Previous
                          </Button>
                          {manualEntryPaginationPages.map((pageNumber) =>
                            typeof pageNumber === 'number' ? (
                              <Button
                                key={`manual-page-${pageNumber}`}
                                type="button"
                                size="sm"
                                variant={manualEntriesPage === pageNumber ? 'default' : 'outline'}
                                onClick={() => setManualEntriesPage(pageNumber)}
                              >
                                {pageNumber}
                              </Button>
                            ) : (
                              <span
                                key={`manual-page-${pageNumber}`}
                                className="px-2 text-xs font-medium text-zinc-500"
                              >
                                ...
                              </span>
                            )
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setManualEntriesPage((current) =>
                                Math.min(manualEntriesTotalPages, current + 1)
                              )
                            }
                            disabled={manualEntriesPage === manualEntriesTotalPages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="border-b border-border bg-primary-muted/45 px-4 py-3">
                    <CardTitle className="text-base font-semibold">
                      {editingEntryId
                        ? `Edit ${platform.label} entry`
                        : `Quick add ${platform.label} entry`}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                      <div className="space-y-2">
                        <label
                          htmlFor={`ad-spend-${platform.value}-date`}
                          className="text-xs font-medium uppercase tracking-wide text-zinc-500"
                        >
                          Date
                        </label>
                        <Input
                          id={`ad-spend-${platform.value}-date`}
                          type="date"
                          value={quickAdd.date}
                          onChange={(event) =>
                            setQuickAdd((current) => ({ ...current, date: event.target.value }))
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label
                          htmlFor={`ad-spend-${platform.value}-transaction-id`}
                          className="text-xs font-medium uppercase tracking-wide text-zinc-500"
                        >
                          Transaction ID
                        </label>
                        <Input
                          id={`ad-spend-${platform.value}-transaction-id`}
                          type="text"
                          value={quickAdd.transactionId}
                          onChange={(event) =>
                            setQuickAdd((current) => ({
                              ...current,
                              transactionId: event.target.value,
                            }))
                          }
                          placeholder="Q2PEQ1NA-0006"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label
                          htmlFor={`ad-spend-${platform.value}-payment-method`}
                          className="text-xs font-medium uppercase tracking-wide text-zinc-500"
                        >
                          Payment method
                        </label>
                        <Input
                          id={`ad-spend-${platform.value}-payment-method`}
                          type="text"
                          value={quickAdd.paymentMethod}
                          onChange={(event) =>
                            setQuickAdd((current) => ({
                              ...current,
                              paymentMethod: event.target.value,
                            }))
                          }
                          placeholder="American Express 1005"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label
                          htmlFor={`ad-spend-${platform.value}-amount`}
                          className="text-xs font-medium uppercase tracking-wide text-zinc-500"
                        >
                          Amount
                        </label>
                        <Input
                          id={`ad-spend-${platform.value}-amount`}
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={quickAdd.amount}
                          onChange={(event) =>
                            setQuickAdd((current) => ({ ...current, amount: event.target.value }))
                          }
                          placeholder="0.00"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label
                          htmlFor={`ad-spend-${platform.value}-invoice-link`}
                          className="text-xs font-medium uppercase tracking-wide text-zinc-500"
                        >
                          Invoice link
                        </label>
                        <Input
                          id={`ad-spend-${platform.value}-invoice-link`}
                          type="url"
                          value={quickAdd.invoiceReference}
                          onChange={(event) =>
                            setQuickAdd((current) => ({
                              ...current,
                              invoiceReference: event.target.value,
                            }))
                          }
                          placeholder="https://.../invoice.pdf"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label
                          htmlFor={`ad-spend-${platform.value}-invoice-file-name`}
                          className="text-xs font-medium uppercase tracking-wide text-zinc-500"
                        >
                          Invoice file name
                        </label>
                        <Input
                          id={`ad-spend-${platform.value}-invoice-file-name`}
                          type="text"
                          value={quickAdd.invoiceFileName}
                          onChange={(event) =>
                            setQuickAdd((current) => ({
                              ...current,
                              invoiceFileName: event.target.value,
                            }))
                          }
                          placeholder="invoice-aug-2026.pdf"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <Textarea
                        value={quickAdd.notes}
                        onChange={(event) =>
                          setQuickAdd((current) => ({ ...current, notes: event.target.value }))
                        }
                        rows={3}
                        placeholder="Optional notes"
                        className="min-h-24"
                        showCounter={false}
                      />
                    </div>

                    {quickAddValidationError ? (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {quickAddValidationError}
                      </p>
                    ) : null}

                    <div className="flex justify-end gap-2">
                      {editingEntryId ? (
                        <Button variant="outline" onClick={handleCancelEdit}>
                          Cancel
                        </Button>
                      ) : null}
                      <Button
                        className="gap-2"
                        onClick={handleAddEntry}
                        disabled={isSavingEntry || quickAddValidationError !== null}
                      >
                        <TrendingUp className="h-4 w-4" />
                        {isSavingEntry ? 'Saving…' : editingEntryId ? 'Save changes' : 'Add entry'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>
      </Tabs>

      {isLoading ? <p className="text-sm text-zinc-500">Loading ad spend data…</p> : null}

      <Dialog
        open={fullEntriesPlatform !== null}
        onOpenChange={(open) => !open && setFullEntriesPlatform(null)}
      >
        <DialogContent className="max-h-[85vh] max-w-6xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {manualEntryTabs.find((tabItem) => tabItem.value === fullEntriesPlatform)?.label ??
                'Ad'}{' '}
              entries
            </DialogTitle>
            <DialogDescription>Full entry history for this ad platform.</DialogDescription>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fullEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-6 text-center text-sm text-zinc-500">
                      No entries available.
                    </TableCell>
                  </TableRow>
                ) : (
                  fullEntries.map((row) => (
                    <TableRow key={`full-${row.id}`}>
                      <TableCell>
                        {new Date(`${row.entryDate}T00:00:00Z`).toLocaleDateString('en-AU')}
                      </TableCell>
                      <TableCell>{row.platformName}</TableCell>
                      <TableCell>{row.transactionId ?? '—'}</TableCell>
                      <TableCell>{row.paymentMethod ?? '—'}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(row.amount)}</TableCell>
                      <TableCell>
                        {row.invoiceReference ? (
                          <a
                            href={row.invoiceReference}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-md bg-primary-muted/60 px-2 py-1 text-xs font-medium text-primary ring-1 ring-primary/15 hover:bg-primary-muted"
                          >
                            <FileUp className="h-2.5 w-2.5" />
                            {resolveInvoiceLabel(row.invoiceFileName, row.invoiceReference)}
                          </a>
                        ) : row.invoiceFileName ? (
                          <span className="text-sm text-zinc-700 dark:text-zinc-300">
                            {row.invoiceFileName}
                          </span>
                        ) : (
                          <span className="text-sm text-zinc-500">No invoice</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            onClick={() => handleEditEntryFromModal(row)}
                            variant="outline"
                            size="xs"
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            onClick={() => void handleDeleteEntry(row.id)}
                            variant="ghost"
                            size="xs"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { MarketingAdSpendAccessManagerDialog } from '@/components/admin/MarketingAdSpendAccessManagerDialog';
import { useAuth } from '@/contexts/AuthContext';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@hr-portal/ui';
import { CalendarRange, FileUp, TrendingUp, UserPlus } from 'lucide-react';

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

    const segments = url.pathname.split('/').filter(Boolean).map((part) => decodeURIComponent(part));
    const excluded = new Set(['view', 'preview', 'download', 'open', 'file', 'd', 'u', '0']);
    const meaningful = [...segments].reverse().find((segment) => !excluded.has(segment.toLowerCase()));

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

function resolveInvoiceLabel(invoiceFileName: string | null, invoiceReference: string | null): string {
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

  const [tab, setTab] = useState('overview');
  const [manualPlatformTab, setManualPlatformTab] = useState<(typeof manualEntryTabs)[number]['value']>('meta');
  const [selectedPeriod, setSelectedPeriod] = useState(String(currentYear));
  const [platforms, setPlatforms] = useState<PlatformOption[]>([]);
  const [entries, setEntries] = useState<AdSpendEntry[]>([]);
  const [overviewRows, setOverviewRows] = useState(defaultOverview);
  const [monthlyRows, setMonthlyRows] = useState(defaultMonthly);
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

    try {
      const response = await fetch(`/api/marketing/ad-spend?period=${selectedPeriod}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Failed to load ad spend data' }));
        throw new Error(payload.error ?? 'Failed to load ad spend data');
      }

      const payload = await response.json();
      const nextOverview = payload.data?.overview?.totalByPlatform ?? defaultOverview;
      const nextMonthly = payload.data?.overview?.monthly ?? defaultMonthly;

      setOverviewRows(nextOverview);
      setMonthlyRows(nextMonthly);
      setEntries(payload.data?.entries ?? []);
      setPlatforms(payload.data?.platforms ?? []);
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
    () =>
      entries.filter((entry) => normalizePlatformKey(entry.platformName) === manualPlatformTab),
    [entries, manualPlatformTab]
  );
  const manualEntriesTotalPages = Math.max(1, Math.ceil(filteredEntries.length / MANUAL_ENTRIES_PAGE_SIZE));
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
        ? entries.filter((entry) => normalizePlatformKey(entry.platformName) === fullEntriesPlatform)
        : [],
    [entries, fullEntriesPlatform]
  );

  const filteredOverviewRows = useMemo(() => {
    const monthIndex = selectedMonthFilter === 'all' ? null : Number.parseInt(selectedMonthFilter, 10);
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
            .map((row) => ({ id: row.platform, name: row.platform, code: row.platform.toLowerCase() }));

    const perPlatform = overviewPlatforms.map((platform) => {
      const total = scopedEntries
        .filter((entry) =>
          platforms.length > 0 ? entry.platformId === platform.id : entry.platformName === platform.name
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

    return [...perPlatform, { platform: 'Total', total: formatCurrency(grandTotal), isTotal: true }];
  }, [entries, overviewRows, platforms, selectedMonthFilter]);

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
            (editingEntryId ? 'Failed to update the ad spend entry' : 'Failed to save the ad spend entry')
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
    setManualPlatformTab(normalizePlatformKey(entry.platformName) as (typeof manualEntryTabs)[number]['value']);
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
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Marketing</p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Ad Spend
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {canManageMarketingAccess ? (
            <button
              type="button"
              onClick={() => setShowGrantAccess(true)}
              className="inline-flex items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
            >
              <UserPlus className="h-4 w-4" />
              Grant Access
            </button>
          ) : null}

          <label className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
            <CalendarRange className="h-4 w-4" />
            <span>Period</span>
            <select
              value={selectedPeriod}
              onChange={(event) => setSelectedPeriod(event.target.value)}
              className="bg-transparent font-medium outline-none"
              aria-label="Select ad spend period"
            >
              {periodOptions.map((period) => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

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
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="manual-entry">Manual Entry Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 xl:grid-cols-[1fr_2fr]">
            <Card>
              <CardHeader className="border-b border-zinc-200 bg-zinc-900 px-3 py-3 text-zinc-50 dark:border-zinc-700 dark:bg-zinc-950">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="text-base font-semibold">Overall Spend per Platform</CardTitle>
                  <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-300">
                    <select
                      value={selectedMonthFilter}
                      onChange={(event) => setSelectedMonthFilter(event.target.value)}
                      className="rounded-md border border-zinc-600 bg-zinc-900 px-2 py-1 text-xs font-medium text-zinc-100 outline-none"
                      aria-label="Filter overall spend by month"
                    >
                      {monthOptions.map((month) => (
                        <option key={month.value} value={month.value}>
                          {month.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {filteredOverviewRows.map((row) => (
                      <TableRow key={row.platform} className={row.isTotal ? 'bg-zinc-200/80 dark:bg-zinc-800/80' : ''}>
                        <TableCell className={row.isTotal ? 'font-semibold text-zinc-900 dark:text-zinc-50' : ''}>
                          {row.platform}
                        </TableCell>
                        <TableCell className={row.isTotal ? 'text-right font-semibold text-zinc-900 dark:text-zinc-50' : 'text-right'}>
                          {row.total}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b border-zinc-200 bg-zinc-900 px-3 py-3 text-zinc-50 dark:border-zinc-700 dark:bg-zinc-950">
                <CardTitle className="text-base font-semibold">Monthly Spend per Platform</CardTitle>
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
            <CardHeader className="border-b border-zinc-200 bg-zinc-900 px-3 py-3 text-zinc-50 dark:border-zinc-700 dark:bg-zinc-950">
              <CardTitle className="text-base font-semibold">Important Note</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
              <p>
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">Google Ads</span> and{' '}
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">Email Marketing</span> charges are billed monthly based on the applicable monthly spend.
              </p>
              <p>
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">Meta Ads</span>: Charges are based on the daily spending limit for Meta and are logged as direct ad-spend entries.
              </p>
            </CardContent>
          </Card>
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
            <TabsList className="w-full justify-start">
              {manualEntryTabs.map((platform) => (
                <TabsTrigger key={platform.value} value={platform.value}>
                  {platform.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {manualEntryTabs.map((platform) => (
              <TabsContent key={platform.value} value={platform.value} className="space-y-6">
                <Card>
                  <CardHeader className="border-b border-zinc-200 bg-zinc-900 px-3 py-3 text-zinc-50 dark:border-zinc-700 dark:bg-zinc-950">
                    <div className="flex w-full items-center justify-between gap-3">
                      <CardTitle className="text-base font-semibold">{platform.label} entries</CardTitle>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="ml-auto border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700 hover:text-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
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
                          <TableRow className="bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                            <TableHead className="min-w-[120px] text-zinc-900 dark:text-zinc-100">Date</TableHead>
                            <TableHead className="text-zinc-900 dark:text-zinc-100">Category</TableHead>
                            <TableHead className="text-zinc-900 dark:text-zinc-100">Transaction ID</TableHead>
                            <TableHead className="text-zinc-900 dark:text-zinc-100">Payment Method</TableHead>
                            <TableHead className="text-zinc-900 dark:text-zinc-100">Amount</TableHead>
                            <TableHead className="text-zinc-900 dark:text-zinc-100">Invoice</TableHead>
                            <TableHead className="text-zinc-900 dark:text-zinc-100">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredEntries.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="px-4 py-6 text-center text-sm text-zinc-500">
                                No entries logged yet for this platform in{' '}
                                {selectedPeriod === 'all' ? 'All Time' : selectedPeriod}.
                              </TableCell>
                            </TableRow>
                          ) : (
                            displayedEntries.map((row) => (
                              <TableRow key={row.id} className="border-b border-zinc-200 dark:border-zinc-800">
                                <TableCell>{new Date(`${row.entryDate}T00:00:00Z`).toLocaleDateString('en-AU')}</TableCell>
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
                                      className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600 ring-1 ring-red-200 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-300 dark:ring-red-900"
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
                                    <button
                                      type="button"
                                      onClick={() => handleEditEntry(row)}
                                      className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void handleDeleteEntry(row.id)}
                                      className="rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
                                    >
                                      Delete
                                    </button>
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
                          {Math.min(manualEntriesPage * MANUAL_ENTRIES_PAGE_SIZE, filteredEntries.length)} of{' '}
                          {filteredEntries.length}
                        </p>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setManualEntriesPage((current) => Math.max(1, current - 1))}
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
                              setManualEntriesPage((current) => Math.min(manualEntriesTotalPages, current + 1))
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
                  <CardHeader className="border-b border-zinc-200 bg-zinc-900 px-3 py-3 text-zinc-50 dark:border-zinc-700 dark:bg-zinc-950">
                    <CardTitle className="text-base font-semibold">
                      {editingEntryId ? `Edit ${platform.label} entry` : `Quick add ${platform.label} entry`}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">Date</label>
                        <input
                          type="date"
                          value={quickAdd.date}
                          onChange={(event) => setQuickAdd((current) => ({ ...current, date: event.target.value }))}
                          required
                          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">Transaction ID</label>
                        <input
                          type="text"
                          value={quickAdd.transactionId}
                          onChange={(event) => setQuickAdd((current) => ({ ...current, transactionId: event.target.value }))}
                          placeholder="Q2PEQ1NA-0006"
                          required
                          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">Payment method</label>
                        <input
                          type="text"
                          value={quickAdd.paymentMethod}
                          onChange={(event) => setQuickAdd((current) => ({ ...current, paymentMethod: event.target.value }))}
                          placeholder="American Express 1005"
                          required
                          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">Amount</label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={quickAdd.amount}
                          onChange={(event) => setQuickAdd((current) => ({ ...current, amount: event.target.value }))}
                          placeholder="0.00"
                          required
                          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">Invoice link</label>
                        <input
                          type="url"
                          value={quickAdd.invoiceReference}
                          onChange={(event) => setQuickAdd((current) => ({ ...current, invoiceReference: event.target.value }))}
                          placeholder="https://.../invoice.pdf"
                          required
                          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">Invoice file name</label>
                        <input
                          type="text"
                          value={quickAdd.invoiceFileName}
                          onChange={(event) =>
                            setQuickAdd((current) => ({ ...current, invoiceFileName: event.target.value }))
                          }
                          placeholder="invoice-aug-2026.pdf"
                          required
                          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <textarea
                        value={quickAdd.notes}
                        onChange={(event) => setQuickAdd((current) => ({ ...current, notes: event.target.value }))}
                        rows={3}
                        placeholder="Optional notes"
                        className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                      />
                    </div>

                    {quickAddValidationError ? (
                      <p className="text-sm text-red-600 dark:text-red-400">{quickAddValidationError}</p>
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

      <Dialog open={fullEntriesPlatform !== null} onOpenChange={(open) => !open && setFullEntriesPlatform(null)}>
        <DialogContent className="max-h-[85vh] max-w-6xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {manualEntryTabs.find((tabItem) => tabItem.value === fullEntriesPlatform)?.label ?? 'Ad'} entries
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
                      <TableCell>{new Date(`${row.entryDate}T00:00:00Z`).toLocaleDateString('en-AU')}</TableCell>
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
                            className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600 ring-1 ring-red-200 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-300 dark:ring-red-900"
                          >
                            <FileUp className="h-2.5 w-2.5" />
                            {resolveInvoiceLabel(row.invoiceFileName, row.invoiceReference)}
                          </a>
                        ) : row.invoiceFileName ? (
                          <span className="text-sm text-zinc-700 dark:text-zinc-300">{row.invoiceFileName}</span>
                        ) : (
                          <span className="text-sm text-zinc-500">No invoice</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditEntryFromModal(row)}
                            className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteEntry(row.id)}
                            className="rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
                          >
                            Delete
                          </button>
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

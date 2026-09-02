'use client';

import { AiSpendingAccessManagerButton } from '@/components/admin/AiSpendingAccessManagerPanel';
import { useAuth } from '@/contexts/AuthContext';
import {
  type AiExpense,
  type AiExpenseProvider,
  useAiExpenseProviders,
  useAiExpenses,
  useCreateAiExpense,
  useCreateAiExpenseProvider,
  useDeleteAiExpense,
  useDeleteAiExpenseProvider,
  useUpdateAiExpense,
  useUpdateAiExpenseProvider,
} from '@/hooks/useAiExpenses';
import { AI_EXPENSE_CURRENCIES, AI_SPEND_TYPES, type AiExpenseCurrency, type AiSpendType } from '@/lib/schemas/ai-expense.schema';
import {
  Badge,
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
  useToast,
} from '@hr-portal/ui';
import { CalendarRange } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const CURRENCY_OPTIONS: AiExpenseCurrency[] = [...AI_EXPENSE_CURRENCIES];
const SPEND_TYPE_OPTIONS: { value: AiSpendType; label: string }[] = [
  { value: 'api', label: 'API' },
  { value: 'subscription', label: 'Subscription' },
];
const ENTRY_PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;
const PERIOD_START_YEAR = 2026;
type ManualSpendTypeFilter = AiSpendType | 'all';

function formatCurrency(amountCents: number, currency = 'AUD'): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
}

function monthLabel(monthIndex: number): string {
  return new Date(Date.UTC(2026, monthIndex, 1)).toLocaleDateString('en-AU', { month: 'long' });
}

type FormState = {
  providerId: string;
  spendType: AiSpendType;
  transactionDate: string;
  amount: string;
  currency: AiExpenseCurrency;
  accountEmail: string;
  transactionId: string;
  reason: string;
};

function initialFormState(): FormState {
  return {
    providerId: '',
    spendType: 'subscription',
    transactionDate: new Date().toISOString().slice(0, 10),
    amount: '',
    currency: 'AUD',
    accountEmail: '',
    transactionId: '',
    reason: '',
  };
}

export default function AiSpendingPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const canManageAccess = user?.role === 'admin' || user?.role === 'super_admin';
  const currentYear = new Date().getFullYear();
  const latestPeriodYear = Math.max(currentYear, PERIOD_START_YEAR);
  const periodOptions = [
    { value: 'all', label: 'All-time' },
    ...Array.from({ length: latestPeriodYear - PERIOD_START_YEAR + 1 }, (_, index) => {
      const year = String(latestPeriodYear - index);
      return { value: year, label: year };
    }),
  ];

  const providersQuery = useAiExpenseProviders();
  const expensesQuery = useAiExpenses();
  const createExpense = useCreateAiExpense();
  const updateExpense = useUpdateAiExpense();
  const deleteExpense = useDeleteAiExpense();
  const createProvider = useCreateAiExpenseProvider();
  const updateProvider = useUpdateAiExpenseProvider();
  const deleteProvider = useDeleteAiExpenseProvider();

  const providers = providersQuery.data?.providers ?? [];
  const expenses = expensesQuery.data?.data ?? [];

  const [tab, setTab] = useState<'dashboard' | 'manual'>('dashboard');
  const [entryPage, setEntryPage] = useState(1);
  const [entryPageSize, setEntryPageSize] = useState<(typeof ENTRY_PAGE_SIZE_OPTIONS)[number]>(10);
  const [selectedPeriod, setSelectedPeriod] = useState(String(latestPeriodYear));
  const [providerFilterId, setProviderFilterId] = useState('all');
  const [spendTypeFilter, setSpendTypeFilter] = useState<ManualSpendTypeFilter>('all');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [isManualEntryDialogOpen, setIsManualEntryDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(initialFormState());

  const [isProviderDialogOpen, setIsProviderDialogOpen] = useState(false);
  const [newProviderName, setNewProviderName] = useState('');
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [editingProviderName, setEditingProviderName] = useState('');

  useEffect(() => {
    if (providers.length > 0 && !form.providerId) {
      const firstProvider = providers[0];
      if (firstProvider) {
        setForm((current) => ({ ...current, providerId: firstProvider.id }));
      }
    }
  }, [providers, form.providerId]);

  const periodFilteredExpenses = useMemo(() => {
    if (selectedPeriod === 'all') {
      return expenses;
    }

    const periodYear = Number(selectedPeriod);
    return expenses.filter((expense) => {
      const date = new Date(`${expense.transaction_date}T00:00:00`);
      return date.getFullYear() === periodYear;
    });
  }, [expenses, selectedPeriod]);

  const monthlyRows = useMemo(() => {
    const selectedYear = selectedPeriod === 'all' ? null : Number(selectedPeriod);

    return Array.from({ length: 12 }, (_, monthIndex) => {
      const monthEntries = periodFilteredExpenses.filter((expense) => {
        const date = new Date(`${expense.transaction_date}T00:00:00`);
        if (selectedYear !== null && date.getFullYear() !== selectedYear) {
          return false;
        }
        return date.getMonth() === monthIndex;
      });

      const totalCents = monthEntries.reduce((sum, entry) => sum + entry.amount_cents, 0);
      return {
        month: monthLabel(monthIndex),
        entries: monthEntries.length,
        totalCents,
      };
    });
  }, [periodFilteredExpenses, selectedPeriod]);

  const providerBreakdown = useMemo(() => {
    const byProvider = new Map<string, number>();

    for (const expense of periodFilteredExpenses) {
      byProvider.set(expense.provider_id, (byProvider.get(expense.provider_id) ?? 0) + expense.amount_cents);
    }

    return Array.from(byProvider.entries())
      .map(([providerId, totalCents]) => {
        const provider = providers.find((entry) => entry.id === providerId);
        return {
          providerId,
          providerName: provider?.name ?? expenseProviderName(periodFilteredExpenses, providerId),
          totalCents,
        };
      })
      .sort((left, right) => right.totalCents - left.totalCents);
  }, [providers, periodFilteredExpenses]);

  const dashboardTotals = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const thisYear = now.getFullYear();

    let monthTotal = 0;
    let monthCount = 0;
    let yearlyTotal = 0;
    const allTimeTotal = expenses.reduce((sum, expense) => sum + expense.amount_cents, 0);

    for (const expense of periodFilteredExpenses) {
      const date = new Date(`${expense.transaction_date}T00:00:00`);
      if (selectedPeriod === 'all' ? date.getFullYear() !== thisYear : false) {
        continue;
      }

      yearlyTotal += expense.amount_cents;
      if (date.getMonth() === currentMonth) {
        monthTotal += expense.amount_cents;
        monthCount += 1;
      }
    }

    return {
      monthTotal,
      monthCount,
      yearlyTotal: selectedPeriod === 'all' ? yearlyTotal : periodFilteredExpenses.reduce((sum, expense) => sum + expense.amount_cents, 0),
      allTimeTotal,
    };
  }, [expenses, periodFilteredExpenses, selectedPeriod]);

  const selectedPeriodYear = selectedPeriod === 'all' ? null : Number(selectedPeriod);
  const isSelectedCurrentYear = selectedPeriodYear === currentYear;
  const monthCardLabel =
    selectedPeriod === 'all' || isSelectedCurrentYear
      ? 'This month'
      : new Date(Date.UTC(selectedPeriodYear ?? currentYear, new Date().getMonth(), 1)).toLocaleDateString('en-AU', {
          month: 'long',
          year: 'numeric',
        });
  const monthCardDescription =
    selectedPeriod === 'all' || isSelectedCurrentYear
      ? `${dashboardTotals.monthCount} entries this month.`
      : `${dashboardTotals.monthCount} entries in ${monthCardLabel}.`;
  const yearCardLabel = selectedPeriod === 'all' ? 'This year' : selectedPeriod;
  const yearCardDescription = selectedPeriod === 'all' ? 'Year-to-date AI spend total.' : `AI spend total for ${selectedPeriod}.`;

  const filteredEntries = useMemo(() => {
    const search = searchFilter.trim().toLowerCase();

    return periodFilteredExpenses.filter((entry) => {
      if (providerFilterId !== 'all' && entry.provider_id !== providerFilterId) {
        return false;
      }

      if (spendTypeFilter !== 'all' && entry.spend_type !== spendTypeFilter) {
        return false;
      }

      if (dateFromFilter && entry.transaction_date < dateFromFilter) {
        return false;
      }

      if (dateToFilter && entry.transaction_date > dateToFilter) {
        return false;
      }

      if (!search) {
        return true;
      }

      const providerName = (entry.provider?.name ?? expenseProviderName(expenses, entry.provider_id)).toLowerCase();
      const accountEmail = (entry.account_email ?? '').toLowerCase();
      const transactionId = (entry.transaction_id ?? '').toLowerCase();

      return (
        providerName.includes(search) ||
        accountEmail.includes(search) ||
        transactionId.includes(search)
      );
    });
  }, [dateFromFilter, dateToFilter, periodFilteredExpenses, providerFilterId, searchFilter, spendTypeFilter]);

  const paginatedEntries = useMemo(() => {
    const start = (entryPage - 1) * entryPageSize;
    return filteredEntries.slice(start, start + entryPageSize);
  }, [entryPage, entryPageSize, filteredEntries]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / entryPageSize));

  useEffect(() => {
    if (entryPage > totalPages) {
      setEntryPage(totalPages);
    }
  }, [entryPage, totalPages]);

  useEffect(() => {
    setEntryPage(1);
  }, [entryPageSize]);

  useEffect(() => {
    setEntryPage(1);
  }, [selectedPeriod, providerFilterId, spendTypeFilter, dateFromFilter, dateToFilter, searchFilter]);

  function resetForm() {
    setEditingId(null);
    setForm((current) => ({
      ...initialFormState(),
      providerId: current.providerId,
    }));
  }

  function editEntry(entry: AiExpense) {
    setTab('manual');
    setEditingId(entry.id);
    setForm({
      providerId: entry.provider_id,
      spendType: entry.spend_type,
      transactionDate: entry.transaction_date,
      amount: (entry.amount_cents / 100).toFixed(2),
      currency: (entry.currency as AiExpenseCurrency) ?? 'AUD',
      accountEmail: entry.account_email ?? '',
      transactionId: entry.transaction_id,
      reason: entry.reason,
    });
    setIsManualEntryDialogOpen(true);
  }

  function deleteEntry(id: string) {
    deleteExpense.mutate(id, {
      onSuccess: () => {
        addToast({
          title: 'Expense deleted',
          description: 'The manual AI expense entry was removed.',
          variant: 'default',
        });
      },
      onError: (error: Error) => {
        addToast({
          title: 'Delete failed',
          description: error.message,
          variant: 'error',
        });
      },
    });
  }

  function submitEntry() {
    if (!form.providerId || !form.transactionDate || !form.accountEmail.trim() || !form.reason.trim()) {
      addToast({
        title: 'Missing details',
        description: 'Provider, date, account/email, and reason are required.',
        variant: 'error',
      });
      return;
    }

    const numericAmount = Number(form.amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      addToast({
        title: 'Invalid amount',
        description: 'Amount must be greater than zero.',
        variant: 'error',
      });
      return;
    }

    const payload = {
      providerId: form.providerId,
      spendType: form.spendType,
      transactionDate: form.transactionDate,
      amountCents: Math.round(numericAmount * 100),
      currency: form.currency,
      accountEmail: form.accountEmail.trim(),
      transactionId: form.transactionId.trim(),
      reason: form.reason.trim(),
    };

    if (editingId) {
      updateExpense.mutate(
        { id: editingId, payload },
        {
          onSuccess: () => {
            resetForm();
            setIsManualEntryDialogOpen(false);
            addToast({
              title: 'Expense updated',
              description: 'Manual AI expense entry updated successfully.',
              variant: 'success',
            });
          },
          onError: (error: Error) => {
            addToast({
              title: 'Update failed',
              description: error.message,
              variant: 'error',
            });
          },
        }
      );
      return;
    }

    createExpense.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setIsManualEntryDialogOpen(false);
        addToast({
          title: 'Expense saved',
          description: 'Manual AI expense entry saved successfully.',
          variant: 'success',
        });
      },
      onError: (error: Error) => {
        addToast({
          title: 'Save failed',
          description: error.message,
          variant: 'error',
        });
      },
    });
  }

  function addProvider() {
    const name = newProviderName.trim();
    if (!name) {
      addToast({ title: 'Missing details', description: 'Enter a provider name.', variant: 'error' });
      return;
    }

    createProvider.mutate(
      { name },
      {
        onSuccess: (response: { data: AiExpenseProvider }) => {
          setNewProviderName('');
          setForm((current) => ({ ...current, providerId: response.data.id }));
          addToast({ title: 'Provider added', description: `"${name}" is now available.`, variant: 'success' });
        },
        onError: (error: Error) => {
          addToast({ title: 'Failed to add provider', description: error.message, variant: 'error' });
        },
      }
    );
  }

  function openAddManualEntryDialog() {
    setEditingId(null);
    setForm((current) => ({
      ...initialFormState(),
      providerId: current.providerId || providers[0]?.id || '',
    }));
    setIsManualEntryDialogOpen(true);
  }

  function handleManualEntryDialogOpenChange(open: boolean) {
    setIsManualEntryDialogOpen(open);
    if (!open) {
      resetForm();
    }
  }

  function startProviderEdit(provider: AiExpenseProvider) {
    setEditingProviderId(provider.id);
    setEditingProviderName(provider.name);
  }

  function saveProviderEdit() {
    if (!editingProviderId) {
      return;
    }

    const name = editingProviderName.trim();
    if (!name) {
      addToast({ title: 'Missing details', description: 'Enter a provider name.', variant: 'error' });
      return;
    }

    updateProvider.mutate(
      { id: editingProviderId, name },
      {
        onSuccess: () => {
          setEditingProviderId(null);
          setEditingProviderName('');
          addToast({ title: 'Provider updated', description: 'Provider name was updated.', variant: 'success' });
        },
        onError: (error: Error) => {
          addToast({ title: 'Failed to update provider', description: error.message, variant: 'error' });
        },
      }
    );
  }

  function removeProvider(provider: AiExpenseProvider) {
    if (!window.confirm(`Delete provider "${provider.name}"?`)) {
      return;
    }

    deleteProvider.mutate(
      { id: provider.id },
      {
        onSuccess: () => {
          addToast({ title: 'Provider deleted', description: 'Provider removed successfully.', variant: 'success' });
        },
        onError: (error: Error) => {
          addToast({ title: 'Failed to delete provider', description: error.message, variant: 'error' });
        },
      }
    );
  }

  if (!user) {
    return <div className="p-6 text-sm text-muted-foreground">Loading user...</div>;
  }

  const hasError = providersQuery.isError || expensesQuery.isError;
  const isLoading = providersQuery.isLoading || expensesQuery.isLoading;
  const isMutating = createExpense.isPending || updateExpense.isPending || deleteExpense.isPending;

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Personal Finance</p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">AI Spending Tracker</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Manual tracking for AI subscriptions and API spend.</p>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
            <CalendarRange className="h-4 w-4" />
            <span>Period</span>
            <select
              value={selectedPeriod}
              onChange={(event) => setSelectedPeriod(event.target.value)}
              className="bg-transparent font-medium outline-none"
              aria-label="Select AI spending period"
            >
              {periodOptions.map((period) => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>
          </label>

          <Button type="button" variant="outline" size="sm" onClick={() => setIsProviderDialogOpen(true)}>
            Manage providers
          </Button>
          {canManageAccess ? <AiSpendingAccessManagerButton /> : null}
        </div>
      </div>

      {hasError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {(providersQuery.error instanceof Error && providersQuery.error.message) ||
            (expensesQuery.error instanceof Error && expensesQuery.error.message) ||
            'Failed to load AI spending data.'}
        </div>
      ) : null}

      <Tabs value={tab} onValueChange={(value) => setTab(value as 'dashboard' | 'manual')} className="space-y-6">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="manual">Manual Entries</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{monthCardLabel}</CardDescription>
                <CardTitle>{formatCurrency(dashboardTotals.monthTotal, 'AUD')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{monthCardDescription}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{yearCardLabel}</CardDescription>
                <CardTitle>{formatCurrency(dashboardTotals.yearlyTotal, 'AUD')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{yearCardDescription}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>All-time spend</CardDescription>
                <CardTitle>{formatCurrency(dashboardTotals.allTimeTotal, 'AUD')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Total lifetime AI spending across all records.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Top provider</CardDescription>
                <CardTitle>{providerBreakdown[0]?.providerName ?? 'N/A'}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {providerBreakdown[0] ? formatCurrency(providerBreakdown[0].totalCents, 'AUD') : 'No spend logged yet.'}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_2fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Spend by provider</CardTitle>
                <CardDescription>Simple rollup of your manual entries.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {providerBreakdown.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="py-6 text-center text-sm text-zinc-500">
                          No spend logged yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      providerBreakdown.map((row) => (
                        <TableRow key={row.providerId}>
                          <TableCell>{row.providerName}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(row.totalCents, 'AUD')}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{selectedPeriod === 'all' ? 'Monthly spend (all-time)' : `Monthly spend (${selectedPeriod})`}</CardTitle>
                <CardDescription>
                  {selectedPeriod === 'all' ? 'Tracks monthly totals across all years.' : 'Tracks monthly totals and entry counts.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead>Entries</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyRows.map((row) => (
                        <TableRow key={row.month}>
                          <TableCell>{row.month}</TableCell>
                          <TableCell>{row.entries}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(row.totalCents, 'AUD')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="manual" className="space-y-6">
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Manual entries</CardTitle>
                  <CardDescription>Only your own records are shown here.</CardDescription>
                </div>
                <Button type="button" onClick={openAddManualEntryDialog}>
                  Add manual entry
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid gap-3 border-b border-zinc-200 p-4 md:grid-cols-2 xl:grid-cols-5 dark:border-zinc-800">
                  <select
                    value={providerFilterId}
                    onChange={(event) => setProviderFilterId(event.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="all">All providers</option>
                    {providers.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={spendTypeFilter}
                    onChange={(event) => setSpendTypeFilter(event.target.value as ManualSpendTypeFilter)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="all">All spend types</option>
                    {SPEND_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <Input
                    type="date"
                    value={dateFromFilter}
                    onChange={(event) => setDateFromFilter(event.target.value)}
                    placeholder="From date"
                  />

                  <Input
                    type="date"
                    value={dateToFilter}
                    onChange={(event) => setDateToFilter(event.target.value)}
                    placeholder="To date"
                  />

                  <Input
                    value={searchFilter}
                    onChange={(event) => setSearchFilter(event.target.value)}
                    placeholder="Search provider/email/txn"
                  />

                  <div className="md:col-span-2 xl:col-span-5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setProviderFilterId('all');
                        setSpendTypeFilter('all');
                        setDateFromFilter('');
                        setDateToFilter('');
                        setSearchFilter('');
                      }}
                    >
                      Reset filters
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px]">Date</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Spend Type</TableHead>
                        <TableHead>Account / Email</TableHead>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="py-8 text-center text-sm text-zinc-500">
                            Loading entries...
                          </TableCell>
                        </TableRow>
                      ) : paginatedEntries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="py-8 text-center text-sm text-zinc-500">
                            No entries match the current filters.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedEntries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell>{new Date(`${entry.transaction_date}T00:00:00`).toLocaleDateString('en-AU')}</TableCell>
                            <TableCell>{entry.provider?.name ?? expenseProviderName(expenses, entry.provider_id)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{entry.spend_type}</Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{entry.account_email || '-'}</TableCell>
                            <TableCell className="font-mono text-xs">{entry.transaction_id}</TableCell>
                            <TableCell className="max-w-[280px] truncate" title={entry.reason}>
                              {entry.reason}
                            </TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(entry.amount_cents, entry.currency)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => editEntry(entry)}>
                                  Edit
                                </Button>
                                <Button type="button" variant="destructive" size="sm" onClick={() => deleteEntry(entry.id)}>
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
                  <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800">
                    <span className="text-zinc-500">
                      Showing {(entryPage - 1) * entryPageSize + 1}-{Math.min(entryPage * entryPageSize, filteredEntries.length)} of {filteredEntries.length}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <label className="text-zinc-500" htmlFor="entriesPerPage">
                          Rows
                        </label>
                        <select
                          id="entriesPerPage"
                          value={entryPageSize}
                          onChange={(event) => setEntryPageSize(Number(event.target.value) as (typeof ENTRY_PAGE_SIZE_OPTIONS)[number])}
                          className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                        >
                          {ENTRY_PAGE_SIZE_OPTIONS.map((size) => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                        </select>
                      </div>
                      <span className="text-zinc-500">
                        Page {entryPage} of {totalPages}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEntryPage((current) => Math.max(1, current - 1))}
                          disabled={entryPage === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEntryPage((current) => Math.min(totalPages, current + 1))}
                          disabled={entryPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isManualEntryDialogOpen} onOpenChange={handleManualEntryDialogOpenChange}>
        <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit manual entry' : 'Add manual entry'}</DialogTitle>
            <DialogDescription>Submit your own AI expense records.</DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="provider">
                AI Provider
              </label>
              <select
                id="provider"
                value={form.providerId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    providerId: event.target.value,
                  }))
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-ring"
                disabled={isLoading}
              >
                {providers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="spendType">
                Spend Type
              </label>
              <select
                id="spendType"
                value={form.spendType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    spendType: event.target.value as (typeof AI_SPEND_TYPES)[number],
                  }))
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-ring"
              >
                {SPEND_TYPE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="transactionDate">
                  Transaction date
                </label>
                <input
                  id="transactionDate"
                  type="date"
                  value={form.transactionDate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      transactionDate: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-ring"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="amount">
                  Amount
                </label>
                <input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-ring"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="currency">
                  Currency
                </label>
                <select
                  id="currency"
                  value={form.currency}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      currency: event.target.value as AiExpenseCurrency,
                    }))
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-ring"
                >
                  {CURRENCY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="accountEmail">
                  Account / Email
                </label>
                <Input
                  id="accountEmail"
                  value={form.accountEmail}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      accountEmail: event.target.value,
                    }))
                  }
                  placeholder="e.g. finance@company.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="transactionId">
                Transaction ID
              </label>
              <Input
                id="transactionId"
                value={form.transactionId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    transactionId: event.target.value,
                  }))
                }
                placeholder="e.g. INV-2026-001"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="reason">
                Reason
              </label>
              <textarea
                id="reason"
                rows={4}
                value={form.reason}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    reason: event.target.value,
                  }))
                }
                placeholder="Why did you purchase or use this AI tool?"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-ring"
              />
            </div>

          </div>

          <div className="flex gap-3 border-t border-border pt-4">
            <Button type="button" onClick={submitEntry} disabled={isMutating} className="flex-1">
              {isMutating ? 'Saving...' : editingId ? 'Update entry' : 'Save entry'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsManualEntryDialogOpen(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isProviderDialogOpen} onOpenChange={setIsProviderDialogOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>Manage AI providers</DialogTitle>
            <DialogDescription>Add, edit, or remove providers for manual entries.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto pr-1">
            <div className="flex gap-2">
              <Input
                value={newProviderName}
                onChange={(event) => setNewProviderName(event.target.value)}
                placeholder="e.g. OpenAI"
              />
              <Button type="button" onClick={addProvider} disabled={createProvider.isPending}>
                {createProvider.isPending ? 'Adding...' : 'Add'}
              </Button>
            </div>

            <div className="max-h-72 space-y-2 overflow-y-auto rounded-md border border-border p-2">
              {providers.length === 0 ? (
                <div className="px-2 py-4 text-sm text-zinc-500">No providers yet.</div>
              ) : (
                providers.map((provider) => (
                  <div key={provider.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
                    {editingProviderId === provider.id ? (
                      <Input value={editingProviderName} onChange={(event) => setEditingProviderName(event.target.value)} className="h-8 flex-1" />
                    ) : (
                      <span className="flex-1 truncate text-sm">{provider.name}</span>
                    )}
                    <div className="flex items-center gap-1">
                      {editingProviderId === provider.id ? (
                        <>
                          <Button type="button" variant="outline" size="sm" className="h-7 px-2" onClick={saveProviderEdit} disabled={updateProvider.isPending}>
                            Save
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => {
                              setEditingProviderId(null);
                              setEditingProviderName('');
                            }}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => startProviderEdit(provider)}>
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-red-600 hover:text-red-700"
                            onClick={() => removeProvider(provider)}
                            disabled={deleteProvider.isPending}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function expenseProviderName(expenses: AiExpense[], providerId: string): string {
  const fromRow = expenses.find((item) => item.provider_id === providerId);
  return fromRow?.provider?.name ?? 'Unknown provider';
}

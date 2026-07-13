'use client';

import { useMemo, useState } from 'react';
import ExpenseMatchingQueuePage from '@/app/(employee)/expenses/verify/page';
import { useDepartments } from '@/hooks/useDepartments';
import { useDeleteExpense, useExpenses, useLeadershipDecision } from '@/hooks/useExpenses';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  useToast,
} from '@hr-portal/ui';
import { Badge } from '@hr-portal/ui';
import {
  AlertCircle,
  CheckCircle,
  Download,
  FileCheck2,
  FileX2,
  History,
  Info,
  LineChart,
  Loader2,
  Scale,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';

const SETTLED_STATUSES = new Set(['auto_approved', 'approved', 'rejected']);
const EXCEPTION_MATCH_STATUS = 'variance_flagged';
const SETTLED_MATCH_STATUSES = new Set(['matched', 'resolved']);

export default function AdminExpensesDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'matching' | 'exceptions' | 'settled'>('matching');
  const [decisionNotes, setDecisionNotes] = useState<{ [key: string]: string }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentIdFilter, setDepartmentIdFilter] = useState('all');
  const [processingStatusFilter, setProcessingStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: departmentsData } = useDepartments({ page: 1, pageSize: 200 });
  const expensesDeskBasePath =
    user?.role === 'admin' || user?.role === 'super_admin' ? '/admin/expenses' : '/expenses/desk';

  const filters = useMemo(() => {
    const value: {
      search?: string;
      departmentId?: string;
      dateFrom?: string;
      dateTo?: string;
      status?: string;
    } = {};

    const trimmedSearch = searchTerm.trim();
    if (trimmedSearch) {
      value.search = trimmedSearch;
    }
    if (departmentIdFilter !== 'all') {
      value.departmentId = departmentIdFilter;
    }
    if (dateFrom) {
      value.dateFrom = dateFrom;
    }
    if (dateTo) {
      value.dateTo = dateTo;
    }
    if (processingStatusFilter !== 'all') {
      value.status = processingStatusFilter;
    }

    return value;
  }, [searchTerm, departmentIdFilter, dateFrom, dateTo, processingStatusFilter]);

  const { data: rawLedger, isLoading } = useExpenses(filters);

  const decideMutation = useLeadershipDecision();
  const deleteMutation = useDeleteExpense();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    if (deletingId === id) {
      // Second click — confirmed
      deleteMutation.mutate(id, {
        onSuccess: () => {
          addToast({ title: 'Entry deleted', description: 'Ledger entry has been removed.', variant: 'default' });
          setDeletingId(null);
        },
        onError: (err) => {
          addToast({ title: 'Delete failed', description: (err as Error).message, variant: 'error' });
          setDeletingId(null);
        },
      });
    } else {
      // First click — arm confirmation
      setDeletingId(id);
    }
  };

  const filteredRows = rawLedger?.data || [];
  const exceptions = filteredRows.filter((entry) => entry.match_status === EXCEPTION_MATCH_STATUS);
  const settled = filteredRows.filter(
    (entry) => SETTLED_STATUSES.has(entry.processing_status) || SETTLED_MATCH_STATUSES.has(entry.match_status)
  );

  const clearFilters = () => {
    setSearchTerm('');
    setDepartmentIdFilter('all');
    setProcessingStatusFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const buildExportUrl = (format: 'csv' | 'xlsx') => {
    const params = new URLSearchParams();
    params.set('format', format);

    const scopedStatus =
      processingStatusFilter !== 'all'
        ? processingStatusFilter
        : activeTab === 'exceptions'
          ? undefined
          : 'auto_approved,approved,rejected';

    if (scopedStatus) {
      params.set('processingStatus', scopedStatus);
    }
    if (activeTab === 'exceptions' && processingStatusFilter === 'all') {
      params.set('matchStatus', EXCEPTION_MATCH_STATUS);
    }
    if (departmentIdFilter !== 'all') {
      params.set('departmentId', departmentIdFilter);
    }
    if (searchTerm.trim()) {
      params.set('search', searchTerm.trim());
    }
    if (dateFrom) {
      params.set('dateFrom', dateFrom);
    }
    if (dateTo) {
      params.set('dateTo', dateTo);
    }

    return `/api/expenses/export?${params.toString()}`;
  };

  const handleExport = (format: 'csv' | 'xlsx') => {
    window.open(buildExportUrl(format), '_blank');
  };

  const handleDecision = (id: string, action: 'approve' | 'reject') => {
    const notes = decisionNotes[id] || '';

    decideMutation.mutate(
      {
        id,
        action,
        notes: notes || null,
      },
      {
        onSuccess: () => {
          addToast({
            title: `Expense ${action === 'approve' ? 'Approved' : 'Rejected'}`,
            description: `Successfully executed decision action on ledger item and alerted owner.`,
            variant: 'success',
          });
          // Clear notes entry
          setDecisionNotes((prev) => {
            const updated = { ...prev };
            delete updated[id];
            return updated;
          });
        },
        onError: (err: any) => {
          console.error(err);
          addToast({
            title: 'Action Failed',
            description: err?.message || 'Error occurred while saving your decision. Please retry.',
            variant: 'error',
          });
        },
      }
    );
  };

  const handleNotesChange = (id: string, val: string) => {
    setDecisionNotes((prev) => ({
      ...prev,
      [id]: val,
    }));
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8 overflow-y-auto max-h-[calc(100vh-4rem)] bg-zinc-50 dark:bg-zinc-950">
      <div className="flex md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-indigo-500" />
            Expense Desk
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review requests vs payments flagged with a matching variance, and monitor the reconciled ledger.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => router.push(`${expensesDeskBasePath}/analytics`)}
        >
          <LineChart className="h-4 w-4" />
          Open Executive Analytics
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'matching' | 'exceptions' | 'settled')} className="space-y-6">
        <TabsList className="inline-flex w-fit overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 p-0">
          <TabsTrigger value="matching" className="rounded-none border-0 px-4 py-2 text-sm font-semibold flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-zinc-950 dark:data-[state=active]:bg-zinc-950 dark:data-[state=active]:text-zinc-50">
            <Scale className="h-4 w-4" />
            Matching Queue
          </TabsTrigger>
          <TabsTrigger value="exceptions" className="rounded-none border-0 px-4 py-2 text-sm font-semibold flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-zinc-950 dark:data-[state=active]:bg-zinc-950 dark:data-[state=active]:text-zinc-50">
            <AlertCircle className="h-4 w-4" />
            Variance Review ({exceptions.length})
          </TabsTrigger>
          <TabsTrigger value="settled" className="rounded-none border-0 px-4 py-2 text-sm font-semibold flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-zinc-950 dark:data-[state=active]:bg-zinc-950 dark:data-[state=active]:text-zinc-50">
            <History className="h-4 w-4" />
            Settled Ledger & History ({settled.length})
          </TabsTrigger>
        </TabsList>

        {activeTab !== 'matching' ? (
          <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ledger Filters</CardTitle>
              <CardDescription>Search and narrow records by department, processing state, and date window.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <div className="xl:col-span-2">
                  <Label htmlFor="expense-search" className="text-xs text-zinc-600 dark:text-zinc-400">Search vendor</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                    <Input
                      id="expense-search"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search by vendor"
                      className="pl-8"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-zinc-600 dark:text-zinc-400">Department</Label>
                  <Select value={departmentIdFilter} onValueChange={setDepartmentIdFilter}>
                    <SelectTrigger className="mt-1">
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
                  <Label className="text-xs text-zinc-600 dark:text-zinc-400">Processing state</Label>
                  <Select value={processingStatusFilter} onValueChange={setProcessingStatusFilter}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="All states" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All states</SelectItem>
                      <SelectItem value="awaiting_intern_review">Awaiting intern review</SelectItem>
                      <SelectItem value="leadership_review_required">Leadership review required</SelectItem>
                      <SelectItem value="auto_approved">Auto-approved</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              </div>

              <div className="flex justify-between items-end gap-3 md:flex-row md:items-center md:gap-6 xl:gap-3 xl:grid xl:grid-cols-5">
                <div className="flex gap-3">
                  <div>
                    <Label htmlFor="date-from" className="text-xs text-zinc-600 dark:text-zinc-400">Date from</Label>
                    <Input id="date-from" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="date-to" className="text-xs text-zinc-600 dark:text-zinc-400">Date to</Label>
                    <Input id="date-to" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="mt-1" />
                  </div>
                </div>

                <div className="flex items-end gap-2 xl:col-span-4 xl:justify-end">
                  <Button variant="outline" onClick={clearFilters} className="gap-2">
                    <X className="h-4 w-4" />
                    Clear filters
                  </Button>
                  <Button variant="outline" onClick={() => handleExport('csv')} className="gap-2">
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                  <Button variant="outline" onClick={() => handleExport('xlsx')} className="gap-2">
                    <Download className="h-4 w-4" />
                    Export XLSX
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <TabsContent value="matching" className="space-y-4 outline-none">
          <ExpenseMatchingQueuePage />
        </TabsContent>

        <TabsContent value="exceptions" className="space-y-4 outline-none">
          {isLoading ? (
            <div className="p-12 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
            </div>
          ) : exceptions.length === 0 ? (
            <div className="p-12 border bg-white dark:bg-zinc-900 rounded-xl text-center space-y-3 flex flex-col items-center">
              <CheckCircle className="h-12 w-12 text-emerald-500" />
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">Exceptional Desk Clear</h3>
                <p className="text-xs text-zinc-400 mt-1">All price spikes and unrecognized invoices have been processed.</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {exceptions.map((expense) => {
                const varianceAmount = expense.matched_variance_amount ?? 0;
                const isLargeVariance = Math.abs(varianceAmount) >= expense.total_amount * 0.1;
                return (
                  <Card
                    key={expense.id}
                    className={`border transition-all shadow-sm flex flex-col justify-between ${
                      isLargeVariance
                        ? 'border-rose-200 dark:border-rose-950/50 bg-rose-50/15'
                        : 'border-amber-200 dark:border-amber-950/50 bg-amber-50/10'
                    }`}
                  >
                    <CardHeader className="pb-3 border-b border-zinc-100/80 dark:border-zinc-800">
                      <div className="flex justify-between items-start">
                        <div>
                          <Badge
                            className={`mb-2 capitalize px-2 py-0.5 border-none ${
                              isLargeVariance
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                : 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                            }`}
                          >
                            Variance {expense.currency} {Math.abs(varianceAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </Badge>
                          <CardTitle className="text-base font-bold text-zinc-900 dark:text-zinc-50">{expense.vendor_name}</CardTitle>
                          <CardDescription className="text-xs text-muted-foreground mt-0.5">
                            Submitted by {expense.submitted_by_user?.display_name || 'Staff member'} on {formatDate(expense.transaction_date)}
                          </CardDescription>
                        </div>
                        <span className="font-bold text-base text-zinc-950 dark:text-zinc-50">
                          {expense.currency} {Number(expense.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="py-4 space-y-4 flex-1">
                      {/* Match detail block */}
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1">
                          <p className="font-bold text-zinc-500">ENTRY TYPE:</p>
                          <div className="bg-white/80 dark:bg-zinc-900 rounded p-2 border border-zinc-100 dark:border-zinc-800 font-medium capitalize">
                            {expense.source_type === 'staff_request' ? 'Spend Request' : 'Direct Payment'}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="font-bold text-zinc-500">STAFF JUSTIFICATION:</p>
                          <div className="bg-white/80 dark:bg-zinc-900 rounded p-2 border border-zinc-100 dark:border-zinc-800 min-h-[42px] max-h-[42px] overflow-y-auto italic">
                            "{expense.business_justification || 'None'}"
                          </div>
                        </div>
                      </div>

                      {/* Auditor Note */}
                      <div className="flex gap-2 text-xs bg-white/60 dark:bg-zinc-900 rounded border border-zinc-100 dark:border-zinc-800 p-2.5">
                        <Info className="h-4 w-4 text-indigo-500 shrink-0" />
                        <div>
                          <p className="font-bold text-zinc-700 dark:text-zinc-400">Accounting Match Notes:</p>
                          <p className="italic text-zinc-500 dark:text-zinc-400 mt-0.5">
                            "{expense.matched_notes || 'No reconciliation remarks recorded.'}"
                          </p>
                        </div>
                      </div>

                      {/* Decider comments */}
                      <div className="space-y-1 text-xs">
                        <Label htmlFor={`decide-${expense.id}`} className="font-bold text-zinc-700 dark:text-zinc-300">
                          Review Signature Comments / Denial Notes
                        </Label>
                        <Textarea
                          id={`decide-${expense.id}`}
                          placeholder="State reasons for approval or specify items to be reformatted."
                          value={decisionNotes[expense.id] || ''}
                          onChange={(e) => handleNotesChange(expense.id, e.target.value)}
                          className="min-h-[60px]"
                        />
                      </div>
                    </CardContent>

                    <div className="p-6 pt-0 border-t border-zinc-100 dark:border-zinc-800 flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => handleDecision(expense.id, 'reject')}
                        disabled={decideMutation.isPending}
                        className="flex-1 text-rose-600 border-rose-200 hover:bg-rose-50"
                      >
                        <FileX2 className="mr-2 h-4 w-4" /> Reject Booking
                      </Button>
                      <Button
                        onClick={() => handleDecision(expense.id, 'approve')}
                        disabled={decideMutation.isPending}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        <FileCheck2 className="mr-2 h-4 w-4" /> Approve Booking
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="settled" className="space-y-4 outline-none">
          {isLoading ? (
            <div className="p-12 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
            </div>
          ) : settled.length === 0 ? (
            <div className="p-12 border bg-white dark:bg-zinc-900 rounded-xl text-center text-zinc-400">
              Zero historical ledger actions available.
            </div>
          ) : (
            <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-zinc-50 border-b border-zinc-250 dark:border-zinc-800">
                      <TableHead className="font-semibold text-zinc-650 dark:text-zinc-400">Vendor</TableHead>
                      <TableHead className="font-semibold text-zinc-650 dark:text-zinc-400">Date</TableHead>
                      <TableHead className="font-semibold text-zinc-650 dark:text-zinc-400">Total</TableHead>
                      <TableHead className="font-semibold text-zinc-650 dark:text-zinc-400">Debit / Credit Accounts</TableHead>
                      <TableHead className="font-semibold text-zinc-650 dark:text-zinc-400">Status</TableHead>
                      <TableHead className="font-semibold text-zinc-650 dark:text-zinc-400">Assessment</TableHead>
                      <TableHead className="font-semibold text-zinc-650 dark:text-zinc-400">Review Notes</TableHead>
                      <TableHead className="w-[80px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {settled.map((expense) => (
                      <TableRow key={expense.id} className="border-b border-zinc-100 dark:border-zinc-850 hover:bg-zinc-50/50">
                        <TableCell className="font-semibold text-zinc-900 dark:text-zinc-50 truncate max-w-[130px]">
                          {expense.vendor_name}
                        </TableCell>
                        <TableCell className="text-zinc-500 dark:text-zinc-400">
                          {formatDate(expense.transaction_date)}
                        </TableCell>
                        <TableCell className="font-semibold text-zinc-900 dark:text-zinc-50">
                          {expense.currency} {Number(expense.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div>
                            <p><span className="text-zinc-400 mr-1 font-bold">DR:</span>{expense.verified_debit_account || expense.draft_debit_account || expense.ai_debit_account || <span className="italic text-zinc-400">Extracting...</span>}</p>
                            <p><span className="text-zinc-400 mr-1 font-bold">CR:</span>{expense.verified_credit_account || expense.draft_credit_account || expense.ai_credit_account || <span className="italic text-zinc-400">Extracting...</span>}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {expense.processing_status === 'auto_approved' ? (
                            <Badge variant="success" className="bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/10 border-none font-semibold">Auto-Approved</Badge>
                          ) : expense.processing_status === 'approved' ? (
                            <Badge variant="success" className="bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/10 border-none font-semibold">Approved</Badge>
                          ) : (
                            <Badge variant="destructive" className="border-none font-semibold">Rejected</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {expense.risk_bucket ? (
                            <span className="capitalize text-xs font-semibold flex items-center gap-1">
                              <span className={`h-1.5 w-1.5 rounded-full ${
                                expense.risk_bucket === 'standard_recurring' ? 'bg-emerald-500' :
                                expense.risk_bucket === 'price_spike' ? 'bg-amber-500' : 'bg-rose-500'
                              }`} />
                              {expense.risk_bucket.replace('_', ' ')}
                            </span>
                          ) : (
                            <span className="text-zinc-400 italic">None</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs italic text-zinc-500 dark:text-zinc-400 max-w-[180px] truncate">
                          {expense.reviewer_notes || 'No remarks recorded.'}
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          {deletingId === expense.id ? (
                            <div className="flex items-center gap-1 justify-end">
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 px-2 text-xs"
                                onClick={() => handleDelete(expense.id)}
                                disabled={deleteMutation.isPending}
                              >
                                {deleteMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirm'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                onClick={() => setDeletingId(null)}
                                disabled={deleteMutation.isPending}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                              onClick={() => handleDelete(expense.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Inline fallback since importing ShieldAlert isn't possible directly from lucide if missing
function ShieldAlert({ className }: { className?: string }) {
  return <Sparkles className={className} />;
}

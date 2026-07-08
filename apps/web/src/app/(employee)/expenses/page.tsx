'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useExpensesAccess } from '@/hooks/useExpensesAccess';
import {
  useDeleteExpense,
  useExpenses,
  useLogExpenseRequest,
  useQueueExpenseIngestion,
  type ExpenseEntry,
} from '@/hooks/useExpenses';
import { validateReceiptImageQuality } from '@/lib/expenses/image-quality';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  FileDropZone,
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
  Textarea,
  useToast,
} from '@hr-portal/ui';
import { Badge } from '@hr-portal/ui';
import { ClipboardList, FileText, Loader2, Plus, Receipt, Sparkles, Trash2 } from 'lucide-react';

const DELETABLE_STATUSES = new Set(['draft_extracted', 'awaiting_intern_review']);

const EXPENSE_TYPES = [
  { value: 'software', label: 'Software' },
  { value: 'office_supplies', label: 'Office Supplies' },
  { value: 'travel', label: 'Travel' },
  { value: 'meals', label: 'Meals' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'other', label: 'Other' },
] as const;

const CURRENCIES = ['AUD', 'USD', 'PHP', 'EUR', 'GBP', 'SGD', 'JPY'] as const;

export default function EmployeeExpensesPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { capabilities } = useExpensesAccess();
  const [justification, setBusinessJustification] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [logRequestOpen, setLogRequestOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [expensePendingDelete, setExpensePendingDelete] = useState<ExpenseEntry | null>(null);

  // Manual request logging form state
  const [requestVendor, setRequestVendor] = useState('');
  const [requestDate, setRequestDate] = useState('');
  const [requestExpenseType, setRequestExpenseType] = useState<(typeof EXPENSE_TYPES)[number]['value']>('software');
  const [requestCurrency, setRequestCurrency] = useState<(typeof CURRENCIES)[number]>('AUD');
  const [requestTotalAmount, setRequestTotalAmount] = useState('');
  const [requestTaxAmount, setRequestTaxAmount] = useState('');
  const [requestJustification, setRequestJustification] = useState('');
  const isRequestOnlyView = !capabilities.canLogPayment;

  // Fetch only this user's submitted expenses (requests + any direct payments they made)
  const { data: rawData, isLoading, refetch } = useExpenses(
    user?.id
      ? {
          userId: user.id,
          sourceType: isRequestOnlyView ? 'staff_request' : undefined,
        }
      : undefined
  );

  const uploadMutation = useQueueExpenseIngestion();
  const logRequestMutation = useLogExpenseRequest();
  const deleteMutation = useDeleteExpense();
  const expenses = rawData?.data || [];

  const hasQueuedExpense = expenses.some((expense) => expense.processing_status === 'draft_extracted');

  useEffect(() => {
    if (!hasQueuedExpense) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refetch();
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [hasQueuedExpense, refetch]);

  const handleFileSelect = (files: File[]) => {
    setSelectedFiles((currentFiles) => {
      const mergedFiles = [...currentFiles];

      for (const file of files) {
        const isDuplicate = mergedFiles.some(
          (existingFile) =>
            existingFile.name === file.name &&
            existingFile.size === file.size &&
            existingFile.type === file.type &&
            existingFile.lastModified === file.lastModified
        );

        if (!isDuplicate && mergedFiles.length < 10) {
          mergedFiles.push(file);
        }
      }

      return mergedFiles.slice(0, 10);
    });
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
  };

  const handleUploadSubmit = async () => {
    if (selectedFiles.length === 0) {
      addToast({
        title: 'File Required',
        description: 'Please drag or select at least one receipt file to continue.',
        variant: 'error',
      });
      return;
    }

    const qualityFailures: Array<{ fileName: string; reason: string }> = [];
    const validatedFiles: File[] = [];

    for (const file of selectedFiles) {
      if (!file.type.startsWith('image/')) {
        validatedFiles.push(file);
        continue;
      }

      try {
        const qualityReport = await validateReceiptImageQuality(file);
        if (!qualityReport.isValid) {
          qualityFailures.push({
            fileName: file.name,
            reason: qualityReport.issues[0] || 'Image quality validation failed.',
          });
          continue;
        }

        validatedFiles.push(file);
      } catch {
        qualityFailures.push({
          fileName: file.name,
          reason: 'Image quality could not be evaluated. Please retry with a clearer image.',
        });
      }
    }

    if (qualityFailures.length > 0) {
      addToast({
        title: 'Pre-OCR Quality Check Failed',
        description: `${qualityFailures[0]?.fileName}: ${qualityFailures[0]?.reason}`,
        variant: 'error',
      });
    }

    if (validatedFiles.length === 0) {
      return;
    }

    uploadMutation.mutate(
      {
        files: validatedFiles,
        businessJustification: justification || undefined,
        concurrency: 3,
      },
      {
        onSuccess: (result) => {
          addToast({
            title: 'Receipt Ingestion Queued',
            description: `${result.summary.queued} of ${result.summary.total} file(s) queued for background OCR processing.${result.summary.failed > 0 ? ` ${result.summary.failed} file(s) failed.` : ''}`,
            variant: result.summary.failed > 0 ? 'warning' : 'success',
          });

          setUploadOpen(false);
          setSelectedFiles([]);
          setBusinessJustification('');
        },
        onError: (err: unknown) => {
          const message = err instanceof Error ? err.message : 'Failed to queue receipt ingestion.';
          addToast({
            title: 'Upload Failed',
            description: message,
            variant: 'error',
          });
        },
      }
    );
  };

  const handleDeleteClick = (expense: ExpenseEntry) => {
    setExpensePendingDelete(expense);
    setDeleteConfirmOpen(true);
  };

  const resetRequestForm = () => {
    setRequestVendor('');
    setRequestDate('');
    setRequestExpenseType('software');
    setRequestCurrency('AUD');
    setRequestTotalAmount('');
    setRequestTaxAmount('');
    setRequestJustification('');
  };

  const handleLogRequestSubmit = () => {
    if (!requestVendor.trim()) {
      addToast({ title: 'Validation Error', description: 'Vendor / service name is required.', variant: 'error' });
      return;
    }
    if (!requestDate) {
      addToast({ title: 'Validation Error', description: 'Transaction date is required.', variant: 'error' });
      return;
    }

    const amount = Number.parseFloat(requestTotalAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      addToast({ title: 'Validation Error', description: 'Total amount must be greater than 0.', variant: 'error' });
      return;
    }

    const tax = Number.parseFloat(requestTaxAmount);

    logRequestMutation.mutate(
      {
        vendorName: requestVendor.trim(),
        transactionDate: requestDate,
        expenseType: requestExpenseType,
        totalAmount: amount,
        taxAmount: Number.isFinite(tax) ? tax : 0,
        currency: requestCurrency,
        businessJustification: requestJustification || undefined,
      },
      {
        onSuccess: () => {
          addToast({
            title: 'Request Logged',
            description: `${requestVendor.trim()} spend request added to the matching queue.`,
            variant: 'success',
          });
          setLogRequestOpen(false);
          resetRequestForm();
        },
        onError: (err: unknown) => {
          const message = err instanceof Error ? err.message : 'Failed to log expense request.';
          addToast({ title: 'Log Failed', description: message, variant: 'error' });
        },
      }
    );
  };

  const handleDeleteConfirm = () => {
    if (!expensePendingDelete) {
      return;
    }

    const deletingExpense = expensePendingDelete;

    deleteMutation.mutate(deletingExpense.id, {
      onSuccess: () => {
        addToast({
          title: 'Expense Deleted',
          description: `${deletingExpense.vendor_name} has been removed from your expenses list.`,
          variant: 'success',
        });
        setDeleteConfirmOpen(false);
        setExpensePendingDelete(null);
      },
      onError: (err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to delete expense entry.';
        addToast({
          title: 'Delete Failed',
          description: message,
          variant: 'error',
        });
      },
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft_extracted':
        return <Badge variant="outline" className="flex items-center gap-1 w-fit border-zinc-300 text-zinc-600">Queued for OCR</Badge>;
      case 'awaiting_intern_review':
        return <Badge variant="secondary" className="flex items-center gap-1 w-fit bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400 border-none">Awaiting Review</Badge>;
      case 'auto_approved':
        return <Badge variant="success" className="flex items-center gap-1 w-fit bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-450 border-none">Auto-Approved</Badge>;
      case 'leadership_review_required':
        return <Badge variant="secondary" className="flex items-center gap-1 w-fit bg-amber-500/10 text-amber-600 border-none">In Review</Badge>;
      case 'approved':
        return <Badge variant="success" className="flex items-center gap-1 w-fit bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-450 border-none">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="flex items-center gap-1 w-fit border-none">Rejected</Badge>;
      default:
        return <Badge variant="outline" className="w-fit">{status}</Badge>;
    }
  };

  const getMatchStatusBadge = (matchStatus: ExpenseEntry['match_status']) => {
    switch (matchStatus) {
      case 'matched':
        return <Badge variant="success" className="w-fit bg-emerald-500/10 text-emerald-600 border-none">Matched</Badge>;
      case 'variance_flagged':
        return <Badge variant="destructive" className="w-fit border-none">Variance Flagged</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="w-fit border-zinc-300 text-zinc-600">Resolved</Badge>;
      default:
        return <Badge variant="outline" className="w-fit border-zinc-300 text-zinc-500">Unmatched</Badge>;
    }
  };

  const getExpenseTypeLabel = (type: ExpenseEntry['expense_type']) => {
    const mappedType = EXPENSE_TYPES.find((item) => item.value === type);
    return mappedType?.label ?? type;
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
    <div className="flex-1 space-y-6 p-8 overflow-y-auto max-h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Receipt className="h-6 w-6 text-indigo-500" />
            My Expenses & Payments
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Log spend requests to stay accountable, or record direct payments with receipt uploads for the matching queue.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={logRequestOpen} onOpenChange={setLogRequestOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 h-9 px-4">
                <ClipboardList className="h-4 w-4" />
                Log Request
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">Log a Spend Request</DialogTitle>
                <DialogDescription>
                  Track what you're asking for. Accounting will reconcile this against the actual payment once it's made.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="request-vendor">Vendor / Service</Label>
                  <Input
                    id="request-vendor"
                    value={requestVendor}
                    onChange={(e) => setRequestVendor(e.target.value)}
                    placeholder="e.g. OpenAI, Canva, Grab"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="request-date">Transaction Date</Label>
                    <Input id="request-date" type="date" value={requestDate} onChange={(e) => setRequestDate(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Category</Label>
                    <Select value={requestExpenseType} onValueChange={(value) => setRequestExpenseType(value as typeof requestExpenseType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label>Currency</Label>
                    <Select value={requestCurrency} onValueChange={(value) => setRequestCurrency(value as typeof requestCurrency)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((code) => (
                          <SelectItem key={code} value={code}>{code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="request-total">Total Amount</Label>
                    <Input
                      id="request-total"
                      type="number"
                      value={requestTotalAmount}
                      onChange={(e) => setRequestTotalAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="request-tax">Tax Amount</Label>
                    <Input
                      id="request-tax"
                      type="number"
                      value={requestTaxAmount}
                      onChange={(e) => setRequestTaxAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="request-justification">Notes (optional)</Label>
                  <Textarea
                    id="request-justification"
                    value={requestJustification}
                    onChange={(e) => setRequestJustification(e.target.value)}
                    placeholder="What is this spend for?"
                    className="min-h-[70px]"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setLogRequestOpen(false)} disabled={logRequestMutation.isPending}>
                  Cancel
                </Button>
                <Button
                  onClick={handleLogRequestSubmit}
                  disabled={logRequestMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {logRequestMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging...
                    </>
                  ) : (
                    'Log Request'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {capabilities.canLogPayment ? (
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
              <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 h-9 px-4">
                  <Plus className="h-4 w-4" />
                  Upload Receipt
                </Button>
              </DialogTrigger>
          <DialogContent className="!flex !max-h-[calc(100dvh-2rem)] !w-[calc(100vw-2rem)] !max-w-[500px] !flex-col !overflow-hidden !p-0">
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="shrink-0 px-6 pt-6">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-indigo-500 animate-pulse" />
                    Bulk Upload Receipt Queue
                  </DialogTitle>
                  <DialogDescription>
                    Upload up to 10 receipts per batch. Quality checks run in-browser first, then OCR extraction runs asynchronously in background workers.
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 pr-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Receipt Files</Label>
                    <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg p-2">
                      <FileDropZone
                        onFilesSelected={handleFileSelect}
                        selectedFiles={selectedFiles}
                        onRemoveFile={handleRemoveFile}
                        accept="application/pdf,image/jpeg,image/png,image/webp"
                        multiple
                        maxFiles={10}
                        maxSizeMB={10} // 10MB
                      />
                    </div>
                    {selectedFiles.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2 rounded-lg">
                        <FileText className="h-4 w-4 text-indigo-500" />
                        <span className="truncate flex-1 font-medium">{selectedFiles.length} file(s) selected</span>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="justification">Business Justification / Submitter Notes</Label>
                    <Textarea
                      id="justification"
                      placeholder="e.g. Monthly cloud subscription renewal, or client meeting dinner details."
                      value={justification}
                      onChange={(e) => setBusinessJustification(e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-t border-zinc-200/70 px-6 py-4 dark:border-zinc-800">
                <DialogFooter>
                  <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={uploadMutation.isPending}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUploadSubmit}
                    disabled={uploadMutation.isPending || selectedFiles.length === 0}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Queueing Batch...
                      </>
                    ) : (
                      'Queue for OCR'
                    )}
                  </Button>
                </DialogFooter>
              </div>
            </div>
          </DialogContent>
            </Dialog>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6">
        <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <CardTitle className="text-base font-bold text-zinc-900 dark:text-zinc-50">
              {isRequestOnlyView ? 'My Logged Requests' : 'Ingestion Ledger History'}
            </CardTitle>
            <CardDescription>
              {isRequestOnlyView
                ? 'Review all spend requests you have logged for accounting reconciliation.'
                : 'Track state transitions for direct payments and matching outcomes.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
              </div>
            ) : expenses.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                <Receipt className="h-12 w-12 text-zinc-300 dark:text-zinc-700" />
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {isRequestOnlyView ? 'No requests logged yet' : 'No expenses found'}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    {isRequestOnlyView
                      ? 'Use Log Request to add your first spend request.'
                      : 'Use Log Request or Upload Receipt to start tracking expenses.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-zinc-50 ddark:bg-zinc-900">
                    <TableRow className="border-b border-zinc-200 dark:border-zinc-800">
                      <TableHead className="font-semibold text-zinc-600 dark:text-zinc-400">Vendor</TableHead>
                      {isRequestOnlyView ? (
                        <TableHead className="font-semibold text-zinc-600 dark:text-zinc-400">Category</TableHead>
                      ) : (
                        <TableHead className="font-semibold text-zinc-600 dark:text-zinc-400">Type</TableHead>
                      )}
                      <TableHead className="font-semibold text-zinc-600 dark:text-zinc-400">Date</TableHead>
                      <TableHead className="font-semibold text-zinc-600 dark:text-zinc-400">Total Amount</TableHead>
                      <TableHead className="font-semibold text-zinc-600 dark:text-zinc-400">
                        {isRequestOnlyView ? 'Request Status' : 'Status'}
                      </TableHead>
                      <TableHead className="font-semibold text-zinc-600 dark:text-zinc-400">Match</TableHead>
                      <TableHead className="w-14 text-right font-semibold text-zinc-600 dark:text-zinc-400">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense.id} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/50">
                        <TableCell className="font-medium text-zinc-900 dark:text-zinc-50">
                          {expense.vendor_name}
                        </TableCell>
                        {isRequestOnlyView ? (
                          <TableCell>
                            <Badge variant="outline" className="w-fit border-zinc-300 text-zinc-600">
                              {getExpenseTypeLabel(expense.expense_type)}
                            </Badge>
                          </TableCell>
                        ) : (
                          <TableCell>
                            <Badge variant="outline" className="w-fit border-zinc-300 text-zinc-600 capitalize">
                              {expense.source_type === 'staff_request' ? 'Request' : 'Payment'}
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell className="text-zinc-500 dark:text-zinc-400">
                          {formatDate(expense.transaction_date)}
                        </TableCell>
                        <TableCell className="text-zinc-900 dark:text-zinc-50 font-semibold">
                          {expense.currency} {Number(expense.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(expense.processing_status)}
                        </TableCell>
                        <TableCell>
                          {getMatchStatusBadge(expense.match_status)}
                        </TableCell>
                        <TableCell className="text-right">
                          {DELETABLE_STATUSES.has(expense.processing_status) ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                              onClick={() => handleDeleteClick(expense)}
                              title="Delete expense"
                              aria-label={`Delete expense from ${expense.vendor_name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Expense Entry</DialogTitle>
            <DialogDescription>
              This will remove the expense{expensePendingDelete ? ` from ${expensePendingDelete.vendor_name}` : ''} from your list.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false);
                setExpensePendingDelete(null);
              }}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending || !expensePendingDelete}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

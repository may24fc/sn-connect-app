'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDeleteExpense, useExpenses, useQueueExpenseIngestion, type ExpenseEntry } from '@/hooks/useExpenses';
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
  Label,
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
import { FileText, Loader2, Plus, Receipt, Sparkles, Trash2 } from 'lucide-react';

const DELETABLE_STATUSES = new Set(['draft_extracted', 'awaiting_intern_review']);

export default function EmployeeExpensesPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [justification, setBusinessJustification] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [expensePendingDelete, setExpensePendingDelete] = useState<ExpenseEntry | null>(null);

  // Fetch only this user's submitted expenses
  const { data: rawData, isLoading, refetch } = useExpenses(
    user?.id ? { userId: user.id } : undefined
  );

  const uploadMutation = useQueueExpenseIngestion();
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
            My Expenses & Receipts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Submit receipt photos for automated AI extraction, ledger analysis, and speedy approval.
          </p>
        </div>

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
      </div>

      <div className="grid gap-6">
        <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <CardTitle className="text-base font-bold text-zinc-900 dark:text-zinc-50">Ingestion Ledger history</CardTitle>
            <CardDescription>Track state transitions from draft OCR, intern verification, to executive decisioning.</CardDescription>
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
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">No expenses found</h3>
                  <p className="text-xs text-zinc-500 mt-1">Upload a receipt photo to trigger the automated ledger flow.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-zinc-50 ddark:bg-zinc-900">
                    <TableRow className="border-b border-zinc-200 dark:border-zinc-800">
                      <TableHead className="font-semibold text-zinc-600 dark:text-zinc-400">Vendor</TableHead>
                      <TableHead className="font-semibold text-zinc-600 dark:text-zinc-400">Date</TableHead>
                      <TableHead className="font-semibold text-zinc-600 dark:text-zinc-400">Total Amount</TableHead>
                      <TableHead className="font-semibold text-zinc-600 dark:text-zinc-400">Accounts (DR/CR)</TableHead>
                      <TableHead className="font-semibold text-zinc-600 dark:text-zinc-400">Status</TableHead>
                      <TableHead className="font-semibold text-zinc-600 dark:text-zinc-400">Risk Assessment</TableHead>
                      <TableHead className="w-14 text-right font-semibold text-zinc-600 dark:text-zinc-400">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense.id} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/50">
                        <TableCell className="font-medium text-zinc-900 dark:text-zinc-50">
                          {expense.vendor_name}
                        </TableCell>
                        <TableCell className="text-zinc-500 dark:text-zinc-400">
                          {formatDate(expense.transaction_date)}
                        </TableCell>
                        <TableCell className="text-zinc-900 dark:text-zinc-50 font-semibold">
                          {expense.currency} {Number(expense.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-zinc-600 dark:text-zinc-400">
                          <div className="flex flex-col text-xs space-y-0.5">
                            <span className="truncate">
                              <span className="text-muted-foreground mr-1">DR:</span>
                              {expense.verified_debit_account || expense.draft_debit_account || expense.ai_debit_account || <span className="italic text-zinc-400">Extracting...</span>}
                            </span>
                            <span className="truncate">
                              <span className="text-muted-foreground mr-1">CR:</span>
                              {expense.verified_credit_account || expense.draft_credit_account || expense.ai_credit_account || <span className="italic text-zinc-400">Extracting...</span>}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(expense.processing_status)}
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
                            <span className="text-xs text-zinc-400 italic">Pending Verification</span>
                          )}
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

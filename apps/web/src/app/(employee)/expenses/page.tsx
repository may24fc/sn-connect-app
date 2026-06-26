'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useExpenses, useUploadAndExtractExpense } from '@/hooks/useExpenses';
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
import { FileText, Loader2, Plus, Receipt, Sparkles } from 'lucide-react';

export default function EmployeeExpensesPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [justification, setBusinessJustification] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  // Fetch only this user's submitted expenses
  const { data: rawData, isLoading } = useExpenses(
    user?.id ? { userId: user.id } : undefined
  );

  const uploadMutation = useUploadAndExtractExpense();
  const expenses = rawData?.data || [];

  const handleFileSelect = (files: File[]) => {
    if (files && files.length > 0) {
      setSelectedFile(files[0] as File);
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) {
      addToast({
        title: 'File Required',
        description: 'Please drag or select a receipt photo to continue.',
        variant: 'error',
      });
      return;
    }

    uploadMutation.mutate(
      {
        file: selectedFile,
        businessJustification: justification || undefined,
      } as any,
      {
        onSuccess: (res) => {
          addToast({
            title: 'OCR Ingestion Success',
            description: `Successfully extracted draft entry: ${res.data.expenseEntry.vendor_name} for total ${res.data.expenseEntry.currency} ${res.data.expenseEntry.total_amount}.`,
            variant: 'success',
          });
          setUploadOpen(false);
          setSelectedFile(null);
          setBusinessJustification('');
        },
        onError: (err: any) => {
          console.error(err);
          addToast({
            title: 'Extraction Failed',
            description: err?.message || 'Failed to extract text or upload. Please retry.',
            variant: 'error',
          });
        },
      }
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
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
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-500 animate-pulse" />
                Upload & AI-Extract Receipt
              </DialogTitle>
              <DialogDescription>
                Upload receipt image (JPEG, PNG, WebP) up to 10MB. Our AI model extracts transaction fields & maps ledger accounts instantly.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Receipt Image</Label>
                <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg p-2">
                  <FileDropZone
                    onFilesSelected={handleFileSelect}
                    accept="image/jpeg,image/png,image/webp"
                    maxSizeMB={10} // 10MB
                  />
                </div>
                {selectedFile && (
                  <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2 rounded-lg">
                    <FileText className="h-4 w-4 text-indigo-500" />
                    <span className="truncate flex-1 font-medium">{selectedFile.name}</span>
                    <span className="text-xs text-zinc-400">({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
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

            <DialogFooter>
              <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={uploadMutation.isPending}>
                Cancel
              </Button>
              <Button
                onClick={handleUploadSubmit}
                disabled={uploadMutation.isPending || !selectedFile}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Extracting Ledger...
                  </>
                ) : (
                  'Run AI Extract'
                )}
              </Button>
            </DialogFooter>
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
                              {expense.verified_debit_account || expense.draft_debit_account || <span className="italic text-zinc-400">Extracting...</span>}
                            </span>
                            <span className="truncate">
                              <span className="text-muted-foreground mr-1">CR:</span>
                              {expense.verified_credit_account || expense.draft_credit_account || <span className="italic text-zinc-400">Extracting...</span>}
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

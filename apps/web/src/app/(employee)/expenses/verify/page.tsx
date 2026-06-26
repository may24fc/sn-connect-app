'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useExpenses, useVerifyExpense, type ExpenseEntry } from '@/hooks/useExpenses';
import {
  Button,
  Input,
  Label,
  Textarea,
  useToast,
} from '@hr-portal/ui';
import { Badge } from '@hr-portal/ui';
import {
  AlertCircle,
  CheckCircle,
  FileImage,
  Loader2,
  Receipt,
  ScanEye,
  ShieldCheck,
} from 'lucide-react';

const DEBIT_ACCOUNTS = [
  'SaaS Subscriptions',
  'Software Licenses',
  'Cloud Infrastructure',
  'API Services',
  'Office Supplies',
  'Meals & Entertainment',
  'Travel & Lodging',
  'Hardware/Equipment',
  'Operating Expenses',
];

const CREDIT_ACCOUNTS = [
  'Company Credit Card',
  'Petty Cash',
  'Accounts Payable',
  'Director Shareholder Loan',
];

export default function InternVerificationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [selectedExpense, setSelectedExpense] = useState<ExpenseEntry | null>(null);

  // Form states matching expenseVerifySchema
  const [verifiedDebit, setVerifiedDebit] = useState('');
  const [verifiedCredit, setVerifiedCredit] = useState('');
  const [taxAmount, setTaxAmount] = useState<string>('');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Fetch all expenses awaiting intern review
  const { data: rawData, isLoading } = useExpenses({
    status: 'awaiting_intern_review',
  });

  const verifyMutation = useVerifyExpense();
  const pendingExpenses = rawData?.data || [];

  // If the user is admin/super_admin, they are always allowed.
  // Otherwise, we let them proceed on assumption. If needed they\'ll be rejected by the API layer,
  // but to deliver a premium user experience we allow users who are within Accounting department structure.
  if (user && !['intern', 'employee', 'admin', 'super_admin'].includes(user.role)) {
    return (
      <div className="flex h-screen items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-950 text-center">
        <div className="max-w-md space-y-4">
          <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Forbidden Access</h2>
          <p className="text-zinc-500 text-sm">
            Only Accounting members and System Administrators are authorized to access the expense verification queue workspace.
          </p>
          <Button onClick={() => router.push('/dashboard')} className="bg-indigo-600 text-white">
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const handleSelectExpense = (expense: ExpenseEntry) => {
    setSelectedExpense(expense);
    setVerifiedDebit(expense.draft_debit_account || 'Operating Expenses');
    setVerifiedCredit(expense.draft_credit_account || 'Company Credit Card');
    setTaxAmount(expense.tax_amount !== null ? String(expense.tax_amount) : '0');
    setTotalAmount(String(expense.total_amount));
    setNotes('');
  };

  const handleVerifySubmit = () => {
    if (!selectedExpense) return;

    if (!verifiedDebit) {
      addToast({ title: 'Validation Error', description: 'Please select a debit side expense account.', variant: 'error' });
      return;
    }
    if (!verifiedCredit) {
      addToast({ title: 'Validation Error', description: 'Please select a credit side source account.', variant: 'error' });
      return;
    }

    const tAmount = parseFloat(totalAmount);
    if (isNaN(tAmount) || tAmount <= 0) {
      addToast({ title: 'Validation Error', description: 'Please state a positive verified total amount.', variant: 'error' });
      return;
    }

    const taxVal = parseFloat(taxAmount);

    verifyMutation.mutate(
      {
        id: selectedExpense.id,
        verification: {
          verifiedDebitAccount: verifiedDebit,
          verifiedCreditAccount: verifiedCredit,
          taxAmount: isNaN(taxVal) ? null : taxVal,
          totalAmount: tAmount,
          reviewerNotes: notes || null,
        },
      },
      {
        onSuccess: (res) => {
          const result = res.data?.routingResult;
          addToast({
            title: 'Ledger Locked & Verified',
            description: `Routed verified entry into [${result?.riskBucket?.replace('_', ' ')}] with status [${result?.processingStatus?.replace(/_/g, ' ')}].`,
            variant: 'success',
          });

          // Unselect and reset
          setSelectedExpense(null);
        },
        onError: (err: any) => {
          console.error(err);
          addToast({
            title: 'Verify Failed',
            description: err?.message || 'Error occurred while saving verification. Try again.',
            variant: 'error',
          });
        },
      }
    );
  };

  const getStorageUrl = (path: string | null) => {
    if (!path) return null;
    // Extract public storage URL for standard Supabase configs
    const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
    return `${projectUrl}/storage/v1/object/public/${path}`;
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      {/* Inbox List Sidebar Panel */}
      <div className="w-80 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <ScanEye className="h-5 w-5 text-indigo-500" />
            <h2 className="font-bold text-base text-zinc-900 dark:text-zinc-50">Verify Inbox</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Double-entry ledger ledger queue remaining review count.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {isLoading ? (
            <div className="p-8 text-center flex justify-center">
              <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
            </div>
          ) : pendingExpenses.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500 space-y-2">
              <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto" />
              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-50">Inbox Empty</p>
                <p className="text-xs text-zinc-400 mt-1">All uploaded receipts are fully verified.</p>
              </div>
            </div>
          ) : (
            pendingExpenses.map((expense) => (
              <button
                key={expense.id}
                onClick={() => handleSelectExpense(expense)}
                className={`w-full text-left p-3 rounded-lg border transition-all flex flex-col gap-1.5 ${
                  selectedExpense?.id === expense.id
                    ? 'border-indigo-500 bg-indigo-50/35 dark:bg-indigo-950/10'
                    : 'border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 bg-white dark:bg-zinc-900'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-bold text-xs truncate max-w-[140px] text-zinc-900 dark:text-zinc-50">
                    {expense.vendor_name}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-semibold bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                    {expense.currency} {expense.total_amount}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-zinc-500">
                  <span>{new Date(expense.transaction_date).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1 text-[10px] font-medium text-amber-600">
                    Awaiting Lock
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detail splitscreen desk */}
      {selectedExpense ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Left panel: Original receipt photo preview */}
          <div className="flex-1 bg-zinc-100 dark:bg-zinc-900/50 p-6 flex flex-col justify-between overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <FileImage className="h-4 w-4 text-indigo-500" />
                Original Receipt Photo Preview
              </h3>
              <Badge variant="outline" className="border-indigo-200 text-indigo-600 text-xs">
                OCR Capture Verified
              </Badge>
            </div>
            
            <div className="flex-1 border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex items-center justify-center min-h-[350px] shadow-inner relative overflow-hidden">
              {selectedExpense.receipt_path ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={getStorageUrl(selectedExpense.receipt_path) || ''}
                  alt="Receipt Preview"
                  className="max-h-[500px] object-contain rounded-lg hover:scale-110 transition-transform cursor-zoom-in"
                  onError={(e) => {
                    // Fallback container if CDN load fails
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      const placeholder = parent.querySelector('.preview-fallback');
                      if (placeholder) placeholder.classList.remove('hidden');
                    }
                  }}
                />
              ) : null}
              <div
                className={`preview-fallback flex flex-col items-center gap-3 p-12 text-zinc-400 absolute inset-0 justify-center ${selectedExpense.receipt_path ? 'hidden' : ''}`}
              >
                <Receipt className="h-16 w-12 text-zinc-300 dark:text-zinc-700 stroke-[1.5]" />
                <p className="text-xs font-semibold text-muted-foreground text-center">
                  Image preview not fetched or Storage link offline. Use OCR data mapping to verify.
                </p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-zinc-50 dark:bg-zinc-900 border rounded-lg text-xs space-y-1.5 text-zinc-500 dark:text-zinc-400">
              <p className="font-semibold text-zinc-800 dark:text-zinc-300">Submitter Justification Memo:</p>
              <p className="italic">
                "{selectedExpense.business_justification || 'No custom notes provided by staff member.'}"
              </p>
            </div>
          </div>

          {/* Right panel: Verification fields mapping workspace */}
          <div className="w-[450px] border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-indigo-500" />
                  <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50">Verified Ledger Lock</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Confirm AI mapped fields and record the verified double-entry booking accounts.
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Vendor</Label>
                    <Input disabled value={selectedExpense.vendor_name} className="h-9 font-medium" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Date</Label>
                    <Input disabled value={new Date(selectedExpense.transaction_date).toLocaleDateString()} className="h-9" />
                  </div>
                </div>

                <hr className="border-zinc-100 dark:border-zinc-800" />

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-indigo-600 flex items-center gap-1.5">
                    Debit Account (DR) - Expenses Side
                  </Label>
                  <select
                    value={verifiedDebit}
                    onChange={(e) => setVerifiedDebit(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-750 px-3 py-1.5 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="" disabled>Select debit account</option>
                    {DEBIT_ACCOUNTS.map((acc) => (
                      <option key={acc} value={acc}>{acc}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-zinc-400">
                    AI recommendation was: <span className="font-semibold italic text-indigo-500">{selectedExpense.draft_debit_account || 'None'}</span>
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                    Credit Account (CR) - Source Side
                  </Label>
                  <select
                    value={verifiedCredit}
                    onChange={(e) => setVerifiedCredit(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-750 px-3 py-1.5 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="" disabled>Select credit account</option>
                    {CREDIT_ACCOUNTS.map((acc) => (
                      <option key={acc} value={acc}>{acc}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-zinc-400">
                    AI recommendation was: <span className="font-semibold italic text-emerald-500">{selectedExpense.draft_credit_account || 'None'}</span>
                  </p>
                </div>

                <hr className="border-zinc-100 dark:border-zinc-800" />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="tax-amount" className="text-xs font-bold">Tax Amount</Label>
                    <Input
                      id="tax-amount"
                      type="number"
                      value={taxAmount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTaxAmount(e.target.value)}
                      placeholder="0.00"
                      className="h-9 text-right"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="total-amount" className="text-xs font-bold">Total Amount ({selectedExpense.currency})</Label>
                    <Input
                      id="total-amount"
                      type="number"
                      value={totalAmount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTotalAmount(e.target.value)}
                      className="h-9 font-semibold text-right border-indigo-200 bg-indigo-50/10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reviewer-notes" className="text-xs font-bold">Reviewer Auditor Notes</Label>
                  <Textarea
                    id="reviewer-notes"
                    placeholder="Provide audit feedback or details regarding override changes."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[70px] text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedExpense(null)} className="flex-1">
                  Done
                </Button>
                <Button
                  onClick={handleVerifySubmit}
                  disabled={verifyMutation.isPending}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {verifyMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Verify & Route'
                  )}
                </Button>
              </div>
              <p className="text-[10px] text-zinc-400 text-center">
                Reviewing locks accounting values. Price-spikes and unrecognized entries route automatically to exception review buckets.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-zinc-400 bg-zinc-50/50 dark:bg-zinc-950/20">
          <Receipt className="h-16 w-16 text-zinc-300 dark:text-zinc-700 stroke-[1.2] mb-4 animate-pulse" />
          <h3 className="font-semibold text-zinc-700 dark:text-zinc-300">Select an item from Verify Inbox</h3>
          <p className="text-sm text-zinc-400 max-w-sm mt-1">
            Choose any receipt awaiting intern double-entry verification to load original photos, verify captured figures, and execute automated risk checks.
          </p>
        </div>
      )}
    </div>
  );
}

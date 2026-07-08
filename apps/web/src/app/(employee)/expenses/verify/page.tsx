'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useExpensesAccess } from '@/hooks/useExpensesAccess';
import { useExpenses, useMatchExpense, type ExpenseEntry } from '@/hooks/useExpenses';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  useToast,
} from '@hr-portal/ui';
import { AlertCircle, ArrowLeftRight, CheckCircle2, FileImage, Loader2, Scale, ScanEye } from 'lucide-react';

function formatMoney(currency: string, amount: number): string {
  return `${currency} ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function ExpenseMatchingQueuePage() {
  const router = useRouter();
  const { capabilities, isLoading: isAccessLoading } = useExpensesAccess();
  const { addToast } = useToast();

  const [selectedRequest, setSelectedRequest] = useState<ExpenseEntry | null>(null);
  const [selectedCounterpartId, setSelectedCounterpartId] = useState<string>('');
  const [matchStatus, setMatchStatus] = useState<'matched' | 'variance_flagged' | 'resolved'>('matched');
  const [matchedNotes, setMatchedNotes] = useState('');

  const { data: requestsData, isLoading: isLoadingRequests } = useExpenses({
    sourceType: 'staff_request',
    matchStatus: 'unmatched',
  });
  const { data: paymentsData, isLoading: isLoadingPayments } = useExpenses({
    sourceType: 'direct_payment',
    matchStatus: 'unmatched',
  });

  const matchMutation = useMatchExpense();

  const unmatchedRequests = requestsData?.data || [];
  const unmatchedPayments = paymentsData?.data || [];

  const suggestedCounterparts = useMemo(() => {
    if (!selectedRequest) return unmatchedPayments;

    // Rank same-vendor payments first, then everything else, to speed up reconciliation.
    return [...unmatchedPayments].sort((a, b) => {
      const aMatchesVendor = a.vendor_name.trim().toLowerCase() === selectedRequest.vendor_name.trim().toLowerCase();
      const bMatchesVendor = b.vendor_name.trim().toLowerCase() === selectedRequest.vendor_name.trim().toLowerCase();
      if (aMatchesVendor === bMatchesVendor) return 0;
      return aMatchesVendor ? -1 : 1;
    });
  }, [selectedRequest, unmatchedPayments]);

  const selectedCounterpart = useMemo(
    () => suggestedCounterparts.find((payment) => payment.id === selectedCounterpartId) ?? null,
    [suggestedCounterparts, selectedCounterpartId]
  );

  const computedVariance = useMemo(() => {
    if (!selectedRequest || !selectedCounterpart) {
      return null;
    }

    const requestAud = selectedRequest.total_amount_aud;
    const paymentAud = selectedCounterpart.total_amount_aud;

    if (typeof requestAud === 'number' && typeof paymentAud === 'number') {
      return {
        amount: Math.abs(requestAud - paymentAud),
        currency: 'AUD',
      };
    }

    if (selectedRequest.currency === selectedCounterpart.currency) {
      return {
        amount: Math.abs(selectedRequest.total_amount - selectedCounterpart.total_amount),
        currency: selectedRequest.currency,
      };
    }

    return null;
  }, [selectedRequest, selectedCounterpart]);

  if (isAccessLoading) {
    return (
      <div className="flex h-screen items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-950 text-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!capabilities.canMatch) {
    return (
      <div className="flex h-screen items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-950 text-center">
        <div className="max-w-md space-y-4">
          <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Forbidden Access</h2>
          <p className="text-zinc-500 text-sm">
            Only Accounting staff and System Administrators can access the expense matching queue.
          </p>
          <Button onClick={() => router.push('/dashboard')} className="bg-indigo-600 text-white">
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const handleSelectRequest = (request: ExpenseEntry) => {
    setSelectedRequest(request);
    setSelectedCounterpartId('');
    setMatchStatus('matched');
    setMatchedNotes('');
  };

  const handleSubmitMatch = () => {
    if (!selectedRequest || !selectedCounterpartId) {
      addToast({ title: 'Validation Error', description: 'Select a payment entry to match against.', variant: 'error' });
      return;
    }

    matchMutation.mutate(
      {
        id: selectedRequest.id,
        match: {
          counterpartEntryId: selectedCounterpartId,
          matchStatus,
          matchedNotes: matchedNotes || undefined,
        },
      },
      {
        onSuccess: (res) => {
          addToast({
            title: 'Match Recorded',
            description: `Reconciled with variance of ${Number(res.data?.varianceAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}.`,
            variant: 'success',
          });
          setSelectedRequest(null);
          setSelectedCounterpartId('');
          setMatchedNotes('');
        },
        onError: (err: unknown) => {
          const message = err instanceof Error ? err.message : 'Failed to reconcile match.';
          addToast({ title: 'Match Failed', description: message, variant: 'error' });
        },
      }
    );
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      {/* Left: unmatched requests inbox */}
      <div className="w-80 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <ScanEye className="h-5 w-5 text-indigo-500" />
            <h2 className="font-bold text-base text-zinc-900 dark:text-zinc-50">Unmatched Requests</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Reconcile staff spend requests against admin/marketing direct payments.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {isLoadingRequests ? (
            <div className="p-8 text-center flex justify-center">
              <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
            </div>
          ) : unmatchedRequests.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500 space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-50">Queue Empty</p>
                <p className="text-xs text-zinc-400 mt-1">All logged requests are reconciled.</p>
              </div>
            </div>
          ) : (
            unmatchedRequests.map((request) => (
              <button
                key={request.id}
                onClick={() => handleSelectRequest(request)}
                className={`w-full text-left p-3 rounded-lg border transition-all flex flex-col gap-1.5 ${
                  selectedRequest?.id === request.id
                    ? 'border-indigo-500 bg-indigo-50/35 dark:bg-indigo-950/10'
                    : 'border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 bg-white dark:bg-zinc-900'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-bold text-xs truncate max-w-[140px] text-zinc-900 dark:text-zinc-50">
                    {request.vendor_name}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-semibold bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                    {formatMoney(request.currency, request.total_amount)}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-zinc-500">
                  <span>{formatDate(request.transaction_date)}</span>
                  <span className="text-amber-600 font-medium">Awaiting Match</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right: reconciliation workspace */}
      {selectedRequest ? (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-indigo-500" />
            <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50">Reconcile Request</h3>
          </div>

          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-2">
            <p className="text-xs font-bold text-zinc-500">SPEND REQUEST</p>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">{selectedRequest.vendor_name}</span>
              <span className="font-bold">{formatMoney(selectedRequest.currency, selectedRequest.total_amount)}</span>
            </div>
            <p className="text-xs text-zinc-500">{formatDate(selectedRequest.transaction_date)}</p>
            {selectedRequest.business_justification ? (
              <p className="text-xs italic text-zinc-500">"{selectedRequest.business_justification}"</p>
            ) : null}
          </div>

          <div className="flex items-center justify-center text-zinc-300 dark:text-zinc-700">
            <ArrowLeftRight className="h-5 w-5" />
          </div>

          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_440px]">
              <div className="space-y-3">
                <p className="text-xs font-bold text-zinc-500">MATCH AGAINST PAYMENT</p>

                {isLoadingPayments ? (
                  <div className="p-6 flex justify-center">
                    <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />
                  </div>
                ) : suggestedCounterparts.length === 0 ? (
                  <p className="text-sm text-zinc-500">No unmatched direct payments logged yet.</p>
                ) : (
                  <Select value={selectedCounterpartId} onValueChange={setSelectedCounterpartId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a payment entry" />
                    </SelectTrigger>
                    <SelectContent>
                      {suggestedCounterparts.map((payment) => (
                        <SelectItem key={payment.id} value={payment.id}>
                          {payment.vendor_name} — {formatMoney(payment.currency, payment.total_amount)} ({formatDate(payment.transaction_date)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Variance</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {computedVariance
                      ? formatMoney(computedVariance.currency, computedVariance.amount)
                      : selectedCounterpart
                        ? 'Select compatible currencies or ensure AUD totals are available'
                        : 'Select a payment to compute variance'}
                  </p>
                </div>

                <div className="grid gap-2">
                  <p className="text-xs font-bold text-zinc-500">RESULT</p>
                  <Select value={matchStatus} onValueChange={(value) => setMatchStatus(value as typeof matchStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="matched">Matched (amounts align)</SelectItem>
                      <SelectItem value="variance_flagged">Variance Flagged (escalate to leadership)</SelectItem>
                      <SelectItem value="resolved">Resolved (manually reconciled)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Textarea
                  placeholder="Reconciliation notes (optional)"
                  value={matchedNotes}
                  onChange={(e) => setMatchedNotes(e.target.value)}
                  className="min-h-[70px] text-xs"
                />

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setSelectedRequest(null)} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitMatch}
                    disabled={matchMutation.isPending || !selectedCounterpartId}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {matchMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Confirm Match'
                    )}
                  </Button>
                </div>
              </div>

              <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/30 p-3 flex flex-col">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 mb-2">Receipt Preview</p>

                {selectedCounterpart?.receipt_preview_url ? (
                  <div className="overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    {selectedCounterpart.receipt_mime_type?.includes('pdf') ? (
                      <iframe
                        src={selectedCounterpart.receipt_preview_url}
                        title="Selected receipt preview"
                        className="h-[540px] w-full"
                      />
                    ) : (
                      <img
                        src={selectedCounterpart.receipt_preview_url}
                        alt={`Receipt preview for ${selectedCounterpart.vendor_name}`}
                        className="h-[540px] w-full object-contain bg-zinc-50 dark:bg-zinc-950"
                      />
                    )}
                  </div>
                ) : (
                  <div className="h-[540px] rounded-md border border-dashed border-zinc-300 dark:border-zinc-700 flex flex-col items-center justify-center text-center px-4 bg-white/80 dark:bg-zinc-900/50">
                    <FileImage className="h-8 w-8 text-zinc-400 mb-2" />
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {selectedCounterpart ? 'No preview available for this payment' : 'No payment selected'}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Select a payment entry to inspect the receipt while reconciling.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-zinc-400 bg-zinc-50/50 dark:bg-zinc-950/20">
          <Scale className="h-16 w-16 text-zinc-300 dark:text-zinc-700 stroke-[1.2] mb-4" />
          <h3 className="font-semibold text-zinc-700 dark:text-zinc-300">Select a request to reconcile</h3>
          <p className="text-sm text-zinc-400 max-w-sm mt-1">
            Choose an unmatched spend request, then link it to the direct payment that settled it.
          </p>
        </div>
      )}
    </div>
  );
}


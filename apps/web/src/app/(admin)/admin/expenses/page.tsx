'use client';

import { useState } from 'react';
import { useExpenses, useLeadershipDecision } from '@/hooks/useExpenses';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
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
  FileCheck2,
  FileX2,
  History,
  Info,
  Loader2,
  Sparkles,
} from 'lucide-react';

export default function AdminExpensesDashboard() {
  const { addToast } = useToast();
  const [decisionNotes, setDecisionNotes] = useState<{ [key: string]: string }>({});

  // Fetch items awaiting leadership approval
  const { data: rawExceptions, isLoading: loadingExceptions } = useExpenses({
    status: 'leadership_review_required',
  });

  // Fetch settled items (auto_approved, approved, rejected)
  const { data: rawSettled, isLoading: loadingSettled } = useExpenses({
    status: 'auto_approved,approved,rejected',
  });

  const decideMutation = useLeadershipDecision();

  const exceptions = rawExceptions?.data || [];
  const settled = rawSettled?.data || [];

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-indigo-500" />
          Executive Expense Desk
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review escalated price spikes (yellow flags) and non-recurring transactions (red flags) verified by the interns.
        </p>
      </div>

      <Tabs defaultValue="exceptions" className="space-y-6">
        <TabsList className="bg-zinc-100 dark:bg-zinc-900 border p-1 rounded-lg">
          <TabsTrigger value="exceptions" className="rounded px-4 py-2 text-sm font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Exceptions Review Desk ({exceptions.length})
          </TabsTrigger>
          <TabsTrigger value="settled" className="rounded px-4 py-2 text-sm font-semibold flex items-center gap-2">
            <History className="h-4 w-4" />
            Settled Ledger & History ({settled.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="exceptions" className="space-y-4 outline-none">
          {loadingExceptions ? (
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
                const isRed = expense.risk_bucket === 'non_recurring';
                return (
                  <Card
                    key={expense.id}
                    className={`border transition-all shadow-sm flex flex-col justify-between ${
                      isRed
                        ? 'border-rose-200 dark:border-rose-950/50 bg-rose-50/15'
                        : 'border-amber-200 dark:border-amber-950/50 bg-amber-50/10'
                    }`}
                  >
                    <CardHeader className="pb-3 border-b border-zinc-100/80 dark:border-zinc-800">
                      <div className="flex justify-between items-start">
                        <div>
                          <Badge
                            className={`mb-2 capitalize px-2 py-0.5 border-none ${
                              isRed
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                : 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                            }`}
                          >
                            {isRed ? 'New Vendor (Red Flag)' : 'Price Spike (Yellow Flag)'}
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
                      {/* Submissions & Booking detail blocks */}
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1">
                          <p className="font-bold text-zinc-500">MAPPED BOOKING ACCOUNTS:</p>
                          <div className="bg-white/80 dark:bg-zinc-900 rounded p-2 border border-zinc-100 dark:border-zinc-800 font-medium">
                            <p className="truncate"><span className="text-muted-foreground mr-1">DR:</span>{expense.verified_debit_account}</p>
                            <p className="truncate"><span className="text-muted-foreground mr-1">CR:</span>{expense.verified_credit_account}</p>
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
                          <p className="font-bold text-zinc-700 dark:text-zinc-400">Intern Auditor Review Notes:</p>
                          <p className="italic text-zinc-500 dark:text-zinc-400 mt-0.5">
                            "{expense.reviewer_notes || 'Confirmed OCR data and accounts matched without custom correction remarks.'}"
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
          {loadingSettled ? (
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
                            <p><span className="text-zinc-400 mr-1 font-bold">DR:</span>{expense.verified_debit_account || expense.draft_debit_account}</p>
                            <p><span className="text-zinc-400 mr-1 font-bold">CR:</span>{expense.verified_credit_account || expense.draft_credit_account}</p>
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

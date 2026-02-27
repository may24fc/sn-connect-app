'use client';

import { useCreateInvoice, useInvoices, useSubmitInvoice } from '@/hooks/useInvoices';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
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
import { type FormEvent, useMemo, useState } from 'react';

const statusVariant: Record<
  'draft' | 'submitted' | 'approved' | 'paid' | 'rejected',
  'secondary' | 'pending' | 'approved' | 'error'
> = {
  draft: 'secondary',
  submitted: 'pending',
  approved: 'approved',
  paid: 'approved',
  rejected: 'error',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(value || 0);

export default function InvoicePage() {
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [grossAmount, setGrossAmount] = useState('0');
  const [deductions, setDeductions] = useState('0');
  const [notes, setNotes] = useState('');

  const { data, isLoading, error } = useInvoices({ page: 1, pageSize: 100 });
  const createInvoice = useCreateInvoice();
  const submitInvoice = useSubmitInvoice();

  const invoices = data?.data || [];

  const stats = useMemo(() => {
    const approved = invoices.filter((invoice) => ['approved', 'paid'].includes(invoice.status));

    return {
      total: invoices.length,
      pending: invoices.filter((invoice) => invoice.status === 'submitted').length,
      approved: approved.length,
      totalApprovedAmount: approved.reduce(
        (sum, invoice) => sum + Number(invoice.net_amount || 0),
        0
      ),
    };
  }, [invoices]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const gross = Number(grossAmount || 0);
    const deductionValue = Number(deductions || 0);
    const net = gross - deductionValue;

    try {
      await createInvoice.mutateAsync({
        invoiceNumber,
        periodStart,
        periodEnd,
        grossAmount: gross,
        deductions: deductionValue,
        netAmount: net,
        status: 'draft',
        notes: notes || undefined,
        lineItems: [],
        sourceCurrency: 'PHP',
        targetCurrency: 'PHP',
      });

      addToast({
        title: 'Invoice created',
        description: `Invoice ${invoiceNumber} has been saved as draft`,
        variant: 'success',
      });

      setOpen(false);
      setInvoiceNumber('');
      setPeriodStart('');
      setPeriodEnd('');
      setGrossAmount('0');
      setDeductions('0');
      setNotes('');
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to create invoice',
        variant: 'error',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline">Invoice</h1>
          <p className="text-muted-foreground">Submit and monitor your invoices</p>
        </div>
        <Button onClick={() => setOpen(true)}>Create Invoice</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Approved/Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.approved}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{formatCurrency(stats.totalApprovedAmount)}</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Loading invoices...
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-sm text-error">Failed to load invoices.</CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>Net</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No invoices yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>
                        {invoice.period_start} to {invoice.period_end}
                      </TableCell>
                      <TableCell>{formatCurrency(Number(invoice.gross_amount || 0))}</TableCell>
                      <TableCell>{formatCurrency(Number(invoice.net_amount || 0))}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[invoice.status]}>{invoice.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {invoice.status === 'draft' && (
                          <Button
                            size="sm"
                            onClick={() =>
                              submitInvoice.mutate(invoice.id, {
                                onSuccess: () => {
                                  addToast({
                                    title: 'Invoice submitted',
                                    description: `Invoice ${invoice.invoice_number} has been submitted for approval`,
                                    variant: 'success',
                                  });
                                },
                                onError: () => {
                                  addToast({
                                    title: 'Error',
                                    description: 'Failed to submit invoice',
                                    variant: 'error',
                                  });
                                },
                              })
                            }
                            disabled={submitInvoice.isPending}
                          >
                            Submit
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreate}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Invoice Number</Label>
                <Input
                  value={invoiceNumber}
                  onChange={(event) => setInvoiceNumber(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Gross Amount</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={grossAmount}
                  onChange={(event) => setGrossAmount(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Period Start</Label>
                <Input
                  type="date"
                  value={periodStart}
                  onChange={(event) => setPeriodStart(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Period End</Label>
                <Input
                  type="date"
                  value={periodEnd}
                  onChange={(event) => setPeriodEnd(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Deductions</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={deductions}
                  onChange={(event) => setDeductions(event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createInvoice.isPending}>
                Save Draft
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

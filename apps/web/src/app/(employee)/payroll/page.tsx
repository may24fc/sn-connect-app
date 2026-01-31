'use client';

import { useState, type ReactNode, type FormEvent } from 'react';
import {
  Upload,
  FileText,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Eye,
  Download,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Input,
  Label,
  Textarea,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@hr-portal/ui';

type InvoiceStatus = 'approved' | 'pending' | 'rejected';

interface Invoice {
  id: string;
  invoiceNumber: string;
  period: string;
  amount: number;
  status: InvoiceStatus;
  submittedAt: string;
  reviewedAt?: string;
  notes?: string;
}

// Mock data
const invoices: Invoice[] = [
  {
    id: '1',
    invoiceNumber: 'INV-2024-001',
    period: 'January 1-15, 2024',
    amount: 25000,
    status: 'approved',
    submittedAt: '2024-01-16',
    reviewedAt: '2024-01-17',
  },
  {
    id: '2',
    invoiceNumber: 'INV-2024-002',
    period: 'January 16-31, 2024',
    amount: 25000,
    status: 'pending',
    submittedAt: '2024-01-31',
  },
  {
    id: '3',
    invoiceNumber: 'INV-2023-024',
    period: 'December 16-31, 2023',
    amount: 25000,
    status: 'approved',
    submittedAt: '2024-01-02',
    reviewedAt: '2024-01-03',
  },
  {
    id: '4',
    invoiceNumber: 'INV-2023-023',
    period: 'December 1-15, 2023',
    amount: 22500,
    status: 'rejected',
    submittedAt: '2023-12-16',
    reviewedAt: '2023-12-17',
    notes: 'Missing supporting documents. Please resubmit.',
  },
];

const statusConfig: Record<
  InvoiceStatus,
  { label: string; variant: 'approved' | 'pending' | 'error' }
> = {
  approved: { label: 'Approved', variant: 'approved' },
  pending: { label: 'Pending', variant: 'pending' },
  rejected: { label: 'Rejected', variant: 'error' },
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
};

export default function PayrollPage(): ReactNode {
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [formData, setFormData] = useState({
    period: '',
    amount: '',
    notes: '',
  });

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault();
    // TODO: Implement actual submission logic
    setSubmitDialogOpen(false);
    setFormData({ period: '', amount: '', notes: '' });
  };

  const stats = {
    total: invoices.length,
    approved: invoices.filter((i) => i.status === 'approved').length,
    pending: invoices.filter((i) => i.status === 'pending').length,
    totalAmount: invoices
      .filter((i) => i.status === 'approved')
      .reduce((sum, i) => sum + i.amount, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payroll</h1>
          <p className="text-muted-foreground">
            Submit and track your invoice submissions
          </p>
        </div>
        <Button onClick={() => setSubmitDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Submit Invoice
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Invoices</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">{stats.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Approved</p>
                <p className="text-xl font-bold">
                  {formatCurrency(stats.totalAmount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice History */}
      <Card>
        <CardHeader>
          <CardTitle>Submission History</CardTitle>
          <CardDescription>
            View your past invoice submissions and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => {
                const config = statusConfig[invoice.status];
                return (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.invoiceNumber}
                    </TableCell>
                    <TableCell>{invoice.period}</TableCell>
                    <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                    <TableCell>
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </TableCell>
                    <TableCell>{invoice.submittedAt}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedInvoice(invoice)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Submit Invoice Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit Invoice</DialogTitle>
            <DialogDescription>
              Upload your invoice for the selected pay period
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="period">Pay Period</Label>
              <Select
                value={formData.period}
                onValueChange={(value) =>
                  setFormData({ ...formData, period: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select pay period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jan-1-15">January 1-15, 2024</SelectItem>
                  <SelectItem value="jan-16-31">January 16-31, 2024</SelectItem>
                  <SelectItem value="feb-1-15">February 1-15, 2024</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Invoice Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Invoice Document</Label>
              <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
                <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">
                  Drag and drop your invoice
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF or image (max 10MB)
                </p>
                <Button type="button" variant="outline" size="sm" className="mt-3">
                  Choose File
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional notes..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSubmitDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Submit Invoice</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog
        open={selectedInvoice !== null}
        onOpenChange={() => setSelectedInvoice(null)}
      >
        {selectedInvoice && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedInvoice.invoiceNumber}</DialogTitle>
              <DialogDescription>Invoice Details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Period</p>
                  <p className="font-medium">{selectedInvoice.period}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-medium">
                    {formatCurrency(selectedInvoice.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={statusConfig[selectedInvoice.status].variant}>
                    {statusConfig[selectedInvoice.status].label}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Submitted</p>
                  <p className="font-medium">{selectedInvoice.submittedAt}</p>
                </div>
              </div>
              {selectedInvoice.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Reviewer Notes</p>
                  <p className="text-sm mt-1 p-3 bg-muted rounded-lg">
                    {selectedInvoice.notes}
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedInvoice(null)}>
                Close
              </Button>
              <Button>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

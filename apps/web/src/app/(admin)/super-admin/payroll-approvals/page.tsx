'use client';

import { useState, type ReactNode } from 'react';
import {
  FileCheck,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Download,
  DollarSign,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Avatar,
  AvatarFallback,
  AvatarImage,
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
  Textarea,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@hr-portal/ui';

type InvoiceStatus = 'pending' | 'approved' | 'rejected';

interface Invoice {
  id: string;
  invoiceNumber: string;
  employeeName: string;
  employeeEmail: string;
  employeeAvatar?: string;
  department: string;
  period: string;
  amount: number;
  status: InvoiceStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  notes?: string;
}

// Mock data
const invoices: Invoice[] = [
  {
    id: '1',
    invoiceNumber: 'INV-2024-001',
    employeeName: 'John Doe',
    employeeEmail: 'john.doe@company.com',
    department: 'Engineering',
    period: 'January 1-15, 2024',
    amount: 25000,
    status: 'pending',
    submittedAt: '2024-01-16',
  },
  {
    id: '2',
    invoiceNumber: 'INV-2024-002',
    employeeName: 'Jane Smith',
    employeeEmail: 'jane.smith@company.com',
    department: 'Marketing',
    period: 'January 1-15, 2024',
    amount: 22000,
    status: 'pending',
    submittedAt: '2024-01-16',
  },
  {
    id: '3',
    invoiceNumber: 'INV-2024-003',
    employeeName: 'Alex Johnson',
    employeeEmail: 'alex.johnson@company.com',
    department: 'Finance',
    period: 'January 1-15, 2024',
    amount: 28000,
    status: 'pending',
    submittedAt: '2024-01-15',
  },
  {
    id: '4',
    invoiceNumber: 'INV-2023-050',
    employeeName: 'Maria Garcia',
    employeeEmail: 'maria.garcia@company.com',
    department: 'HR',
    period: 'December 16-31, 2023',
    amount: 24000,
    status: 'approved',
    submittedAt: '2024-01-02',
    reviewedAt: '2024-01-03',
    reviewedBy: 'COS Manager',
  },
  {
    id: '5',
    invoiceNumber: 'INV-2023-049',
    employeeName: 'Robert Lee',
    employeeEmail: 'robert.lee@company.com',
    department: 'Engineering',
    period: 'December 16-31, 2023',
    amount: 25000,
    status: 'rejected',
    submittedAt: '2024-01-02',
    reviewedAt: '2024-01-03',
    reviewedBy: 'COS Manager',
    notes: 'Missing supporting documents. Please resubmit with complete attachments.',
  },
];

const statusConfig: Record<
  InvoiceStatus,
  { label: string; variant: 'pending' | 'approved' | 'error' }
> = {
  pending: { label: 'Pending', variant: 'pending' },
  approved: { label: 'Approved', variant: 'approved' },
  rejected: { label: 'Rejected', variant: 'error' },
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
};

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export default function PayrollApprovalsPage(): ReactNode {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [carouselIndex, setCarouselIndex] = useState(0);

  const pendingInvoices = invoices.filter((inv) => inv.status === 'pending');
  const processedInvoices = invoices.filter((inv) => inv.status !== 'pending');

  const stats = {
    pending: pendingInvoices.length,
    approved: invoices.filter((i) => i.status === 'approved').length,
    rejected: invoices.filter((i) => i.status === 'rejected').length,
    totalPendingAmount: pendingInvoices.reduce((sum, i) => sum + i.amount, 0),
  };

  const handleReview = (invoice: Invoice, action: 'approve' | 'reject'): void => {
    setSelectedInvoice(invoice);
    setReviewAction(action);
    setReviewDialogOpen(true);
  };

  const handleConfirmReview = (): void => {
    // TODO: Implement actual review logic
    setReviewDialogOpen(false);
    setSelectedInvoice(null);
    setReviewAction(null);
    setReviewNotes('');
  };

  const nextCarousel = (): void => {
    setCarouselIndex((prev) =>
      prev < pendingInvoices.length - 1 ? prev + 1 : 0
    );
  };

  const prevCarousel = (): void => {
    setCarouselIndex((prev) =>
      prev > 0 ? prev - 1 : pendingInvoices.length - 1
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Payroll Approvals</h1>
        <p className="text-muted-foreground">
          Review and approve contractor invoice submissions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
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
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-error/10">
                <XCircle className="h-5 w-5 text-error" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold">{stats.rejected}</p>
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
                <p className="text-sm text-muted-foreground">Pending Amount</p>
                <p className="text-xl font-bold">
                  {formatCurrency(stats.totalPendingAmount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Invoices Carousel */}
      {pendingInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Pending Invoices</CardTitle>
                <CardDescription>
                  Quick review for pending submissions
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={prevCarousel}
                  disabled={pendingInvoices.length <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {carouselIndex + 1} / {pendingInvoices.length}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={nextCarousel}
                  disabled={pendingInvoices.length <= 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {pendingInvoices[carouselIndex] && (
              <div className="rounded-lg border bg-muted/30 p-6">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  {/* Invoice Details */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        {pendingInvoices[carouselIndex]?.employeeAvatar && (
                          <AvatarImage
                            src={pendingInvoices[carouselIndex]?.employeeAvatar}
                          />
                        )}
                        <AvatarFallback>
                          {getInitials(pendingInvoices[carouselIndex]?.employeeName ?? '')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-lg font-semibold">
                          {pendingInvoices[carouselIndex]?.employeeName}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {pendingInvoices[carouselIndex]?.department}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Invoice Number
                        </p>
                        <p className="font-medium">
                          {pendingInvoices[carouselIndex]?.invoiceNumber}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Period</p>
                        <p className="font-medium">
                          {pendingInvoices[carouselIndex]?.period}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Amount</p>
                        <p className="text-lg font-bold text-primary">
                          {formatCurrency(pendingInvoices[carouselIndex]?.amount ?? 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Submitted
                        </p>
                        <p className="font-medium">
                          {pendingInvoices[carouselIndex]?.submittedAt}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                    <Button
                      variant="outline"
                      onClick={() =>
                        setSelectedInvoice(pendingInvoices[carouselIndex] ?? null)
                      }
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Document
                    </Button>
                    <Button
                      variant="success"
                      onClick={() => {
                        const invoice = pendingInvoices[carouselIndex];
                        if (invoice) {
                          handleReview(invoice, 'approve');
                        }
                      }}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        const invoice = pendingInvoices[carouselIndex];
                        if (invoice) {
                          handleReview(invoice, 'reject');
                        }
                      }}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* All Invoices Table */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({stats.pending})
          </TabsTrigger>
          <TabsTrigger value="processed">
            Processed ({processedInvoices.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            {invoice.employeeAvatar && (
                              <AvatarImage src={invoice.employeeAvatar} />
                            )}
                            <AvatarFallback className="text-xs">
                              {getInitials(invoice.employeeName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{invoice.employeeName}</p>
                            <p className="text-xs text-muted-foreground">
                              {invoice.department}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {invoice.invoiceNumber}
                      </TableCell>
                      <TableCell>{invoice.period}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(invoice.amount)}
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
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-success hover:text-success"
                            onClick={() => handleReview(invoice, 'approve')}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-error hover:text-error"
                            onClick={() => handleReview(invoice, 'reject')}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processed">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reviewed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedInvoices.map((invoice) => {
                    const config = statusConfig[invoice.status];
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              {invoice.employeeAvatar && (
                                <AvatarImage src={invoice.employeeAvatar} />
                              )}
                              <AvatarFallback className="text-xs">
                                {getInitials(invoice.employeeName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {invoice.employeeName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {invoice.department}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {invoice.invoiceNumber}
                        </TableCell>
                        <TableCell>{invoice.period}</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(invoice.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={config.variant}>{config.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{invoice.reviewedAt}</p>
                            <p className="text-xs text-muted-foreground">
                              by {invoice.reviewedBy}
                            </p>
                          </div>
                        </TableCell>
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
        </TabsContent>
      </Tabs>

      {/* Review Confirmation Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' ? 'Approve Invoice' : 'Reject Invoice'}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === 'approve'
                ? 'Are you sure you want to approve this invoice?'
                : 'Please provide a reason for rejection.'}
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Invoice:</span>
                    <span className="font-medium">
                      {selectedInvoice.invoiceNumber}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Employee:</span>
                    <span className="font-medium">
                      {selectedInvoice.employeeName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-medium">
                      {formatCurrency(selectedInvoice.amount)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Notes {reviewAction === 'reject' && '(Required)'}
                </label>
                <Textarea
                  placeholder={
                    reviewAction === 'approve'
                      ? 'Add optional notes...'
                      : 'Provide reason for rejection...'
                  }
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={reviewAction === 'approve' ? 'success' : 'destructive'}
              onClick={handleConfirmReview}
              disabled={reviewAction === 'reject' && !reviewNotes.trim()}
            >
              {reviewAction === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog
        open={selectedInvoice !== null && !reviewDialogOpen}
        onOpenChange={() => setSelectedInvoice(null)}
      >
        {selectedInvoice && (
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedInvoice.invoiceNumber}</DialogTitle>
              <DialogDescription>Invoice Details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  {selectedInvoice.employeeAvatar && (
                    <AvatarImage src={selectedInvoice.employeeAvatar} />
                  )}
                  <AvatarFallback>
                    {getInitials(selectedInvoice.employeeName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">
                    {selectedInvoice.employeeName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedInvoice.employeeEmail}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Department</p>
                  <p className="font-medium">{selectedInvoice.department}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Period</p>
                  <p className="font-medium">{selectedInvoice.period}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="text-lg font-bold text-primary">
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
                {selectedInvoice.reviewedAt && (
                  <div>
                    <p className="text-sm text-muted-foreground">Reviewed</p>
                    <p className="font-medium">{selectedInvoice.reviewedAt}</p>
                  </div>
                )}
              </div>

              {selectedInvoice.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="mt-1 rounded-lg bg-muted p-3 text-sm">
                    {selectedInvoice.notes}
                  </p>
                </div>
              )}

              {/* Placeholder for document preview */}
              <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
                <FileCheck className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">Invoice Document</p>
                <p className="text-xs text-muted-foreground">
                  Click to view or download
                </p>
                <Button variant="outline" size="sm" className="mt-3">
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedInvoice(null)}>
                Close
              </Button>
              {selectedInvoice.status === 'pending' && (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => handleReview(selectedInvoice, 'reject')}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="success"
                    onClick={() => handleReview(selectedInvoice, 'approve')}
                  >
                    Approve
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

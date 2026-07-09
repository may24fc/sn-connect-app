'use client';

import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@hr-portal/ui';
import { DollarSign, FileText, Clock, CheckCircle2, AlertCircle, ChevronRight, Eye, ShieldAlert } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'How do I create a new invoice?',
    answer:
      'Click the "Create Invoice" button, upload your invoice file, and select the payout schedule. The system saves a draft and extracts the amount from the uploaded document.',
  },
  {
    question: 'What happens after I submit an invoice?',
    answer:
      'Your invoice enters the Super Admin\'s Payroll Approvals queue. A Super Admin reviews the invoice details and either approves it (payment will be processed) or rejects it with notes explaining what needs correction.',
  },
  {
    question: 'Can I edit an invoice after submitting?',
    answer:
      'No. Once submitted, an invoice is locked for review. If it\'s rejected, review the rejection notes and create a new invoice with the corrected information.',
  },
  {
    question: 'What does the "Hide Amounts" toggle do?',
    answer:
      'The eye icon toggle masks all monetary values on the page for privacy. This is useful if you\'re viewing the invoice page in a shared space. Click the toggle again to reveal the amounts.',
  },
  {
    question: 'How does currency conversion work?',
    answer:
      'The system uses the extracted invoice amount as your base amount and applies currency conversion when source and target currencies differ.',
  },
  {
    question: 'What do the stat cards at the top mean?',
    answer:
      'Total = all invoices you\'ve ever created. Pending Review = invoices submitted and awaiting admin approval. Approved/Paid = invoices that have been approved or paid. Total Approved = the combined approved invoice amounts.',
  },
  {
    question: 'How do I view details of a past invoice?',
    answer:
      'Click on any row in the invoice table to open the detail dialog. It shows the full financial summary, notes, and a timeline of the invoice\'s journey (Created → Submitted → Approved → Paid).',
  },
  {
    question: 'Can I download my invoices?',
    answer:
      'Yes. Open an invoice by clicking its row, then click the "Download PDF" button at the bottom of the detail dialog.',
  },
  {
    question: 'What if my invoice is rejected?',
    answer:
      'Open the rejected invoice to read the reviewer\'s notes. Common rejection reasons include incorrect amounts, missing details, or wrong pay period. Create a new invoice with the corrected information and submit again.',
  },
  {
    question: 'Do interns have access to invoices?',
    answer:
      'No. The Invoice feature is available to employees only. Interns do not have access to the invoices page.',
  },
];

const statusInfo = [
  { status: 'Draft', description: 'Created but not submitted — you can still edit or delete it', variant: 'secondary' as const, icon: FileText },
  { status: 'Submitted', description: 'Sent for Super Admin review — no further edits', variant: 'pending' as const, icon: Clock },
  { status: 'Approved', description: 'Accepted — payment will be processed', variant: 'success' as const, icon: CheckCircle2 },
  { status: 'Rejected', description: 'Returned with notes — review and resubmit', variant: 'error' as const, icon: AlertCircle },
  { status: 'Paid', description: 'Payment has been completed', variant: 'success' as const, icon: DollarSign },
];

const invoiceFlow = [
  { label: 'Create', description: 'Fill in period, rate, and hours' },
  { label: 'Submit', description: 'Send to admin for review' },
  { label: 'Review', description: 'Super Admin approves or rejects' },
  { label: 'Payment', description: 'Approved invoices proceed to payroll' },
];

export default function InvoicesHelpPage(): ReactNode {
  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">Invoices</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Learn how to create, submit, and track your payroll invoices.
        </p>
      </div>

      {/* Quick Tips */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <Eye className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Privacy Toggle</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Use the "Hide Amounts" button to mask all monetary values when viewing in shared spaces
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30 shrink-0">
              <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-medium text-sm">Sensitive Data</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Invoice details contain compensation data. Never share screenshots or details outside official channels
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Flow */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Invoice Lifecycle</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {invoiceFlow.map((step, index) => (
              <div key={step.label} className="flex items-center gap-3 flex-1">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
                    <span className="text-xs font-bold text-primary">{index + 1}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{step.label}</p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>
                {index < invoiceFlow.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground hidden sm:block shrink-0" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Statuses */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Invoice Statuses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {statusInfo.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.status} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Badge variant={item.variant} className="shrink-0">{item.status}</Badge>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* How to Create - Step by Step */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Creating an Invoice</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {[
              'Click the "Create Invoice" button at the top of the Invoice page',
              'Upload your existing invoice file',
              'Select the payout schedule for submission',
              'Click "Upload & Save Draft" to create the draft invoice',
              'The amount is extracted from your uploaded document',
              'When ready, click "Submit" on the draft row to send for approval',
            ].map((step, i) => (
              <li key={step} className="flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">{i + 1}</span>
                </div>
                <p className="text-sm text-foreground">{step}</p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* FAQ */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Frequently Asked Questions</h3>
        <div className="space-y-3">
          {faqs.map((faq) => (
            <Card key={faq.question}>
              <CardContent className="p-4">
                <p className="font-medium text-sm text-foreground">{faq.question}</p>
                <p className="text-sm text-muted-foreground mt-1.5">{faq.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

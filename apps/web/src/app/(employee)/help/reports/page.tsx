'use client';

import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@hr-portal/ui';
import { FileText, Clock, CheckCircle2, AlertCircle, GraduationCap } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const employeeFaqs: FAQItem[] = [
  {
    question: 'How do I create a new report?',
    answer:
      'Click the "+ New Marketing Report" button at the top of the Marketing Reports page. Choose the reporting period, pick a marketing template if needed, and fill in your summary, accomplishments, challenges, plans, and campaign metrics. You can save as a draft or submit immediately.',
  },
  {
    question: 'What\'s the difference between saving as a draft and submitting?',
    answer:
      'A draft is saved privately — you can continue editing it later. Once you submit, the report goes to your manager for review and you can no longer edit it.',
  },
  {
    question: 'Can I edit a report after submitting?',
    answer:
      'No. Once submitted, reports are locked. If you need to make a correction, contact your manager and they can provide guidance on next steps.',
  },
  {
    question: 'What report types are available?',
    answer:
      'The employee-facing reports workflow is currently focused on Marketing reports. The page is available only to employees assigned to the Marketing department.',
  },
  {
    question: 'What should I include in the Accomplishments section?',
    answer:
      'List specific tasks you completed, milestones reached, or goals achieved during the reporting period. Be concrete — include numbers, deliverables, or outcomes when possible.',
  },
  {
    question: 'How do I know if my report has been reviewed?',
    answer:
      'Check the status badge next to each report. "Submitted" means it\'s awaiting review. "Approved" means reviewed and accepted. "Rejected" means the reviewer wants changes — check the reviewer notes for details.',
  },
  {
    question: 'What does the Status Breakdown chart show?',
    answer:
      'The chart gives you a visual summary of how many of your reports are in each status (Draft, Submitted, Approved, Rejected). It helps you quickly see if you have pending drafts or reports awaiting review.',
  },
  {
    question: 'Can I group my reports?',
    answer:
      'Yes! Use the Flat/Grouped toggle above the reports table. Grouped view organizes reports by their report group or hierarchy, making it easier to see related reports together.',
  },
];

const internFaqs: FAQItem[] = [
  {
    question: 'How often do I need to submit reports?',
    answer:
      'Interns submit an End-of-Day (EOD) report every working day. Your dashboard clearly shows whether you\'ve submitted today\'s report with a green (done) or yellow (pending) status indicator.',
  },
  {
    question: 'What should I include in my daily report?',
    answer:
      'Include Date and Hours Logged, then summarize your Progress & Impact by naming the project or focus, the action you took, and the outcome. Add any Current Blockers and your Next Steps when relevant. Hours Logged and Progress & Impact are the required parts of the report.',
  },
  {
    question: 'Where do I submit my daily report?',
    answer:
      'From your Intern Dashboard, click the "Submit Now" button on the Today\'s Status Card. You can also view all past reports on the Reports page (/intern/reports).',
  },
  {
    question: 'How do hours from daily reports count toward my internship?',
    answer:
      'Hours from each daily report automatically accumulate toward your required total. The Hours Progress gauge on your dashboard shows your current percentage toward completion.',
  },
  {
    question: 'Does my supervisor need to approve my reports?',
    answer:
      'Yes. After you submit a daily report, your supervisor can review and approve it. You\'ll see the approval status on each report entry in your reports list.',
  },
];

const statusInfo = [
  { status: 'Draft', description: 'Saved but not submitted — you can still edit it', variant: 'secondary' as const, icon: FileText },
  { status: 'Submitted', description: 'Sent for review — no further edits allowed', variant: 'pending' as const, icon: Clock },
  { status: 'Approved', description: 'Reviewed and accepted by your manager', variant: 'success' as const, icon: CheckCircle2 },
  { status: 'Rejected', description: 'Returned with feedback — review the notes', variant: 'error' as const, icon: AlertCircle },
];

export default function ReportsHelpPage(): ReactNode {
  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">Marketing Reports</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Learn how to create, submit, and manage your marketing reports.
        </p>
      </div>

      {/* Report Statuses */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Report Statuses</CardTitle>
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

      {/* How to Create a Report - Step by Step */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Creating a Marketing Report</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {[
              'Click the "+ New Marketing Report" button at the top of the page',
              'Choose the reporting period and, if useful, apply the campaign template',
              'Fill in the Summary, Accomplishments, Challenges, and Next Week Plans sections',
              'Add campaign metrics such as spend, impressions, clicks, leads, conversions, or ROAS',
              'Click "Save Draft" to save for later, or "Submit Report" to send for review',
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

      {/* Intern Daily Reports */}
      <Card className="border-amber-200 dark:border-amber-700/40">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <CardTitle className="text-base">Daily EOD Reports (Interns)</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Interns submit a daily End-of-Day report instead of weekly reports. Your dashboard shows today's status and your reports page shows your full history.
          </p>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-4 space-y-2">
            <p className="text-sm font-medium text-foreground">Required fields:</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li><span className="font-medium text-foreground">Date</span> — The work date this report covers</li>
              <li><span className="font-medium text-foreground">Hours Logged</span> — Number of hours worked</li>
              <li><span className="font-medium text-foreground">Progress &amp; Impact</span> — State the project or focus, the action you took, and the outcome</li>
            </ul>
            <p className="text-sm font-medium text-foreground mt-3">Optional fields:</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li><span className="font-medium text-foreground">Current Blockers</span> — Any issue, dependency, or support need that is still open</li>
              <li><span className="font-medium text-foreground">Next Steps</span> — What you will continue, follow up on, or prioritize next</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Employee FAQ */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Employee Report FAQ</h3>
        <div className="space-y-3">
          {employeeFaqs.map((faq) => (
            <Card key={faq.question}>
              <CardContent className="p-4">
                <p className="font-medium text-sm text-foreground">{faq.question}</p>
                <p className="text-sm text-muted-foreground mt-1.5">{faq.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Intern FAQ */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <GraduationCap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <h3 className="text-lg font-semibold">Intern Report FAQ</h3>
        </div>
        <div className="space-y-3">
          {internFaqs.map((faq) => (
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

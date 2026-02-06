'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit, FileText, Calendar, User, Paperclip } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Separator,
  ReportStatusBadge,
  type ReportSubmission,
  formatPeriodLabel,
  calculateTotalExpenditure,
  calculateTotalResults,
  calculateROI,
} from '@hr-portal/ui';

// Mock data - replace with actual API call
const MOCK_REPORT: ReportSubmission = {
  id: '1' as any,
  reportTypeId: 'rt-1' as any,
  reportTypeName: 'Marketing Spend Report',
  submitterId: 'user-1',
  submitterName: 'John Doe',
  submitterDepartment: 'Marketing',
  periodStart: '2026-02-03T00:00:00.000Z',
  periodEnd: '2026-02-09T23:59:59.999Z',
  content: {
    summary: 'Successfully launched Facebook ad campaign targeting Q1 goals. The campaign exceeded expectations with significant ROI improvements.',
    accomplishments: [
      'Generated 245 qualified leads from Facebook Ads',
      'Increased brand awareness by 40% across target demographics',
      'Achieved 25% lower cost-per-lead compared to previous campaigns',
    ],
    challenges: [
      'Budget constraints limited Google Ads expansion',
      'Delayed creative approval from stakeholders',
    ],
    nextWeekPlans: [
      'Optimize ad targeting based on current data',
      'Prepare Valentine\'s Day campaign materials',
      'A/B test new ad creative variations',
    ],
    metrics: [
      {
        id: 'm1',
        type: 'expenditure',
        name: 'Facebook Ads',
        value: 15000,
        unit: 'PHP',
        category: 'Marketing',
      },
      {
        id: 'm2',
        type: 'expenditure',
        name: 'Google Ads',
        value: 12500,
        unit: 'PHP',
        category: 'Marketing',
      },
      {
        id: 'm3',
        type: 'expenditure',
        name: 'Influencer Partnership',
        value: 8000,
        unit: 'PHP',
        category: 'Marketing',
      },
      {
        id: 'm4',
        type: 'result',
        name: 'Leads Generated',
        value: 245,
        unit: 'count',
        category: 'Sales',
      },
      {
        id: 'm5',
        type: 'result',
        name: 'Revenue Generated',
        value: 85000,
        unit: 'PHP',
        category: 'Sales',
      },
      {
        id: 'm6',
        type: 'result',
        name: 'New Followers',
        value: 1200,
        unit: 'count',
        category: 'Marketing',
      },
    ],
    notes: 'The influencer partnership was particularly effective, driving 40% of the total leads.',
  },
  filePaths: ['receipts/facebook_invoice.pdf', 'receipts/google_receipt.pdf'],
  status: 'submitted',
  submittedAt: '2026-02-09T15:45:00.000Z',
  reviewedBy: null,
  reviewedAt: null,
  createdAt: '2026-02-03T10:00:00.000Z',
  updatedAt: '2026-02-09T15:45:00.000Z',
};

export default function ReportDetailPage({
  params,
}: {
  params: { id: string };
}): React.ReactNode {
  const router = useRouter();
  const [report] = React.useState<ReportSubmission>(MOCK_REPORT);

  const periodLabel = formatPeriodLabel(report.periodStart, report.periodEnd);
  const totalExpenditure = calculateTotalExpenditure(report.content.metrics);
  const totalResults = calculateTotalResults(report.content.metrics);
  const roi = calculateROI(totalExpenditure, totalResults);

  const expenditures = report.content.metrics.filter((m) => m.type === 'expenditure');
  const results = report.content.metrics.filter((m) => m.type === 'result');

  const handleBack = (): void => {
    router.push('/reports');
  };

  const handleEdit = (): void => {
    // TODO: Navigate to edit page
    console.log('Edit report:', report.id);
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back to reports</span>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{report.reportTypeName}</h1>
            <ReportStatusBadge status={report.status} />
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {periodLabel}
            </span>
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {report.submitterName}
            </span>
          </div>
        </div>
        {report.status === 'draft' && (
          <Button onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </div>

      {/* Financial Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Expenditure</p>
              <p className="text-2xl font-bold">
                PHP {totalExpenditure.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Results</p>
              <p className="text-2xl font-bold">
                PHP {totalResults.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">ROI</p>
              <p className={`text-2xl font-bold ${roi > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {roi.toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{report.content.summary}</p>
        </CardContent>
      </Card>

      {/* Accomplishments */}
      {report.content.accomplishments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Key Accomplishments</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.content.accomplishments.map((item, index) => (
                <li key={index} className="flex gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Challenges */}
      {report.content.challenges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Challenges Faced</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.content.challenges.map((item, index) => (
                <li key={index} className="flex gap-2">
                  <span className="text-orange-600 font-bold">!</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Metrics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Expenditures */}
          <div className="space-y-3">
            <h3 className="font-medium">Expenditures</h3>
            <div className="space-y-2">
              {expenditures.map((metric) => (
                <div
                  key={metric.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{metric.name}</span>
                    <Badge variant="secondary">{metric.category}</Badge>
                  </div>
                  <span className="font-semibold">
                    {metric.unit} {metric.value.toLocaleString('en-PH')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Results */}
          <div className="space-y-3">
            <h3 className="font-medium">Results / Outcomes</h3>
            <div className="space-y-2">
              {results.map((metric) => (
                <div
                  key={metric.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{metric.name}</span>
                    <Badge variant="secondary">{metric.category}</Badge>
                  </div>
                  <span className="font-semibold">
                    {metric.unit === 'PHP' ? 'PHP ' : ''}
                    {metric.value.toLocaleString('en-PH')}
                    {metric.unit !== 'PHP' && metric.unit !== 'count' ? ` ${metric.unit}` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Week Plans */}
      {report.content.nextWeekPlans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Next Week Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.content.nextWeekPlans.map((item, index) => (
                <li key={index} className="flex gap-2">
                  <span className="text-primary font-bold">→</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Attachments */}
      {report.filePaths.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Attachments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.filePaths.map((path, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg"
                >
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{path.split('/').pop()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Notes */}
      {report.content.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{report.content.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Report Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created:</span>
            <span>{formatDate(report.createdAt)}</span>
          </div>
          {report.submittedAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Submitted:</span>
              <span>{formatDate(report.submittedAt)}</span>
            </div>
          )}
          {report.reviewedAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reviewed:</span>
              <span>{formatDate(report.reviewedAt)}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

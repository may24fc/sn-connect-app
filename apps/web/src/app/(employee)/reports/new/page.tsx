'use client';

import { useCreateReport } from '@/hooks/useCreateReport';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@hr-portal/ui';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

export default function NewReportPage() {
  const router = useRouter();
  const createReport = useCreateReport();

  const [reportType, setReportType] = useState<'weekly' | 'monthly' | 'marketing'>('weekly');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [metricName, setMetricName] = useState('');
  const [metricValue, setMetricValue] = useState('0');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const metricNumericValue = useMemo(() => Number(metricValue || 0), [metricValue]);

  const handleSubmit = async (asDraft: boolean) => {
    setErrorMessage(null);

    try {
      const response = await createReport.mutateAsync({
        reportType,
        periodStart,
        periodEnd,
        status: asDraft ? 'draft' : 'submitted',
        notes: notes || undefined,
        metrics:
          metricName.trim().length > 0
            ? [
                {
                  metricName,
                  metricValue: Number.isFinite(metricNumericValue) ? metricNumericValue : 0,
                  metricUnit: 'PHP',
                },
              ]
            : [],
      });

      router.push(`/reports/${response.data.id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save report');
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/reports">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-headline">Create Report</h1>
          <p className="text-muted-foreground">Submit a weekly, monthly, or marketing report</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit(false);
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Report Type</Label>
                <Select value={reportType} onValueChange={(value) => setReportType(value as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Metric Name (optional)</Label>
                <Input value={metricName} onChange={(event) => setMetricName(event.target.value)} />
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
            </div>

            <div className="space-y-2">
              <Label>Metric Value</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={metricValue}
                onChange={(event) => setMetricValue(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={5} />
            </div>

            {errorMessage && <p className="text-sm text-error">{errorMessage}</p>}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={createReport.isPending}
                onClick={() => void handleSubmit(true)}
              >
                Save Draft
              </Button>
              <Button type="submit" disabled={createReport.isPending}>
                Submit Report
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

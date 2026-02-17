'use client';

import { useCreateReport } from '@/hooks/useCreateReport';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Textarea,
} from '@hr-portal/ui';
import { ArrowLeft, Plus, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const REPORT_TYPE_INFO: Record<string, { label: string; description: string }> = {
  weekly: {
    label: 'Weekly',
    description: 'Summarize your weekly activities, accomplishments, and plans for next week.',
  },
  monthly: {
    label: 'Monthly',
    description:
      'Provide a comprehensive overview of the month including key metrics and milestones.',
  },
  marketing: {
    label: 'Marketing',
    description:
      'Track campaign performance metrics like clicks, impressions, conversions, and costs.',
  },
};

interface MetricEntry {
  name: string;
  value: string;
  unit: string;
}

export default function NewReportPage() {
  const router = useRouter();
  const createReport = useCreateReport();

  const [reportType, setReportType] = useState<'weekly' | 'monthly' | 'marketing'>('weekly');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dynamic metric entries
  const [metrics, setMetrics] = useState<Array<MetricEntry>>([
    { name: '', value: '0', unit: 'PHP' },
  ]);

  // Accomplishments, challenges, next-week plans
  const [accomplishments, setAccomplishments] = useState<Array<string>>(['']);
  const [challenges, setChallenges] = useState<Array<string>>(['']);
  const [nextWeekPlans, setNextWeekPlans] = useState<Array<string>>(['']);

  const handleStringArrayChange = (
    index: number,
    value: string,
    setter: React.Dispatch<React.SetStateAction<Array<string>>>
  ) => {
    setter((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleAddItem = (setter: React.Dispatch<React.SetStateAction<Array<string>>>) => {
    setter((prev) => [...prev, '']);
  };

  const handleRemoveItem = (
    index: number,
    setter: React.Dispatch<React.SetStateAction<Array<string>>>
  ) => {
    setter((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const handleMetricChange = (index: number, field: keyof MetricEntry, value: string) => {
    setMetrics((prev) =>
      prev.map((m, i) =>
        i === index
          ? {
              name: field === 'name' ? value : m.name,
              value: field === 'value' ? value : m.value,
              unit: field === 'unit' ? value : m.unit,
            }
          : m
      )
    );
  };

  const handleAddMetric = () => {
    setMetrics((prev) => [...prev, { name: '', value: '0', unit: 'PHP' }]);
  };

  const handleRemoveMetric = (index: number) => {
    setMetrics((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const buildNotes = (): string => {
    const parts: Array<string> = [];

    if (notes.trim()) {
      parts.push(notes.trim());
    }

    const filteredAccomplishments = accomplishments.filter((a) => a.trim());
    if (filteredAccomplishments.length > 0) {
      parts.push(`Accomplishments:\n${filteredAccomplishments.map((a) => `- ${a}`).join('\n')}`);
    }

    const filteredChallenges = challenges.filter((c) => c.trim());
    if (filteredChallenges.length > 0) {
      parts.push(`Challenges:\n${filteredChallenges.map((c) => `- ${c}`).join('\n')}`);
    }

    const filteredPlans = nextWeekPlans.filter((p) => p.trim());
    if (filteredPlans.length > 0) {
      parts.push(`Next Week Plans:\n${filteredPlans.map((p) => `- ${p}`).join('\n')}`);
    }

    return parts.join('\n\n');
  };

  const handleSubmit = async (asDraft: boolean) => {
    setErrorMessage(null);

    try {
      const validMetrics = metrics
        .filter((m) => m.name.trim().length > 0)
        .map((m) => ({
          metricName: m.name,
          metricValue: Number.isFinite(Number(m.value)) ? Number(m.value) : 0,
          metricUnit: m.unit || 'PHP',
        }));

      const response = await createReport.mutateAsync({
        reportType,
        periodStart,
        periodEnd,
        status: asDraft ? 'draft' : 'submitted',
        notes: buildNotes() || undefined,
        metrics: validMetrics,
      });

      router.push(`/reports/${response.data.id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save report');
    }
  };

  const typeInfo = REPORT_TYPE_INFO[reportType];

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

      {/* Report Details */}
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
                <Select
                  value={reportType}
                  onValueChange={(value) =>
                    setReportType(value as 'weekly' | 'monthly' | 'marketing')
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                  </SelectContent>
                </Select>
                {typeInfo && (
                  <p className="text-xs text-muted-foreground">{typeInfo.description}</p>
                )}
              </div>
              <div />
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
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="General notes about this report period..."
              />
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

      {/* Accomplishments */}
      <Card>
        <CardHeader>
          <CardTitle>Accomplishments</CardTitle>
          <CardDescription>List key accomplishments for this reporting period</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {accomplishments.map((item, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder={`Accomplishment ${index + 1}`}
                value={item}
                onChange={(e) => handleStringArrayChange(index, e.target.value, setAccomplishments)}
                className="flex-1"
              />
              {accomplishments.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveItem(index, setAccomplishments)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleAddItem(setAccomplishments)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Accomplishment
          </Button>
        </CardContent>
      </Card>

      {/* Challenges */}
      <Card>
        <CardHeader>
          <CardTitle>Challenges</CardTitle>
          <CardDescription>Note any challenges or blockers encountered</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {challenges.map((item, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder={`Challenge ${index + 1}`}
                value={item}
                onChange={(e) => handleStringArrayChange(index, e.target.value, setChallenges)}
                className="flex-1"
              />
              {challenges.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveItem(index, setChallenges)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleAddItem(setChallenges)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Challenge
          </Button>
        </CardContent>
      </Card>

      {/* Next Week Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Next Week Plans</CardTitle>
          <CardDescription>Outline priorities and goals for the coming week</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {nextWeekPlans.map((item, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder={`Plan ${index + 1}`}
                value={item}
                onChange={(e) => handleStringArrayChange(index, e.target.value, setNextWeekPlans)}
                className="flex-1"
              />
              {nextWeekPlans.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveItem(index, setNextWeekPlans)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleAddItem(setNextWeekPlans)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Plan
          </Button>
        </CardContent>
      </Card>

      {/* Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Metrics</CardTitle>
          <CardDescription>
            Add quantitative metrics to your report (e.g. clicks, impressions, cost)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {metrics.map((metric, index) => (
            <div key={index} className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                {index === 0 && <Label className="text-xs text-muted-foreground">Name</Label>}
                <Input
                  placeholder="Metric name"
                  value={metric.name}
                  onChange={(e) => handleMetricChange(index, 'name', e.target.value)}
                />
              </div>
              <div className="w-32 space-y-1">
                {index === 0 && <Label className="text-xs text-muted-foreground">Value</Label>}
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={metric.value}
                  onChange={(e) => handleMetricChange(index, 'value', e.target.value)}
                />
              </div>
              <div className="w-24 space-y-1">
                {index === 0 && <Label className="text-xs text-muted-foreground">Unit</Label>}
                <Input
                  placeholder="PHP"
                  value={metric.unit}
                  onChange={(e) => handleMetricChange(index, 'unit', e.target.value)}
                />
              </div>
              {metrics.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveMetric(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}

          <Separator />

          <Button type="button" variant="outline" size="sm" onClick={handleAddMetric}>
            <Plus className="h-4 w-4 mr-1" />
            Add Metric
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

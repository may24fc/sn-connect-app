'use client';

import { useCreateReport } from '@/hooks/useCreateReport';
import { REPORT_TYPE_INFO } from '@/lib/report-utils';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FormGroup,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Textarea,
  useToast,
} from '@hr-portal/ui';
import { AlertCircle, ArrowLeft, Calendar, FileText, Plus, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

interface ReportTemplate {
  label: string;
  description: string;
  reportType: 'weekly' | 'monthly' | 'marketing';
  metrics: Array<MetricEntry>;
}

const REPORT_TEMPLATES: Record<string, ReportTemplate> = {
  weekly_summary: {
    label: 'Weekly Summary',
    description: 'Standard weekly task summary with completion metrics',
    reportType: 'weekly',
    metrics: [
      { name: 'Tasks Completed', value: '0', unit: 'count' },
      { name: 'Tasks In Progress', value: '0', unit: 'count' },
      { name: 'Hours Worked', value: '0', unit: 'hours' },
    ],
  },
  monthly_summary: {
    label: 'Monthly Summary',
    description: 'Aggregated monthly performance overview',
    reportType: 'monthly',
    metrics: [
      { name: 'Tasks Completed', value: '0', unit: 'count' },
      { name: 'Projects Delivered', value: '0', unit: 'count' },
      { name: 'Revenue Generated', value: '0', unit: 'PHP' },
      { name: 'Client Satisfaction', value: '0', unit: '%' },
    ],
  },
  campaign_deep_dive: {
    label: 'Campaign Deep-Dive',
    description: 'Detailed campaign metrics — impressions, clicks, CTR, conversions, spend, ROAS',
    reportType: 'marketing',
    metrics: [
      { name: 'Impressions', value: '0', unit: 'count' },
      { name: 'Clicks', value: '0', unit: 'count' },
      { name: 'CTR', value: '0', unit: '%' },
      { name: 'Conversions', value: '0', unit: 'count' },
      { name: 'Spend', value: '0', unit: 'PHP' },
      { name: 'ROAS', value: '0', unit: 'x' },
    ],
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
  const { addToast } = useToast();

  const [reportType, setReportType] = useState<'weekly' | 'monthly' | 'marketing'>('weekly');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);

  // Dynamic metric entries
  const [metrics, setMetrics] = useState<Array<MetricEntry>>([
    { name: '', value: '0', unit: 'PHP' },
  ]);

  // Accomplishments, challenges, next-week plans
  const [accomplishments, setAccomplishments] = useState<Array<string>>(['']);
  const [challenges, setChallenges] = useState<Array<string>>(['']);
  const [nextWeekPlans, setNextWeekPlans] = useState<Array<string>>(['']);

  const buildReportPayload = useCallback((asDraft: boolean) => {
    const validMetrics = metrics
      .filter((m) => m.name.trim().length > 0)
      .map((m) => ({
        metricName: m.name,
        metricValue: Number.isFinite(Number(m.value)) ? Number(m.value) : 0,
        metricUnit: m.unit || 'PHP',
      }));

    const parts: Array<string> = [];
    if (notes.trim()) parts.push(notes.trim());
    const fa = accomplishments.filter((a) => a.trim());
    if (fa.length > 0) parts.push(`Accomplishments:\n${fa.map((a) => `- ${a}`).join('\n')}`);
    const fc = challenges.filter((c) => c.trim());
    if (fc.length > 0) parts.push(`Challenges:\n${fc.map((c) => `- ${c}`).join('\n')}`);
    const fp = nextWeekPlans.filter((p) => p.trim());
    if (fp.length > 0) parts.push(`Next Week Plans:\n${fp.map((p) => `- ${p}`).join('\n')}`);

    return {
      reportType,
      periodStart,
      periodEnd,
      status: asDraft ? ('draft' as const) : ('submitted' as const),
      notes: parts.join('\n\n') || undefined,
      metrics: validMetrics,
    };
  }, [reportType, periodStart, periodEnd, notes, metrics, accomplishments, challenges, nextWeekPlans]);

  // Auto-save draft silently to prevent data loss
  const autoSaveDraft = useCallback(async (): Promise<void> => {
    if (isSavingRef.current || !periodStart || !periodEnd) return;

    isSavingRef.current = true;
    try {
      const payload = buildReportPayload(true);
      if (createdId) {
        const res = await fetch(`/api/reports/${createdId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) setLastSavedAt(new Date());
      } else {
        const response = await createReport.mutateAsync(payload);
        setCreatedId(response.data.id);
        setLastSavedAt(new Date());
      }
    } catch {
      // Silently fail for auto-save
    } finally {
      isSavingRef.current = false;
    }
  }, [buildReportPayload, createdId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced auto-save: 10 seconds after last change
  useEffect(() => {
    if (!periodStart || !periodEnd) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => { void autoSaveDraft(); }, 10_000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [reportType, periodStart, periodEnd, notes, metrics, accomplishments, challenges, nextWeekPlans, autoSaveDraft]);

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

  const validateRequiredSections = (): string | null => {
    const filledAccomplishments = accomplishments.filter((a) => a.trim());
    if (filledAccomplishments.length === 0) {
      return 'Please add at least one accomplishment.';
    }

    const filledChallenges = challenges.filter((c) => c.trim());
    if (filledChallenges.length === 0) {
      return 'Please add at least one challenge.';
    }

    const filledPlans = nextWeekPlans.filter((p) => p.trim());
    if (filledPlans.length === 0) {
      return 'Please add at least one plan for next week.';
    }

    const filledMetrics = metrics.filter((m) => m.name.trim());
    if (filledMetrics.length === 0) {
      return 'Please add at least one metric.';
    }

    return null;
  };

  const handleSubmit = async (asDraft: boolean) => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setErrorMessage(null);

    if (!asDraft) {
      const validationError = validateRequiredSections();
      if (validationError) {
        setErrorMessage(validationError);
        addToast({
          title: 'Validation Error',
          description: validationError,
          variant: 'error',
        });
        return;
      }
    }

    try {
      const payload = buildReportPayload(asDraft);
      let reportId: string;

      if (createdId) {
        // Update the auto-saved draft instead of creating a duplicate
        const res = await fetch(`/api/reports/${createdId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to update report');
        reportId = createdId;
      } else {
        const response = await createReport.mutateAsync(payload);
        reportId = response.data.id;
      }

      addToast({
        title: 'Report saved',
        description: asDraft ? 'Draft saved successfully' : 'Report submitted for review',
        variant: 'success',
      });

      router.push(`/reports/${reportId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save report';
      setErrorMessage(message);
      addToast({
        title: 'Error',
        description: message,
        variant: 'error',
      });
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
          <h1 className="text-2xl font-bold text-foreground">Create Report</h1>
          <p className="text-muted-foreground">Submit a weekly, monthly, or marketing report</p>
        </div>
      </div>

      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit(false);
        }}
      >
      {/* Report Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-700" />
            Report Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <FormGroup
                label="Report Type"
                htmlFor="reportType"
                required
                showOptional={false}
                description={typeInfo?.description}
                icon={<FileText className="h-3.5 w-3.5" />}
              >
                <Select
                  value={reportType}
                  onValueChange={(value) =>
                    setReportType(value as 'weekly' | 'monthly' | 'marketing')
                  }
                >
                  <SelectTrigger id="reportType" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                  </SelectContent>
                </Select>
              </FormGroup>
              <FormGroup
                label="Template"
                htmlFor="template"
                showOptional
                description="Pre-fill metrics from a template"
                icon={<FileText className="h-3.5 w-3.5" />}
              >
                <Select
                  value=""
                  onValueChange={(key) => {
                    const template = REPORT_TEMPLATES[key];
                    if (template) {
                      setReportType(template.reportType);
                      setMetrics(template.metrics.map((m) => ({ ...m })));
                    }
                  }}
                >
                  <SelectTrigger id="template" className="h-10">
                    <SelectValue placeholder="Select template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(REPORT_TEMPLATES).map(([key, tpl]) => (
                      <SelectItem key={key} value={key}>
                        {tpl.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormGroup>
              <FormGroup
                label="Period Start"
                htmlFor="periodStart"
                required
                showOptional={false}
                icon={<Calendar className="h-3.5 w-3.5" />}
              >
                <Input
                  id="periodStart"
                  type="date"
                  value={periodStart}
                  onChange={(event) => setPeriodStart(event.target.value)}
                  required
                  className="h-10"
                />
              </FormGroup>
              <FormGroup
                label="Period End"
                htmlFor="periodEnd"
                required
                showOptional={false}
                icon={<Calendar className="h-3.5 w-3.5" />}
              >
                <Input
                  id="periodEnd"
                  type="date"
                  value={periodEnd}
                  onChange={(event) => setPeriodEnd(event.target.value)}
                  required
                  className="h-10"
                />
              </FormGroup>
            </div>

            <FormGroup label="Notes" htmlFor="notes">
              <Textarea
                id="notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="General notes about this report period..."
                className="resize-none"
              />
            </FormGroup>
          </div>
        </CardContent>
      </Card>

      {/* Accomplishments */}
      <Card>
        <CardHeader>
          <CardTitle>
            Accomplishments <span className="text-rose-500">*</span>
          </CardTitle>
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
                  aria-label="Remove accomplishment"
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
          <CardTitle>
            Challenges <span className="text-rose-500">*</span>
          </CardTitle>
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
                  aria-label="Remove challenge"
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
          <CardTitle>
            Next Week Plans <span className="text-rose-500">*</span>
          </CardTitle>
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
                  aria-label="Remove plan"
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
          <CardTitle>
            Metrics <span className="text-rose-500">*</span>
          </CardTitle>
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
                  aria-label="Remove metric"
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

      {/* Error Message */}
      {errorMessage && (
        <div className="flex items-start gap-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 p-3.5 text-sm text-rose-600 dark:text-rose-400 animate-in slide-in-from-top-2 fade-in duration-200">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 pb-8 border-t border-zinc-200 dark:border-zinc-800">
        {lastSavedAt && (
          <span className="text-xs text-muted-foreground mr-auto">
            Auto-saved {lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={createReport.isPending}
          onClick={() => void handleSubmit(true)}
        >
          Save Draft
        </Button>
        <Button type="submit" disabled={createReport.isPending} className="min-w-[120px]">
          {createReport.isPending ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Submitting...
            </span>
          ) : (
            'Submit Report'
          )}
        </Button>
      </div>
      </form>
    </div>
  );
}

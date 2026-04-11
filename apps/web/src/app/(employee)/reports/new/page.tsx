'use client';

import { MarketingReportsAccessState } from '@/components/reports/MarketingReportsAccessState';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { useCreateReport } from '@/hooks/useCreateReport';
import { useMarketingReportsAccess } from '@/hooks/useMarketingReportsAccess';
import {
  buildNarrativeReportNotes,
  createMarketingMetricPreset,
  getMarketingObjectivesForCampaignType,
  MARKETING_CAMPAIGN_TYPE_OPTIONS,
  MARKETING_OBJECTIVE_INFO,
  REPORT_TYPE_INFO,
  type MarketingMetricTemplate,
} from '@/lib/report-utils';
import type { MarketingCampaignType, MarketingObjective } from '@/lib/schemas/report.schema';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
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
import { AlertCircle, ArrowLeft, Calendar, FileText, Loader2, Megaphone, Plus, RotateCcw, Send, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type MetricEntry = MarketingMetricTemplate;

const REPORT_TYPE = 'marketing' as const;
const INTEGER_ONLY_UNITS = new Set(['count']);
const TENTH_STEP_UNITS = new Set(['seconds']);
const HUNDREDTH_STEP_UNITS = new Set(['%', 'php', 'x']);

interface MetricValueRule {
  min?: number;
  step: string;
  allowDecimal: boolean;
}

function normalizeMetricUnit(unit: string): string {
  return unit.trim().toLowerCase();
}

function normalizeMetricName(name: string): string {
  return name.trim().toLowerCase();
}

function getMetricValueRule(metricName: string, unit: string): MetricValueRule {
  const normalizedUnit = normalizeMetricUnit(unit);
  const normalizedName = normalizeMetricName(metricName);

  if (normalizedName === 'frequency') {
    return {
      min: 1,
      step: '0.01',
      allowDecimal: true,
    };
  }

  if (INTEGER_ONLY_UNITS.has(normalizedUnit)) {
    return {
      min: 0,
      step: '1',
      allowDecimal: false,
    };
  }

  if (TENTH_STEP_UNITS.has(normalizedUnit)) {
    return {
      min: 0,
      step: '0.1',
      allowDecimal: true,
    };
  }

  if (HUNDREDTH_STEP_UNITS.has(normalizedUnit)) {
    return {
      min: 0,
      step: '0.01',
      allowDecimal: true,
    };
  }

  return {
    min: 0,
    step: '0.01',
    allowDecimal: true,
  };
}

function sanitizeMetricValue(value: string, metricName: string, unit: string): string {
  if (!value.trim()) {
    return '';
  }

  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue)) {
    return '0';
  }

  const rule = getMetricValueRule(metricName, unit);

  if (!rule.allowDecimal) {
    const roundedValue = Math.round(parsedValue);
    const clampedValue = rule.min !== undefined ? Math.max(rule.min, roundedValue) : roundedValue;
    return String(clampedValue);
  }

  const clampedValue = rule.min !== undefined ? Math.max(rule.min, parsedValue) : parsedValue;
  return String(clampedValue);
}

function parseMetricValue(value: string, metricName: string, unit: string): number {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue)) {
    return 0;
  }

  const rule = getMetricValueRule(metricName, unit);

  if (!rule.allowDecimal) {
    const roundedValue = Math.round(parsedValue);
    return rule.min !== undefined ? Math.max(rule.min, roundedValue) : roundedValue;
  }

  return rule.min !== undefined ? Math.max(rule.min, parsedValue) : parsedValue;
}

export default function NewReportPage() {
  const router = useRouter();
  const handleBack = useBackNavigation({ fallbackPath: '/reports' });
  const createReport = useCreateReport();
  const { addToast } = useToast();
  const marketingAccess = useMarketingReportsAccess();

  const [campaignName, setCampaignName] = useState('');
  const [campaignType, setCampaignType] = useState<MarketingCampaignType>('awareness');
  const [objective, setObjective] = useState<MarketingObjective>('brand_awareness');
  const [primaryChannel, setPrimaryChannel] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);

  const [metrics, setMetrics] = useState<Array<MetricEntry>>(() => createMarketingMetricPreset('brand_awareness'));
  const [nextWeekPlans, setNextWeekPlans] = useState<Array<string>>(['']);

  const typeInfo = REPORT_TYPE_INFO[REPORT_TYPE];
  const selectedCampaignType = useMemo(
    () => MARKETING_CAMPAIGN_TYPE_OPTIONS.find((option) => option.value === campaignType),
    [campaignType]
  );
  const availableObjectives = useMemo(
    () => getMarketingObjectivesForCampaignType(campaignType),
    [campaignType]
  );
  const selectedObjectiveInfo = MARKETING_OBJECTIVE_INFO[objective];

  useEffect(() => {
    if (!availableObjectives.includes(objective)) {
      setObjective(availableObjectives[0] ?? 'brand_awareness');
    }
  }, [availableObjectives, objective]);

  useEffect(() => {
    setMetrics(createMarketingMetricPreset(objective));
  }, [objective]);

  const validateBaseFields = useCallback((): string | null => {
    if (!campaignName.trim()) {
      return 'Campaign name is required.';
    }

    if (!periodStart || !periodEnd) {
      return 'Select the reporting period start and end dates.';
    }

    if (!primaryChannel.trim()) {
      return 'Primary channel is required.';
    }

    if (!targetAudience.trim()) {
      return 'Target audience is required.';
    }

    return null;
  }, [campaignName, periodEnd, periodStart, primaryChannel, targetAudience]);

  const buildReportPayload = useCallback(
    (asDraft: boolean) => {
      const validMetrics = metrics
        .filter((metric) => metric.name.trim().length > 0)
        .map((metric) => ({
          metricName: metric.name,
          metricValue: parseMetricValue(metric.value, metric.name, metric.unit),
          metricUnit: metric.unit || 'count',
        }));

      return {
        reportType: REPORT_TYPE,
        periodStart,
        periodEnd,
        status: asDraft ? ('draft' as const) : ('submitted' as const),
        notes: buildNarrativeReportNotes({
          summary: notes,
          nextWeekPlans,
        }),
        marketingContext: {
          campaignName: campaignName.trim(),
          campaignType,
          objective,
          primaryChannel: primaryChannel.trim(),
          targetAudience: targetAudience.trim(),
        },
        metrics: validMetrics,
      };
    },
    [
      campaignName,
      campaignType,
      metrics,
      nextWeekPlans,
      notes,
      objective,
      periodEnd,
      periodStart,
      primaryChannel,
      targetAudience,
    ]
  );

  const autoSaveDraft = useCallback(async (): Promise<void> => {
    if (isSavingRef.current || validateBaseFields() !== null) {
      return;
    }

    isSavingRef.current = true;

    try {
      const payload = buildReportPayload(true);

      if (createdId) {
        const response = await fetch(`/api/reports/${createdId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          setLastSavedAt(new Date());
        }
      } else {
        const response = await createReport.mutateAsync(payload);
        setCreatedId(response.data.id);
        setLastSavedAt(new Date());
      }
    } catch {
      // Silent failure keeps auto-save unobtrusive.
    } finally {
      isSavingRef.current = false;
    }
  }, [buildReportPayload, createReport, createdId, validateBaseFields]);

  useEffect(() => {
    if (validateBaseFields() !== null) {
      return;
    }

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      void autoSaveDraft();
    }, 10_000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [
    autoSaveDraft,
    campaignName,
    campaignType,
    metrics,
    nextWeekPlans,
    notes,
    objective,
    periodEnd,
    periodStart,
    primaryChannel,
    targetAudience,
    validateBaseFields,
  ]);

  const handleStringArrayChange = (
    index: number,
    value: string,
    setter: React.Dispatch<React.SetStateAction<Array<string>>>
  ) => {
    setter((previous) => {
      const updated = [...previous];
      updated[index] = value;
      return updated;
    });
  };

  const handleAddItem = (setter: React.Dispatch<React.SetStateAction<Array<string>>>) => {
    setter((previous) => [...previous, '']);
  };

  const handleRemoveItem = (
    index: number,
    setter: React.Dispatch<React.SetStateAction<Array<string>>>
  ) => {
    setter((previous) => (previous.length > 1 ? previous.filter((_, itemIndex) => itemIndex !== index) : previous));
  };

  const handleMetricChange = (index: number, field: keyof MetricEntry, value: string) => {
    setMetrics((previous) =>
      previous.map((metric, metricIndex) =>
        metricIndex === index
          ? (() => {
              const nextUnit = field === 'unit' ? value : metric.unit;
              const nextValue =
                field === 'value'
                  ? value
                  : field === 'unit'
                    ? sanitizeMetricValue(metric.value, metric.name, nextUnit)
                    : metric.value;

              return {
                ...metric,
                name: field === 'name' ? value : metric.name,
                value: nextValue,
                unit: nextUnit,
              };
            })()
          : metric
      )
    );
  };

  const handleMetricBlur = (index: number) => {
    setMetrics((previous) =>
      previous.map((metric, metricIndex) =>
        metricIndex === index
          ? {
              ...metric,
              value: sanitizeMetricValue(metric.value, metric.name, metric.unit),
            }
          : metric
      )
    );
  };

  const handleAddMetric = () => {
    setMetrics((previous) => [
      ...previous,
      {
        name: '',
        value: '0',
        unit: 'count',
        locked: false,
        analyticsCategory: 'supporting',
      },
    ]);
  };

  const handleRemoveMetric = (index: number) => {
    setMetrics((previous) => (previous.length > 1 ? previous.filter((_, metricIndex) => metricIndex !== index) : previous));
  };

  const handleResetMetrics = () => {
    setMetrics(createMarketingMetricPreset(objective));
  };

  const validateRequiredSections = (): string | null => {
    const filledMetrics = metrics.filter((metric) => metric.name.trim());
    if (filledMetrics.length === 0) {
      return 'Please add at least one metric.';
    }

    return null;
  };

  const handleSubmit = async (asDraft: boolean) => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    setErrorMessage(null);

    const baseValidationError = validateBaseFields();
    if (baseValidationError) {
      setErrorMessage(baseValidationError);
      addToast({
        title: 'Validation Error',
        description: baseValidationError,
        variant: 'error',
      });
      return;
    }

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
        const response = await fetch(`/api/reports/${createdId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error('Failed to update report');
        }

        reportId = createdId;
      } else {
        const response = await createReport.mutateAsync(payload);
        reportId = response.data.id;
      }

      addToast({
        title: 'Marketing report saved',
        description: asDraft ? 'Draft saved successfully' : 'Marketing report submitted for review',
        variant: 'success',
      });

      router.push(`/reports/${reportId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save marketing report';
      setErrorMessage(message);
      addToast({
        title: 'Error',
        description: message,
        variant: 'error',
      });
    }
  };

  if (marketingAccess.isLoading) {
    return (
      <EmptyState
        icon={<Loader2 className="h-5 w-5 animate-spin" />}
        title="Loading marketing report form"
        description="Checking your access before opening the report composer."
      />
    );
  }

  if (!marketingAccess.canAccess) {
    return (
      <MarketingReportsAccessState
        reason={marketingAccess.reason}
        fallbackHref={marketingAccess.user?.role === 'intern' ? '/intern/dashboard' : '/dashboard'}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Create Marketing Report</h1>
          <p className="text-muted-foreground">Capture campaign context first, then log the metrics that match the objective.</p>
        </div>
      </div>

      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit(false);
        }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-700" />
              Campaign Context
            </CardTitle>
            <CardDescription>
              This page is now marketing-only. The campaign type controls which objectives and recommended metrics are shown.
            </CardDescription>
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
                  <Input id="reportType" value={typeInfo?.label ?? 'Marketing'} readOnly className="h-10" />
                </FormGroup>
                <FormGroup
                  label="Campaign Name"
                  htmlFor="campaignName"
                  required
                  showOptional={false}
                  description="Use the working campaign name used by the marketing team."
                  icon={<Megaphone className="h-3.5 w-3.5" />}
                >
                  <Input
                    id="campaignName"
                    value={campaignName}
                    onChange={(event) => setCampaignName(event.target.value)}
                    placeholder="Q2 Lead Sprint - Meta"
                    className="h-10"
                    required
                  />
                </FormGroup>
                <FormGroup
                  label="Campaign Type"
                  htmlFor="campaignType"
                  required
                  showOptional={false}
                  description={selectedCampaignType?.description}
                >
                  <Select value={campaignType} onValueChange={(value) => setCampaignType(value as MarketingCampaignType)}>
                    <SelectTrigger id="campaignType" className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MARKETING_CAMPAIGN_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormGroup>
                <FormGroup
                  label="Objective"
                  htmlFor="objective"
                  required
                  showOptional={false}
                  description={selectedObjectiveInfo?.description}
                >
                  <Select value={objective} onValueChange={(value) => setObjective(value as MarketingObjective)}>
                    <SelectTrigger id="objective" className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableObjectives.map((objectiveValue) => (
                        <SelectItem key={objectiveValue} value={objectiveValue}>
                          {MARKETING_OBJECTIVE_INFO[objectiveValue].label}
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
                <FormGroup
                  label="Primary Channel"
                  htmlFor="primaryChannel"
                  required
                  showOptional={false}
                  description="Examples: Meta Ads, Google Search, Email, LinkedIn Organic"
                >
                  <Input
                    id="primaryChannel"
                    value={primaryChannel}
                    onChange={(event) => setPrimaryChannel(event.target.value)}
                    placeholder="Meta Ads"
                    className="h-10"
                    required
                  />
                </FormGroup>
                <FormGroup
                  label="Target Audience"
                  htmlFor="targetAudience"
                  required
                  showOptional={false}
                  description="Describe the audience or segment this campaign is aimed at."
                >
                  <Input
                    id="targetAudience"
                    value={targetAudience}
                    onChange={(event) => setTargetAudience(event.target.value)}
                    placeholder="SMB founders in Metro Manila"
                    className="h-10"
                    required
                  />
                </FormGroup>
              </div>

              <FormGroup label="Campaign Summary" htmlFor="notes">
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  placeholder="Briefly explain the campaign angle, creative direction, or what changed during this reporting window..."
                  className="resize-none"
                />
              </FormGroup>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>
                Metrics <span className="text-rose-500">*</span>
              </span>
              <Badge variant="secondary" className="h-5 rounded-full px-2 text-[11px] font-medium">
                Preset
              </Badge>
            </CardTitle>
            <CardDescription>
              Recommended metrics are aligned to the selected objective. Preset names and units stay locked by default, but you can still remove preset rows or add custom metrics.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics.map((metric, index) => (
              <div
                key={`${metric.name}-${index}`}
                className="grid gap-2 md:grid-cols-[minmax(0,1fr)_140px_104px_40px] md:items-end"
              >
                <div className="space-y-1">
                  {index === 0 ? (
                    <Label className="text-xs text-muted-foreground">Name</Label>
                  ) : null}
                  <Input
                    placeholder="Metric name"
                    value={metric.name}
                    readOnly={metric.locked}
                    onChange={(event) => handleMetricChange(index, 'name', event.target.value)}
                    className={metric.locked ? 'bg-muted/40 text-muted-foreground' : undefined}
                  />
                </div>
                <div className="space-y-1">
                  {index === 0 && (
                    <Label className="text-xs text-muted-foreground">Value</Label>
                  )}
                  <Input
                    type="number"
                    min={getMetricValueRule(metric.name, metric.unit).min ?? 0}
                    step={getMetricValueRule(metric.name, metric.unit).step}
                    value={metric.value}
                    onChange={(event) => handleMetricChange(index, 'value', event.target.value)}
                    onBlur={() => handleMetricBlur(index)}
                  />
                </div>
                <div className="space-y-1">
                  {index === 0 && (
                    <Label className="text-xs text-muted-foreground">Unit</Label>
                  )}
                  <Input
                    placeholder="count"
                    value={metric.unit}
                    readOnly={metric.locked}
                    onChange={(event) => handleMetricChange(index, 'unit', event.target.value)}
                    onBlur={() => handleMetricBlur(index)}
                    className={metric.locked ? 'bg-muted/40 text-muted-foreground' : undefined}
                  />
                </div>
                <div className="flex items-end md:justify-center">
                  {metrics.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Remove metric"
                      onClick={() => handleRemoveMetric(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}

            <Separator />

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleResetMetrics}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset to Objective Preset
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleAddMetric}>
                <Plus className="h-4 w-4 mr-1" />
                Add Metric
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Next Steps
            </CardTitle>
            <CardDescription>Document the next experiments, fixes, or follow-through for the campaign.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {nextWeekPlans.map((item, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder={`Next step ${index + 1}`}
                  value={item}
                  onChange={(event) => handleStringArrayChange(index, event.target.value, setNextWeekPlans)}
                  className="flex-1"
                />
                {nextWeekPlans.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove next step"
                    onClick={() => handleRemoveItem(index, setNextWeekPlans)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => handleAddItem(setNextWeekPlans)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Next Step
            </Button>
          </CardContent>
        </Card>

        {errorMessage && (
          <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-600 animate-in slide-in-from-top-2 fade-in duration-200 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-400">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-zinc-200 pt-4 pb-8 dark:border-zinc-800">
          {lastSavedAt && (
            <span className="mr-auto text-xs text-muted-foreground">
              Auto-saved {lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            disabled={createReport.isPending}
            onClick={() => void handleSubmit(true)}
          >
            <FileText className="h-4 w-4" />
            Save Draft
          </Button>
          <Button type="submit" disabled={createReport.isPending} className="min-w-[160px]">
            {createReport.isPending ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Submitting...
              </span>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit Report
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
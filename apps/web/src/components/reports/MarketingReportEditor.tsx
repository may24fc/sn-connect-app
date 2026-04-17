'use client';

import { MarketingReportsAccessState } from '@/components/reports/MarketingReportsAccessState';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { useCreateReport } from '@/hooks/useCreateReport';
import { useMarketingReportsAccess } from '@/hooks/useMarketingReportsAccess';
import { useReport } from '@/hooks/useReport';
import { useUpdateReport } from '@/hooks/useUpdateReport';
import {
  buildNarrativeReportNotes,
  createMarketingMetricPreset,
  getMarketingObjectivesForCampaignType,
  MARKETING_CAMPAIGN_TYPE_OPTIONS,
  MARKETING_OBJECTIVE_INFO,
  MARKETING_PRIMARY_CHANNEL_OPTIONS,
  parseNoteSections,
  REPORT_TYPE_INFO,
  type MarketingMetricTemplate,
} from '@/lib/report-utils';
import type {
  MarketingCampaignType,
  MarketingObjective,
  MarketingPrimaryChannel,
  ReportCreateInput,
} from '@/lib/schemas/report.schema';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
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
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  FileText,
  Loader2,
  Megaphone,
  Plus,
  RotateCcw,
  Send,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type MetricEntry = MarketingMetricTemplate;

const REPORT_TYPE = 'marketing' as const;
const INTEGER_ONLY_UNITS = new Set(['count']);
const TENTH_STEP_UNITS = new Set(['seconds']);
const HUNDREDTH_STEP_UNITS = new Set(['%', 'php', 'usd', 'x']);
const MARKETING_PRIMARY_CHANNEL_SET = new Set(
  MARKETING_PRIMARY_CHANNEL_OPTIONS.map((option) => option.value)
);

interface MetricValueRule {
  min?: number;
  step: string;
  allowDecimal: boolean;
}

interface MarketingReportEditorProps {
  mode: 'create' | 'edit';
  reportId?: string;
}

interface NumericInputAdornment {
  prefix?: string;
  suffix?: string;
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

function mapMetricsFromDraft(
  objective: MarketingObjective,
  metrics: Array<{ metric_name: string; metric_value: number; metric_unit: string | null }> | undefined
): Array<MetricEntry> {
  const presetMetrics = createMarketingMetricPreset(objective);
  const existingMetrics = new Map(
    (metrics ?? []).map((metric) => [normalizeMetricName(metric.metric_name), metric])
  );

  const resolvedMetrics = presetMetrics.map((presetMetric) => {
    const existingMetric = existingMetrics.get(normalizeMetricName(presetMetric.name));

    if (existingMetric) {
      existingMetrics.delete(normalizeMetricName(presetMetric.name));
      return {
        ...presetMetric,
        value: String(existingMetric.metric_value ?? 0),
        unit: existingMetric.metric_unit || presetMetric.unit,
      };
    }

    return presetMetric;
  });

  existingMetrics.forEach((metric) => {
    resolvedMetrics.push({
      name: metric.metric_name,
      value: String(metric.metric_value ?? 0),
      unit: metric.metric_unit || 'count',
      locked: false,
      analyticsCategory: 'supporting',
    });
  });

  return resolvedMetrics.length > 0 ? resolvedMetrics : createMarketingMetricPreset(objective);
}

function normalizePrimaryChannel(channel: string | null | undefined): MarketingPrimaryChannel | '' {
  if (!channel || !MARKETING_PRIMARY_CHANNEL_SET.has(channel as MarketingPrimaryChannel)) {
    return '';
  }

  return channel as MarketingPrimaryChannel;
}

function getNumericInputAdornment(unit: string): NumericInputAdornment {
  const normalizedUnit = normalizeMetricUnit(unit);

  if (normalizedUnit === 'usd' || normalizedUnit === 'php') {
    return { prefix: '$' };
  }

  if (normalizedUnit === '%') {
    return { suffix: '%' };
  }

  if (normalizedUnit === 'seconds') {
    return { suffix: 'sec' };
  }

  if (normalizedUnit === 'x') {
    return { suffix: 'x' };
  }

  return {};
}

export function MarketingReportEditor({ mode, reportId }: MarketingReportEditorProps) {
  const isEditMode = mode === 'edit';
  const router = useRouter();
  const handleBack = useBackNavigation({ fallbackPath: isEditMode && reportId ? `/reports/${reportId}` : '/reports' });
  const createReport = useCreateReport();
  const updateReport = useUpdateReport();
  const { addToast } = useToast();
  const marketingAccess = useMarketingReportsAccess();
  const { data: reportData, isLoading: isReportLoading, error: reportError } = useReport(
    isEditMode ? reportId : null
  );

  const report = reportData?.data;
  const hydratedDraftIdRef = useRef<string | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);

  const [activeReportId, setActiveReportId] = useState<string | null>(reportId ?? null);
  const [isFormReady, setIsFormReady] = useState(!isEditMode);
  const [campaignName, setCampaignName] = useState('');
  const [campaignType, setCampaignType] = useState<MarketingCampaignType>('awareness');
  const [objective, setObjective] = useState<MarketingObjective>('brand_awareness');
  const [totalSpend, setTotalSpend] = useState('0');
  const [primaryChannel, setPrimaryChannel] = useState<MarketingPrimaryChannel | ''>('');
  const [targetAudience, setTargetAudience] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [metrics, setMetrics] = useState<Array<MetricEntry>>(() =>
    createMarketingMetricPreset('brand_awareness')
  );

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
  const isMutating = createReport.isPending || updateReport.isPending;
  const totalSpendAdornment = getNumericInputAdornment('usd');

  useEffect(() => {
    if (!isEditMode || !report || hydratedDraftIdRef.current === report.id) {
      return;
    }

    if (report.status !== 'draft') {
      setIsFormReady(true);
      hydratedDraftIdRef.current = report.id;
      return;
    }

    const marketingContext = report.marketing_context;
    const noteSections = parseNoteSections(report.notes || '');
    const nextObjective = marketingContext?.objective ?? 'brand_awareness';

    setCampaignName(marketingContext?.campaignName ?? '');
    setCampaignType(marketingContext?.campaignType ?? 'awareness');
    setObjective(nextObjective);
    setTotalSpend(String(marketingContext?.totalSpend ?? 0));
    setPrimaryChannel(normalizePrimaryChannel(marketingContext?.primaryChannel));
    setTargetAudience(marketingContext?.targetAudience ?? '');
    setPeriodStart(report.period_start ?? '');
    setPeriodEnd(report.period_end ?? '');
    setNotes(noteSections.summary ?? '');
    setMetrics(mapMetricsFromDraft(nextObjective, report.report_metrics));
    setActiveReportId(report.id);
    setLastSavedAt(report.updated_at ? new Date(report.updated_at) : null);
    setErrorMessage(null);
    setIsFormReady(true);
    hydratedDraftIdRef.current = report.id;
  }, [isEditMode, report]);

  const validateBaseFields = useCallback((): string | null => {
    if (!campaignName.trim()) {
      return 'Campaign name is required.';
    }

    if (!periodStart || !periodEnd) {
      return 'Select the reporting period start and end dates.';
    }

    const parsedSpend = Number(totalSpend);
    if (!Number.isFinite(parsedSpend) || parsedSpend < 0) {
      return 'Total spend must be a valid non-negative amount.';
    }

    if (!primaryChannel.trim()) {
      return 'Primary channel is required.';
    }

    if (!targetAudience.trim()) {
      return 'Target audience is required.';
    }

    if (!notes.trim()) {
      return 'Campaign summary is required.';
    }

    return null;
  }, [campaignName, notes, periodEnd, periodStart, primaryChannel, targetAudience, totalSpend]);

  const buildReportPayload = useCallback(
    (asDraft: boolean): ReportCreateInput => {
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
        }),
        marketingContext: {
          campaignName: campaignName.trim(),
          campaignType,
          objective,
          totalSpend: Number(totalSpend),
          primaryChannel: primaryChannel as MarketingPrimaryChannel,
          targetAudience: targetAudience.trim(),
        },
        metrics: validMetrics,
      };
    },
    [
      campaignName,
      campaignType,
      metrics,
      notes,
      objective,
      periodEnd,
      periodStart,
      primaryChannel,
      targetAudience,
      totalSpend,
    ]
  );

  const autoSaveDraft = useCallback(async (): Promise<void> => {
    if (!isFormReady || isSavingRef.current || validateBaseFields() !== null) {
      return;
    }

    isSavingRef.current = true;

    try {
      const payload = buildReportPayload(true);

      if (activeReportId) {
        await updateReport.mutateAsync({ id: activeReportId, payload });
        setLastSavedAt(new Date());
        return;
      }

      const response = await createReport.mutateAsync(payload);
      setActiveReportId(response.data.id);
      setLastSavedAt(new Date());
    } catch {
      // Silent failure keeps auto-save unobtrusive.
    } finally {
      isSavingRef.current = false;
    }
  }, [activeReportId, buildReportPayload, createReport, isFormReady, updateReport, validateBaseFields]);

  useEffect(() => {
    if (!isFormReady || validateBaseFields() !== null) {
      return;
    }

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      void autoSaveDraft();
    }, 10000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [
    autoSaveDraft,
    campaignName,
    campaignType,
    isFormReady,
    metrics,
    notes,
    objective,
    periodEnd,
    periodStart,
    primaryChannel,
    targetAudience,
    totalSpend,
    validateBaseFields,
  ]);

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

  const handleCampaignTypeChange = (value: MarketingCampaignType) => {
    const nextObjectives = getMarketingObjectivesForCampaignType(value);
    const nextObjective = nextObjectives[0] ?? 'brand_awareness';
    setCampaignType(value);
    setObjective(nextObjective);
    setMetrics(createMarketingMetricPreset(nextObjective));
  };

  const handleObjectiveChange = (value: MarketingObjective) => {
    setObjective(value);
    setMetrics(createMarketingMetricPreset(value));
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
    setMetrics((previous) =>
      previous.length > 1 ? previous.filter((_, metricIndex) => metricIndex !== index) : previous
    );
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
      let resolvedReportId = activeReportId;

      if (resolvedReportId) {
        await updateReport.mutateAsync({ id: resolvedReportId, payload });
      } else {
        const response = await createReport.mutateAsync(payload);
        resolvedReportId = response.data.id;
        setActiveReportId(response.data.id);
      }

      addToast({
        title: isEditMode ? 'Marketing draft updated' : 'Marketing report saved',
        description: asDraft
          ? isEditMode
            ? 'Draft changes saved successfully'
            : 'Draft saved successfully'
          : isEditMode
            ? 'Draft submitted for review'
            : 'Marketing report submitted for review',
        variant: 'success',
      });

      router.push(`/reports/${resolvedReportId}`);
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

  if (marketingAccess.isLoading || (isEditMode && isReportLoading && !isFormReady)) {
    return (
      <EmptyState
        icon={<Loader2 className="h-5 w-5 animate-spin" />}
        title={isEditMode ? 'Loading marketing draft' : 'Loading marketing report form'}
        description={
          isEditMode
            ? 'Fetching the draft details before opening the editor.'
            : 'Checking your access before opening the report composer.'
        }
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

  if (isEditMode && reportError) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Unable to load draft"
        description="Refresh and try again, or go back to your reports list."
        action={{ label: 'Back to reports', onClick: handleBack }}
      />
    );
  }

  if (isEditMode && !report) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Draft not found"
        description="The requested draft could not be found or you no longer have access to it."
        action={{ label: 'Back to reports', onClick: handleBack }}
      />
    );
  }

  if (isEditMode && report?.status !== 'draft') {
    const existingReportId = report?.id ?? reportId ?? '';

    return (
      <EmptyState
        icon={AlertCircle}
        title="Only drafts can be edited"
        description="This marketing report has already been submitted or reviewed, so it can no longer be edited."
        action={{ label: 'Open report', onClick: () => router.push(`/reports/${existingReportId}`) }}
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
          <h1 className="text-2xl font-bold text-foreground">
            {isEditMode ? 'Edit Marketing Report Draft' : 'Create Marketing Report'}
          </h1>
          <p className="text-muted-foreground">
            {isEditMode
              ? 'Update the saved campaign draft before submitting it for review.'
              : 'Capture campaign context first, then log the metrics that match the objective.'}
          </p>
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
              This page is marketing-only. The campaign type controls which objectives and recommended metrics are shown.
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
                  <Select value={campaignType} onValueChange={(value) => handleCampaignTypeChange(value as MarketingCampaignType)}>
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
                  <Select value={objective} onValueChange={(value) => handleObjectiveChange(value as MarketingObjective)}>
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
                  description="Only paid marketing channels used in the super-admin review flow are allowed here."
                >
                  <Select
                    value={primaryChannel}
                    onValueChange={(value) => setPrimaryChannel(value as MarketingPrimaryChannel)}
                  >
                    <SelectTrigger id="primaryChannel" className="h-10">
                      <SelectValue placeholder="Select a primary channel" />
                    </SelectTrigger>
                    <SelectContent>
                      {MARKETING_PRIMARY_CHANNEL_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Spend</CardTitle>
            <CardDescription>
              Log the full amount spent for this reporting window. Keep efficiency metrics like CPM or CPC inside the metrics section below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormGroup
              htmlFor="totalSpend"
              required
              showOptional={false}
              description="Use the actual spend for the campaign during this period, in US dollars."
            >
              <div className="relative">
                {totalSpendAdornment.prefix ? (
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
                    {totalSpendAdornment.prefix}
                  </span>
                ) : null}
                <Input
                  id="totalSpend"
                  type="number"
                  min="0"
                  step="0.01"
                  value={totalSpend}
                  onChange={(event) => setTotalSpend(event.target.value)}
                  placeholder="0.00"
                  className={cn('h-10', totalSpendAdornment.prefix ? 'pl-7' : undefined)}
                  required
                />
              </div>
            </FormGroup>
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
            {metrics.map((metric, index) => {
              const metricValueRule = getMetricValueRule(metric.name, metric.unit);
              const metricValueAdornment = getNumericInputAdornment(metric.unit);

              return (
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
                    {index === 0 && <Label className="text-xs text-muted-foreground">Value</Label>}
                    <div className="relative">
                      {metricValueAdornment.prefix ? (
                        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
                          {metricValueAdornment.prefix}
                        </span>
                      ) : null}
                      <Input
                        type="text"
                        inputMode={metricValueRule.allowDecimal ? 'decimal' : 'numeric'}
                        value={metric.value}
                        onChange={(event) => handleMetricChange(index, 'value', event.target.value)}
                        onBlur={() => handleMetricBlur(index)}
                        className={cn(
                          metricValueAdornment.prefix ? 'pl-7' : undefined,
                          metricValueAdornment.suffix === 'sec'
                            ? 'pr-12'
                            : metricValueAdornment.suffix
                              ? 'pr-8'
                              : undefined
                        )}
                      />
                      {metricValueAdornment.suffix ? (
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                          {metricValueAdornment.suffix}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="space-y-1">
                    {index === 0 && <Label className="text-xs text-muted-foreground">Unit</Label>}
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
              );
            })}

            <Separator />

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleResetMetrics}>
                <RotateCcw className="mr-1 h-4 w-4" />
                Reset to Objective Preset
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleAddMetric}>
                <Plus className="mr-1 h-4 w-4" />
                Add Metric
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <span>
                Campaign Summary <span className="text-rose-500">*</span>
              </span>
            </CardTitle>
            <CardDescription>
              Summarize the campaign angle, creative direction, performance context, or important changes during this reporting window.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={5}
              placeholder="Summarize what happened in this campaign period, what changed, and the key context reviewers should know..."
              className="resize-none"
              required
            />
          </CardContent>
        </Card>

        {errorMessage && (
          <div className="animate-in slide-in-from-top-2 fade-in flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-600 duration-200 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-400">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-zinc-200 pb-8 pt-4 dark:border-zinc-800">
          {lastSavedAt && (
            <span className="mr-auto text-xs text-muted-foreground">
              Auto-saved {lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <Button type="button" variant="outline" disabled={isMutating} onClick={() => void handleSubmit(true)}>
            <FileText className="h-4 w-4" />
            {isEditMode ? 'Save Changes' : 'Save Draft'}
          </Button>
          <Button type="submit" disabled={isMutating} className="min-w-[160px]">
            {isMutating ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                {isEditMode ? 'Updating...' : 'Submitting...'}
              </span>
            ) : (
              <>
                <Send className="h-4 w-4" />
                {isEditMode ? 'Update & Submit' : 'Submit Report'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
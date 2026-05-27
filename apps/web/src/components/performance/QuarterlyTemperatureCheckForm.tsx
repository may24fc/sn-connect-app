'use client';

import {
  type SubmitQuarterlyTemperatureCheckInput,
  submitQuarterlyTemperatureCheckSchema,
} from '@/lib/schemas/performance.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Skeleton,
  Textarea,
  useToast,
} from '@hr-portal/ui';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  type QuarterlyTemperatureCheckDetailField,
  type QuarterlyTemperatureCheckRecord,
  quarterlyTemperatureCheckDetailSections,
} from './quarterlyTemperatureCheckDetailConfig';

type PerformanceIdentityProfile = {
  fullName: string;
  departmentRole: string;
};

type CurrentQuarterlyResponse = {
  data: {
    quarterKey: string;
    profile: PerformanceIdentityProfile;
    submission: QuarterlyTemperatureCheckRecord | null;
    isSubmitted: boolean;
  };
  error?: string;
};

type TextareaFieldName = Exclude<
  keyof SubmitQuarterlyTemperatureCheckInput,
  'quarterKey' | 'fullName' | 'departmentRole' | 'energyWorkloadScore' | 'overallExperienceScore'
>;

function getCurrentQuarterKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `${year}-Q${quarter}`;
}

function formatQuarterKey(quarterKey: string): string {
  const [year, quarter] = quarterKey.split('-Q');
  return `Q${quarter} ${year}`;
}

function toFormValues(
  record: QuarterlyTemperatureCheckRecord
): SubmitQuarterlyTemperatureCheckInput {
  return {
    quarterKey: record.quarter_key,
    fullName: record.full_name,
    departmentRole:
      record.department_role as SubmitQuarterlyTemperatureCheckInput['departmentRole'],
    energyWorkloadScore: record.energy_workload_score,
    energyWorkloadReason: record.energy_workload_reason,
    claritySupport: record.clarity_support,
    improvementChange: record.improvement_change,
    achievementRecognition: record.achievement_recognition,
    feedbackSuggestions: record.feedback_suggestions,
    overallExperienceScore: record.overall_experience_score,
    overallExperienceReason: record.overall_experience_reason,
  };
}

function buildDefaultValues(
  quarterKey: string,
  profile: PerformanceIdentityProfile
): SubmitQuarterlyTemperatureCheckInput {
  return {
    quarterKey,
    fullName: profile.fullName,
    departmentRole: profile.departmentRole,
    energyWorkloadScore: 7,
    energyWorkloadReason: '',
    claritySupport: '',
    improvementChange: '',
    achievementRecognition: '',
    feedbackSuggestions: '',
    overallExperienceScore: 4,
    overallExperienceReason: '',
  };
}

function renderRequiredLabel(label: string, htmlFor?: string) {
  return (
    <Label htmlFor={htmlFor}>
      {label}
      <span className="ml-1 text-destructive">*</span>
    </Label>
  );
}

export function QuarterlyTemperatureCheckForm() {
  const { addToast } = useToast();
  const [quarterKey, setQuarterKey] = useState<string>(getCurrentQuarterKey());
  const [loading, setLoading] = useState(true);
  const [submittedRecord, setSubmittedRecord] = useState<QuarterlyTemperatureCheckRecord | null>(
    null
  );
  const [currentProfile, setCurrentProfile] = useState<PerformanceIdentityProfile>({
    fullName: '',
    departmentRole: '',
  });

  const {
    handleSubmit,
    register,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SubmitQuarterlyTemperatureCheckInput>({
    resolver: zodResolver(submitQuarterlyTemperatureCheckSchema),
    defaultValues: buildDefaultValues(quarterKey, currentProfile),
  });

  useEffect(() => {
    let active = true;

    async function loadCurrentSubmission() {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/performance/quarterly-temperature-checks?quarterKey=${getCurrentQuarterKey()}`,
          {
            method: 'GET',
            credentials: 'include',
          }
        );

        const payload = (await response.json()) as CurrentQuarterlyResponse;
        if (!response.ok || !payload.data) {
          throw new Error(payload.error || 'Failed to load quarterly temperature check');
        }

        if (!active) return;

        setQuarterKey(payload.data.quarterKey);
        setCurrentProfile(payload.data.profile);
        if (payload.data.submission) {
          setSubmittedRecord(payload.data.submission);
          reset(toFormValues(payload.data.submission));
        } else {
          setSubmittedRecord(null);
          reset(buildDefaultValues(payload.data.quarterKey, payload.data.profile));
        }
      } catch (error) {
        if (!active) return;

        addToast({
          title: 'Unable to load quarterly temperature check',
          description: error instanceof Error ? error.message : 'Please refresh and try again.',
          variant: 'error',
        });
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadCurrentSubmission();

    return () => {
      active = false;
    };
  }, [addToast, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const response = await fetch('/api/performance/quarterly-temperature-checks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...values,
          quarterKey,
          energyWorkloadScore: Number(values.energyWorkloadScore),
          overallExperienceScore: Number(values.overallExperienceScore),
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.data) {
        throw new Error(payload.error || 'Failed to submit temperature check');
      }

      setSubmittedRecord(payload.data as QuarterlyTemperatureCheckRecord);
      reset(toFormValues(payload.data as QuarterlyTemperatureCheckRecord));

      addToast({
        title: 'Quarterly temperature check submitted',
        description: 'Your response is now locked for this quarter.',
        variant: 'success',
      });
    } catch (error) {
      addToast({
        title: 'Submission failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      });
    }
  });

  const renderTextareaField = (name: TextareaFieldName, label: string, helperText?: string) => {
    const fieldError = errors[name];

    return (
      <div className="space-y-2">
        {renderRequiredLabel(label, name)}
        {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
        <Textarea id={name} rows={4} {...register(name)} />
        {fieldError ? <p className="text-sm text-destructive">{fieldError.message}</p> : null}
      </div>
    );
  };

  const renderSubmittedField = (
    field: QuarterlyTemperatureCheckDetailField,
    record: QuarterlyTemperatureCheckRecord
  ) => {
    const value = field.value(record);
    const valueClassName = field.emphasizeValue
      ? 'mt-2 text-3xl font-semibold tracking-tight text-foreground'
      : field.preserveWhitespace
        ? 'mt-1 whitespace-pre-wrap text-sm text-muted-foreground'
        : 'mt-1 text-sm text-muted-foreground';

    return (
      <div key={field.label} className={field.fullWidth ? 'md:col-span-2' : undefined}>
        <p className="text-sm font-medium text-foreground">{field.label}</p>
        <p className={valueClassName}>{value}</p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (submittedRecord) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Card className="border-emerald-200 bg-emerald-50/60">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Quarterly temperature check submitted</CardTitle>
                <CardDescription>
                  Your {formatQuarterKey(submittedRecord.quarter_key)} response was submitted on{' '}
                  {new Date(submittedRecord.submitted_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                  .
                </CardDescription>
              </div>
              <Badge variant="success">Locked for this quarter</Badge>
            </div>
          </CardHeader>
        </Card>

        {quarterlyTemperatureCheckDetailSections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {section.fields.map((field) => renderSubmittedField(field, submittedRecord))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle>Quarterly Temperature Check</CardTitle>
          <CardDescription>
            Share a quarter-level pulse on energy, workload, support, process improvements, and
            overall experience. This check is designed to surface broader patterns leadership may
            miss in monthly reflections.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <p className="text-sm font-medium text-foreground">Current quarter</p>
            <p className="mt-1 text-sm text-muted-foreground">{formatQuarterKey(quarterKey)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Submission rule</p>
            <p className="mt-1 text-sm text-muted-foreground">
              One response per person per quarter
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Review audience</p>
            <p className="mt-1 text-sm text-muted-foreground">Leadership and HR review</p>
          </div>
        </CardContent>
      </Card>

      <form className="space-y-6" onSubmit={onSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>SECTION 1: ENERGY, CLARITY &amp; SUPPORT</CardTitle>
            <CardDescription>
              Capture how sustainable the quarter felt and whether expectations and support were
              clear enough.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              {renderRequiredLabel(
                '1. On a scale of 1-10, how was your overall energy and workload balance this quarter?',
                'energyWorkloadScore'
              )}
              <Input
                id="energyWorkloadScore"
                type="number"
                min={1}
                max={10}
                {...register('energyWorkloadScore', { valueAsNumber: true })}
              />
              {errors.energyWorkloadScore ? (
                <p className="text-sm text-destructive">{errors.energyWorkloadScore.message}</p>
              ) : null}
            </div>

            {renderTextareaField('energyWorkloadReason', 'What influenced your rating?')}
            {renderTextareaField(
              'claritySupport',
              '2. Did you feel clear on your goals and supported by the team this quarter? What could be improved?'
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SECTION 2: IMPROVEMENTS, GROWTH &amp; FEEDBACK</CardTitle>
            <CardDescription>
              Focus on one operational change, one proud achievement, and any feedback that would
              improve the team experience.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {renderTextareaField(
              'improvementChange',
              '3. If you could change ONE thing about how we work (process, tools, communication, etc.), what would it be?'
            )}
            {renderTextareaField(
              'achievementRecognition',
              "4. What's one achievement you're proud of this quarter, and is there anyone you'd like to recognize?"
            )}
            {renderTextareaField(
              'feedbackSuggestions',
              '5. Do you have any feedback or suggestions that could help improve how we work or your experience in the team?'
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SECTION 3: OVERALL EXPERIENCE</CardTitle>
            <CardDescription>
              Close with an overall quarter score and the reasoning behind it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              {renderRequiredLabel(
                '6. How would you describe your overall experience this quarter?',
                'overallExperienceScore'
              )}
              <p className="text-xs text-muted-foreground">
                Use a 1-5 scale where 1 = Very Poor and 5 = Excellent.
              </p>
              <Input
                id="overallExperienceScore"
                type="number"
                min={1}
                max={5}
                {...register('overallExperienceScore', { valueAsNumber: true })}
              />
              {errors.overallExperienceScore ? (
                <p className="text-sm text-destructive">{errors.overallExperienceScore.message}</p>
              ) : null}
            </div>

            {renderTextareaField(
              'overallExperienceReason',
              'Why did you rate it this way, and what went well or stood out the most?'
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? 'Submitting...'
              : `Submit ${formatQuarterKey(quarterKey)} temperature check`}
          </Button>
        </div>
      </form>
    </div>
  );
}

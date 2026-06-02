'use client';

import {
  getSubmissionEditStatus,
} from '@/lib/performance/submission-edit-status';
import {
  type SubmitFivePercentReflectionInput,
  submitFivePercentReflectionSchema,
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
  ToggleGroup,
  useToast,
} from '@hr-portal/ui';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { type FivePercentReflectionRecord } from './fivePercentReflectionDetailConfig';
import {
  clearEvaluationDraft,
  formatEvaluationDraftSavedAt,
  getEvaluationDraft,
  shouldRestoreEvaluationDraft,
  useAutoSaveEvaluationDraft,
} from './useEvaluationDraft';

type PerformanceIdentityProfile = {
  fullName: string;
  departmentRole: string;
};

type CurrentReflectionResponse = {
  data: {
    monthKey: string;
    profile: PerformanceIdentityProfile;
    submission: FivePercentReflectionRecord | null;
    isSubmitted: boolean;
  };
  error?: string;
};

type RankFieldName = 'workRank' | 'familyRank' | 'personalRank';

type TextareaFieldName = Exclude<
  keyof SubmitFivePercentReflectionInput,
  'monthKey' | 'fullName' | 'departmentRole' | RankFieldName
>;

type ReflectionSectionFieldNames = {
  feelings: TextareaFieldName;
  headline: TextareaFieldName;
  significance: TextareaFieldName;
  rank: RankFieldName;
  action: TextareaFieldName;
};

type ReflectionSectionDefinition = {
  key: 'work' | 'family' | 'personal';
  label: 'Work' | 'Family' | 'Personal';
  fields: ReflectionSectionFieldNames;
};

const reflectionSections: ReflectionSectionDefinition[] = [
  {
    key: 'work',
    label: 'Work',
    fields: {
      feelings: 'workFeelings',
      headline: 'workHeadline',
      significance: 'workSignificance',
      rank: 'workRank',
      action: 'workAction',
    },
  },
  {
    key: 'family',
    label: 'Family',
    fields: {
      feelings: 'familyFeelings',
      headline: 'familyHeadline',
      significance: 'familySignificance',
      rank: 'familyRank',
      action: 'familyAction',
    },
  },
  {
    key: 'personal',
    label: 'Personal',
    fields: {
      feelings: 'personalFeelings',
      headline: 'personalHeadline',
      significance: 'personalSignificance',
      rank: 'personalRank',
      action: 'personalAction',
    },
  },
];

const rankOptions = Array.from({ length: 10 }, (_, index) => {
  const value = String(index + 1);
  return { value, label: value };
});

function getCurrentMonthKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function formatMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year || new Date().getFullYear(), (month || 1) - 1, 1).toLocaleDateString(
    'en-US',
    {
      month: 'long',
      year: 'numeric',
    }
  );
}

function toFormValues(record: FivePercentReflectionRecord): SubmitFivePercentReflectionInput {
  return {
    monthKey: record.month_key,
    fullName: record.full_name,
    departmentRole: record.department_role,
    workFeelings: record.work_feelings,
    workHeadline: record.work_headline,
    workSignificance: record.work_significance,
    workRank: record.work_rank,
    workAction: record.work_action,
    familyFeelings: record.family_feelings,
    familyHeadline: record.family_headline,
    familySignificance: record.family_significance,
    familyRank: record.family_rank,
    familyAction: record.family_action,
    personalFeelings: record.personal_feelings,
    personalHeadline: record.personal_headline,
    personalSignificance: record.personal_significance,
    personalRank: record.personal_rank,
    personalAction: record.personal_action,
    deepDiveParkingLot: record.deep_dive_parking_lot,
    explorationTopics: record.exploration_topics,
  };
}

function buildDefaultValues(
  monthKey: string,
  profile: PerformanceIdentityProfile
): SubmitFivePercentReflectionInput {
  return {
    monthKey,
    fullName: profile.fullName,
    departmentRole: profile.departmentRole,
    workFeelings: '',
    workHeadline: '',
    workSignificance: '',
    workRank: 7,
    workAction: '',
    familyFeelings: '',
    familyHeadline: '',
    familySignificance: '',
    familyRank: 7,
    familyAction: '',
    personalFeelings: '',
    personalHeadline: '',
    personalSignificance: '',
    personalRank: 7,
    personalAction: '',
    deepDiveParkingLot: '',
    explorationTopics: '',
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

export function FivePercentReflectionForm() {
  const { addToast } = useToast();
  const [monthKey, setMonthKey] = useState<string>(getCurrentMonthKey());
  const [loading, setLoading] = useState(true);
  const [submittedRecord, setSubmittedRecord] = useState<FivePercentReflectionRecord | null>(null);
  const [restoredDraftAt, setRestoredDraftAt] = useState<string | null>(null);
  const [currentProfile, setCurrentProfile] = useState<PerformanceIdentityProfile>({
    fullName: '',
    departmentRole: '',
  });

  const {
    control,
    handleSubmit,
    register,
    reset,
    watch,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<SubmitFivePercentReflectionInput>({
    resolver: zodResolver(submitFivePercentReflectionSchema),
    defaultValues: buildDefaultValues(monthKey, currentProfile),
  });

  const watchedValues = watch();
  const draftIdentityKey = currentProfile.fullName.trim().toLowerCase();
  const { autoSavedAt, clearDraft } = useAutoSaveEvaluationDraft({
    formKey: 'five-percent-reflection',
    cycleKey: monthKey,
    identityKey: draftIdentityKey,
    values: watchedValues,
    enabled: !loading && isDirty && !isSubmitting,
  });

  useEffect(() => {
    let active = true;

    async function loadCurrentSubmission() {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/performance/five-percent-reflections?monthKey=${monthKey}`,
          {
            method: 'GET',
            credentials: 'include',
          }
        );

        const payload = (await response.json()) as CurrentReflectionResponse;
        if (!response.ok || !payload.data) {
          throw new Error(payload.error || 'Failed to load 5% reflection');
        }

        if (!active) return;

        setCurrentProfile(payload.data.profile);
        const identityKey = payload.data.profile.fullName.trim().toLowerCase();
        const draft = await getEvaluationDraft<SubmitFivePercentReflectionInput>(
          'five-percent-reflection',
          payload.data.monthKey,
          identityKey
        );

        if (payload.data.submission) {
          setSubmittedRecord(payload.data.submission);
          const serverValues = toFormValues(payload.data.submission);
          const latestServerSavedAt =
            payload.data.submission.updated_at ?? payload.data.submission.submitted_at;

          if (draft && shouldRestoreEvaluationDraft(draft.savedAt, latestServerSavedAt)) {
            setRestoredDraftAt(draft.savedAt);
            reset({ ...serverValues, ...draft.values });
          } else {
            setRestoredDraftAt(null);
            if (draft) {
              await clearEvaluationDraft('five-percent-reflection', payload.data.monthKey, identityKey);
            }
            reset(serverValues);
          }
        } else {
          setSubmittedRecord(null);
          const defaultValues = buildDefaultValues(payload.data.monthKey, payload.data.profile);

          if (draft) {
            setRestoredDraftAt(draft.savedAt);
            reset({ ...defaultValues, ...draft.values });
          } else {
            setRestoredDraftAt(null);
            reset(defaultValues);
          }
        }
      } catch (error) {
        if (!active) return;

        addToast({
          title: 'Unable to load 5% reflection',
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
  }, [addToast, monthKey, reset]);

  const [isExporting, setIsExporting] = useState(false);

  const onExportPdf = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(
        `/api/performance/five-percent-reflections/export-pdf?monthKey=${monthKey}`,
        { method: 'POST', credentials: 'include' }
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to export PDF');
      }
      addToast({
        title: 'PDF sent to Telegram',
        description: 'Your 5% reflection PDF is on its way.',
        variant: 'success',
      });
    } catch (error) {
      addToast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      const response = await fetch('/api/performance/five-percent-reflections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...values,
          monthKey,
          workRank: Number(values.workRank),
          familyRank: Number(values.familyRank),
          personalRank: Number(values.personalRank),
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.data) {
        throw new Error(payload.error || 'Failed to submit 5% reflection');
      }

      setSubmittedRecord(payload.data as FivePercentReflectionRecord);
      reset(toFormValues(payload.data as FivePercentReflectionRecord));
    await clearDraft();
    setRestoredDraftAt(null);

      const isUpdate = response.status !== 201;

      addToast({
        title: isUpdate ? '5% reflection updated' : '5% reflection submitted',
        description: isUpdate
          ? 'Your latest answers were saved and remain editable for the selected month.'
          : 'Your response was saved and remains editable for the selected month.',
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

  const renderTextareaField = (
    name: TextareaFieldName,
    label: string,
    helperText?: string,
    rows = 4
  ) => {
    const fieldError = errors[name];

    return (
      <div className="space-y-2">
        {renderRequiredLabel(label, name)}
        {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
        <Textarea id={name} rows={rows} {...register(name)} />
        {fieldError ? <p className="text-sm text-destructive">{fieldError.message}</p> : null}
      </div>
    );
  };

  const renderRankField = (name: RankFieldName, label: string) => {
    const fieldError = errors[name];

    return (
      <div className="space-y-3">
        <div className="space-y-1">
          {renderRequiredLabel(label)}
          <p className="text-xs text-muted-foreground">
            10 being the highest and 1 being the lowest
          </p>
        </div>
        <Controller
          control={control}
          name={name}
          render={({ field }) => (
            <ToggleGroup
              value={String(field.value)}
              onChange={(value) => field.onChange(Number(value))}
              options={rankOptions}
              className="grid w-full grid-cols-5 gap-1 rounded-xl border border-border bg-background p-1 md:grid-cols-10"
              buttonClassName="h-10 justify-center px-0 text-sm"
            />
          )}
        />
        {fieldError ? <p className="text-sm text-destructive">{fieldError.message}</p> : null}
      </div>
    );
  };

  const submissionEditStatus = submittedRecord
    ? getSubmissionEditStatus({
        submittedAt: submittedRecord.submitted_at,
        updatedAt: submittedRecord.updated_at,
      })
    : null;

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {submittedRecord ? (
        <Card className="border-emerald-200 bg-emerald-50/60">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>
                  {submissionEditStatus?.hasEmployeeEdits
                    ? '5% reflection updated'
                    : '5% reflection submitted'}
                </CardTitle>
                <CardDescription>
                  Submitted on{' '}
                  {new Date(submittedRecord.submitted_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                  .{' '}
                  {submissionEditStatus?.lastEmployeeEditAt
                    ? `Last edited on ${new Date(submissionEditStatus.lastEmployeeEditAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}.`
                    : 'You can still update your answers for the selected month.'}
                </CardDescription>
              </div>
              <Badge variant="secondary">Editable after submission</Badge>
            </div>
          </CardHeader>
        </Card>
      ) : null}

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle>5% Reflection</CardTitle>
          <CardDescription className="text-primary text-md">
            As you go through this reflection, please be kind to yourself. This is a safe space for honesty and openness, not judgment. There are no “right” or “wrong” answers, only the real ones.
Allow yourself to be vulnerable and share what genuinely came up for you. Everything you write here is simply information to help you understand yourself better and take small, meaningful steps forward.
  ``          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div>
            {renderRequiredLabel('Select month', 'five-percent-reflection-month')}
            <Input
              id="five-percent-reflection-month"
              type="month"
              className="mt-2"
              value={monthKey}
              onChange={(event) => {
                if (!event.target.value || event.target.value === monthKey) {
                  return;
                }

                setMonthKey(event.target.value);
              }}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Submission rule</p>
            <p className="mt-1 text-sm text-muted-foreground">One response per person per month</p>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Review audience</p>
            <p className="mt-1 text-sm text-muted-foreground">Leadership and HR review</p>
          </div>
        </CardContent>
      </Card>

      {restoredDraftAt || autoSavedAt ? (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="py-4 text-sm text-amber-950">
            {restoredDraftAt
              ? `Unsaved draft restored from ${formatEvaluationDraftSavedAt(restoredDraftAt)} in this browser tab.`
              : `Draft auto-saved at ${formatEvaluationDraftSavedAt(autoSavedAt as string)} in this browser tab.`}
          </CardContent>
        </Card>
      ) : null}

      <form className="space-y-6" onSubmit={onSubmit}>
        {reflectionSections.map((section) => (
          <Card key={section.key}>
            <CardHeader>
              <CardTitle>{section.label}</CardTitle>
              <CardDescription>
                Reflect on the strongest feelings from the past month, what caused them, why they
                matter, how you would rank this area, and the next action you want to take.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {renderTextareaField(
                section.fields.feelings,
                `Feelings (${section.label})`,
                'Strongest feelings this past month. Single words (Joy, Sad etc.) 3-5 words',
                3
              )}
              {renderTextareaField(
                section.fields.headline,
                `Headline (${section.label})`,
                'What caused these feelings? Only one sentence',
                3
              )}
              {renderTextareaField(
                section.fields.significance,
                `Significance (5%) (${section.label})`,
                'How was this personally significant to me? Dig deep'
              )}
              {renderRankField(section.fields.rank, `Rank (${section.label})`)}
              {renderTextareaField(
                section.fields.action,
                `Action (${section.label})`,
                'Next 30-60 days'
              )}
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader>
            <CardTitle>Topics to Help Me Learn &amp; Make Better Decisions</CardTitle>
            <CardDescription>
              Park the deeper "why" questions and identify the practical "what" and "how" topics you
              want to explore next.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {renderTextareaField(
              'deepDiveParkingLot',
              'The important/undecided emotionally complex topics I would like to add to my Deep Dive parking lot ("why" topics)'
            )}
            {renderTextareaField(
              'explorationTopics',
              'Topics I would like to explore to help me learn and make better decisions (the "what" and "how")'
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          {submittedRecord ? (
            <Button
              type="button"
              variant="outline"
              onClick={onExportPdf}
              disabled={isExporting || isSubmitting}
            >
              {isExporting ? 'Sending PDF…' : 'Export PDF'}
            </Button>
          ) : null}
          <Button type="submit" disabled={isSubmitting || isExporting}>
            {isSubmitting
              ? submittedRecord
                ? 'Saving changes...'
                : 'Submitting...'
              : submittedRecord
                ? 'Save changes'
                : `Submit ${formatMonthKey(monthKey)} 5% reflection`}
          </Button>
        </div>
      </form>
    </div>
  );
}

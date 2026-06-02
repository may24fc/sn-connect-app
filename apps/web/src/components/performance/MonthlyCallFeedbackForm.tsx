'use client';

import { getSubmissionEditStatus } from '@/lib/performance/submission-edit-status';
import {
  monthlyCallFeedbackCallLengthSchema,
  monthlyCallFeedbackClaritySchema,
  monthlyCallFeedbackValuablePartSchema,
  submitMonthlyCallFeedbackSchema,
  type SubmitMonthlyCallFeedbackInput,
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
  Checkbox,
  Input,
  Label,
  Skeleton,
  Textarea,
  ToggleGroup,
  useToast,
} from '@hr-portal/ui';
import { Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { type MonthlyCallFeedbackRecord } from './monthlyCallFeedbackDetailConfig';
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

type CurrentMonthlyCallFeedbackResponse = {
  data: {
    monthKey: string;
    profile: PerformanceIdentityProfile;
    submission: MonthlyCallFeedbackRecord | null;
    isSubmitted: boolean;
  };
  error?: string;
};

type TextareaFieldName = Exclude<
  keyof SubmitMonthlyCallFeedbackInput,
  | 'monthKey'
  | 'fullName'
  | 'departmentRole'
  | 'engagementLevel'
  | 'valuableParts'
  | 'callLength'
  | 'clarityFinancialGrowthDiscussion'
  | 'clarityIcebreakerConversationStarters'
  | 'clarityFivePercentReflectionWorksheet'
  | 'overallRating'
>;

const engagementOptions = [
  { value: '1', label: '1', description: 'Very engaging' },
  { value: '2', label: '2', description: 'Good' },
  { value: '3', label: '3', description: 'Okay' },
  { value: '4', label: '4', description: 'Needs work' },
];

const callLengthOptions = monthlyCallFeedbackCallLengthSchema.options.map((value) => ({
  value,
  label: value === 'too_long' ? 'Too long' : value === 'just_right' ? 'Just right' : 'Too short',
}));

const clarityOptions = monthlyCallFeedbackClaritySchema.options.map((value) => ({
  value,
  label:
    value === 'very_clear'
      ? 'Very Clear'
      : value === 'not_clear'
        ? 'Not Clear'
        : value === 'clear'
          ? 'Clear'
          : 'Neutral',
}));

const valuablePartOptions = monthlyCallFeedbackValuablePartSchema.options;

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

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function toFormValues(record: MonthlyCallFeedbackRecord): SubmitMonthlyCallFeedbackInput {
  return {
    monthKey: record.month_key,
    fullName: record.full_name,
    departmentRole: record.department_role as SubmitMonthlyCallFeedbackInput['departmentRole'],
    engagementLevel: record.engagement_level,
    engagementReason: record.engagement_reason,
    valuableParts: record.valuable_parts as SubmitMonthlyCallFeedbackInput['valuableParts'],
    valuablePartsReason: record.valuable_parts_reason,
    callLength: record.call_length,
    clarityFinancialGrowthDiscussion: record.clarity_financial_growth_discussion,
    clarityIcebreakerConversationStarters: record.clarity_icebreaker_conversation_starters,
    clarityFivePercentReflectionWorksheet: record.clarity_five_percent_reflection_worksheet,
    overallRating: record.overall_rating,
    keyTakeaway: record.key_takeaway,
    futureImprovements: record.future_improvements,
    nextTopics: record.next_topics,
  };
}

function buildDefaultValues(
  monthKey: string,
  profile: PerformanceIdentityProfile
): SubmitMonthlyCallFeedbackInput {
  return {
    monthKey,
    fullName: profile.fullName,
    departmentRole: profile.departmentRole,
    engagementLevel: 2,
    engagementReason: '',
    valuableParts: [],
    valuablePartsReason: '',
    callLength: 'just_right',
    clarityFinancialGrowthDiscussion: 'clear',
    clarityIcebreakerConversationStarters: 'clear',
    clarityFivePercentReflectionWorksheet: 'clear',
    overallRating: 3,
    keyTakeaway: '',
    futureImprovements: '',
    nextTopics: '',
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

export function MonthlyCallFeedbackForm() {
  const { addToast } = useToast();
  const [monthKey, setMonthKey] = useState<string>(getCurrentMonthKey());
  const [loading, setLoading] = useState(true);
  const [submittedRecord, setSubmittedRecord] = useState<MonthlyCallFeedbackRecord | null>(null);
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
  } = useForm<SubmitMonthlyCallFeedbackInput>({
    resolver: zodResolver(submitMonthlyCallFeedbackSchema),
    defaultValues: buildDefaultValues(monthKey, currentProfile),
  });

  const watchedValues = watch();
  const draftIdentityKey = currentProfile.fullName.trim().toLowerCase();
  const { autoSavedAt, clearDraft } = useAutoSaveEvaluationDraft({
    formKey: 'monthly-call-feedback',
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
        const response = await fetch(`/api/performance/monthly-call-feedback?monthKey=${monthKey}`, {
          method: 'GET',
          credentials: 'include',
        });

        const payload = (await response.json()) as CurrentMonthlyCallFeedbackResponse;
        if (!response.ok || !payload.data) {
          throw new Error(payload.error || 'Failed to load monthly call feedback');
        }

        if (!active) return;

        setCurrentProfile(payload.data.profile);
        const identityKey = payload.data.profile.fullName.trim().toLowerCase();
        const draft = await getEvaluationDraft<SubmitMonthlyCallFeedbackInput>(
          'monthly-call-feedback',
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
              await clearEvaluationDraft('monthly-call-feedback', payload.data.monthKey, identityKey);
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
          title: 'Unable to load monthly call feedback',
          description: error instanceof Error ? error.message : 'Please try again.',
          variant: 'error',
        });
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadCurrentSubmission();

    return () => {
      active = false;
    };
  }, [addToast, monthKey, reset]);

  async function onSubmit(values: SubmitMonthlyCallFeedbackInput) {
    const response = await fetch('/api/performance/monthly-call-feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ ...values, monthKey }),
    });

    const payload = (await response.json()) as {
      data?: MonthlyCallFeedbackRecord;
      error?: string;
    };

    if (!response.ok || !payload.data) {
      throw new Error(payload.error || 'Failed to submit monthly call feedback');
    }

    setSubmittedRecord(payload.data);
    reset(toFormValues(payload.data));
    setRestoredDraftAt(null);
    await clearDraft();

    addToast({
      title: 'Monthly call feedback saved',
      description: 'Your answers for the selected month are now saved. You can still edit them later.',
      variant: 'success',
    });
  }

  function renderTextareaField(name: TextareaFieldName, label: string, rows = 4) {
    const fieldError = errors[name];

    return (
      <div className="space-y-2">
        {renderRequiredLabel(label, name)}
        <Textarea id={name} rows={rows} {...register(name)} />
        {fieldError ? <p className="text-sm text-destructive">{fieldError.message}</p> : null}
      </div>
    );
  }

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
        <Skeleton className="h-96 w-full" />
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
                    ? 'Monthly call feedback updated'
                    : 'Monthly call feedback submitted'}
                </CardTitle>
                <CardDescription>
                  Submitted on {formatDateTime(submittedRecord.submitted_at)}.{' '}
                  {submissionEditStatus?.lastEmployeeEditAt
                    ? `Last edited on ${formatDateTime(submissionEditStatus.lastEmployeeEditAt)}.`
                    : 'You can still update your answers for the selected month.'}
                </CardDescription>
              </div>
              <Badge variant="success">{formatMonthKey(monthKey)}</Badge>
            </div>
          </CardHeader>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Monthly Call Feedback</CardTitle>
          <CardDescription>
            Capture how useful, clear, and actionable the monthly call felt for {formatMonthKey(monthKey)}.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="monthly-call-feedback-month">Month</Label>
            <Input
              id="monthly-call-feedback-month"
              type="month"
              value={monthKey}
              onChange={(event) => setMonthKey(event.target.value || getCurrentMonthKey())}
            />
          </div>
          <div className="space-y-2 rounded-xl border border-dashed border-border p-4">
            <p className="text-sm font-medium text-foreground">Draft status</p>
            <p className="text-sm text-muted-foreground">
              {restoredDraftAt
                ? `Restored unsent changes saved ${formatEvaluationDraftSavedAt(restoredDraftAt)}.`
                : autoSavedAt
                  ? `Auto-saved ${formatEvaluationDraftSavedAt(autoSavedAt)}.`
                  : 'Drafts are saved automatically while you type.'}
            </p>
          </div>
        </CardContent>
      </Card>

      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>SECTION 1: Engagement & Value</CardTitle>
            <CardDescription>Rate how engaging the monthly call felt and explain why.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="space-y-1">
                {renderRequiredLabel('1. How engaging or valuable did you find this month\'s monthly call?')}
                <p className="text-xs text-muted-foreground">1 = Very engaging, 4 = Needs improvement</p>
              </div>
              <Controller
                control={control}
                name="engagementLevel"
                render={({ field }) => (
                  <div className="space-y-3">
                    <ToggleGroup
                      value={String(field.value)}
                      onChange={(value) => field.onChange(Number(value))}
                      options={engagementOptions}
                      className="grid w-full grid-cols-4 gap-1 rounded-xl border border-border bg-background p-1"
                      buttonClassName="h-11 justify-center text-sm"
                    />
                    <div className="grid grid-cols-4 gap-2 text-center text-xs text-muted-foreground">
                      {engagementOptions.map((option) => (
                        <span key={option.value}>{option.description}</span>
                      ))}
                    </div>
                  </div>
                )}
              />
              {errors.engagementLevel ? (
                <p className="text-sm text-destructive">{errors.engagementLevel.message}</p>
              ) : null}
            </div>

            {renderTextareaField('engagementReason', 'What made you feel this way?')}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SECTION 2: Content Breakdown</CardTitle>
            <CardDescription>Choose the parts of the call that felt most valuable.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="space-y-1">
                {renderRequiredLabel('2. Which parts of the call did you find most valuable?')}
                <p className="text-xs text-muted-foreground">Choose all that apply.</p>
              </div>
              <Controller
                control={control}
                name="valuableParts"
                render={({ field }) => {
                  const currentValue = field.value ?? [];

                  return (
                    <div className="grid gap-3 rounded-xl border border-border p-4">
                      {valuablePartOptions.map((option) => {
                        const checked = currentValue.includes(option);

                        return (
                          <label
                            key={option}
                            className="flex items-start gap-3 rounded-lg border border-transparent px-1 py-1 text-sm hover:border-border hover:bg-muted/40"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(nextChecked) => {
                                if (nextChecked) {
                                  field.onChange([...currentValue, option]);
                                  return;
                                }

                                field.onChange(currentValue.filter((value) => value !== option));
                              }}
                            />
                            <span>{option}</span>
                          </label>
                        );
                      })}
                    </div>
                  );
                }}
              />
              {errors.valuableParts ? (
                <p className="text-sm text-destructive">{errors.valuableParts.message}</p>
              ) : null}
            </div>

            {renderTextareaField('valuablePartsReason', 'What made you choose your selections?')}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SECTION 3: Call Mechanics & Clarity</CardTitle>
            <CardDescription>Assess the pacing of the call and how clear each section felt.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              {renderRequiredLabel('3. How would you describe the length of the monthly call?')}
              <Controller
                control={control}
                name="callLength"
                render={({ field }) => (
                  <ToggleGroup
                    value={field.value}
                    onChange={field.onChange}
                    options={callLengthOptions}
                    className="grid w-full grid-cols-1 gap-1 rounded-xl border border-border bg-background p-1 md:grid-cols-3"
                    buttonClassName="h-11 justify-center"
                  />
                )}
              />
              {errors.callLength ? <p className="text-sm text-destructive">{errors.callLength.message}</p> : null}
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  4. How clear were the following parts of the monthly call?
                  <span className="ml-1 text-destructive">*</span>
                </p>
                <p className="text-xs text-muted-foreground">Rate one option for each row.</p>
              </div>

              {[
                {
                  name: 'clarityFinancialGrowthDiscussion' as const,
                  label: 'Financial Growth Discussion',
                },
                {
                  name: 'clarityIcebreakerConversationStarters' as const,
                  label: 'Icebreaker / Conversation Starters',
                },
                {
                  name: 'clarityFivePercentReflectionWorksheet' as const,
                  label: '5% Reflection Worksheet',
                },
              ].map((item) => (
                <div key={item.name} className="space-y-2 rounded-xl border border-border p-4">
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <Controller
                    control={control}
                    name={item.name}
                    render={({ field }) => (
                      <ToggleGroup
                        value={field.value}
                        onChange={field.onChange}
                        options={clarityOptions}
                        className="grid w-full grid-cols-2 gap-1 rounded-xl border border-border bg-background p-1 md:grid-cols-4"
                        buttonClassName="h-10 justify-center px-2 text-xs md:text-sm"
                      />
                    )}
                  />
                  {errors[item.name] ? (
                    <p className="text-sm text-destructive">{errors[item.name]?.message}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SECTION 4: Overall Rating & Qualitative Takeaways</CardTitle>
            <CardDescription>Rate the session overall and share what should happen next.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="space-y-1">
                {renderRequiredLabel('5. Overall, how would you rate this monthly call?')}
                <p className="text-xs text-muted-foreground">1 = Needs work, 4 = Excellent</p>
              </div>
              <Controller
                control={control}
                name="overallRating"
                render={({ field }) => (
                  <div className="grid gap-2 md:grid-cols-4">
                    {[1, 2, 3, 4].map((value) => {
                      const isActive = field.value === value;

                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => field.onChange(value)}
                          className={`rounded-xl border p-4 text-left transition ${
                            isActive
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border bg-background hover:bg-muted/40'
                          }`}
                        >
                          <div className="mb-3 flex items-center gap-1">
                            {Array.from({ length: 4 }).map((_, index) => (
                              <Star
                                key={index}
                                className={`h-4 w-4 ${index < value ? 'fill-current' : ''}`}
                              />
                            ))}
                          </div>
                          <p className="text-sm font-medium">{value} / 4</p>
                        </button>
                      );
                    })}
                  </div>
                )}
              />
              {errors.overallRating ? (
                <p className="text-sm text-destructive">{errors.overallRating.message}</p>
              ) : null}
            </div>

            {renderTextareaField('keyTakeaway', 'What is your key takeaway from this month\'s session?')}
            {renderTextareaField('futureImprovements', 'What can improve in future monthly call sessions?')}
            {renderTextareaField('nextTopics', 'What topics would you like us to cover next time?')}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving feedback...' : 'Submit Monthly Call Feedback'}
          </Button>
        </div>
      </form>
    </div>
  );
}
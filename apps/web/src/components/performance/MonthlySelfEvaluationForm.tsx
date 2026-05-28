'use client';

import {
  getSubmissionEditStatus,
} from '@/lib/performance/submission-edit-status';
import {
  type SubmitMonthlySelfEvaluationInput,
  monthlySelfEvaluationResponseSchema,
  submitMonthlySelfEvaluationSchema,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Textarea,
  useToast,
} from '@hr-portal/ui';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { type MonthlySelfEvaluationRecord } from './monthlySelfEvaluationDetailConfig';
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

type CurrentEvaluationResponse = {
  data: {
    monthKey: string;
    profile: PerformanceIdentityProfile;
    submission: MonthlySelfEvaluationRecord | null;
    isSubmitted: boolean;
  };
  error?: string;
};

type TextareaFieldName = Exclude<
  keyof SubmitMonthlySelfEvaluationInput,
  | 'monthKey'
  | 'fullName'
  | 'departmentRole'
  | 'productivityScore'
  | 'contributionsVisible'
  | 'comfortableRaisingConcerns'
>;

const responseOptions = monthlySelfEvaluationResponseSchema.options;

const impactReasonExamples = [
  'Revenue impact',
  'Improved workflow',
  'Faster operations',
  'Better branding',
  'Team support',
  'Better communication',
  'Time savings',
  'Better client/guest/customer experience',
].join(' • ');

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

function toFormValues(record: MonthlySelfEvaluationRecord): SubmitMonthlySelfEvaluationInput {
  return {
    monthKey: record.month_key,
    fullName: record.full_name,
    departmentRole: record.department_role as SubmitMonthlySelfEvaluationInput['departmentRole'],
    topThreeThingsWorkedOn: record.top_three_things_worked_on,
    biggestImpact: record.biggest_impact,
    impactReason: record.impact_reason,
    significantAchievement: record.significant_achievement,
    challengeResolved: record.challenge_resolved,
    monthlyImprovement: record.monthly_improvement,
    workSlowdown: record.work_slowdown,
    unseenWorkflowIssue: record.unseen_workflow_issue,
    requestedSupport: record.requested_support,
    productivityScore: record.productivity_score,
    productivityReason: record.productivity_reason,
    ownershipOutsideRole: record.ownership_outside_role,
    professionalImprovementArea: record.professional_improvement_area,
    nextSkillToLearn: record.next_skill_to_learn,
    leadershipDidWell: record.leadership_did_well,
    leadershipCanImprove: record.leadership_can_improve,
    contributionsVisible: record.contributions_visible,
    comfortableRaisingConcerns: record.comfortable_raising_concerns,
    hiddenProductivityIssue: record.hidden_productivity_issue,
    immediateImprovement: record.immediate_improvement,
    additionalComments: record.additional_comments || '',
    nextMonthGoal: record.next_month_goal,
  };
}

function buildDefaultValues(
  monthKey: string,
  profile: PerformanceIdentityProfile
): SubmitMonthlySelfEvaluationInput {
  return {
    monthKey,
    fullName: profile.fullName,
    departmentRole: profile.departmentRole,
    topThreeThingsWorkedOn: '',
    biggestImpact: '',
    impactReason: '',
    significantAchievement: '',
    challengeResolved: '',
    monthlyImprovement: '',
    workSlowdown: '',
    unseenWorkflowIssue: '',
    requestedSupport: '',
    productivityScore: 7,
    productivityReason: '',
    ownershipOutsideRole: '',
    professionalImprovementArea: '',
    nextSkillToLearn: '',
    leadershipDidWell: '',
    leadershipCanImprove: '',
    contributionsVisible: 'sometimes',
    comfortableRaisingConcerns: 'sometimes',
    hiddenProductivityIssue: '',
    immediateImprovement: '',
    additionalComments: '',
    nextMonthGoal: '',
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

export function MonthlySelfEvaluationForm() {
  const { addToast } = useToast();
  const [monthKey, setMonthKey] = useState<string>(getCurrentMonthKey());
  const [loading, setLoading] = useState(true);
  const [submittedRecord, setSubmittedRecord] = useState<MonthlySelfEvaluationRecord | null>(null);
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
  } = useForm<SubmitMonthlySelfEvaluationInput>({
    resolver: zodResolver(submitMonthlySelfEvaluationSchema),
    defaultValues: buildDefaultValues(monthKey, currentProfile),
  });

  const watchedValues = watch();
  const draftIdentityKey = currentProfile.fullName.trim().toLowerCase();
  const { autoSavedAt, clearDraft } = useAutoSaveEvaluationDraft({
    formKey: 'monthly-self-evaluation',
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
          `/api/performance/monthly-self-evaluations?monthKey=${getCurrentMonthKey()}`,
          {
            method: 'GET',
            credentials: 'include',
          }
        );

        const payload = (await response.json()) as CurrentEvaluationResponse;
        if (!response.ok || !payload.data) {
          throw new Error(payload.error || 'Failed to load self-evaluation');
        }

        if (!active) return;

        setMonthKey(payload.data.monthKey);
        setCurrentProfile(payload.data.profile);
        const identityKey = payload.data.profile.fullName.trim().toLowerCase();
        const draft = await getEvaluationDraft<SubmitMonthlySelfEvaluationInput>(
          'monthly-self-evaluation',
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
              await clearEvaluationDraft('monthly-self-evaluation', payload.data.monthKey, identityKey);
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
          title: 'Unable to load monthly self-evaluation',
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
      const response = await fetch('/api/performance/monthly-self-evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...values,
          monthKey,
          productivityScore: Number(values.productivityScore),
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.data) {
        throw new Error(payload.error || 'Failed to submit self-evaluation');
      }

      setSubmittedRecord(payload.data as MonthlySelfEvaluationRecord);
      reset(toFormValues(payload.data as MonthlySelfEvaluationRecord));
  await clearDraft();
  setRestoredDraftAt(null);

      const isUpdate = response.status !== 201;

      addToast({
        title: isUpdate ? 'Monthly self-evaluation updated' : 'Monthly self-evaluation submitted',
        description: isUpdate
          ? 'Your latest answers were saved and remain editable for this month.'
          : 'Your response was saved and remains editable for this month.',
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
                    ? 'Monthly self-evaluation updated'
                    : 'Monthly self-evaluation submitted'}
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
                    : 'You can still update your answers for this month.'}
                </CardDescription>
              </div>
              <Badge variant="secondary">Editable after submission</Badge>
            </div>
          </CardHeader>
        </Card>
      ) : null}

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle>Monthly Self-Evaluation</CardTitle>
          <CardDescription>
            Share the work you completed, the impact you created, the blockers leadership may not
            see, and what would help you perform better. This form is designed to be finished in
            roughly 10 to 15 minutes.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <p className="text-sm font-medium text-foreground">Current month</p>
            <p className="mt-1 text-sm text-muted-foreground">{formatMonthKey(monthKey)}</p>
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
        <Card>
          <CardHeader>
            <CardTitle>SECTION 1: ROLE &amp; WORK SUMMARY</CardTitle>
            <CardDescription>
              Complete each answer field in order so leadership can review your role, work summary,
              blockers, and needed support clearly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-foreground">1. Full Name</p>
                <p className="mt-1 text-sm text-muted-foreground">{currentProfile.fullName}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-foreground">2. Department</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {currentProfile.departmentRole}
                </p>
              </div>
            </div>

            {renderTextareaField(
              'topThreeThingsWorkedOn',
              '3. What were the top 3 things you worked on this month?'
            )}
            {renderTextareaField(
              'biggestImpact',
              '4. Which task, contribution, campaign, project, or initiative created the biggest impact this month?'
            )}
            {renderTextareaField(
              'impactReason',
              '5. Why do you think this work mattered?',
              `Examples: ${impactReasonExamples}`
            )}
            {renderTextareaField(
              'significantAchievement',
              '6. Did you complete, improve, launch, automate, organize, or solve anything significant this month?'
            )}
            {renderTextareaField(
              'challengeResolved',
              '7. What challenge, issue, or blocker did you help resolve?'
            )}
            {renderTextareaField(
              'monthlyImprovement',
              '8. What is one thing you improved this month compared to last month?'
            )}
            {renderTextareaField(
              'workSlowdown',
              '9. What slowed you down or made your work more difficult this month?'
            )}
            {renderTextareaField(
              'unseenWorkflowIssue',
              '10. Is there any workflow, communication issue, inefficiency, or recurring problem leadership may not be fully seeing?'
            )}
            {renderTextareaField(
              'requestedSupport',
              '11. What support, tool, resource, or improvement would help you perform better?'
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SECTION 2: OWNERSHIP &amp; PRODUCTIVITY</CardTitle>
            <CardDescription>
              Use this section to score your productivity, explain that score, and reflect on your
              professional growth.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="space-y-2">
                {renderRequiredLabel(
                  '12. On a scale of 1-10, how productive do you believe you were this month?',
                  'productivityScore'
                )}
                <Input
                  id="productivityScore"
                  type="number"
                  min={1}
                  max={10}
                  {...register('productivityScore', { valueAsNumber: true })}
                />
                {errors.productivityScore && (
                  <p className="text-sm text-destructive">{errors.productivityScore.message}</p>
                )}
              </div>
            </div>

            {renderTextareaField(
              'productivityReason',
              '13. What made you give yourself that score?'
            )}
            {renderTextareaField(
              'ownershipOutsideRole',
              '14. Did you proactively take ownership of anything outside your direct responsibilities?'
            )}
            {renderTextareaField(
              'professionalImprovementArea',
              '15. What is one area you believe you still need to improve professionally?'
            )}
            {renderTextareaField(
              'nextSkillToLearn',
              '16. What skill, system, or knowledge would you like to improve or learn next?'
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SECTION 3: LEADERSHIP &amp; OPERATIONS FEEDBACK</CardTitle>
            <CardDescription>
              Share feedback on leadership, visibility, communication, and any operational issues
              affecting work.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {renderTextareaField(
              'leadershipDidWell',
              '17. What is one thing leadership or management did well this month?'
            )}
            {renderTextareaField(
              'leadershipCanImprove',
              '18. What is one thing leadership or management can improve?'
            )}

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                {renderRequiredLabel(
                  '19. Do you feel your work and contributions are visible and understood?'
                )}
                <Controller
                  control={control}
                  name="contributionsVisible"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a response" />
                      </SelectTrigger>
                      <SelectContent>
                        {responseOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option.charAt(0).toUpperCase() + option.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.contributionsVisible && (
                  <p className="text-sm text-destructive">{errors.contributionsVisible.message}</p>
                )}
              </div>

              <div className="space-y-2">
                {renderRequiredLabel(
                  '20. Do you feel comfortable raising concerns, blockers, or ideas?'
                )}
                <Controller
                  control={control}
                  name="comfortableRaisingConcerns"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a response" />
                      </SelectTrigger>
                      <SelectContent>
                        {responseOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option.charAt(0).toUpperCase() + option.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.comfortableRaisingConcerns && (
                  <p className="text-sm text-destructive">
                    {errors.comfortableRaisingConcerns.message}
                  </p>
                )}
              </div>
            </div>

            {renderTextareaField(
              'hiddenProductivityIssue',
              '21. Is there anything leadership may not realize is negatively affecting productivity, morale, communication, or operations?'
            )}
            {renderTextareaField(
              'immediateImprovement',
              '22. If you could improve one thing immediately within the company, workflow, systems, or operations, what would it be?'
            )}
            {renderTextareaField(
              'additionalComments',
              '23. Any additional comments, concerns, suggestions, or reflections?'
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>FINAL REFLECTION</CardTitle>
            <CardDescription>
              Close the form with one clear goal for what you want to accomplish or improve next
              month.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderTextareaField(
              'nextMonthGoal',
              '24. What is one thing you want to accomplish or improve next month?'
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? submittedRecord
                ? 'Saving changes...'
                : 'Submitting...'
              : submittedRecord
                ? 'Save changes'
                : `Submit ${formatMonthKey(monthKey)} self-evaluation`}
          </Button>
        </div>
      </form>
    </div>
  );
}

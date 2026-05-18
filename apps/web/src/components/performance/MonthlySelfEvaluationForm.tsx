'use client';

import {
  monthlySelfEvaluationDepartmentRoleOptions,
  monthlySelfEvaluationResponseSchema,
  submitMonthlySelfEvaluationSchema,
  type SubmitMonthlySelfEvaluationInput,
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
import { Controller, useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';

type MonthlySelfEvaluationRecord = {
  id: string;
  month_key: string;
  full_name: string;
  department_role: string;
  top_three_things_worked_on: string;
  biggest_impact: string;
  impact_reason: string;
  significant_achievement: string;
  challenge_resolved: string;
  monthly_improvement: string;
  work_slowdown: string;
  unseen_workflow_issue: string;
  requested_support: string;
  productivity_score: number;
  productivity_reason: string;
  ownership_outside_role: string;
  professional_improvement_area: string;
  next_skill_to_learn: string;
  leadership_did_well: string;
  leadership_can_improve: string;
  contributions_visible: 'yes' | 'sometimes' | 'no';
  comfortable_raising_concerns: 'yes' | 'sometimes' | 'no';
  hidden_productivity_issue: string;
  immediate_improvement: string;
  additional_comments: string | null;
  next_month_goal: string;
  submitted_at: string;
};

type CurrentEvaluationResponse = {
  data: {
    monthKey: string;
    submission: MonthlySelfEvaluationRecord | null;
    isSubmitted: boolean;
  };
  error?: string;
};

const responseOptions = monthlySelfEvaluationResponseSchema.options;

const questionSections = [
  {
    title: 'Accomplishments',
    description: 'Capture the work, impact, and improvement highlights from the month.',
    fields: [
      {
        name: 'topThreeThingsWorkedOn',
        label: 'What were the top 3 things you worked on this month?',
      },
      {
        name: 'biggestImpact',
        label: 'Which task, contribution, campaign, project, or initiative created the biggest impact this month?',
      },
      {
        name: 'impactReason',
        label: 'Why do you think this work mattered?',
      },
      {
        name: 'significantAchievement',
        label: 'Did you complete, improve, launch, automate, organize, or solve anything significant this month?',
      },
      {
        name: 'challengeResolved',
        label: 'What challenge, issue, or blocker did you help resolve?',
      },
      {
        name: 'monthlyImprovement',
        label: 'What is one thing you improved this month compared to last month?',
      },
    ],
  },
  {
    title: 'Blockers & Support',
    description: 'Surface what made work harder and what support would make the next month stronger.',
    fields: [
      {
        name: 'workSlowdown',
        label: 'What slowed you down or made your work more difficult this month?',
      },
      {
        name: 'unseenWorkflowIssue',
        label: 'Is there any workflow, communication issue, inefficiency, or recurring problem leadership may not be fully seeing?',
      },
      {
        name: 'requestedSupport',
        label: 'What support, tool, resource, or improvement would help you perform better?',
      },
      {
        name: 'hiddenProductivityIssue',
        label: 'Is there anything leadership may not realize is negatively affecting productivity, morale, communication, or operations?',
      },
      {
        name: 'immediateImprovement',
        label: 'If you could improve one thing immediately within the company, workflow, systems, or operations, what would it be?',
      },
    ],
  },
  {
    title: 'Growth & Leadership Feedback',
    description: 'Summarize ownership, growth goals, and direct leadership feedback.',
    fields: [
      {
        name: 'ownershipOutsideRole',
        label: 'Did you proactively take ownership of anything outside your direct responsibilities?',
      },
      {
        name: 'professionalImprovementArea',
        label: 'What is one area you believe you still need to improve professionally?',
      },
      {
        name: 'nextSkillToLearn',
        label: 'What skill, system, or knowledge would you like to improve or learn next?',
      },
      {
        name: 'leadershipDidWell',
        label: 'What is one thing leadership or management did well this month?',
      },
      {
        name: 'leadershipCanImprove',
        label: 'What is one thing leadership or management can improve?',
      },
      {
        name: 'nextMonthGoal',
        label: 'What is one thing you want to accomplish or improve next month?',
      },
      {
        name: 'additionalComments',
        label: 'Any additional comments, concerns, suggestions, or reflections?',
        optional: true,
      },
    ],
  },
] as const;

function getCurrentMonthKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function formatMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year || new Date().getFullYear(), (month || 1) - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
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

function buildDefaultValues(monthKey: string): SubmitMonthlySelfEvaluationInput {
  return {
    monthKey,
    fullName: '',
    departmentRole: monthlySelfEvaluationDepartmentRoleOptions[0],
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

export function MonthlySelfEvaluationForm() {
  const { addToast } = useToast();
  const [monthKey, setMonthKey] = useState<string>(getCurrentMonthKey());
  const [loading, setLoading] = useState(true);
  const [submittedRecord, setSubmittedRecord] = useState<MonthlySelfEvaluationRecord | null>(null);

  const {
    control,
    handleSubmit,
    register,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SubmitMonthlySelfEvaluationInput>({
    resolver: zodResolver(submitMonthlySelfEvaluationSchema),
    defaultValues: buildDefaultValues(monthKey),
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
        if (payload.data.submission) {
          setSubmittedRecord(payload.data.submission);
          reset(toFormValues(payload.data.submission));
        } else {
          setSubmittedRecord(null);
          reset(buildDefaultValues(payload.data.monthKey));
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

      addToast({
        title: 'Monthly self-evaluation submitted',
        description: 'Your response is now locked for this month.',
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

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (submittedRecord) {
    return (
      <div className="space-y-6">
        <Card className="border-emerald-200 bg-emerald-50/60">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Monthly self-evaluation submitted</CardTitle>
                <CardDescription>
                  Your {formatMonthKey(submittedRecord.month_key)} response was submitted on{' '}
                  {new Date(submittedRecord.submitted_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}.
                </CardDescription>
              </div>
              <Badge variant="success">Locked for this month</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-foreground">Department / Role</p>
              <p className="mt-1 text-sm text-muted-foreground">{submittedRecord.department_role}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Self-rated productivity</p>
              <p className="mt-1 text-sm text-muted-foreground">{submittedRecord.productivity_score} / 10</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-foreground">Top 3 things you worked on</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                {submittedRecord.top_three_things_worked_on}
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-foreground">Biggest impact</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                {submittedRecord.biggest_impact}
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-foreground">What you want to improve next month</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                {submittedRecord.next_month_goal}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle>Monthly Self-Evaluation</CardTitle>
          <CardDescription>
            Share the work you completed, the impact you created, the blockers leadership may not see,
            and what would help you perform better. This form is designed to be finished in roughly 10 to 15 minutes.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
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

      <form className="space-y-6" onSubmit={onSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>About You</CardTitle>
            <CardDescription>Enter your name and choose the department or role that best matches this month of work.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" {...register('fullName')} />
              {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Department / Role</Label>
              <Controller
                control={control}
                name="departmentRole"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your department or role" />
                    </SelectTrigger>
                    <SelectContent>
                      {monthlySelfEvaluationDepartmentRoleOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.departmentRole && (
                <p className="text-sm text-destructive">{errors.departmentRole.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {questionSections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {section.fields.map((field) => (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={field.name}>{field.label}</Label>
                  <Textarea id={field.name} rows={4} {...register(field.name)} />
                  {errors[field.name] && (
                    <p className="text-sm text-destructive">{errors[field.name]?.message}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader>
            <CardTitle>Productivity Reflection</CardTitle>
            <CardDescription>Rate your month, then explain the score and visibility of your work.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-5 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="productivityScore">On a scale of 1-10, how productive do you believe you were this month?</Label>
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

              <div className="space-y-2">
                <Label>Do you feel your work and contributions are visible and understood?</Label>
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
                <Label>Do you feel comfortable raising concerns, blockers, or ideas?</Label>
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
                  <p className="text-sm text-destructive">{errors.comfortableRaisingConcerns.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="productivityReason">What made you give yourself that score?</Label>
              <Textarea id="productivityReason" rows={4} {...register('productivityReason')} />
              {errors.productivityReason && (
                <p className="text-sm text-destructive">{errors.productivityReason.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : `Submit ${formatMonthKey(monthKey)} self-evaluation`}
          </Button>
        </div>
      </form>
    </div>
  );
}

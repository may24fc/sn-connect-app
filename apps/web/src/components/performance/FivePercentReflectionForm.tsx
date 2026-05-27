'use client';

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
  Label,
  Skeleton,
  Textarea,
  ToggleGroup,
  useToast,
} from '@hr-portal/ui';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  type FivePercentReflectionDetailField,
  type FivePercentReflectionRecord,
  fivePercentReflectionDetailSections,
} from './fivePercentReflectionDetailConfig';

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
  const [currentProfile, setCurrentProfile] = useState<PerformanceIdentityProfile>({
    fullName: '',
    departmentRole: '',
  });

  const {
    control,
    handleSubmit,
    register,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SubmitFivePercentReflectionInput>({
    resolver: zodResolver(submitFivePercentReflectionSchema),
    defaultValues: buildDefaultValues(monthKey, currentProfile),
  });

  useEffect(() => {
    let active = true;

    async function loadCurrentSubmission() {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/performance/five-percent-reflections?monthKey=${getCurrentMonthKey()}`,
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

        setMonthKey(payload.data.monthKey);
        setCurrentProfile(payload.data.profile);
        if (payload.data.submission) {
          setSubmittedRecord(payload.data.submission);
          reset(toFormValues(payload.data.submission));
        } else {
          setSubmittedRecord(null);
          reset(buildDefaultValues(payload.data.monthKey, payload.data.profile));
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
  }, [addToast, reset]);

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

      addToast({
        title: '5% reflection submitted',
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

  const renderSubmittedField = (
    field: FivePercentReflectionDetailField,
    record: FivePercentReflectionRecord
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
                <CardTitle>5% reflection submitted</CardTitle>
                <CardDescription>
                  Your {formatMonthKey(submittedRecord.month_key)} response was submitted on{' '}
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
              <Badge variant="success">Locked for this month</Badge>
            </div>
          </CardHeader>
        </Card>

        {fivePercentReflectionDetailSections.map((section) => (
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
          <CardTitle>5% Reflection</CardTitle>
          <CardDescription>
            Capture a monthly reflection across work, family, and personal life, then note the
            topics you want to explore more deeply so future decisions become clearer and more
            intentional.
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

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : `Submit ${formatMonthKey(monthKey)} 5% reflection`}
          </Button>
        </div>
      </form>
    </div>
  );
}

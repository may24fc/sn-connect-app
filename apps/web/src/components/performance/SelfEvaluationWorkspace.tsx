'use client';

import { FivePercentReflectionForm } from '@/components/performance/FivePercentReflectionForm';
import { MonthlyCallFeedbackForm } from '@/components/performance/MonthlyCallFeedbackForm';
import { MonthlySelfEvaluationForm } from '@/components/performance/MonthlySelfEvaluationForm';
import { QuarterlyTemperatureCheckForm } from '@/components/performance/QuarterlyTemperatureCheckForm';
import { Button, Card, CardContent, CardHeader, CardTitle, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@hr-portal/ui';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';

type SelfEvaluationWorkspaceProps = {
  defaultTab?: 'monthly' | 'monthly-call-feedback' | 'five-percent' | 'quarterly';
  backHref?: string;
  backLabel?: string;
};

type SelfEvaluationTab = NonNullable<SelfEvaluationWorkspaceProps['defaultTab']>;

const EVALUATION_OPTIONS = [
  { value: 'monthly', label: 'Monthly Self-Evaluation' },
  { value: 'monthly-call-feedback', label: 'Monthly Call Feedback' },
  { value: 'five-percent', label: '5% Reflection' },
  { value: 'quarterly', label: 'Quarterly Temperature Check' },
] as const;

export function SelfEvaluationWorkspace({
  defaultTab = 'monthly',
  backHref,
  backLabel = 'Back',
}: SelfEvaluationWorkspaceProps): ReactNode {
  const [activeTab, setActiveTab] = useState<SelfEvaluationTab>(defaultTab);
  const activeLabel = useMemo(
    () => EVALUATION_OPTIONS.find((option) => option.value === activeTab)?.label ?? 'Monthly Self-Evaluation',
    [activeTab]
  );

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-3xl space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Self-Evaluation
            </h1>
            <p className="text-sm text-muted-foreground">
              Use the monthly reflection for regular check-ins, monthly call feedback for session-level input, the 5% reflection for work-family-personal reflection, and the quarterly temperature check for broader feedback on workload, support, and overall experience.
            </p>
          </div>
          {backHref ? (
            <Button asChild variant="outline" size="sm">
              <Link href={backHref}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                {backLabel}
              </Link>
            </Button>
          ) : null}
        </div>

        <Card>
          <CardContent className="mt-6">
            <Select value={activeTab} onValueChange={(value) => setActiveTab(value as SelfEvaluationTab)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a form" />
              </SelectTrigger>
              <SelectContent>
                {EVALUATION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-2 text-sm text-muted-foreground">Currently answering: {activeLabel}</p>
          </CardContent>
        </Card>
      </div>

      {activeTab === 'monthly' ? <MonthlySelfEvaluationForm /> : null}
      {activeTab === 'monthly-call-feedback' ? <MonthlyCallFeedbackForm /> : null}
      {activeTab === 'five-percent' ? <FivePercentReflectionForm /> : null}
      {activeTab === 'quarterly' ? <QuarterlyTemperatureCheckForm /> : null}
    </div>
  );
}
'use client';

import { FivePercentReflectionAdminReview } from '@/components/performance/FivePercentReflectionAdminReview';
import { MonthlyCallFeedbackAdminReview } from '@/components/performance/MonthlyCallFeedbackAdminReview';
import { MonthlySelfEvaluationAdminReview } from '@/components/performance/MonthlySelfEvaluationAdminReview';
import { QuarterlyTemperatureCheckAdminReview } from '@/components/performance/QuarterlyTemperatureCheckAdminReview';
import { Button, Card, CardContent, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@hr-portal/ui';
import { ClipboardCheck } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';

type EvaluationTab = 'monthly' | 'monthly-call-feedback' | 'five-percent' | 'quarterly';

type SelfEvaluationReviewWorkspaceProps = {
  defaultTab?: EvaluationTab;
};

const REVIEW_OPTIONS: Array<{ value: EvaluationTab; label: string }> = [
  { value: 'monthly', label: 'Monthly Self-Evaluation' },
  { value: 'monthly-call-feedback', label: 'Monthly Call Feedback' },
  { value: 'five-percent', label: '5% Reflection' },
  { value: 'quarterly', label: 'Quarterly Temperature Check' },
];

export function SelfEvaluationReviewWorkspace({
  defaultTab = 'monthly',
}: SelfEvaluationReviewWorkspaceProps): ReactNode {
  const [activeTab, setActiveTab] = useState<EvaluationTab>(defaultTab);

  const activeLabel = useMemo(
    () => REVIEW_OPTIONS.find((option) => option.value === activeTab)?.label ?? 'Monthly Self-Evaluation',
    [activeTab]
  );

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Self-Evaluation Reviews
            </h1>
            <p className="text-sm text-muted-foreground">
              Review monthly self-evaluations, monthly call feedback, 5% reflections, and quarterly temperature checks from one leadership workspace.
            </p>
          </div>
          <Button asChild>
            <Link href={`/admin/performance/self-evaluation?tab=${activeTab}`}>
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Write My Evaluation
            </Link>
          </Button>
        </div>

        <div className="max-w-md">
            <Select value={activeTab} onValueChange={(value) => setActiveTab(value as EvaluationTab)}>
                <SelectTrigger>
                <SelectValue placeholder="Select a form" />
                </SelectTrigger>
                <SelectContent>
                {REVIEW_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                    {option.label}
                    </SelectItem>
                ))}
                </SelectContent>
            </Select>
        </div>
      </div>

      {activeTab === 'monthly' ? <MonthlySelfEvaluationAdminReview /> : null}
      {activeTab === 'monthly-call-feedback' ? <MonthlyCallFeedbackAdminReview /> : null}
      {activeTab === 'five-percent' ? <FivePercentReflectionAdminReview /> : null}
      {activeTab === 'quarterly' ? <QuarterlyTemperatureCheckAdminReview /> : null}
    </div>
  );
}
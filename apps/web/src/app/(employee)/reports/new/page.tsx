'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import {
  Button,
  ReportForm,
  WeekSelector,
  type ReportContent,
  type WeekPeriod,
  getCurrentWeekPeriod,
} from '@hr-portal/ui';

export default function NewReportPage(): React.ReactNode {
  const router = useRouter();
  const [weekPeriod, setWeekPeriod] = React.useState<WeekPeriod>(getCurrentWeekPeriod());
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSaveDraft = async (content: ReportContent): Promise<void> => {
    setIsSubmitting(true);
    try {
      // TODO: Implement API call to save draft
      console.log('Saving draft:', { weekPeriod, content });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Redirect back to reports list
      router.push('/reports');
    } catch (error) {
      console.error('Failed to save draft:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (content: ReportContent): Promise<void> => {
    setIsSubmitting(true);
    try {
      // TODO: Implement API call to submit report
      console.log('Submitting report:', { weekPeriod, content });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Redirect back to reports list
      router.push('/reports');
    } catch (error) {
      console.error('Failed to submit report:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = (): void => {
    router.push('/reports');
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleCancel}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back to reports</span>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Create Weekly Report</h1>
          <p className="text-muted-foreground">
            Complete your report for the selected week period
          </p>
        </div>
      </div>

      {/* Week Selector */}
      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
        <span className="text-sm font-medium">Reporting Period:</span>
        <WeekSelector
          selectedWeek={weekPeriod}
          onWeekChange={setWeekPeriod}
          showNavigation={true}
        />
      </div>

      {/* Report Form */}
      <ReportForm
        weekPeriod={weekPeriod}
        onSaveDraft={handleSaveDraft}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

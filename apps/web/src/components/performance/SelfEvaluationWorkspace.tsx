'use client';

import { FivePercentReflectionForm } from '@/components/performance/FivePercentReflectionForm';
import { MonthlyCallFeedbackForm } from '@/components/performance/MonthlyCallFeedbackForm';
import { MonthlySelfEvaluationForm } from '@/components/performance/MonthlySelfEvaluationForm';
import { QuarterlyTemperatureCheckForm } from '@/components/performance/QuarterlyTemperatureCheckForm';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hr-portal/ui';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';

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
const FIVE_PERCENT_REFLECTION_VIDEO_URL = 'https://youtu.be/Ns724WGc3lY';
const FIVE_PERCENT_REFLECTION_VIDEO_EMBED_URL = 'https://www.youtube.com/embed/Ns724WGc3lY?autoplay=1';

export function SelfEvaluationWorkspace({
  defaultTab = 'monthly',
  backHref,
  backLabel = 'Back',
}: SelfEvaluationWorkspaceProps): ReactNode {
  const [activeTab, setActiveTab] = useState<SelfEvaluationTab>(defaultTab);
  const [isReflectionVideoOpen, setIsReflectionVideoOpen] = useState(false);
  const [shouldAutoOpenReflectionVideo, setShouldAutoOpenReflectionVideo] = useState(
    defaultTab === 'five-percent'
  );

  const handleTabChange = (value: string): void => {
    const nextTab = value as SelfEvaluationTab;
    setActiveTab(nextTab);
    if (nextTab === 'five-percent') {
      setShouldAutoOpenReflectionVideo(true);
      return;
    }

    setShouldAutoOpenReflectionVideo(false);
    if (nextTab !== 'five-percent') {
      setIsReflectionVideoOpen(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'five-percent' || !shouldAutoOpenReflectionVideo) {
      return;
    }

    const timer = window.setTimeout(() => {
      setIsReflectionVideoOpen(true);
      setShouldAutoOpenReflectionVideo(false);
    }, 3000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activeTab, shouldAutoOpenReflectionVideo]);

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

        <div>
          <Select value={activeTab} onValueChange={handleTabChange}>
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
        </div>
        {activeTab === 'five-percent' && !isReflectionVideoOpen ? (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShouldAutoOpenReflectionVideo(false);
                setIsReflectionVideoOpen(true);
              }}
            >
              Watch video
            </Button>
          </div>
        ) : null}
      </div>

      <Dialog open={isReflectionVideoOpen} onOpenChange={setIsReflectionVideoOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>5% Reflection Video Guide</DialogTitle>
            <DialogDescription>
              Watch the quick guide for completing the 5% Reflection evaluation.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-hidden rounded-lg border border-border bg-black">
            <iframe
              className="h-[360px] w-full md:h-[420px]"
              src={FIVE_PERCENT_REFLECTION_VIDEO_EMBED_URL}
              title="5% Reflection video guide"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
          <div className="flex justify-end">
            <Button asChild variant="outline" size="sm">
              <a href={FIVE_PERCENT_REFLECTION_VIDEO_URL} target="_blank" rel="noopener noreferrer">
                Watch on YouTube
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {activeTab === 'monthly' ? <MonthlySelfEvaluationForm /> : null}
      {activeTab === 'monthly-call-feedback' ? <MonthlyCallFeedbackForm /> : null}
      {activeTab === 'five-percent' ? <FivePercentReflectionForm /> : null}
      {activeTab === 'quarterly' ? <QuarterlyTemperatureCheckForm /> : null}
    </div>
  );
}
'use client';

import type { OnboardingStep } from '@/lib/schemas/onboarding.schema';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

const labels: Record<OnboardingStep, string> = {
  personal_info: 'Personal Info',
  payment_info: 'Payment Info',
  documents: 'Documents',
  review: 'Review',
};

export function ProgressStepper({
  currentStep,
}: {
  currentStep: OnboardingStep;
}): ReactNode {
  const order: Array<OnboardingStep> = ['personal_info', 'payment_info', 'documents', 'review'];
  const currentIndex = order.indexOf(currentStep);

  return (
    <div className="flex items-center gap-0">
      {order.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isLast = index === order.length - 1;

        return (
          <div key={step} className="flex items-center">
            {/* Step indicator */}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                  isCompleted &&
                    'bg-emerald-500 text-white shadow-sm shadow-emerald-500/25',
                  isCurrent &&
                    'border-2 border-slate-500 bg-slate-50 text-slate-700 dark:bg-slate-950 dark:text-slate-400 shadow-sm shadow-slate-500/25',
                  !isCompleted &&
                    !isCurrent &&
                    'border-2 border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500',
                )}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={cn(
                  'text-sm whitespace-nowrap hidden sm:inline',
                  isCompleted && 'font-medium text-foreground',
                  isCurrent && 'font-semibold text-slate-700 dark:text-slate-400',
                  !isCompleted && !isCurrent && 'font-medium text-muted-foreground',
                )}
              >
                {labels[step]}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div
                className={cn(
                  'mx-3 h-0.5 w-8 sm:w-12 rounded-full',
                  isCompleted ? 'bg-emerald-400' : 'bg-zinc-200 dark:bg-zinc-700',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

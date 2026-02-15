'use client';

import type { OnboardingStep } from '@/lib/schemas/onboarding.schema';
import { Badge } from '@hr-portal/ui';
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
    <div className="flex flex-wrap items-center gap-2">
      {order.map((step, index) => (
        <Badge key={step} variant={index <= currentIndex ? 'default' : 'secondary'}>
          {index + 1}. {labels[step]}
        </Badge>
      ))}
    </div>
  );
}

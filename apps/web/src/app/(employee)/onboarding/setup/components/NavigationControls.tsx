'use client';

import { Button } from '@hr-portal/ui';
import type { ReactNode } from 'react';

export function NavigationControls({
  isFirst,
  isLast,
  isSaving,
  onBack,
  onNext,
}: {
  isFirst: boolean;
  isLast: boolean;
  isSaving: boolean;
  onBack: () => void;
  onNext: () => void;
}): ReactNode {
  return (
    <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-4">
      <Button variant="outline" onClick={onBack} disabled={isFirst || isSaving}>
        Back
      </Button>
      <Button onClick={onNext} disabled={isSaving}>
        {isSaving ? 'Saving...' : isLast ? 'Complete Onboarding' : 'Save & Continue'}
      </Button>
    </div>
  );
}

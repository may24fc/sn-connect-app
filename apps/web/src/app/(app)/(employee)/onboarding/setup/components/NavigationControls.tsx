'use client';

import { Button } from '@hr-portal/ui';
import { ArrowRight, CheckCircle2, ChevronLeft, Loader2 } from 'lucide-react';
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
        <ChevronLeft className="h-4 w-4" />
        Back
      </Button>
      <Button onClick={onNext} disabled={isSaving}>
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : isLast ? (
          <>
            <CheckCircle2 className="h-4 w-4" />
            Complete Onboarding
          </>
        ) : (
          <>
            <ArrowRight className="h-4 w-4" />
            Save & Continue
          </>
        )}
      </Button>
    </div>
  );
}

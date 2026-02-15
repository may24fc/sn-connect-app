'use client';

import { Check, Loader2 } from 'lucide-react';
import type * as React from 'react';
import type { FileStatus } from '../../types/ai-knowledge.types';
import { cn } from '../../utils/cn';

export interface UploadProgressProps {
  fileName: string;
  currentStage: FileStatus;
  className?: string;
}

const STAGES: Array<{ stage: FileStatus; label: string }> = [
  { stage: 'scanning', label: 'Scanning' },
  { stage: 'chunking', label: 'Chunking' },
  { stage: 'indexing', label: 'Indexing' },
  { stage: 'ready', label: 'Ready' },
];

export function UploadProgress({
  fileName,
  currentStage,
  className,
}: UploadProgressProps): React.ReactNode {
  const currentStageIndex = STAGES.findIndex((s) => s.stage === currentStage);

  return (
    <div
      className={cn('rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm', className)}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground truncate pr-2">{fileName}</p>
        <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
      </div>

      <div className="flex gap-1.5">
        {STAGES.map((stage, index) => {
          const isCompleted = index < currentStageIndex;
          const isCurrent = index === currentStageIndex;
          const isPending = index > currentStageIndex;

          return (
            <div
              key={stage.stage}
              className={cn(
                'flex-1 rounded-lg px-2 py-2 flex items-center justify-center gap-1.5 text-xs font-medium transition-all',
                isCompleted && 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
                isCurrent && 'bg-primary/15 text-primary',
                isPending && 'bg-muted/60 text-muted-foreground/70'
              )}
            >
              {isCompleted && <Check className="h-3 w-3" />}
              {isCurrent && <Loader2 className="h-3 w-3 animate-spin" />}
              <span className="hidden sm:inline">{stage.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

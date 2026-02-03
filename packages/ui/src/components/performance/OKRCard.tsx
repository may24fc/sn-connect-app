'use client';

import * as React from 'react';
import { Target, ChevronDown, ChevronUp, Edit2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../primitives/card';
import { Button } from '../../primitives/button';
import { Progress } from '../../primitives/progress';
import { OKRStatusBadge } from './PerformanceStatusBadge';
import { cn } from '../../utils/cn';
import type { OKR, KeyResult } from '../../types/performance.types';

interface KeyResultItemProps {
  keyResult: KeyResult;
  onUpdateProgress?: (id: string, value: number) => void;
  readonly?: boolean;
}

function KeyResultItem({
  keyResult,
  onUpdateProgress,
  readonly = true,
}: KeyResultItemProps): React.ReactNode {
  const progressColor = keyResult.progressPercentage >= 100
    ? 'bg-success'
    : keyResult.progressPercentage >= 70
    ? 'bg-primary'
    : keyResult.progressPercentage >= 40
    ? 'bg-warning'
    : 'bg-error';

  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium flex-1">{keyResult.description}</p>
        <span className="text-sm font-semibold text-primary whitespace-nowrap">
          {keyResult.progressPercentage}%
        </span>
      </div>
      <Progress
        value={keyResult.progressPercentage}
        className="h-2"
        indicatorClassName={progressColor}
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Current: {keyResult.currentValue} {keyResult.unit}
        </span>
        <span>
          Target: {keyResult.targetValue} {keyResult.unit}
        </span>
      </div>
      {!readonly && onUpdateProgress && (
        <div className="flex items-center gap-2 pt-1">
          <input
            type="range"
            min="0"
            max={keyResult.targetValue}
            value={keyResult.currentValue}
            onChange={(e) => onUpdateProgress(keyResult.id, Number(e.target.value))}
            className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer"
          />
          <Button variant="outline" size="sm">
            <Edit2 className="h-3 w-3 mr-1" />
            Update
          </Button>
        </div>
      )}
    </div>
  );
}

interface OKRCardProps {
  okr: OKR;
  onEdit?: (okr: OKR) => void;
  onUpdateKeyResult?: (okrId: string, keyResultId: string, value: number) => void;
  readonly?: boolean;
  defaultExpanded?: boolean;
  className?: string;
}

export function OKRCard({
  okr,
  onEdit,
  onUpdateKeyResult,
  readonly = true,
  defaultExpanded = false,
  className,
}: OKRCardProps): React.ReactNode {
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  const handleUpdateProgress = (keyResultId: string, value: number): void => {
    if (onUpdateKeyResult) {
      onUpdateKeyResult(okr.id, keyResultId, value);
    }
  };

  const overallProgressColor = okr.progressPercentage >= 100
    ? 'bg-success'
    : okr.progressPercentage >= 70
    ? 'bg-primary'
    : okr.progressPercentage >= 40
    ? 'bg-warning'
    : 'bg-error';

  return (
    <Card className={cn('transition-shadow hover:shadow-md', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base line-clamp-2">{okr.objective}</CardTitle>
              {okr.description && (
                <CardDescription className="mt-1 line-clamp-2">
                  {okr.description}
                </CardDescription>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <OKRStatusBadge status={okr.status} />
            {onEdit && !readonly && (
              <Button variant="ghost" size="icon" onClick={() => onEdit(okr)}>
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-semibold">{okr.progressPercentage}%</span>
          </div>
          <Progress
            value={okr.progressPercentage}
            className="h-3"
            indicatorClassName={overallProgressColor}
          />
        </div>

        {/* Key Results Toggle */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors w-full"
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          {okr.keyResults.length} Key Result{okr.keyResults.length !== 1 ? 's' : ''}
        </button>

        {/* Key Results List */}
        {expanded && (
          <div className="space-y-3 pt-2">
            {okr.keyResults.map((kr) => (
              <KeyResultItem
                key={kr.id}
                keyResult={kr}
                onUpdateProgress={handleUpdateProgress}
                readonly={readonly}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface OKRListProps {
  okrs: OKR[];
  onEdit?: (okr: OKR) => void;
  onUpdateKeyResult?: (okrId: string, keyResultId: string, value: number) => void;
  readonly?: boolean;
  emptyMessage?: string;
}

export function OKRList({
  okrs,
  onEdit,
  onUpdateKeyResult,
  readonly = true,
  emptyMessage = 'No OKRs found',
}: OKRListProps): React.ReactNode {
  if (okrs.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {okrs.map((okr) => (
        <OKRCard
          key={okr.id}
          okr={okr}
          onEdit={onEdit}
          onUpdateKeyResult={onUpdateKeyResult}
          readonly={readonly}
        />
      ))}
    </div>
  );
}

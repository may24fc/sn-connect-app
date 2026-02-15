'use client';

import { CheckCircle2, Clock, Users } from 'lucide-react';
import type * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../primitives/card';
import { Progress } from '../../primitives/progress';
import { cn } from '../../utils/cn';
import type { SubmissionTracking } from './types';

interface SubmissionRateCardProps {
  tracking: SubmissionTracking;
  className?: string;
}

export function SubmissionRateCard({
  tracking,
  className,
}: SubmissionRateCardProps): React.ReactNode {
  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle className="text-lg">Submission Rate</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-3xl font-bold">{tracking.submissionRate.toFixed(0)}%</div>
          <div className="text-sm text-muted-foreground">
            {tracking.submitted} of {tracking.totalStaff}
          </div>
        </div>

        <Progress value={tracking.submissionRate} className="h-3" />

        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              Total Staff
            </div>
            <div className="text-xl font-semibold">{tracking.totalStaff}</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              Submitted
            </div>
            <div className="text-xl font-semibold text-green-600">{tracking.submitted}</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3 text-orange-600" />
              Pending
            </div>
            <div className="text-xl font-semibold text-orange-600">{tracking.pending}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

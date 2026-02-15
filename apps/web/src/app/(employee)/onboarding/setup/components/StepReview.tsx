'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@hr-portal/ui';
import type { ReactNode } from 'react';

function renderPairs(title: string, data: Record<string, unknown>): ReactNode {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {Object.entries(data).length === 0 ? (
          <p className="text-sm text-muted-foreground">No data provided yet.</p>
        ) : (
          Object.entries(data).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">{key}</span>
              <span className="text-right">{String(value ?? '')}</span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function StepReview({
  personalInfo,
  paymentInfo,
}: {
  personalInfo: Record<string, unknown>;
  paymentInfo: Record<string, unknown>;
}): ReactNode {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {renderPairs('Personal Information', personalInfo)}
      {renderPairs('Payment Information', paymentInfo)}
    </div>
  );
}

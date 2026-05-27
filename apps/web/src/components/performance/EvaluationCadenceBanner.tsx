'use client';

import type { EvaluationCadenceBanner as EvaluationCadenceBannerData } from '@/lib/performance/evaluation-cadence';
import { Badge, Button, cn } from '@hr-portal/ui';
import { AlertTriangle, CalendarClock, ClipboardCheck, Target } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

const severityStyles = {
  critical: {
    panel:
      'border-rose-200 bg-gradient-to-r from-rose-50 via-white to-orange-50 dark:border-rose-900/60 dark:from-rose-950/40 dark:via-zinc-900 dark:to-orange-950/30',
    icon: 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300',
    eyebrow: 'text-rose-700 dark:text-rose-300',
  },
  warning: {
    panel:
      'border-amber-200 bg-gradient-to-r from-amber-50 via-white to-yellow-50 dark:border-amber-900/60 dark:from-amber-950/40 dark:via-zinc-900 dark:to-yellow-950/30',
    icon: 'bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300',
    eyebrow: 'text-amber-700 dark:text-amber-300',
  },
  info: {
    panel:
      'border-sky-200 bg-gradient-to-r from-sky-50 via-white to-indigo-50 dark:border-sky-900/60 dark:from-sky-950/40 dark:via-zinc-900 dark:to-indigo-950/30',
    icon: 'bg-sky-100 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300',
    eyebrow: 'text-sky-700 dark:text-sky-300',
  },
} as const;

export interface EvaluationCadenceBannerProps {
  banner: EvaluationCadenceBannerData | null;
}

export function EvaluationCadenceBanner({
  banner,
}: EvaluationCadenceBannerProps): ReactNode {
  if (!banner) {
    return null;
  }

  const Icon =
    banner.kind === 'quarterly' ? Target : banner.kind === 'monthly' ? ClipboardCheck : AlertTriangle;
  const styles = severityStyles[banner.severity];
  const badgeVariant = banner.severity === 'critical' ? 'error' : 'warning';

  return (
    <div className={cn('overflow-hidden rounded-xl border', styles.panel)}>
      <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', styles.icon)}>
            <Icon className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn('text-xs font-semibold uppercase tracking-[0.18em]', styles.eyebrow)}>
                Evaluation cadence
              </span>
              <Badge variant={badgeVariant}>{banner.meta ?? 'Action needed'}</Badge>
            </div>
            <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
              {banner.title}
            </h2>
            <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-300">
              {banner.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:justify-end">
          <div className="hidden items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 sm:flex">
            <CalendarClock className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>Visible until submitted</span>
          </div>
          <Link href={banner.href}>
            <Button>{banner.actionLabel}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
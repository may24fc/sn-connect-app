'use client';

import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import * as React from 'react';
import { cn } from '../../utils/cn';

export interface DashboardAttentionItem {
  id: string;
  title: string;
  description: string;
  count: number;
  href: string;
  icon: LucideIcon;
  severity: 'critical' | 'warning' | 'info';
  meta?: string;
  actionLabel?: string;
}

export interface DashboardAttentionCarouselProps {
  items: DashboardAttentionItem[];
  isLoading?: boolean;
  onNavigate: (path: string) => void;
  className?: string;
  intervalMs?: number;
  title?: string;
  totalCount?: number;
}

const severityStyles = {
  critical: {
    panel:
      'border-rose-200 bg-gradient-to-r from-rose-50 via-white to-orange-50 dark:border-rose-900/60 dark:from-rose-950/40 dark:via-zinc-900 dark:to-orange-950/30',
    icon: 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
    meta: 'text-rose-600 dark:text-rose-300',
  },
  warning: {
    panel:
      'border-amber-200 bg-gradient-to-r from-amber-50 via-white to-yellow-50 dark:border-amber-900/60 dark:from-amber-950/40 dark:via-zinc-900 dark:to-yellow-950/30',
    icon: 'bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    meta: 'text-amber-700 dark:text-amber-300',
  },
  info: {
    panel:
      'border-sky-200 bg-gradient-to-r from-sky-50 via-white to-indigo-50 dark:border-sky-900/60 dark:from-sky-950/40 dark:via-zinc-900 dark:to-indigo-950/30',
    icon: 'bg-sky-100 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
    meta: 'text-sky-700 dark:text-sky-300',
  },
} as const;

export function DashboardAttentionCarousel({
  items,
  isLoading = false,
  onNavigate,
  className,
  intervalMs = 4500,
  title = 'Needs Attention',
  totalCount,
}: DashboardAttentionCarouselProps): React.ReactNode {
  const [index, setIndex] = React.useState(0);
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    setIndex(0);
    setVisible(true);
  }, [items.length]);

  React.useEffect(() => {
    if (items.length <= 1) {
      return;
    }

    const timerId = window.setInterval(() => {
      setVisible(false);
      const transitionId = window.setTimeout(() => {
        setIndex((previousIndex) => (previousIndex + 1) % items.length);
        setVisible(true);
      }, 300);

      return () => window.clearTimeout(transitionId);
    }, intervalMs);

    return () => window.clearInterval(timerId);
  }, [items.length, intervalMs]);

  if (isLoading) {
    return (
      <div className={cn('rounded-lg border border-zinc-200 dark:border-zinc-800 bg-card p-6', className)}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        className={cn(
          'rounded-lg border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900/50 dark:bg-emerald-950/20',
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
            <AlertTriangle className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
              All caught up!
            </p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              No items require attention right now.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentItem = items[Math.min(index, items.length - 1)];

  if (!currentItem) {
    return null;
  }

  const styles = severityStyles[currentItem.severity];
  const computedTotalCount =
    totalCount ?? items.reduce((runningTotal, item) => runningTotal + item.count, 0);

  const showItem = (targetIndex: number) => {
    if (targetIndex === index) {
      return;
    }

    setVisible(false);
    window.setTimeout(() => {
      setIndex(targetIndex);
      setVisible(true);
    }, 300);
  };

  const showPrevious = () => {
    showItem((index - 1 + items.length) % items.length);
  };

  const showNext = () => {
    showItem((index + 1) % items.length);
  };

  return (
    <div className={cn('rounded-lg border border-zinc-200 dark:border-zinc-800 bg-card', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" strokeWidth={1.5} />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-100 px-1.5 text-xs font-bold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
            {computedTotalCount}
          </span>
        </div>

        {items.length > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={showPrevious}
              aria-label="Show previous attention item"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={showNext}
              aria-label="Show next attention item"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>

      <div className="p-4">
        <button
          type="button"
          onClick={() => onNavigate(currentItem.href)}
          className={cn(
            'w-full rounded-xl border p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500',
            styles.panel
          )}
          style={{
            opacity: visible ? 1 : 0,
            transition: 'opacity 300ms ease-in-out',
          }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', styles.icon)}>
                <currentItem.icon className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                    {currentItem.title}
                  </p>
                  {currentItem.meta ? (
                    <span className={cn('text-xs font-medium', styles.meta)}>
                      {currentItem.meta}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                  {currentItem.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:justify-end">
              <span
                className={cn(
                  'flex h-10 min-w-[40px] items-center justify-center rounded-full px-3 text-sm font-bold',
                  styles.badge
                )}
              >
                {currentItem.count}
              </span>
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                {currentItem.actionLabel ?? 'Review now'}
              </span>
              <ChevronRight className="h-4 w-4 text-zinc-500 dark:text-zinc-300" strokeWidth={1.5} />
            </div>
          </div>
        </button>
      </div>

      {items.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 px-6 pb-4">
          {items.map((item, itemIndex) => (
            <button
              key={item.id}
              type="button"
              onClick={() => showItem(itemIndex)}
              aria-label={`View attention item ${itemIndex + 1} of ${items.length}`}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                itemIndex === index
                  ? 'w-4 bg-zinc-700 dark:bg-zinc-200'
                  : 'w-1.5 bg-zinc-300 hover:bg-zinc-400 dark:bg-zinc-700 dark:hover:bg-zinc-500'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
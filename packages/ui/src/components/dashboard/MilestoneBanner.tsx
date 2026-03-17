'use client';

import { Cake, PartyPopper } from 'lucide-react';
import * as React from 'react';
import { cn } from '../../utils/cn';
import type { MilestoneItem } from './MilestoneFeed';

export interface MilestoneBannerProps {
  milestones: MilestoneItem[];
  isLoading?: boolean;
  className?: string;
  /** Milliseconds between fade transitions. Default: 3500 */
  intervalMs?: number;
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'h-[72px] w-full rounded-xl animate-pulse bg-zinc-100 dark:bg-zinc-800',
        className
      )}
    />
  );
}

export function MilestoneBanner({
  milestones,
  isLoading,
  className,
  intervalMs = 3500,
}: MilestoneBannerProps): React.ReactNode {
  const [index, setIndex] = React.useState(0);
  const [visible, setVisible] = React.useState(true);

  // Reset index when milestone list changes length
  React.useEffect(() => {
    setIndex(0);
    setVisible(true);
  }, [milestones.length]);

  // Auto-cycle when there are multiple milestones
  React.useEffect(() => {
    if (milestones.length <= 1) return;

    const timerId = setInterval(() => {
      setVisible(false);
      const t = setTimeout(() => {
        setIndex((prev) => (prev + 1) % milestones.length);
        setVisible(true);
      }, 350);
      return () => clearTimeout(t);
    }, intervalMs);

    return () => clearInterval(timerId);
  }, [milestones.length, intervalMs]);

  // Skeleton with `cn()` so className is always a string (satisfies exactOptionalPropertyTypes)
  if (isLoading) return <Skeleton className={cn(className)} />;
  if (milestones.length === 0) return null;

  // Safe: length was just confirmed non-zero; `!` asserts non-null to satisfy noUncheckedIndexedAccess
  // biome-ignore lint/style/noNonNullAssertion: guarded by milestones.length check above
  const m = milestones[Math.min(index, milestones.length - 1)]!;
  const isBirthday = m.type === 'birthday';

  const gradientClass = isBirthday
    ? 'from-pink-50 via-rose-50 to-white dark:from-pink-950/40 dark:via-rose-950/30 dark:to-zinc-900'
    : 'from-amber-50 via-orange-50 to-white dark:from-amber-950/40 dark:via-orange-950/30 dark:to-zinc-900';

  const iconBgClass = isBirthday
    ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-500 dark:text-pink-400'
    : 'bg-amber-100 dark:bg-amber-900/40 text-amber-500 dark:text-amber-400';

  const Icon = isBirthday ? Cake : PartyPopper;

  const initials = m.fullName
    .split(' ')
    .map((n) => n[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const daysLabel =
    m.daysUntil === 0 ? 'Today! 🎉' : m.daysUntil === 1 ? 'Tomorrow' : `In ${m.daysUntil}d`;

  const milestoneLabel = isBirthday
    ? 'Birthday'
    : m.yearsCount
      ? `${m.yearsCount}-Year Work Anniversary`
      : 'Work Anniversary';

  const detail = [m.position, m.department].filter(Boolean).join(' · ');

  const jumpTo = (i: number) => {
    if (i === index) return;
    setVisible(false);
    setTimeout(() => {
      setIndex(i);
      setVisible(true);
    }, 350);
  };

  return (
    <div
      className={cn(
        'w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-gradient-to-r overflow-hidden',
        gradientClass,
        className
      )}
    >
      <div
        className="flex items-center gap-4 px-5 py-4"
        style={{
          opacity: visible ? 1 : 0,
          transition: 'opacity 350ms ease-in-out',
        }}
      >
        {/* Type icon */}
        <div className={cn('flex-shrink-0 rounded-full p-2.5', iconBgClass)}>
          <Icon className="h-5 w-5" strokeWidth={1.5} />
        </div>

        {/* Avatar */}
        {m.avatarUrl ? (
          <img
            src={m.avatarUrl}
            alt={m.fullName}
            className="h-10 w-10 flex-shrink-0 rounded-full object-cover ring-2 ring-white dark:ring-zinc-800"
          />
        ) : (
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-900/30 ring-2 ring-white dark:ring-zinc-800 text-slate-700 dark:text-slate-400 text-sm font-semibold">
            {initials}
          </div>
        )}

        {/* Name & subtitle */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {m.fullName}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
            {milestoneLabel}
            {detail ? ` · ${detail}` : ''}
          </p>
        </div>

        {/* Days until label */}
        <div className="flex-shrink-0 text-right">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{daysLabel}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {new Date(m.upcomingDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>

        {/* Dot navigation — only shown when multiple milestones */}
        {milestones.length > 1 && (
          <div className="flex-shrink-0 flex items-center gap-1.5 ml-2">
            {milestones.map((_, i) => (
              <button
                // biome-ignore lint/suspicious/noArrayIndexKey: index is stable here
                key={i}
                type="button"
                onClick={() => jumpTo(i)}
                aria-label={`View milestone ${i + 1} of ${milestones.length}`}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500',
                  i === index
                    ? 'w-4 bg-zinc-600 dark:bg-zinc-300'
                    : 'w-1.5 bg-zinc-300 dark:bg-zinc-600 hover:bg-zinc-400 dark:hover:bg-zinc-500'
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

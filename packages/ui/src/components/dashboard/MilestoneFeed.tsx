'use client';

import { Cake, CalendarDays, PartyPopper } from 'lucide-react';
import type * as React from 'react';
import { cn } from '../../utils/cn';

export interface MilestoneItem {
  employeeId: string;
  userId: string | null;
  fullName: string;
  avatarUrl: string | null;
  role: string | null;
  department: string | null;
  position: string | null;
  type: 'birthday' | 'anniversary';
  date: string;
  upcomingDate: string;
  daysUntil: number;
  yearsCount?: number;
}

export interface MilestoneFeedProps {
  milestones: MilestoneItem[];
  grouped?: {
    today: MilestoneItem[];
    thisWeek: MilestoneItem[];
    thisMonth: MilestoneItem[];
    later: MilestoneItem[];
  };
  isLoading?: boolean;
  compact?: boolean;
  maxItems?: number;
  className?: string;
}

function MilestoneAvatar({
  name,
  avatarUrl,
}: { name: string; avatarUrl: string | null }): React.ReactNode {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="h-8 w-8 rounded-full object-cover ring-2 ring-white dark:ring-zinc-800"
      />
    );
  }

  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-medium ring-2 ring-white dark:ring-zinc-800">
      {initials}
    </div>
  );
}

function MilestoneRow({
  milestone,
  compact,
}: { milestone: MilestoneItem; compact?: boolean }): React.ReactNode {
  const isBirthday = milestone.type === 'birthday';
  const Icon = isBirthday ? Cake : PartyPopper;
  const iconColor = isBirthday
    ? 'text-pink-500 dark:text-pink-400'
    : 'text-amber-500 dark:text-amber-400';
  const bgColor = isBirthday
    ? 'bg-pink-50 dark:bg-pink-900/20'
    : 'bg-amber-50 dark:bg-amber-900/20';

  const label = isBirthday
    ? 'Birthday'
    : milestone.yearsCount
      ? `${milestone.yearsCount} Year${milestone.yearsCount > 1 ? 's' : ''} Anniversary`
      : 'Work Anniversary';

  const dateStr = new Date(milestone.upcomingDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="flex items-center gap-3 py-2">
      <div className={cn('flex-shrink-0 rounded-full p-1.5', bgColor)}>
        <Icon className={cn('h-4 w-4', iconColor)} strokeWidth={1.5} />
      </div>
      {!compact && <MilestoneAvatar name={milestone.fullName} avatarUrl={milestone.avatarUrl} />}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
          {milestone.fullName}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {label}
          {!compact && milestone.position && ` · ${milestone.position}`}
        </p>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">{dateStr}</p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          {milestone.daysUntil === 0
            ? 'Today!'
            : milestone.daysUntil === 1
              ? 'Tomorrow'
              : `${milestone.daysUntil}d`}
        </p>
      </div>
    </div>
  );
}

function MilestoneGroup({
  title,
  items,
  compact,
}: { title: string; items: MilestoneItem[]; compact?: boolean }): React.ReactNode {
  if (items.length === 0) return null;

  return (
    <div>
      <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
        {title}
      </h4>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {items.map((m) => (
          <MilestoneRow key={`${m.employeeId}-${m.type}`} milestone={m} compact={compact} />
        ))}
      </div>
    </div>
  );
}

function MilestoneSkeleton(): React.ReactNode {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-700" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-24 rounded bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-3 w-16 rounded bg-zinc-200 dark:bg-zinc-700" />
          </div>
          <div className="h-3 w-12 rounded bg-zinc-200 dark:bg-zinc-700" />
        </div>
      ))}
    </div>
  );
}

export function MilestoneFeed({
  milestones,
  grouped,
  isLoading,
  compact = false,
  maxItems,
  className,
}: MilestoneFeedProps): React.ReactNode {
  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center gap-2">
          <CalendarDays
            className="h-4 w-4 text-zinc-400 dark:text-zinc-500"
            strokeWidth={1.5}
          />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Upcoming Milestones
          </h3>
        </div>
        <MilestoneSkeleton />
      </div>
    );
  }

  const displayMilestones = maxItems ? milestones.slice(0, maxItems) : milestones;

  if (displayMilestones.length === 0) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center gap-2">
          <CalendarDays
            className="h-4 w-4 text-zinc-400 dark:text-zinc-500"
            strokeWidth={1.5}
          />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Upcoming Milestones
          </h3>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 py-4 text-center">
          No upcoming milestones in the next 30 days.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-zinc-400 dark:text-zinc-500" strokeWidth={1.5} />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Upcoming Milestones
        </h3>
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          ({displayMilestones.length})
        </span>
      </div>

      {grouped ? (
        <div className="space-y-4">
          <MilestoneGroup title="Today" items={grouped.today} compact={compact} />
          <MilestoneGroup title="This Week" items={grouped.thisWeek} compact={compact} />
          <MilestoneGroup title="This Month" items={grouped.thisMonth} compact={compact} />
          {grouped.later.length > 0 && !maxItems && (
            <MilestoneGroup title="Later" items={grouped.later} compact={compact} />
          )}
        </div>
      ) : (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {displayMilestones.map((m) => (
            <MilestoneRow key={`${m.employeeId}-${m.type}`} milestone={m} compact={compact} />
          ))}
        </div>
      )}
    </div>
  );
}

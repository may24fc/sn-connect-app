'use client';

import { BarChart3, Eye, Loader2, Megaphone, Percent, Send, Timer, Users } from 'lucide-react';
import type * as React from 'react';
import { cn } from '../../utils/cn';

// --- Types ---

export interface AnnouncementAnalyticsData {
  announcement: {
    id: string;
    title: string;
    status: string;
    read_count: number;
    published_at: string | null;
  };
  totalViews: number;
  uniqueReaders: number;
  totalTargeted: number;
  readRate: number;
  avgTimeToReadMs: number | null;
  viewsByRole: Record<string, number>;
  viewsByDepartment: Record<string, number>;
  timeSeries: Array<{ date: string; count: number }>;
}

export interface AnnouncementAnalyticsDashboardProps {
  data: AnnouncementAnalyticsData | null;
  isLoading?: boolean;
  onSendReminder?: () => void;
  isReminding?: boolean;
}

// --- Helpers ---

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// --- Component ---

export function AnnouncementAnalyticsDashboard({
  data,
  isLoading = false,
  onSendReminder,
  isReminding = false,
}: AnnouncementAnalyticsDashboardProps): React.ReactNode {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <BarChart3 className="h-10 w-10 text-zinc-400 dark:text-zinc-600 mb-3" strokeWidth={1.5} />
        <p className="text-sm text-zinc-500">No analytics data available</p>
      </div>
    );
  }

  const roleEntries = Object.entries(data.viewsByRole).sort((a, b) => b[1] - a[1]);
  const deptEntries = Object.entries(data.viewsByDepartment).sort((a, b) => b[1] - a[1]);
  const maxTimeSeries = Math.max(...data.timeSeries.map((t) => t.count), 1);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={<Users className="h-4 w-4" strokeWidth={1.5} />}
          label="Total Targeted"
          value={data.totalTargeted}
        />
        <SummaryCard
          icon={<Eye className="h-4 w-4" strokeWidth={1.5} />}
          label="Total Read"
          value={data.uniqueReaders}
        />
        <SummaryCard
          icon={<Percent className="h-4 w-4" strokeWidth={1.5} />}
          label="Read Rate"
          value={`${data.readRate}%`}
          highlight={data.readRate < 50}
        />
        <SummaryCard
          icon={<Timer className="h-4 w-4" strokeWidth={1.5} />}
          label="Avg Time to Read"
          value={data.avgTimeToReadMs ? formatDuration(data.avgTimeToReadMs) : 'N/A'}
        />
      </div>

      {/* Reminder Button */}
      {onSendReminder && data.readRate < 100 && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20">
          <Megaphone
            className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0"
            strokeWidth={1.5}
          />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {data.totalTargeted - data.uniqueReaders} user
              {data.totalTargeted - data.uniqueReaders !== 1 ? 's' : ''} haven&apos;t read this yet
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              Send a reminder notification to all unread users
            </p>
          </div>
          <button
            type="button"
            onClick={onSendReminder}
            disabled={isReminding}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isReminding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" strokeWidth={1.5} />
            )}
            Send Reminder
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Read Rate Over Time (Bar Chart) */}
        {data.timeSeries.length > 0 && (
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              Reads Over Time
            </h3>
            <div className="space-y-2">
              {data.timeSeries.map((entry) => (
                <div key={entry.date} className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 w-20 flex-shrink-0 tabular-nums">
                    {new Date(entry.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <div className="flex-1 h-5 rounded bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded bg-indigo-500 dark:bg-indigo-600 transition-all"
                      style={{ width: `${(entry.count / maxTimeSeries) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 w-8 text-right tabular-nums">
                    {entry.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Read vs Unread */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
            Read vs Unread
          </h3>
          <div className="flex items-center gap-4">
            {/* Simple donut visual */}
            <div className="relative h-24 w-24 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  className="stroke-zinc-200 dark:stroke-zinc-700"
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  className="stroke-indigo-500"
                  strokeWidth="3"
                  strokeDasharray={`${data.readRate} ${100 - data.readRate}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  {data.readRate}%
                </span>
              </div>
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">Read</span>
                </div>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50 tabular-nums">
                  {data.uniqueReaders}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">Unread</span>
                </div>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50 tabular-nums">
                  {data.totalTargeted - data.uniqueReaders}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Audience Breakdown by Role */}
        {roleEntries.length > 0 && (
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              Views by Role
            </h3>
            <div className="space-y-2">
              {roleEntries.map(([role, count]) => (
                <div key={role} className="flex items-center justify-between">
                  <span className="text-sm text-zinc-700 dark:text-zinc-300 capitalize">
                    {role.replace(/_/g, ' ')}
                  </span>
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50 tabular-nums">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audience Breakdown by Department */}
        {deptEntries.length > 0 && (
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              Views by Department
            </h3>
            <div className="space-y-2">
              {deptEntries.map(([dept, count]) => (
                <div key={dept} className="flex items-center justify-between">
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{dept}</span>
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50 tabular-nums">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Sub-Components ---

function SummaryCard({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  highlight?: boolean;
}): React.ReactNode {
  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        highlight
          ? 'border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20'
          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className={cn(
            highlight ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-400 dark:text-zinc-500'
          )}
        >
          {icon}
        </span>
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p
        className={cn(
          'text-2xl font-bold tabular-nums',
          highlight ? 'text-amber-700 dark:text-amber-300' : 'text-zinc-900 dark:text-zinc-50'
        )}
      >
        {value}
      </p>
    </div>
  );
}

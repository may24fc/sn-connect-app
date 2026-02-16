import type * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../primitives/card';

export interface ResourceAnalyticsProps {
  viewCount: number;
  uniqueViewers: number;
  downloadCount: number;
  bookmarkCount: number;
  avgDurationSeconds: number | null;
  completionRate: number | null;
  viewTrend: Array<{ date: string; count: number }>;
}

export function ResourceAnalytics({
  viewCount,
  uniqueViewers,
  downloadCount,
  bookmarkCount,
  avgDurationSeconds,
  completionRate,
  viewTrend,
}: ResourceAnalyticsProps): React.ReactNode {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Views" value={viewCount} />
        <StatCard label="Unique Viewers" value={uniqueViewers} />
        <StatCard label="Downloads" value={downloadCount} />
        <StatCard label="Bookmarks" value={bookmarkCount} />
      </div>

      {avgDurationSeconds !== null || completionRate !== null ? (
        <div className="grid grid-cols-2 gap-4">
          {avgDurationSeconds !== null ? (
            <StatCard label="Avg. Duration" value={formatDuration(avgDurationSeconds)} />
          ) : null}
          {completionRate !== null ? (
            <StatCard label="Completion Rate" value={`${Math.round(completionRate)}%`} />
          ) : null}
        </div>
      ) : null}

      <Card className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
        <CardHeader className="p-0 pb-3">
          <CardTitle className="text-sm text-zinc-600 dark:text-zinc-400">View Trend</CardTitle>
        </CardHeader>
        <CardContent className="p-0 space-y-2">
          {viewTrend.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No view data yet.</p>
          ) : (
            viewTrend.map((item) => (
              <div key={item.date} className="flex items-center justify-between text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">{item.date}</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-50">{item.count}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }): React.ReactNode {
  return (
    <Card className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
      <CardHeader className="p-0 pb-2">
        <CardTitle className="text-sm text-zinc-600 dark:text-zinc-400">{label}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{value}</p>
      </CardContent>
    </Card>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

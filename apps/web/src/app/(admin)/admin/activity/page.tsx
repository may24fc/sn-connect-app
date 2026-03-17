'use client';

import { useRecentActivity } from '@/hooks/useRecentActivity';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@hr-portal/ui';
import { Activity, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function tableLabel(tableName: string): string {
  return tableName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdminActivityPage(): ReactNode {
  const { data, isLoading } = useRecentActivity(100);
  const activities = data ?? [];

  return (
    <div className="h-full space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/dashboard">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
            All Activity
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Full audit trail of recent actions across the portal
          </p>
        </div>
      </div>

      {/* Activity List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Activity className="h-4 w-4" strokeWidth={1.5} />
            Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Activity className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mb-3" strokeWidth={1.5} />
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No activity yet</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                Actions performed across the portal will appear here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start justify-between py-3 gap-4 first:pt-0 last:pb-0"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <CheckCircle
                      className="h-4 w-4 text-slate-500 flex-shrink-0 mt-0.5"
                      strokeWidth={1.5}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {activity.action}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {activity.performedBy}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {activity.tableName && (
                      <Badge variant="secondary" className="text-xs h-5 hidden sm:flex">
                        {tableLabel(activity.tableName)}
                      </Badge>
                    )}
                    <span className="text-xs text-zinc-400 dark:text-zinc-500 whitespace-nowrap">
                      {formatRelativeTime(activity.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

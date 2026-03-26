'use client';

import { useRecentActivity } from '@/hooks/useRecentActivity';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@hr-portal/ui';
import {
  Activity,
  ArrowLeft,
  Bot,
  Briefcase,
  ClipboardList,
  DollarSign,
  FileText,
  Loader2,
  Megaphone,
  Monitor,
  Plus,
  Settings,
  Trash2,
  UserCheck,
  Users,
  Edit,
} from 'lucide-react';
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

const CATEGORY_BADGE_CLASSES: Record<string, string> = {
  announcements: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  tasks: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  resources: 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
  employees: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  documents: 'bg-slate-50 text-slate-700 dark:bg-zinc-900 dark:text-zinc-300',
  organization: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  reports: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
  performance: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  internships: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  onboarding: 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  ai: 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300',
  finance: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
  standups: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  system: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  other: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
};

function getActionIcon(action: string) {
  const lower = action.toLowerCase();
  if (lower.includes('deleted')) return <Trash2 className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" strokeWidth={1.5} />;
  if (lower.includes('created') || lower.includes('added') || lower.includes('started') || lower.includes('submitted'))
    return <Plus className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" strokeWidth={1.5} />;
  if (lower.includes('updated') || lower.includes('edited'))
    return <Edit className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" strokeWidth={1.5} />;
  return <Activity className="h-4 w-4 text-zinc-400 flex-shrink-0 mt-0.5" strokeWidth={1.5} />;
}

function getCategoryIcon(category: string) {
  switch (category) {
    case 'announcements': return <Megaphone className="h-3 w-3" strokeWidth={1.5} />;
    case 'tasks': return <ClipboardList className="h-3 w-3" strokeWidth={1.5} />;
    case 'resources': return <FileText className="h-3 w-3" strokeWidth={1.5} />;
    case 'employees': return <Users className="h-3 w-3" strokeWidth={1.5} />;
    case 'documents': return <FileText className="h-3 w-3" strokeWidth={1.5} />;
    case 'performance': return <Monitor className="h-3 w-3" strokeWidth={1.5} />;
    case 'internships': return <Briefcase className="h-3 w-3" strokeWidth={1.5} />;
    case 'onboarding': return <UserCheck className="h-3 w-3" strokeWidth={1.5} />;
    case 'ai': return <Bot className="h-3 w-3" strokeWidth={1.5} />;
    case 'finance': return <DollarSign className="h-3 w-3" strokeWidth={1.5} />;
    case 'system': return <Settings className="h-3 w-3" strokeWidth={1.5} />;
    default: return null;
  }
}

export default function SuperAdminActivityPage(): ReactNode {
  const { data, isLoading } = useRecentActivity(100);
  const activities = data ?? [];

  return (
    <div className="h-full space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Link href="/super-admin/dashboard">
          <Button variant="ghost" size="icon-sm">
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
                    {getActionIcon(activity.action)}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {activity.action}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {activity.performedBy === 'System' ? (
                          <span className="inline-flex items-center gap-1">
                            <Settings className="h-3 w-3" strokeWidth={1.5} />
                            System
                          </span>
                        ) : (
                          activity.performedBy
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {activity.categoryLabel && (
                      <Badge
                        variant="secondary"
                        className={`text-xs h-5 hidden sm:inline-flex items-center gap-1 border-0 ${CATEGORY_BADGE_CLASSES[activity.category] ?? CATEGORY_BADGE_CLASSES.other}`}
                      >
                        {getCategoryIcon(activity.category)}
                        {activity.categoryLabel}
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

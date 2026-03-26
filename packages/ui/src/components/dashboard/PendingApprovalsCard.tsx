'use client';

import {
  AlertTriangle,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Loader2,
  Star,
  Users,
} from 'lucide-react';
import type * as React from 'react';
import { cn } from '../../utils/cn';

// --- Types ---

export interface PendingApprovalsData {
  pendingReports: {
    count: number;
    overdue: number;
  };
  pendingInvoices: {
    count: number;
  };
  pendingReviews: {
    count: number;
  };
  lateEodReports: {
    count: number;
  };
  totalPending: number;
}

export interface PendingApprovalsCardProps {
  data: PendingApprovalsData | null;
  isLoading?: boolean;
  onNavigate: (path: string) => void;
}

// --- Component ---

export function PendingApprovalsCard({
  data,
  isLoading = false,
  onNavigate,
}: PendingApprovalsCardProps): React.ReactNode {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!data || data.totalPending === 0) {
    return (
      <div className="rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/20 p-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50">
            <ClipboardList
              className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
              strokeWidth={1.5}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
              All caught up!
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              No pending approvals at this time
            </p>
          </div>
        </div>
      </div>
    );
  }

  const items = [
    {
      label: 'Reports to Review',
      count: data.pendingReports.count,
      overdue: data.pendingReports.overdue,
      icon: ClipboardList,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100 dark:bg-blue-900/50',
      href: '/admin/reports',
    },
    {
      label: 'Invoices Pending',
      count: data.pendingInvoices.count,
      overdue: 0,
      icon: CreditCard,
      color: 'text-violet-500',
      bgColor: 'bg-violet-100 dark:bg-violet-900/50',
      href: '/admin/payroll-approvals',
    },
    {
      label: 'Reviews Pending',
      count: data.pendingReviews.count,
      overdue: 0,
      icon: Star,
      color: 'text-amber-500',
      bgColor: 'bg-amber-100 dark:bg-amber-900/50',
      href: '/admin/performance',
    },
    {
      label: 'Late Intern EODs',
      count: data.lateEodReports.count,
      overdue: data.lateEodReports.count, // All late EODs are overdue by definition
      icon: Users,
      color: 'text-rose-500',
      bgColor: 'bg-rose-100 dark:bg-rose-900/50',
      href: '/admin/interns',
    },
  ].filter((item) => item.count > 0);

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" strokeWidth={1.5} />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Pending Approvals
          </h3>
          <span className="flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-bold">
            {data.totalPending}
          </span>
        </div>
      </div>

      {/* Items */}
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onNavigate(item.href)}
            className="group flex items-center gap-4 w-full px-6 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left"
          >
            <div
              className={cn(
                'flex items-center justify-center h-9 w-9 rounded-lg flex-shrink-0',
                item.bgColor
              )}
            >
              <item.icon className={cn('h-4 w-4', item.color)} strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.label}</p>
              {item.overdue > 0 && (
                <p className="text-xs text-rose-500 dark:text-rose-400 font-medium">
                  {item.overdue} overdue
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span
                className={cn(
                  'flex items-center justify-center h-6 min-w-[24px] px-2 rounded-full text-xs font-bold',
                  item.overdue > 0
                    ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                )}
              >
                {item.count}
              </span>
              <ChevronRight
                className="h-4 w-4 text-zinc-500 dark:text-zinc-400 transition-colors group-hover:text-zinc-700 dark:group-hover:text-zinc-200"
                strokeWidth={1.5}
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

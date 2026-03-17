import type * as React from 'react';
import { Badge } from '../../primitives/badge';
import { cn } from '../../utils/cn';

export interface AnnouncementCardProps {
  title: string;
  excerpt: string;
  category: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status?: 'draft' | 'scheduled' | 'published' | 'expired' | 'archived';
  dateLabel: string;
  isRead?: boolean | undefined;
  isPinned?: boolean;
  readCount?: number;
  onClick?: () => void;
  actions?: React.ReactNode;
}

const statusVariant: Record<string, 'success' | 'secondary' | 'warning' | 'outline'> = {
  published: 'success',
  draft: 'secondary',
  scheduled: 'warning',
  expired: 'outline',
  archived: 'outline',
};

const priorityIndicator: Record<string, string> = {
  urgent: 'bg-rose-500',
  high: 'bg-amber-500',
  normal: 'bg-zinc-300 dark:bg-zinc-600',
  low: 'bg-zinc-200 dark:bg-zinc-700',
};

export function AnnouncementCard({
  title,
  excerpt,
  category,
  priority,
  status,
  dateLabel,
  isRead,
  isPinned,
  readCount,
  onClick,
  actions,
}: AnnouncementCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg transition-colors',
        onClick && 'cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700',
        isRead === true && 'opacity-60'
      )}
    >
      <div className="p-4 space-y-2">
        {/* Header: priority dot + title + indicators */}
        <div className="flex items-start gap-2">
          <span
            className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', priorityIndicator[priority])}
            title={`${priority} priority`}
          />
          <h3 className="flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-50 line-clamp-2 leading-snug">
            {title}
          </h3>
          <div className="flex items-center gap-1.5 shrink-0">
            {isPinned && (
              <Badge variant="navy" className="text-[11px] px-1.5 py-0">
                Pinned
              </Badge>
            )}
            {isRead === false && (
              <span className="h-2 w-2 rounded-full bg-slate-800" title="Unread" />
            )}
          </div>
        </div>

        {/* Excerpt */}
        <p className="text-[13px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
          {excerpt}
        </p>

        {/* Meta row: category · status · date */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500">
          <span className="text-zinc-600 dark:text-zinc-400 font-medium">{category}</span>
          {status && (
            <>
              <span aria-hidden>·</span>
              <Badge
                variant={statusVariant[status] ?? 'outline'}
                className="text-[11px] px-1.5 py-0"
              >
                {status}
              </Badge>
            </>
          )}
          <span aria-hidden>·</span>
          <span>{dateLabel}</span>
          {readCount !== undefined && (
            <>
              <span aria-hidden>·</span>
              <span>{readCount} reads</span>
            </>
          )}
        </div>
      </div>

      {/* Actions footer */}
      {actions && (
        <div className="border-t border-zinc-100 dark:border-zinc-800 px-4 py-2 flex items-center gap-1">
          {actions}
        </div>
      )}
    </div>
  );
}

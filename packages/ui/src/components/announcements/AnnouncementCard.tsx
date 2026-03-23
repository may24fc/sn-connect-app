import * as React from 'react';
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
  isStarred?: boolean;
  readCount?: number;
  onClick?: () => void;
  onStar?: () => void;
  actions?: React.ReactNode;
}

const statusVariant: Record<string, 'success' | 'secondary' | 'warning' | 'outline'> = {
  published: 'success',
  draft: 'secondary',
  scheduled: 'warning',
  expired: 'outline',
  archived: 'outline',
};

const priorityDot: Record<string, string> = {
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
  isStarred,
  readCount,
  onClick,
  onStar,
  actions,
}: AnnouncementCardProps) {
  const unread = isRead === false;

  return (
    <div
      onClick={onClick}
      className={cn(
        'group flex items-center py-2.5 px-2 gap-2 border-b border-zinc-100 dark:border-zinc-800 transition-colors bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/60',
        onClick && 'cursor-pointer'
      )}
    >
      {/* Star button */}
      <button
        type="button"
        aria-label={isStarred ? 'Unstar announcement' : 'Star announcement'}
        onClick={(e) => {
          e.stopPropagation();
          onStar?.();
        }}
        className={cn(
          'shrink-0 h-7 w-7 flex items-center justify-center rounded transition-colors',
          isStarred
            ? 'text-amber-400 hover:text-amber-500'
            : 'text-zinc-200 dark:text-zinc-700 hover:text-amber-400 dark:hover:text-amber-400 opacity-0 group-hover:opacity-100'
        )}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill={isStarred ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      </button>

      {/* Priority dot */}
      <span
        className={cn('shrink-0 h-2 w-2 rounded-full', priorityDot[priority])}
        title={`${priority} priority`}
      />

      {/* Category — sender column */}
      <span
        className={cn(
          'shrink-0 w-32 truncate text-[13px]',
          unread
            ? 'font-semibold text-zinc-800 dark:text-zinc-100'
            : 'font-medium text-zinc-400 dark:text-zinc-500'
        )}
      >
        {category}
      </span>

      {/* Subject + snippet inline — flex-1 */}
      <span className="flex-1 min-w-0 flex items-baseline gap-1 text-[13px] truncate">
        <span
          className={cn(
            'shrink-0 max-w-[45%] truncate',
            unread
              ? 'font-semibold text-zinc-800 dark:text-zinc-100'
              : 'font-normal text-zinc-500 dark:text-zinc-400'
          )}
        >
          {title}
        </span>
        <span className={cn('truncate min-w-0', unread ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-350 dark:text-zinc-600')}>
          &ndash; {excerpt}
        </span>
      </span>

      {/* Badges + read count — revealed on hover, replaced by actions when present */}
      <div className="shrink-0 flex items-center gap-1">
        {actions ? (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {actions}
          </div>
        ) : (
          <>
            {readCount !== undefined && (
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity">
                {readCount} reads
              </span>
            )}
            {status && (
              <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Badge
                  variant={statusVariant[status] ?? 'outline'}
                  className="text-[10px] px-1.5 py-0"
                >
                  {status}
                </Badge>
              </span>
            )}
          </>
        )}
        {isPinned && (
          <Badge variant="navy" className="text-[10px] px-1.5 py-0">
            Pinned
          </Badge>
        )}
      </div>

      {/* Date — far right */}
      <span
        className={cn(
          'shrink-0 w-24 text-right text-[12px] whitespace-nowrap',
          unread
            ? 'font-medium text-zinc-600 dark:text-zinc-300'
            : 'text-zinc-350 dark:text-zinc-600'
        )}
      >
        {dateLabel}
      </span>
    </div>
  );
}

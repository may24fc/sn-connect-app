import { Badge } from '../../primitives/badge';
import { Card, CardContent } from '../../primitives/card';
import { cn } from '../../utils/cn';

export interface AnnouncementCardProps {
  title: string;
  excerpt: string;
  category: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status?: 'draft' | 'scheduled' | 'published' | 'expired' | 'archived';
  dateLabel: string;
  isRead?: boolean;
  isPinned?: boolean;
  onClick?: () => void;
}

const priorityClasses: Record<AnnouncementCardProps['priority'], string> = {
  low: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-1 rounded text-xs font-medium',
  normal:
    'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded text-xs font-medium',
  high: 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 px-2 py-1 rounded text-xs font-medium',
  urgent:
    'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 px-2 py-1 rounded text-xs font-medium',
};

const statusClasses: Record<NonNullable<AnnouncementCardProps['status']>, string> = {
  draft:
    'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-1 rounded text-xs font-medium',
  scheduled:
    'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 px-2 py-1 rounded text-xs font-medium',
  published:
    'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded text-xs font-medium',
  expired:
    'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-1 rounded text-xs font-medium',
  archived:
    'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-1 rounded text-xs font-medium',
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
  onClick,
}: AnnouncementCardProps) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer',
        isRead && 'opacity-75',
        !isRead && 'border-l-4 border-l-indigo-600'
      )}
    >
      <CardContent className="p-0 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 line-clamp-2">
            {title}
          </h3>
          {isPinned ? (
            <Badge className="bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded text-xs font-medium">
              Pinned
            </Badge>
          ) : null}
        </div>

        <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3">{excerpt}</p>

        <div className="flex flex-wrap items-center gap-2">
          <span className="bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded text-xs font-medium">
            {category}
          </span>
          <span className={priorityClasses[priority]}>{priority}</span>
          {status ? <span className={statusClasses[status]}>{status}</span> : null}
        </div>

        <p className="text-xs text-zinc-500 dark:text-zinc-400">{dateLabel}</p>
      </CardContent>
    </Card>
  );
}

'use client';

import { Calendar, Clock } from 'lucide-react';
import { Badge } from '../../primitives/badge';
import { Button } from '../../primitives/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../primitives/dialog';
import { Separator } from '../../primitives/separator';

export interface AnnouncementDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isStarred?: boolean;
  onStar?: () => void;
  announcement: {
    id: string;
    title: string;
    content: string;
    excerpt?: string | null;
    category: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    status?: 'draft' | 'scheduled' | 'published' | 'expired' | 'archived';
    published_at?: string | null;
    expires_at?: string | null;
    is_pinned?: boolean;
    author_id?: string;
    created_at?: string;
    updated_at?: string;
  } | null;
}

const priorityColors: Record<string, string> = {
  low: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400',
  normal: 'bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-400',
  high: 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400',
  urgent: 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400',
};

const categoryLabels: Record<string, string> = {
  hr_updates: 'HR Updates',
  benefits: 'Benefits',
  events: 'Events',
  performance: 'Performance',
  training: 'Training',
  policy: 'Policy',
  general: 'General',
  emergency: 'Emergency',
};

export function AnnouncementDetailDialog({
  open,
  onOpenChange,
  isStarred,
  onStar,
  announcement,
}: AnnouncementDetailDialogProps) {
  if (!announcement) return null;

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="flex-1 space-y-2">
              <DialogTitle className="text-2xl">{announcement.title}</DialogTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={priorityColors[announcement.priority]}>
                  {announcement.priority.toUpperCase()}
                </Badge>
                <Badge variant="outline">
                  {categoryLabels[announcement.category] || announcement.category}
                </Badge>
                {announcement.is_pinned && (
                  <Badge className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-400">
                    Pinned
                  </Badge>
                )}
                {announcement.status && <Badge variant="secondary">{announcement.status}</Badge>}
              </div>
            </div>
            {onStar && (
              <button
                type="button"
                aria-label={isStarred ? 'Unstar announcement' : 'Star announcement'}
                onClick={onStar}
                className={`shrink-0 h-8 w-8 flex items-center justify-center rounded-md transition-colors ${
                  isStarred
                    ? 'text-amber-400 hover:text-amber-500 bg-amber-50 dark:bg-amber-900/20'
                    : 'text-zinc-400 hover:text-amber-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
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
            )}
          </div>
          <DialogDescription className="sr-only">
            Full announcement details for {announcement.title}
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        <div className="max-h-[50vh] overflow-y-auto pr-4">
          <div className="space-y-4">
            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {announcement.published_at && (
                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                  <Calendar className="h-4 w-4" />
                  <span>Published: {formatDate(announcement.published_at)}</span>
                </div>
              )}
              {announcement.expires_at && (
                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                  <Clock className="h-4 w-4" />
                  <span>Expires: {formatDate(announcement.expires_at)}</span>
                </div>
              )}
            </div>

            <Separator />

            {/* Content */}
            <div className="prose prose-zinc dark:prose-invert max-w-none">
              <div
                className="text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap leading-relaxed"
              >
                {announcement.content}
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Last updated: {formatDate(announcement.updated_at || announcement.created_at)}
          </p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

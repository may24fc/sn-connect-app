import { Bookmark, Download, ExternalLink, Eye, FileText, Star } from 'lucide-react';
import type * as React from 'react';
import { Badge } from '../../primitives/badge';
import { Button } from '../../primitives/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../primitives/dialog';
import type { ResourceCategory, ResourceStatus, ResourceType } from './ResourceCard';

export interface ResourcePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string | null;
  resourceType: ResourceType;
  category: ResourceCategory;
  status: ResourceStatus;
  tags: Array<string>;
  viewCount: number;
  downloadCount: number;
  bookmarkCount: number;
  isFeatured: boolean;
  externalUrl: string | null;
  filePath: string | null;
  authorName?: string;
  dateLabel: string;
  isBookmarked?: boolean;
  onBookmark?: () => void;
  onDownload?: () => void;
  onView?: () => void;
}

const statusVariants: Record<ResourceStatus, 'secondary' | 'success' | 'warning'> = {
  draft: 'secondary',
  published: 'success',
  archived: 'warning',
};

export function ResourcePreview({
  open,
  onOpenChange,
  title,
  description,
  resourceType,
  category,
  status,
  tags,
  viewCount,
  downloadCount,
  bookmarkCount,
  isFeatured,
  externalUrl,
  filePath,
  authorName,
  dateLabel,
  isBookmarked,
  onBookmark,
  onDownload,
  onView,
}: ResourcePreviewProps): React.ReactNode {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-background border border-border">
        <DialogHeader>
          <DialogTitle className="text-base font-medium tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            {title}
            {isFeatured ? <Star className="h-4 w-4 text-amber-500 fill-amber-500" /> : null}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {authorName ? `By ${authorName}` : ''} {dateLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="navy">{category}</Badge>
            <Badge variant={statusVariants[status]}>{status}</Badge>
            <Badge variant="outline">{resourceType}</Badge>
            {tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>

          {description ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
          ) : null}

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" /> {viewCount} views
            </span>
            <span className="flex items-center gap-1">
              <Download className="h-3.5 w-3.5" /> {downloadCount} downloads
            </span>
            <span className="flex items-center gap-1">
              <Bookmark className="h-3.5 w-3.5" /> {bookmarkCount} bookmarks
            </span>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            {onView ? (
              <Button size="sm" onClick={onView}>
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                View
              </Button>
            ) : null}
            {externalUrl ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(externalUrl, '_blank', 'noopener')}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Open Link
              </Button>
            ) : null}
            {filePath && onDownload ? (
              <Button size="sm" variant="outline" onClick={onDownload}>
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Download
              </Button>
            ) : null}
            {onBookmark ? (
              <Button size="sm" variant="outline" onClick={onBookmark}>
                <Bookmark
                  className={`h-3.5 w-3.5 mr-1.5 ${isBookmarked ? 'fill-slate-600 text-slate-700' : ''}`}
                />
                {isBookmarked ? 'Bookmarked' : 'Bookmark'}
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

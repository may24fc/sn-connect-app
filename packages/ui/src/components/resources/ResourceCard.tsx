import {
  Bookmark,
  Download,
  Eye,
  FileText,
  Image,
  Link,
  MonitorPlay,
  MousePointer,
  Presentation,
  Star,
} from 'lucide-react';
import type * as React from 'react';
import { Badge } from '../../primitives/badge';
import { cn } from '../../utils/cn';

export type ResourceType = 'video' | 'document' | 'image' | 'link' | 'presentation' | 'interactive';
export type ResourceStatus = 'draft' | 'published' | 'archived';
export type ResourceCategory =
  | 'onboarding'
  | 'training'
  | 'policies'
  | 'benefits'
  | 'tools'
  | 'culture'
  | 'department_specific'
  | 'forms_templates'
  | 'performance'
  | 'emergency';

export interface ResourceCardProps {
  id: string;
  title: string;
  excerpt: string | null;
  resourceType: ResourceType;
  category: ResourceCategory;
  status?: ResourceStatus;
  tags: Array<string>;
  thumbnailPath: string | null;
  viewCount: number;
  downloadCount: number;
  bookmarkCount: number;
  isFeatured?: boolean;
  isPinned?: boolean;
  isBookmarked?: boolean;
  dateLabel: string;
  onClick?: () => void;
  onBookmark?: () => void;
  actions?: React.ReactNode;
}

const typeIcons: Record<ResourceType, typeof FileText> = {
  video: MonitorPlay,
  document: FileText,
  image: Image,
  link: Link,
  presentation: Presentation,
  interactive: MousePointer,
};

const statusVariants: Record<ResourceStatus, 'secondary' | 'success' | 'warning'> = {
  draft: 'secondary',
  published: 'success',
  archived: 'warning',
};

const categoryLabels: Record<ResourceCategory, string> = {
  onboarding: 'Onboarding',
  training: 'Training',
  policies: 'Policies',
  benefits: 'Benefits',
  tools: 'Tools',
  culture: 'Culture',
  department_specific: 'Department',
  forms_templates: 'Forms',
  performance: 'Performance',
  emergency: 'Emergency',
};

export function ResourceCard({
  title,
  excerpt,
  resourceType,
  category,
  status,
  tags,
  thumbnailPath,
  viewCount,
  downloadCount,
  bookmarkCount,
  isFeatured,
  isPinned,
  isBookmarked,
  dateLabel,
  onClick,
  onBookmark,
  actions,
}: ResourceCardProps): React.ReactNode {
  const TypeIcon = typeIcons[resourceType];

  return (
    <div
      onClick={onClick}
      className={cn(
        'group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden transition-colors',
        onClick && 'cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700'
      )}
    >
      {/* Thumbnail / type icon strip */}
      {thumbnailPath ? (
        <div className="h-32 bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
          <img src={thumbnailPath} alt={title} className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="h-20 bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center">
          <TypeIcon className="h-8 w-8 text-zinc-300 dark:text-zinc-600" strokeWidth={1.5} />
        </div>
      )}

      {/* Content */}
      <div className="p-3.5 space-y-2">
        {/* Title row with bookmark/featured */}
        <div className="flex items-start gap-2">
          <h3 className="flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-50 line-clamp-2 leading-snug">
            {title}
          </h3>
          <div className="flex items-center gap-1 shrink-0">
            {isFeatured && (
              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
            )}
            {onBookmark && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onBookmark();
                }}
                className="p-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <Bookmark
                  className={cn(
                    'h-3.5 w-3.5',
                    isBookmarked
                      ? 'text-indigo-600 fill-indigo-600'
                      : 'text-zinc-400 dark:text-zinc-500'
                  )}
                />
              </button>
            )}
          </div>
        </div>

        {/* Excerpt */}
        {excerpt && (
          <p className="text-[13px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
            {excerpt}
          </p>
        )}

        {/* Meta: category · status · tags */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            {categoryLabels[category]}
          </span>
          {status && (
            <>
              <span className="text-zinc-300 dark:text-zinc-600" aria-hidden>·</span>
              <Badge variant={statusVariants[status]} className="text-[11px] px-1.5 py-0">
                {status}
              </Badge>
            </>
          )}
          {isPinned && (
            <>
              <span className="text-zinc-300 dark:text-zinc-600" aria-hidden>·</span>
              <Badge variant="indigo" className="text-[11px] px-1.5 py-0">
                Pinned
              </Badge>
            </>
          )}
          {tags.length > 0 && (
            <>
              <span className="text-zinc-300 dark:text-zinc-600" aria-hidden>·</span>
              {tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                  {tag}
                </Badge>
              ))}
              {tags.length > 2 && (
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500">+{tags.length - 2}</span>
              )}
            </>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500 pt-0.5">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" /> {viewCount}
            </span>
            <span className="flex items-center gap-1">
              <Download className="h-3 w-3" /> {downloadCount}
            </span>
            <span className="flex items-center gap-1">
              <Bookmark className="h-3 w-3" /> {bookmarkCount}
            </span>
          </div>
          <span>{dateLabel}</span>
        </div>
      </div>

      {/* Actions footer */}
      {actions && (
        <div className="border-t border-zinc-100 dark:border-zinc-800 px-3.5 py-2 flex items-center gap-1">
          {actions}
        </div>
      )}
    </div>
  );
}

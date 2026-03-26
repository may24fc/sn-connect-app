import {
  Bookmark,
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

const categoryColors: Record<ResourceCategory, string> = {
  onboarding: 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400 border-transparent',
  training: 'bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400 border-transparent',
  policies: 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 border-transparent',
  benefits: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-transparent',
  tools: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-transparent',
  culture: 'bg-pink-50 dark:bg-pink-950/50 text-pink-700 dark:text-pink-400 border-transparent',
  department_specific: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border-transparent',
  forms_templates: 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 border-transparent',
  performance: 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400 border-transparent',
  emergency: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-transparent',
};

export function ResourceCard({
  title,
  excerpt,
  resourceType,
  category,
  tags,
  thumbnailPath,
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
        'relative group bg-card border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden transition-colors',
        onClick && 'cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700'
      )}
    >
      {/* Bookmark — top-right, revealed on hover (only when no actions overlay is present) */}
      {onBookmark && !actions && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onBookmark();
          }}
          className={cn(
            'absolute top-2 right-2 z-10 p-1.5 rounded-md transition-all duration-150',
            'bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm shadow-sm',
            isBookmarked
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100'
          )}
        >
          <Bookmark
            className={cn(
              'h-3.5 w-3.5',
              isBookmarked
                ? 'text-zinc-700 fill-zinc-600 dark:text-zinc-300 dark:fill-zinc-400'
                : 'text-zinc-400 dark:text-zinc-500'
            )}
          />
        </button>
      )}

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
        {/* Title row with featured indicator */}
        <div className="flex items-start gap-2">
          <h3 className="flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-50 line-clamp-2 leading-snug">
            {title}
          </h3>
          {isFeatured && (
            <Star className="h-3.5 w-3.5 shrink-0 text-amber-500 fill-amber-500" />
          )}
        </div>

        {/* Excerpt */}
        {excerpt && (
          <p className="text-[13px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
            {excerpt}
          </p>
        )}

        {/* Meta: category · pinned · tags */}
        <div className="flex flex-wrap justify-between items-center gap-1.5">
          <div className="flex flex-wrap items-center gap-1">
            <Badge
              className={cn('text-[11px] px-1.5 py-0 font-medium border', categoryColors[category])}
            >
              {categoryLabels[category]}
            </Badge>
            {isPinned && (
              <Badge variant="navy" className="text-[11px] px-1.5 py-0">
                Pinned
              </Badge>
            )}
            {tags.length > 0 && (
              <>
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
          <span className='text-[11px] text-zinc-400 dark:text-zinc-500'>{dateLabel}</span>
        </div>
      </div>

      {/* Actions — top-right overlay, revealed on hover */}
      {actions && (
        <div
          className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {actions}
        </div>
      )}
    </div>
  );
}

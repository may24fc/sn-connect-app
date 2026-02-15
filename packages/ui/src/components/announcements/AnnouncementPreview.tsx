import { AnnouncementCard } from './AnnouncementCard';

export interface AnnouncementPreviewProps {
  title: string;
  excerpt: string;
  category: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'draft' | 'scheduled' | 'published' | 'expired' | 'archived';
  dateLabel?: string;
  isPinned?: boolean;
}

export function AnnouncementPreview({
  title,
  excerpt,
  category,
  priority,
  status,
  dateLabel = 'Preview',
  isPinned,
}: AnnouncementPreviewProps) {
  return (
    <AnnouncementCard
      title={title || 'Untitled announcement'}
      excerpt={excerpt || 'No summary yet.'}
      category={category || 'general'}
      priority={priority}
      status={status}
      dateLabel={dateLabel}
      {...(isPinned !== undefined && { isPinned })}
    />
  );
}

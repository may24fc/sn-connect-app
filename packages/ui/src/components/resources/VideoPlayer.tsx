import type * as React from 'react';
import { cn } from '../../utils/cn';

export interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  className?: string;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
}

export function VideoPlayer({
  src,
  poster,
  title,
  className,
  onEnded,
  onTimeUpdate,
}: VideoPlayerProps): React.ReactNode {
  const isExternal = src.startsWith('http') && (src.includes('youtube') || src.includes('vimeo'));

  if (isExternal) {
    const embedUrl = getEmbedUrl(src);
    return (
      <div className={cn('aspect-video rounded-lg overflow-hidden bg-zinc-900', className)}>
        <iframe
          src={embedUrl}
          title={title ?? 'Video'}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className={cn('aspect-video rounded-lg overflow-hidden bg-zinc-900', className)}>
      <video
        src={src}
        poster={poster}
        controls
        className="h-full w-full"
        onEnded={onEnded}
        onTimeUpdate={(e) => onTimeUpdate?.(e.currentTarget.currentTime)}
      >
        <track kind="captions" />
      </video>
    </div>
  );
}

function getEmbedUrl(url: string): string {
  const youtubeMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (youtubeMatch) {
    return `https://www.youtube-nocookie.com/embed/${youtubeMatch[1]}`;
  }

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return url;
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type * as React from 'react';
import { cn } from '../../utils/cn';

export type ResourceAccessLevel = 'full' | 'view_only';

export interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  className?: string;
  /** Controls download permissions. When 'view_only', disables right-click, hides download controls, and uses blob URL. */
  accessLevel?: ResourceAccessLevel;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
}

export function VideoPlayer({
  src,
  poster,
  title,
  className,
  accessLevel = 'full',
  onEnded,
  onTimeUpdate,
}: VideoPlayerProps): React.ReactNode {
  const isExternal = src.startsWith('http') && (src.includes('youtube') || src.includes('vimeo'));
  const isHlsSource = /\.m3u8($|\?)/i.test(src);
  const isViewOnly = accessLevel === 'view_only';
  const videoRef = useRef<HTMLVideoElement>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  // For view-only mode, fetch the video as a blob to prevent URL copying
  useEffect(() => {
    if (!isViewOnly || isExternal || isHlsSource || !src) return;

    let revoked = false;
    const controller = new AbortController();

    fetch(src, { signal: controller.signal })
      .then((res) => res.blob())
      .then((blob) => {
        if (revoked) return;
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
      })
      .catch(() => {
        // Fallback: if blob fetch fails, use direct URL
        if (!revoked) setBlobUrl(null);
      });

    return () => {
      revoked = true;
      controller.abort();
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, isViewOnly, isExternal, isHlsSource]);

  // Mux playback uses HLS (.m3u8). Safari can play HLS natively; other browsers
  // require hls.js attached to the <video> element.
  useEffect(() => {
    if (!isHlsSource || isExternal) return;

    const video = videoRef.current;
    if (!video) return;

    let hlsInstance: { destroy: () => void } | null = null;
    let cancelled = false;

    const attachHls = async () => {
      // Native HLS support (Safari, some mobile browsers)
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src;
        return;
      }

      try {
        const mod = await import('hls.js');
        const Hls = mod.default;
        if (cancelled || !Hls || !Hls.isSupported()) {
          // Last-resort fallback to direct source assignment
          video.src = src;
          return;
        }

        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });
        hls.loadSource(src);
        hls.attachMedia(video);
        hlsInstance = hls;
      } catch {
        video.src = src;
      }
    };

    attachHls();

    return () => {
      cancelled = true;
      if (hlsInstance) {
        hlsInstance.destroy();
      }
    };
  }, [src, isExternal, isHlsSource]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (isViewOnly) {
        e.preventDefault();
      }
    },
    [isViewOnly]
  );

  if (isExternal) {
    const embedUrl = getEmbedUrl(src);
    return (
      <div
        className={cn('aspect-video rounded-lg overflow-hidden bg-zinc-900', className)}
        onContextMenu={handleContextMenu}
      >
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

  const videoSrc = isViewOnly && blobUrl ? blobUrl : src;

  return (
    <div
      className={cn('aspect-video rounded-lg overflow-hidden bg-zinc-900', className)}
      onContextMenu={handleContextMenu}
    >
      <video
        ref={videoRef}
        src={isHlsSource ? undefined : videoSrc}
        poster={poster}
        controls
        className="h-full w-full"
        onEnded={onEnded}
        onTimeUpdate={(e) => onTimeUpdate?.(e.currentTarget.currentTime)}
        // Hide download button on HTML5 video controls when view-only
        {...(isViewOnly
          ? {
              controlsList: 'nodownload',
              disablePictureInPicture: true,
            }
          : {})}
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

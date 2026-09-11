'use client';

import { ImageOff, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface MarketingContentImagePreviewProps {
  imagePath: string;
  alt: string;
  className?: string;
}

export function MarketingContentImagePreview({
  imagePath,
  alt,
  className = 'h-96',
}: MarketingContentImagePreviewProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setImageUrl(null);
    setHasError(false);

    const loadImage = async (): Promise<void> => {
      try {
        const response = await fetch(`/api/reports/content-images?path=${encodeURIComponent(imagePath)}`, {
          signal: controller.signal,
        });
        const payload = await response.json() as { data?: { signedUrl?: string } };
        if (!response.ok || !payload.data?.signedUrl) throw new Error('Image preview unavailable');
        setImageUrl(payload.data.signedUrl);
      } catch (error) {
        if (!controller.signal.aborted) setHasError(true);
      }
    };

    void loadImage();
    return () => controller.abort();
  }, [imagePath]);

  if (hasError) {
    return (
      <div className={`flex items-center justify-center rounded-md border bg-muted/30 text-xs text-muted-foreground ${className}`}>
        <ImageOff className="mr-2 h-4 w-4" />
        Preview unavailable
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className={`flex items-center justify-center rounded-md border bg-muted/30 text-muted-foreground ${className}`}>
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-md border bg-muted ${className}`}>
      <img src={imageUrl} alt={alt} className="h-full w-full object-contain" />
    </div>
  );
}
'use client';

import {
  useResource,
} from '@/hooks/useResources';
import {
  Button,
  DocumentViewer,
  EmptyState,
  type ResourceAccessLevel,
  VideoPlayer,
  useToast,
} from '@hr-portal/ui';
import { ArrowLeft, Download, ExternalLink, FileText, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export default function AdminResourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [resourceId, setResourceId] = useState('');
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [streamAccessLevel, setStreamAccessLevel] = useState<ResourceAccessLevel>('full');
  const [isVideoProcessing, setIsVideoProcessing] = useState(false);
  const [videoStatusMessage, setVideoStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    params.then((value) => setResourceId(value.id));
  }, [params]);

  const { data, isLoading } = useResource(resourceId);
  const { addToast } = useToast();

  const resource = data?.data;

  useEffect(() => {
    if (!resource) return;

    if (resource.resource_type === 'link' && resource.external_url) {
      window.location.href = resource.external_url;
    }
  }, [resource]);

  const handleDownload = useCallback(async (): Promise<void> => {
    if (!resource) return;

    const response = await fetch(`/api/resources/${resource.id}/download`);
    if (!response.ok) {
      const payload = await response.json();
      if (response.status === 403) {
        addToast({
          title: 'Download restricted',
          description:
            payload?.error ?? 'This resource is view-only and cannot be downloaded.',
          variant: 'error',
        });
        return;
      }
      addToast({ title: 'Unable to download resource', variant: 'error' });
      return;
    }

    const payload = await response.json();
    if (payload?.data?.url) {
      window.open(payload.data.url, '_blank', 'noopener,noreferrer');
    }
  }, [resource, addToast]);

  useEffect(() => {
    if (!resource || resource.resource_type !== 'video') {
      setStreamUrl(null);
      setIsVideoProcessing(false);
      setVideoStatusMessage(null);
      return;
    }

    setStreamUrl(null);
    setIsVideoProcessing(false);
    setVideoStatusMessage(null);

    const fetchStreamUrl = async () => {
      try {
        const response = await fetch(`/api/resources/${resource.id}/stream`);
        if (response.status === 409) {
          const payload = await response.json().catch(() => null);
          setIsVideoProcessing(true);
          setVideoStatusMessage(payload?.error ?? 'Video is still processing');
          setStreamUrl(null);
          return;
        }

        if (!response.ok) {
          setVideoStatusMessage('Unable to load video stream right now');
          return;
        }

        const payload = await response.json();
        if (payload?.data?.url) {
          setStreamUrl(payload.data.url);
          setStreamAccessLevel(payload.data.accessLevel ?? 'full');
          setIsVideoProcessing(false);
          setVideoStatusMessage(null);
        }
      } catch {
        setVideoStatusMessage('Unable to load video stream right now');
      }
    };

    fetchStreamUrl();

    const refreshInterval = setInterval(
      fetchStreamUrl,
      resource.access_level === 'view_only' ? 4 * 60 * 1000 : 14 * 60 * 1000
    );

    return () => clearInterval(refreshInterval);
  }, [resource]);

  if (isLoading || !resource) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<Loader2 className="h-5 w-5 animate-spin" />}
          title="Loading resource"
          description="Resource details are still loading."
          size="sm"
        />
      </div>
    );
  }

  const isVideo = resource.resource_type === 'video';
  const isDocument = resource.resource_type === 'document';
  const hasAttachedExternalLink = isVideo && Boolean(resource.file_path) && Boolean(resource.external_url);
  const isViewOnly = streamAccessLevel === 'view_only';

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden -m-4 lg:-m-6">
      <div className="border-b border-border bg-card px-6 py-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/resources')}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="bg-zinc-900 aspect-video w-full">
          {isVideo ? (
            isVideoProcessing ? (
              <EmptyState
                icon={<Loader2 className="h-5 w-5 animate-spin" />}
                title="Video is still processing"
                description={videoStatusMessage ?? 'Please wait a moment and refresh.'}
                size="sm"
                appearance="inverse"
                className="h-full"
              />
            ) : (
              <VideoPlayer
                src={streamUrl || resource.external_url || resource.file_path || ''}
                title={resource.title}
                className="rounded-none"
                accessLevel={streamAccessLevel}
                {...(resource.thumbnail_path ? { poster: resource.thumbnail_path } : {})}
              />
            )
          ) : isDocument ? (
            <DocumentViewer
              src={resource.external_url || resource.file_path || ''}
              fileName={resource.title}
              className="rounded-none border-0"
              onDownload={handleDownload}
              {...(resource.mime_type ? { mimeType: resource.mime_type } : {})}
            />
          ) : (
            <EmptyState
              icon={FileText}
              title="No inline preview available"
              description="Download the file or open the source link to view this resource."
              size="sm"
              appearance="inverse"
              className="h-full"
            />
          )}
        </div>

        {hasAttachedExternalLink && (
          <div className="border-b border-border bg-card px-6 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Attached Link
            </p>
            <a
              href={resource.external_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Open attached link
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}

        <div className="bg-card border-b border-border p-6">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{resource.title}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
            {resource.description || resource.excerpt}
          </p>

          <div className="flex items-center gap-3 mt-4">
            <Button
              variant="outline"
              className="flex items-center gap-2 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 px-4 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={handleDownload}
              disabled={isViewOnly}
              title={isViewOnly ? 'This resource is view-only' : 'Download resource'}
            >
              <Download className="h-4 w-4" />
              {isViewOnly ? 'View Only' : 'Download'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useDailyLogAttachments } from '@/hooks/useInternships';
import { DAILY_LOG_LINK_ATTACHMENT_MIME_TYPE } from '@/lib/daily-log-attachments';
import {
  Button,
  type DailyLogAttachment,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Skeleton,
} from '@hr-portal/ui';
import { ChevronLeft, ChevronRight, ExternalLink, FileText, ImageOff, Link2 } from 'lucide-react';
import { type ReactNode, useState } from 'react';

interface EODAttachmentGalleryProps {
  internshipId: string;
  logId: string;
  /** Attachment count from the log row, used to size the loading state. */
  expectedCount: number;
}

function isLinkAttachment(attachment: DailyLogAttachment): boolean {
  return (
    attachment.mimeType === DAILY_LOG_LINK_ATTACHMENT_MIME_TYPE ||
    /^https?:\/\//i.test(attachment.filePath)
  );
}

function isImageAttachment(attachment: DailyLogAttachment): boolean {
  return !isLinkAttachment(attachment) && attachment.mimeType.startsWith('image/');
}

function isPdfAttachment(attachment: DailyLogAttachment): boolean {
  return attachment.mimeType === 'application/pdf';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const FILE_ROW_CLASS =
  'flex w-full items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-muted';

/** PDFs open in the preview dialog; other documents open in a new tab. */
function AttachmentFileRow({
  file,
  onPreview,
}: {
  file: DailyLogAttachment;
  onPreview: () => void;
}): ReactNode {
  const content = (
    <>
      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-left font-medium">{file.fileName}</span>
      <span className="shrink-0 text-xs text-muted-foreground">
        {formatFileSize(file.fileSize)}
      </span>
    </>
  );

  if (!file.signedUrl) {
    return <div className={`${FILE_ROW_CLASS} opacity-60`}>{content}</div>;
  }

  if (isPdfAttachment(file)) {
    return (
      <button type="button" onClick={onPreview} className={FILE_ROW_CLASS}>
        {content}
      </button>
    );
  }

  return (
    <a href={file.signedUrl} target="_blank" rel="noreferrer" className={FILE_ROW_CLASS}>
      {content}
    </a>
  );
}

export function EODAttachmentGallery({
  internshipId,
  logId,
  expectedCount,
}: EODAttachmentGalleryProps): ReactNode {
  const {
    data: attachments,
    isLoading,
    isError,
    refetch,
  } = useDailyLogAttachments(internshipId, logId);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const images = (attachments ?? []).filter(isImageAttachment);
  const files = (attachments ?? []).filter(
    (attachment) => !isImageAttachment(attachment) && !isLinkAttachment(attachment)
  );
  const links = (attachments ?? []).filter(isLinkAttachment);

  // Images and PDFs are previewable; arrows step through them in display order.
  const previewable = [...images, ...files.filter(isPdfAttachment)];
  const previewIndex = previewable.findIndex((attachment) => attachment.id === previewId);
  const preview = previewIndex >= 0 ? previewable[previewIndex] : undefined;

  const step = (direction: 1 | -1): void => {
    if (previewable.length < 2 || previewIndex < 0) return;
    const next = (previewIndex + direction + previewable.length) % previewable.length;
    setPreviewId(previewable[next]?.id ?? null);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {Array.from(
          { length: Math.min(Math.max(expectedCount, 1), 8) },
          (_, index) => `skeleton-${index}`
        ).map((key) => (
          <Skeleton key={key} className="aspect-square w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (isError || !attachments) {
    return (
      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>Couldn&apos;t load attachments.</span>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((image) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setPreviewId(image.id)}
              disabled={!image.signedUrl}
              className="group relative aspect-square overflow-hidden rounded-md border border-border bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed"
              aria-label={`Preview ${image.fileName}`}
              title={image.fileName}
            >
              {image.signedUrl ? (
                <img
                  src={image.signedUrl}
                  alt={image.fileName}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
              ) : (
                <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
                  <ImageOff className="h-5 w-5" />
                  Unavailable
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file) => (
            <li key={file.id}>
              <AttachmentFileRow file={file} onPreview={() => setPreviewId(file.id)} />
            </li>
          ))}
        </ul>
      )}

      {links.length > 0 && (
        <ul className="space-y-2">
          {links.map((link) => (
            <li key={link.id}>
              <a
                href={link.filePath}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-muted"
              >
                <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate font-medium">{link.fileName}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </a>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreviewId(null)}>
        <DialogContent
          className="max-w-5xl gap-3 p-3 sm:p-4"
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight') step(1);
            if (event.key === 'ArrowLeft') step(-1);
          }}
        >
          {preview && (
            <>
              <div className="flex items-center gap-3 pr-8">
                <DialogTitle className="min-w-0 flex-1 truncate text-sm font-medium">
                  {preview.fileName}
                </DialogTitle>
                {previewable.length > 1 && (
                  <span className="text-xs text-muted-foreground">
                    {previewIndex + 1} / {previewable.length}
                  </span>
                )}
                {preview.signedUrl && (
                  <a
                    href={preview.signedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Open in new tab
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <DialogDescription className="sr-only">
                Attachment preview. Use the arrow keys to move between attachments.
              </DialogDescription>

              <div className="relative flex items-center justify-center rounded-md bg-muted">
                {isPdfAttachment(preview) ? (
                  <iframe
                    src={preview.signedUrl ?? undefined}
                    title={preview.fileName}
                    className="h-[75vh] w-full rounded-md border-0 bg-white"
                  />
                ) : (
                  <img
                    src={preview.signedUrl ?? undefined}
                    alt={preview.fileName}
                    className="max-h-[75vh] w-auto max-w-full object-contain"
                  />
                )}

                {previewable.length > 1 && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => step(-1)}
                      className="absolute left-2 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full p-0 shadow"
                      aria-label="Previous attachment"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => step(1)}
                      className="absolute right-2 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full p-0 shadow"
                      aria-label="Next attachment"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

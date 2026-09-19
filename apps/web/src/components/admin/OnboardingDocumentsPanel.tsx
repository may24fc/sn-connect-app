'use client';

import {
  type OnboardingDocumentRecord,
  useOnboardingDocumentPreview,
  useOnboardingDocuments,
} from '@/hooks/useOnboardingDocuments';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Skeleton,
  useToast,
} from '@hr-portal/ui';
import { AlertCircle, Download, Eye, FileText, Loader2 } from 'lucide-react';
import { type ReactNode, useState } from 'react';

const DOCUMENT_TYPE_LABELS: Record<OnboardingDocumentRecord['document_type'], string> = {
  cv: 'Curriculum Vitae',
  valid_id: 'Valid ID',
  profile_photo: 'Profile Photo',
  birth_certificate: 'Birth Certificate',
};

/** Document types HR expects before an onboarding profile can be approved. */
const EXPECTED_DOCUMENT_TYPES: Array<OnboardingDocumentRecord['document_type']> = [
  'cv',
  'valid_id',
  'profile_photo',
  'birth_certificate',
];

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploadedAt(value: string | null | undefined): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface OnboardingDocumentsPanelProps {
  profileId: string;
}

export function OnboardingDocumentsPanel({ profileId }: OnboardingDocumentsPanelProps): ReactNode {
  const { addToast } = useToast();
  const { data, isLoading, error } = useOnboardingDocuments(profileId);
  const preview = useOnboardingDocumentPreview();
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);

  const documents = data?.data ?? [];
  const presentTypes = new Set(documents.map((doc) => doc.document_type));
  const missingTypes = EXPECTED_DOCUMENT_TYPES.filter((type) => !presentTypes.has(type));

  const openDocument = async (documentId: string, mode: 'preview' | 'download'): Promise<void> => {
    setActiveDocumentId(documentId);
    try {
      const result = await preview.mutateAsync(documentId);

      if (mode === 'download') {
        const anchor = document.createElement('a');
        anchor.href = result.signedUrl;
        anchor.download = result.fileName;
        anchor.rel = 'noopener noreferrer';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        return;
      }

      const opened = window.open(result.signedUrl, '_blank', 'noopener,noreferrer');
      if (!opened) {
        addToast({
          title: 'Preview blocked',
          description: 'Allow pop-ups for this site to open document previews in a new tab.',
          variant: 'error',
        });
      }
    } catch (previewError) {
      addToast({
        title: 'Unable to open document',
        description:
          previewError instanceof Error
            ? previewError.message
            : 'The signed preview URL could not be generated.',
        variant: 'error',
      });
    } finally {
      setActiveDocumentId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Submitted Documents</CardTitle>
        <CardDescription>
          Review every uploaded file before approving this onboarding profile. Preview links are
          signed and expire after 10 minutes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : error ? (
          <EmptyState
            icon={AlertCircle}
            title="Failed to load documents"
            description={error.message}
            size="sm"
          />
        ) : documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No documents submitted"
            description="This profile has not uploaded any onboarding documents yet."
            size="sm"
          />
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => {
              const isBusy = preview.isPending && activeDocumentId === doc.id;

              return (
                <div
                  key={doc.id}
                  className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-500" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{doc.file_name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatFileSize(doc.file_size)} &middot; Uploaded{' '}
                        {formatUploadedAt(doc.uploaded_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => void openDocument(doc.id, 'preview')}
                    >
                      {isBusy ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Eye className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Preview
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => void openDocument(doc.id, 'download')}
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      Download
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!(isLoading || error) && missingTypes.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              Missing documents
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {missingTypes.map((type) => (
                <Badge key={type} variant="warning">
                  {DOCUMENT_TYPE_LABELS[type]}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

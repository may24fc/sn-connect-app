'use client';

import { type BulkUploadResult, useBulkUploadResources } from '@/hooks/useResources';
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  useToast,
} from '@hr-portal/ui';
import { AlertCircle, CheckCircle2, Loader2, Upload, X } from 'lucide-react';
import { type ChangeEvent, type ReactNode, useState } from 'react';

const ACCEPTED_FILE_TYPES = [
  'video/mp4',
  'video/webm',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/gif',
].join(',');

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface BulkUploadResourcesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkUploadResourcesDialog({
  open,
  onOpenChange,
}: BulkUploadResourcesDialogProps): ReactNode {
  const { addToast } = useToast();
  const bulkUpload = useBulkUploadResources();
  const [files, setFiles] = useState<Array<File>>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [results, setResults] = useState<Array<BulkUploadResult> | null>(null);

  const reset = (): void => {
    setFiles([]);
    setIsPublic(false);
    setResults(null);
    bulkUpload.reset();
  };

  const handleOpenChange = (nextOpen: boolean): void => {
    if (!nextOpen) {
      reset();
    }
    onOpenChange(nextOpen);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setResults(null);
    setFiles(Array.from(event.target.files ?? []));
  };

  const handleUpload = async (): Promise<void> => {
    try {
      const response = await bulkUpload.mutateAsync({ files, isPublic, targetRoles: [] });
      setResults(response.data.results);

      const { success, failed, total } = response.data.summary;
      addToast({
        title: failed === 0 ? 'Bulk upload complete' : 'Bulk upload finished with errors',
        description: `${success} of ${total} file${total === 1 ? '' : 's'} created as drafts${
          failed > 0 ? `, ${failed} failed` : ''
        }.`,
        variant: failed === 0 ? 'success' : 'error',
      });
    } catch (uploadError) {
      addToast({
        title: 'Bulk upload failed',
        description:
          uploadError instanceof Error ? uploadError.message : 'The upload could not be completed.',
        variant: 'error',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Upload Resources</DialogTitle>
          <DialogDescription>
            Each file becomes a draft resource titled after its filename. Review and publish them
            from the Resources list afterwards.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bulk-upload-files">Files</Label>
            <input
              id="bulk-upload-files"
              type="file"
              multiple
              accept={ACCEPTED_FILE_TYPES}
              onChange={handleFileChange}
              disabled={bulkUpload.isPending}
              className="block w-full cursor-pointer rounded-md border border-zinc-200 bg-white p-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm dark:border-zinc-800 dark:bg-zinc-900 dark:file:bg-zinc-800"
            />
            <p className="text-xs text-muted-foreground">
              Videos, documents, spreadsheets, presentations, and images are accepted.
            </p>
          </div>

          {files.length > 0 && (
            <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-md border border-zinc-200 p-2 dark:border-zinc-800">
              {files.map((file) => (
                <div
                  key={`${file.name}-${file.size}-${file.lastModified}`}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="truncate">{file.name}</span>
                  <span className="flex-shrink-0 text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id="bulk-upload-public"
              checked={isPublic}
              disabled={bulkUpload.isPending}
              onCheckedChange={(checked) => setIsPublic(checked === true)}
            />
            <Label htmlFor="bulk-upload-public" className="cursor-pointer font-normal">
              Mark uploaded resources as public
            </Label>
          </div>

          {results && (
            <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-md border border-zinc-200 p-2 dark:border-zinc-800">
              {results.map((result) => (
                <div key={result.fileName} className="flex items-start gap-2 text-sm">
                  {result.success ? (
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-rose-600" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate">{result.fileName}</p>
                    {!result.success && (
                      <p className="text-xs text-rose-600 dark:text-rose-400">{result.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            <X className="mr-1.5 h-4 w-4" />
            {results ? 'Close' : 'Cancel'}
          </Button>
          <Button
            onClick={() => void handleUpload()}
            disabled={bulkUpload.isPending || files.length === 0}
          >
            {bulkUpload.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-1.5 h-4 w-4" />
                Upload{' '}
                {files.length > 0 ? `${files.length} file${files.length === 1 ? '' : 's'}` : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

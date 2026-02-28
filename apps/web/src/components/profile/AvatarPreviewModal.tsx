'use client';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@hr-portal/ui';
import { Upload, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface AvatarPreviewModalProps {
  /** The selected file to preview */
  file: File | null;
  /** Whether the modal is open */
  open: boolean;
  /** Called when the modal should close (cancel / after save) */
  onClose: () => void;
  /** Called when the user confirms the upload */
  onConfirm: (file: File) => Promise<void>;
  /** Whether an upload is currently in progress */
  isUploading: boolean;
  /** Fallback initials for the avatar ring */
  initials: string;
  /** Current avatar URL (shown as "before") */
  currentAvatarUrl?: string | undefined;
}

/**
 * Modal that shows a side-by-side preview (current → new) before uploading a
 * new profile picture. Revokes the object URL on unmount to prevent leaks.
 */
export function AvatarPreviewModal({
  file,
  open,
  onClose,
  onConfirm,
  isUploading,
  initials,
  currentAvatarUrl,
}: AvatarPreviewModalProps): React.ReactNode {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Create and revoke object URL for the selected file
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleConfirm = useCallback(async () => {
    if (!file) return;
    await onConfirm(file);
  }, [file, onConfirm]);

  // Format file size for display
  const fileSize = file
    ? file.size < 1024 * 1024
      ? `${(file.size / 1024).toFixed(0)} KB`
      : `${(file.size / (1024 * 1024)).toFixed(1)} MB`
    : null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen && !isUploading) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Profile Picture</DialogTitle>
          <DialogDescription>
            Preview your new profile picture before saving.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          {/* New avatar preview */}
          <div className="relative">
            <Avatar className="h-32 w-32 border-2 border-zinc-200 dark:border-zinc-700">
              {previewUrl && <AvatarImage src={previewUrl} />}
              <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* File info */}
          {file && (
            <div className="text-center space-y-0.5">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[280px]">
                {file.name}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {fileSize}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isUploading}
            className="flex-1 sm:flex-initial"
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isUploading || !file}
            className="flex-1 sm:flex-initial"
          >
            {isUploading ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent inline-block" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Save
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

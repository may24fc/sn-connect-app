import type { ReactNode } from 'react';
import { useCallback } from 'react';
import { FileDropZone } from '../../primitives/file-drop-zone';
import { Label } from '../../primitives/label';

export interface AttachmentUploaderProps {
  onFileSelected: (file: File) => void;
  isUploading?: boolean;
  /** Currently selected file (for showing in preview) */
  selectedFile?: File | null;
  /** Callback to clear the selected file */
  onClearFile?: () => void;
}

export function AttachmentUploader({
  onFileSelected,
  isUploading,
  selectedFile,
  onClearFile,
}: AttachmentUploaderProps): ReactNode {
  const handleFiles = useCallback(
    (files: Array<File>) => {
      const file = files[0];
      if (file) onFileSelected(file);
    },
    [onFileSelected]
  );

  const handleRemove = useCallback(
    (_index: number) => {
      onClearFile?.();
    },
    [onClearFile]
  );

  return (
    <div className="space-y-2">
      <Label>Attachment</Label>
      <FileDropZone
        onFilesSelected={handleFiles}
        accept="image/jpeg,image/png,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        maxSizeMB={10}
        isUploading={isUploading}
        compact
        label="Drop an attachment or click to browse"
        formatHint="Images, PDF, Word — max 10 MB"
        selectedFiles={selectedFile ? [selectedFile] : undefined}
        onRemoveFile={onClearFile ? handleRemove : undefined}
      />
    </div>
  );
}

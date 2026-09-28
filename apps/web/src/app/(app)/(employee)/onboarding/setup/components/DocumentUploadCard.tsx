'use client';

import { Card, CardContent, FileDropZone } from '@hr-portal/ui';
import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';

const labels: Record<'valid_id' | 'profile_photo' | 'cv' | 'birth_certificate', string> = {
  valid_id: 'Valid ID',
  profile_photo: 'Profile Photo',
  cv: 'CV',
  birth_certificate: 'Birth Certificate',
};

const acceptMap: Record<string, string> = {
  valid_id: 'image/jpeg,image/png,application/pdf',
  profile_photo: 'image/jpeg,image/png,image/webp',
  cv: '.pdf,.doc,.docx',
  birth_certificate: 'image/jpeg,image/png,application/pdf',
};

export function DocumentUploadCard({
  type,
  required,
  uploading,
  onUpload,
}: {
  type: 'valid_id' | 'profile_photo' | 'cv' | 'birth_certificate';
  required: boolean;
  uploading: boolean;
  onUpload: (type: 'valid_id' | 'profile_photo' | 'cv' | 'birth_certificate', file: File) => void;
}): ReactNode {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFiles = useCallback(
    (files: Array<File>) => {
      const file = files[0];
      if (file) {
        setSelectedFile(file);
        onUpload(type, file);
      }
    },
    [type, onUpload]
  );

  const handleClearFile = useCallback(() => {
    setSelectedFile(null);
  }, []);

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div>
          <p className="text-sm font-medium">
            {labels[type]}
            {required ? (
              <> <span className="text-rose-500">*</span></>
            ) : (
              <>
                {' '}
                <span className="text-muted-foreground text-xs">(Optional)</span>
              </>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {required ? 'Upload the required file' : 'Upload this file if available'}
          </p>
        </div>
        <FileDropZone
          onFilesSelected={handleFiles}
          accept={acceptMap[type] ?? '*'}
          maxSizeMB={10}
          isUploading={uploading}
          compact
          label={`Drop your ${labels[type].toLowerCase()} here`}
          formatHint={
            type === 'profile_photo'
              ? 'JPG, PNG, WebP — max 10 MB'
              : 'PDF, Images, Word — max 10 MB'
          }
          selectedFiles={selectedFile ? [selectedFile] : undefined}
          onRemoveFile={uploading ? undefined : handleClearFile}
        />
      </CardContent>
    </Card>
  );
}

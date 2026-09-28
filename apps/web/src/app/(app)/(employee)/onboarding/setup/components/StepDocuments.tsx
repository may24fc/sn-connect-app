'use client';

import { useOnboardingDocuments } from '@/hooks/useOnboardingDocuments';
import { useUploadOnboardingDocument } from '@/hooks/useUploadOnboardingDocument';
import { Badge, useToast } from '@hr-portal/ui';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { DocumentUploadCard } from './DocumentUploadCard';

const uploadOrder = ['cv', 'profile_photo', 'valid_id', 'birth_certificate'] as const;
const requiredTypes = ['cv', 'profile_photo'] as const;

type DocumentType = (typeof uploadOrder)[number];

const documentTypeLabels: Record<DocumentType, string> = {
  valid_id: 'Valid ID',
  profile_photo: 'Profile Photo',
  cv: 'CV',
  birth_certificate: 'Birth Certificate',
};

export function StepDocuments(): ReactNode {
  const { data, isLoading } = useOnboardingDocuments();
  const upload = useUploadOnboardingDocument();
  const { addToast } = useToast();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingTypes, setUploadingTypes] = useState<Set<DocumentType>>(new Set());

  const uploadedMap = new Set((data?.data ?? []).map((doc) => doc.document_type));
  const requiredTypeSet = new Set<string>(requiredTypes);

  const handleUpload = (type: DocumentType, file: File): void => {
    setUploadError(null);
    setUploadingTypes((prev) => new Set(prev).add(type));

    upload.mutate(
      { documentType: type, file },
      {
        onError: (error) => {
          const message = error instanceof Error ? error.message : 'Failed to upload document';
          setUploadError(message);
          addToast({ title: 'Upload failed', description: message, variant: 'error' });
          setUploadingTypes((prev) => {
            const next = new Set(prev);
            next.delete(type);
            return next;
          });
        },
        onSuccess: () => {
          setUploadError(null);
          addToast({ title: 'Document uploaded', variant: 'success' });
          setUploadingTypes((prev) => {
            const next = new Set(prev);
            next.delete(type);
            return next;
          });
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      {uploadError && (
        <div className="rounded-md border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-3 text-sm text-rose-700 dark:text-rose-300">
          {uploadError}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {uploadOrder.map((type) => (
          <Badge
            key={type}
            variant={
              uploadedMap.has(type)
                ? 'success'
                : requiredTypeSet.has(type)
                  ? 'error'
                  : 'secondary'
            }
          >
            {documentTypeLabels[type]}
          </Badge>
        ))}
      </div>

      {uploadOrder.map((type) => (
        <DocumentUploadCard
          key={type}
          type={type}
          required={requiredTypeSet.has(type)}
          uploading={uploadingTypes.has(type)}
          onUpload={handleUpload}
        />
      ))}

      {!isLoading && (data?.data?.length ?? 0) > 0 && (
        <div className="rounded-md border border-zinc-200 dark:border-zinc-800 p-3">
          <p className="text-sm font-medium mb-2">Uploaded Files</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {data?.data?.map((doc) => (
              <li key={doc.id}>{doc.file_name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

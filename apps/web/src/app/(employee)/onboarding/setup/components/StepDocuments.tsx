'use client';

import { useOnboardingDocuments } from '@/hooks/useOnboardingDocuments';
import { useUploadOnboardingDocument } from '@/hooks/useUploadOnboardingDocument';
import { Badge } from '@hr-portal/ui';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { DocumentUploadCard } from './DocumentUploadCard';

const requiredTypes = ['valid_id', 'profile_photo', 'cv', 'birth_certificate'] as const;

type DocumentType = (typeof requiredTypes)[number];

export function StepDocuments(): ReactNode {
  const { data, isLoading } = useOnboardingDocuments();
  const upload = useUploadOnboardingDocument();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingTypes, setUploadingTypes] = useState<Set<DocumentType>>(new Set());

  const uploadedMap = new Set((data?.data ?? []).map((doc) => doc.document_type));

  const handleUpload = (type: DocumentType, file: File): void => {
    setUploadError(null);
    setUploadingTypes((prev) => new Set(prev).add(type));

    upload.mutate(
      { documentType: type, file },
      {
        onError: (error) => {
          const message = error instanceof Error ? error.message : 'Failed to upload document';
          setUploadError(message);
          setUploadingTypes((prev) => {
            const next = new Set(prev);
            next.delete(type);
            return next;
          });
        },
        onSuccess: () => {
          setUploadError(null);
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

      <div className="rounded-md border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-3">
        <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-1">
          Required Documents <span className="text-rose-500">*</span>
        </p>
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Please upload at least one document before proceeding to the final review.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {requiredTypes.map((type) => (
          <Badge key={type} variant={uploadedMap.has(type) ? 'success' : 'secondary'}>
            {type.replace('_', ' ')}
          </Badge>
        ))}
      </div>

      {requiredTypes.map((type) => (
        <DocumentUploadCard
          key={type}
          type={type}
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

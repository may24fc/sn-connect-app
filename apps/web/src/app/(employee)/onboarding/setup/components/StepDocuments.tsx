'use client';

import { useOnboardingDocuments } from '@/hooks/useOnboardingDocuments';
import { useUploadOnboardingDocument } from '@/hooks/useUploadOnboardingDocument';
import { Badge } from '@hr-portal/ui';
import type { ReactNode } from 'react';
import { DocumentUploadCard } from './DocumentUploadCard';

const requiredTypes = ['valid_id', 'profile_photo', 'cv', 'birth_certificate'] as const;

export function StepDocuments(): ReactNode {
  const { data, isLoading } = useOnboardingDocuments();
  const upload = useUploadOnboardingDocument();

  const uploadedMap = new Set((data?.data ?? []).map((doc) => doc.document_type));

  const handleUpload = (type: (typeof requiredTypes)[number], file: File): void => {
    upload.mutate({ documentType: type, file });
  };

  return (
    <div className="space-y-4">
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
          uploading={upload.isPending}
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

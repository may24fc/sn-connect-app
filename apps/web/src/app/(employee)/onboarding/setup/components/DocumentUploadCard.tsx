'use client';

import { Button, Card, CardContent } from '@hr-portal/ui';
import type { ReactNode } from 'react';

const labels: Record<'valid_id' | 'profile_photo' | 'cv' | 'birth_certificate', string> = {
  valid_id: 'Valid ID',
  profile_photo: 'Profile Photo',
  cv: 'CV',
  birth_certificate: 'Birth Certificate',
};

export function DocumentUploadCard({
  type,
  uploading,
  onUpload,
}: {
  type: 'valid_id' | 'profile_photo' | 'cv' | 'birth_certificate';
  uploading: boolean;
  onUpload: (type: 'valid_id' | 'profile_photo' | 'cv' | 'birth_certificate', file: File) => void;
}): ReactNode {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div>
          <p className="font-medium">{labels[type]}</p>
          <p className="text-sm text-muted-foreground">Upload the required file</p>
        </div>
        <div>
          <input
            id={`upload-${type}`}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.currentTarget.files?.[0];
              if (file) onUpload(type, file);
              e.currentTarget.value = '';
            }}
          />
          <Button asChild variant="outline" disabled={uploading}>
            <label htmlFor={`upload-${type}`} className="cursor-pointer">
              {uploading ? 'Uploading...' : 'Upload'}
            </label>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

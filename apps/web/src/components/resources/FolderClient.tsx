"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload } from 'lucide-react';
import { useResources } from '@/hooks/useResources';
import { ResourceGrid, ResourceCard, Card, CardHeader, CardTitle, Button } from '@hr-portal/ui';

interface Props {
  folderId: string;
}

export default function FolderClient({ folderId }: Props) {
  const router = useRouter();
  const { data: resourcesResp } = useResources({ page: 1, pageSize: 50, folderId });
  const resources = resourcesResp?.data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <Button variant="ghost" onClick={() => router.back()} className="-ml-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button className="ml-auto" onClick={() => router.push(`/information-hub/resources/new?folderId=${folderId}`)}>
          <Upload className="mr-2 h-4 w-4" />
          Upload Resource
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Resources in folder</CardTitle>
        </CardHeader>
        <div className="p-4">
          {resources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No resources in this folder yet.</p>
          ) : (
            <ResourceGrid columns={3} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {resources.map((r: any) => (
                <ResourceCard
                  key={r.id}
                  id={r.id}
                  title={r.title}
                  excerpt={r.excerpt}
                  resourceType={r.resource_type}
                  category={r.category}
                  status={r.status}
                  tags={r.tags}
                  thumbnailPath={r.thumbnail_path}
                  viewCount={r.view_count}
                  downloadCount={r.download_count}
                  bookmarkCount={r.bookmark_count}
                  isFeatured={r.is_featured}
                  isPinned={r.is_pinned}
                  dateLabel={r.updated_at || r.created_at || ''}
                  onClick={() => (window.location.href = `/information-hub/resources/${r.id}`)}
                />
              ))}
            </ResourceGrid>
          )}
        </div>
      </Card>
    </div>
  );
}

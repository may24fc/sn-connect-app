"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload } from 'lucide-react';
import { useResources } from '@/hooks/useResources';
import { useAuth } from '@/contexts/AuthContext';
import { ResourceGrid, ResourceCard, Card, CardHeader, CardTitle, Button, useToast } from '@hr-portal/ui';
import { useDeleteResource } from '@/hooks/useResources';
import { useBookmarkResource, useRemoveBookmark, useResourceBookmarks } from '@/hooks/useResourceBookmarks';
import { formatDate } from '@/lib/format';
import { useMemo, useState } from 'react';
import { ConfirmActionDialog } from '@/components/ConfirmActionDialog';

interface Props {
  folderId: string;
}

export default function FolderClient({ folderId }: Props) {
  const router = useRouter();
  const { user } = useAuth();

  const { data: resourcesResp } = useResources({ page: 1, pageSize: 50, folderId });
  const { data: myAuthoredResp } = useResources(
    user ? { page: 1, pageSize: 50, folderId, authorId: user.id } : { page: 1, pageSize: 50, folderId }
  );

  const publicResources = resourcesResp?.data || [];
  const authoredResources = myAuthoredResp?.data || [];

  // Merge authored resources first so the author sees their pending items in the folder view.
  const authoredIds = new Set(authoredResources.map((r: any) => r.id));
  const resources = [...authoredResources, ...publicResources.filter((r: any) => !authoredIds.has(r.id))];

  const deleteResource = useDeleteResource();
  const addBookmark = useBookmarkResource();
  const removeBookmark = useRemoveBookmark();
  const { data: bookmarksData } = useResourceBookmarks();
  const { addToast } = useToast();
  const bookmarks = bookmarksData?.data || [];
  const bookmarkIds = useMemo(
    () => new Set(bookmarks.map((bookmark) => bookmark.resource_id)),
    [bookmarks]
  );

  const isPendingApprovalStatus = (
    approvalStatus?: 'pending_approval' | 'pending_update' | 'pending_deletion' | 'rejected' | 'approved'
  ): boolean => approvalStatus !== undefined && approvalStatus !== 'approved';

  const [resourceDeleteTarget, setResourceDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const folderLinks = useMemo(
    () =>
      resources.filter(
        (resource: any) => resource.resource_type === 'link' && typeof resource.external_url === 'string' && resource.external_url.length > 0
      ),
    [resources]
  );

  const handleBookmarkToggle = (resourceId: string): void => {
    if (bookmarkIds.has(resourceId)) {
      removeBookmark.mutate(resourceId, {
        onSuccess: () => addToast({ title: 'Bookmark removed', variant: 'success' }),
      });
      return;
    }

    addBookmark.mutate({ resourceId }, {
      onSuccess: () => addToast({ title: 'Resource bookmarked', variant: 'success' }),
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteResource.mutateAsync(id);
      addToast({ title: 'Resource deleted', variant: 'success' });
      setResourceDeleteTarget(null);
    } catch (err) {
      addToast({ title: 'Failed to delete resource', variant: 'error' });
    }
  };

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

      {folderLinks.length > 0 ? (
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Project Links</h3>
          {folderLinks.map((link: any) => (
            <a
              key={`link-${link.id}`}
              href={link.external_url}
              target="_blank"
              rel="noreferrer"
              className="block truncate text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              {link.title}
            </a>
          ))}
        </div>
      ) : null}

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
                (() => {
                  const isPending = isPendingApprovalStatus(r.approval_status);
                  return (
                <ResourceCard
                  key={r.id}
                  id={r.id}
                  title={r.title}
                  excerpt={r.excerpt}
                  resourceType={r.resource_type}
                  category={r.category}
                  status={r.status}
                  approvalStatus={r.approval_status}
                  tags={r.tags}
                  thumbnailPath={r.thumbnail_path}
                  viewCount={r.view_count}
                  downloadCount={r.download_count}
                  bookmarkCount={r.bookmark_count}
                  isFeatured={r.is_featured}
                  isPinned={r.is_pinned}
                  isBookmarked={bookmarkIds.has(r.id)}
                  dateLabel={formatDate(r.published_at || r.created_at)}
                  disabled={isPending}
                  {...(!isPending
                    ? {
                        onClick: () => (window.location.href = `/information-hub/resources/${r.id}`),
                        onBookmark: () => handleBookmarkToggle(r.id),
                      }
                    : {})}
                  isOwner={user?.id === r.author_id}
                  onEdit={() => router.push(`/information-hub/resources/${r.id}`)}
                  onDelete={() => setResourceDeleteTarget({ id: r.id, title: r.title })}
                />
                  );
                })()
              ))}
            </ResourceGrid>
          )}
        </div>
      </Card>

      <ConfirmActionDialog
        open={resourceDeleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setResourceDeleteTarget(null);
          }
        }}
        title="Delete resource?"
        description={
          resourceDeleteTarget
            ? `"${resourceDeleteTarget.title}" will be removed. This action cannot be undone.`
            : 'This resource will be removed.'
        }
        confirmLabel="Delete resource"
        isPending={deleteResource.isPending}
        onConfirm={() => {
          if (resourceDeleteTarget) {
            void handleDelete(resourceDeleteTarget.id);
          }
        }}
      />
    </div>
  );
}

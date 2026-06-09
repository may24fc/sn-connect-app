'use client';

import {
  useBookmarkResource,
  useRemoveBookmark,
  useResourceBookmarks,
} from '@/hooks/useResourceBookmarks';
import { useFeaturedResources, useRecentResources, useResourceFeed } from '@/hooks/useResourceFeed';
import { useResources } from '@/hooks/useResources';
import { formatDate } from '@/lib/format';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CountBadge,
  CategoryBrowser,
  EmptyState,
  Input,
  ResourceCard,
  ResourceGrid,
  useToast,
  ResourceFolderCard,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
  Label,
} from '@hr-portal/ui';
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  Star,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useResourceFolders, useCreateResourceFolder } from '@/hooks/useResources';
import { useAuth } from '@/contexts/AuthContext';

const categoryLabels: Record<string, string> = {
  onboarding: 'Onboarding',
  training: 'Training',
  policies: 'Policies',
  benefits: 'Benefits',
  tools: 'Tools',
  culture: 'Culture',
  department_specific: 'Department',
  forms_templates: 'Forms',
  performance: 'Performance',
  emergency: 'Emergency',
};

export default function ResourcesPage() {
  const [search, setSearch] = useState('');
  const [resourcePage, setResourcePage] = useState(1);
  const [selectedResourceCategory, setSelectedResourceCategory] = useState<string>('');
  const [folderName, setFolderName] = useState('');
  const [folderDesc, setFolderDesc] = useState('');
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);

  const { data: resourceData, isLoading: isResourcesLoading } = useResourceFeed({
    ...(search ? { search } : {}),
    ...(selectedResourceCategory ? { category: selectedResourceCategory } : {}),
    page: resourcePage,
    pageSize: 12,
  });
  const { data: featuredData } = useFeaturedResources();
  const { data: recentData } = useRecentResources();
  const { data: bookmarksData } = useResourceBookmarks();

  const addBookmark = useBookmarkResource();
  const removeBookmark = useRemoveBookmark();
  const { addToast } = useToast();

  const resources = resourceData?.data || [];
  const featuredResources = featuredData?.data || [];
  const recentResources = recentData?.data || [];
  const bookmarks = bookmarksData?.data || [];

  const { data: foldersData } = useResourceFolders();
  const createFolder = useCreateResourceFolder();
  const { user } = useAuth();
  const { data: mySubmissionsData } = useResources(user ? { authorId: user.id, page: 1, pageSize: 12 } : { page: 1, pageSize: 12 });

  const bookmarkIds = useMemo(
    () => new Set(bookmarks.map((bookmark) => bookmark.resource_id)),
    [bookmarks]
  );

  const resourceCategoryItems = useMemo(() => {
    const counts = resources.reduce<Record<string, number>>((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(categoryLabels).map(([value, label]) => ({
      value: value as
        | 'onboarding'
        | 'training'
        | 'policies'
        | 'benefits'
        | 'tools'
        | 'culture'
        | 'department_specific'
        | 'forms_templates'
        | 'performance'
        | 'emergency',
      label,
      description: `${label} resources`,
      count: counts[value] || 0,
    }));
  }, [resources]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Resources</h1>
          <p className="text-muted-foreground">
            Browse and discover company resources
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/information-hub/resources/bookmarks">
            <Button variant="outline" size="sm" className="flex items-center gap-2 shrink-0">
              <Bookmark className="h-4 w-4" />
              My Bookmarks
              {bookmarks.length > 0 && (
                <CountBadge className="ml-1" variant="accent" size="md" count={bookmarks.length} />
              )}
            </Button>
          </Link>

          <Link href="/information-hub/resources/new">
            <Button size="sm" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Upload Resource
            </Button>
          </Link>

          <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost">New Folder</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create new folder</DialogTitle>
                <DialogDescription>Folders are company-wide and can be used to organize resources.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                <Label className="text-xs">Name</Label>
                <Input id="folder-name" value={folderName} onChange={(e) => setFolderName(e.target.value)} />
                <Label className="text-xs">Description</Label>
                <Input id="folder-desc" value={folderDesc} onChange={(e) => setFolderDesc(e.target.value)} />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost">Cancel</Button>
                </DialogClose>
                <Button
                  onClick={async () => {
                    try {
                      await createFolder.mutateAsync({ name: folderName, description: folderDesc });
                      setFolderName('');
                      setFolderDesc('');
                      setIsFolderDialogOpen(false);
                    } catch (err) {
                      // ignore - mutation will surface toasts elsewhere
                    }
                  }}
                >
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Folder Row */}
      <div>
        <h2 className="text-sm font-semibold mb-3">Folders</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {(foldersData?.data || []).map((folder: any) => (
            <ResourceFolderCard
              key={folder.id}
              id={folder.id}
              name={folder.name}
              description={folder.description}
              color={folder.color}
              icon={folder.icon}
              resourceCount={folder.resource_count || 0}
              onClick={() => (window.location.href = `/information-hub/resources/folder/${folder.id}`)}
            />
          ))}
        </div>
      </div>
      {mySubmissionsData && mySubmissionsData.data && mySubmissionsData.data.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mt-4 mb-3">My Submissions</h2>
          <ResourceGrid columns={3} className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mySubmissionsData.data.map((res: any) => (
              <ResourceCard
                key={res.id}
                id={res.id}
                title={res.title}
                excerpt={res.excerpt}
                resourceType={res.resource_type}
                category={res.category}
                status={res.status}
                approvalStatus={res.approval_status}
                tags={res.tags}
                thumbnailPath={res.thumbnail_path}
                viewCount={res.view_count}
                downloadCount={res.download_count}
                bookmarkCount={res.bookmark_count}
                isFeatured={res.is_featured}
                isPinned={res.is_pinned}
                isBookmarked={bookmarkIds.has(res.id)}
                dateLabel={formatDate(res.published_at || res.created_at)}
                onClick={() => window.location.href = `/information-hub/resources/${res.id}`}
                onBookmark={() => handleBookmarkToggle(res.id)}
              />
            ))}
          </ResourceGrid>
        </div>
      )}

      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-10 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
          placeholder="Search resources"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setResourcePage(1);
          }}
        />
      </div>

      <div className="space-y-6">
        {/* Pagination - Gmail style at top */}
        {(resourceData?.pagination.totalPages ?? 1) > 1 && (
          <div className="flex items-center justify-end gap-3">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {(resourcePage - 1) * 12 + 1}-
              {Math.min(resourcePage * 12, resourceData?.pagination.total ?? 0)} of{' '}
              {resourceData?.pagination.total ?? 0}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Previous page"
                disabled={resourcePage <= 1}
                onClick={() => setResourcePage((value) => Math.max(1, value - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Next page"
                disabled={(resourceData?.pagination.totalPages || 1) <= resourcePage}
                onClick={() => setResourcePage((value) => value + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {featuredResources.length > 0 ? (
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-zinc-950/50 dark:to-zinc-900/50 rounded-lg p-6 border border-slate-200 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3 flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              Featured Resources
            </h3>
            <ResourceGrid
              columns={4}
              className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
              {featuredResources.slice(0, 4).map((resource) => (
                <ResourceCard
                  key={resource.id}
                  id={resource.id}
                  title={resource.title}
                  excerpt={resource.excerpt}
                  resourceType={resource.resource_type}
                  category={resource.category}
                  status={resource.status}
                  tags={resource.tags}
                  thumbnailPath={resource.thumbnail_path}
                  viewCount={resource.view_count}
                  downloadCount={resource.download_count}
                  bookmarkCount={resource.bookmark_count}
                  isFeatured={resource.is_featured}
                  isPinned={resource.is_pinned}
                  isBookmarked={bookmarkIds.has(resource.id)}
                  dateLabel={formatDate(resource.published_at || resource.created_at)}
                  onClick={() => {
                    window.location.href = `/information-hub/resources/${resource.id}`;
                  }}
                  onBookmark={() => handleBookmarkToggle(resource.id)}
                />
              ))}
            </ResourceGrid>
          </div>
        ) : null}

        <CategoryBrowser
          categories={resourceCategoryItems}
          selectedCategory={selectedResourceCategory}
          onSelect={(category) => {
            setSelectedResourceCategory(category === selectedResourceCategory ? '' : category);
            setResourcePage(1);
          }}
        />

        {isResourcesLoading ? (
          <Card>
            <CardContent>
              <EmptyState
                icon={<Loader2 className="h-5 w-5 animate-spin" />}
                title="Loading resources"
                description="Resources are still loading."
                size="sm"
              />
            </CardContent>
          </Card>
        ) : resources.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState
                icon={Search}
                title="No resources found"
                description={
                  search || selectedResourceCategory
                    ? 'No resources match the current search or category filter.'
                    : 'Resources will appear here once content is published to the information hub.'
                }
                size="sm"
              />
            </CardContent>
          </Card>
        ) : (
          <ResourceGrid
            columns={4}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {resources.map((resource) => (
              <ResourceCard
                key={resource.id}
                id={resource.id}
                title={resource.title}
                excerpt={resource.excerpt}
                resourceType={resource.resource_type}
                category={resource.category}
                status={resource.status}
                tags={resource.tags}
                thumbnailPath={resource.thumbnail_path}
                viewCount={resource.view_count}
                downloadCount={resource.download_count}
                bookmarkCount={resource.bookmark_count}
                isFeatured={resource.is_featured}
                isPinned={resource.is_pinned}
                isBookmarked={bookmarkIds.has(resource.id)}
                dateLabel={formatDate(resource.published_at || resource.created_at)}
                onClick={() => {
                  window.location.href = `/information-hub/resources/${resource.id}`;
                }}
                onBookmark={() => handleBookmarkToggle(resource.id)}
              />
            ))}
          </ResourceGrid>
        )}

        {recentResources.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recently Viewed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentResources.slice(0, 5).map((resource) => (
                <div key={resource.id} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-700 dark:text-zinc-300">{resource.title}</span>
                  <Link
                    href={`/information-hub/resources/${resource.id}`}
                    className="text-slate-700 dark:text-zinc-400 hover:underline"
                  >
                    Open
                  </Link>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

'use client';

import { useResources, useRestoreResource, type ResourceRecord } from '@/hooks/useResources';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableTableHead } from '@/components/data-display/SortableTableHead';
import { formatDate } from '@/lib/format';
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useToast,
} from '@hr-portal/ui';
import { AlertCircle, Archive, ArrowLeft, Loader2, RotateCcw, Search } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

function getResourceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    video: 'Video',
    document: 'Document',
    image: 'Image',
    link: 'Link',
    presentation: 'Presentation',
    interactive: 'Interactive',
  };
  return labels[type] || type;
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    onboarding: 'Onboarding',
    training: 'Training',
    policies: 'Policies',
    benefits: 'Benefits',
    tools: 'Tools',
    culture: 'Culture',
    department_specific: 'Department',
    forms_templates: 'Forms & Templates',
    performance: 'Performance',
    emergency: 'Emergency',
  };
  return labels[category] || category;
}

export default function ArchivedResourcesPage() {
  const { addToast } = useToast();
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useResources({
    status: 'archived',
    ...(search ? { search } : {}),
    page: 1,
    pageSize: 100,
  });

  const restoreResource = useRestoreResource();

  const resources = data?.data || [];

  const { sortColumn, sortDirection, handleSort, sortItems } = useTableSort({
    initialColumn: 'updated_at',
    initialDirection: 'desc',
  });

  const sortedResources = sortItems(resources, {
    title: (r) => r.title.toLowerCase(),
    resource_type: (r) => r.resource_type,
    category: (r) => r.category,
    updated_at: (r) => r.updated_at,
    created_at: (r) => r.created_at,
  });

  const sortHeadProps = { sortColumn, sortDirection, onSort: handleSort };

  function handleRestore(resource: ResourceRecord) {
    restoreResource.mutate(resource.id, {
      onSuccess: () =>
        addToast({
          variant: 'success',
          title: 'Resource restored',
          description: `"${resource.title}" has been restored as a draft.`,
        }),
      onError: () =>
        addToast({
          variant: 'error',
          title: 'Failed to restore resource',
          description: 'Could not restore the resource. Please try again.',
        }),
    });
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/resources"
              className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                Archived Resources
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                View and restore previously archived resources
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="bg-card border border-border rounded-lg p-4">
            <CardContent className="p-0">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Archived Resources</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {resources.length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <Input
              placeholder="Search archived resources..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <Card className="bg-card border border-border rounded-lg p-8">
            <CardContent className="p-0">
              <EmptyState
                icon={<Loader2 className="h-5 w-5 animate-spin" />}
                title="Loading archived resources"
                description="Archived resources are still loading."
                size="sm"
              />
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="bg-card border border-border rounded-lg p-8">
            <CardContent className="p-0">
              <EmptyState
                icon={AlertCircle}
                title="Failed to load archived resources"
                description="Refresh and try again to load archived resource records."
                size="sm"
              />
            </CardContent>
          </Card>
        ) : resources.length === 0 ? (
          <Card className="bg-card border border-border rounded-lg p-12">
            <CardContent className="p-0">
              <EmptyState
                icon={Archive}
                title="No archived resources"
                description="Resources that are archived will appear here."
                size="md"
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-zinc-200 dark:border-zinc-800">
                  <SortableTableHead column="title" {...sortHeadProps}>
                    Title
                  </SortableTableHead>
                  <SortableTableHead column="resource_type" {...sortHeadProps}>
                    Type
                  </SortableTableHead>
                  <SortableTableHead column="category" {...sortHeadProps}>
                    Category
                  </SortableTableHead>
                  <SortableTableHead column="updated_at" {...sortHeadProps}>
                    Archived On
                  </SortableTableHead>
                  <SortableTableHead column="created_at" {...sortHeadProps}>
                    Originally Created
                  </SortableTableHead>
                  <TableHead className="text-sm font-medium text-zinc-600 dark:text-zinc-400 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedResources.map((resource) => (
                  <TableRow
                    key={resource.id}
                    className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <TableCell className="text-sm font-medium text-zinc-900 dark:text-zinc-50 max-w-xs truncate">
                      {resource.title}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
                      <Badge variant="outline">{getResourceTypeLabel(resource.resource_type)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
                      <Badge variant="secondary">{getCategoryLabel(resource.category)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
                      {formatDate(resource.updated_at)}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
                      {formatDate(resource.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRestore(resource)}
                        title="Restore"
                        disabled={restoreResource.isPending}
                      >
                        <RotateCcw className="h-4 w-4 text-zinc-500 mr-1.5" />
                        Restore
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}

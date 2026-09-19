'use client';

import { useDirectory } from '@/hooks/useDirectory';
import {
  type ProjectContributorRecord,
  useAddProjectContributor,
  useRemoveProjectContributor,
} from '@/hooks/useProjects';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  useToast,
} from '@hr-portal/ui';
import { AlertCircle, Loader2, Plus, Trash2, Users } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';

const DIRECTORY_PAGE_SIZE = 25;

interface ManageContributorsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  contributors: Array<ProjectContributorRecord>;
  /** The project lead cannot be removed from the contributor list here. */
  leadUserId: string | null;
}

export function ManageContributorsDialog({
  open,
  onOpenChange,
  projectId,
  contributors,
  leadUserId,
}: ManageContributorsDialogProps): ReactNode {
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [roleToAdd, setRoleToAdd] = useState<'lead' | 'contributor'>('contributor');
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const addContributor = useAddProjectContributor();
  const removeContributor = useRemoveProjectContributor();

  // Server-side search keeps this usable beyond the first directory page.
  const {
    data: directoryData,
    isLoading: directoryLoading,
    error: directoryError,
  } = useDirectory({
    ...(search.trim() ? { search: search.trim() } : {}),
    page: 1,
    pageSize: DIRECTORY_PAGE_SIZE,
    excludeTerminated: true,
  });

  const contributorIds = useMemo(
    () => new Set(contributors.map((contributor) => contributor.user_id)),
    [contributors]
  );

  const namesByUserId = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of directoryData?.data ?? []) {
      map.set(entry.user_id, entry.full_name);
    }
    return map;
  }, [directoryData?.data]);

  const candidates = useMemo(
    () => (directoryData?.data ?? []).filter((entry) => !contributorIds.has(entry.user_id)),
    [directoryData?.data, contributorIds]
  );

  const directoryTotal = directoryData?.pagination?.total ?? 0;
  const hasMoreThanShown = directoryTotal > (directoryData?.data?.length ?? 0);

  const handleAdd = async (userId: string): Promise<void> => {
    setPendingUserId(userId);
    try {
      await addContributor.mutateAsync({ projectId, userId, role: roleToAdd });
      addToast({ title: 'Contributor added', variant: 'success' });
    } catch (addError) {
      addToast({
        title: 'Failed to add contributor',
        description:
          addError instanceof Error
            ? addError.message
            : 'You may not have permission to manage this project.',
        variant: 'error',
      });
    } finally {
      setPendingUserId(null);
    }
  };

  const handleRemove = async (userId: string): Promise<void> => {
    setPendingUserId(userId);
    try {
      await removeContributor.mutateAsync({ projectId, userId });
      addToast({ title: 'Contributor removed', variant: 'success' });
    } catch (removeError) {
      addToast({
        title: 'Failed to remove contributor',
        description:
          removeError instanceof Error
            ? removeError.message
            : 'You may not have permission to manage this project.',
        variant: 'error',
      });
    } finally {
      setPendingUserId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Contributors</DialogTitle>
          <DialogDescription>
            Project leads, supervisors, and administrators can add or remove contributors.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Current contributors</h3>
            {contributors.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No contributors yet"
                description="Add people from the directory below."
                size="sm"
              />
            ) : (
              <div className="space-y-1 rounded-md border border-zinc-200 p-2 dark:border-zinc-800">
                {contributors.map((contributor) => {
                  const isLead = contributor.user_id === leadUserId;
                  const isBusy = pendingUserId === contributor.user_id;

                  return (
                    <div
                      key={contributor.user_id}
                      className="flex items-center justify-between gap-2 rounded p-1.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm">
                          {namesByUserId.get(contributor.user_id) ?? contributor.user_id}
                        </p>
                        <p className="text-xs capitalize text-muted-foreground">
                          {contributor.role}
                          {isLead ? ' · project lead' : ''}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Remove contributor"
                        className="text-muted-foreground hover:text-rose-600"
                        disabled={isLead || isBusy || removeContributor.isPending}
                        onClick={() => void handleRemove(contributor.user_id)}
                      >
                        {isBusy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Add a contributor</h3>
            <div className="flex gap-2">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search the directory by name..."
                className="flex-1"
              />
              <div className="w-40">
                <Label className="sr-only" htmlFor="contributor-role">
                  Role
                </Label>
                <Select
                  value={roleToAdd}
                  onValueChange={(value) => setRoleToAdd(value as 'lead' | 'contributor')}
                >
                  <SelectTrigger id="contributor-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contributor">Contributor</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {directoryLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : directoryError ? (
              <EmptyState
                icon={AlertCircle}
                title="Failed to load the directory"
                description={directoryError.message}
                size="sm"
              />
            ) : candidates.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No matching people"
                description={
                  search.trim()
                    ? 'Try a different name.'
                    : 'Everyone in the first page of the directory is already a contributor.'
                }
                size="sm"
              />
            ) : (
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-zinc-200 p-2 dark:border-zinc-800">
                {candidates.map((entry) => {
                  const isBusy = pendingUserId === entry.user_id;

                  return (
                    <div
                      key={entry.user_id}
                      className="flex items-center justify-between gap-2 rounded p-1.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm">{entry.full_name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {entry.position || entry.role}
                          {entry.department_name ? ` · ${entry.department_name}` : ''}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isBusy || addContributor.isPending}
                        onClick={() => void handleAdd(entry.user_id)}
                      >
                        {isBusy ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Plus className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Add
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {hasMoreThanShown && (
              <p className="text-xs text-muted-foreground">
                Showing {candidates.length} of {directoryTotal} directory entries. Refine the search
                to find someone not listed.
              </p>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

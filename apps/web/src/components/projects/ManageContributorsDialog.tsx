'use client';

import {
  type ProjectContributorRecord,
  useAddProjectContributor,
  useProjectContributorCandidates,
  useRemoveProjectContributor,
} from '@/hooks/useProjects';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  PersonMeta,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  UserAvatar,
  formatPersonRole,
  useToast,
} from '@hr-portal/ui';
import { AlertCircle, Loader2, Plus, Trash2, Users } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';

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

  // Server-side search keeps this usable beyond the first page. This project-scoped endpoint works
  // for leads and supervisors, who usually can't read the admin directory.
  const {
    data: candidatesData,
    isLoading: directoryLoading,
    error: directoryError,
  } = useProjectContributorCandidates(projectId, search, { enabled: open });

  // Contributor identities come from the project detail; candidate rows are only a fallback.
  const directoryPeopleByUserId = useMemo(() => {
    const map = new Map<string, { name: string; avatarUrl: string | null }>();
    for (const entry of candidatesData?.data ?? []) {
      map.set(entry.user_id, { name: entry.full_name, avatarUrl: entry.avatar_url });
    }
    return map;
  }, [candidatesData?.data]);

  const candidates = candidatesData?.data ?? [];
  const directoryTotal = candidatesData?.total ?? 0;
  const hasMoreThanShown = directoryTotal > candidates.length;

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
      <DialogContent
        className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0"
        style={{ width: '36rem', maxWidth: 'calc(100vw - 2rem)' }}
      >
        <DialogHeader className="shrink-0 border-b px-6 py-5 pr-12">
          <DialogTitle>Manage Contributors</DialogTitle>
          <DialogDescription>
            Project leads, supervisors, and administrators can add or remove contributors.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-6 py-5">
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Current contributors</h3>
              <Badge variant="secondary" className="tabular-nums">
                {contributors.length}
              </Badge>
            </div>
            {contributors.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No contributors yet"
                description="Add people from the directory below."
                size="sm"
              />
            ) : (
              <div className="max-h-48 divide-y overflow-y-auto overscroll-contain rounded-lg border bg-muted/20 px-3">
                {contributors.map((contributor) => {
                  const isLead = contributor.user_id === leadUserId;
                  const isBusy = pendingUserId === contributor.user_id;
                  const directoryPerson = directoryPeopleByUserId.get(contributor.user_id);
                  const name = contributor.name ?? directoryPerson?.name ?? 'Unknown member';

                  return (
                    <div
                      key={contributor.user_id}
                      className="flex min-h-16 items-center justify-between gap-3 py-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <UserAvatar
                          name={name}
                          avatarUrl={contributor.avatar_url ?? directoryPerson?.avatarUrl}
                          size="sm"
                        />
                        <div className="flex min-w-0 flex-col">
                          <p className="truncate text-sm">{name}</p>
                          <PersonMeta
                            parts={[isLead ? 'Project lead' : formatPersonRole(contributor.role)]}
                          />
                        </div>
                      </div>
                      {isLead ? (
                        <Badge variant="outline" className="shrink-0">
                          Lead
                        </Badge>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${name}`}
                          className="shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          disabled={isBusy || removeContributor.isPending}
                          onClick={() => void handleRemove(contributor.user_id)}
                        >
                          {isBusy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold">Add a contributor</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Search for a teammate, then choose the access they should have.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem]">
              <div className="min-w-0">
                <Label className="sr-only" htmlFor="contributor-search">
                  Search people
                </Label>
                <Input
                  id="contributor-search"
                  value={search}
                  maxLength={200}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name or email"
                  className="w-full"
                />
              </div>
              <div className="min-w-0">
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
                    : 'Everyone available is already a contributor.'
                }
                size="sm"
              />
            ) : (
              <div className="max-h-[min(18rem,40dvh)] divide-y overflow-y-auto overscroll-contain rounded-lg border bg-background px-3">
                {candidates.map((entry) => {
                  const isBusy = pendingUserId === entry.user_id;

                  return (
                    <div
                      key={entry.user_id}
                      className="flex min-h-16 items-center justify-between gap-3 py-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <UserAvatar name={entry.full_name} avatarUrl={entry.avatar_url} size="sm" />
                        <div className="flex min-w-0 flex-col">
                          <p className="truncate text-sm">{entry.full_name}</p>
                          <PersonMeta
                            parts={[
                              entry.position || formatPersonRole(entry.role),
                              entry.department_name,
                            ]}
                          />
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
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
                Showing {candidates.length} of {directoryTotal} people. Refine the search to find
                someone not listed.
              </p>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

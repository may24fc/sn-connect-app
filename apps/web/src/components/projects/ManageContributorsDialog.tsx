'use client';

import { useAuth } from '@/contexts/AuthContext';
import {
  type ProjectContributorRecord,
  useAddProjectContributor,
  useCancelProjectInvitation,
  usePendingProjectInvitations,
  useProjectContributorCandidates,
  useProjectLeadCandidates,
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
  const { user } = useAuth();
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [roleToAdd, setRoleToAdd] = useState<'lead' | 'contributor'>('contributor');
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const addContributor = useAddProjectContributor();
  const removeContributor = useRemoveProjectContributor();
  const cancelInvitation = useCancelProjectInvitation();
  const {
    data: invitationsData,
    isLoading: invitationsLoading,
    isError: invitationsError,
    refetch: refetchInvitations,
  } = usePendingProjectInvitations(projectId, open);

  // Server-side search keeps this usable beyond the first page. This project-scoped endpoint works
  // for leads and supervisors, who usually can't read the admin directory.
  const {
    data: candidatesData,
    isLoading: directoryLoading,
    error: directoryError,
  } = useProjectContributorCandidates(projectId, search, { enabled: open });
  const {
    data: leadCandidatesData,
    isLoading: leadCandidatesLoading,
    error: leadCandidatesError,
    refetch: refetchLeadCandidates,
  } = useProjectLeadCandidates(user?.id, open);

  // Contributor identities come from the project detail; candidate rows are only a fallback.
  const directoryPeopleByUserId = useMemo(() => {
    const map = new Map<string, { name: string; avatarUrl: string | null }>();
    for (const entry of candidatesData?.data ?? []) {
      map.set(entry.user_id, { name: entry.full_name, avatarUrl: entry.avatar_url });
    }
    return map;
  }, [candidatesData?.data]);

  const eligibleLeadIds = new Set((leadCandidatesData?.data ?? []).map((person) => person.id));
  if (user?.id) eligibleLeadIds.add(user.id);
  const existingIds = new Set(contributors.map((contributor) => contributor.user_id));
  const pendingInvitees = new Set(
    (invitationsData?.data ?? []).map((invitation) => invitation.invitee_id)
  );
  const leadCandidates = [
    ...(user
      ? [
          {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            department: null,
            position: null,
            avatarUrl: user.avatarUrl ?? null,
            requiresInvitation: false,
          },
        ]
      : []),
    ...(leadCandidatesData?.data ?? []).filter((person) => person.id !== user?.id),
  ]
    .filter((person) => !existingIds.has(person.id))
    .filter((person) => {
      const term = search.trim().toLowerCase();
      return (
        !term ||
        person.name.toLowerCase().includes(term) ||
        person.email?.toLowerCase().includes(term)
      );
    })
    .map((person) => ({
      user_id: person.id,
      full_name: person.name,
      avatar_url: person.avatarUrl,
      position: person.position,
      department_name: person.department,
      role: person.role,
      requires_invitation: person.requiresInvitation,
    }));
  const candidates = roleToAdd === 'lead' ? leadCandidates : (candidatesData?.data ?? []);
  const directoryTotal = roleToAdd === 'lead' ? candidates.length : (candidatesData?.total ?? 0);
  const hasMoreThanShown = directoryTotal > candidates.length;

  const handleAdd = async (
    userId: string,
    selectedRole: 'lead' | 'contributor' = roleToAdd
  ): Promise<void> => {
    setPendingUserId(userId);
    try {
      const result = await addContributor.mutateAsync({ projectId, userId, role: selectedRole });
      addToast({
        title:
          result.outcome === 'invited'
            ? 'Invitation sent'
            : selectedRole === 'lead'
              ? 'Project lead added'
              : 'Contributor updated',
        ...(result.outcome === 'invited'
          ? { description: 'They will join in the requested role only after accepting.' }
          : {}),
        variant: 'success',
      });
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

  const handleCancelInvitation = async (invitationId: string, userId: string): Promise<void> => {
    setPendingUserId(userId);
    try {
      await cancelInvitation.mutateAsync({ projectId, invitationId });
      addToast({ title: 'Invitation cancelled', variant: 'success' });
    } catch (cancelError) {
      addToast({
        title: 'Failed to cancel invitation',
        description: cancelError instanceof Error ? cancelError.message : 'Try again.',
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
            Project leads can manage the project. Contributors can participate without receiving
            lead management access.
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
                  const isPrimaryLead = contributor.user_id === leadUserId;
                  const isLead = isPrimaryLead || contributor.role === 'lead';
                  const isBusy = pendingUserId === contributor.user_id;
                  const invitationPending = pendingInvitees.has(contributor.user_id);
                  const leadCandidate = leadCandidatesData?.data.find(
                    (person) => person.id === contributor.user_id
                  );
                  const directoryPerson = directoryPeopleByUserId.get(contributor.user_id);
                  const name = contributor.name ?? directoryPerson?.name ?? 'Unknown member';

                  return (
                    <div
                      key={contributor.user_id}
                      className="flex min-h-16 flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2.5"
                    >
                      <div className="flex min-w-32 flex-1 items-center gap-2.5">
                        <UserAvatar
                          name={name}
                          avatarUrl={contributor.avatar_url ?? directoryPerson?.avatarUrl}
                          size="sm"
                        />
                        <div className="flex min-w-0 flex-col">
                          <p className="truncate text-sm">{name}</p>
                          <PersonMeta
                            parts={[
                              isPrimaryLead
                                ? 'Primary project lead'
                                : isLead
                                  ? 'Project lead'
                                  : 'Contributor',
                            ]}
                          />
                        </div>
                      </div>
                      <div className="ml-auto flex shrink-0 items-center gap-1">
                        {isLead ? <Badge variant="outline">Project lead</Badge> : null}
                        {!isPrimaryLead && (isLead || eligibleLeadIds.has(contributor.user_id)) ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={
                              isBusy || addContributor.isPending || (!isLead && invitationPending)
                            }
                            aria-label={`${isLead ? 'Remove project lead access from' : leadCandidate?.requiresInvitation ? 'Invite as project lead' : 'Make project lead'} ${name}`}
                            onClick={() =>
                              void handleAdd(contributor.user_id, isLead ? 'contributor' : 'lead')
                            }
                          >
                            {isLead
                              ? 'Remove project lead access'
                              : invitationPending
                                ? 'Invitation pending'
                                : leadCandidate?.requiresInvitation
                                  ? 'Invite as project lead'
                                  : 'Make project lead'}
                          </Button>
                        ) : null}
                        {!isPrimaryLead ? (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Remove ${name}`}
                            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            disabled={isBusy || removeContributor.isPending}
                            onClick={() => void handleRemove(contributor.user_id)}
                          >
                            {isBusy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Pending invitations</h3>
              <Badge variant="secondary">{invitationsData?.data.length ?? 0}</Badge>
            </div>
            {invitationsLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : invitationsError ? (
              <div
                role="alert"
                className="flex flex-wrap items-center gap-2 text-sm text-destructive"
              >
                Could not load pending invitations.
                <Button variant="outline" size="sm" onClick={() => void refetchInvitations()}>
                  Retry
                </Button>
              </div>
            ) : !invitationsData?.data.length ? (
              <p className="text-sm text-muted-foreground">No pending invitations.</p>
            ) : (
              <div className="divide-y rounded-lg border px-3">
                {invitationsData.data.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3"
                  >
                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium">{invitation.invitee_name}</p>
                      <PersonMeta
                        parts={[
                          invitation.make_primary
                            ? 'Proposed primary lead'
                            : invitation.role === 'lead'
                              ? 'Project lead'
                              : 'Contributor',
                          'Awaiting response',
                        ]}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={
                        pendingUserId === invitation.invitee_id || cancelInvitation.isPending
                      }
                      onClick={() =>
                        void handleCancelInvitation(invitation.id, invitation.invitee_id)
                      }
                    >
                      Cancel invitation
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold">Add a contributor</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                People in departments you lead can be added directly. Everyone else receives an
                invitation to accept or decline, including when you are an administrator.
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
                  placeholder="Search by name"
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
                    <SelectItem value="lead">Project lead</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {leadCandidatesError ? (
              <div role="alert" className="flex items-center gap-2 text-sm text-destructive">
                Could not load eligible project leads.
                <Button variant="outline" size="sm" onClick={() => void refetchLeadCandidates()}>
                  Retry
                </Button>
              </div>
            ) : null}
            {(roleToAdd === 'lead' ? leadCandidatesLoading : directoryLoading) ? (
              <div className="space-y-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : (roleToAdd === 'lead' ? leadCandidatesError : directoryError) ? (
              <EmptyState
                icon={AlertCircle}
                title="Failed to load people"
                description="Try again before adding someone."
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
                  const invitationPending = pendingInvitees.has(entry.user_id);

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
                          {entry.requires_invitation ? (
                            <span className="break-words text-xs text-muted-foreground">
                              Invitation required
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        disabled={isBusy || addContributor.isPending || invitationPending}
                        onClick={() => void handleAdd(entry.user_id)}
                      >
                        {isBusy ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Plus className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        {invitationPending
                          ? 'Pending'
                          : entry.requires_invitation
                            ? 'Invite'
                            : 'Add'}
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

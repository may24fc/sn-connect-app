'use client';

import { useDirectory } from '@/hooks/useDirectory';
import {
  useAtsAccessGrants,
  useGrantAtsAccess,
  useRevokeAtsAccess,
} from '@/hooks/useAtsAccess';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  useToast,
} from '@hr-portal/ui';
import { AlertCircle, Loader2, Search, ShieldCheck, ShieldX, UserPlus, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

interface AtsAccessManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatRole(role: string | null): string {
  if (!role) {
    return 'Unknown role';
  }

  return role
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

export function AtsAccessManagerDialog({
  open,
  onOpenChange,
}: AtsAccessManagerDialogProps) {
  const { addToast } = useToast();
  const [search, setSearch] = useState('');

  const directoryQuery = useDirectory({
    search,
    roles: ['employee', 'intern'],
    sortBy: 'full_name',
    sortOrder: 'asc',
    page: 1,
    pageSize: 100,
  });
  const grantsQuery = useAtsAccessGrants(open);
  const grantAccess = useGrantAtsAccess();
  const revokeAccess = useRevokeAtsAccess();

  const grants = grantsQuery.data?.data ?? [];
  const grantedUserIds = useMemo(() => new Set(grants.map((grant) => grant.userId)), [grants]);

  const candidates = useMemo(() => {
    return (directoryQuery.data?.data ?? []).filter((entry) => !grantedUserIds.has(entry.user_id));
  }, [directoryQuery.data?.data, grantedUserIds]);

  const isLoading = directoryQuery.isLoading || grantsQuery.isLoading;

  async function handleGrant(userId: string, fullName: string) {
    try {
      await grantAccess.mutateAsync(userId);
      addToast({
        variant: 'success',
        title: 'ATS access granted',
        description: `${fullName} can now access Recruitment and Jobs without admin promotion.`,
      });
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Failed to grant ATS access',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  }

  async function handleRevoke(userId: string, fullName: string) {
    try {
      await revokeAccess.mutateAsync(userId);
      addToast({
        variant: 'default',
        title: 'ATS access revoked',
        description: `${fullName} no longer has ATS access.`,
      });
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Failed to revoke ATS access',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Manage ATS access</DialogTitle>
          <DialogDescription>
            Grant employee or intern accounts full ATS permissions without changing their primary role.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(85vh-7rem)] space-y-6 overflow-y-auto pr-1">
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Current ATS members</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  These users can open Recruitment, Jobs, applications, hiring, and archive workflows.
                </p>
              </div>
              <Badge variant="outline">{grants.length} active</Badge>
            </div>

            {grants.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400">
                No ATS delegates yet.
              </div>
            ) : (
              <div className="space-y-2">
                {grants.map((grant) => {
                  const fullName = grant.fullName ?? grant.email ?? 'Unknown user';

                  return (
                    <div
                      key={grant.userId}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/70 px-4 py-3"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {fullName}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                          <span>{grant.email ?? 'No email'}</span>
                          <span>•</span>
                          <span>{formatRole(grant.role)}</span>
                          {grant.position ? (
                            <>
                              <span>•</span>
                              <span>{grant.position}</span>
                            </>
                          ) : null}
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void handleRevoke(grant.userId, fullName)}
                        disabled={revokeAccess.isPending}
                      >
                        {revokeAccess.isPending ? (
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : (
                          <ShieldX className="mr-1.5 h-4 w-4" />
                        )}
                        Revoke
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Grant access</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Search existing employee and intern accounts, then grant ATS permissions.
              </p>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, email, or role"
                className="pl-10"
              />
            </div>

            {isLoading ? (
              <div className="flex min-h-32 items-center justify-center rounded-lg border border-border text-sm text-zinc-500 dark:text-zinc-400">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading eligible users...
              </div>
            ) : directoryQuery.isError || grantsQuery.isError ? (
              <div className="flex min-h-32 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-4 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
                <AlertCircle className="mr-2 h-4 w-4" />
                {(directoryQuery.error instanceof Error && directoryQuery.error.message) ||
                  (grantsQuery.error instanceof Error && grantsQuery.error.message) ||
                  'Failed to load ATS access data.'}
              </div>
            ) : candidates.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400">
                {search ? 'No matching employee or intern accounts found.' : 'Everyone in the current result set already has ATS access.'}
              </div>
            ) : (
              <div className="space-y-2">
                {candidates.map((candidate) => {
                  const fullName = candidate.full_name || candidate.email || 'Unknown user';

                  return (
                    <div
                      key={candidate.user_id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/70 px-4 py-3"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {fullName}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                          <span>{candidate.email ?? 'No email'}</span>
                          <span>•</span>
                          <span>{formatRole(candidate.role)}</span>
                          {candidate.position ? (
                            <>
                              <span>•</span>
                              <span>{candidate.position}</span>
                            </>
                          ) : null}
                        </div>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void handleGrant(candidate.user_id, fullName)}
                        disabled={grantAccess.isPending}
                        className="bg-slate-900 text-white hover:bg-slate-800"
                      >
                        {grantAccess.isPending ? (
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="mr-1.5 h-4 w-4" />
                        )}
                        Grant access
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <div className="rounded-lg border border-border bg-zinc-50 px-4 py-3 text-xs text-zinc-500 dark:bg-zinc-900/40 dark:text-zinc-400">
            <div className="flex items-start gap-2">
              <Users className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>
                ATS delegates keep their existing employee or intern role outside the ATS. This grant only unlocks the ATS feature set.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AtsAccessManagerButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <UserPlus className="mr-1.5 h-4 w-4" />
        ATS access
      </Button>
      <AtsAccessManagerDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
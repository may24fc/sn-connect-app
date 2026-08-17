'use client';

import { useDirectory } from '@/hooks/useDirectory';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from '@hr-portal/ui';
import { AlertCircle, Loader2, Search, ShieldCheck, ShieldX } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type PlatformOption = {
  id: string;
  name: string;
  code: string;
};

type MarketingAccessGrant = {
  id: string;
  userId: string;
  platformId: string | null;
  platformName: string | null;
  canSubmit: boolean;
  canViewOverview: boolean;
  role: string | null;
  fullName?: string | null;
  email?: string | null;
  position?: string | null;
  departmentName?: string | null;
};

interface MarketingAdSpendAccessManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platforms: PlatformOption[];
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

export function MarketingAdSpendAccessManagerDialog({
  open,
  onOpenChange,
  platforms,
}: MarketingAdSpendAccessManagerDialogProps) {
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedPlatformId, setSelectedPlatformId] = useState<string>('');
  const [isLoadingGrants, setIsLoadingGrants] = useState(false);
  const [grantsError, setGrantsError] = useState<string | null>(null);
  const [grants, setGrants] = useState<MarketingAccessGrant[]>([]);
  const [isGranting, setIsGranting] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  const directoryQuery = useDirectory({
    search,
    roles: ['employee', 'associate'],
    sortBy: 'full_name',
    sortOrder: 'asc',
    page: 1,
    pageSize: 100,
  });

  useEffect(() => {
    if (!open || platforms.length === 0 || selectedPlatformId) {
      return;
    }

    const firstPlatform = platforms[0];
    if (!firstPlatform) {
      return;
    }

    setSelectedPlatformId(firstPlatform.id);
  }, [open, platforms, selectedPlatformId]);

  const refreshGrants = async () => {
    if (!selectedPlatformId) {
      setGrants([]);
      setGrantsError(null);
      return;
    }

    setIsLoadingGrants(true);
    setGrantsError(null);

    try {
      const response = await fetch(`/api/marketing/access-grants?platformId=${selectedPlatformId}`, {
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({ error: 'Failed to load access grants' }));
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to load access grants');
      }
      setGrants(payload.data ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load access grants';
      setGrantsError(message);
      setGrants([]);
    } finally {
      setIsLoadingGrants(false);
    }
  };

  useEffect(() => {
    if (!open) {
      return;
    }
    void refreshGrants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedPlatformId]);

  const grantedUserIds = useMemo(() => new Set(grants.map((grant) => grant.userId)), [grants]);

  const candidates = useMemo(() => {
    return (directoryQuery.data?.data ?? []).filter((entry) => !grantedUserIds.has(entry.user_id));
  }, [directoryQuery.data?.data, grantedUserIds]);

  const isLoading = isLoadingGrants || directoryQuery.isLoading;

  async function handleGrant(userId: string, fullName: string) {
    if (!selectedPlatformId) {
      return;
    }

    setIsGranting(true);
    try {
      const response = await fetch('/api/marketing/access-grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          platformId: selectedPlatformId,
          canSubmit: true,
          canViewOverview: true,
        }),
      });

      const payload = await response.json().catch(() => ({ error: 'Failed to grant access' }));
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to grant access');
      }

      setGrants(payload.data ?? []);
      addToast({
        variant: 'success',
        title: 'Ad spend access granted',
        description: `${fullName} can now access this ad spend platform.`,
      });
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Failed to grant ad spend access',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsGranting(false);
    }
  }

  async function handleRevoke(userId: string, fullName: string) {
    if (!selectedPlatformId) {
      return;
    }

    setIsRevoking(true);
    try {
      const response = await fetch('/api/marketing/access-grants', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          platformId: selectedPlatformId,
        }),
      });

      const payload = await response.json().catch(() => ({ error: 'Failed to revoke access' }));
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to revoke access');
      }

      setGrants(payload.data ?? []);
      addToast({
        variant: 'default',
        title: 'Ad spend access revoked',
        description: `${fullName} no longer has access to this platform.`,
      });
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Failed to revoke ad spend access',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsRevoking(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Manage ad spend access</DialogTitle>
          <DialogDescription>
            Grant employee or associate accounts access to a specific ad spend platform.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(85vh-7rem)] space-y-6 overflow-y-auto pr-1">
          <section className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
              Platform
            </div>
            <Select value={selectedPlatformId} onValueChange={setSelectedPlatformId}>
              <SelectTrigger>
                <SelectValue placeholder="Select ad spend platform" />
              </SelectTrigger>
              <SelectContent>
                {platforms.map((platform) => (
                  <SelectItem key={platform.id} value={platform.id}>
                    {platform.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Current members</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  These users can access the selected ad spend platform.
                </p>
              </div>
              <Badge variant="outline">{grants.length} active</Badge>
            </div>

            {grants.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400">
                No access grants for this platform yet.
              </div>
            ) : (
              <div className="space-y-2">
                {grants.map((grant) => {
                  const fullName = grant.fullName ?? grant.email ?? grant.userId;
                  return (
                    <div
                      key={grant.id}
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
                        disabled={isRevoking}
                      >
                        {isRevoking ? (
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
                Search existing employee and associate accounts, then grant access to the selected platform.
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
            ) : directoryQuery.isError || grantsError ? (
              <div className="flex min-h-32 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-4 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
                <AlertCircle className="mr-2 h-4 w-4" />
                {(directoryQuery.error instanceof Error && directoryQuery.error.message) ||
                  grantsError ||
                  'Failed to load data.'}
              </div>
            ) : candidates.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400">
                No unassigned employee or associate accounts found.
              </div>
            ) : (
              <div className="space-y-2">
                {candidates.map((entry) => {
                  const fullName = entry.full_name || entry.email || 'Unknown user';
                  return (
                    <div
                      key={entry.user_id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/70 px-4 py-3"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {fullName}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                          <span>{entry.email ?? 'No email'}</span>
                          <span>•</span>
                          <span>{formatRole(entry.role)}</span>
                          {entry.department_name ? (
                            <>
                              <span>•</span>
                              <span>{entry.department_name}</span>
                            </>
                          ) : null}
                        </div>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void handleGrant(entry.user_id, fullName)}
                        disabled={isGranting || !selectedPlatformId}
                      >
                        {isGranting ? (
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="mr-1.5 h-4 w-4" />
                        )}
                        Grant
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useDirectory } from '@/hooks/useDirectory';
import { useGrantUhpAccess, useRevokeUhpAccess, useUhpAccessGrants } from '@/hooks/useUhpAccess';
import type { UhpModule } from '@/lib/uhp';
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
import { Loader2, Search, ShieldCheck, ShieldX, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module: UhpModule;
  label: string;
}

export function UhpAccessManagerDialog({ open, onOpenChange, module, label }: Props) {
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const directory = useDirectory({
    search,
    roles: ['employee', 'associate'],
    excludeTerminated: true,
    sortBy: 'full_name',
    sortOrder: 'asc',
    page: 1,
    pageSize: 100,
  });
  const grantsQuery = useUhpAccessGrants(module, open);
  const grantAccess = useGrantUhpAccess(module);
  const revokeAccess = useRevokeUhpAccess(module);
  const grants = grantsQuery.data?.data ?? [];
  const grantedIds = useMemo(() => new Set(grants.map((grant) => grant.userId)), [grants]);
  const candidates = useMemo(
    () => (directory.data?.data ?? []).filter((entry) => !grantedIds.has(entry.user_id)),
    [directory.data?.data, grantedIds]
  );
  const pending = grantAccess.isPending || revokeAccess.isPending;

  async function changeAccess(userId: string, fullName: string, shouldGrant: boolean) {
    try {
      await (shouldGrant ? grantAccess.mutateAsync(userId) : revokeAccess.mutateAsync(userId));
      addToast({
        variant: 'success',
        title: `${label} access ${shouldGrant ? 'granted' : 'revoked'}`,
        description: fullName,
      });
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Could not update UHP access',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage {label} access</DialogTitle>
          <DialogDescription>
            Grant this module to active employees and associates. Admins always have access.
          </DialogDescription>
        </DialogHeader>
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Current members</h3>
            <Badge variant="outline">{grants.length} active</Badge>
          </div>
          {grants.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              No delegated members yet.
            </p>
          ) : (
            grants.map((item) => (
              <div
                key={item.userId}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{item.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.position ?? item.role ?? 'UHP member'}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => void changeAccess(item.userId, item.fullName, false)}
                >
                  <ShieldX className="mr-2 h-4 w-4" /> Revoke
                </Button>
              </div>
            ))
          )}
        </section>
        <section className="mt-5 space-y-3">
          <h3 className="text-sm font-semibold">Grant access</h3>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search employees and associates"
              className="pl-9"
            />
          </div>
          {directory.isLoading || grantsQuery.isLoading ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
              Loading accounts...
            </p>
          ) : candidates.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              No eligible accounts found.
            </p>
          ) : (
            candidates.slice(0, 50).map((item) => {
              const fullName = item.full_name || item.email || 'UHP member';
              return (
                <div
                  key={item.user_id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{fullName}</p>
                    <p className="text-xs text-muted-foreground">{item.position ?? item.role}</p>
                  </div>
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() => void changeAccess(item.user_id, fullName, true)}
                  >
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Grant
                  </Button>
                </div>
              );
            })
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}

export function UhpAccessManagerButton({ module, label }: { module: UhpModule; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <UserPlus className="mr-2 h-4 w-4" />
        Manage access
      </Button>
      <UhpAccessManagerDialog open={open} onOpenChange={setOpen} module={module} label={label} />
    </>
  );
}

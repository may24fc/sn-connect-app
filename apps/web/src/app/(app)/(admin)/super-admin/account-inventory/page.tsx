'use client';

import { AlertTriangle, Clock3, Send, ShieldCheck, UserRoundPlus } from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  PageTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  tableHeaderClassName,
  tableHeadTextClassName,
} from '@hr-portal/ui';

type Account = {
  id: string;
  email: string | null;
  role: string;
  status: string;
  account_kind: 'privileged' | 'reviewer' | 'test' | 'service';
  account_purpose: string | null;
  access_expires_at: string | null;
  created_at: string;
};

type LeadershipAccount = {
  id: string;
  email: string | null;
  role: 'admin' | 'super_admin';
  status: string;
  account_kind: 'workforce' | 'privileged';
  account_purpose: string | null;
};

const workspaceOptions = [
  { id: 'internal', label: 'Internal Management' },
  { id: 'pa', label: 'Personal Assistants' },
  { id: 'sfo', label: 'Seafood Factory Outlet' },
  { id: 'uhp', label: 'Ultimate Health Project' },
  { id: 'property', label: 'Property Development' },
] as const;
type WorkspaceKey = (typeof workspaceOptions)[number]['id'];
type WorkspaceAccessLevel = 'read' | 'write';
type WorkspaceAccount = {
  id: string;
  email: string | null;
  displayName: string | null;
  status: string;
  account_purpose: string | null;
  grants: Array<{ workspace: WorkspaceKey; accessLevel: WorkspaceAccessLevel }>;
};

export default function AccountInventoryPage() {
  const [accounts, setAccounts] = useState<Array<Account>>([]);
  const [leadershipAccounts, setLeadershipAccounts] = useState<Array<LeadershipAccount>>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [invite, setInvite] = useState({ email: '', displayName: '', purpose: '' });
  const [sending, setSending] = useState(false);
  const [classification, setClassification] = useState({
    userId: '',
    accountKind: 'workforce' as 'workforce' | 'privileged',
    purpose: '',
  });
  const [savingClassification, setSavingClassification] = useState(false);
  const [workspaceAccounts, setWorkspaceAccounts] = useState<Array<WorkspaceAccount>>([]);
  const [workspaceInvite, setWorkspaceInvite] = useState({
    displayName: '',
    email: '',
    purpose: '',
    grants: {} as Partial<Record<WorkspaceKey, WorkspaceAccessLevel>>,
  });
  const [sendingWorkspaceInvite, setSendingWorkspaceInvite] = useState(false);
  const [workspaceCredentials, setWorkspaceCredentials] = useState<{
    email: string;
    temporaryPassword: string;
    emailSent: boolean;
  } | null>(null);
  const [credentialsCopied, setCredentialsCopied] = useState(false);

  const loadAccounts = useCallback(async () => {
    const [response, workspaceResponse] = await Promise.all([
      fetch('/api/account-inventory', { cache: 'no-store' }),
      fetch('/api/account-inventory/workspace-accounts', { cache: 'no-store' }),
    ]);
    if (response.ok) {
      const body = await response.json();
      setAccounts(body.data);
      setLeadershipAccounts(body.leadershipAccounts ?? []);
    }
    else setMessage('Account inventory could not be loaded.');
    if (workspaceResponse.ok) {
      const body = await workspaceResponse.json();
      setWorkspaceAccounts(body.data ?? []);
    } else {
      setMessage('Workspace accounts could not be loaded.');
    }
    setLoading(false);
  }, []);

  function selectLeadershipAccount(userId: string) {
    const account = leadershipAccounts.find((candidate) => candidate.id === userId);
    setClassification({
      userId,
      accountKind: account?.account_kind ?? 'workforce',
      purpose: account?.account_purpose ?? '',
    });
  }

  async function saveClassification(event: FormEvent) {
    event.preventDefault();
    setSavingClassification(true);
    setMessage(null);
    const response = await fetch('/api/account-inventory', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(classification),
    });
    const body = await response.json();
    if (response.ok) {
      setMessage('Account classification updated. Workforce-derived screens will update immediately.');
      setClassification({ userId: '', accountKind: 'workforce', purpose: '' });
      await loadAccounts();
    } else {
      setMessage(body.error ?? 'Account classification could not be updated.');
    }
    setSavingClassification(false);
  }

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  async function submitInvite(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setMessage(null);
    const response = await fetch('/api/review/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invite),
    });
    const body = await response.json();
    if (response.ok) {
      setMessage(
        `Review invitation created. Access expires ${new Date(body.data.expiresAt).toLocaleString()}.`
      );
      setInvite({ email: '', displayName: '', purpose: '' });
      await loadAccounts();
    } else {
      setMessage(body.error ?? 'Invitation could not be created.');
    }
    setSending(false);
  }

  function toggleWorkspace(workspace: WorkspaceKey, checked: boolean) {
    setWorkspaceInvite((value) => {
      const grants = { ...value.grants };
      if (checked) grants[workspace] = grants[workspace] ?? 'read';
      else delete grants[workspace];
      return { ...value, grants };
    });
  }

  async function submitWorkspaceInvite(event: FormEvent) {
    event.preventDefault();
    const grants = Object.entries(workspaceInvite.grants).map(([workspace, accessLevel]) => ({
      workspace,
      accessLevel,
    }));
    if (grants.length === 0) {
      setMessage('Choose at least one workspace.');
      return;
    }
    setSendingWorkspaceInvite(true);
    setMessage(null);
    const response = await fetch('/api/account-inventory/workspace-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: workspaceInvite.displayName,
        email: workspaceInvite.email,
        purpose: workspaceInvite.purpose,
        grants,
      }),
    });
    const body = await response.json();
    if (response.ok) {
      setWorkspaceCredentials({
        email: body.data.email,
        temporaryPassword: body.data.temporaryPassword,
        emailSent: body.data.emailSent,
      });
      setCredentialsCopied(false);
      setMessage(
        body.data.emailSent
          ? 'Workspace-only invitation sent by email. Credentials are also available once below.'
          : 'Workspace account created, but the email could not be sent. Share the credentials below securely.'
      );
      setWorkspaceInvite({ displayName: '', email: '', purpose: '', grants: {} });
      await loadAccounts();
    } else {
      setMessage(body.error ?? 'Workspace account could not be created.');
    }
    setSendingWorkspaceInvite(false);
  }

  async function copyWorkspaceCredentials() {
    if (!workspaceCredentials) return;
    await navigator.clipboard.writeText(
      `Control Hub login: ${window.location.origin}/login\nEmail: ${workspaceCredentials.email}\nTemporary password: ${workspaceCredentials.temporaryPassword}`
    );
    setCredentialsCopied(true);
  }

  async function revokeWorkspaceAccount(userId: string) {
    setMessage(null);
    const response = await fetch('/api/account-inventory/workspace-accounts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const body = await response.json();
    if (response.ok) {
      setMessage('Workspace access revoked.');
      await loadAccounts();
    } else {
      setMessage(body.error ?? 'Workspace access could not be revoked.');
    }
  }

  return (
    <div className="space-y-6 p-6">
      <header>
        <PageTitle>Account Inventory</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Workspace-only, privileged, reviewer, test, and service identities are managed here and
          never appear as employees.
        </p>
      </header>

      {message ? (
        <output className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
          {message}
        </output>
      ) : null}

      <Dialog
        open={Boolean(workspaceCredentials)}
        onOpenChange={(open) => {
          if (!open) {
            setWorkspaceCredentials(null);
            setCredentialsCopied(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Workspace account created</DialogTitle>
            <DialogDescription>
              {workspaceCredentials?.emailSent
                ? 'The invitation email was sent. You can also copy these credentials and provide them directly.'
                : 'The invitation email was not sent. Copy these credentials and provide them securely.'}
            </DialogDescription>
          </DialogHeader>
          {workspaceCredentials ? (
            <div className="space-y-4">
              <div className="rounded-lg border bg-slate-50 p-4 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</p>
                <p className="mt-1 break-all font-medium">{workspaceCredentials.email}</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Temporary password
                </p>
                <code className="mt-1 block break-all rounded bg-white px-3 py-2 text-base font-semibold">
                  {workspaceCredentials.temporaryPassword}
                </code>
              </div>
              <p className="text-xs text-amber-700">
                This password is shown only once in Account Inventory. The user should change it
                after signing in.
              </p>
            </div>
          ) : null}
          <DialogFooter>
            <button
              type="button"
              onClick={() => void copyWorkspaceCredentials()}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
            >
              {credentialsCopied ? 'Credentials copied' : 'Copy credentials'}
            </button>
            <button
              type="button"
              onClick={() => setWorkspaceCredentials(null)}
              className="rounded-lg bg-teal-800 px-4 py-2 text-sm font-semibold text-white"
            >
              Done
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <UserRoundPlus className="mt-1 h-6 w-6 text-teal-700" />
          <div>
            <h2 className="text-xl font-semibold">Invite a workspace-only user</h2>
            <p className="text-sm text-slate-600">
              Grants production access only to the selected workspaces. This does not create an
              employee profile or start onboarding.
            </p>
          </div>
        </div>
        <form onSubmit={submitWorkspaceInvite} className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium">
            Name
            <input
              aria-label="Workspace user name"
              required
              minLength={2}
              maxLength={120}
              value={workspaceInvite.displayName}
              onChange={(event) =>
                setWorkspaceInvite((value) => ({ ...value, displayName: event.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium">
            Email
            <input
              aria-label="Workspace user email"
              required
              type="email"
              value={workspaceInvite.email}
              onChange={(event) =>
                setWorkspaceInvite((value) => ({ ...value, email: event.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium md:col-span-2">
            Access purpose
            <textarea
              aria-label="Workspace access purpose"
              required
              minLength={10}
              maxLength={500}
              rows={2}
              value={workspaceInvite.purpose}
              onChange={(event) =>
                setWorkspaceInvite((value) => ({ ...value, purpose: event.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <fieldset className="space-y-3 md:col-span-2">
            <legend className="text-sm font-semibold">Workspace access</legend>
            <p className="text-xs text-slate-600">
              Read-only permits viewing and exports. Write additionally permits creating, editing,
              importing, and deleting workspace data.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {workspaceOptions.map((workspace) => {
                const accessLevel = workspaceInvite.grants[workspace.id];
                return (
                  <div key={workspace.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <label className="flex flex-1 items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={Boolean(accessLevel)}
                        onChange={(event) => toggleWorkspace(workspace.id, event.target.checked)}
                      />
                      {workspace.label}
                    </label>
                    <select
                      aria-label={`${workspace.label} permission`}
                      disabled={!accessLevel}
                      value={accessLevel ?? 'read'}
                      onChange={(event) =>
                        setWorkspaceInvite((value) => ({
                          ...value,
                          grants: {
                            ...value.grants,
                            [workspace.id]: event.target.value as WorkspaceAccessLevel,
                          },
                        }))
                      }
                      className="rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:opacity-50"
                    >
                      <option value="read">Read-only</option>
                      <option value="write">Can write</option>
                    </select>
                  </div>
                );
              })}
            </div>
          </fieldset>
          <div className="flex justify-end md:col-span-2">
            <button
              type="submit"
              disabled={sendingWorkspaceInvite}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {sendingWorkspaceInvite ? 'Creating…' : 'Send workspace invitation'}
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-xl font-semibold">Workspace-only accounts</h2>
          <p className="text-sm text-slate-600">
            These identities are excluded from employee information and onboarding.
          </p>
        </div>
        {workspaceAccounts.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No workspace-only accounts.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className={`${tableHeaderClassName} ${tableHeadTextClassName}`}>
                <tr>
                  <th className="px-5 py-3">Account</th>
                  <th className="px-5 py-3">Purpose</th>
                  <th className="px-5 py-3">Workspace permissions</th>
                  <th className="px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workspaceAccounts.map((account) => (
                  <tr key={account.id}>
                    <td className="px-5 py-4">
                      <p className="font-medium">{account.displayName ?? account.email ?? account.id}</p>
                      <p className="text-xs text-slate-500">{account.email}</p>
                    </td>
                    <td className="max-w-xs px-5 py-4 text-slate-600">
                      {account.account_purpose}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        {account.grants.map((grant) => (
                          <span key={grant.workspace} className="rounded-full bg-slate-100 px-2 py-1 text-xs">
                            {workspaceOptions.find((item) => item.id === grant.workspace)?.label ?? grant.workspace}
                            {' · '}{grant.accessLevel === 'write' ? 'Can write' : 'Read-only'}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => void revokeWorkspaceAccount(account.id)}
                        className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 h-6 w-6 text-teal-700" />
          <div>
            <h2 className="text-xl font-semibold">Classify a leadership account</h2>
            <p className="text-sm text-slate-600">
              Authorization stays unchanged. A privileged non-workforce account keeps its admin
              access but is removed from official people and performance populations.
            </p>
          </div>
        </div>
        <form onSubmit={saveClassification} className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium">
            Leadership account
            <Select value={classification.userId} required onValueChange={(value) => selectLeadershipAccount(value)}>
              <SelectTrigger aria-label="Leadership account" className="mt-1 w-full">
                <SelectValue placeholder="Select an account" />
              </SelectTrigger>
              <SelectContent>
                {leadershipAccounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.email ?? account.id} · {account.role.replace('_', ' ')}
                </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="text-sm font-medium">
            Population
            <Select
              value={classification.accountKind}
              onValueChange={(next) =>
                setClassification((value) => ({
                  ...value,
                  accountKind: next === 'privileged' ? 'privileged' : 'workforce',
                }))
              }
            >
              <SelectTrigger aria-label="Population" className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="workforce">Workforce leader</SelectItem>
                <SelectItem value="privileged">Privileged non-workforce account</SelectItem>
              </SelectContent>
            </Select>
          </label>
          {classification.accountKind === 'privileged' ? (
            <label className="text-sm font-medium md:col-span-2">
              Account purpose
              <textarea
                required
                minLength={10}
                maxLength={500}
                rows={3}
                value={classification.purpose}
                onChange={(event) =>
                  setClassification((value) => ({ ...value, purpose: event.target.value }))
                }
                placeholder="Why does this account need privileged production access?"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
          ) : null}
          <p className="text-xs text-slate-600 md:col-span-2">
            This does not change the account’s role or permissions. Classification changes are
            recorded in the audit log.
          </p>
          <div className="flex justify-end md:col-span-2">
            <button
              type="submit"
              disabled={savingClassification || !classification.userId}
              className="rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {savingClassification ? 'Saving…' : 'Save classification'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 h-6 w-6 text-teal-700" />
          <div>
            <h2 className="text-xl font-semibold">Invite a product reviewer</h2>
            <p className="text-sm text-slate-600">
              Available only in the isolated Review environment. Invitations expire automatically
              after seven days.
            </p>
          </div>
        </div>
        <form onSubmit={submitInvite} className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium">
            Name
            <input
              required
              minLength={2}
              maxLength={120}
              value={invite.displayName}
              onChange={(event) =>
                setInvite((value) => ({ ...value, displayName: event.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium">
            Designated email
            <input
              required
              type="email"
              value={invite.email}
              onChange={(event) => setInvite((value) => ({ ...value, email: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium md:col-span-2">
            Review purpose
            <textarea
              required
              minLength={10}
              maxLength={500}
              rows={3}
              value={invite.purpose}
              onChange={(event) =>
                setInvite((value) => ({ ...value, purpose: event.target.value }))
              }
              placeholder="What should this reviewer explore and evaluate?"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={sending}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {sending ? 'Creating…' : 'Send seven-day invitation'}
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-xl font-semibold">Non-workforce accounts</h2>
          <p className="text-sm text-slate-600">
            These identities are intentionally excluded from Directory, OKRs/KPIs, headcount, and
            people selectors.
          </p>
        </div>
        {loading ? (
          <p className="p-5 text-sm text-slate-500">Loading inventory…</p>
        ) : accounts.length === 0 ? (
          <div className="p-8 text-center">
            <AlertTriangle className="mx-auto h-7 w-7 text-slate-400" />
            <p className="mt-2 font-medium">No non-workforce accounts</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className={`${tableHeaderClassName} ${tableHeadTextClassName}`}>
                <tr>
                  <th className="px-5 py-3">Account</th>
                  <th className="px-5 py-3">Kind</th>
                  <th className="px-5 py-3">Purpose</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Expiry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td className="px-5 py-4 font-medium">{account.email ?? account.id}</td>
                    <td className="px-5 py-4 capitalize">{account.account_kind}</td>
                    <td className="max-w-md px-5 py-4 text-slate-600">
                      {account.account_purpose ?? 'Not recorded'}
                    </td>
                    <td className="px-5 py-4 capitalize">{account.status}</td>
                    <td className="px-5 py-4 text-slate-600">
                      {account.access_expires_at ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-4 w-4" />
                          {new Date(account.access_expires_at).toLocaleString()}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

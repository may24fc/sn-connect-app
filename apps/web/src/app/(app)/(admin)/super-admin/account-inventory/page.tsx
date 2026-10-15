'use client';

import { AlertTriangle, Clock3, Send, ShieldCheck } from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useState } from 'react';

type Account = {
  id: string;
  email: string | null;
  role: string;
  status: string;
  account_kind: 'reviewer' | 'test' | 'service';
  account_purpose: string | null;
  access_expires_at: string | null;
  created_at: string;
};

export default function AccountInventoryPage() {
  const [accounts, setAccounts] = useState<Array<Account>>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [invite, setInvite] = useState({ email: '', displayName: '', purpose: '' });
  const [sending, setSending] = useState(false);

  const loadAccounts = useCallback(async () => {
    const response = await fetch('/api/account-inventory', { cache: 'no-store' });
    if (response.ok) setAccounts((await response.json()).data);
    else setMessage('Account inventory could not be loaded.');
    setLoading(false);
  }, []);

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

  return (
    <div className="space-y-6 p-6">
      <header>
        <p className="text-sm font-semibold text-teal-700">Identity governance</p>
        <h1 className="text-3xl font-semibold tracking-tight">Account Inventory</h1>
        <p className="mt-2 text-slate-600">
          Reviewer, test, and service identities are managed here and never appear as employees.
        </p>
      </header>

      {message ? (
        <output className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
          {message}
        </output>
      ) : null}

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
              <thead className="bg-slate-50 text-slate-600">
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

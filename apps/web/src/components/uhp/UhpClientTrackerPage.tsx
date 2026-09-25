'use client';

import { UHP_CLIENT_STATUS_VALUES, UHP_CLIENT_TYPE_VALUES } from '@/lib/uhp';
import { Button, Card, CardContent, Input, Label, useToast } from '@hr-portal/ui';
import { Loader2, Plus, RefreshCw, Search } from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { UhpAccessManagerButton } from './UhpAccessManagerDialog';
import { UhpClientDetailDialog } from './UhpClientDetailDialog';
import { UhpWorkspaceHeader } from './UhpWorkspaceHeader';

type Client = {
  id: string;
  name: string;
  client_type: string | null;
  status: string;
  interest_state: string;
  lead_owner: string | null;
  email: string | null;
  phone: string | null;
  migration_review_required: boolean;
  updated_at: string;
};

type Metrics = {
  outreachAttempts: number;
  replies: number;
  responseRate: number;
  interested: number;
  declined: number;
  wellnessEvaluationsScheduled: number;
  callsScheduled: number;
};

const emptyMetrics: Metrics = {
  outreachAttempts: 0,
  replies: 0,
  responseRate: 0,
  interested: 0,
  declined: 0,
  wellnessEvaluationsScheduled: 0,
  callsScheduled: 0,
};

export function UhpClientTrackerPage({ isAdmin = false }: { isAdmin?: boolean }) {
  const { addToast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [metrics, setMetrics] = useState<Metrics>(emptyMetrics);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [clientsResponse, metricsResponse] = await Promise.all([
        fetch(`/api/uhp/clients?search=${encodeURIComponent(search)}`),
        fetch('/api/uhp/clients/metrics'),
      ]);
      const clientsPayload = await clientsResponse.json();
      const metricsPayload = await metricsResponse.json();
      if (!clientsResponse.ok || !metricsResponse.ok) {
        throw new Error(
          clientsPayload.error ?? metricsPayload.error ?? 'Failed to load client tracker'
        );
      }
      setClients(clientsPayload.data);
      setMetrics(metricsPayload.data);
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Could not load the client tracker',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }, [addToast, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function createClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name'));
    const clientType = String(form.get('clientType'));
    const leadOwner = String(form.get('leadOwner') || '') || null;
    const email = String(form.get('email') || '') || null;
    const phone = String(form.get('phone') || '') || null;
    const optimisticClient: Client = {
      id: `optimistic-client-${crypto.randomUUID()}`,
      name,
      client_type: clientType,
      status: 'Prospect',
      interest_state: 'unknown',
      lead_owner: leadOwner,
      email,
      phone,
      migration_review_required: false,
      updated_at: new Date().toISOString(),
    };
    const previousClients = clients;
    setSaving(true);
    setClients((current) => [optimisticClient, ...current]);
    try {
      const response = await fetch('/api/uhp/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          clientType,
          status: 'Prospect',
          leadOwner: leadOwner || undefined,
          email: email || undefined,
          phone: phone || undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Failed to create client');
      setShowForm(false);
      event.currentTarget.reset();
      await load();
      addToast({ variant: 'success', title: 'Client added to UHP' });
    } catch (error) {
      setClients(previousClients);
      addToast({
        variant: 'error',
        title: 'Could not add client',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setSaving(false);
    }
  }

  const metricCards = [
    ['Outreach attempts', metrics.outreachAttempts],
    ['Replies', metrics.replies],
    ['Response rate', `${metrics.responseRate}%`],
    ['Interested / declined', `${metrics.interested} / ${metrics.declined}`],
    ['Wellness evaluations', metrics.wellnessEvaluationsScheduled],
    ['Calls scheduled', metrics.callsScheduled],
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <UhpWorkspaceHeader
        title="Client Tracker"
        description="The UHP source of truth for prospects, communication activity, outcomes, and scheduled appointments. Metrics show the current month."
        actions={
          <div className="flex gap-2">
            {isAdmin && <UhpAccessManagerButton module="client_tracker" label="Client Tracker" />}
            <Button onClick={() => setShowForm((value) => !value)}>
              <Plus className="mr-2 h-4 w-4" /> Add client
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {metricCards.map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-5">
            <form className="grid gap-4 md:grid-cols-3" onSubmit={createClient}>
              <div className="space-y-1">
                <Label htmlFor="uhp-name">Name</Label>
                <Input id="uhp-name" name="name" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="uhp-type">Client type</Label>
                <select
                  id="uhp-type"
                  name="clientType"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  required
                >
                  {UHP_CLIENT_TYPE_VALUES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="uhp-owner">Lead owner</Label>
                <Input id="uhp-owner" name="leadOwner" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="uhp-email">Email</Label>
                <Input id="uhp-email" name="email" type="email" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="uhp-phone">Phone</Label>
                <Input id="uhp-phone" name="phone" />
              </div>
              <div className="flex items-end gap-2">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-3 border-b p-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              aria-label="Search clients"
              placeholder="Search name, email, or phone"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="max-w-md"
            />
            <Button variant="ghost" size="sm" onClick={() => void load()} aria-label="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                      Loading clients...
                    </td>
                  </tr>
                ) : clients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No UHP clients match this view.
                    </td>
                  </tr>
                ) : (
                  clients.map((client) => (
                    <tr
                      key={client.id}
                      className="cursor-pointer border-b last:border-0 hover:bg-muted/30"
                      tabIndex={0}
                      onClick={() => setSelectedClientId(client.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedClientId(client.id);
                        }
                      }}
                    >
                      <td className="px-4 py-3 font-medium">
                        {client.name}
                        {client.migration_review_required && (
                          <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                            Review
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">{client.client_type ?? 'Unassigned'}</td>
                      <td className="px-4 py-3">
                        {UHP_CLIENT_STATUS_VALUES.includes(
                          client.status as (typeof UHP_CLIENT_STATUS_VALUES)[number]
                        )
                          ? client.status
                          : 'Unknown'}
                      </td>
                      <td className="px-4 py-3">{client.lead_owner ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {client.email ?? client.phone ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(client.updated_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <UhpClientDetailDialog
        clientId={selectedClientId}
        open={Boolean(selectedClientId)}
        onOpenChange={(open) => {
          if (!open) setSelectedClientId(null);
        }}
        onChanged={() => void load()}
      />
    </div>
  );
}

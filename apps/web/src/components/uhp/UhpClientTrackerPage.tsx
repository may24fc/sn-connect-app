'use client';

import { ConfirmActionDialog } from '@/components/ConfirmActionDialog';
import { UHP_CLIENT_STATUS_VALUES, UHP_CLIENT_TYPE_VALUES, type UhpClientContact } from '@/lib/uhp';
import {
  extractUhpContact,
  imageFromClipboard,
  uploadUhpScreenshot,
  validateUhpScreenshot,
} from '@/lib/uhp-screenshots';
import { Button, Card, CardContent, Checkbox, Input, Label, useToast } from '@hr-portal/ui';
import { AlertTriangle, ImageUp, Loader2, Plus, RefreshCw, Search } from 'lucide-react';
import {
  type ClipboardEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { UhpAccessManagerButton } from './UhpAccessManagerDialog';
import { UhpClientDetailDialog } from './UhpClientDetailDialog';
import { UhpWorkspaceHeader } from './UhpWorkspaceHeader';

type Client = {
  id: string;
  name: string;
  client_type: string | null;
  status: string;
  interest_state: string;
  replied: boolean;
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

type MetricsPeriod = 'week' | 'month' | 'quarter';

const PERIOD_LABELS: Record<MetricsPeriod, string> = {
  week: 'This week',
  month: 'This month',
  quarter: 'This quarter',
};

function getPeriodStart(period: MetricsPeriod, now = new Date()): Date {
  if (period === 'week') {
    const daysSinceMonday = (now.getDay() + 6) % 7;
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday);
  }
  if (period === 'quarter') {
    return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  }
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

type CreateClientPayload = {
  name: string;
  clientType: string;
  status: 'Prospect';
  leadOwner?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  logInitialOutreach: boolean;
  outreachChannel?: string | undefined;
  allowDuplicate?: boolean;
};

export function UhpClientTrackerPage({ isAdmin = false }: { isAdmin?: boolean }) {
  const { addToast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [metrics, setMetrics] = useState<Metrics>(emptyMetrics);
  const [period, setPeriod] = useState<MetricsPeriod>('month');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [duplicateCheck, setDuplicateCheck] = useState<{
    payload: CreateClientPayload;
    matches: Array<UhpClientContact>;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const from = getPeriodStart(period).toISOString();
      const [clientsResponse, metricsResponse] = await Promise.all([
        fetch(`/api/uhp/clients?search=${encodeURIComponent(search)}`),
        fetch(`/api/uhp/clients/metrics?from=${encodeURIComponent(from)}`),
      ]);
      const clientsPayload = await clientsResponse.json();
      const metricsPayload = await metricsResponse.json();
      if (!clientsResponse.ok || !metricsResponse.ok) {
        throw new Error(
          clientsPayload.error ?? metricsPayload.error ?? 'Failed to load outreach tracker'
        );
      }
      setClients(clientsPayload.data);
      setMetrics(metricsPayload.data);
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Could not load the outreach tracker',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }, [addToast, search, period]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  function closeForm() {
    setShowForm(false);
    setDuplicateCheck(null);
    setScreenshot(null);
  }

  function fillField(name: string, value: string | null) {
    const field = formRef.current?.elements.namedItem(name);
    if (value && field instanceof HTMLInputElement) field.value = value;
  }

  async function handleScreenshot(file: File | null) {
    if (!file) return;
    const invalid = validateUhpScreenshot(file);
    if (invalid) {
      addToast({ variant: 'error', title: 'Screenshot not added', description: invalid });
      return;
    }
    setScreenshot(file);
    setExtracting(true);
    try {
      const contact = await extractUhpContact(file);
      fillField('name', contact.name);
      fillField('phone', contact.phone);
      fillField('email', contact.email);
      fillField('outreachChannel', contact.channel);
      addToast({
        variant: contact.name || contact.phone ? 'success' : 'warning',
        title: contact.name || contact.phone ? 'Details read from screenshot' : 'No details found',
        description: 'Check the name and number before saving.',
      });
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Could not read the screenshot',
        description: error instanceof Error ? error.message : 'Enter the details manually.',
      });
    } finally {
      setExtracting(false);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLFormElement>) {
    const file = imageFromClipboard(event);
    if (!file) return;
    event.preventDefault();
    void handleScreenshot(file);
  }

  function createClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? '').trim() || undefined;
    void submitClient({
      name: String(form.get('name')).trim(),
      clientType: String(form.get('clientType')),
      status: 'Prospect',
      leadOwner: text('leadOwner'),
      email: text('email'),
      phone: text('phone'),
      logInitialOutreach: form.get('logInitialOutreach') === 'on',
      outreachChannel: text('outreachChannel'),
    });
  }

  async function submitClient(payload: CreateClientPayload) {
    const optimisticClient: Client = {
      id: `optimistic-client-${crypto.randomUUID()}`,
      name: payload.name,
      client_type: payload.clientType,
      status: 'Prospect',
      interest_state: 'unknown',
      replied: false,
      lead_owner: payload.leadOwner ?? null,
      email: payload.email ?? null,
      phone: payload.phone ?? null,
      migration_review_required: false,
      updated_at: new Date().toISOString(),
    };
    const previousClients = clients;
    setSaving(true);
    setDuplicateCheck(null);
    setClients((current) => [optimisticClient, ...current]);
    try {
      const response = await fetch('/api/uhp/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (response.status === 409 && Array.isArray(result.duplicates)) {
        setClients(previousClients);
        setDuplicateCheck({ payload, matches: result.duplicates });
        return;
      }
      if (!response.ok) throw new Error(result.error ?? 'Failed to create client');
      const attachedScreenshot = screenshot;
      // Read the form through a ref: React nulls event.currentTarget once the handler awaits.
      formRef.current?.reset();
      closeForm();
      if (attachedScreenshot && result.data?.id) {
        await uploadUhpScreenshot(result.data.id, attachedScreenshot).catch(() =>
          addToast({
            variant: 'warning',
            title: 'Client added, screenshot not saved',
            description: 'Open the client and attach it to a communication.',
          })
        );
      }
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

  // Optimistic: a single-field toggle on the row being viewed. Not reloaded afterwards,
  // since the list is ordered by updated_at and the row would jump while being clicked.
  async function toggleReplied(clientId: string, replied: boolean) {
    const setReplied = (value: boolean) =>
      setClients((current) =>
        current.map((client) => (client.id === clientId ? { ...client, replied: value } : client))
      );
    setReplied(replied);
    try {
      const response = await fetch(`/api/uhp/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replied }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error ?? 'Failed to update client');
      }
    } catch (error) {
      setReplied(!replied);
      addToast({
        variant: 'error',
        title: 'Could not update Replied',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  }

  async function deleteClient() {
    if (!deleteTarget) return;
    const previousClients = clients;
    setDeleting(true);
    setClients((current) => current.filter((client) => client.id !== deleteTarget.id));
    try {
      const response = await fetch(`/api/uhp/clients/${deleteTarget.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Failed to delete client');
      addToast({ variant: 'success', title: 'Client deleted', description: deleteTarget.name });
      setDeleteTarget(null);
    } catch (error) {
      setClients(previousClients);
      addToast({
        variant: 'error',
        title: 'Could not delete client',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setDeleting(false);
      void load();
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
        title="Outreach Tracker"
        description="The UHP source of truth for prospects, communication activity, outcomes, and scheduled appointments."
        actions={
          <div className="flex gap-2">
            {isAdmin && <UhpAccessManagerButton module="client_tracker" label="Outreach Tracker" />}
            <Button onClick={() => (showForm ? closeForm() : setShowForm(true))}>
              <Plus className="mr-2 h-4 w-4" /> Add client
            </Button>
          </div>
        }
      />

      <div className="flex items-center gap-2">
        <Label htmlFor="uhp-metrics-period" className="text-sm text-muted-foreground">
          Metrics period
        </Label>
        <select
          id="uhp-metrics-period"
          value={period}
          onChange={(event) => setPeriod(event.target.value as MetricsPeriod)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          {(Object.keys(PERIOD_LABELS) as Array<MetricsPeriod>).map((value) => (
            <option key={value} value={value}>
              {PERIOD_LABELS[value]}
            </option>
          ))}
        </select>
      </div>

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
            <form
              ref={formRef}
              className="grid gap-4 md:grid-cols-3"
              onSubmit={createClient}
              onPaste={handlePaste}
            >
              <div className="space-y-1 md:col-span-3">
                <Label htmlFor="uhp-screenshot">Conversation screenshot (optional)</Label>
                <div className="flex flex-wrap items-center gap-3">
                  <Input
                    id="uhp-screenshot"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="max-w-sm"
                    disabled={extracting}
                    onChange={(event) => {
                      void handleScreenshot(event.target.files?.[0] ?? null);
                      event.target.value = '';
                    }}
                  />
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    {extracting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Reading name and number...
                      </>
                    ) : screenshot ? (
                      <>
                        <ImageUp className="h-4 w-4" /> {screenshot.name} will be attached
                      </>
                    ) : (
                      'Upload or paste (Ctrl+V) a chat screenshot to fill in the name and number.'
                    )}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="uhp-name">Name</Label>
                <Input id="uhp-name" name="name" maxLength={300} required />
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
                <Input id="uhp-owner" name="leadOwner" maxLength={300} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="uhp-email">Email</Label>
                <Input id="uhp-email" name="email" type="email" maxLength={320} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="uhp-phone">Phone</Label>
                <Input id="uhp-phone" name="phone" maxLength={30} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="uhp-outreach-channel">Outreach channel</Label>
                <Input
                  id="uhp-outreach-channel"
                  name="outreachChannel"
                  maxLength={300}
                  placeholder="Telegram, phone, email..."
                />
              </div>
              <div className="flex items-center gap-2 md:col-span-3">
                <Checkbox id="uhp-log-outreach" name="logInitialOutreach" defaultChecked />
                <Label htmlFor="uhp-log-outreach">
                  I've already reached out (counts as an outreach attempt)
                </Label>
              </div>
              {duplicateCheck && (
                <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 md:col-span-3">
                  <p className="flex items-center gap-2 font-medium">
                    <AlertTriangle className="h-4 w-4" />A client with the same details is already
                    on file
                  </p>
                  <ul className="space-y-1">
                    {duplicateCheck.matches.map((match) => (
                      <li key={match.id} className="flex items-center justify-between gap-2">
                        <span>
                          {match.name}
                          {match.phone || match.email ? ` · ${match.phone ?? match.email}` : ''}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedClientId(match.id)}
                        >
                          Open existing
                        </Button>
                      </li>
                    ))}
                  </ul>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={saving}
                    onClick={() =>
                      void submitClient({ ...duplicateCheck.payload, allowDuplicate: true })
                    }
                  >
                    Add anyway
                  </Button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <Button type="submit" disabled={saving || extracting}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save
                </Button>
                <Button type="button" variant="outline" onClick={closeForm}>
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
            maxLength={200}
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
                  <th className="px-4 py-3">Replied</th>
                  <th className="px-4 py-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                      Loading clients...
                    </td>
                  </tr>
                ) : clients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
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
                      <td
                        className="px-4 py-3"
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        <Checkbox
                          aria-label={`Replied: ${client.name}`}
                          checked={client.replied}
                          disabled={client.id.startsWith('optimistic-client-')}
                          onCheckedChange={(checked) =>
                            void toggleReplied(client.id, checked === true)
                          }
                        />
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
        onDelete={(client) => {
          setSelectedClientId(null);
          setDeleteTarget(client);
        }}
      />
      <ConfirmActionDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete client?"
        description={`${deleteTarget?.name ?? 'This client'} and their activity will be removed from the Outreach Tracker.`}
        confirmLabel="Delete client"
        isPending={deleting}
        onConfirm={() => void deleteClient()}
      />
    </div>
  );
}

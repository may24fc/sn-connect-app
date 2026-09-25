'use client';

import { queryKeys } from '@/lib/query-keys';
import { UHP_ACTIVITY_TYPE_VALUES, UHP_CLIENT_STATUS_VALUES } from '@/lib/uhp';
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
  useToast,
} from '@hr-portal/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, MessageSquarePlus, NotebookPen } from 'lucide-react';
import { type FormEvent, useState } from 'react';

type ClientDetail = {
  client: {
    id: string;
    name: string;
    status: string;
    interest_state: string;
    email: string | null;
    phone: string | null;
  };
  activities: Array<{
    id: string;
    title: string;
    notes: string | null;
    activity_type: string;
    occurred_at: string;
    direction: string | null;
    reply_received: boolean;
    prospect_outcome: string | null;
    appointment_type: string | null;
  }>;
  notes: Array<{ id: string; title: string; body: string | null; created_at: string }>;
};

async function json<T>(response: Response): Promise<T> {
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? 'Request failed');
  return payload;
}

export function UhpClientDetailDialog({
  clientId,
  open,
  onOpenChange,
  onChanged,
}: {
  clientId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [activityOpen, setActivityOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const key = queryKeys.uhp.client(clientId ?? 'none');
  const detail = useQuery({
    queryKey: key,
    enabled: open && Boolean(clientId),
    queryFn: async () => json<{ data: ClientDetail }>(await fetch(`/api/uhp/clients/${clientId}`)),
  });

  const updateClient = useMutation({
    mutationFn: async (updates: Record<string, unknown>) =>
      json<{ data: ClientDetail['client'] }>(
        await fetch(`/api/uhp/clients/${clientId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })
      ),
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<{ data: ClientDetail }>(key);
      queryClient.setQueryData<{ data: ClientDetail }>(key, (current) =>
        current
          ? {
              data: {
                ...current.data,
                client: {
                  ...current.data.client,
                  status: String(updates.status ?? current.data.client.status),
                  interest_state: String(
                    updates.interestState ?? current.data.client.interest_state
                  ),
                },
              },
            }
          : current
      );
      return { previous };
    },
    onError: (error, _updates, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      addToast({
        variant: 'error',
        title: 'Could not update client',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    },
    onSuccess: ({ data }) => {
      queryClient.setQueryData<{ data: ClientDetail }>(key, (current) =>
        current ? { data: { ...current.data, client: data } } : current
      );
      onChanged();
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: queryKeys.uhp.clientMetrics() });
    },
  });

  const addActivity = useMutation({
    mutationFn: async (input: Record<string, unknown>) =>
      json<{ data: ClientDetail['activities'][number] }>(
        await fetch(`/api/uhp/clients/${clientId}/activities`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        })
      ),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<{ data: ClientDetail }>(key);
      const optimistic = {
        id: `optimistic-activity-${crypto.randomUUID()}`,
        title: String(input.title),
        notes: input.notes ? String(input.notes) : null,
        activity_type: String(input.activityType),
        occurred_at: new Date().toISOString(),
        direction: input.direction ? String(input.direction) : null,
        reply_received: Boolean(input.replyReceived),
        prospect_outcome: input.prospectOutcome ? String(input.prospectOutcome) : null,
        appointment_type: input.appointmentType ? String(input.appointmentType) : null,
      };
      queryClient.setQueryData<{ data: ClientDetail }>(key, (current) =>
        current
          ? { data: { ...current.data, activities: [optimistic, ...current.data.activities] } }
          : current
      );
      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      addToast({
        variant: 'error',
        title: 'Could not log activity',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    },
    onSuccess: () => {
      setActivityOpen(false);
      addToast({ variant: 'success', title: 'Activity logged' });
      onChanged();
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: queryKeys.uhp.clientMetrics() });
    },
  });

  const addNote = useMutation({
    mutationFn: async (input: { title: string; body?: string }) =>
      json<{ data: ClientDetail['notes'][number] }>(
        await fetch(`/api/uhp/clients/${clientId}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        })
      ),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<{ data: ClientDetail }>(key);
      const optimistic = {
        id: `optimistic-note-${crypto.randomUUID()}`,
        title: input.title,
        body: input.body ?? null,
        created_at: new Date().toISOString(),
      };
      queryClient.setQueryData<{ data: ClientDetail }>(key, (current) =>
        current
          ? { data: { ...current.data, notes: [optimistic, ...current.data.notes] } }
          : current
      );
      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      addToast({
        variant: 'error',
        title: 'Could not add note',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    },
    onSuccess: () => {
      setNoteOpen(false);
      addToast({ variant: 'success', title: 'Note added' });
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: key }),
  });

  function submitActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const appointmentType = String(form.get('appointmentType') || '');
    const appointmentAt = String(form.get('appointmentAt') || '');
    addActivity.mutate({
      activityType: form.get('activityType'),
      title: form.get('title'),
      notes: form.get('notes') || undefined,
      direction: form.get('direction') || undefined,
      channel: form.get('channel') || undefined,
      replyReceived: form.get('replyReceived') === 'on',
      prospectOutcome: form.get('prospectOutcome') || undefined,
      appointmentType: appointmentType || undefined,
      appointmentAt: appointmentAt ? new Date(appointmentAt).toISOString() : undefined,
    });
  }

  function submitNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = String(form.get('body') || '');
    addNote.mutate({ title: String(form.get('title')), ...(body ? { body } : {}) });
  }

  const data = detail.data?.data;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{data?.client.name ?? 'Client details'}</DialogTitle>
          <DialogDescription>
            Update the client and record every communication, outcome, appointment, and note.
          </DialogDescription>
        </DialogHeader>
        {detail.isLoading ? (
          <p className="p-10 text-center text-muted-foreground">
            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
            Loading client...
          </p>
        ) : detail.isError || !data ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-destructive">
            Could not load this client.
          </p>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Status</Label>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={data.client.status}
                  onChange={(event) => updateClient.mutate({ status: event.target.value })}
                >
                  {UHP_CLIENT_STATUS_VALUES.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Interest</Label>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={data.client.interest_state}
                  onChange={(event) => updateClient.mutate({ interestState: event.target.value })}
                >
                  <option value="unknown">Unknown</option>
                  <option value="interested">Interested</option>
                  <option value="declined">Declined</option>
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setActivityOpen((value) => !value)}>
                <MessageSquarePlus className="mr-2 h-4 w-4" />
                Log communication
              </Button>
              <Button size="sm" variant="outline" onClick={() => setNoteOpen((value) => !value)}>
                <NotebookPen className="mr-2 h-4 w-4" />
                Add note
              </Button>
            </div>
            {activityOpen && (
              <form
                className="grid gap-3 rounded-md border p-4 sm:grid-cols-2"
                onSubmit={submitActivity}
              >
                <div className="space-y-1">
                  <Label>Activity type</Label>
                  <select
                    name="activityType"
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    {UHP_ACTIVITY_TYPE_VALUES.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Title</Label>
                  <Input name="title" required />
                </div>
                <div className="space-y-1">
                  <Label>Direction</Label>
                  <select
                    name="direction"
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="">Not applicable</option>
                    <option value="outbound">Outbound</option>
                    <option value="inbound">Inbound</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Channel</Label>
                  <Input name="channel" placeholder="Telegram, phone, email..." />
                </div>
                <div className="space-y-1">
                  <Label>Outcome</Label>
                  <select
                    name="prospectOutcome"
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="">No change</option>
                    <option value="interested">Interested</option>
                    <option value="declined">Declined</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Checkbox id="reply-received" name="replyReceived" />
                  <Label htmlFor="reply-received">Reply received</Label>
                </div>
                <div className="space-y-1">
                  <Label>Appointment</Label>
                  <select
                    name="appointmentType"
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="">None</option>
                    <option value="wellness_evaluation">Wellness evaluation</option>
                    <option value="call">Call</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Appointment time</Label>
                  <Input name="appointmentAt" type="datetime-local" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Notes</Label>
                  <Textarea name="notes" />
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit" disabled={addActivity.isPending}>
                    Save activity
                  </Button>
                </div>
              </form>
            )}
            {noteOpen && (
              <form className="space-y-3 rounded-md border p-4" onSubmit={submitNote}>
                <div className="space-y-1">
                  <Label>Title</Label>
                  <Input name="title" required />
                </div>
                <div className="space-y-1">
                  <Label>Note</Label>
                  <Textarea name="body" />
                </div>
                <Button type="submit" disabled={addNote.isPending}>
                  Save note
                </Button>
              </form>
            )}
            <section>
              <h3 className="mb-2 font-semibold">Activity timeline</h3>
              <div className="space-y-2">
                {data.activities.length ? (
                  data.activities.map((item) => (
                    <div key={item.id} className="rounded-md border p-3">
                      <div className="flex justify-between gap-3">
                        <p className="text-sm font-medium">{item.title}</p>
                        <time className="text-xs text-muted-foreground">
                          {new Date(item.occurred_at).toLocaleString()}
                        </time>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.activity_type}
                        {item.direction ? ` · ${item.direction}` : ''}
                        {item.reply_received ? ' · reply received' : ''}
                        {item.prospect_outcome ? ` · ${item.prospect_outcome}` : ''}
                        {item.appointment_type
                          ? ` · ${item.appointment_type.replace('_', ' ')}`
                          : ''}
                      </p>
                      {item.notes && <p className="mt-2 text-sm">{item.notes}</p>}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No activities yet.</p>
                )}
              </div>
            </section>
            <section>
              <h3 className="mb-2 font-semibold">Notes</h3>
              <div className="space-y-2">
                {data.notes.length ? (
                  data.notes.map((item) => (
                    <div key={item.id} className="rounded-md border p-3">
                      <p className="text-sm font-medium">{item.title}</p>
                      {item.body && (
                        <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No notes yet.</p>
                )}
              </div>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { AttachmentDeleteButton } from '@/components/attachments/AttachmentDeleteButton';
import { queryKeys } from '@/lib/query-keys';
import {
  UHP_ACTIVITY_APPOINTMENT_TYPES,
  UHP_ACTIVITY_TYPE_VALUES,
  UHP_CLIENT_STATUS_VALUES,
  UHP_CLIENT_TYPE_VALUES,
  isUhpWebLink,
  normalizeUhpLink,
} from '@/lib/uhp';
import {
  imageFromClipboard,
  uploadUhpScreenshot,
  validateUhpScreenshot,
} from '@/lib/uhp-screenshots';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  useToast,
} from '@hr-portal/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Loader2, MessageSquarePlus, NotebookPen, Trash2 } from 'lucide-react';
import { type FormEvent, useRef, useState } from 'react';
import { UhpSourceSelect } from './UhpSourceSelect';

type ClientDetail = {
  client: {
    id: string;
    name: string;
    status: string;
    client_type: string | null;
    interest_state: string;
    source_name: string | null;
    source_url: string | null;
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
  attachments: Array<{
    id: string;
    activity_id: string | null;
    file_name: string;
    created_at: string;
    url: string | null;
  }>;
};

type ActivityInput = { fields: Record<string, unknown>; screenshot: File | null };

const NO_SELECTION = '__none__';
const UNASSIGNED_CLIENT_TYPE = '__unassigned__';

function ScreenshotThumbnails({
  items,
  onDelete,
}: {
  items: ClientDetail['attachments'];
  onDelete: (attachmentId: string) => void;
}) {
  if (!items.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {items.map((item) =>
        item.url ? (
          <div key={item.id} className="relative">
            <a href={item.url} target="_blank" rel="noopener noreferrer">
              <img
                src={item.url}
                alt={item.file_name}
                className="h-20 w-20 rounded-md border object-cover hover:opacity-80"
              />
            </a>
            <AttachmentDeleteButton
              variant="overlay"
              itemKind="screenshot"
              itemName={item.file_name}
              description="The screenshot will be removed from this client and permanently deleted. This can't be undone."
              disabled={item.id.startsWith('optimistic-')}
              onConfirm={() => onDelete(item.id)}
            />
          </div>
        ) : null
      )}
    </div>
  );
}

async function json<T>(response: Response): Promise<T> {
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? 'Request failed');
  return payload;
}

export function UhpClientDetailDialog({
  clientId,
  open,
  sourceOptions,
  onOpenChange,
  onChanged,
  onDelete,
}: {
  clientId: string | null;
  open: boolean;
  sourceOptions: ReadonlyArray<string>;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
  onDelete: (client: { id: string; name: string }) => void;
}) {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [activityOpen, setActivityOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [activityScreenshot, setActivityScreenshot] = useState<File | null>(null);
  const [activityType, setActivityType] = useState<(typeof UHP_ACTIVITY_TYPE_VALUES)[number]>(
    UHP_ACTIVITY_TYPE_VALUES[0]
  );
  const [direction, setDirection] = useState('outbound');
  const [prospectOutcome, setProspectOutcome] = useState(NO_SELECTION);
  const [appointmentType, setAppointmentType] = useState(NO_SELECTION);
  const appointmentTouched = useRef(false);
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
                  client_type:
                    'clientType' in updates
                      ? ((updates.clientType as string | null) ?? null)
                      : current.data.client.client_type,
                  interest_state: String(
                    updates.interestState ?? current.data.client.interest_state
                  ),
                  source_name:
                    'sourceName' in updates
                      ? ((updates.sourceName as string | null) ?? null)
                      : current.data.client.source_name,
                  source_url:
                    'sourceUrl' in updates
                      ? ((updates.sourceUrl as string | null) ?? null)
                      : current.data.client.source_url,
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
    mutationFn: async ({ fields, screenshot }: ActivityInput) => {
      const created = await json<{ data: ClientDetail['activities'][number] }>(
        await fetch(`/api/uhp/clients/${clientId}/activities`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fields),
        })
      );
      if (!(screenshot && clientId)) return { screenshotFailed: false };
      // The activity is already saved; a failed upload is reported without rolling it back.
      const uploaded = await uploadUhpScreenshot(clientId, screenshot, created.data.id).catch(
        () => null
      );
      return { screenshotFailed: !uploaded };
    },
    onMutate: async ({ fields: input }) => {
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
    onSuccess: ({ screenshotFailed }) => {
      setActivityOpen(false);
      setActivityScreenshot(null);
      resetActivitySelects();
      addToast(
        screenshotFailed
          ? {
              variant: 'warning',
              title: 'Activity logged, screenshot not saved',
              description: 'Try attaching it again.',
            }
          : { variant: 'success', title: 'Activity logged' }
      );
      onChanged();
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: queryKeys.uhp.clientMetrics() });
    },
  });

  // Optimistic after confirmation: the thumbnail disappears at once and comes back if the
  // server rejects the delete.
  const deleteScreenshot = useMutation({
    mutationFn: async (attachmentId: string) =>
      json<{ data: { id: string } }>(
        await fetch(`/api/uhp/clients/${clientId}/attachments/${attachmentId}`, {
          method: 'DELETE',
        })
      ),
    onMutate: async (attachmentId) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<{ data: ClientDetail }>(key);
      queryClient.setQueryData<{ data: ClientDetail }>(key, (current) =>
        current
          ? {
              data: {
                ...current.data,
                attachments: current.data.attachments.filter((item) => item.id !== attachmentId),
              },
            }
          : current
      );
      return { previous };
    },
    onError: (error, _attachmentId, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      addToast({
        variant: 'error',
        title: 'Could not delete screenshot',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    },
    onSuccess: () => addToast({ variant: 'success', title: 'Screenshot deleted' }),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: key }),
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
    const appointmentAt = String(form.get('appointmentAt') || '');
    addActivity.mutate({
      screenshot: activityScreenshot,
      fields: {
        activityType,
        title: form.get('title'),
        notes: form.get('notes') || undefined,
        direction: direction === NO_SELECTION ? undefined : direction,
        channel: form.get('channel') || undefined,
        replyReceived: form.get('replyReceived') === 'on',
        prospectOutcome: prospectOutcome === NO_SELECTION ? undefined : prospectOutcome,
        appointmentType: appointmentType === NO_SELECTION ? undefined : appointmentType,
        appointmentAt: appointmentAt ? new Date(appointmentAt).toISOString() : undefined,
      },
    });
  }

  function resetActivitySelects() {
    setActivityType(UHP_ACTIVITY_TYPE_VALUES[0]);
    setDirection('outbound');
    setProspectOutcome(NO_SELECTION);
    setAppointmentType(NO_SELECTION);
    appointmentTouched.current = false;
  }

  function selectActivityScreenshot(file: File | null) {
    if (!file) return;
    const invalid = validateUhpScreenshot(file);
    if (invalid) {
      addToast({ variant: 'error', title: 'Screenshot not added', description: invalid });
      return;
    }
    setActivityScreenshot(file);
  }

  function saveSourceUrl(input: HTMLInputElement, current: string | null) {
    const sourceUrl = normalizeUhpLink(input.value);
    if (sourceUrl === current) return;
    if (sourceUrl && !isUhpWebLink(sourceUrl)) {
      input.value = current ?? '';
      addToast({
        variant: 'error',
        title: 'Check the link',
        description: 'Enter a web address, for example instagram.com/username.',
      });
      return;
    }
    input.value = sourceUrl ?? '';
    updateClient.mutate({ sourceUrl });
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
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="uhp-detail-status">Status</Label>
                <Select
                  value={data.client.status}
                  onValueChange={(value) => updateClient.mutate({ status: value })}
                >
                  <SelectTrigger id="uhp-detail-status" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UHP_CLIENT_STATUS_VALUES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="uhp-detail-client-type">Client type</Label>
                <Select
                  value={data.client.client_type ?? UNASSIGNED_CLIENT_TYPE}
                  onValueChange={(value) =>
                    updateClient.mutate({
                      clientType: value === UNASSIGNED_CLIENT_TYPE ? null : value,
                    })
                  }
                >
                  <SelectTrigger id="uhp-detail-client-type" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED_CLIENT_TYPE}>Unassigned</SelectItem>
                    {UHP_CLIENT_TYPE_VALUES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="uhp-detail-interest">Interest</Label>
                <Select
                  value={data.client.interest_state}
                  onValueChange={(value) => updateClient.mutate({ interestState: value })}
                >
                  <SelectTrigger id="uhp-detail-interest" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unknown">Unknown</SelectItem>
                    <SelectItem value="interested">Interested</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="uhp-detail-source">Source</Label>
                <UhpSourceSelect
                  id="uhp-detail-source"
                  value={data.client.source_name ?? ''}
                  options={sourceOptions}
                  onChange={(value) => updateClient.mutate({ sourceName: value || null })}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="uhp-detail-source-url">Link</Label>
                <div className="flex gap-2">
                  <Input
                    // Remount when the saved value changes so the field shows what was stored.
                    key={data.client.source_url ?? ''}
                    id="uhp-detail-source-url"
                    inputMode="url"
                    maxLength={2048}
                    defaultValue={data.client.source_url ?? ''}
                    placeholder="Where you found the lead, e.g. instagram.com/username"
                    onBlur={(event) => saveSourceUrl(event.currentTarget, data.client.source_url)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        event.currentTarget.blur();
                      }
                    }}
                  />
                  {data.client.source_url && (
                    <Button asChild size="icon" variant="outline">
                      <a
                        href={data.client.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Open link"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() =>
                  setActivityOpen((value) => {
                    if (!value) resetActivitySelects();
                    return !value;
                  })
                }
              >
                <MessageSquarePlus className="mr-2 h-4 w-4" />
                Log communication
              </Button>
              <Button size="sm" variant="outline" onClick={() => setNoteOpen((value) => !value)}>
                <NotebookPen className="mr-2 h-4 w-4" />
                Add note
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="ml-auto text-destructive hover:text-destructive"
                onClick={() => onDelete({ id: data.client.id, name: data.client.name })}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete client
              </Button>
            </div>
            {activityOpen && (
              <form
                className="grid gap-3 rounded-md border p-4 sm:grid-cols-2"
                onSubmit={submitActivity}
                onPaste={(event) => {
                  const file = imageFromClipboard(event);
                  if (!file) return;
                  event.preventDefault();
                  selectActivityScreenshot(file);
                }}
              >
                <div className="space-y-1">
                  <Label htmlFor="uhp-activity-type">Activity type</Label>
                  <Select
                    value={activityType}
                    onValueChange={(value: (typeof UHP_ACTIVITY_TYPE_VALUES)[number]) => {
                      setActivityType(value);
                      // Suggest the matching appointment so the Wellness evaluations / Calls
                      // cards count it, unless the user already picked one themselves.
                      if (!appointmentTouched.current) {
                        setAppointmentType(UHP_ACTIVITY_APPOINTMENT_TYPES[value] ?? NO_SELECTION);
                      }
                    }}
                  >
                    <SelectTrigger id="uhp-activity-type" className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UHP_ACTIVITY_TYPE_VALUES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Title</Label>
                  <Input name="title" maxLength={300} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="uhp-activity-direction">Direction</Label>
                  <Select value={direction} onValueChange={setDirection}>
                    <SelectTrigger id="uhp-activity-direction" className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_SELECTION}>Not applicable</SelectItem>
                      <SelectItem value="outbound">Outbound</SelectItem>
                      <SelectItem value="inbound">Inbound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Channel</Label>
                  <Input name="channel" maxLength={300} placeholder="Telegram, phone, email..." />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="uhp-activity-outcome">Outcome</Label>
                  <Select value={prospectOutcome} onValueChange={setProspectOutcome}>
                    <SelectTrigger id="uhp-activity-outcome" className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_SELECTION}>No change</SelectItem>
                      <SelectItem value="interested">Interested</SelectItem>
                      <SelectItem value="declined">Declined</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Checkbox id="reply-received" name="replyReceived" />
                  <Label htmlFor="reply-received">Reply received</Label>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="uhp-activity-appointment">Appointment</Label>
                  <Select
                    value={appointmentType}
                    onValueChange={(value) => {
                      appointmentTouched.current = true;
                      setAppointmentType(value);
                    }}
                  >
                    <SelectTrigger id="uhp-activity-appointment" className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_SELECTION}>None</SelectItem>
                      <SelectItem value="wellness_evaluation">Wellness evaluation</SelectItem>
                      <SelectItem value="call">Call</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Appointment time</Label>
                  <Input name="appointmentAt" type="datetime-local" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Notes</Label>
                  <Textarea name="notes" maxLength={5000} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="uhp-activity-screenshot">Conversation screenshot</Label>
                  <Input
                    id="uhp-activity-screenshot"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => {
                      selectActivityScreenshot(event.target.files?.[0] ?? null);
                      event.target.value = '';
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    {activityScreenshot
                      ? `${activityScreenshot.name} will be attached`
                      : 'Upload or paste (Ctrl+V) a screenshot of the conversation.'}
                  </p>
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
                  <Input name="title" maxLength={300} required />
                </div>
                <div className="space-y-1">
                  <Label>Note</Label>
                  <Textarea name="body" maxLength={5000} />
                </div>
                <Button type="submit" disabled={addNote.isPending}>
                  Save note
                </Button>
              </form>
            )}
            {(data.attachments ?? []).some((attachment) => !attachment.activity_id) && (
              <section>
                <h3 className="mb-2 font-semibold">Screenshots</h3>
                <ScreenshotThumbnails
                  items={(data.attachments ?? []).filter((attachment) => !attachment.activity_id)}
                  onDelete={(attachmentId) => deleteScreenshot.mutate(attachmentId)}
                />
              </section>
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
                      <ScreenshotThumbnails
                        items={(data.attachments ?? []).filter(
                          (attachment) => attachment.activity_id === item.id
                        )}
                        onDelete={(attachmentId) => deleteScreenshot.mutate(attachmentId)}
                      />
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

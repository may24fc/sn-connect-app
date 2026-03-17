'use client';

import {
  useCompanyEvents,
  useCreateCompanyEvent,
  useUpdateCompanyEvent,
  useDeleteCompanyEvent,
  type CompanyEvent,
} from '@/hooks/useCompanyEvents';
import { EmptyState } from '@/components/data-display';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Textarea,
  useToast,
} from '@hr-portal/ui';
import {
  Calendar,
  Edit,
  Loader2,
  MapPin,
  Plus,
  Trash2,
} from 'lucide-react';
import { type ReactNode, useCallback, useMemo, useState } from 'react';

// ──────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────

const CATEGORIES = ['holiday', 'meeting', 'deadline', 'company', 'team', 'training'] as const;

const CATEGORY_LABELS: Record<string, string> = {
  holiday: 'Holiday',
  meeting: 'Meeting',
  deadline: 'Deadline',
  company: 'Company',
  team: 'Team',
  training: 'Training',
};

const CATEGORY_COLORS: Record<string, string> = {
  holiday: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  meeting: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  deadline: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  company: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400',
  team: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  training: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

// ──────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────

function formatDateTime(dateStr: string, allDay: boolean): string {
  const d = new Date(dateStr);
  if (allDay) return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toLocalDateTimeValue(iso: string): string {
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function toLocalDateValue(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

// ──────────────────────────────────────────────────
// Event Form Dialog
// ──────────────────────────────────────────────────

interface EventFormState {
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  location: string;
  category: string;
}

const EMPTY_FORM: EventFormState = {
  title: '',
  description: '',
  start_time: '',
  end_time: '',
  all_day: false,
  location: '',
  category: 'company',
};

function eventToForm(event: CompanyEvent): EventFormState {
  return {
    title: event.title,
    description: event.description ?? '',
    start_time: event.all_day
      ? toLocalDateValue(event.start_time)
      : toLocalDateTimeValue(event.start_time),
    end_time: event.all_day
      ? toLocalDateValue(event.end_time)
      : toLocalDateTimeValue(event.end_time),
    all_day: event.all_day,
    location: event.location ?? '',
    category: event.category,
  };
}

// ──────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────

export default function AdminCalendarPage(): ReactNode {
  const { addToast } = useToast();
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CompanyEvent | null>(null);
  const [form, setForm] = useState<EventFormState>(EMPTY_FORM);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<CompanyEvent | null>(null);

  const { data, isLoading } = useCompanyEvents(
    undefined,
    undefined,
    categoryFilter === 'all' ? undefined : categoryFilter,
  );
  const createMutation = useCreateCompanyEvent();
  const updateMutation = useUpdateCompanyEvent();
  const deleteMutation = useDeleteCompanyEvent();

  const events = data?.data ?? [];

  // Group events by upcoming vs past
  const now = useMemo(() => new Date().toISOString(), []);
  const upcomingEvents = useMemo(
    () => events.filter((e) => e.start_time >= now),
    [events, now],
  );
  const pastEvents = useMemo(
    () => events.filter((e) => e.start_time < now).reverse(),
    [events, now],
  );

  const openCreateDialog = useCallback(() => {
    setEditingEvent(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((event: CompanyEvent) => {
    setEditingEvent(event);
    setForm(eventToForm(event));
    setDialogOpen(true);
  }, []);

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      addToast({ title: 'Title is required', variant: 'error' });
      return;
    }
    if (!form.start_time || !form.end_time) {
      addToast({ title: 'Start and end times are required', variant: 'error' });
      return;
    }

    const startIso = form.all_day
      ? new Date(form.start_time + 'T00:00:00').toISOString()
      : new Date(form.start_time).toISOString();
    const endIso = form.all_day
      ? new Date(form.end_time + 'T23:59:59').toISOString()
      : new Date(form.end_time).toISOString();

    if (new Date(endIso) < new Date(startIso)) {
      addToast({ title: 'End time must be after start time', variant: 'error' });
      return;
    }

    const payload = {
      title: form.title.trim(),
      start_time: startIso,
      end_time: endIso,
      all_day: form.all_day,
      category: form.category,
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
      ...(form.location.trim() ? { location: form.location.trim() } : {}),
    };

    try {
      if (editingEvent) {
        await updateMutation.mutateAsync({ id: editingEvent.id, ...payload });
        addToast({ title: 'Event updated', variant: 'success' });
      } else {
        await createMutation.mutateAsync(payload);
        addToast({ title: 'Event created', variant: 'success' });
      }
      setDialogOpen(false);
    } catch {
      addToast({ title: 'Failed to save event', variant: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      addToast({ title: 'Event deleted', variant: 'success' });
      setDeleteTarget(null);
    } catch {
      addToast({ title: 'Failed to delete event', variant: 'error' });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const updateField = <K extends keyof EventFormState>(key: K, value: EventFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="h-full space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Company Calendar
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Manage company-wide events, holidays, and deadlines.
          </p>
        </div>
        <Button size="sm" onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          New Event
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {events.length} event{events.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Events List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No events"
          description="Create your first company event to get started."
          action={{ label: 'New Event', onClick: openCreateDialog }}
        />
      ) : (
        <div className="space-y-6">
          {/* Upcoming */}
          {upcomingEvents.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Upcoming ({upcomingEvents.length})
              </h2>
              {upcomingEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onEdit={() => openEditDialog(event)}
                  onDelete={() => setDeleteTarget(event)}
                />
              ))}
            </div>
          )}

          {/* Past */}
          {pastEvents.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                Past ({pastEvents.length})
              </h2>
              {pastEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onEdit={() => openEditDialog(event)}
                  onDelete={() => setDeleteTarget(event)}
                  muted
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Event' : 'New Event'}</DialogTitle>
            <DialogDescription>
              {editingEvent
                ? 'Update event details below.'
                : 'Create a new company-wide event.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="evt-title">Title</Label>
              <Input
                id="evt-title"
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="e.g. Q1 All-Hands Meeting"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="evt-desc">Description</Label>
              <Textarea
                id="evt-desc"
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Optional details about this event..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="evt-cat">Category</Label>
                <Select value={form.category} onValueChange={(val) => updateField('category', val)}>
                  <SelectTrigger id="evt-cat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {CATEGORY_LABELS[cat]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="evt-loc">Location</Label>
                <Input
                  id="evt-loc"
                  value={form.location}
                  onChange={(e) => updateField('location', e.target.value)}
                  placeholder="e.g. Main Office"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="evt-allday"
                type="checkbox"
                checked={form.all_day}
                onChange={(e) => {
                  updateField('all_day', e.target.checked);
                  // Reset time fields when toggling
                  updateField('start_time', '');
                  updateField('end_time', '');
                }}
                className="h-4 w-4 rounded border-zinc-300 text-slate-700 focus:ring-slate-500"
              />
              <Label htmlFor="evt-allday" className="text-sm">All-day event</Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="evt-start">{form.all_day ? 'Start Date' : 'Start'}</Label>
                <Input
                  id="evt-start"
                  type={form.all_day ? 'date' : 'datetime-local'}
                  value={form.start_time}
                  onChange={(e) => updateField('start_time', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="evt-end">{form.all_day ? 'End Date' : 'End'}</Label>
                <Input
                  id="evt-end"
                  type={form.all_day ? 'date' : 'datetime-local'}
                  value={form.end_time}
                  onChange={(e) => updateField('end_time', e.target.value)}
                  min={form.start_time || undefined}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingEvent ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.title}&rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ──────────────────────────────────────────────────
// Event Card Component
// ──────────────────────────────────────────────────

function EventCard({
  event,
  onEdit,
  onDelete,
  muted = false,
}: {
  event: CompanyEvent;
  onEdit: () => void;
  onDelete: () => void;
  muted?: boolean;
}): ReactNode {
  const colorClass = CATEGORY_COLORS[event.category] ?? CATEGORY_COLORS.company;

  return (
    <Card className={muted ? 'opacity-60' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {event.title}
              </h3>
              <Badge variant="secondary" className={`text-xs ${colorClass}`}>
                {CATEGORY_LABELS[event.category] ?? event.category}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
              <span>
                {formatDateTime(event.start_time, event.all_day)}
                {' – '}
                {formatDateTime(event.end_time, event.all_day)}
              </span>
            </div>
            {event.location && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <MapPin className="h-3 w-3" />
                <span>{event.location}</span>
              </div>
            )}
            {event.description && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                {event.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onEdit}>
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-600" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

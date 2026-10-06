'use client';

import { stageFormDataFiles } from '@/lib/storage/stage-form-data';
import { useAuth } from '@/contexts/AuthContext';
import {
  ClearFiltersButton,
  FILTER_ALL_VALUE,
  FilterSearchInput,
  FilterSelect,
} from '@/components/data-display/FilterControls';
import { useDirectory } from '@/hooks/useDirectory';
import {
  useCreatePaTaskAttachment,
  useDeletePaTaskAttachment,
  usePaTaskAttachments,
} from '@/hooks/usePaTaskAttachments';
import {
  useGrantPaTaskAccess,
  usePaTaskAccessGrants,
  usePaTaskBootstrap,
  useRevokePaTaskAccess,
} from '@/hooks/usePaTaskAccess';
import {
  useCreatePaTaskCategory,
  useDeletePaTaskCategory,
  useUpdatePaTaskCategory,
} from '@/hooks/usePaTaskLookups';
import { useCreatePaTask, useDeletePaTask, usePaTask, usePaTasks, useUpdatePaTask } from '@/hooks/usePaTasks';
import type { PaTaskLookupColor, PaTaskRecord } from '@/types/pa-task.types';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SlidePanel,
  SlidePanelBody,
  SlidePanelContent,
  SlidePanelDescription,
  SlidePanelFooter,
  SlidePanelHeader,
  SlidePanelSection,
  SlidePanelTitle,
  Tabs,
  TabsList,
  TabsTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  useToast,
} from '@hr-portal/ui';
import {
  ArrowUpDown,
  CalendarDays,
  Loader2,
  Paperclip,
  Plus,
  Search,
  ShieldCheck,
  ShieldX,
  Trash2,
  UserPlus,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

type LookupItem = {
  id: string;
  label: string;
  color: PaTaskLookupColor;
  is_default: boolean;
  sort_order?: number;
  is_terminal?: boolean;
};

type PaTaskListRow = PaTaskRecord & {
  assignee_name?: string | null;
  creator_name?: string | null;
  status?: { id: string; label: string; color: PaTaskLookupColor; is_terminal: boolean };
  priority?: { id: string; label: string; color: PaTaskLookupColor };
  category?: { id: string; label: string; color: PaTaskLookupColor } | null;
  attachments?: Array<{
    id: string;
    title: string;
    attachment_type: 'link' | 'file';
    url: string | null;
    storage_path: string | null;
    mime_type: string | null;
  }>;
};

const NONE_VALUE = '__none__';
const ALLOWED_ATTACHMENT_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf', '.doc', '.docx', '.txt'];
const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);
const ATTACHMENT_CHIP_CLASS =
  'inline-flex max-w-full items-center gap-1 rounded-full border border-zinc-300 bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700';
const DUE_STATUS_COL_CLASS = 'min-w-[108px] w-[108px] max-w-[108px]';
const STICKY_HEAD_CELL_CLASS = 'sticky top-0 z-30 bg-card';
const STICKY_BODY_CELL_CLASS = 'sticky z-20 bg-card';
const STICKY_DATE_GIVEN_COL_CLASS = 'left-0 min-w-[104px] w-[104px] max-w-[104px]';
const STICKY_DUE_COL_CLASS = 'left-[104px] min-w-[104px] w-[104px] max-w-[104px]';
const STICKY_PRIORITY_COL_CLASS = 'left-[208px] min-w-[92px] w-[92px] max-w-[92px]';
const STICKY_TASK_COL_CLASS = 'left-[300px] min-w-[370px] w-[370px] max-w-[370px] border-r border-border';

function colorClass(color: PaTaskLookupColor) {
  const map: Record<PaTaskLookupColor, string> = {
    zinc: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200',
    sky: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    rose: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  };
  return map[color];
}

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function getTaskTitleTextClass(title: string) {
  const length = title.trim().length;
  if (length <= 70) {
    return 'text-sm';
  }
  if (length <= 130) {
    return 'text-[13px]';
  }
  if (length <= 190) {
    return 'text-xs';
  }
  return 'text-[11px]';
}

function getTaskDueStatus(task: PaTaskListRow): 'completed' | 'overdue' | 'on_time' | 'no_due_date' {
  if (task.status?.label?.toLowerCase() === 'overdue') {
    return 'overdue';
  }

  if (task.status?.is_terminal) {
    return 'completed';
  }

  if (!task.due_date) {
    return 'no_due_date';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(task.due_date);
  dueDate.setHours(0, 0, 0, 0);

  if (dueDate < today) {
    return 'overdue';
  }

  return 'on_time';
}

function getDueStatusBadgeClass(status: ReturnType<typeof getTaskDueStatus>) {
  switch (status) {
    case 'overdue':
      return 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300';
    case 'on_time':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
    case 'completed':
      return 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300';
    default:
      return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200';
  }
}

function getDueStatusLabel(status: ReturnType<typeof getTaskDueStatus>) {
  switch (status) {
    case 'overdue':
      return 'Overdue';
    case 'on_time':
      return 'On Time';
    case 'completed':
      return 'Completed';
    default:
      return 'No Due Date';
  }
}

const ADD_PERSON_VALUE = '__add_person__';

function todayLocalIso(): string {
  return new Date().toLocaleDateString('en-CA');
}

function formatRole(role: string | null): string {
  if (!role) return 'Unknown role';
  return role
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

export default function PaTasksPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const pathname = usePathname();
  const isArchiveView = pathname.endsWith('/archive');
  const activePath = isArchiveView ? pathname.slice(0, -'/archive'.length) : pathname;
  const archivePath = isArchiveView ? pathname : `${pathname.replace(/\/$/, '')}/archive`;
  const bootstrapQuery = usePaTaskBootstrap(
    Boolean(user) &&
      (user?.role === 'employee' ||
        user?.role === 'associate' ||
        user?.role === 'admin' ||
        user?.role === 'super_admin')
  );
  const canAccess = Boolean(bootstrapQuery.data?.data.access.canAccess);

  const [search, setSearch] = useState('');
  const [accessSearch, setAccessSearch] = useState('');
  const [grantAccessLevel, setGrantAccessLevel] = useState<'member' | 'manager' | 'admin'>('member');
  const [statusId, setStatusId] = useState('all');
  const [priorityId, setPriorityId] = useState('all');
  const [categoryId, setCategoryId] = useState('all');
  const [assigneeId, setAssigneeId] = useState('all');
  const [dueStatus, setDueStatus] = useState<'all' | 'overdue' | 'on_time' | 'completed' | 'no_due_date'>('all');
  const [sortPreset, setSortPreset] = useState<'recently_updated' | 'due_date_asc' | 'due_date_desc'>(
    'recently_updated'
  );
  const [currentPage, setCurrentPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [accessManagerOpen, setAccessManagerOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const canManage = Boolean(bootstrapQuery.data?.data.access.canManage);

  const directoryQuery = useDirectory({
    search: accessSearch,
    roles: ['employee', 'associate'],
    sortBy: 'full_name',
    sortOrder: 'asc',
    page: 1,
    pageSize: 100,
  });
  const grantsQuery = usePaTaskAccessGrants(canManage);
  const grantAccess = useGrantPaTaskAccess();
  const revokeAccess = useRevokePaTaskAccess();

  const createCategory = useCreatePaTaskCategory();
  const updateCategory = useUpdatePaTaskCategory();
  const deleteCategory = useDeletePaTaskCategory();

  const filters = useMemo(() => {
    const nextFilters: {
      search?: string;
      statusId?: string;
      statusScope?: 'active' | 'archive' | 'all';
      priorityId?: string;
      categoryId?: string;
      assigneeId?: string;
      dueStatus?: 'overdue' | 'on_time' | 'completed' | 'no_due_date';
      sortBy: 'updated_at' | 'due_date';
      sortOrder: 'asc' | 'desc';
      page: number;
      pageSize: number;
    } = {
      sortBy: sortPreset === 'recently_updated' ? 'updated_at' : 'due_date',
      sortOrder:
        sortPreset === 'due_date_asc'
          ? 'asc'
          : sortPreset === 'due_date_desc'
            ? 'desc'
            : 'desc',
      page: currentPage,
      pageSize: 10,
      statusScope: isArchiveView ? 'archive' : 'active',
    };

    const normalizedSearch = search.trim();
    if (normalizedSearch) nextFilters.search = normalizedSearch;
    if (statusId !== 'all') nextFilters.statusId = statusId;
    if (priorityId !== 'all') nextFilters.priorityId = priorityId;
    if (categoryId !== 'all') nextFilters.categoryId = categoryId;
    if (assigneeId !== 'all') nextFilters.assigneeId = assigneeId;
    if (dueStatus !== 'all') nextFilters.dueStatus = dueStatus;

    return nextFilters;
  }, [search, statusId, priorityId, categoryId, assigneeId, dueStatus, sortPreset, currentPage, isArchiveView]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusId, priorityId, categoryId, assigneeId, dueStatus, sortPreset]);

  const tasksQuery = usePaTasks(filters, { enabled: canAccess });
  const taskRows = (tasksQuery.data?.data ?? []) as PaTaskListRow[];
  const totalPages = Math.max(tasksQuery.data?.pagination.totalPages ?? 1, 1);
  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;
  const selectedTaskQuery = usePaTask(selectedTaskId, detailOpen && Boolean(selectedTaskId));
  const selectedTask = (selectedTaskQuery.data?.data ?? null) as (PaTaskListRow & {
    attachments?: Array<{ id: string }>;
  }) | null;
  const attachmentsQuery = usePaTaskAttachments(selectedTaskId);

  const createTask = useCreatePaTask();
  const deleteTask = useDeletePaTask();
  const updateTask = useUpdatePaTask(selectedTaskId ?? '');
  const createAttachment = useCreatePaTaskAttachment(selectedTaskId ?? '');
  const deleteAttachment = useDeletePaTaskAttachment(selectedTaskId ?? '');

  const statuses = (bootstrapQuery.data?.data.lookups.statuses ?? []) as LookupItem[];
  const selectableStatuses = useMemo(
    () => statuses.filter((item) => !item.label || item.label.toLowerCase() !== 'overdue'),
    [statuses]
  );
  const statusFilterOptions = useMemo(
    () =>
      statuses.filter((item) => {
        const normalizedLabel = item.label?.toLowerCase();
        if (normalizedLabel === 'overdue') {
          return false;
        }
        return isArchiveView ? Boolean(item.is_terminal) : !item.is_terminal;
      }),
    [statuses, isArchiveView]
  );
  const priorities = (bootstrapQuery.data?.data.lookups.priorities ?? []) as LookupItem[];
  const categories = (bootstrapQuery.data?.data.lookups.categories ?? []) as LookupItem[];
  const assignees = bootstrapQuery.data?.data.lookups.assignees ?? [];

  const [createForm, setCreateForm] = useState({
    title: '',
    statusId: '',
    priorityId: '',
    categoryId: NONE_VALUE,
    assignedTo: NONE_VALUE,
    dueDate: '',
    dateGiven: '',
    blockerReason: '',
    waitingOn: '',
    notes: '',
  });
  // Status and priority are filled from the lookup defaults; date given is stamped on submit.
  const [quickAddForm, setQuickAddForm] = useState({
    title: '',
    statusId: '',
    priorityId: '',
    assignedTo: NONE_VALUE,
    dueDate: '',
  });
  const quickAddTitleRef = useRef<HTMLInputElement>(null);

  const [editForm, setEditForm] = useState({
    title: '',
    statusId: '',
    priorityId: '',
    categoryId: NONE_VALUE,
    assignedTo: NONE_VALUE,
    dueDate: '',
    dateGiven: '',
    blockerReason: '',
    waitingOn: '',
    notes: '',
  });

  type AttachmentDraft = {
    type: 'link' | 'file';
    title: string;
    url: string;
    file: File | null;
  };

  function createAttachmentDraft(): AttachmentDraft {
    return {
      type: 'link',
      title: '',
      url: '',
      file: null,
    };
  }

  const [createAttachmentDrafts, setCreateAttachmentDrafts] = useState<AttachmentDraft[]>([createAttachmentDraft()]);

  const [categoryForm, setCategoryForm] = useState({
    id: '',
    label: '',
    color: 'zinc' as PaTaskLookupColor,
    sortOrder: 0,
  });

  const [attachmentForm, setAttachmentForm] = useState<{
    type: 'link' | 'file';
    title: string;
    url: string;
    file: File | null;
  }>({
    type: 'link',
    title: '',
    url: '',
    file: null,
  });

  const createAttachmentError = useMemo(
    () =>
      createAttachmentDrafts.find((attachment) => hasAttachmentDraftContent(attachment))
        ? createAttachmentDrafts
            .map((attachment) => getAttachmentValidationError(attachment))
            .find((error) => Boolean(error)) ?? null
        : null,
    [createAttachmentDrafts]
  );
  const canQuickAdd = Boolean(
    quickAddForm.title.trim() && quickAddForm.statusId && quickAddForm.priorityId
  );

  const detailAttachmentError = useMemo(
    () =>
      hasAttachmentDraftContent(attachmentForm)
        ? getAttachmentValidationError(attachmentForm)
        : null,
    [attachmentForm]
  );

  const categoryColorOptions: PaTaskLookupColor[] = ['zinc', 'sky', 'amber', 'rose', 'emerald', 'orange', 'violet'];

  const accessGrants = grantsQuery.data?.data ?? [];
  const grantedUserIds = useMemo(() => new Set(accessGrants.map((grant) => grant.userId)), [accessGrants]);
  const accessCandidates = useMemo(
    () =>
      (directoryQuery.data?.data ?? []).filter((entry) => !grantedUserIds.has(entry.user_id)),
    [directoryQuery.data?.data, grantedUserIds]
  );

  async function handleGrantAccess(userId: string, fullName: string, accessLevel: 'member' | 'manager' | 'admin') {
    try {
      await grantAccess.mutateAsync({ userId, accessLevel });
      addToast({
        variant: 'success',
        title: 'PA task access granted',
        description: `${fullName} can now access the PA/EA task tracker as ${accessLevel}.`,
      });
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Failed to grant PA task access',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  }

  async function handleRevokeAccess(userId: string, fullName: string) {
    try {
      await revokeAccess.mutateAsync(userId);
      addToast({
        variant: 'default',
        title: 'PA task access revoked',
        description: `${fullName} no longer has PA/EA tracker access.`,
      });
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Failed to revoke PA task access',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  }

  function resetCategoryForm() {
    setCategoryForm({ id: '', label: '', color: 'zinc', sortOrder: 0 });
  }

  function resetQuickAddForm() {
    // Keep the defaulted status/priority so the next entry is immediately submittable.
    setQuickAddForm((prev) => ({ ...prev, title: '', assignedTo: NONE_VALUE, dueDate: '' }));
  }

  function handleQuickAddSubmit() {
    if (!canQuickAdd || createTask.isPending) return;
    void createTask
      .mutateAsync({
        title: quickAddForm.title.trim(),
        statusId: quickAddForm.statusId,
        priorityId: quickAddForm.priorityId,
        categoryId: null,
        assignedTo: quickAddForm.assignedTo === NONE_VALUE ? null : quickAddForm.assignedTo,
        dueDate: quickAddForm.dueDate || null,
        dateGiven: todayLocalIso(),
        blockerReason: null,
        waitingOn: null,
        notes: null,
      })
      .then(() => {
        addToast({ title: 'Task added' });
        resetQuickAddForm();
        quickAddTitleRef.current?.focus();
        void tasksQuery.refetch();
      })
      .catch((error: unknown) => {
        addToast({
          title: 'Could not add task',
          description: error instanceof Error ? error.message : 'Please try again.',
          variant: 'error',
        });
      });
  }

  // Carries whatever was typed into the full form, so switching never loses input.
  function openFullCreateFromQuickAdd() {
    setCreateForm((prev) => ({
      ...prev,
      title: quickAddForm.title,
      assignedTo: quickAddForm.assignedTo,
      dueDate: quickAddForm.dueDate,
      dateGiven: prev.dateGiven || todayLocalIso(),
    }));
    resetQuickAddForm();
    setCreateOpen(true);
  }

  const activeFilterCount = [statusId, priorityId, assigneeId, categoryId, dueStatus].filter(
    (value) => value !== FILTER_ALL_VALUE
  ).length;

  function clearFilters() {
    setStatusId(FILTER_ALL_VALUE);
    setPriorityId(FILTER_ALL_VALUE);
    setAssigneeId(FILTER_ALL_VALUE);
    setCategoryId(FILTER_ALL_VALUE);
    setDueStatus(FILTER_ALL_VALUE);
  }

  async function handleCategorySubmit() {
    const label = categoryForm.label.trim();
    if (!label) {
      addToast({ title: 'Category label required', description: 'Please enter a category name.', variant: 'error' });
      return;
    }

    try {
      if (categoryForm.id) {
        await updateCategory.mutateAsync({
          id: categoryForm.id,
          label,
          color: categoryForm.color,
          sortOrder: categoryForm.sortOrder,
        });
        addToast({ title: 'Category updated' });
      } else {
        await createCategory.mutateAsync({
          label,
          color: categoryForm.color,
          sortOrder: categoryForm.sortOrder,
          isDefault: false,
        });
        addToast({ title: 'Category created' });
      }
      resetCategoryForm();
    } catch (error) {
      addToast({
        title: categoryForm.id ? 'Update failed' : 'Create failed',
        description: error instanceof Error ? error.message : 'Unable to save category',
        variant: 'error',
      });
    }
  }

  async function handleCategoryDelete(id: string) {
    try {
      await deleteCategory.mutateAsync(id);
      addToast({ title: 'Category removed' });
      if (categoryForm.id === id) {
        resetCategoryForm();
      }
    } catch (error) {
      addToast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Unable to delete category',
        variant: 'error',
      });
    }
  }

  function getAttachmentValidationError(attachment: Pick<AttachmentDraft, 'type' | 'title' | 'url' | 'file'>): string | null {
    if (attachment.type === 'link') {
      if (!attachment.url.trim()) {
        return 'Attachment link is required.';
      }
      return null;
    }

    if (!attachment.file) {
      return 'Please select a valid file.';
    }

    const fileName = attachment.file.name.toLowerCase();
    const mimeType = attachment.file.type.toLowerCase();
    const hasAllowedMime = ALLOWED_ATTACHMENT_MIME_TYPES.has(mimeType);
    const hasAllowedExtension = ALLOWED_ATTACHMENT_EXTENSIONS.some((extension) => fileName.endsWith(extension));

    if (!hasAllowedMime && !hasAllowedExtension) {
      return 'Unsupported file type. Allowed: JPG, JPEG, PNG, WEBP, GIF, PDF, DOC, DOCX, and TXT.';
    }

    if (attachment.file.size > 10 * 1024 * 1024) {
      return 'File exceeds 10MB size limit.';
    }

    return null;
  }

  function hasAttachmentDraftContent(attachment: Pick<AttachmentDraft, 'type' | 'url' | 'file'>): boolean {
    if (attachment.type === 'link') {
      return attachment.url.trim().length > 0;
    }

    return Boolean(attachment.file);
  }

  function resolveAttachmentTitle(
    attachment: Pick<AttachmentDraft, 'type' | 'title' | 'file'>,
    fallbackIndexes: { file: number; link: number }
  ): { title: string; usedGeneric: boolean } {
    const manualTitle = attachment.title.trim();
    if (manualTitle) {
      return { title: manualTitle, usedGeneric: false };
    }

    if (attachment.type === 'file') {
      const fileNameTitle = attachment.file?.name?.trim() ?? '';
      if (fileNameTitle) {
        return { title: fileNameTitle, usedGeneric: false };
      }

      return { title: `File ${fallbackIndexes.file}`, usedGeneric: true };
    }

    return { title: `Link ${fallbackIndexes.link}`, usedGeneric: true };
  }

  function isValidAttachmentDraft(attachment: AttachmentDraft) {
    if (attachment.type === 'link') {
      return attachment.url.trim().length > 0 && !getAttachmentValidationError(attachment);
    }

    return Boolean(attachment.file) && !getAttachmentValidationError(attachment);
  }

  async function addTaskAttachment(
    taskId: string,
    payload:
      | { attachmentType: 'link'; title: string; url: string }
      | { attachmentType: 'file'; title: string; file: File }
  ): Promise<void> {
    if (payload.attachmentType === 'file') {
      const formData = new FormData();
      formData.append('title', payload.title);
      formData.append('file', payload.file);

      const response = await fetch(`/api/pa-tasks/${taskId}/attachments`, {
        method: 'POST',
        body: await stageFormDataFiles(formData),
      });
      const result = await response.json().catch(() => ({ error: 'Failed to add task attachment' }));
      if (!response.ok) {
        throw new Error(result.error || 'Failed to add task attachment');
      }
      return;
    }

    const response = await fetch(`/api/pa-tasks/${taskId}/attachments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({ error: 'Failed to add task attachment' }));
    if (!response.ok) {
      throw new Error(result.error || 'Failed to add task attachment');
    }
  }

  useEffect(() => {
    if (!createOpen) {
      return;
    }
    const defaultStatus = selectableStatuses.find((item) => item.is_default) ?? selectableStatuses[0];
    const defaultPriority = priorities.find((item) => item.is_default) ?? priorities[0];
    setCreateForm((prev) => {
      const nextStatusId = prev.statusId || defaultStatus?.id || '';
      const nextPriorityId = prev.priorityId || defaultPriority?.id || '';

      if (prev.statusId === nextStatusId && prev.priorityId === nextPriorityId) {
        return prev;
      }

      return {
        ...prev,
        statusId: nextStatusId,
        priorityId: nextPriorityId,
      };
    });
  }, [createOpen, selectableStatuses, priorities]);
  useEffect(() => {
    const defaultStatus = selectableStatuses.find((item) => item.is_default) ?? selectableStatuses[0];
    const defaultPriority = priorities.find((item) => item.is_default) ?? priorities[0];
    setQuickAddForm((prev) => {
      const nextStatusId = prev.statusId || defaultStatus?.id || '';
      const nextPriorityId = prev.priorityId || defaultPriority?.id || '';

      if (prev.statusId === nextStatusId && prev.priorityId === nextPriorityId) {
        return prev;
      }

      return {
        ...prev,
        statusId: nextStatusId,
        priorityId: nextPriorityId,
      };
    });
  }, [selectableStatuses, priorities]);

  useEffect(() => {
    if (!selectedTask) return;
    setEditForm({
      title: selectedTask.title,
      statusId: selectedTask.status_id,
      priorityId: selectedTask.priority_id,
      categoryId: selectedTask.category_id ?? NONE_VALUE,
      assignedTo: selectedTask.assigned_to ?? NONE_VALUE,
      dueDate: selectedTask.due_date ?? '',
      dateGiven: selectedTask.date_given ?? '',
      blockerReason: selectedTask.blocker_reason ?? '',
      waitingOn: selectedTask.waiting_on ?? '',
      notes: selectedTask.notes ?? '',
    });
  }, [selectedTask]);

  if (bootstrapQuery.isLoading) {
    return (
      <div className="flex h-[55vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading PA tracker access...
      </div>
    );
  }

  if (!canAccess) {
    return (
      <EmptyState
        icon={<Paperclip className="h-12 w-12 text-muted-foreground" />}
        title="PA Tracker access required"
        description="Only users granted by admin/manager can access this module."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{isArchiveView ? 'PA Task Archive' : 'PA Task Tracker'}</h1>
          <p className="text-sm text-muted-foreground">
            {isArchiveView
              ? 'Completed and cancelled PA/EA tasks.'
              : 'Centralized PA/EA task tracking with attachments and blockers.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canManage ? (
            <>
              <Button variant="outline" onClick={() => setAccessManagerOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Grant Access
              </Button>
              <Button variant="outline" onClick={() => setCategoryManagerOpen(true)}>
                Manage Categories
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <Tabs value={isArchiveView ? 'archive' : 'main'}>
        <TabsList className="w-fit max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="main" asChild>
            <Link href={activePath}>Main</Link>
          </TabsTrigger>
          <TabsTrigger value="archive" asChild>
            <Link href={archivePath}>Archive</Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {!isArchiveView ? (
        <form
          aria-label="Quick add task"
          onSubmit={(event) => {
            event.preventDefault();
            handleQuickAddSubmit();
          }}
          className="space-y-1.5"
        >
          <div className="flex flex-col gap-2 rounded-lg border border-input bg-card p-2 shadow-sm transition-colors focus-within:border-primary/60 md:flex-row md:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-2 px-1.5">
              <Plus className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <input
                ref={quickAddTitleRef}
                aria-label="Task title"
                value={quickAddForm.title}
                maxLength={300}
                onChange={(event) => setQuickAddForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Add a task, then press Enter"
                className="h-9 w-full min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={quickAddForm.assignedTo}
                onValueChange={(value) => {
                  if (value === ADD_PERSON_VALUE) {
                    setAccessManagerOpen(true);
                    return;
                  }
                  setQuickAddForm((prev) => ({ ...prev, assignedTo: value }));
                }}
              >
                <SelectTrigger aria-label="Assignee" className="w-auto min-w-[150px] max-w-[220px] gap-1.5">
                  <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>Unassigned</SelectItem>
                  {assignees.map((item) => (
                    <SelectItem key={item.userId} value={item.userId}>
                      {item.fullName}
                    </SelectItem>
                  ))}
                  {canManage ? (
                    <SelectItem value={ADD_PERSON_VALUE} className="mt-1 border-t border-border pt-2 text-primary">
                      Add person…
                    </SelectItem>
                  ) : null}
                </SelectContent>
              </Select>

              <label className="flex h-9 cursor-text items-center gap-1.5 rounded-md border border-input bg-card px-2.5 text-sm shadow-sm transition-colors focus-within:border-primary/60 hover:border-primary/35">
                <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="text-muted-foreground">Due</span>
                <input
                  type="date"
                  aria-label="Due date"
                  value={quickAddForm.dueDate}
                  onChange={(event) => setQuickAddForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                  className="bg-transparent text-foreground tabular-nums outline-none"
                />
              </label>

              <Button type="submit" disabled={!canQuickAdd || createTask.isPending}>
                {createTask.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Add
              </Button>
            </div>
          </div>

          <button
            type="button"
            onClick={openFullCreateFromQuickAdd}
            className="rounded px-1 text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            Need status, category, blockers or attachments? Add with full details
          </button>
        </form>
      ) : null}

      <Dialog open={accessManagerOpen} onOpenChange={setAccessManagerOpen}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>Manage PA/EA task access</DialogTitle>
            <DialogDescription>
              Grant employee or associate accounts access to the PA/EA task tracker.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[calc(85vh-7rem)] space-y-6 overflow-y-auto pr-1">
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Current members</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    These users can access the PA/EA tracker without manager elevation.
                  </p>
                </div>
                <Badge variant="outline">{accessGrants.length} active</Badge>
              </div>

              {accessGrants.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400">
                  No PA/EA access grants yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {accessGrants.map((grant) => {
                    const fullName = grant.fullName || grant.email || 'Unknown user';
                    const buttonDisabled = revokeAccess.isPending;

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
                            {grant.department ? (
                              <>
                                <span>•</span>
                                <span>{grant.department}</span>
                              </>
                            ) : null}
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void handleRevokeAccess(grant.userId, fullName)}
                          disabled={buttonDisabled}
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
                  Search existing employee or associate accounts and assign track access.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_190px] md:items-end">
                <div className="space-y-2">
                  <Label className="block text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                    Search
                  </Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <Input
                      value={accessSearch}
                      maxLength={200}
                      onChange={(event) => setAccessSearch(event.target.value)}
                      placeholder="Search by name, email, or role"
                      className="h-12 pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="block text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                    Access level
                  </Label>
                  <Select
                    value={grantAccessLevel}
                    onValueChange={(value) => setGrantAccessLevel(value as 'member' | 'manager' | 'admin')}
                  >
                    <SelectTrigger className="h-12 w-full">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {directoryQuery.isLoading ? (
                <div className="flex min-h-32 items-center justify-center rounded-lg border border-border text-sm text-zinc-500 dark:text-zinc-400">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading eligible users...
                </div>
              ) : directoryQuery.isError || grantsQuery.isError ? (
                <div className="flex min-h-32 items-center justify-center rounded-lg border border-border text-sm text-red-500">
                  Unable to load eligible users right now.
                </div>
              ) : accessCandidates.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400">
                  No unassigned employee or associate accounts found.
                </div>
              ) : (
                <div className="space-y-2">
                  {accessCandidates.map((entry) => {
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
                          onClick={() => void handleGrantAccess(entry.user_id, fullName, grantAccessLevel)}
                          disabled={grantAccess.isPending}
                        >
                          {grantAccess.isPending ? (
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

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
            <FilterSearchInput value={search} onChange={setSearch} placeholder="Search tasks" />
            <FilterSelect
              label="Status"
              value={statusId}
              onValueChange={setStatusId}
              options={statusFilterOptions.map((item) => ({ value: item.id, label: item.label }))}
            />
            <FilterSelect
              label="Priority"
              value={priorityId}
              onValueChange={setPriorityId}
              options={priorities.map((item) => ({ value: item.id, label: item.label }))}
            />
            <FilterSelect
              label="Assignee"
              value={assigneeId}
              onValueChange={setAssigneeId}
              options={assignees.map((item) => ({ value: item.userId, label: item.fullName }))}
            />
            <FilterSelect
              label="Category"
              value={categoryId}
              onValueChange={setCategoryId}
              options={categories.map((item) => ({ value: item.id, label: item.label }))}
            />
            <FilterSelect
              label="Due"
              value={dueStatus}
              onValueChange={(value) => setDueStatus(value as typeof dueStatus)}
              options={[
                { value: 'overdue', label: 'Overdue' },
                { value: 'on_time', label: 'On time' },
                { value: 'completed', label: 'Completed' },
                { value: 'no_due_date', label: 'No due date' },
              ]}
            />
            <ClearFiltersButton count={activeFilterCount} onClear={clearFilters} />
            <Select
              value={sortPreset}
              onValueChange={(value) =>
                setSortPreset(value as 'recently_updated' | 'due_date_asc' | 'due_date_desc')
              }
            >
              <SelectTrigger aria-label="Sort tasks" className="w-auto gap-1.5 whitespace-nowrap sm:ml-auto">
                <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="recently_updated">Recently updated</SelectItem>
                <SelectItem value="due_date_asc">Due soonest</SelectItem>
                <SelectItem value="due_date_desc">Due latest</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="overflow-x-auto">
            <Table className="table-fixed min-w-[2000px]">
              <TableHeader>
                <TableRow>
                  <TableHead className={DUE_STATUS_COL_CLASS}>Due Status</TableHead>
                  <TableHead className={`${STICKY_HEAD_CELL_CLASS} ${STICKY_DATE_GIVEN_COL_CLASS}`}>Date Given</TableHead>
                  <TableHead className={`${STICKY_HEAD_CELL_CLASS} ${STICKY_DUE_COL_CLASS}`}>Due Date</TableHead>
                  <TableHead className={`${STICKY_HEAD_CELL_CLASS} ${STICKY_PRIORITY_COL_CLASS}`}>Priority</TableHead>
                  <TableHead className={`${STICKY_HEAD_CELL_CLASS} ${STICKY_TASK_COL_CLASS}`}>Task</TableHead>
                  <TableHead>Waiting On</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Notes / Remarks</TableHead>
                  <TableHead>Document / Email Link (if available)</TableHead>
                  <TableHead>Date Given</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasksQuery.isLoading ? (
                  <TableRow><TableCell colSpan={12} className="py-8 text-center text-muted-foreground">Loading tasks...</TableCell></TableRow>
                ) : taskRows.length === 0 ? (
                  <TableRow><TableCell colSpan={12} className="py-8 text-center text-muted-foreground">No tasks found.</TableCell></TableRow>
                ) : (
                  taskRows.map((task) => (
                    <TableRow
                      key={task.id}
                      className="cursor-pointer align-top"
                      onClick={() => {
                        setSelectedTaskId(task.id);
                        setDetailOpen(true);
                      }}
                    >
                      <TableCell className={DUE_STATUS_COL_CLASS}>
                        <Badge className={getDueStatusBadgeClass(getTaskDueStatus(task))}>
                          {getDueStatusLabel(getTaskDueStatus(task))}
                        </Badge>
                      </TableCell>
                      <TableCell className={`${STICKY_BODY_CELL_CLASS} ${STICKY_DATE_GIVEN_COL_CLASS}`}>{formatDate(task.date_given)}</TableCell>
                      <TableCell className={`${STICKY_BODY_CELL_CLASS} ${STICKY_DUE_COL_CLASS}`}>{formatDate(task.due_date)}</TableCell>
                      <TableCell className={`${STICKY_BODY_CELL_CLASS} ${STICKY_PRIORITY_COL_CLASS}`}><Badge variant="secondary" className={task.priority ? colorClass(task.priority.color) : ''}>{task.priority?.label ?? '—'}</Badge></TableCell>
                      <TableCell
                        className={`${STICKY_BODY_CELL_CLASS} ${STICKY_TASK_COL_CLASS} overflow-hidden whitespace-normal break-words font-medium leading-tight ${getTaskTitleTextClass(task.title)}`}
                        title={task.title}
                      >
                        {task.title}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate">{task.waiting_on ?? '—'}</TableCell>
                      <TableCell>{task.assignee_name ?? 'Unassigned'}</TableCell>
                      <TableCell><Badge className={task.status ? colorClass(task.status.color) : ''}>{task.status?.label ?? '—'}</Badge></TableCell>
                      <TableCell>{task.category?.label ?? '—'}</TableCell>
                      <TableCell className="max-w-[260px] truncate">{task.notes ?? '—'}</TableCell>
                      <TableCell className="max-w-[220px] align-top">
                        {task.attachments && task.attachments.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {task.attachments.slice(0, 3).map((attachment) => (
                              <div key={attachment.id} className="truncate text-xs">
                                {attachment.attachment_type === 'link' && attachment.url ? (
                                  <Link
                                    href={attachment.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={ATTACHMENT_CHIP_CLASS}
                                    onClick={(event) => event.stopPropagation()}
                                  >
                                    <Paperclip className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{attachment.title.trim() || 'Open link'}</span>
                                  </Link>
                                ) : (
                                  <button
                                    type="button"
                                    className={ATTACHMENT_CHIP_CLASS}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setSelectedTaskId(task.id);
                                      setDetailOpen(true);
                                    }}
                                  >
                                    <Paperclip className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{attachment.title.trim() || 'File attachment'}</span>
                                  </button>
                                )}
                              </div>
                            ))}
                            {task.attachments.length > 3 ? <span className="text-[10px] text-muted-foreground">+{task.attachments.length - 3} more</span> : null}
                          </div>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>{formatDate(task.updated_at)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-center gap-3 border-t border-border px-4 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={tasksQuery.isLoading || !hasPreviousPage}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={tasksQuery.isLoading || !hasNextPage}
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>

      <SlidePanel open={categoryManagerOpen} onOpenChange={setCategoryManagerOpen}>
        <SlidePanelContent size="md">
          <SlidePanelHeader>
            <SlidePanelTitle>Manage Categories</SlidePanelTitle>
            <SlidePanelDescription>Keep task categories simple and easy to maintain.</SlidePanelDescription>
          </SlidePanelHeader>
          <SlidePanelBody className="space-y-5">
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium text-muted-foreground">
                  {categoryForm.id ? 'Edit category' : 'Add category'}
                </div>
                {categoryForm.id ? (
                  <Button variant="outline" size="sm" onClick={resetCategoryForm}>Clear</Button>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                <Input
                  placeholder="Category name"
                  value={categoryForm.label}
                  maxLength={100}
                  onChange={(e) => setCategoryForm((p) => ({ ...p, label: e.target.value }))}
                />
                <Select
                  value={categoryForm.color}
                  onValueChange={(value) => setCategoryForm((p) => ({ ...p, color: value as PaTaskLookupColor }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categoryColorOptions.map((color) => (
                      <SelectItem key={color} value={color}>{color.charAt(0).toUpperCase() + color.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground">Preview</div>
                <Badge className={colorClass(categoryForm.color)}>{categoryForm.label || 'Category'}</Badge>
              </div>
              <Button
                className="w-full"
                disabled={!categoryForm.label.trim() || createCategory.isPending || updateCategory.isPending}
                onClick={() => void handleCategorySubmit()}
              >
                {categoryForm.id ? 'Save Changes' : 'Create Category'}
              </Button>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Existing categories</div>
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">No categories yet.</p>
              ) : (
                <div className="space-y-2">
                  {categories.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-2 rounded-md border p-2.5">
                      <button
                        type="button"
                        className="flex flex-1 items-center gap-2 text-left"
                        onClick={() => setCategoryForm({ id: item.id, label: item.label, color: item.color, sortOrder: item.sort_order ?? 0 })}
                      >
                        <Badge className={colorClass(item.color)}>{item.label}</Badge>
                      </button>
                      <Button variant="outline" size="sm" onClick={() => void handleCategoryDelete(item.id)}>
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SlidePanelBody>
          <SlidePanelFooter>
            <Button variant="outline" onClick={() => setCategoryManagerOpen(false)}>Close</Button>
          </SlidePanelFooter>
        </SlidePanelContent>
      </SlidePanel>

      <SlidePanel open={createOpen} onOpenChange={setCreateOpen}>
        <SlidePanelContent size="lg">
          <SlidePanelHeader>
            <SlidePanelTitle>Create PA Task</SlidePanelTitle>
            <SlidePanelDescription>Use the PA/EA tracker field order for quick task entry.</SlidePanelDescription>
          </SlidePanelHeader>
          <SlidePanelBody className="space-y-5">
            <SlidePanelSection label="Core">
              <div className="space-y-1.5">
                <Label>Task</Label>
                <Textarea
                  value={createForm.title}
                  maxLength={300}
                  onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
                  className="min-h-[80px] resize-y"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={createForm.statusId} onValueChange={(value) => setCreateForm((p) => ({ ...p, statusId: value }))}>
                    <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>{selectableStatuses.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select value={createForm.priorityId} onValueChange={(value) => setCreateForm((p) => ({ ...p, priorityId: value }))}>
                    <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                    <SelectContent>{priorities.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Date Given</Label>
                  <Input type="date" value={createForm.dateGiven} onChange={(e) => setCreateForm((p) => ({ ...p, dateGiven: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Due Date</Label>
                  <Input type="date" value={createForm.dueDate} onChange={(e) => setCreateForm((p) => ({ ...p, dueDate: e.target.value }))} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Assigned To</Label>
                  <Select value={createForm.assignedTo} onValueChange={(value) => setCreateForm((p) => ({ ...p, assignedTo: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>Unassigned</SelectItem>
                      {assignees.map((item) => (
                        <SelectItem key={item.userId} value={item.userId}>{item.fullName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={createForm.categoryId} onValueChange={(value) => setCreateForm((p) => ({ ...p, categoryId: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>None</SelectItem>
                      {categories.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Blockers</Label>
                <Input value={createForm.blockerReason} maxLength={500} onChange={(e) => setCreateForm((p) => ({ ...p, blockerReason: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Waiting On</Label>
                <Input value={createForm.waitingOn} maxLength={300} onChange={(e) => setCreateForm((p) => ({ ...p, waitingOn: e.target.value }))} />
              </div>
              <div className="space-y-3 rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium text-muted-foreground">Attachments</div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCreateAttachmentDrafts((prev) => [...prev, createAttachmentDraft()])}
                  >
                    <Plus className="mr-1 h-4 w-4" /> Add attachment
                  </Button>
                </div>

                {createAttachmentDrafts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No attachments added yet.</p>
                ) : (
                  createAttachmentDrafts.map((attachment, index) => (
                    <div key={`create-attachment-${index}`} className="space-y-2 rounded-md border p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Attachment {index + 1}</span>
                        {createAttachmentDrafts.length > 1 ? (
                          <Button type="button" variant="outline" size="sm" onClick={() => setCreateAttachmentDrafts((prev) => prev.filter((_, i) => i !== index))}>
                            Remove
                          </Button>
                        ) : null}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <Select
                          value={attachment.type}
                          onValueChange={(value: 'link' | 'file') =>
                            setCreateAttachmentDrafts((prev) =>
                              prev.map((item, itemIndex) => (itemIndex === index ? { ...item, type: value } : item))
                            )
                          }
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="link">Link</SelectItem>
                            <SelectItem value="file">File</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Attachment title (optional)"
                          value={attachment.title}
                          maxLength={200}
                          onChange={(e) =>
                            setCreateAttachmentDrafts((prev) =>
                              prev.map((item, itemIndex) => (itemIndex === index ? { ...item, title: e.target.value } : item))
                            )
                          }
                        />
                        {attachment.type === 'link' ? (
                          <Input
                            key={`create-link-input-${index}`}
                            placeholder="https://..."
                            value={attachment.url}
                            maxLength={2048}
                            onChange={(e) =>
                              setCreateAttachmentDrafts((prev) =>
                                prev.map((item, itemIndex) => (itemIndex === index ? { ...item, url: e.target.value } : item))
                              )
                            }
                          />
                        ) : (
                          <Input
                            key={`create-file-input-${index}`}
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.txt,image/jpeg,image/png,image/webp,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                            onChange={(e) =>
                              setCreateAttachmentDrafts((prev) =>
                                prev.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, file: e.target.files?.[0] ?? null } : item
                                )
                              )
                            }
                          />
                        )}
                      </div>
                    </div>
                  ))
                )}
                {createAttachmentError ? (
                  <p className="text-sm text-red-600 dark:text-red-400">{createAttachmentError}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label>Notes/Remarks</Label>
                <Textarea value={createForm.notes} maxLength={5000} onChange={(e) => setCreateForm((p) => ({ ...p, notes: e.target.value }))} />
              </div>
            </SlidePanelSection>
          </SlidePanelBody>
          <SlidePanelFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              disabled={
                createTask.isPending ||
                !createForm.title.trim() ||
                !createForm.statusId ||
                !createForm.priorityId ||
                createAttachmentDrafts.some(
                  (attachment) =>
                    hasAttachmentDraftContent(attachment) &&
                    Boolean(getAttachmentValidationError(attachment))
                )
              }
              onClick={() => {
                void createTask
                  .mutateAsync({
                    title: createForm.title.trim(),
                    statusId: createForm.statusId,
                    priorityId: createForm.priorityId,
                    categoryId: createForm.categoryId === NONE_VALUE ? null : createForm.categoryId,
                    assignedTo: createForm.assignedTo === NONE_VALUE ? null : createForm.assignedTo,
                    dueDate: createForm.dueDate || null,
                    dateGiven: createForm.dateGiven || null,
                    blockerReason: createForm.blockerReason || null,
                    waitingOn: createForm.waitingOn || null,
                    notes: createForm.notes || null,
                  })
                  .then(async (response) => {
                    const validAttachments = createAttachmentDrafts.filter(isValidAttachmentDraft);
                    let attachmentSuccessCount = 0;
                    let attachmentFailureCount = 0;
                    let nextGenericFileTitleIndex = 1;
                    let nextGenericLinkTitleIndex = 1;

                    for (const attachment of validAttachments) {
                      try {
                        const resolvedTitle = resolveAttachmentTitle(attachment, {
                          file: nextGenericFileTitleIndex,
                          link: nextGenericLinkTitleIndex,
                        });
                        if (resolvedTitle.usedGeneric) {
                          if (attachment.type === 'file') {
                            nextGenericFileTitleIndex += 1;
                          } else {
                            nextGenericLinkTitleIndex += 1;
                          }
                        }

                        const attachmentPayload =
                          attachment.type === 'link'
                            ? {
                                attachmentType: 'link' as const,
                                title: resolvedTitle.title,
                                url: attachment.url.trim(),
                              }
                            : {
                                attachmentType: 'file' as const,
                                title: resolvedTitle.title,
                                file: attachment.file as File,
                              };

                        await addTaskAttachment(response.data.id, attachmentPayload);
                        attachmentSuccessCount += 1;
                      } catch (error) {
                        attachmentFailureCount += 1;
                        console.error('Failed to add PA task attachment during creation:', error);
                      }
                    }

                    if (attachmentFailureCount > 0) {
                      addToast({
                        title: 'Task created with attachment issue',
                        description:
                          attachmentSuccessCount > 0
                            ? `${attachmentSuccessCount} attachment(s) were saved, but ${attachmentFailureCount} could not be added.`
                            : 'Task was created, but one or more attachments could not be added.',
                      });
                    } else {
                      addToast({
                        title: 'Task created',
                        description:
                          attachmentSuccessCount > 0
                            ? `PA task has been added with ${attachmentSuccessCount} attachment(s).`
                            : 'PA task has been added.',
                      });
                    }

                    void tasksQuery.refetch();

                    setCreateOpen(false);
                    setCreateForm({
                      title: '',
                      statusId: '',
                      priorityId: '',
                      categoryId: NONE_VALUE,
                      assignedTo: NONE_VALUE,
                      dueDate: '',
                      dateGiven: '',
                      blockerReason: '',
                      waitingOn: '',
                      notes: '',
                    });
                    setCreateAttachmentDrafts([createAttachmentDraft()]);
                  })
                  .catch((error: unknown) => {
                    addToast({
                      title: 'Create failed',
                      description: error instanceof Error ? error.message : 'Unable to create task',
                      variant: 'error',
                    });
                  });
              }}
            >
              {createTask.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Task
            </Button>
          </SlidePanelFooter>
        </SlidePanelContent>
      </SlidePanel>

      <SlidePanel open={detailOpen} onOpenChange={setDetailOpen}>
        <SlidePanelContent size="xl">
          <SlidePanelHeader>
            <SlidePanelTitle>Task Details</SlidePanelTitle>
            <SlidePanelDescription>Update status, blockers, notes, and attachments.</SlidePanelDescription>
          </SlidePanelHeader>
          <SlidePanelBody className="space-y-6">
            {!selectedTask ? (
              <div className="text-sm text-muted-foreground">Loading task...</div>
            ) : (
              <>
                <SlidePanelSection label="Task">
                  <div className="space-y-1.5">
                    <Label>Task</Label>
                    <Textarea
                      value={editForm.title}
                      maxLength={300}
                      onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                      className="min-h-[120px] resize-y"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Status</Label>
                      <Select value={editForm.statusId} onValueChange={(value) => setEditForm((p) => ({ ...p, statusId: value }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{selectableStatuses.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Priority</Label>
                      <Select value={editForm.priorityId} onValueChange={(value) => setEditForm((p) => ({ ...p, priorityId: value }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{priorities.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Date Given</Label>
                      <Input type="date" value={editForm.dateGiven} onChange={(e) => setEditForm((p) => ({ ...p, dateGiven: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Due Date</Label>
                      <Input type="date" value={editForm.dueDate} onChange={(e) => setEditForm((p) => ({ ...p, dueDate: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Assigned To</Label>
                      <Select value={editForm.assignedTo} onValueChange={(value) => setEditForm((p) => ({ ...p, assignedTo: value }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>Unassigned</SelectItem>
                          {assignees.map((item) => (
                            <SelectItem key={item.userId} value={item.userId}>{item.fullName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Category</Label>
                      <Select value={editForm.categoryId} onValueChange={(value) => setEditForm((p) => ({ ...p, categoryId: value }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>None</SelectItem>
                          {categories.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Blockers</Label>
                    <Input value={editForm.blockerReason} maxLength={500} onChange={(e) => setEditForm((p) => ({ ...p, blockerReason: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Waiting On</Label>
                    <Input value={editForm.waitingOn} maxLength={300} onChange={(e) => setEditForm((p) => ({ ...p, waitingOn: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Notes/Remarks</Label>
                    <Textarea value={editForm.notes} maxLength={5000} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} />
                  </div>
                </SlidePanelSection>

                <SlidePanelSection label="Attachments">
                  <div className="space-y-2 rounded-md border p-3">
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Select value={attachmentForm.type} onValueChange={(value: 'link' | 'file') => setAttachmentForm((p) => ({ ...p, type: value }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="link">Link</SelectItem>
                          <SelectItem value="file">File</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input placeholder="Title (optional)" value={attachmentForm.title} maxLength={200} onChange={(e) => setAttachmentForm((p) => ({ ...p, title: e.target.value }))} />
                      {attachmentForm.type === 'link' ? (
                        <Input
                          key="detail-link-input"
                          placeholder="https://..."
                          value={attachmentForm.url}
                          maxLength={2048}
                          onChange={(e) => setAttachmentForm((p) => ({ ...p, url: e.target.value }))}
                        />
                      ) : (
                        <Input
                          key="detail-file-input"
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.txt,image/jpeg,image/png,image/webp,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                          onChange={(e) => setAttachmentForm((p) => ({ ...p, file: e.target.files?.[0] ?? null }))}
                        />
                      )}
                    </div>
                    {detailAttachmentError ? (
                      <p className="text-sm text-red-600 dark:text-red-400">{detailAttachmentError}</p>
                    ) : null}
                    <Button
                      size="sm"
                      disabled={
                        createAttachment.isPending ||
                        Boolean(detailAttachmentError) ||
                        (attachmentForm.type === 'link' ? !attachmentForm.url.trim() : !attachmentForm.file)
                      }
                      onClick={() => {
                        const existingAttachments = attachmentsQuery.data?.data ?? [];
                        const existingTypeCount = existingAttachments.filter(
                          (attachment) => attachment.attachment_type === attachmentForm.type
                        ).length;
                        const resolvedTitle = resolveAttachmentTitle(attachmentForm, {
                          file: existingTypeCount + 1,
                          link: existingTypeCount + 1,
                        });

                        const request =
                          attachmentForm.type === 'link'
                            ? createAttachment.mutateAsync({
                                attachmentType: 'link',
                                title: resolvedTitle.title,
                                url: attachmentForm.url.trim(),
                              })
                            : createAttachment.mutateAsync({
                                attachmentType: 'file',
                                title: resolvedTitle.title,
                                file: attachmentForm.file as File,
                              });

                        void request
                          .then(() => {
                            addToast({ title: 'Attachment added' });
                            setAttachmentForm({ type: 'link', title: '', url: '', file: null });
                          })
                          .catch((error: unknown) => {
                            addToast({
                              title: 'Attachment failed',
                              description: error instanceof Error ? error.message : 'Unable to add attachment',
                              variant: 'error',
                            });
                          });
                      }}
                    >
                      Add Attachment
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {(attachmentsQuery.data?.data ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No attachments yet.</p>
                    ) : (
                      (attachmentsQuery.data?.data ?? []).map((attachment) => (
                        <div key={attachment.id} className="flex items-center justify-between rounded-md border p-3">
                          <div>
                            {attachment.attachment_type === 'link' && attachment.url ? (
                              <Link href={attachment.url} target="_blank" className={ATTACHMENT_CHIP_CLASS}>
                                <Paperclip className="h-3 w-3 shrink-0" />
                                <span className="truncate">{attachment.title.trim() || 'Open link'}</span>
                              </Link>
                            ) : attachment.signed_url ? (
                              <Link href={attachment.signed_url} target="_blank" className={ATTACHMENT_CHIP_CLASS}>
                                <Paperclip className="h-3 w-3 shrink-0" />
                                <span className="truncate">{attachment.title.trim() || 'Download file'}</span>
                              </Link>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                                <Paperclip className="h-3 w-3 shrink-0" />
                                <span className="truncate">{attachment.title.trim() || 'File unavailable'}</span>
                              </span>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              void deleteAttachment
                                .mutateAsync(attachment.id)
                                .catch((error: unknown) =>
                                  addToast({
                                    title: 'Delete failed',
                                    description: error instanceof Error ? error.message : 'Unable to remove attachment',
                                    variant: 'error',
                                  })
                                );
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </SlidePanelSection>
              </>
            )}
          </SlidePanelBody>
          <SlidePanelFooter className="justify-between">
            <Button
              variant="destructive"
              disabled={!selectedTaskId || deleteTask.isPending}
              onClick={() => {
                if (!selectedTaskId) return;
                void deleteTask
                  .mutateAsync(selectedTaskId)
                  .then(() => {
                    addToast({ title: 'Task deleted' });
                    setDetailOpen(false);
                    setSelectedTaskId(null);
                  })
                  .catch((error: unknown) =>
                    addToast({
                      title: 'Delete failed',
                      description: error instanceof Error ? error.message : 'Unable to delete task',
                      variant: 'error',
                    })
                  );
              }}
            >
              Delete
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
              <Button
                disabled={updateTask.isPending || !selectedTaskId || !editForm.title.trim()}
                onClick={() => {
                  if (!selectedTaskId) return;
                  void updateTask
                    .mutateAsync({
                      title: editForm.title.trim(),
                      statusId: editForm.statusId,
                      priorityId: editForm.priorityId,
                      categoryId: editForm.categoryId === NONE_VALUE ? null : editForm.categoryId,
                      assignedTo: editForm.assignedTo === NONE_VALUE ? null : editForm.assignedTo,
                      dueDate: editForm.dueDate || null,
                      dateGiven: editForm.dateGiven || null,
                      blockerReason: editForm.blockerReason || null,
                      waitingOn: editForm.waitingOn || null,
                      notes: editForm.notes || null,
                    })
                    .then(() => addToast({ title: 'Task updated' }))
                    .catch((error: unknown) =>
                      addToast({
                        title: 'Update failed',
                        description: error instanceof Error ? error.message : 'Unable to update task',
                        variant: 'error',
                      })
                    );
                }}
              >
                Save Changes
              </Button>
            </div>
          </SlidePanelFooter>
        </SlidePanelContent>
      </SlidePanel>
    </div>
  );
}

'use client';

import { ConfirmActionDialog } from '@/components/ConfirmActionDialog';
import { useAuth } from '@/contexts/AuthContext';
import {
  type ChecklistItemRecord,
  type MilestoneRecord,
  useCreateChecklistItem,
  useCreateProjectDocumentation,
  useCreateMilestone,
  useDeleteProjectDocumentation,
  useDeleteChecklistItem,
  useDeleteMilestone,
  useDeleteProject,
  useCompleteMilestone,
  useMilestoneChecklist,
  type ProjectDocumentationRecord,
  useProjectDocumentation,
  useProject,
  useProjectMilestones,
  useUpdateChecklistItem,
  useUpdateMilestone,
  useUpdateProject,
} from '@/hooks/useProjects';
import {
  Badge,
  Button,
  Card,
  CardContent,
  ChecklistItem,
  ContributorAvatarStack,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  HealthPill,
  Input,
  Label,
  MilestoneStatusBadge,
  Progress,
  ProgressRing,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Textarea,
  useToast,
  FileDropZone,
} from '@hr-portal/ui';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Link2,
  Pencil,
  Plus,
  Upload,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type FormEvent } from 'react';

function isIsoAfter(left: string, right: string): boolean {
  return left > right;
}

function getProjectDateRangeError(startDate: string, targetEndDate: string): string | null {
  if (isIsoAfter(startDate, targetEndDate)) {
    return 'Target end date must be on or after the start date';
  }

  return null;
}

function getMilestoneDateWindowError(
  periodStart: string,
  periodEnd: string,
  dueDate: string,
  projectEndDate?: string
): string | null {
  if (isIsoAfter(periodStart, periodEnd)) {
    return 'End date must be on or after the start date';
  }

  if (isIsoAfter(dueDate, periodEnd)) {
    return 'Due date cannot be beyond the end date';
  }

  if (projectEndDate && isIsoAfter(dueDate, projectEndDate)) {
    return `Due date cannot be beyond the project end date (${projectEndDate})`;
  }

  return null;
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = params?.id ?? '';
  const { user } = useAuth();
  const { addToast } = useToast();
  const deleteProject = useDeleteProject();

  const { data: projectResp, isLoading: loadingProject } = useProject(projectId);
  const { data: milestonesResp, isLoading: loadingMilestones } = useProjectMilestones(projectId);
  const { data: projectDocumentationResp, isLoading: loadingDocumentation } =
    useProjectDocumentation(projectId);
  const createDocumentation = useCreateProjectDocumentation();
  const deleteDocumentation = useDeleteProjectDocumentation();
  const project = projectResp?.data;
  const milestones = milestonesResp?.data ?? [];
  const documentation = projectDocumentationResp?.data ?? [];

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isReadOnlyAdminView = isAdmin;
  const isLead = !!project && project.lead_user_id === user?.id;
  const canEditProject = isLead || (isAdmin && !isReadOnlyAdminView);
  const canAddDocumentation =
    !!project &&
    !isReadOnlyAdminView &&
    (canEditProject ||
      project.created_by === user?.id ||
      project.supervisor_id === user?.id ||
      project.contributors.some((contributor) => contributor.user_id === user?.id));
  const projectListPath = isAdmin ? '/admin/projects' : '/projects';

  const [docLink, setDocLink] = useState('');
  const [docLabel, setDocLabel] = useState('');
  const [docFiles, setDocFiles] = useState<File[]>([]);
  const [activeTab, setActiveTab] = useState<'milestones' | 'documentation'>('milestones');

  async function handleAddDocumentationLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await createDocumentation.mutateAsync({
        projectId,
        documentationType: 'link',
        content: docLink,
        label: docLabel || null,
      });
      setDocLink('');
      setDocLabel('');
      addToast({ title: 'Documentation link added', variant: 'success' });
    } catch (error) {
      addToast({
        title: 'Failed to add documentation link',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'error',
      });
    }
  }

  async function handleUploadDocumentationFiles() {
    if (docFiles.length === 0) {
      return;
    }

    try {
      for (const file of docFiles) {
        await createDocumentation.mutateAsync({
          projectId,
          documentationType: 'file',
          label: docLabel || null,
          file,
        });
      }
      setDocFiles([]);
      setDocLabel('');
      addToast({ title: 'Documentation file uploaded', variant: 'success' });
    } catch (error) {
      addToast({
        title: 'Failed to upload documentation file',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'error',
      });
    }
  }

  async function handleDeleteDocumentation(item: ProjectDocumentationRecord) {
    try {
      await deleteDocumentation.mutateAsync({
        projectId,
        documentationId: item.id,
      });
      addToast({ title: 'Documentation removed', variant: 'success' });
    } catch (error) {
      addToast({
        title: 'Failed to remove documentation',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'error',
      });
    }
  }

  // Group milestones: monthly with their weekly children
  const grouped = useMemo(() => {
    const months = milestones
      .filter((m) => m.period_type === 'month')
      .sort((a, b) => a.period_start.localeCompare(b.period_start));
    return months.map((month) => ({
      month,
      weeks: milestones
        .filter((m) => m.period_type === 'week' && m.parent_milestone_id === month.id)
        .sort((a, b) => a.period_start.localeCompare(b.period_start)),
    }));
  }, [milestones]);

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [createParent, setCreateParent] = useState<MilestoneRecord | null>(null);
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false);

  async function handleDeleteProject() {
    try {
      await deleteProject.mutateAsync({ projectId });
      addToast({ title: 'Project deleted', variant: 'success' });
      router.push(projectListPath);
    } catch (error) {
      addToast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'error',
      });
    }
  }

  if (loadingProject) {
    return (
      <div className="p-6">
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <p className="text-sm text-zinc-500">Project not found.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div className="flex items-start gap-4">
          <Link
            href={projectListPath}
            className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <ProgressRing value={project.progress_pct} size={64} strokeWidth={6} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                {project.name}
              </h1>
              <HealthPill health={project.health} />
              <Badge variant="outline" className="capitalize">
                {project.status.replace('_', ' ')}
              </Badge>
            </div>
            {project.description ? (
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {project.description}
              </p>
            ) : null}
            <div className="mt-2 flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
              <span>
                {new Date(project.start_date).toLocaleDateString()} →{' '}
                {new Date(project.target_end_date).toLocaleDateString()}
              </span>
              <span className="font-medium text-amber-600">
                {project.earned_points ?? 0} earned points
              </span>
              {project.points_total > 0 ? (
                <span>{project.points_total} point budget</span>
              ) : null}
              {project.contributors.length > 0 ? (
                <ContributorAvatarStack
                  contributors={project.contributors.map((c) => ({ userId: c.user_id }))}
                />
              ) : null}
            </div>
          </div>
          {canEditProject ? (
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="outline" onClick={() => setDeleteProjectOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Project
              </Button>
              <Button variant="outline" onClick={() => setEditProjectOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Project
              </Button>
              <Button
                onClick={() => {
                  setCreateParent(null);
                  setCreateOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Milestone
              </Button>
            </div>
          ) : null}
        </div>
        {isReadOnlyAdminView ? (
          <div className="mt-2">
            <Badge variant="outline">Read-only admin view</Badge>
          </div>
        ) : null}
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-6">
          <div className="inline-flex w-fit items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900">
            <Button
              size="sm"
              variant={activeTab === 'milestones' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('milestones')}
            >
              Milestones
              <Badge variant="secondary" className="ml-2">
                {grouped.length}
              </Badge>
            </Button>
            <Button
              size="sm"
              variant={activeTab === 'documentation' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('documentation')}
            >
              Documentation
              <Badge variant="secondary" className="ml-2">
                {documentation.length}
              </Badge>
            </Button>
          </div>

          {activeTab === 'documentation' ? (
            <Card>
              <CardContent className="space-y-4 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      Project Documentations
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Add links or file attachments as supporting documentation for this project.
                    </p>
                  </div>
                  <Badge variant="outline">
                    {documentation.length} item{documentation.length === 1 ? '' : 's'}
                  </Badge>
                </div>

                {canAddDocumentation ? (
                  <div className="grid gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40 md:grid-cols-2">
                    <form className="space-y-2" onSubmit={handleAddDocumentationLink}>
                      <Label htmlFor="project-doc-link">Documentation link</Label>
                      <Input
                        id="project-doc-link"
                        value={docLink}
                        onChange={(event) => setDocLink(event.target.value)}
                        placeholder="https://docs.google.com/..."
                      />
                      <Input
                        value={docLabel}
                        onChange={(event) => setDocLabel(event.target.value)}
                        placeholder="Optional label"
                      />
                      <Button type="submit" size="sm" disabled={createDocumentation.isPending}>
                        <Link2 className="mr-2 h-4 w-4" />
                        Add Link
                      </Button>
                    </form>

                    <div className="space-y-2">
                      <Label>Upload documentation file</Label>
                      <FileDropZone
                        onFilesSelected={(files) =>
                          setDocFiles((current) => [...current, ...files])
                        }
                        selectedFiles={docFiles}
                        onRemoveFile={(index) => {
                          setDocFiles((currentFiles) =>
                            currentFiles.filter((_, fileIndex) => fileIndex !== index)
                          );
                        }}
                        multiple
                        maxFiles={10}
                        maxSizeMB={10}
                        compact
                        label="Drop documentation files or browse"
                        formatHint="PDF, DOC, DOCX, XLSX, PPTX, PNG, JPG, WEBP - max 10 MB each"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={docFiles.length === 0 || createDocumentation.isPending}
                        onClick={() => {
                          void handleUploadDocumentationFiles();
                        }}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Files
                      </Button>
                    </div>
                  </div>
                ) : null}

                {loadingDocumentation ? (
                  <Skeleton className="h-24" />
                ) : documentation.length === 0 ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    No project documentation has been added yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {documentation.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="capitalize">
                              {item.documentation_type}
                            </Badge>
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                              {item.label || item.file_name || 'Project documentation'}
                            </p>
                          </div>
                          {item.documentation_type === 'file' ? (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {item.file_name || 'File'}
                              {item.file_size
                                ? ` - ${Math.max(1, Math.round(item.file_size / 1024))} KB`
                                : ''}
                            </p>
                          ) : (
                            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                              {item.content}
                            </p>
                          )}
                          <p className="text-xs text-zinc-400 dark:text-zinc-500">
                            Added by {item.submitted_by_name || 'Unknown'} on{' '}
                            {new Date(item.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.access_url ? (
                            <a href={item.access_url} target="_blank" rel="noreferrer">
                              <Button variant="outline" size="sm">
                                {item.documentation_type === 'file' ? (
                                  <FileText className="mr-2 h-4 w-4" />
                                ) : (
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                )}
                                Open
                              </Button>
                            </a>
                          ) : null}
                          {canAddDocumentation ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                void handleDeleteDocumentation(item);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : loadingMilestones ? (
            <div>
              <Skeleton className="h-64" />
            </div>
          ) : grouped.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-center">
              <div>
                <p className="text-sm text-zinc-500">No milestones yet.</p>
                {canEditProject ? (
                  <Button
                    className="mt-2"
                    size="sm"
                    onClick={() => {
                      setCreateParent(null);
                      setCreateOpen(true);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add first milestone
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {grouped.map(({ month, weeks }) => (
                <MonthColumn
                  key={month.id}
                  month={month}
                  weeks={weeks}
                  projectId={projectId}
                  canEdit={canEditProject}
                  projectEndDate={project.target_end_date}
                  onAddWeek={() => {
                    setCreateParent(month);
                    setCreateOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <CreateMilestoneDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={projectId}
        parent={createParent}
        projectEndDate={project.target_end_date}
        onCreated={() => {
          setCreateOpen(false);
          addToast({ title: 'Milestone created', variant: 'success' });
        }}
      />
      <EditProjectDialog
        open={editProjectOpen}
        onOpenChange={setEditProjectOpen}
        project={project}
      />
      <ConfirmActionDialog
        open={deleteProjectOpen}
        onOpenChange={setDeleteProjectOpen}
        title="Delete project?"
        description="This removes the project from active views. Existing milestones and history stay in the database for audit purposes."
        confirmLabel="Delete project"
        isPending={deleteProject.isPending}
        onConfirm={() => {
          void handleDeleteProject();
        }}
      />
    </div>
  );
}

interface MonthColumnProps {
  month: MilestoneRecord;
  weeks: MilestoneRecord[];
  projectId: string;
  canEdit: boolean;
  projectEndDate: string;
  onAddWeek: () => void;
}

function MonthColumn({
  month,
  weeks,
  projectId,
  canEdit,
  projectEndDate,
  onAddWeek,
}: MonthColumnProps) {
  const { addToast } = useToast();
  const completeMutation = useCompleteMilestone();
  const deleteMilestone = useDeleteMilestone();
  const { data: monthChecklistResp, isLoading: loadingMonthChecklist } = useMilestoneChecklist(
    month.id
  );
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function handleComplete() {
    try {
      await completeMutation.mutateAsync({ milestoneId: month.id, projectId });
      addToast({ title: 'Milestone completed', variant: 'success' });
    } catch (e) {
      addToast({
        title: 'Complete failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'error',
      });
    }
  }

  async function handleDelete() {
    try {
      await deleteMilestone.mutateAsync({ milestoneId: month.id, projectId });
      setDeleteOpen(false);
      addToast({ title: 'Milestone deleted', variant: 'success' });
    } catch (error) {
      addToast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'error',
      });
    }
  }

  const canComplete = canEdit && month.status !== 'approved' && month.progress_pct >= 100;
  const canManage = canEdit && month.status !== 'approved';
  const [showMonthTasks, setShowMonthTasks] = useState(weeks.length === 0 || !canManage);
  const monthChecklistItems = monthChecklistResp?.data ?? [];

  const maxWeeks = useMemo(() => {
    const start = new Date(month.period_start);
    const end = new Date(month.period_end);
    const totalDays =
      Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.floor(totalDays / 7);
  }, [month.period_start, month.period_end]);

  useEffect(() => {
    if (weeks.length === 0 || !canManage) {
      setShowMonthTasks(true);
    }
  }, [canManage, weeks.length]);

  return (
    <>
      <div className="flex w-80 shrink-0 flex-col rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="group relative border-b border-zinc-200 p-3 dark:border-zinc-800">
          {canManage ? (
            <div className="absolute right-3 top-3 z-10 flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => setEditOpen(true)}
                aria-label="Edit milestone"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-zinc-500 hover:text-red-600"
                onClick={() => setDeleteOpen(true)}
                aria-label="Delete milestone"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
          <div className="pr-16">
            <h3 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {month.title}
            </h3>
            <p className="text-xs text-zinc-500">
              Due {new Date(month.due_date).toLocaleDateString()}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Progress value={month.progress_pct} className="h-1.5 flex-1" />
              <span className="text-xs tabular-nums text-zinc-500">
                {Math.round(month.progress_pct)}%
              </span>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <MilestoneStatusBadge status={month.status} />
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {canComplete ? (
              <Button size="sm" onClick={handleComplete} disabled={completeMutation.isPending}>
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Complete
              </Button>
            ) : null}
            {canEdit && month.status !== 'approved' && maxWeeks >= 1 ? (
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="outline" onClick={onAddWeek}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Week
                </Button>
                <span
                  className={
                    weeks.length >= maxWeeks
                      ? 'text-xs tabular-nums text-amber-500 dark:text-amber-400'
                      : 'text-xs tabular-nums text-zinc-400 dark:text-zinc-500'
                  }
                >
                  {weeks.length}&thinsp;/&thinsp;{maxWeeks}
                </span>
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {weeks.length === 0 ? (
            <ChecklistSection
              milestone={month}
              projectId={projectId}
              canEdit={canManage}
            />
          ) : (
            <>
              {weeks.map((week) => (
                <WeekCard
                  key={week.id}
                  week={week}
                  projectId={projectId}
                  canEdit={canManage}
                  projectEndDate={projectEndDate}
                />
              ))}
              {canManage ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowMonthTasks((value) => !value)}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add Task
                </Button>
              ) : null}
              {showMonthTasks && (canManage || loadingMonthChecklist || monthChecklistItems.length > 0) ? (
                <Card className="border-dashed border-zinc-200 dark:border-zinc-800">
                  <CardContent className="p-3">
                    <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Tasks for {month.title}
                    </p>
                    <ChecklistSection
                      milestone={month}
                      projectId={projectId}
                      canEdit={canManage}
                      showEmptyState={false}
                    />
                  </CardContent>
                </Card>
              ) : null}
            </>
          )}
        </div>
      </div>
      <EditMilestoneDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        projectId={projectId}
        milestone={month}
        projectEndDate={projectEndDate}
      />
      <ConfirmActionDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete milestone?"
        description="Deleting a monthly milestone also removes any nested weeks and checklist items beneath it."
        confirmLabel="Delete milestone"
        isPending={deleteMilestone.isPending}
        onConfirm={() => {
          void handleDelete();
        }}
      />
    </>
  );
}

function WeekCard({
  week,
  projectId,
  canEdit,
  projectEndDate,
}: {
  week: MilestoneRecord;
  projectId: string;
  canEdit: boolean;
  projectEndDate: string;
}) {
  const [open, setOpen] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteMilestone = useDeleteMilestone();
  const { addToast } = useToast();

  async function handleDelete() {
    try {
      await deleteMilestone.mutateAsync({ milestoneId: week.id, projectId });
      setDeleteOpen(false);
      addToast({ title: 'Milestone deleted', variant: 'success' });
    } catch (error) {
      addToast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'error',
      });
    }
  }

  const canManage = canEdit && week.status !== 'approved';

  return (
    <>
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardContent className="p-3">
          <div className="group relative">
            {canManage ? (
              <div className="absolute right-0 top-0 z-10 flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => setEditOpen(true)}
                  aria-label="Edit week milestone"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-zinc-500 hover:text-red-600"
                  onClick={() => setDeleteOpen(true)}
                  aria-label="Delete week milestone"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex w-full flex-col gap-2 text-left"
            >
              <div className="flex items-start justify-between gap-2 pr-14">
                <div className="flex min-w-0 items-center gap-2">
                  {open ? (
                    <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
                  )}
                  <span className="truncate text-xs font-medium text-zinc-800 dark:text-zinc-200">
                    {week.title}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 pl-5">
                <Progress value={week.progress_pct} className="h-1.5 flex-1" />
                <span className="mt-2 text-xs tabular-nums text-zinc-500">
                  {Math.round(week.progress_pct)}%
                </span>
              </div>
            </button>
          </div>
          {open ? (
            <div className="mt-2 border-t border-zinc-100 pt-2 dark:border-zinc-800">
              <ChecklistSection milestone={week} projectId={projectId} canEdit={canEdit} />
            </div>
          ) : null}
        </CardContent>
      </Card>
      <EditMilestoneDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        projectId={projectId}
        milestone={week}
        projectEndDate={projectEndDate}
      />
      <ConfirmActionDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete milestone?"
        description="Deleting this milestone also removes its checklist items."
        confirmLabel="Delete milestone"
        isPending={deleteMilestone.isPending}
        onConfirm={() => {
          void handleDelete();
        }}
      />
    </>
  );
}

function ChecklistSection({
  milestone,
  projectId,
  canEdit,
  showEmptyState = true,
}: {
  milestone: MilestoneRecord;
  projectId: string;
  canEdit: boolean;
  showEmptyState?: boolean;
}) {
  const { data, isLoading } = useMilestoneChecklist(milestone.id);
  const items = data?.data ?? [];
  const { addToast } = useToast();
  const updateItem = useUpdateChecklistItem();
  const deleteItem = useDeleteChecklistItem();
  const createItem = useCreateChecklistItem();
  const [newTitle, setNewTitle] = useState('');
  const [editingItem, setEditingItem] = useState<ChecklistItemRecord | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<ChecklistItemRecord | null>(null);

  function handleToggle(item: ChecklistItemRecord, next: 'todo' | 'done') {
    void updateItem.mutateAsync({
      itemId: item.id,
      milestoneId: milestone.id,
      projectId,
      status: next,
    });
  }

  function handleEdit(itemId: string) {
    const item = items.find((entry) => entry.id === itemId);
    if (item) {
      setEditingItem(item);
    }
  }

  function handleDelete(itemId: string) {
    const item = items.find((entry) => entry.id === itemId);
    if (item) {
      setDeleteCandidate(item);
    }
  }

  async function confirmDelete() {
    if (!deleteCandidate) {
      return;
    }

    try {
      await deleteItem.mutateAsync({
        itemId: deleteCandidate.id,
        milestoneId: milestone.id,
        projectId,
      });
      setDeleteCandidate(null);
      addToast({ title: 'Checklist item deleted', variant: 'success' });
    } catch (error) {
      addToast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'error',
      });
    }
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await createItem.mutateAsync({
      milestoneId: milestone.id,
      projectId,
      title: newTitle.trim(),
    });
    setNewTitle('');
  }

  return (
    <div>
      {isLoading ? (
        <Skeleton className="h-6" />
      ) : items.length === 0 && !canEdit && showEmptyState ? (
        <p className="px-1 text-xs text-zinc-400">No checklist items.</p>
      ) : (
        <div className="space-y-0.5">
          {items.map((it) => (
            <ChecklistItem
              key={it.id}
              id={it.id}
              title={it.title}
              status={it.status}
              onToggle={(_id, next) => handleToggle(it, next)}
              {...(canEdit ? { onEdit: handleEdit, onDelete: handleDelete } : {})}
              disabled={!canEdit}
            />
          ))}
        </div>
      )}
      {canEdit ? (
        <form onSubmit={handleAdd} className="mt-2 flex gap-1">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add item…"
            className="h-7 text-xs"
          />
          <Button type="submit" size="sm" variant="outline" disabled={!newTitle.trim()}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </form>
      ) : null}
      <EditChecklistItemDialog
        open={!!editingItem}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setEditingItem(null);
          }
        }}
        item={editingItem}
        milestoneId={milestone.id}
        projectId={projectId}
      />
      <ConfirmActionDialog
        open={!!deleteCandidate}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setDeleteCandidate(null);
          }
        }}
        title="Delete checklist item?"
        description={
          deleteCandidate ? `"${deleteCandidate.title}" will be permanently removed.` : ''
        }
        confirmLabel="Delete item"
        isPending={deleteItem.isPending}
        onConfirm={() => {
          void confirmDelete();
        }}
      />
    </div>
  );
}

function EditProjectDialog({
  open,
  onOpenChange,
  project,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: NonNullable<ReturnType<typeof useProject>['data']>['data'];
}) {
  const updateProject = useUpdateProject();
  const { addToast } = useToast();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');
  const [startDate, setStartDate] = useState(project.start_date);
  const [targetEndDate, setTargetEndDate] = useState(project.target_end_date);
  const [status, setStatus] = useState(project.status);
  const [pointsTotal, setPointsTotal] = useState(String(project.points_total ?? 0));

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(project.name);
    setDescription(project.description ?? '');
    setStartDate(project.start_date);
    setTargetEndDate(project.target_end_date);
    setStatus(project.status);
    setPointsTotal(String(project.points_total ?? 0));
  }, [open, project]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!name.trim() || !startDate || !targetEndDate) {
      addToast({ title: 'Fill all fields', variant: 'warning' });
      return;
    }

    const rangeError = getProjectDateRangeError(startDate, targetEndDate);
    if (rangeError) {
      addToast({ title: 'Invalid date range', description: rangeError, variant: 'warning' });
      return;
    }

    try {
      await updateProject.mutateAsync({
        projectId: project.id,
        name: name.trim(),
        description: description.trim() || null,
        startDate,
        targetEndDate,
        status,
        pointsTotal: Math.max(0, Number.parseInt(pointsTotal, 10) || 0),
      });
      addToast({ title: 'Project updated', variant: 'success' });
      onOpenChange(false);
    } catch (error) {
      addToast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'error',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>Update the project details and target window.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-edit-name">Project name</Label>
            <Input
              id="project-edit-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-edit-description">Description</Label>
            <Textarea
              id="project-edit-description"
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="project-edit-status">Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
                <SelectTrigger id="project-edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-edit-start">Start date</Label>
              <Input
                id="project-edit-start"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                max={targetEndDate || undefined}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-edit-end">Target end date</Label>
              <Input
                id="project-edit-end"
                type="date"
                value={targetEndDate}
                onChange={(event) => setTargetEndDate(event.target.value)}
                min={startDate || undefined}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-edit-points">Points budget</Label>
            <Input
              id="project-edit-points"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={pointsTotal}
              onChange={(event) => setPointsTotal(event.target.value)}
              placeholder="0"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateProject.isPending}>
              {updateProject.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditMilestoneDialog({
  open,
  onOpenChange,
  projectId,
  milestone,
  projectEndDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  milestone: MilestoneRecord;
  projectEndDate?: string;
}) {
  const updateMilestone = useUpdateMilestone();
  const { addToast } = useToast();
  const [title, setTitle] = useState(milestone.title);
  const [periodStart, setPeriodStart] = useState(milestone.period_start);
  const [periodEnd, setPeriodEnd] = useState(milestone.period_end);
  const [dueDate, setDueDate] = useState(milestone.due_date);

  useEffect(() => {
    if (!open) {
      return;
    }

    setTitle(milestone.title);
    setPeriodStart(milestone.period_start);
    setPeriodEnd(milestone.period_end);
    setDueDate(milestone.due_date);
  }, [open, milestone]);

  useEffect(() => {
    if (!periodEnd && !projectEndDate) return;
    const effectiveMax = periodEnd && projectEndDate
      ? (periodEnd < projectEndDate ? periodEnd : projectEndDate)
      : periodEnd || projectEndDate;
    if (dueDate && effectiveMax && isIsoAfter(dueDate, effectiveMax)) {
      setDueDate(effectiveMax);
    }
  }, [dueDate, periodEnd, projectEndDate]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!title.trim() || !periodStart || !periodEnd || !dueDate) {
      addToast({ title: 'Fill all fields', variant: 'warning' });
      return;
    }

    const dateError = getMilestoneDateWindowError(periodStart, periodEnd, dueDate, projectEndDate);
    if (dateError) {
      addToast({ title: 'Invalid milestone dates', description: dateError, variant: 'warning' });
      return;
    }

    try {
      await updateMilestone.mutateAsync({
        milestoneId: milestone.id,
        projectId,
        title: title.trim(),
        periodStart,
        periodEnd,
        dueDate,
      });
      addToast({ title: 'Milestone updated', variant: 'success' });
      onOpenChange(false);
    } catch (error) {
      addToast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'error',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {milestone.period_type === 'month' ? 'Edit Monthly Milestone' : 'Edit Weekly Milestone'}
          </DialogTitle>
          <DialogDescription>Update the title and schedule for this milestone.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor={`milestone-edit-title-${milestone.id}`}>Title</Label>
            <Input
              id={`milestone-edit-title-${milestone.id}`}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor={`milestone-edit-start-${milestone.id}`}>Start</Label>
              <Input
                id={`milestone-edit-start-${milestone.id}`}
                type="date"
                value={periodStart}
                onChange={(event) => setPeriodStart(event.target.value)}
                max={periodEnd || undefined}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`milestone-edit-end-${milestone.id}`}>End</Label>
              <Input
                id={`milestone-edit-end-${milestone.id}`}
                type="date"
                value={periodEnd}
                onChange={(event) => setPeriodEnd(event.target.value)}
                min={periodStart || undefined}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`milestone-edit-due-${milestone.id}`}>Due</Label>
              <Input
                id={`milestone-edit-due-${milestone.id}`}
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                min={periodStart || undefined}
                max={
                  periodEnd && projectEndDate
                    ? (periodEnd < projectEndDate ? periodEnd : projectEndDate)
                    : periodEnd || projectEndDate || undefined
                }
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMilestone.isPending}>
              {updateMilestone.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditChecklistItemDialog({
  open,
  onOpenChange,
  item,
  milestoneId,
  projectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ChecklistItemRecord | null;
  milestoneId: string;
  projectId: string;
}) {
  const updateItem = useUpdateChecklistItem();
  const { addToast } = useToast();
  const [title, setTitle] = useState(item?.title ?? '');

  useEffect(() => {
    if (!open || !item) {
      return;
    }

    setTitle(item.title);
  }, [item, open]);

  if (!item) {
    return null;
  }

  const currentItem = item;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!title.trim()) {
      addToast({ title: 'Title is required', variant: 'warning' });
      return;
    }

    try {
      await updateItem.mutateAsync({
        itemId: currentItem.id,
        milestoneId,
        projectId,
        title: title.trim(),
      });
      addToast({ title: 'Checklist item updated', variant: 'success' });
      onOpenChange(false);
    } catch (error) {
      addToast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'error',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Checklist Item</DialogTitle>
          <DialogDescription>Update the title for this checklist item.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor={`checklist-edit-${item.id}`}>Title</Label>
            <Input
              id={`checklist-edit-${currentItem.id}`}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateItem.isPending}>
              {updateItem.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateMilestoneDialog({
  open,
  onOpenChange,
  projectId,
  parent,
  projectEndDate,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  parent: MilestoneRecord | null;
  projectEndDate?: string;
  onCreated: () => void;
}) {
  const create = useCreateMilestone();
  const { addToast } = useToast();
  const periodType: 'month' | 'week' = parent ? 'week' : 'month';
  const today = new Date().toISOString().slice(0, 10);
  const [title, setTitle] = useState('');
  const [periodStart, setPeriodStart] = useState(today);
  const [periodEnd, setPeriodEnd] = useState('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (!open) {
      return;
    }

    setTitle('');
    setPeriodStart(today);
    setPeriodEnd('');
    setDueDate('');
  }, [open, today]);

  // Clamp dueDate to not exceed periodEnd or projectEndDate
  useEffect(() => {
    if (!periodEnd && !projectEndDate) return;
    const effectiveMax = periodEnd && projectEndDate
      ? (periodEnd < projectEndDate ? periodEnd : projectEndDate)
      : periodEnd || projectEndDate;
    if (dueDate && effectiveMax && isIsoAfter(dueDate, effectiveMax)) {
      setDueDate(effectiveMax);
    }
  }, [dueDate, periodEnd, projectEndDate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!title.trim() || !periodStart || !periodEnd || !dueDate) {
      addToast({ title: 'Fill all fields', variant: 'warning' });
      return;
    }

    const dateError = getMilestoneDateWindowError(periodStart, periodEnd, dueDate, projectEndDate);
    if (dateError) {
      addToast({ title: 'Invalid milestone dates', description: dateError, variant: 'warning' });
      return;
    }

    try {
      await create.mutateAsync({
        projectId,
        parentMilestoneId: parent?.id ?? null,
        periodType,
        title: title.trim(),
        periodStart,
        periodEnd,
        dueDate,
      });
      setTitle('');
      setPeriodEnd('');
      setDueDate('');
      onCreated();
    } catch (err) {
      addToast({
        title: 'Create failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'error',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{parent ? `Add Week to "${parent.title}"` : 'Add Milestone'}</DialogTitle>
          <DialogDescription>
            {parent
              ? 'Weekly sub-milestones can be broken down into smaller, trackable units.'
              : 'Each milestone can be completed once all of its checklist items are done.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="ms-title">Title</Label>
            <Input
              id="ms-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="ms-start">Start</Label>
              <Input
                id="ms-start"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                max={periodEnd || projectEndDate || undefined}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ms-end">End</Label>
              <Input
                id="ms-end"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                min={periodStart || undefined}
                max={projectEndDate || undefined}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ms-due">Due</Label>
              <Input
                id="ms-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={periodStart || undefined}
                max={
                  periodEnd && projectEndDate
                    ? (periodEnd < projectEndDate ? periodEnd : projectEndDate)
                    : periodEnd || projectEndDate || undefined
                }
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

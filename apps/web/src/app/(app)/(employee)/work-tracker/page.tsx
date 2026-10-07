'use client';

import { TrackerPagination } from '@/components/data-display/TrackerPagination';
import { TaskKanbanBoard, type TaskStatusDB } from '@/components/tasks';
import { WorkTrackerSectionNav } from '@/components/work-tracker/WorkTrackerSectionNav';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateTask } from '@/hooks/useCreateTask';
import { useProjectMilestones } from '@/hooks/useProjects';
import { useTaskAssignees } from '@/hooks/useTaskAssignees';
import { useTasks } from '@/hooks/useTasks';
import { useUpdateTask } from '@/hooks/useUpdateTask';
import { useUpdateTaskStatus } from '@/hooks/useUpdateTask';
import {
  type PersonWorkSummary,
  type ProjectWorkSummary,
  type WorkItem,
  type WorkTrackerRange,
  type WorkTrackerScope,
  useWorkTracker,
} from '@/hooks/useWorkTracker';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  EmptyState,
  HealthPill,
  Input,
  Label,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Textarea,
} from '@hr-portal/ui';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FolderKanban,
  ListTodo,
  Plus,
  Search,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

const TRACKER_PAGE_SIZE = 10;

type WorkTrackerView = 'team' | 'roadmap' | 'execution';

function formatLabel(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatLastActive(value: string | null): string {
  if (!value) return 'No activity recorded';
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Manila',
  }).format(new Date(value));
}

function withWorkTrackerReturn(href: string): string {
  const separator = href.includes('?') ? '&' : '?';
  return `${href}${separator}returnTo=${encodeURIComponent('/work-tracker')}`;
}

export default function WorkTrackerPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const requestedView = searchParams.get('view');
  const view: WorkTrackerView =
    requestedView === 'roadmap' || requestedView === 'execution' ? requestedView : 'team';
  const canViewTeam = user?.role === 'admin' || user?.role === 'super_admin';
  const [scope, setScope] = useState<WorkTrackerScope>(canViewTeam ? 'team' : 'mine');
  const [days, setDays] = useState<WorkTrackerRange>(30);
  const [workType, setWorkType] = useState<'all' | 'project' | 'task'>('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [personDialogOpen, setPersonDialogOpen] = useState(false);
  const { data, isLoading, isError } = useWorkTracker(scope, days);
  const hasLoadedData = !(isLoading || isError);

  const selectedPerson = useMemo(() => {
    if (scope === 'mine') return data?.person ?? null;
    const people = data?.people ?? [];
    return people.find((person) => person.userId === selectedUserId) ?? people[0] ?? null;
  }, [data, scope, selectedUserId]);

  const items = (selectedPerson?.items ?? []).filter(
    (item) => workType === 'all' || item.source === workType
  );
  const canEditTasks = scope === 'mine' || user?.role === 'super_admin' || user?.role === 'admin';

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Work Tracker</h1>
          <p className="text-sm text-muted-foreground">
            Projects, assigned tasks, progress, risks, and Control Hub activity in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/projects/new?returnTo=${encodeURIComponent('/work-tracker')}`}>
              <FolderKanban className="mr-2 h-4 w-4" />
              New project
            </Link>
          </Button>
          <Button asChild>
            <Link href="/work-tracker?view=execution">
              <Plus className="mr-2 h-4 w-4" />
              Execution board
            </Link>
          </Button>
        </div>
      </header>

      <WorkTrackerSectionNav
        current={view === 'roadmap' ? 'projects' : view === 'execution' ? 'tasks' : 'overview'}
      />

      {view === 'team' ? (
        <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={scope === 'mine' ? 'default' : 'outline'}
              onClick={() => setScope('mine')}
            >
              My work
            </Button>
            {canViewTeam ? (
              <Button
                size="sm"
                variant={scope === 'team' ? 'default' : 'outline'}
                onClick={() => setScope('team')}
              >
                <Users className="mr-2 h-4 w-4" />
                Team visibility
              </Button>
            ) : null}
          </div>
          <Select
            value={String(days)}
            onValueChange={(value) => setDays(Number(value) as WorkTrackerRange)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {view === 'team' && isLoading ? <TrackerSkeleton /> : null}
      {view === 'team' && isError ? (
        <EmptyState
          icon={<AlertTriangle className="h-10 w-10" />}
          title="Work tracker unavailable"
          description="The combined work and activity summary could not be loaded."
        />
      ) : null}

      {view === 'team' && hasLoadedData && scope === 'team' ? (
        <TeamTable
          people={data?.people ?? []}
          usageAvailable={data?.usageAvailable ?? true}
          selectedUserId={selectedPerson?.userId ?? null}
          onSelect={(userId) => {
            setSelectedUserId(userId);
            setPersonDialogOpen(true);
          }}
        />
      ) : null}

      {view === 'team' && hasLoadedData && selectedPerson && scope === 'mine' ? (
        <>
          <SummaryCards
            person={selectedPerson}
            days={days}
            usageAvailable={data?.usageAvailable ?? true}
          />
          <section className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Current work</h2>
                <p className="text-sm text-muted-foreground">
                  Projects contain the tasks that drive their progress and health.
                </p>
              </div>
              <Select
                value={workType}
                onValueChange={(value) => setWorkType(value as typeof workType)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All work</SelectItem>
                  <SelectItem value="project">Projects</SelectItem>
                  <SelectItem value="task">Tasks</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {items.length ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {items.map((item) => (
                  <WorkItemCard
                    key={`${item.source}-${item.id}`}
                    item={item}
                    canEditTask={canEditTasks}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<ListTodo className="h-10 w-10" />}
                title="No matching work"
                description="This person has no projects or tasks matching the selected view."
              />
            )}
          </section>
        </>
      ) : null}

      <Dialog open={personDialogOpen && scope === 'team'} onOpenChange={setPersonDialogOpen}>
        <DialogContent className="left-auto right-0 top-0 h-screen w-full max-w-2xl translate-x-0 translate-y-0 overflow-y-auto rounded-none sm:max-w-2xl">
          {selectedPerson ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedPerson.name}</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedPerson.department} · {formatLabel(selectedPerson.role)}
                </p>
              </DialogHeader>
              <SummaryCards
                person={selectedPerson}
                days={days}
                usageAvailable={data?.usageAvailable ?? true}
              />
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">Current project execution</h3>
                  <p className="text-xs text-muted-foreground">
                    Projects contain the tasks that drive their progress and health.
                  </p>
                </div>
                <Select
                  value={workType}
                  onValueChange={(value) => setWorkType(value as typeof workType)}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All work</SelectItem>
                    <SelectItem value="project">Projects</SelectItem>
                    <SelectItem value="task">Tasks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                {items.length ? (
                  items.map((item) => (
                    <WorkItemCard
                      key={`${item.source}-${item.id}`}
                      item={item}
                      canEditTask={canEditTasks}
                    />
                  ))
                ) : (
                  <EmptyState
                    icon={<ListTodo className="h-10 w-10" />}
                    title="No matching work"
                    description="This person has no work matching the selected view."
                  />
                )}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {view === 'roadmap' ? (
        <RoadmapView projects={data?.projects ?? []} isLoading={isLoading} isError={isError} />
      ) : null}
      {view === 'execution' ? (
        <ExecutionView
          canManageAll={user?.role === 'super_admin' || user?.role === 'admin'}
          initialProjectId={searchParams.get('project') ?? ''}
          initialAssigneeId={searchParams.get('assignee') ?? ''}
          initialSearch={searchParams.get('search') ?? ''}
          projectOptions={data?.projects ?? []}
        />
      ) : null}
    </div>
  );
}

function SummaryCards({
  person,
  days,
  usageAvailable,
}: {
  person: PersonWorkSummary;
  days: WorkTrackerRange;
  usageAvailable: boolean;
}) {
  const cards = [
    {
      label: 'Active projects',
      value: person.activeProjectCount,
      detail: `${person.averageProjectProgress}% average progress`,
      icon: FolderKanban,
    },
    {
      label: 'Open tasks',
      value: person.openTaskCount,
      detail: `${person.taskCompletionRate}% completed in ${days} days`,
      icon: ClipboardCheck,
    },
    {
      label: 'Needs attention',
      value: person.overdueCount + person.blockedCount,
      detail: `${person.overdueCount} overdue · ${person.blockedCount} blocked`,
      icon: AlertTriangle,
    },
    {
      label: 'Hub activity',
      value: usageAvailable ? `${person.activeDays}/${days}` : 'Unavailable',
      detail: usageAvailable
        ? `${person.sessionCount} sessions · ${formatLastActive(person.lastActiveAt)}`
        : 'Activity tracking data is temporarily unavailable.',
      icon: Clock3,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <card.icon className="h-4 w-4" />
              {card.label}
            </div>
            <p className="mt-2 text-2xl font-bold">{card.value}</p>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{card.detail}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TeamTable({
  people,
  usageAvailable,
  selectedUserId,
  onSelect,
}: {
  people: Array<PersonWorkSummary>;
  usageAvailable: boolean;
  selectedUserId: string | null;
  onSelect: (userId: string) => void;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(Math.ceil(people.length / TRACKER_PAGE_SIZE), 1);
  const visiblePeople = people.slice(
    (currentPage - 1) * TRACKER_PAGE_SIZE,
    currentPage * TRACKER_PAGE_SIZE
  );

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  if (!people.length) {
    return (
      <EmptyState
        icon={<Users className="h-10 w-10" />}
        title="No active staff"
        description="Active employees and associates will appear here."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Staff visibility</CardTitle>
        <p className="text-xs text-muted-foreground">
          {usageAvailable
            ? 'Activity indicates Control Hub use, not employee productivity.'
            : 'Work data is available, but activity tracking is temporarily unavailable.'}
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-y bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Staff member</th>
              <th className="px-4 py-3">Projects</th>
              <th className="px-4 py-3">Tasks</th>
              <th className="px-4 py-3">Attention</th>
              <th className="px-4 py-3">Active days</th>
              <th className="px-4 py-3">Last active</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {visiblePeople.map((person) => (
              <tr
                key={person.userId}
                className={`transition-colors hover:bg-muted/50 ${
                  selectedUserId === person.userId ? 'bg-primary/5' : ''
                }`}
              >
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="font-medium hover:underline"
                    onClick={() => onSelect(person.userId)}
                  >
                    {person.name}
                  </button>
                  <p className="text-xs text-muted-foreground">
                    {person.department} · {formatLabel(person.role)}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <p>{person.activeProjectCount} active</p>
                  <p className="text-xs text-muted-foreground">
                    {person.averageProjectProgress}% average
                  </p>
                </td>
                <td className="px-4 py-3">
                  <p>{person.openTaskCount} open</p>
                  <p className="text-xs text-muted-foreground">
                    {person.taskCompletionRate}% completed
                  </p>
                </td>
                <td className="px-4 py-3">
                  {person.overdueCount || person.blockedCount ? (
                    <Badge variant="destructive">
                      {person.overdueCount} overdue · {person.blockedCount} blocked
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">None</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {usageAvailable
                    ? `${person.activeDays} days · ${person.sessionCount} sessions`
                    : 'Unavailable'}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {usageAvailable ? formatLastActive(person.lastActiveAt) : 'Unavailable'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <TrackerPagination
          page={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </CardContent>
    </Card>
  );
}

function WorkItemCard({ item, canEditTask }: { item: WorkItem; canEditTask: boolean }) {
  if (item.source === 'project') {
    return (
      <Card>
        <CardContent className="space-y-3 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Badge variant="outline">Project · {formatLabel(item.projectRole)}</Badge>
              <Link
                href={withWorkTrackerReturn(item.href)}
                className="mt-2 block font-semibold hover:underline"
              >
                {item.title}
              </Link>
            </div>
            <Badge variant={item.health === 'overdue' ? 'destructive' : 'secondary'}>
              {formatLabel(item.health ?? item.status)}
            </Badge>
          </div>
          <Progress value={item.progressPct} />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatLabel(item.status)}</span>
            <span>{Math.round(item.progressPct)}%</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <TaskWorkItemCard item={item} canEdit={canEditTask} />;
}

function TaskWorkItemCard({
  item,
  canEdit,
}: {
  item: Extract<WorkItem, { source: 'task' }>;
  canEdit: boolean;
}) {
  const updateTask = useUpdateTask(item.id);
  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Badge variant="outline">Task · {formatLabel(item.priority)}</Badge>
            <Link
              href={withWorkTrackerReturn(item.href)}
              className="mt-2 block truncate font-semibold hover:underline"
            >
              {item.title}
            </Link>
            <p className="mt-1 text-xs text-muted-foreground">
              Project: {item.projectName || 'Ad-hoc / Internal Ops'}
            </p>
            {item.milestoneName ? (
              <p className="mt-1 text-xs text-muted-foreground">Milestone: {item.milestoneName}</p>
            ) : null}
            {item.status === 'blocked' && item.blockedReason ? (
              <p className="mt-2 rounded bg-rose-50 p-2 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                Blocker: {item.blockedReason}
              </p>
            ) : null}
          </div>
          {item.status === 'completed' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : null}
        </div>
        {canEdit ? (
          <Select
            value={item.status}
            disabled={updateTask.isPending}
            onValueChange={(status) => {
              const nextStatus = status as
                | 'pending'
                | 'in_progress'
                | 'blocked'
                | 'completed'
                | 'cancelled';
              const blockedReason =
                nextStatus === 'blocked'
                  ? window.prompt('What is blocking this task?')?.trim() || null
                  : undefined;
              if (nextStatus === 'blocked' && !blockedReason) return;
              updateTask.mutate({ status: nextStatus, blockedReason });
            }}
          >
            <SelectTrigger aria-label={`Update ${item.title} status`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="secondary">{formatLabel(item.status)}</Badge>
        )}
      </CardContent>
    </Card>
  );
}

function RoadmapView({
  projects,
  isLoading,
  isError,
}: {
  projects: Array<ProjectWorkSummary>;
  isLoading: boolean;
  isError: boolean;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(Math.ceil(projects.length / TRACKER_PAGE_SIZE), 1);
  const visibleProjects = projects.slice(
    (currentPage - 1) * TRACKER_PAGE_SIZE,
    currentPage * TRACKER_PAGE_SIZE
  );

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  if (isLoading) return <TrackerSkeleton />;
  if (isError) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-10 w-10" />}
        title="Project roadmap unavailable"
        description="Project health and task rollups could not be loaded."
      />
    );
  }
  if (!projects.length) {
    return (
      <EmptyState
        icon={<FolderKanban className="h-10 w-10" />}
        title="No projects yet"
        description="Create a project, then attach tasks to begin tracking progress."
      />
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Project Roadmap</h2>
        <p className="text-sm text-muted-foreground">
          Progress and health are computed from each project's child tasks.
        </p>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Health</th>
              <th className="px-4 py-3">Execution</th>
              <th className="px-4 py-3">Progress</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {visibleProjects.map((project) => (
              <tr key={project.id} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <Link
                    href={withWorkTrackerReturn(`/projects/${project.id}`)}
                    className="font-medium hover:underline"
                  >
                    {project.name}
                  </Link>
                  <p className="mt-1 max-w-md truncate text-xs text-muted-foreground">
                    {project.description || 'No description'}
                  </p>
                </td>
                <td className="px-4 py-3">{project.leadName || 'Unassigned'}</td>
                <td className="px-4 py-3">
                  {project.totalTasks ? (
                    <HealthPill
                      health={project.health as 'on_track' | 'at_risk' | 'overdue' | 'blocked'}
                    />
                  ) : (
                    <Badge variant="outline">No tasks</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/work-tracker?view=execution&project=${project.id}`}
                    className="font-medium hover:underline"
                  >
                    {project.completedTasks}/{project.totalTasks} tasks
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {project.blockedTasks} blocked · {project.overdueTasks} overdue
                  </p>
                </td>
                <td className="px-4 py-3">
                  {project.totalTasks ? (
                    <div className="flex min-w-40 items-center gap-3">
                      <Progress value={project.progressPct} />
                      <span className="w-10 text-right text-xs font-medium">
                        {Math.round(project.progressPct)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">No tasks</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <TrackerPagination
          page={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </section>
  );
}

function ExecutionView({
  canManageAll,
  initialProjectId,
  initialAssigneeId,
  initialSearch,
  projectOptions,
}: {
  canManageAll: boolean;
  initialProjectId: string;
  initialAssigneeId: string;
  initialSearch: string;
  projectOptions: Array<ProjectWorkSummary>;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [projectId, setProjectId] = useState(initialProjectId || 'all');
  const [assigneeId, setAssigneeId] = useState(initialAssigneeId || 'all');
  const [currentPage, setCurrentPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAssigneeId, setNewAssigneeId] = useState('');
  const [newProjectId, setNewProjectId] = useState('');
  const [newMilestoneId, setNewMilestoneId] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const filters = useMemo(
    () => ({
      page: currentPage,
      pageSize: TRACKER_PAGE_SIZE,
      ...(search ? { search } : {}),
      ...(projectId !== 'all' ? { projectId } : {}),
      ...(assigneeId !== 'all' ? { assigneeId } : {}),
    }),
    [assigneeId, currentPage, projectId, search]
  );
  const { data, isLoading, isError } = useTasks(filters);
  const { data: assigneesData } = useTaskAssignees(canManageAll);
  const { data: milestonesData } = useProjectMilestones(newProjectId || null);
  const createTask = useCreateTask();
  const updateStatus = useUpdateTaskStatus();
  const tasks = data?.data ?? [];
  const totalPages = Math.max(data?.pagination?.totalPages ?? 1, 1);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);
  const replaceExecutionUrl = (
    nextProjectId: string,
    nextAssigneeId: string,
    nextSearch: string
  ) => {
    const params = new URLSearchParams({ view: 'execution' });
    if (nextProjectId !== 'all') params.set('project', nextProjectId);
    if (nextAssigneeId !== 'all') params.set('assignee', nextAssigneeId);
    if (nextSearch.trim()) params.set('search', nextSearch.trim());
    router.replace(`/work-tracker?${params.toString()}`, { scroll: false });
  };
  const handleStatusChange = useCallback(
    async (taskId: string, status: TaskStatusDB, blockedReason?: string | null) => {
      await updateStatus.mutateAsync({ taskId, status, blockedReason });
    },
    [updateStatus]
  );
  const handleCreateTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await createTask.mutateAsync({
      title: newTitle,
      description: newDescription || null,
      assignedTo: newAssigneeId || null,
      priority: newPriority,
      status: 'pending',
      tags: [],
      dueDate: newDueDate || null,
      projectId: newProjectId || null,
      milestoneId: newMilestoneId || null,
    });
    setCreateOpen(false);
    setNewTitle('');
    setNewDescription('');
    setNewAssigneeId('');
    setNewProjectId('');
    setNewMilestoneId('');
    setNewPriority('medium');
    setNewDueDate('');
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Execution Board</h2>
          <p className="text-sm text-muted-foreground">
            Move tasks through execution. Every card shows its project context.
          </p>
        </div>
        {canManageAll ? (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create task
          </Button>
        ) : (
          <Button asChild>
            <Link href="/tasks">
              <Plus className="mr-2 h-4 w-4" />
              Create task
            </Link>
          </Button>
        )}
      </div>
      <div className="grid gap-3 rounded-lg border bg-card p-3 md:grid-cols-[1fr_220px_220px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
                maxLength={200}
            onChange={(event) => {
              setSearch(event.target.value);
              setCurrentPage(1);
              replaceExecutionUrl(projectId, assigneeId, event.target.value);
            }}
            placeholder="Search tasks..."
            className="pl-9"
          />
        </div>
        <Select
          value={projectId}
          onValueChange={(value) => {
            setProjectId(value);
            setCurrentPage(1);
            replaceExecutionUrl(value, assigneeId, search);
          }}
        >
          <SelectTrigger aria-label="Filter by project">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            <SelectItem value="adhoc">Ad-hoc / Internal Ops</SelectItem>
            {projectOptions.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canManageAll ? (
          <Select
            value={assigneeId}
            onValueChange={(value) => {
              setAssigneeId(value);
              setCurrentPage(1);
              replaceExecutionUrl(projectId, value, search);
            }}
          >
            <SelectTrigger aria-label="Filter by assignee">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assignees</SelectItem>
              {(assigneesData?.data ?? []).map((assignee) => (
                <SelectItem key={assignee.id} value={assignee.id}>
                  {assignee.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div />
        )}
      </div>
      {isLoading ? <TrackerSkeleton /> : null}
      {isError ? (
        <EmptyState
          icon={<AlertTriangle className="h-10 w-10" />}
          title="Execution board unavailable"
          description="Tasks could not be loaded."
        />
      ) : null}
      {!isLoading && !isError && !tasks.length ? (
        <EmptyState
          icon={<ListTodo className="h-10 w-10" />}
          title="No matching tasks"
          description="Adjust the filters or create a task."
        />
      ) : null}
      {!isLoading && !isError && tasks.length ? (
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="p-4">
            <TaskKanbanBoard
              tasks={tasks}
              onStatusChange={handleStatusChange}
              linkPrefix={canManageAll ? '/super-admin/tasks' : '/tasks'}
              returnTo={`/work-tracker?view=execution${projectId !== 'all' ? `&project=${projectId}` : ''}${assigneeId !== 'all' ? `&assignee=${assigneeId}` : ''}`}
              includeCancelled={false}
            />
          </div>
          <TrackerPagination
            page={currentPage}
            totalPages={totalPages}
            isLoading={isLoading}
            onPageChange={setCurrentPage}
          />
        </div>
      ) : null}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create task</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Attach project work to its parent, or leave Project blank for Ad-hoc / Internal Ops.
            </p>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateTask}>
            <div className="space-y-1.5">
              <Label htmlFor="work-task-title">Title</Label>
              <Input
                id="work-task-title"
                maxLength={200}
                required
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="work-task-description">Description</Label>
              <Textarea
                id="work-task-description"
                maxLength={5000}
                value={newDescription}
                onChange={(event) => setNewDescription(event.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Assignee</Label>
                <Select
                  value={newAssigneeId || 'unassigned'}
                  onValueChange={(value) => setNewAssigneeId(value === 'unassigned' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {(assigneesData?.data ?? []).map((assignee) => (
                      <SelectItem key={assignee.id} value={assignee.id}>
                        {assignee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select
                  value={newPriority}
                  onValueChange={(value) => setNewPriority(value as typeof newPriority)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Project</Label>
                <Select
                  value={newProjectId || 'adhoc'}
                  onValueChange={(value) => {
                    setNewProjectId(value === 'adhoc' ? '' : value);
                    setNewMilestoneId('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adhoc">Ad-hoc / Internal Ops</SelectItem>
                    {projectOptions.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Milestone</Label>
                <Select
                  disabled={!newProjectId}
                  value={newMilestoneId || 'none'}
                  onValueChange={(value) => setNewMilestoneId(value === 'none' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No milestone</SelectItem>
                    {(milestonesData?.data ?? []).map((milestone) => (
                      <SelectItem key={milestone.id} value={milestone.id}>
                        {milestone.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="work-task-due">Due date</Label>
              <Input
                id="work-task-due"
                type="date"
                value={newDueDate}
                onChange={(event) => setNewDueDate(event.target.value)}
              />
            </div>
            {createTask.error ? (
              <p className="text-sm text-destructive">{createTask.error.message}</p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTask.isPending || !newTitle.trim()}>
                {createTask.isPending ? 'Creating…' : 'Create task'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function TrackerSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((value) => (
          <Skeleton key={value} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}

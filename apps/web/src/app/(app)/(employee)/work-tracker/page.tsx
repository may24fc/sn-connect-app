'use client';

import { useAuth } from '@/contexts/AuthContext';
import { WorkTrackerSectionNav } from '@/components/work-tracker/WorkTrackerSectionNav';
import { useUpdateTask } from '@/hooks/useUpdateTask';
import {
  type PersonWorkSummary,
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
  EmptyState,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '@hr-portal/ui';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FolderKanban,
  ListTodo,
  Plus,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

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
  const canViewTeam = user?.role === 'admin' || user?.role === 'super_admin';
  const [scope, setScope] = useState<WorkTrackerScope>(canViewTeam ? 'team' : 'mine');
  const [days, setDays] = useState<WorkTrackerRange>(30);
  const [workType, setWorkType] = useState<'all' | 'project' | 'task'>('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
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
  const canEditTasks = scope === 'mine' || user?.role === 'super_admin';

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
            <Link href={user?.role === 'super_admin' ? '/super-admin/tasks' : '/tasks'}>
              <Plus className="mr-2 h-4 w-4" />
              Add task
            </Link>
          </Button>
        </div>
      </header>

      <WorkTrackerSectionNav current="overview" />

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

      {isLoading ? <TrackerSkeleton /> : null}
      {isError ? (
        <EmptyState
          icon={<AlertTriangle className="h-10 w-10" />}
          title="Work tracker unavailable"
          description="The combined work and activity summary could not be loaded."
        />
      ) : null}

      {hasLoadedData && scope === 'team' ? (
        <TeamTable
          people={data?.people ?? []}
          selectedUserId={selectedPerson?.userId ?? null}
          onSelect={setSelectedUserId}
        />
      ) : null}

      {hasLoadedData && selectedPerson ? (
        <>
          <SummaryCards person={selectedPerson} days={days} />
          <section className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  {scope === 'team' ? `${selectedPerson.name}'s work` : 'Current work'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Project progress and task state remain separate for an accurate picture.
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
    </div>
  );
}

function SummaryCards({ person, days }: { person: PersonWorkSummary; days: WorkTrackerRange }) {
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
      value: `${person.activeDays}/${days}`,
      detail: `${person.sessionCount} sessions · ${formatLastActive(person.lastActiveAt)}`,
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
  selectedUserId,
  onSelect,
}: {
  people: Array<PersonWorkSummary>;
  selectedUserId: string | null;
  onSelect: (userId: string) => void;
}) {
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
          Activity indicates Control Hub use, not employee productivity.
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
            {people.map((person) => (
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
                  {person.activeDays} days · {person.sessionCount} sessions
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {formatLastActive(person.lastActiveAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
            {item.projectName ? (
              <p className="mt-1 text-xs text-muted-foreground">Project: {item.projectName}</p>
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
            onValueChange={(status) =>
              updateTask.mutate({
                status: status as 'pending' | 'in_progress' | 'blocked' | 'completed' | 'cancelled',
              })
            }
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

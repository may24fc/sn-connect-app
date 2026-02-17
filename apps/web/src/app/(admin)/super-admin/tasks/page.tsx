'use client';

import { useCreateTask } from '@/hooks/useCreateTask';
import { useEmployees } from '@/hooks/useEmployees';
import { useTaskAssignees } from '@/hooks/useTaskAssignees';
import { useTasks } from '@/hooks/useTasks';
import { useTasksRealtime } from '@/hooks/useTasksRealtime';
import type { TaskFilters } from '@/lib/query-keys';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from '@hr-portal/ui';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { type FormEvent, useMemo, useState } from 'react';

const statusVariant: Record<
  'pending' | 'in_progress' | 'completed' | 'cancelled',
  'secondary' | 'pending' | 'approved' | 'error'
> = {
  pending: 'secondary',
  in_progress: 'pending',
  completed: 'approved',
  cancelled: 'error',
};

export default function TaskManagementPage() {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [dueDate, setDueDate] = useState('');

  const taskFilters: TaskFilters = {
    page: 1,
    pageSize: 100,
  };

  if (search) {
    taskFilters.search = search;
  }

  const { data: tasksData, isLoading, error } = useTasks(taskFilters);
  const { data: assigneesData, isLoading: assigneesLoading } = useTaskAssignees(true);
  const { data: employeesData, isLoading: employeesLoading } = useEmployees({ page: 1, pageSize: 200 });
  const createTask = useCreateTask();

  useTasksRealtime({ scope: 'all' });

  const tasks = tasksData?.data || [];
  const assignees = assigneesData?.data || [];

  const employeeFallbackAssignees = useMemo(() => {
    const employees = employeesData?.data || [];
    return employees
      .map((employee) => ({
        id: employee.user_id,
        role: employee.employment_type === 'intern' ? ('intern' as const) : ('employee' as const),
        name: `${employee.first_name} ${employee.last_name}`,
        email: employee.company_email || employee.personal_email || null,
      }))
      .filter((option) => Boolean(option.id));
  }, [employeesData?.data]);

  const effectiveAssignees = assignees.length > 0 ? assignees : employeeFallbackAssignees;

  const assigneeById = useMemo(() => {
    return new Map(effectiveAssignees.map((assignee) => [assignee.id, assignee]));
  }, [effectiveAssignees]);

  const groupedTasks = useMemo(() => {
    const groups = new Map<string, { id: string; label: string; tasks: typeof tasks }>();

    tasks.forEach((task) => {
      const groupId = task.assigned_to || 'unassigned';
      const selectedAssignee = task.assigned_to ? assigneeById.get(task.assigned_to) : null;

      const label = task.assigned_to
        ? selectedAssignee
          ? `${selectedAssignee.name}${selectedAssignee.email ? ` (${selectedAssignee.email})` : ''}`
          : task.assignee_name || 'Assigned User'
        : 'Unassigned';

      if (!groups.has(groupId)) {
        groups.set(groupId, { id: groupId, label, tasks: [] });
      }

      groups.get(groupId)?.tasks.push(task);
    });

    return Array.from(groups.values()).sort((left, right) => left.label.localeCompare(right.label));
  }, [assigneeById, tasks]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAssignmentError(null);

    try {
      await createTask.mutateAsync({
        title,
        description: description || undefined,
        assignedTo: assignedTo || undefined,
        priority,
        status: 'pending',
        dueDate: dueDate || undefined,
      });

      setCreateOpen(false);
      setTitle('');
      setDescription('');
      setAssignedTo('');
      setPriority('medium');
      setDueDate('');
    } catch (error) {
      setAssignmentError(error instanceof Error ? error.message : 'Failed to create task');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline">Task Management</h1>
          <p className="text-muted-foreground">Create and assign tasks to employees and interns</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Task
        </Button>
      </div>

      <Input
        placeholder="Search tasks"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      {isLoading ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Loading tasks...</CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-sm text-error">Failed to load tasks.</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groupedTasks.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-center text-muted-foreground">
                No tasks found.
              </CardContent>
            </Card>
          ) : (
            groupedTasks.map((group) => (
              <Card key={group.id}>
                <CardContent className="p-0">
                  <div className="border-b px-4 py-3 text-sm font-medium">{group.label}</div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.tasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell>
                            <p className="font-medium">{task.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {task.description || '-'}
                            </p>
                          </TableCell>
                          <TableCell className="uppercase text-xs">{task.priority}</TableCell>
                          <TableCell>
                            <Badge variant={statusVariant[task.status]}>{task.status}</Badge>
                          </TableCell>
                          <TableCell>{task.due_date ? task.due_date.slice(0, 10) : '-'}</TableCell>
                          <TableCell className="text-right">
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/super-admin/tasks/${task.id}`}>View</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreate}>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Assignee</Label>
                <Select
                  value={assignedTo || 'unassigned'}
                  onValueChange={(value) => setAssignedTo(value === 'unassigned' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {effectiveAssignees.map((assignee) => (
                      <SelectItem key={assignee.id} value={assignee.id}>
                        {assignee.name}
                        {assignee.email ? ` (${assignee.email})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!assigneesLoading && !employeesLoading && effectiveAssignees.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No assignees found. Ensure employee/intern user accounts exist in `users` and `employees`.
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(value) =>
                    setPriority(value as 'low' | 'medium' | 'high' | 'urgent')
                  }
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
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              </div>
            </div>
            {assignmentError ? <p className="text-sm text-error">{assignmentError}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTask.isPending || assigneesLoading || employeesLoading}
              >
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import {
  type CrossDepartmentWorkRequest,
  useCreateCrossDepartmentWorkRequest,
  useCrossDepartmentWorkRequests,
  useRespondCrossDepartmentWorkRequest,
  useReviseCrossDepartmentWorkRequest,
} from '@/hooks/useCrossDepartmentWorkRequests';
import { useDepartments } from '@/hooks/useDepartments';
import { useProjectMilestones, useProjects } from '@/hooks/useProjects';
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
  EmptyState,
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
import { ArrowRight, Building2, Check, Clock3, Plus, RefreshCw, X } from 'lucide-react';
import { type FormEvent, useState } from 'react';

type RequestScope = 'mine' | 'review';

const statusLabels: Record<CrossDepartmentWorkRequest['status'], string> = {
  pending: 'Needs review',
  changes_requested: 'Changes requested',
  approved: 'Approved',
  rejected: 'Declined',
  cancelled: 'Cancelled',
};

function formatDate(value: string | null): string {
  if (!value) return 'No due date';
  return new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' }).format(new Date(value));
}

export function CrossDepartmentRequestDialog({
  open,
  onOpenChange,
  request = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request?: CrossDepartmentWorkRequest | null;
}) {
  const { addToast } = useToast();
  const createRequest = useCreateCrossDepartmentWorkRequest();
  const reviseRequest = useReviseCrossDepartmentWorkRequest();
  const { data: departments, isLoading: departmentsLoading } = useDepartments({ pageSize: 200 });
  const { data: projects } = useProjects({ mineOnly: true, pageSize: 100 });
  const [targetDepartmentId, setTargetDepartmentId] = useState(request?.target_department_id ?? '');
  const [projectId, setProjectId] = useState(request?.project_id ?? 'none');
  const { data: milestones } = useProjectMilestones(projectId === 'none' ? null : projectId);
  const [milestoneId, setMilestoneId] = useState(request?.milestone_id ?? 'none');
  const [title, setTitle] = useState(request?.title ?? '');
  const [description, setDescription] = useState(request?.description ?? '');
  const [priority, setPriority] = useState(request?.priority ?? 'medium');
  const [dueDate, setDueDate] = useState(request?.due_date?.slice(0, 10) ?? '');
  const isEditing = Boolean(request);
  const isPending = createRequest.isPending || reviseRequest.isPending;

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      if (request) {
        await reviseRequest.mutateAsync({
          id: request.id,
          action: 'resubmit',
          title: title.trim(),
          description: description.trim() || null,
          priority,
          dueDate: dueDate || null,
        });
      } else {
        await createRequest.mutateAsync({
          targetDepartmentId,
          projectId: projectId === 'none' ? null : projectId,
          milestoneId: milestoneId === 'none' ? null : milestoneId,
          title: title.trim(),
          description: description.trim() || null,
          priority,
          dueDate: dueDate || null,
        });
      }
      addToast({
        title: request ? 'Request resubmitted' : 'Department request sent',
        description: request
          ? 'The department lead can review the revised request.'
          : 'No task is assigned until the target department lead approves it.',
        variant: 'success',
      });
      onOpenChange(false);
    } catch (error) {
      addToast({
        title: request ? 'Could not resubmit request' : 'Could not send request',
        description: error instanceof Error ? error.message : 'Try again.',
        variant: 'error',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Revise department request' : 'Request help from another department'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Address the lead’s feedback and send the request back for review.'
              : 'The target department lead reviews capacity and chooses who will own the task.'}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          {!isEditing ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="request-department">Department</Label>
                <Select value={targetDepartmentId} onValueChange={setTargetDepartmentId}>
                  <SelectTrigger id="request-department">
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {(departments?.data ?? []).map((department) => (
                      <SelectItem key={department.id} value={department.id}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  For work inside your own department, create a normal task instead.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="request-project">Project (optional)</Label>
                  <Select
                    value={projectId}
                    onValueChange={(value) => {
                      setProjectId(value);
                      setMilestoneId('none');
                    }}
                  >
                    <SelectTrigger id="request-project">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No project</SelectItem>
                      {(projects?.data ?? []).map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="request-milestone">Milestone (optional)</Label>
                  <Select
                    value={milestoneId}
                    onValueChange={setMilestoneId}
                    disabled={projectId === 'none'}
                  >
                    <SelectTrigger id="request-milestone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No milestone</SelectItem>
                      {(milestones?.data ?? []).map((milestone) => (
                        <SelectItem key={milestone.id} value={milestone.id}>
                          {milestone.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <span className="font-medium">{request?.target_department_name}</span>
              {request?.project_name ? (
                <span className="text-muted-foreground"> · {request.project_name}</span>
              ) : null}
              {request?.decision_note ? (
                <p className="mt-2 text-muted-foreground">Lead feedback: {request.decision_note}</p>
              ) : null}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="request-title">Work needed</Label>
            <Input
              id="request-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="request-description">Context and expected result</Label>
            <Textarea
              id="request-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              maxLength={5000}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="request-priority">Priority</Label>
              <Select
                value={priority}
                onValueChange={(value) => setPriority(value as typeof priority)}
              >
                <SelectTrigger id="request-priority">
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
              <Label htmlFor="request-due">Requested due date</Label>
              <Input
                id="request-due"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isPending ||
                (!isEditing && (!targetDepartmentId || departmentsLoading)) ||
                title.trim().length < 3
              }
            >
              {isPending ? 'Sending…' : isEditing ? 'Resubmit request' : 'Send for review'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReviewDialog({
  request,
  onClose,
}: { request: CrossDepartmentWorkRequest; onClose: () => void }) {
  const { addToast } = useToast();
  const respond = useRespondCrossDepartmentWorkRequest();
  const { data } = useCrossDepartmentWorkRequests('review');
  const [action, setAction] = useState<'approve' | 'request_changes' | 'reject'>('approve');
  const options = (data?.assigneeOptions ?? []).filter(
    (person) => person.departmentId === request.target_department_id
  );
  const [assigneeId, setAssigneeId] = useState(request.suggested_assignee_id ?? '');
  const [note, setNote] = useState('');

  async function submit() {
    try {
      await respond.mutateAsync({
        id: request.id,
        action,
        assigneeId: action === 'approve' ? assigneeId : null,
        note: note.trim() || null,
      });
      addToast({
        title:
          action === 'approve'
            ? 'Request approved and assigned'
            : action === 'request_changes'
              ? 'Changes requested'
              : 'Request declined',
        description:
          action === 'approve'
            ? 'The task is now visible in the assignee’s work.'
            : 'The requester has been notified.',
        variant: action === 'reject' ? 'warning' : 'success',
      });
      onClose();
    } catch (error) {
      addToast({
        title: 'Could not update request',
        description: error instanceof Error ? error.message : 'Try again.',
        variant: 'error',
      });
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Review department request</DialogTitle>
          <DialogDescription>
            {request.requester_name} is asking {request.target_department_name} for help.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="font-medium">{request.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {request.description || 'No additional context provided.'}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="review-action">Decision</Label>
          <Select value={action} onValueChange={(value) => setAction(value as typeof action)}>
            <SelectTrigger id="review-action">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="approve">Approve and assign</SelectItem>
              <SelectItem value="request_changes">Request changes</SelectItem>
              <SelectItem value="reject">Decline</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {action === 'approve' ? (
          <div className="space-y-2">
            <Label htmlFor="review-assignee">Assignee</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger id="review-assignee">
                <SelectValue placeholder="Choose a department member" />
              </SelectTrigger>
              <SelectContent>
                {options.map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    {person.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="review-note">
            {action === 'approve' ? 'Note (optional)' : 'Reason or guidance'}
          </Label>
          <Textarea
            id="review-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            maxLength={2000}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={action === 'reject' ? 'destructive' : 'default'}
            disabled={respond.isPending || (action === 'approve' ? !assigneeId : !note.trim())}
            onClick={() => void submit()}
          >
            {respond.isPending
              ? 'Saving…'
              : action === 'approve'
                ? 'Approve & assign'
                : action === 'request_changes'
                  ? 'Request changes'
                  : 'Decline request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CrossDepartmentWorkRequests({
  initialScope = 'mine',
}: { initialScope?: RequestScope }) {
  const { addToast } = useToast();
  const [scope, setScope] = useState<RequestScope>(initialScope);
  const { data, isLoading, isError, refetch } = useCrossDepartmentWorkRequests(scope);
  const revise = useReviseCrossDepartmentWorkRequest();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<CrossDepartmentWorkRequest | null>(null);
  const [reviewing, setReviewing] = useState<CrossDepartmentWorkRequest | null>(null);

  async function cancel(request: CrossDepartmentWorkRequest) {
    try {
      await revise.mutateAsync({ id: request.id, action: 'cancel' });
      addToast({ title: 'Request cancelled', variant: 'success' });
    } catch (error) {
      addToast({
        title: 'Could not cancel request',
        description: error instanceof Error ? error.message : 'Try again.',
        variant: 'error',
      });
    }
  }

  const requests = data?.data ?? [];
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Department requests</h2>
          <p className="text-sm text-muted-foreground">
            Coordinate cross-department work without assigning people outside your authority.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Request department help
        </Button>
      </div>
      <div className="flex gap-2" role="tablist" aria-label="Department request scope">
        <Button
          size="sm"
          variant={scope === 'mine' ? 'default' : 'outline'}
          onClick={() => setScope('mine')}
        >
          My requests
        </Button>
        {data?.canReview || scope === 'review' ? (
          <Button
            size="sm"
            variant={scope === 'review' ? 'default' : 'outline'}
            onClick={() => setScope('review')}
          >
            Needs my review
            {scope === 'review' && data?.pendingCount ? ` (${data.pendingCount})` : ''}
          </Button>
        ) : null}
      </div>
      {isLoading ? (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          Loading requests…
        </div>
      ) : null}
      {isError ? (
        <EmptyState
          icon={<RefreshCw className="h-9 w-9" />}
          title="Requests unavailable"
          description="Department requests could not be loaded."
          action={{ label: 'Try again', onClick: () => void refetch() }}
        />
      ) : null}
      {!isLoading && !isError && !requests.length ? (
        <EmptyState
          icon={<Building2 className="h-9 w-9" />}
          title={scope === 'mine' ? 'No department requests yet' : 'Nothing needs your review'}
          description={
            scope === 'mine'
              ? 'Request help when work needs capacity from another department.'
              : 'New requests from departments will appear here.'
          }
        />
      ) : null}
      <div className="grid gap-3 lg:grid-cols-2">
        {requests.map((request) => (
          <Card key={request.id}>
            <CardContent className="space-y-3 pt-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{request.title}</p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <span>{request.source_department_name || request.requester_name}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span>{request.target_department_name}</span>
                  </div>
                </div>
                <Badge
                  variant={
                    request.status === 'approved'
                      ? 'default'
                      : request.status === 'rejected' || request.status === 'cancelled'
                        ? 'outline'
                        : 'secondary'
                  }
                >
                  {statusLabels[request.status]}
                </Badge>
              </div>
              {request.description ? (
                <p className="line-clamp-3 text-sm text-muted-foreground">{request.description}</p>
              ) : null}
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{request.project_name || 'Ad-hoc work'}</span>
                <span className="capitalize">{request.priority} priority</span>
                <span>
                  <Clock3 className="mr-1 inline h-3 w-3" />
                  {formatDate(request.due_date)}
                </span>
              </div>
              {request.assigned_to_name ? (
                <p className="text-sm">
                  <Check className="mr-1 inline h-4 w-4 text-emerald-600" />
                  Assigned to {request.assigned_to_name}
                </p>
              ) : null}
              {request.decision_note ? (
                <div className="rounded-md bg-muted px-3 py-2 text-sm">
                  <span className="font-medium">Lead note:</span> {request.decision_note}
                </div>
              ) : null}
              <div className="flex flex-wrap justify-end gap-2">
                {scope === 'review' && request.status === 'pending' ? (
                  <Button size="sm" onClick={() => setReviewing(request)}>
                    Review request
                  </Button>
                ) : null}
                {scope === 'mine' && request.status === 'changes_requested' ? (
                  <Button size="sm" onClick={() => setEditing(request)}>
                    Revise & resubmit
                  </Button>
                ) : null}
                {scope === 'mine' && ['pending', 'changes_requested'].includes(request.status) ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    disabled={revise.isPending}
                    onClick={() => void cancel(request)}
                  >
                    <X className="mr-1 h-4 w-4" />
                    Cancel
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {createOpen ? (
        <CrossDepartmentRequestDialog open={createOpen} onOpenChange={setCreateOpen} />
      ) : null}
      {editing ? (
        <CrossDepartmentRequestDialog
          key={editing.id}
          open
          request={editing}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        />
      ) : null}
      {reviewing ? <ReviewDialog request={reviewing} onClose={() => setReviewing(null)} /> : null}
    </section>
  );
}

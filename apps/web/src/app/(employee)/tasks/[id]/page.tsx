'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useTask } from '@/hooks/useTask';
import { useTaskProofs, useCreateTaskProof, useDeleteTaskProof } from '@/hooks/useTaskProofs';
import { useUpdateTask } from '@/hooks/useUpdateTask';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { formatDate } from '@/lib/format';
import {
  Button,
  Card,
  CardContent,
  EmptyState,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  TaskPriorityBadge,
  TaskStatusBadge,
  Textarea,
  useToast,
} from '@hr-portal/ui';
import type { TaskPriority, TaskStatus } from '@hr-portal/ui';
import { AlertCircle, ArrowLeft, ExternalLink, FileText, Link2, Loader2, Plus, Send, Trash2, X } from 'lucide-react';
import { type FormEvent, use, useState } from 'react';

export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const handleBack = useBackNavigation({ fallbackPath: '/tasks' });
  const { addToast } = useToast();

  const { data, isLoading, error } = useTask(id);
  const { data: proofsData, isLoading: proofsLoading } = useTaskProofs(id);
  const updateTask = useUpdateTask(id);
  const createProof = useCreateTaskProof(id);
  const deleteProof = useDeleteTaskProof(id);

  // Add proof form state
  const [showAddProof, setShowAddProof] = useState(false);
  const [proofType, setProofType] = useState<'link' | 'note'>('link');
  const [proofContent, setProofContent] = useState('');
  const [proofLabel, setProofLabel] = useState('');

  const task = data?.data;
  const proofs = proofsData?.data || [];
  const isAssignee = task?.assigned_to === user?.id;

  const resetProofForm = () => {
    setProofContent('');
    setProofLabel('');
    setProofType('link');
    setShowAddProof(false);
  };

  const handleSubmitProof = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await createProof.mutateAsync({
        proofType,
        content: proofContent,
        label: proofLabel || null,
      });
      addToast({
        title: 'Proof submitted',
        description: 'Your proof has been attached to this task.',
        variant: 'success',
      });
      resetProofForm();
    } catch (err) {
      addToast({
        title: 'Failed to submit proof',
        description: err instanceof Error ? err.message : 'An error occurred',
        variant: 'error',
      });
    }
  };

  const handleDeleteProof = async (proofId: string) => {
    try {
      await deleteProof.mutateAsync(proofId);
      addToast({ title: 'Proof removed', variant: 'success' });
    } catch (err) {
      addToast({
        title: 'Failed to remove proof',
        description: err instanceof Error ? err.message : 'An error occurred',
        variant: 'error',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl py-6">
        <EmptyState
          icon={<Loader2 className="h-5 w-5 animate-spin" />}
          title="Loading task"
          description="Task details are still loading."
          size="sm"
        />
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="mx-auto max-w-3xl py-6">
        <EmptyState
          icon={AlertCircle}
          title="Failed to load task"
          description="Refresh and try again to load this task."
          size="sm"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button variant="ghost" onClick={handleBack}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Tasks
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <CardTitle>{task.title}</CardTitle>
            <TaskStatusBadge status={task.status as TaskStatus} dueDate={task.due_date ?? undefined} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {task.description || 'No description provided.'}
          </p>

          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <p className="flex items-center gap-2">
              <span className="text-muted-foreground">Priority:</span>{' '}
              <TaskPriorityBadge priority={task.priority as TaskPriority} size="sm" />
            </p>
            <p>
              <span className="text-muted-foreground">Due Date:</span> {formatDate(task.due_date)}
            </p>
            <p>
              <span className="text-muted-foreground">Assigned To:</span>{' '}
              {task.assignee_name || '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Assigned By:</span>{' '}
              {task.assigner_name || '—'}
            </p>
          </div>

          <div className="space-y-2 max-w-xs">
            <Label>Update Status</Label>
            <Select
              value={task.status}
              disabled={updateTask.isPending}
              onValueChange={(value) => {
                const newStatus = value as 'pending' | 'in_progress' | 'completed' | 'cancelled';
                updateTask.mutate(
                  { status: newStatus },
                  {
                    onSuccess: () => {
                      addToast({
                        title: 'Task updated',
                        description: `Status changed to ${newStatus.replace('_', ' ')}`,
                        variant: 'success',
                      });
                    },
                    onError: (err) => {
                      addToast({
                        title: 'Error',
                        description:
                          err instanceof Error ? err.message : 'Failed to update task',
                        variant: 'error',
                      });
                    },
                  }
                );
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Proof of Completion Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Proof of Completion</CardTitle>
            {isAssignee && !showAddProof && (
              <Button size="sm" variant="outline" onClick={() => setShowAddProof(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Proof
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Attach links or notes as proof of task completion. Proof is optional.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Proof Form */}
          {showAddProof && (
            <form onSubmit={handleSubmitProof} className="space-y-3 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">New Proof</Label>
                <Button type="button" variant="ghost" size="icon-sm" onClick={resetProofForm}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select value={proofType} onValueChange={(v) => setProofType(v as 'link' | 'note')}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="link">
                      <span className="flex items-center gap-1.5"><Link2 className="h-3.5 w-3.5" /> Link / URL</span>
                    </SelectItem>
                    <SelectItem value="note">
                      <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Note</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Label (optional)</Label>
                <Input
                  placeholder="e.g. Google Drive link, Screenshot, etc."
                  value={proofLabel}
                  onChange={(e) => setProofLabel(e.target.value)}
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  {proofType === 'link' ? 'URL' : 'Note'}
                </Label>
                {proofType === 'link' ? (
                  <Input
                    type="url"
                    placeholder="https://..."
                    value={proofContent}
                    onChange={(e) => setProofContent(e.target.value)}
                    required
                  />
                ) : (
                  <Textarea
                    placeholder="Describe the proof of completion..."
                    value={proofContent}
                    onChange={(e) => setProofContent(e.target.value)}
                    rows={3}
                    required
                    maxLength={2000}
                  />
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={resetProofForm}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={createProof.isPending || !proofContent.trim()}>
                  {createProof.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      Submit Proof
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Proofs List */}
          {proofsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : proofs.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No proof submitted yet"
              description="Add a note or link once work is ready for review."
              size="sm"
            />
          ) : (
            <div className="space-y-3">
              {proofs.map((proof) => (
                <div
                  key={proof.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-zinc-200 dark:border-zinc-700 p-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 flex-shrink-0">
                      {proof.proof_type === 'link' ? (
                        <Link2 className="h-4 w-4 text-indigo-500" />
                      ) : (
                        <FileText className="h-4 w-4 text-zinc-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      {proof.label && (
                        <p className="text-sm font-medium truncate">{proof.label}</p>
                      )}
                      {proof.proof_type === 'link' ? (
                        <a
                          href={proof.content}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 truncate"
                        >
                          {proof.content}
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                      ) : (
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{proof.content}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        by {proof.submitted_by_name} &middot; {formatDate(proof.created_at)}
                      </p>
                    </div>
                  </div>
                  {proof.submitted_by === user?.id && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-red-600 flex-shrink-0"
                      onClick={() => handleDeleteProof(proof.id)}
                      disabled={deleteProof.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

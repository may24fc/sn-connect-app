'use client';

import { useCreateTaskComment, useTaskComments } from '@/hooks/useTaskComments';
import { formatDate } from '@/lib/format';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Label,
  Textarea,
  useToast,
} from '@hr-portal/ui';
import { AlertCircle, Loader2, MessageSquareText } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';

const MAX_COMMENT_LENGTH = 5000;

interface TaskCommentsPanelProps {
  taskId: string;
  /** Set false when the viewer may read the thread but not contribute to it. */
  canComment?: boolean;
  enabled?: boolean;
}

export function TaskCommentsPanel({
  taskId,
  canComment = true,
  enabled = true,
}: TaskCommentsPanelProps): ReactNode {
  const { addToast } = useToast();
  const [draft, setDraft] = useState('');
  const { data, isLoading, error } = useTaskComments(taskId, { enabled });
  const createComment = useCreateTaskComment(taskId);

  const comments = useMemo(() => data?.data ?? [], [data?.data]);

  const handleSubmit = async (): Promise<void> => {
    const content = draft.trim();

    if (!content) {
      return;
    }

    try {
      await createComment.mutateAsync({ content });
      setDraft('');
      addToast({ title: 'Comment posted', variant: 'success' });
    } catch (commentError) {
      addToast({
        title: 'Failed to post comment',
        description:
          commentError instanceof Error
            ? commentError.message
            : 'An unexpected error occurred while posting your comment.',
        variant: 'error',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquareText className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-lg">Comments</CardTitle>
          {comments.length > 0 && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-muted-foreground dark:bg-zinc-800">
              {comments.length}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Discuss this task with the assignee and assigner. Everyone on the task is notified.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <EmptyState
            icon={<Loader2 className="h-5 w-5 animate-spin" />}
            title="Loading comments"
            description="Fetching the task conversation."
            size="sm"
          />
        ) : error ? (
          <EmptyState
            icon={AlertCircle}
            title="Failed to load comments"
            description={error.message}
            size="sm"
          />
        ) : comments.length === 0 ? (
          <EmptyState
            icon={MessageSquareText}
            title="No comments yet"
            description="Ask a clarifying question or post a status update to start the conversation."
            size="sm"
          />
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900/50"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {comment.commenter_name || 'Unknown user'}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(comment.created_at)}</p>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                  {comment.content}
                </p>
              </div>
            ))}
          </div>
        )}

        {canComment && (
          <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-950/30">
            <Label htmlFor={`task-comment-${taskId}`}>Add Comment</Label>
            <Textarea
              id={`task-comment-${taskId}`}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Share progress, blockers, or a question about this task..."
              rows={4}
              maxLength={MAX_COMMENT_LENGTH}
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {draft.length}/{MAX_COMMENT_LENGTH}
              </span>
              <Button
                onClick={() => void handleSubmit()}
                disabled={createComment.isPending || draft.trim().length === 0}
              >
                {createComment.isPending ? 'Posting...' : 'Post Comment'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

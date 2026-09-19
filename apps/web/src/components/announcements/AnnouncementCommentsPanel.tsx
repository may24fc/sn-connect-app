'use client';

import {
  useAnnouncementComments,
  useCreateAnnouncementComment,
} from '@/hooks/useAnnouncementComments';
import { getApiErrorStatus } from '@/lib/api-error';
import { formatDate } from '@/lib/format';
import { Button, EmptyState, Label, Textarea, useToast } from '@hr-portal/ui';
import { AlertCircle, Loader2, Lock, MessageSquareText } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';

const MAX_COMMENT_LENGTH = 5000;

interface AnnouncementCommentsPanelProps {
  announcementId: string;
  /**
   * The announcement's `allow_comments` flag. When false the panel explains
   * that comments are closed instead of rendering a composer the API rejects.
   */
  allowComments: boolean;
  enabled?: boolean;
}

export function AnnouncementCommentsPanel({
  announcementId,
  allowComments,
  enabled = true,
}: AnnouncementCommentsPanelProps): ReactNode {
  const { addToast } = useToast();
  const [draft, setDraft] = useState('');
  const { data, isLoading, error } = useAnnouncementComments(announcementId, {
    enabled: enabled && allowComments,
  });
  const createComment = useCreateAnnouncementComment(announcementId);

  const comments = useMemo(() => data?.data ?? [], [data?.data]);

  // The server is the authority on whether comments are open.
  const commentsOpen = data?.meta?.allowComments ?? allowComments;

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
      const status = getApiErrorStatus(commentError);
      addToast({
        title: status === 403 ? 'Comments are closed' : 'Failed to post comment',
        description:
          commentError instanceof Error
            ? commentError.message
            : 'An unexpected error occurred while posting your comment.',
        variant: 'error',
      });
    }
  };

  if (!allowComments) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Comments</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Comments are turned off for this announcement.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquareText className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Comments</h3>
        {comments.length > 0 && (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-muted-foreground dark:bg-zinc-800">
            {comments.length}
          </span>
        )}
      </div>

      {isLoading ? (
        <EmptyState
          icon={<Loader2 className="h-5 w-5 animate-spin" />}
          title="Loading comments"
          description="Fetching the discussion on this announcement."
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
          description="Be the first to respond to this announcement."
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
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{comment.content}</p>
            </div>
          ))}
        </div>
      )}

      {commentsOpen && (
        <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-950/30">
          <Label htmlFor={`announcement-comment-${announcementId}`}>Add Comment</Label>
          <Textarea
            id={`announcement-comment-${announcementId}`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Share a question or reaction with the team..."
            rows={3}
            maxLength={MAX_COMMENT_LENGTH}
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {draft.length}/{MAX_COMMENT_LENGTH}
            </span>
            <Button
              size="sm"
              onClick={() => void handleSubmit()}
              disabled={createComment.isPending || draft.trim().length === 0}
            >
              {createComment.isPending ? 'Posting...' : 'Post Comment'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

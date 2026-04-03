'use client';

import {
  useCreateTicketComment,
  useTicketComments,
  type TicketRecord,
} from '@/hooks/useTickets';
import { formatDate } from '@/lib/format';
import { Button, EmptyState, Label, Textarea, useToast } from '@hr-portal/ui';
import { AlertCircle, Loader2, MessageSquareText } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';

interface TicketCommentsPanelProps {
  ticket: TicketRecord | null;
  enabled?: boolean;
}

export function TicketCommentsPanel({
  ticket,
  enabled = true,
}: TicketCommentsPanelProps): ReactNode {
  const { addToast } = useToast();
  const [draft, setDraft] = useState('');
  const { data, isLoading, error } = useTicketComments(ticket?.id, {
    enabled: enabled && Boolean(ticket),
  });
  const createComment = useCreateTicketComment(ticket?.id);

  const comments = useMemo(() => data?.data ?? [], [data?.data]);

  if (!ticket) {
    return null;
  }

  const handleSubmit = async () => {
    const content = draft.trim();

    if (!content) {
      return;
    }

    try {
      await createComment.mutateAsync({ content });
      setDraft('');
      addToast({ title: 'Reply posted', variant: 'success' });
    } catch (commentError) {
      addToast({
        title: 'Failed to post reply',
        description:
          commentError instanceof Error
            ? commentError.message
            : 'An unexpected error occurred while posting your reply.',
        variant: 'error',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquareText className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Replies</h3>
      </div>

      {isLoading ? (
        <EmptyState
          icon={<Loader2 className="h-5 w-5 animate-spin" />}
          title="Loading replies"
          description="Fetching the ticket conversation."
          size="sm"
        />
      ) : error ? (
        <EmptyState
          icon={AlertCircle}
          title="Failed to load replies"
          description={error.message}
          size="sm"
        />
      ) : comments.length === 0 ? (
        <EmptyState
          icon={MessageSquareText}
          title="No replies yet"
          description="Use replies to ask follow-up questions or share status updates on this ticket."
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
                <p className="text-sm font-medium text-foreground">{comment.user_name}</p>
                <p className="text-xs text-muted-foreground">{formatDate(comment.created_at)}</p>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{comment.content}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-950/30">
        <Label htmlFor={`ticket-reply-${ticket.id}`}>Add Reply</Label>
        <Textarea
          id={`ticket-reply-${ticket.id}`}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Share an update, ask a clarifying question, or provide the requested details..."
          rows={4}
        />
        <div className="flex justify-end">
          <Button onClick={() => void handleSubmit()} disabled={createComment.isPending || draft.trim().length === 0}>
            {createComment.isPending ? 'Posting...' : 'Post Reply'}
          </Button>
        </div>
      </div>
    </div>
  );
}
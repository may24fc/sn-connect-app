'use client';

import type { InsightConversation } from '@/hooks/usePerformanceInsights';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Skeleton,
  cn,
} from '@hr-portal/ui';
import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { type KeyboardEvent, useState } from 'react';
import { formatInsightMonth } from './starterQuestions';

type InsightConversationListProps = {
  conversations: Array<InsightConversation>;
  activeId: string | null;
  isLoading: boolean;
  loadError: string | null;
  disabled: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (conversation: InsightConversation) => void;
};

function groupByPeriod(conversations: Array<InsightConversation>) {
  const groups = new Map<string, Array<InsightConversation>>();
  for (const conversation of conversations) {
    groups.set(conversation.periodKey, [
      ...(groups.get(conversation.periodKey) ?? []),
      conversation,
    ]);
  }
  return [...groups.entries()];
}

function ConversationRow({
  conversation,
  active,
  disabled,
  onSelect,
  onRename,
  onDelete,
}: {
  conversation: InsightConversation;
  active: boolean;
  disabled: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(conversation.title);

  const commit = () => {
    const title = draft.trim();
    setEditing(false);
    if (title && title !== conversation.title) {
      onRename(title.slice(0, 120));
    } else {
      setDraft(conversation.title);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') commit();
    if (event.key === 'Escape') {
      setDraft(conversation.title);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <li className="px-2 py-1">
        <Input
          autoFocus
          value={draft}
          maxLength={120}
          aria-label="Conversation title"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className="h-8 text-sm"
        />
      </li>
    );
  }

  return (
    <li
      className={cn(
        'group flex items-center gap-1 rounded-md pr-1',
        active ? 'bg-muted' : 'hover:bg-muted/60'
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        aria-current={active ? 'true' : undefined}
        className="min-w-0 flex-1 truncate px-2 py-2 text-left text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-60"
        title={conversation.title}
      >
        {conversation.title}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 opacity-70 group-hover:opacity-100"
            aria-label={`Actions for ${conversation.title}`}
            disabled={disabled}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => {
              setDraft(conversation.title);
              setEditing(true);
            }}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

export function InsightConversationList({
  conversations,
  activeId,
  isLoading,
  loadError,
  disabled,
  onSelect,
  onNew,
  onRename,
  onDelete,
}: InsightConversationListProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-border p-3">
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={onNew}
          disabled={disabled}
        >
          <Plus className="h-4 w-4" />
          New conversation
        </Button>
      </div>
      <nav aria-label="Saved conversations" className="min-h-0 flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="space-y-2 p-1">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
          </div>
        ) : loadError ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">{loadError}</p>
        ) : conversations.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">No saved conversations yet.</p>
        ) : (
          groupByPeriod(conversations).map(([periodKey, group]) => (
            <section key={periodKey} className="mb-3">
              <h3 className="px-2 pb-1 text-xs font-medium text-muted-foreground">
                {formatInsightMonth(periodKey)}
              </h3>
              <ul className="space-y-0.5">
                {group.map((conversation) => (
                  <ConversationRow
                    key={conversation.id}
                    conversation={conversation}
                    active={conversation.id === activeId}
                    disabled={disabled}
                    onSelect={() => onSelect(conversation.id)}
                    onRename={(title) => onRename(conversation.id, title)}
                    onDelete={() => onDelete(conversation)}
                  />
                ))}
              </ul>
            </section>
          ))
        )}
      </nav>
    </div>
  );
}

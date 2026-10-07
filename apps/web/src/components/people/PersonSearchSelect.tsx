'use client';

import { type DirectoryEntry, useDirectory } from '@/hooks/useDirectory';
import {
  Button,
  Input,
  PersonMeta,
  Skeleton,
  UserAvatar,
  formatPersonRole,
} from '@hr-portal/ui';
import { Search, X } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';

const RESULT_PAGE_SIZE = 25;

interface PersonSearchSelectProps {
  /** Used for the search input; pair with a `<Label htmlFor>`. */
  id: string;
  /** Selected user id, or null for nobody. */
  value: string | null;
  onChange: (userId: string | null) => void;
  /** People who must not be offered, e.g. the person being edited. */
  excludeUserIds?: ReadonlyArray<string | null | undefined>;
  /** Directory role filter, e.g. ['employee'] (expands to all non-associate staff). */
  roles?: Array<string>;
  emptyLabel?: string;
  disabled?: boolean;
}

function PersonRow({ entry }: { entry: DirectoryEntry }): ReactNode {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <UserAvatar name={entry.full_name} avatarUrl={entry.avatar_url} size="xs" />
      <span className="flex min-w-0 flex-col text-left">
        <span className="truncate text-sm">{entry.full_name}</span>
        <PersonMeta parts={[entry.position, entry.department_name, formatPersonRole(entry.role)]} />
      </span>
    </span>
  );
}

/**
 * Inline, searchable picker over the admin directory. Rendered inside dialogs without a popover
 * so it never fights the dialog's focus trap or scroll lock. Admin-only, like the directory API.
 */
export function PersonSearchSelect({
  id,
  value,
  onChange,
  excludeUserIds = [],
  roles,
  emptyLabel = 'Not assigned',
  disabled = false,
}: PersonSearchSelectProps): ReactNode {
  const [isSearching, setIsSearching] = useState(false);
  const [search, setSearch] = useState('');

  const selectedQuery = useDirectory(
    { userIds: value ? [value] : [], page: 1, pageSize: 1 },
    { enabled: Boolean(value) }
  );
  const selected = value
    ? (selectedQuery.data?.data ?? []).find((entry) => entry.user_id === value)
    : undefined;

  const resultsQuery = useDirectory(
    {
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(roles?.length ? { roles } : {}),
      page: 1,
      pageSize: RESULT_PAGE_SIZE,
      excludeTerminated: true,
    },
    { enabled: isSearching }
  );

  const excluded = useMemo(
    () => new Set(excludeUserIds.filter((userId): userId is string => Boolean(userId))),
    [excludeUserIds]
  );
  const results = (resultsQuery.data?.data ?? []).filter(
    (entry) => !excluded.has(entry.user_id) && entry.user_id !== value
  );
  const total = resultsQuery.data?.pagination?.total ?? 0;

  const choose = (userId: string | null): void => {
    onChange(userId);
    setIsSearching(false);
    setSearch('');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
        {value ? (
          selected ? (
            <PersonRow entry={selected} />
          ) : selectedQuery.isLoading ? (
            <Skeleton className="h-6 w-40" />
          ) : (
            <span className="text-sm text-muted-foreground">Former or unavailable user</span>
          )
        ) : (
          <span className="text-sm text-muted-foreground">{emptyLabel}</span>
        )}
        <div className="flex shrink-0 items-center gap-1">
          {value && !disabled ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => choose(null)}
              aria-label="Clear selection"
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            aria-expanded={isSearching}
            aria-controls={`${id}-results`}
            onClick={() => setIsSearching((current) => !current)}
          >
            {isSearching ? 'Close' : value ? 'Change' : 'Choose'}
          </Button>
        </div>
      </div>

      {isSearching ? (
        <div id={`${id}-results`} className="space-y-2 rounded-md border border-border p-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id={id}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email, or position"
              className="pl-8"
              autoFocus
              autoComplete="off"
            />
          </div>
          <div className="max-h-56 space-y-1 overflow-y-auto">
            {resultsQuery.isLoading ? (
              <>
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </>
            ) : resultsQuery.error ? (
              <p className="px-2 py-1 text-sm text-destructive">Could not load people.</p>
            ) : results.length === 0 ? (
              <p className="px-2 py-1 text-sm text-muted-foreground">No matching people.</p>
            ) : (
              results.map((entry) => (
                <button
                  key={entry.user_id}
                  type="button"
                  className="flex w-full items-center rounded-md px-2 py-1.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => choose(entry.user_id)}
                >
                  <PersonRow entry={entry} />
                </button>
              ))
            )}
          </div>
          {total > RESULT_PAGE_SIZE ? (
            <p className="px-2 text-xs text-muted-foreground">
              Showing the first {RESULT_PAGE_SIZE} of {total}. Type to narrow the list.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

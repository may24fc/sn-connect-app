'use client';

import type { ReactNode } from 'react';

interface DirectoryResultsHintProps {
  /** Rows currently rendered by the caller (after client-side filtering). */
  shownCount: number;
  /** `pagination.total` from the directory API — the real match count. */
  totalCount: number | undefined;
  /** Rows the API returned for this page, before the caller filtered them. */
  loadedCount: number;
  hasSearch: boolean;
}

/**
 * Tells the admin when the directory list they are looking at is only the first
 * page of matches.
 *
 * Access-management dialogs load one page of the directory and search on the
 * server. Without this hint, a user outside that first page is simply invisible
 * and looks like they do not exist.
 */
export function DirectoryResultsHint({
  shownCount,
  totalCount,
  loadedCount,
  hasSearch,
}: DirectoryResultsHintProps): ReactNode {
  if (totalCount === undefined || totalCount <= loadedCount) {
    return null;
  }

  return (
    <p className="text-xs text-zinc-500 dark:text-zinc-400">
      Showing {shownCount} of {totalCount} matching people.{' '}
      {hasSearch
        ? 'Narrow the search further to reach someone not listed.'
        : 'Search by name to reach someone not listed.'}
    </p>
  );
}
